import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Verifies that every migration journal (core + each module from the generated
 * manifest) matches its schema: regenerates into a temp copy and diffs.
 */

const manifestPath = "src/generated/db/migrations.json";
if (!existsSync(manifestPath)) {
  console.error("Missing generated migration manifest — run `yarn generate` first.");
  process.exit(1);
}

const owners = [
  { id: "core", schema: "./src/server/database/schema.ts", journal: "drizzle" },
  ...JSON.parse(readFileSync(manifestPath, "utf8")).map((entry) => ({
    id: entry.id,
    schema: join("../..", entry.dir, "../schema.ts"),
    journal: join("../..", entry.dir),
  })),
];

let failed = false;

for (const owner of owners) {
  const tempDir = await mkdtemp(`.drizzle-check-${owner.id}-`);
  const tempOut = join(tempDir, "drizzle");
  const tempConfig = join(tempDir, "drizzle.config.mjs");

  try {
    if (existsSync(owner.journal)) {
      await cp(owner.journal, tempOut, { recursive: true });
    } else {
      await mkdir(tempOut, { recursive: true });
    }
    await writeFile(
      tempConfig,
      `export default {
  out: ${JSON.stringify(tempOut)},
  schema: ${JSON.stringify(owner.schema)},
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
};
`,
    );

    execFileSync("yarn", ["drizzle-kit", "generate", "--config", tempConfig], {
      stdio: "inherit",
    });

    if (existsSync(owner.journal)) {
      execFileSync(
        "git",
        ["diff", "--no-index", "--exit-code", "--name-status", owner.journal, tempOut],
        { stdio: "inherit" },
      );
    }
    console.log(`No Drizzle schema drift detected (${owner.id}).`);
  } catch (error) {
    if (error.status === 1) {
      console.error(
        `Drizzle schema drift detected for "${owner.id}". Run \`yarn db:generate${owner.id === "core" ? "" : ` ${owner.id}`}\`, review the migration, and commit the generated files.`,
      );
    }
    failed = true;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

process.exit(failed ? 1 : 0);
