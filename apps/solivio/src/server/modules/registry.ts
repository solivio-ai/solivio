import "server-only";

/**
 * Module registry — loads pre-built module bundles at startup.
 *
 * Each module listed in solivio.config.json is resolved to a self-contained
 * ESM bundle (`<modulesRoot>/<package>/index.mjs`), imported by file URL, and
 * registered by calling its factory's register(ctx, options). Modules are
 * provided by the operator (or the baked starter pack) and loaded WITHOUT
 * rebuilding the app — so the import is intentionally external to the bundler
 * (turbopackIgnore / webpackIgnore). A malformed module fails the boot loudly.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";

import type {
  AgentTool,
  AnyImporterDefinition,
  CustomerInput,
  ImporterDefinition,
  ImportTarget,
  ModuleContributions,
  ModuleFactory,
  ProductInput,
  RendererDefinition,
} from "@solivio/sdk";

import type { SolivioConfig } from "./config";
import { modulesRoot, readConfig } from "./config";
import { buildModuleContext } from "./context";

interface LoadedModule {
  id: string;
  name: string;
  version: string;
  importers: AnyImporterDefinition[];
  agentTools: AgentTool[];
  renderers: RendererDefinition[];
}

let _modules: LoadedModule[] | null = null;
let _loadPromise: Promise<LoadedModule[]> | null = null;

// ── Bundle import ───────────────────────────────────────────────────────────

async function importFactory(pkg: string): Promise<ModuleFactory> {
  // The package name comes from solivio.config.json and is joined into a file
  // path. Reject traversal / absolute values so a stray config entry can't
  // resolve a bundle outside the modules root.
  if (pkg.includes("..") || path.isAbsolute(pkg)) {
    throw new Error(
      `Module package "${pkg}" must be a bundle name without ".." or an absolute path.`,
    );
  }
  const entry = path.join(modulesRoot(), pkg, "index.mjs");
  const url = pathToFileURL(entry).href;
  let mod: { default?: unknown };
  try {
    mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as {
      default?: unknown;
    };
  } catch (cause) {
    throw new Error(`Failed to load module bundle "${pkg}" from ${entry}`, { cause });
  }
  const factory = mod.default;
  assertValidFactory(factory, pkg);
  return factory;
}

function assertValidFactory(raw: unknown, pkg: string): asserts raw is ModuleFactory {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`Module "${pkg}" default export is not a module factory.`);
  }
  const f = raw as Record<string, unknown>;
  if (
    typeof f.id !== "string" ||
    typeof f.register !== "function" ||
    typeof f.parseOptions !== "function"
  ) {
    throw new Error(`Module "${pkg}" default export is not a valid defineModule() factory.`);
  }
}

// ── Load ────────────────────────────────────────────────────────────────────

export async function loadModules(): Promise<LoadedModule[]> {
  if (_modules !== null) return _modules;
  if (_loadPromise) return _loadPromise;
  _loadPromise = doLoad().finally(() => {
    _loadPromise = null;
  });
  return _loadPromise;
}

async function doLoad(): Promise<LoadedModule[]> {
  const config = readConfig();
  const loaded: LoadedModule[] = [];

  for (const entry of config.modules) {
    const factory = await importFactory(entry.package);
    const ctx = buildModuleContext(factory.id);
    const options = factory.parseOptions(entry.options ?? {});
    const contributions: ModuleContributions = await factory.register(ctx, options);
    loaded.push({
      id: factory.id,
      name: factory.name,
      version: factory.version,
      importers: contributions.importers ?? [],
      agentTools: contributions.agentTools ?? [],
      renderers: contributions.renderers ?? [],
    });
  }

  assertUnique(
    loaded.map((m) => m.id),
    "module ids",
  );
  assertUnique(
    loaded.flatMap((m) => m.agentTools.map((t) => t.name)),
    "agent tool names",
  );
  assertUnique(
    loaded.flatMap((m) => m.importers.map((i) => i.name)),
    "importer names",
  );

  _modules = loaded;
  return loaded;
}

function assertUnique(values: string[], label: string): void {
  const dupes = values.filter((v, i) => values.indexOf(v) !== i);
  if (dupes.length > 0) {
    throw new Error(`Duplicate ${label} across modules: ${[...new Set(dupes)].join(", ")}`);
  }
}

// ── Accessors ─────────────────────────────────────────────────────────────────

export async function getModules(): Promise<LoadedModule[]> {
  return [...(await loadModules())];
}

export async function getAgentTools(): Promise<AgentTool[]> {
  return (await loadModules()).flatMap((m) => m.agentTools);
}

export async function getImporters(): Promise<AnyImporterDefinition[]> {
  return (await loadModules()).flatMap((m) => m.importers);
}

export async function getRenderers(): Promise<RendererDefinition[]> {
  return (await loadModules()).flatMap((m) => m.renderers);
}

/**
 * Resolves the importer bound to the `${target}.importer` slot. The slot value is
 * "<moduleId>/<importerName>"; if unset and exactly one importer for the target
 * is loaded, that one is the implicit default.
 */
export async function getImporter(): Promise<ImporterDefinition<unknown, ProductInput>>;
export async function getImporter(
  target: "product",
): Promise<ImporterDefinition<unknown, ProductInput>>;
export async function getImporter(
  target: "customer",
): Promise<ImporterDefinition<unknown, CustomerInput>>;
export async function getImporter(
  target: ImportTarget = "product",
): Promise<AnyImporterDefinition> {
  const modules = await loadModules();
  const config: SolivioConfig = readConfig();
  const slotName = `${target}.importer`;
  const binding = config.slots?.[slotName];

  if (binding) {
    const [moduleId, importerName] = binding.split("/");
    const mod = modules.find((m) => m.id === moduleId);
    const found = mod?.importers.find((i) => i.name === importerName);
    if (!found) {
      throw new Error(
        `Slot "${slotName}" is bound to "${binding}", but no loaded module provides it. ` +
          "Check solivio.config.json against the loaded modules.",
      );
    }
    if (found.target !== target) {
      throw new Error(
        `Slot "${slotName}" is bound to "${binding}", but that importer targets "${found.target}".`,
      );
    }
    return found;
  }

  const all = modules.flatMap((m) => m.importers).filter((i) => i.target === target);
  if (all.length === 1) return all[0];
  throw new Error(
    all.length === 0
      ? `No ${target} importer is loaded. Add a module that provides one.`
      : `Multiple ${target} importers are loaded; set slots["${slotName}"] in solivio.config.json.`,
  );
}
