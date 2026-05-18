import { execFileSync } from "node:child_process";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const tempDir = await mkdtemp(".drizzle-check-");
const tempOut = join(tempDir, "drizzle");
const tempConfig = join(tempDir, "drizzle.config.mjs");

try {
  await cp("drizzle", tempOut, { recursive: true });
  await writeFile(
    tempConfig,
    `export default {
  out: ${JSON.stringify(tempOut)},
  schema: "./src/server/database/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
};
`,
  );

  execFileSync("yarn", ["drizzle-kit", "generate", "--config", tempConfig], {
    stdio: "inherit",
  });

  execFileSync("git", ["diff", "--no-index", "--exit-code", "--name-status", "drizzle", tempOut], {
    stdio: "inherit",
  });

  console.log("No Drizzle schema drift detected.");
} catch (error) {
  if (error.status === 1) {
    console.error(
      "Drizzle schema drift detected. Run `yarn db:generate`, review the migration, and commit the generated files.",
    );
  }

  process.exit(error.status ?? 1);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
