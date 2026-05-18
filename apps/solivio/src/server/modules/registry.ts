/**
 * Module registry — loads compiled module packages listed in solivio.config.json.
 *
 * All core code interacts only via ModuleManifest from @solivio/sdk.
 *
 * To add a module to a deployment:
 *   1. List its package name in solivio.config.json — that's all.
 *      Modules are compiled packages (dist/) loaded at Node.js runtime.
 *
 * Convention:
 *   - Module id must be kebab-case and unique across the deployment.
 *   - Module tables must be prefixed with `mod_<id>_`.
 *   - Modules may not import from each other.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import type {
  AgentTool,
  ImporterDefinition,
  ModuleManifest,
  RendererDefinition,
} from "@solivio/sdk";

// ── Config schema ─────────────────────────────────────────────────────────────

const solivioConfigSchema = z.object({
  modules: z.array(z.string()),
  capabilities: z
    .object({
      productImporter: z.string(),
    })
    .optional(),
});

type SolivioConfig = z.infer<typeof solivioConfigSchema>;

// ── Singleton state ───────────────────────────────────────────────────────────

let _modules: ModuleManifest[] | null = null;
let _config: SolivioConfig | null = null;
// Promise singleton so concurrent callers await the same in-flight load.
let _loadPromise: Promise<void> | null = null;

// ── Config reader ─────────────────────────────────────────────────────────────

function readConfig(): SolivioConfig {
  if (_config) return _config;
  // process.cwd() is the Next.js app root (apps/solivio) during dev and production start.
  // For standalone deployments, set SOLIVIO_CONFIG_PATH to the absolute config location.
  const configPath =
    process.env.SOLIVIO_CONFIG_PATH ?? path.join(process.cwd(), "../../solivio.config.json");
  try {
    _config = solivioConfigSchema.parse(JSON.parse(readFileSync(configPath, "utf-8")));
    return _config;
  } catch (cause) {
    throw new Error(`Failed to load solivio.config.json from ${configPath}`, { cause });
  }
}

// ── Manifest validation ───────────────────────────────────────────────────────

const KEBAB_CASE = /^[a-z][a-z0-9-]*$/;

function assertValidManifest(raw: unknown, pkg: string): ModuleManifest {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`Module "${pkg}" default export is not an object`);
  }
  const m = raw as Record<string, unknown>;
  if (typeof m.id !== "string" || !KEBAB_CASE.test(m.id)) {
    throw new Error(
      `Module "${pkg}" id "${String(m.id)}" is invalid — must be kebab-case (e.g. "csv-products")`,
    );
  }
  if (typeof m.name !== "string") {
    throw new Error(`Module "${pkg}" is missing required field "name"`);
  }
  if (typeof m.version !== "string") {
    throw new Error(`Module "${pkg}" is missing required field "version"`);
  }
  return raw as ModuleManifest;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Loads all modules listed in solivio.config.json, validates their manifests,
 * and populates the registry singleton. Idempotent — safe to call multiple times.
 * Concurrent callers share the same in-flight promise.
 *
 * Called eagerly at startup via instrumentation.ts, and lazily by every accessor
 * so that hot reloads (which reset module-level singletons) self-heal without a
 * full server restart.
 */
export async function loadModules(): Promise<void> {
  if (_modules !== null) return;
  if (_loadPromise) return _loadPromise;
  _loadPromise = doLoad().finally(() => {
    _loadPromise = null;
  });
  return _loadPromise;
}

async function doLoad(): Promise<void> {
  const config = readConfig();
  const loaded: ModuleManifest[] = [];

  for (const pkg of config.modules) {
    // Modules are compiled packages (dist/index.js) loaded at Node.js runtime.
    // turbopackIgnore prevents the bundler from attempting to inline them.
    const mod = (await import(/* turbopackIgnore: true */ pkg)) as { default: ModuleManifest };
    loaded.push(assertValidManifest(mod.default, pkg));
  }

  const ids = loaded.map((m) => m.id);
  const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate module ids detected: ${duplicateIds.join(", ")}`);
  }

  const toolNames = loaded.flatMap((m) => (m.agentTools ?? []).map((t) => t.name));
  const duplicateTools = toolNames.filter((n, i) => toolNames.indexOf(n) !== i);
  if (duplicateTools.length > 0) {
    throw new Error(`Duplicate agent tool names across modules: ${duplicateTools.join(", ")}`);
  }

  _modules = loaded;
}

/** Returns all loaded module manifests. */
export async function getModules(): Promise<ModuleManifest[]> {
  await loadModules();
  return [...(_modules as ModuleManifest[])];
}

/** Returns all importers contributed by loaded modules. */
export async function getImporters(): Promise<ImporterDefinition[]> {
  await loadModules();
  return (_modules as ModuleManifest[]).flatMap((m) => m.importers ?? []);
}

/**
 * Returns the product importer designated in solivio.config.json under
 * `capabilities.productImporter`. Throws if the slot is not configured
 * or no loaded module provides an importer with that name.
 */
export async function getImporter(): Promise<ImporterDefinition> {
  const importers = await getImporters();
  const config = readConfig();
  const importerName = config.capabilities?.productImporter;
  if (!importerName) {
    throw new Error(
      "No product importer configured. Set capabilities.productImporter in solivio.config.json.",
    );
  }
  const found = importers.find((imp) => imp.name === importerName);
  if (!found) {
    throw new Error(
      `Importer "${importerName}" not found among loaded modules. ` +
        "Ensure the module providing it is listed in solivio.config.json.",
    );
  }
  return found;
}

/** Returns all agent tools contributed by loaded modules. */
export async function getAgentTools(): Promise<AgentTool[]> {
  await loadModules();
  return (_modules as ModuleManifest[]).flatMap((m) => m.agentTools ?? []);
}

/** Returns all renderers contributed by loaded modules. */
export async function getRenderers(): Promise<RendererDefinition[]> {
  await loadModules();
  return (_modules as ModuleManifest[]).flatMap((m) => m.renderers ?? []);
}
