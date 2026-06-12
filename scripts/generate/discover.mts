import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { ModuleManifest } from "@solivio/sdk";

import type { ConfigEntry } from "./config.mts";

export interface ScannedExports {
  hasDefault: boolean;
  named: string[];
  /**
   * Route segment config (`export const dynamic = ...` etc.) captured as raw
   * source text. Next.js statically parses these and refuses re-exports, so
   * stubs inline the literal values instead.
   */
  segmentConfig: Record<string, string>;
}

export interface PageFile {
  /** URL-relative directory, "" for the module root page (e.g. "offers/[offerId]"). */
  routePath: string;
  /** "page" | "layout" | "loading" | "error" | "not-found" | "default" | "template" */
  kind: string;
  /** Module-relative source path, e.g. "pages/offers/page.tsx". */
  srcPath: string;
  exports: ScannedExports;
}

export interface ApiRouteFile {
  /** URL path under /api, e.g. "products/import". */
  routePath: string;
  /** Module-relative source path, e.g. "api/products/import/route.ts". */
  srcPath: string;
  exports: ScannedExports;
}

export interface ModuleModel {
  id: string;
  title: string;
  version: string;
  description?: string;
  packageName: string;
  dir: string;
  inTree: boolean;
  routeGroup: "protected" | "public";
  dependsOn: string[];
  options: unknown;
  pages: PageFile[];
  apiRoutes: ApiRouteFile[];
  subscriberFiles: string[];
  jobFiles: string[];
  i18n: Record<string, Record<string, unknown>>;
  permissions: string[];
  has: {
    services: boolean;
    events: boolean;
    nav: boolean;
    slots: boolean;
    schema: boolean;
    contracts: boolean;
    aiTools: boolean;
    aiImporters: boolean;
    aiAgents: boolean;
  };
}

const PAGE_KINDS = ["page", "layout", "loading", "error", "not-found", "default", "template"];

const SEGMENT_CONFIG_NAMES = [
  "dynamic",
  "dynamicParams",
  "revalidate",
  "fetchCache",
  "runtime",
  "preferredRegion",
  "maxDuration",
  "experimental_ppr",
];

export function scanExports(source: string): ScannedExports {
  const named = new Set<string>();
  for (const match of source.matchAll(
    /^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z0-9_$]+)/gm,
  )) {
    named.add(match[1]);
  }
  for (const match of source.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const piece of match[1].split(",")) {
      const name = piece
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) named.add(name);
    }
  }
  const segmentConfig: Record<string, string> = {};
  for (const match of source.matchAll(
    /^export\s+const\s+([A-Za-z0-9_$]+)(?:\s*:\s*[^=\n]+)?\s*=\s*([^;\n]+)/gm,
  )) {
    if (SEGMENT_CONFIG_NAMES.includes(match[1])) {
      segmentConfig[match[1]] = match[2].trim();
      named.delete(match[1]);
    }
  }
  return { hasDefault: /^export\s+default\b/m.test(source), named: [...named], segmentConfig };
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkFiles(absPath));
    else results.push(absPath);
  }
  return results;
}

