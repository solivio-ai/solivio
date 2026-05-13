#!/usr/bin/env node
/**
 * Validates that solivio.config.json is in sync with the modules/ directory.
 *
 * Usage:
 *   node scripts/sync-modules.mjs           — report drift
 *   node scripts/sync-modules.mjs --write   — auto-add missing packages to solivio.config.json
 *
 * Note: adding packages to solivio.config.json is only the first step.
 * You must also add a loader entry in registry.ts and an entry in
 * transpilePackages in next.config.mjs for each new module.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const modulesDir = path.join(root, "modules");
const configPath = path.join(root, "solivio.config.json");

const modulePackages = readdirSync(modulesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(modulesDir, entry.name, "package.json"))
  .filter(existsSync)
  .map((pkgPath) => JSON.parse(readFileSync(pkgPath, "utf-8")).name)
  .filter(Boolean);

const config = JSON.parse(readFileSync(configPath, "utf-8"));
const configuredModules = config.modules ?? [];

const missing = modulePackages.filter((pkg) => !configuredModules.includes(pkg));
const extra = configuredModules.filter((pkg) => !modulePackages.includes(pkg));

if (missing.length === 0 && extra.length === 0) {
  console.log("solivio.config.json is in sync with modules/");
  process.exit(0);
}

if (missing.length > 0) {
  console.log("In modules/ but NOT in solivio.config.json:");
  for (const pkg of missing) console.log(`  + ${pkg}`);
}

if (extra.length > 0) {
  console.log("In solivio.config.json but NOT in modules/:");
  for (const pkg of extra) console.log(`  - ${pkg}`);
}

if (process.argv.includes("--write")) {
  const updated = { ...config, modules: [...configuredModules, ...missing] };
  writeFileSync(configPath, `${JSON.stringify(updated, null, 2)}\n`);
  console.log("\nsolivio.config.json updated.");
  if (missing.length > 0) {
    console.log(
      "Also add loader entries in apps/solivio/src/server/modules/registry.ts",
      "and transpilePackages entries in apps/solivio/next.config.mjs.",
    );
  }
} else if (missing.length > 0) {
  console.log("\nRun with --write to auto-add missing packages to solivio.config.json.");
  process.exit(1);
}
