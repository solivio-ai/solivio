#!/usr/bin/env node
/**
 * Operator overlay tool — run Solivio with your own modules without forking.
 *
 *   node scripts/overlay.mjs link <overlay-dir>   wire an overlay into this checkout
 *   node scripts/overlay.mjs unlink               remove all overlay links
 *   node scripts/overlay.mjs status               show what is linked
 *
 * An overlay directory contains:
 *   solivio.config.ts   the full deployment manifest (modules + slots)
 *   modules/<id>/       custom modules (same shape as in-repo modules)
 *
 * `link` symlinks each overlay module into modules/ (Yarn registers symlinked
 * directories as workspaces) and the overlay manifest to
 * solivio.config.local.ts (which the generator prefers over the in-repo
 * default). All links are recorded in .git/info/exclude, so the upstream
 * checkout stays clean and `git pull` never conflicts with operator files.
 *
 * After linking: yarn install && yarn setup && yarn dev
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = path.join(repoRoot, ".solivio-overlay.json");
const excludePath = path.join(repoRoot, ".git/info/exclude");
const EXCLUDE_MARKER = "# solivio-overlay (managed by scripts/overlay.mjs)";

function readState() {
  return fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : { links: [] };
}

function writeExclude(links) {
  let lines = [];
  if (fs.existsSync(excludePath)) {
    lines = fs.readFileSync(excludePath, "utf8").split("\n");
    const start = lines.indexOf(EXCLUDE_MARKER);
    if (start !== -1) lines = lines.slice(0, start);
  }
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  if (links.length > 0) {
    lines.push("", EXCLUDE_MARKER, ".solivio-overlay.json", ...links);
  }
  fs.mkdirSync(path.dirname(excludePath), { recursive: true });
  fs.writeFileSync(excludePath, `${lines.join("\n")}\n`);
}

function unlink() {
  const state = readState();
  for (const rel of state.links) {
    const absolute = path.join(repoRoot, rel);
    const stat = fs.lstatSync(absolute, { throwIfNoEntry: false });
    if (!stat) continue;
    if (stat.isSymbolicLink() || rel === "solivio.config.local.ts") fs.rmSync(absolute);
    else console.warn(`skipping ${rel}: not overlay-managed (was it replaced manually?)`);
  }
  if (state.overlayDir) {
    const overlayNodeModules = path.join(state.overlayDir, "node_modules");
    const stat = fs.lstatSync(overlayNodeModules, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink()) fs.rmSync(overlayNodeModules);
  }
  if (fs.existsSync(statePath)) fs.rmSync(statePath);
  writeExclude([]);
  console.log(`unlinked ${state.links.length} overlay path(s)`);
}

function link(overlayDirArg) {
  if (!overlayDirArg) {
    console.error("usage: node scripts/overlay.mjs link <overlay-dir>");
    process.exit(1);
  }
  const overlayDir = path.resolve(overlayDirArg);
  const overlayConfig = path.join(overlayDir, "solivio.config.ts");
  if (!fs.existsSync(overlayConfig)) {
    console.error(
      `Overlay is missing ${overlayConfig} — it must carry the full deployment manifest.`,
    );
    process.exit(1);
  }
  if (readState().links.length > 0) {
    console.error("An overlay is already linked — run `node scripts/overlay.mjs unlink` first.");
    process.exit(1);
  }

  const links = [];
  const localConfig = path.join(repoRoot, "solivio.config.local.ts");
  if (fs.existsSync(localConfig)) {
    console.error("solivio.config.local.ts already exists — remove it first.");
    process.exit(1);
  }
  // Copied (not symlinked): the manifest imports @solivio/sdk/config, which
  // only resolves from inside the repo. The generator refreshes the copy from
  // the overlay source on every run.
  fs.copyFileSync(overlayConfig, localConfig);
  links.push("solivio.config.local.ts");

  const overlayModules = path.join(overlayDir, "modules");
  if (fs.existsSync(overlayModules)) {
    for (const entry of fs.readdirSync(overlayModules, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const target = path.join(repoRoot, "modules", entry.name);
      if (fs.existsSync(target)) {
        console.error(
          `modules/${entry.name} already exists in the repo — rename your overlay module.`,
        );
        process.exit(1);
      }
      fs.symlinkSync(path.join(overlayModules, entry.name), target);
      links.push(`modules/${entry.name}`);
    }
  }

  // Node, tsx, and Turbopack resolve a symlinked module's imports from its
  // REAL path — give the overlay directory a node_modules pointing back at
  // this checkout so the resolution walk-up finds every hoisted dependency.
  const overlayNodeModules = path.join(overlayDir, "node_modules");
  const existing = fs.lstatSync(overlayNodeModules, { throwIfNoEntry: false });
  if (!existing) {
    fs.symlinkSync(path.join(repoRoot, "node_modules"), overlayNodeModules);
  } else if (!existing.isSymbolicLink()) {
    console.error(`${overlayNodeModules} exists and is not a symlink — remove it first.`);
    process.exit(1);
  }

  fs.writeFileSync(statePath, `${JSON.stringify({ overlayDir, links }, null, 2)}\n`);
  writeExclude(links);
  console.log(`linked overlay ${overlayDir}:`);
  for (const rel of links) console.log(`  ${rel}`);
  console.log("\nnext: yarn install && yarn setup && yarn dev");
  console.log("note: yarn install updates yarn.lock for overlay modules — run");
  console.log(
    "`yarn overlay unlink && git checkout -- yarn.lock` before pulling upstream updates.",
  );
}

function status() {
  const state = readState();
  if (state.links.length === 0) {
    console.log("no overlay linked");
    return;
  }
  console.log(`overlay: ${state.overlayDir}`);
  for (const rel of state.links) console.log(`  ${rel}`);
}

const [command, arg] = process.argv.slice(2);
if (command === "link") link(arg);
else if (command === "unlink") unlink();
else if (command === "status") status();
else {
  console.error("usage: node scripts/overlay.mjs <link <dir>|unlink|status>");
  process.exit(1);
}
