import "server-only";

import { statSync } from "node:fs";
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
  LocalizedText,
  ModuleContributions,
  ModuleFactory,
  ModuleUiContributions,
  ModuleUiIcon,
  ModuleUiNavItem,
  ModuleUiPage,
  ProductInput,
  RendererDefinition,
} from "@solivio/sdk";

import type { SolivioConfig } from "./config";
import { modulesRoot, readConfig } from "./config";
import { buildModuleContext } from "./context";

export type LoadedModuleUiPage = ModuleUiPage & {
  assetVersion: string;
  moduleId: string;
  moduleName: string;
  moduleVersion: string;
  href: string;
};

export type LoadedModuleUiNavItem = ModuleUiNavItem & {
  moduleId: string;
  moduleName: string;
  href: string;
};

interface LoadedModuleUi {
  pages: LoadedModuleUiPage[];
  navItems: LoadedModuleUiNavItem[];
}

export interface LoadedModule {
  id: string;
  name: string;
  packageDir: string;
  version: string;
  importers: AnyImporterDefinition[];
  agentTools: AgentTool[];
  renderers: RendererDefinition[];
  ui: LoadedModuleUi;
}

let _modules: LoadedModule[] | null = null;
let _loadPromise: Promise<LoadedModule[]> | null = null;

// ── Bundle import ───────────────────────────────────────────────────────────

