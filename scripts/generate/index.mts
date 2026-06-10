#!/usr/bin/env tsx
/**
 * Solivio module generator.
 *
 * Reads `solivio.config.ts`, discovers enabled modules by file convention,
 * validates the module graph, and emits the generated registries and
 * app-router stubs into:
 *
 *   apps/solivio/src/generated/**            registries, merged i18n, tailwind sources
 *   apps/solivio/src/app/(protected)/(gen)/** page stubs (session-guarded)
 *   apps/solivio/src/app/(gen-public)/**      page stubs (public)
 *   apps/solivio/src/app/api/(gen)/**         API route stubs
 *
 * These trees are generator-owned and gitignored: never edit them by hand.
 *
 * Usage:  yarn generate [--watch] [--check]
 */
import fsExtra from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "./config.mts";
import type { ModuleModel } from "./discover.mts";
import { discoverModule } from "./discover.mts";
import { emitAppStubs } from "./emit/app.mts";
import { emitI18n, emitNextModules, emitPublicRoutes, emitTailwind } from "./emit/assets.mts";
import { emitDb } from "./emit/db.mts";
import { emitRegistries } from "./emit/registries.mts";
import { Writer } from "./lib/write.mts";
import { validate } from "./validate.mts";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const OWNED_TREES = [
  "apps/solivio/src/generated",
  "apps/solivio/src/app/(protected)/(gen)",
  "apps/solivio/src/app/(gen-public)",
  "apps/solivio/src/app/api/(gen)",
];

async function generate(checkOnly: boolean): Promise<void> {
  const { config, entries } = await loadConfig(repoRoot);
  const modules: ModuleModel[] = [];
  for (const entry of entries) {
    modules.push(await discoverModule(entry));
  }

  const errors = validate(modules, config, repoRoot);
  if (errors.length > 0) {
    for (const error of errors) console.error(`✖ ${error}`);
    throw new Error(`Generation failed with ${errors.length} error(s)`);
  }

  if (checkOnly) {
    console.log(`✓ ${modules.length} module(s) validated`);
    return;
  }

  const writer = new Writer(repoRoot);
  emitRegistries(writer, modules, config);
  emitAppStubs(writer, modules, repoRoot);
  const warnings = emitI18n(writer, modules, repoRoot);
  emitTailwind(writer, modules, repoRoot);
  emitNextModules(writer, modules);
  emitPublicRoutes(writer, modules);
  emitDb(writer, modules, repoRoot);
  for (const tree of OWNED_TREES) writer.prune(tree);

  for (const warning of warnings) console.warn(`⚠ ${warning}`);
  console.log(
    `✓ generated wiring for ${modules.length} module(s)` +
      (writer.changedCount > 0 ? ` (${writer.changedCount} file(s) changed)` : " (no changes)"),
  );
}

async function watch(): Promise<void> {
  const { watch: chokidarWatch } = await import("chokidar");
  const targets = [path.join(repoRoot, "modules"), path.join(repoRoot, "solivio.config.ts")];
  const overlayState = path.join(repoRoot, ".solivio-overlay.json");
  if (fsExtra.existsSync(overlayState)) {
    const state = JSON.parse(fsExtra.readFileSync(overlayState, "utf8")) as { overlayDir?: string };
    if (state.overlayDir) targets.push(path.join(state.overlayDir, "solivio.config.ts"));
  }
  let timer: NodeJS.Timeout | undefined;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await generate(false);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  };
  chokidarWatch(targets, { ignoreInitial: true, ignored: /node_modules/ }).on("all", () => {
    clearTimeout(timer);
    timer = setTimeout(run, 200);
  });
  console.log("watching modules/ and solivio.config.ts for changes…");
  await run();
  // Keep the process alive.
  await new Promise(() => {});
}

const args = process.argv.slice(2);
try {
  if (args.includes("--watch")) {
    await watch();
  } else {
    await generate(args.includes("--check"));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
