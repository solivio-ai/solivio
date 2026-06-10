#!/usr/bin/env tsx
/**
 * Module boundary checker — part of `yarn check`.
 *
 * Rules:
 *  1. Module code (modules/<id>/src/**) may import: itself (relative paths),
 *     `@solivio/sdk*`, the shared packages (`@solivio/ui`, `@solivio/theme`,
 *     `@solivio/domain`), and plain npm dependencies. It may NOT import other
 *     modules (`@solivio/module-*`), app internals (`@/...`), or `@solivio/app`.
 *     Cross-module calls go through `getService()`/events; cross-module data
 *     through id references.
 *  2. Handwritten app code (apps/solivio/src/**) may NOT import
 *     `@solivio/module-*` directly — module code reaches the app only through
 *     the generated registries (`@/generated/*`). Generated files (marked with
 *     the `@generated` header) are exempt.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SHARED_PACKAGES = [
  "@solivio/sdk",
  "@solivio/ui",
  "@solivio/theme",
  "@solivio/domain",
  // Generated slot host (aliased to apps/solivio/src/generated/slots.tsx).
  "@solivio/slots",
];

const IMPORT_PATTERN = /(?:from|import)\s*\(?\s*["']([^"']+)["']\)?/g;

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(absPath));
    else if (/\.(ts|tsx|mts)$/.test(entry.name)) results.push(absPath);
  }
  return results;
}

function importsOf(filePath: string): string[] {
  const source = fs.readFileSync(filePath, "utf8");
  const specifiers: string[] = [];
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function isGenerated(filePath: string): boolean {
  const firstLine = fs.readFileSync(filePath, "utf8").split("\n", 1)[0] ?? "";
  return firstLine.includes("@generated");
}

const errors: string[] = [];
const rel = (filePath: string): string => path.relative(repoRoot, filePath);

// Rule 1 — module code
const modulesDir = path.join(repoRoot, "modules");
if (fs.existsSync(modulesDir)) {
  for (const moduleDirent of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (!moduleDirent.isDirectory()) continue;
    const moduleDir = path.join(modulesDir, moduleDirent.name);
    const pkgPath = path.join(moduleDir, "package.json");
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
      solivio?: { module?: boolean };
    };
    // Legacy bundle modules keep their old contract until deleted.
    if (pkg.solivio?.module !== true) continue;

    for (const filePath of walk(path.join(moduleDir, "src"))) {
      for (const specifier of importsOf(filePath)) {
        if (specifier.startsWith(".") || specifier.startsWith("node:")) continue;
        if (specifier.startsWith("@solivio/module-")) {
          errors.push(
            `${rel(filePath)}: imports another module ("${specifier}") — use getService()/events instead`,
          );
        } else if (specifier.startsWith("@/") || specifier.startsWith("@solivio/app")) {
          errors.push(
            `${rel(filePath)}: imports app internals ("${specifier}") — modules depend only on the SDK and shared packages`,
          );
        } else if (
          specifier.startsWith("@solivio/") &&
          !SHARED_PACKAGES.some(
            (allowed) => specifier === allowed || specifier.startsWith(`${allowed}/`),
          )
        ) {
          errors.push(`${rel(filePath)}: imports non-shared package "${specifier}"`);
        }
      }
    }
  }
}

// Rule 2 — handwritten app code
for (const filePath of walk(path.join(repoRoot, "apps/solivio/src"))) {
  if (isGenerated(filePath)) continue;
  for (const specifier of importsOf(filePath)) {
    if (specifier.startsWith("@solivio/module-")) {
      errors.push(
        `${rel(filePath)}: app code imports module "${specifier}" directly — go through @/generated/*`,
      );
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✖ ${error}`);
  console.error(`\n${errors.length} boundary violation(s).`);
  process.exit(1);
}
console.log("✓ module boundaries clean");