async function importFactory(pkg: string): Promise<ModuleFactory> {
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
  if (typeof f.id !== "string" || typeof f.register !== "function") {
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
    const packageDir = path.join(modulesRoot(), entry.package);
    const factory = await importFactory(entry.package);
    const ctx = buildModuleContext(factory.id);
    const options = factory.parseOptions(entry.options ?? {});
    const contributions: ModuleContributions = await factory.register(ctx, options);
    const importers = contributions.importers ?? [];
    loaded.push({
      id: factory.id,
      name: factory.name,
      packageDir,
      version: factory.version,
      importers,
      agentTools: contributions.agentTools ?? [],
      renderers: contributions.renderers ?? [],
      ui: normalizeUi(
        factory.id,
        factory.name,
        factory.version,
        packageDir,
        importers,
        contributions.ui,
      ),
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

// ── UI contributions ─────────────────────────────────────────────────────────

const KEBAB_CASE = /^[a-z][a-z0-9-]*$/;

const ALLOWED_UI_ICONS = new Set<ModuleUiIcon>([
  "building",
  "file-text",
  "layout-dashboard",
  "package",
  "plus",
  "upload",
  "users",
]);

function normalizeUi(
  moduleId: string,
  moduleName: string,
  moduleVersion: string,
  packageDir: string,
  importers: AnyImporterDefinition[],
  ui: ModuleUiContributions | undefined,
): LoadedModuleUi {
  const pages = ui?.pages ?? [];
  const navItems = ui?.navItems ?? [];

  assertUnique(
    pages.map((page) => page.id),
    `UI page ids in module "${moduleId}"`,
  );
  assertUnique(
    navItems.map((item) => item.id),
    `UI nav item ids in module "${moduleId}"`,
  );

  const importersByName = new Map(importers.map((importer) => [importer.name, importer]));
  const loadedPages = pages.map((page) => {
    assertKebabCase(page.id, `UI page id in module "${moduleId}"`);
    if (page.kind !== "client-island") {
      throw new Error(`Module "${moduleId}" contributed unsupported UI page kind "${page.kind}".`);
    }
    assertLocalizedText(page.title, `UI page "${page.id}" title`);
    if (page.description) assertLocalizedText(page.description, `UI page "${page.id}" description`);
    assertClientEntry(page.clientEntry, `UI page "${page.id}" clientEntry`);
    const clientEntryPath = moduleUiAssetPath(packageDir, page.clientEntry);
    const assetStats = statSync(clientEntryPath);
    assertKnownIcon(page.icon, `UI page "${page.id}" icon`);

    if ((page.importerName && !page.target) || (!page.importerName && page.target)) {
      throw new Error(
        `Module "${moduleId}" UI page "${page.id}" must provide both importerName and target, or neither.`,
      );
    }

    if (page.importerName && page.target) {
      const importer = importersByName.get(page.importerName);
      if (!importer) {
        throw new Error(
          `Module "${moduleId}" UI page "${page.id}" references missing importer "${page.importerName}".`,
        );
      }
      if (importer.target !== page.target) {
        throw new Error(
          `Module "${moduleId}" UI page "${page.id}" targets "${page.target}", ` +
            `but importer "${page.importerName}" targets "${importer.target}".`,
        );
      }
    }

    return {
      ...page,
      assetVersion: `${moduleVersion}-${assetStats.size}-${Math.floor(assetStats.mtimeMs)}`,
      moduleId,
      moduleName,
      moduleVersion,
      href: moduleUiPageHref(moduleId, page.id),
    };
  });

  const pageIds = new Set(loadedPages.map((page) => page.id));
  const loadedNavItems = navItems.map((item) => {
    assertKebabCase(item.id, `UI nav item id in module "${moduleId}"`);
    if (item.section !== "admin") {
      throw new Error(
        `Module "${moduleId}" UI nav item "${item.id}" uses unsupported section "${item.section}".`,
      );
    }
    if (!pageIds.has(item.pageId)) {
      throw new Error(
        `Module "${moduleId}" UI nav item "${item.id}" references missing page "${item.pageId}".`,
      );
    }
    assertLocalizedText(item.label, `UI nav item "${item.id}" label`);
    assertKnownIcon(item.icon, `UI nav item "${item.id}" icon`);

    return {
      ...item,
      moduleId,
      moduleName,
      href: moduleUiPageHref(moduleId, item.pageId),
    };
  });

  return {
    pages: loadedPages,
    navItems: loadedNavItems,
  };
}

function assertKebabCase(value: string, label: string): void {
  if (!KEBAB_CASE.test(value)) {
    throw new Error(`${label} "${value}" must be kebab-case.`);
  }
}

function assertKnownIcon(icon: ModuleUiIcon | undefined, label: string): void {
  if (icon && !ALLOWED_UI_ICONS.has(icon)) {
    throw new Error(`${label} "${icon}" is not supported by the core icon allowlist.`);
  }
}

function assertClientEntry(value: string, label: string): void {
  if (!value.endsWith(".mjs") || value.startsWith("/") || value.includes("..")) {
    throw new Error(`${label} "${value}" must be a relative .mjs asset path.`);
  }
}

function moduleUiAssetPath(packageDir: string, clientEntry: string): string {
  const filePath = path.resolve(packageDir, clientEntry);
  const moduleRoot = path.resolve(packageDir);
  if (!filePath.startsWith(`${moduleRoot}${path.sep}`)) {
    throw new Error(`Module UI clientEntry "${clientEntry}" resolves outside the module bundle.`);
  }
  return filePath;
}

function assertLocalizedText(value: LocalizedText, label: string): void {
  if (typeof value === "string") {
    if (!value.trim()) throw new Error(`${label} must not be empty.`);
    return;
  }
  if (!value.default.trim()) throw new Error(`${label} default text must not be empty.`);
}

function moduleUiPageHref(moduleId: string, pageId: string): string {
  return `/admin/modules/${encodeURIComponent(moduleId)}/${encodeURIComponent(pageId)}`;
}

export function resolveLocalizedText(text: LocalizedText, locale: string): string {
  if (typeof text === "string") return text;

  const normalizedLocale = locale.toLowerCase();
  const language = normalizedLocale.split("-")[0];

  return (
    text.locales?.[locale] ??
    text.locales?.[normalizedLocale] ??
    text.locales?.[language] ??
    text.default
  );
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

export async function getModuleUiPages(): Promise<LoadedModuleUiPage[]> {
  return (await loadModules()).flatMap((m) => m.ui.pages);
}

export async function getModuleUiNavItems(): Promise<LoadedModuleUiNavItem[]> {
  return [...(await loadModules()).flatMap((m) => m.ui.navItems)].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.href.localeCompare(b.href),
  );
}

export async function getModuleAdminNavItems(locale: string): Promise<
  {
    href: string;
    icon?: ModuleUiIcon;
    label: string;
  }[]
> {
  return (await getModuleUiNavItems())
    .filter((item) => item.section === "admin")
    .map((item) => ({
      href: item.href,
      icon: item.icon,
      label: resolveLocalizedText(item.label, locale),
    }));
}

export async function getModuleUiPage(
  moduleId: string,
  pageId: string,
): Promise<LoadedModuleUiPage | null> {
  return (
    (await getModuleUiPages()).find((page) => page.moduleId === moduleId && page.id === pageId) ??
    null
  );
}

export async function getModuleImporter(
  moduleId: string,
  importerName: string,
  target?: ImportTarget,
): Promise<AnyImporterDefinition> {
  const module = (await loadModules()).find((m) => m.id === moduleId);
  const importer = module?.importers.find((i) => i.name === importerName);
  if (!importer) {
    throw new Error(`No loaded module importer found for "${moduleId}/${importerName}".`);
  }
  if (target && importer.target !== target) {
    throw new Error(
      `Importer "${moduleId}/${importerName}" targets "${importer.target}", not "${target}".`,
    );
  }
  return importer;
}

export async function getModuleUiPageAsset(
  moduleId: string,
  pageId: string,
): Promise<{ filePath: string; page: LoadedModuleUiPage } | null> {
  const module = (await loadModules()).find((m) => m.id === moduleId);
  const page = module?.ui.pages.find((p) => p.id === pageId);
  if (!module || !page) return null;

  return { filePath: moduleUiAssetPath(module.packageDir, page.clientEntry), page };
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
