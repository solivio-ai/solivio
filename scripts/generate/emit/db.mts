import path from "node:path";

import type { ModuleModel } from "../discover.mts";
import type { Writer } from "../lib/write.mts";

const GEN_DB = "apps/solivio/src/generated/db";
const APP_DIR = "apps/solivio";

const snake = (id: string): string => id.replaceAll("-", "_");

/**
 * Per-owner database wiring. Each module with a `data/schema.ts` gets its own
 * drizzle-kit config (own journal under `data/migrations/`, own migrations
 * table) plus an entry in the migration manifest the runner applies after the
 * core journal. Paths inside the configs are relative to apps/solivio — the
 * db scripts always invoke drizzle-kit from there.
 */
export function emitDb(writer: Writer, modules: ModuleModel[], repoRoot: string): void {
  const appDirAbs = path.join(repoRoot, APP_DIR);
  const providers = modules.filter((module) => module.has.schema);

  const relFromApp = (abs: string): string =>
    path.relative(appDirAbs, abs).split(path.sep).join("/");

  for (const module of providers) {
    const schemaRel = relFromApp(path.join(module.dir, "src/data/schema.ts"));
    const outRel = relFromApp(path.join(module.dir, "src/data/migrations"));
    writer.write(
      `${GEN_DB}/drizzle.${module.id}.config.ts`,
      `import { config } from "dotenv";

config({ path: ".env.local" });

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "${outRel}",
  schema: "${schemaRel}",
  dialect: "postgresql",
  migrations: {
    table: "drizzle_migrations_${snake(module.id)}",
  },
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
`,
    );
  }

  // Manifest for the migration runner (paths relative to the repo root).
  const manifest = providers.map((module) => ({
    id: module.id,
    dir: path
      .relative(repoRoot, path.join(module.dir, "src/data/migrations"))
      .split(path.sep)
      .join("/"),
    table: `drizzle_migrations_${snake(module.id)}`,
  }));
  writer.write(`${GEN_DB}/migrations.json`, `${JSON.stringify(manifest, null, 2)}\n`);

  // Studio/inspection config covering core + all module schemas.
  const schemas = [
    "./src/server/database/schema.ts",
    ...providers.map((module) => relFromApp(path.join(module.dir, "src/data/schema.ts"))),
  ];
  writer.write(
    `${GEN_DB}/drizzle.studio.config.ts`,
    `import { config } from "dotenv";

config({ path: ".env.local" });

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ${JSON.stringify(schemas)},
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
`,
  );
}
