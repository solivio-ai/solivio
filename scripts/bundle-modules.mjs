#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Bundles every module under modules/ into a self-contained ESM bundle at
 * modules-dist/<package-name>/index.mjs.
 *
 * Each bundle inlines its dependencies (including @solivio/sdk) so it can be
 * loaded by the core at runtime from outside the app's node_modules — by file
 * URL, with no app rebuild. This is the artifact an operator drops into
 * SOLIVIO_MODULES_DIR.
 *
 * Requires the SDK to be built first (esbuild resolves @solivio/sdk → sdk/dist).
 * Adding a module needs no change here and no Dockerfile edit.
 */
import { build } from "esbuild";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulesDir = path.join(root, "modules");
const outRoot = path.join(root, "modules-dist");

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

const dirs = readdirSync(modulesDir, { withFileTypes: true }).filter((e) => e.isDirectory());

let count = 0;
for (const dir of dirs) {
  const pkgPath = path.join(modulesDir, dir.name, "package.json");
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    continue; // not a package
  }
  // New-style codegen modules are wired by `yarn generate`, not bundled.
  if (pkg.solivio?.module === true) continue;
  const entry = path.join(modulesDir, dir.name, "src", "index.ts");
  const outDir = path.join(outRoot, pkg.name);
  const outfile = path.join(outDir, "index.mjs");

  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node24",
    logLevel: "warning",
  });

  // A minimal manifest so the dir is a resolvable package if ever imported by name.
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, "package.json"),
    `${JSON.stringify({ name: pkg.name, version: pkg.version, type: "module", main: "index.mjs" }, null, 2)}\n`,
  );

  console.log(`bundled ${pkg.name} → modules-dist/${pkg.name}/index.mjs`);
  count++;
}

console.log(`\n${count} module bundle(s) written to modules-dist/`);