async function validateOptions(
  manifest: ModuleManifest<unknown>,
  options: Record<string, unknown>,
): Promise<unknown> {
  if (!manifest.optionsSchema) return options;
  const result = await manifest.optionsSchema["~standard"].validate(options);
  if (result.issues) {
    const details = result.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid options for module "${manifest.id}": ${details}`);
  }
  return result.value;
}

export async function discoverModule(entry: ConfigEntry): Promise<ModuleModel> {
  const srcDir = path.join(entry.dir, "src");
  const indexPath = path.join(srcDir, "index.ts");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Module "${entry.ref}" has no src/index.ts manifest`);
  }
  const url = `${pathToFileURL(indexPath).href}?t=${fs.statSync(indexPath).mtimeMs}`;
  const imported = (await import(url)) as { default?: ModuleManifest<unknown> };
  const manifest = imported.default;
  if (!manifest?.id || !manifest.title || !manifest.version) {
    throw new Error(`Module "${entry.ref}": src/index.ts must default-export defineModule({...})`);
  }
  if (entry.inTree && manifest.id !== entry.ref) {
    throw new Error(
      `Module directory "modules/${entry.ref}" must match its manifest id "${manifest.id}"`,
    );
  }

  const options = await validateOptions(manifest, entry.options);

  const pages: PageFile[] = [];
  const pagesDir = path.join(srcDir, "pages");
  for (const absPath of walkFiles(pagesDir)) {
    const rel = path.relative(pagesDir, absPath);
    const base = path.basename(rel).replace(/\.(tsx|ts)$/, "");
    if (!PAGE_KINDS.includes(base) || !/\.(tsx|ts)$/.test(absPath)) continue;
    pages.push({
      routePath: path.dirname(rel) === "." ? "" : path.dirname(rel).split(path.sep).join("/"),
      kind: base,
      srcPath: `pages/${rel.split(path.sep).join("/")}`,
      exports: scanExports(fs.readFileSync(absPath, "utf8")),
    });
  }

  const apiRoutes: ApiRouteFile[] = [];
  const apiDir = path.join(srcDir, "api");
  for (const absPath of walkFiles(apiDir)) {
    const rel = path.relative(apiDir, absPath);
    if (!/(^|\/|\\)route\.(ts|tsx)$/.test(rel)) continue;
    apiRoutes.push({
      routePath: path.dirname(rel).split(path.sep).join("/"),
      srcPath: `api/${rel.split(path.sep).join("/")}`,
      exports: scanExports(fs.readFileSync(absPath, "utf8")),
    });
  }

  const i18n: Record<string, Record<string, unknown>> = {};
  const i18nDir = path.join(srcDir, "i18n");
  if (fs.existsSync(i18nDir)) {
    for (const file of fs.readdirSync(i18nDir)) {
      if (!file.endsWith(".json")) continue;
      i18n[file.replace(/\.json$/, "")] = JSON.parse(
        fs.readFileSync(path.join(i18nDir, file), "utf8"),
      );
    }
  }

  let permissions: string[] = [];
  const aclPath = path.join(srcDir, "acl.ts");
  if (fs.existsSync(aclPath)) {
    const aclUrl = `${pathToFileURL(aclPath).href}?t=${fs.statSync(aclPath).mtimeMs}`;
    const acl = (await import(aclUrl)) as { permissions?: readonly string[] };
    permissions = [...(acl.permissions ?? [])];
  }

  const listFiles = (sub: string): string[] =>
    walkFiles(path.join(srcDir, sub))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map(
        (file) => `${sub}/${path.relative(path.join(srcDir, sub), file).split(path.sep).join("/")}`,
      );

  const exists = (rel: string): boolean => fs.existsSync(path.join(srcDir, rel));

  return {
    id: manifest.id,
    title: manifest.title,
    version: manifest.version,
    description: manifest.description,
    packageName: entry.packageName,
    dir: entry.dir,
    inTree: entry.inTree,
    routeGroup: manifest.routeGroup ?? "protected",
    dependsOn: [...(manifest.dependsOn ?? [])],
    options,
    pages,
    apiRoutes,
    subscriberFiles: listFiles("subscribers"),
    jobFiles: listFiles("jobs"),
    i18n,
    permissions,
    has: {
      services: exists("services.ts"),
      events: exists("events.ts"),
      nav: exists("nav.tsx"),
      slots: exists("slots.tsx"),
      schema: exists("data/schema.ts"),
      contracts: exists("contracts/routes.ts"),
      aiTools: exists("ai/tools.ts"),
      aiImporters: exists("ai/importers.ts"),
      aiAgents: exists("ai/agents.ts"),
    },
  };
}
