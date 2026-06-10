import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { SolivioConfig } from "@solivio/sdk/config";

export interface ConfigEntry {
  /** The raw reference from solivio.config.ts (directory name or npm package name). */
  ref: string;
  options: Record<string, unknown>;
  /** Absolute module directory (contains package.json + src/). */
  dir: string;
  packageName: string;
  inTree: boolean;
}

export interface LoadedConfig {
  config: SolivioConfig;
  entries: ConfigEntry[];
}

function isPackageRef(ref: string): boolean {
  return ref.startsWith("@") || ref.includes("/");
}

/**
 * Deployment config resolution order:
 *   1. SOLIVIO_CONFIG_PATH (absolute or repo-relative) — explicit override,
 *   2. solivio.config.local.ts — gitignored operator overlay manifest,
 *   3. solivio.config.ts — the in-repo default.
 */
export function resolveConfigPath(repoRoot: string): string {
  const fromEnv = process.env.SOLIVIO_CONFIG_PATH?.trim();
  if (fromEnv) {
    const absolute = path.isAbsolute(fromEnv) ? fromEnv : path.join(repoRoot, fromEnv);
    if (!fs.existsSync(absolute)) {
      throw new Error(`SOLIVIO_CONFIG_PATH points to a missing file: ${absolute}`);
    }
    return absolute;
  }
  const localPath = path.join(repoRoot, "solivio.config.local.ts");
  refreshOverlayConfig(repoRoot, localPath);
  if (fs.existsSync(localPath)) return localPath;
  return path.join(repoRoot, "solivio.config.ts");
}

/** Keep the copied overlay manifest in sync with its source (scripts/overlay.mjs). */
function refreshOverlayConfig(repoRoot: string, localPath: string): void {
  const statePath = path.join(repoRoot, ".solivio-overlay.json");
  if (!fs.existsSync(statePath)) return;
  const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as { overlayDir?: string };
  if (!state.overlayDir) return;
  const source = path.join(state.overlayDir, "solivio.config.ts");
  if (!fs.existsSync(source)) return;
  const content = fs.readFileSync(source, "utf8");
  if (!fs.existsSync(localPath) || fs.readFileSync(localPath, "utf8") !== content) {
    fs.writeFileSync(localPath, content);
  }
}

export async function loadConfig(repoRoot: string): Promise<LoadedConfig> {
  const configPath = resolveConfigPath(repoRoot);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing ${configPath}`);
  }
  // Cache-bust so watch mode picks up edits.
  const url = `${pathToFileURL(configPath).href}?t=${fs.statSync(configPath).mtimeMs}`;
  const imported = (await import(url)) as { default?: SolivioConfig };
  const config = imported.default;
  if (!config || !Array.isArray(config.modules)) {
    throw new Error("solivio.config.ts must default-export defineConfig({ modules: [...] })");
  }

  const require = createRequire(path.join(repoRoot, "package.json"));
  const entries: ConfigEntry[] = [];
  for (const entry of config.modules) {
    const [ref, options] = typeof entry === "string" ? [entry, {}] : entry;
    let dir: string;
    let inTree: boolean;
    if (isPackageRef(ref)) {
      dir = path.dirname(require.resolve(`${ref}/package.json`));
      inTree = false;
    } else {
      dir = path.join(repoRoot, "modules", ref);
      inTree = true;
    }
    const pkgPath = path.join(dir, "package.json");
    if (!fs.existsSync(pkgPath)) {
      throw new Error(`Module "${ref}" not found (expected ${pkgPath})`);
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
      name?: string;
      solivio?: { module?: boolean };
    };
    if (!pkg.name) throw new Error(`Module "${ref}" has no package name`);
    if (pkg.solivio?.module !== true) {
      throw new Error(
        `Package "${pkg.name}" is not a Solivio module (missing "solivio": { "module": true } in package.json)`,
      );
    }
    entries.push({
      ref,
      options: options as Record<string, unknown>,
      dir,
      packageName: pkg.name,
      inTree,
    });
  }
  return { config, entries };
}
