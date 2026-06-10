import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `yarn db:generate [moduleId] [extra drizzle-kit args...]`
 *
 * Without a module id, diffs the CORE schema against the core journal
 * (apps/solivio/drizzle). With a module id, diffs that module's schema
 * against its own journal (modules/<id>/src/data/migrations) using the
 * generated per-module config. Extra args (e.g. `--custom --name adopt`)
 * pass through to drizzle-kit.
 */

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appDir = path.join(repoRoot, "apps/solivio");

const [moduleId, ...rest] = process.argv.slice(2).filter((arg) => arg !== "--");
const args = ["drizzle-kit", "generate"];

if (moduleId && !moduleId.startsWith("--")) {
  const configPath = path.join(appDir, `src/generated/db/drizzle.${moduleId}.config.ts`);
  if (!fs.existsSync(configPath)) {
    console.error(
      `Unknown module "${moduleId}" (no generated drizzle config — is it enabled in solivio.config.ts with a data/schema.ts? Run \`yarn generate\` first).`,
    );
    process.exit(1);
  }
  args.push("--config", `src/generated/db/drizzle.${moduleId}.config.ts`, ...rest);
} else {
  if (moduleId) args.push(moduleId);
  args.push(...rest);
}

execFileSync("yarn", args, { cwd: appDir, stdio: "inherit" });
