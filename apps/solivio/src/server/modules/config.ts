import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

/**
 * solivio.config.json — the operator-facing deployment manifest. It is the
 * single source of truth for which modules load, their options, and which
 * module fills each exclusive capability slot. Read at startup.
 */
const moduleEntrySchema = z.object({
  /** Package name of a built module bundle (resolved from the modules root). */
  package: z.string().min(1),
  /** Module-specific options, validated by the module's own optionsSchema. */
  options: z.record(z.string(), z.unknown()).optional(),
});

export const solivioConfigSchema = z.object({
  modules: z.array(moduleEntrySchema),
  /** Binds an exclusive capability slot to "<moduleId>/<capabilityName>". */
  slots: z.record(z.string(), z.string()).optional(),
});

export type SolivioConfig = z.infer<typeof solivioConfigSchema>;
export type ModuleEntry = z.infer<typeof moduleEntrySchema>;

let _config: SolivioConfig | null = null;

function configPath(): string {
  // process.cwd() is apps/solivio in dev and production start; the config lives
  // at the repo root. Operators set SOLIVIO_CONFIG_PATH for standalone images.
  return process.env.SOLIVIO_CONFIG_PATH ?? path.join(process.cwd(), "../../solivio.config.json");
}

export function readConfig(): SolivioConfig {
  if (_config) return _config;
  const p = configPath();
  try {
    _config = solivioConfigSchema.parse(JSON.parse(readFileSync(p, "utf-8")));
    return _config;
  } catch (cause) {
    throw new Error(`Failed to load solivio.config.json from ${p}`, { cause });
  }
}

/**
 * Directory holding built module bundles (`<dir>/<package>/index.mjs`).
 * Defaults to the repo's modules-dist in dev; operators set SOLIVIO_MODULES_DIR
 * to a mounted volume in production.
 */
export function modulesRoot(): string {
  return process.env.SOLIVIO_MODULES_DIR ?? path.join(process.cwd(), "../../modules-dist");
}
