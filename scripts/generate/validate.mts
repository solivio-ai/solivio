import fs from "node:fs";
import path from "node:path";

import type { SolivioConfig } from "@solivio/sdk/config";

import type { ModuleModel } from "./discover.mts";

/** Tables that predate the module split and keep their unprefixed names. */
const GRANDFATHERED_TABLES = new Set([
  "products",
  "product_prices",
  "customers",
  "requests",
  "offers",
  "offer_items",
  "offer_revisions",
  "offer_chat_threads",
  "offer_chat_messages",
  "users",
  "sessions",
  "accounts",
  "verifications",
]);

const snake = (id: string): string => id.replaceAll("-", "_");

/** Strip (group) segments so route collisions compare final URL paths. */
function urlOf(routePath: string): string {
  return routePath
    .split("/")
    .filter((segment) => segment !== "" && !/^\(.*\)$/.test(segment))
    .join("/");
}

/** Collect handwritten app URLs (pages and api routes), excluding generator-owned trees. */
function scanAppRoutes(appAppDir: string): { pages: Set<string>; api: Set<string> } {
  const pages = new Set<string>();
  const api = new Set<string>();
  const walk = (dir: string, rel: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "(gen)" || entry.name === "(gen-public)") continue;
      const absPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absPath, rel === "" ? entry.name : `${rel}/${entry.name}`);
      } else if (/^page\.(tsx|ts)$/.test(entry.name)) {
        pages.add(urlOf(rel));
      } else if (/^route\.(tsx|ts)$/.test(entry.name) && rel.split("/")[0] === "api") {
        api.add(urlOf(rel.split("/").slice(1).join("/")));
      }
    }
  };
  walk(appAppDir, "");
  return { pages, api };
}

export function validate(
  modules: ModuleModel[],
  config: SolivioConfig,
  repoRoot: string,
): string[] {
  const errors: string[] = [];
  const appAppDir = path.join(repoRoot, "apps/solivio/src/app");
  const handwritten = scanAppRoutes(appAppDir);

  // Unique module ids
  const ids = new Map<string, string>();
  for (const module of modules) {
    const existing = ids.get(module.id);
    if (existing)
      errors.push(`Duplicate module id "${module.id}" (${existing}, ${module.packageName})`);
    ids.set(module.id, module.packageName);
  }

  // dependsOn: declared and acyclic
  for (const module of modules) {
    for (const dep of module.dependsOn) {
      if (dep !== "core" && !ids.has(dep)) {
        errors.push(`Module "${module.id}" depends on unknown/disabled module "${dep}"`);
      }
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(modules.map((module) => [module.id, module]));
  const visit = (id: string, trail: string[]): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      errors.push(`Cyclic dependsOn: ${[...trail, id].join(" → ")}`);
      return;
    }
    visiting.add(id);
    for (const dep of byId.get(id)?.dependsOn ?? []) {
      if (byId.has(dep)) visit(dep, [...trail, id]);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const module of modules) visit(module.id, []);

  // Page/route collisions across modules and against handwritten app routes
  const pageOwners = new Map<string, string>();
  const apiOwners = new Map<string, string>();
  for (const module of modules) {
    for (const page of module.pages) {
      if (page.kind !== "page") continue;
      const url = urlOf(page.routePath);
      const owner = pageOwners.get(url);
      if (owner) errors.push(`Page collision at "/${url}": modules "${owner}" and "${module.id}"`);
      else if (handwritten.pages.has(url)) {
        errors.push(`Page collision at "/${url}": module "${module.id}" vs handwritten app page`);
      }
      pageOwners.set(url, module.id);
    }
    for (const route of module.apiRoutes) {
      const url = urlOf(route.routePath);
      const owner = apiOwners.get(url);
      if (owner) {
        errors.push(`API route collision at "/api/${url}": modules "${owner}" and "${module.id}"`);
      } else if (handwritten.api.has(url)) {
        errors.push(
          `API route collision at "/api/${url}": module "${module.id}" vs handwritten route`,
        );
      }
      apiOwners.set(url, module.id);
      if (
        route.exports.named.every(
          (name) => !/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(name),
        )
      ) {
        errors.push(`Route "${module.id}/${route.srcPath}" exports no HTTP methods`);
      }
    }
  }

  // Table ownership: new tables must be prefixed with the module id
  for (const module of modules) {
    if (!module.has.schema) continue;
    const schemaSource = fs.readFileSync(path.join(module.dir, "src/data/schema.ts"), "utf8");
    for (const match of schemaSource.matchAll(/pgTable\(\s*["'`]([^"'`]+)["'`]/g)) {
      const table = match[1];
      const prefix = snake(module.id);
      if (table === prefix || table.startsWith(`${prefix}_`) || GRANDFATHERED_TABLES.has(table)) {
        continue;
      }
      errors.push(
        `Module "${module.id}" defines table "${table}" — new tables must be named "${prefix}_*"`,
      );
    }
  }

  // Permissions must be module-prefixed
  for (const module of modules) {
    for (const permission of module.permissions) {
      if (!permission.startsWith(`${module.id}.`)) {
        errors.push(
          `Permission "${permission}" in module "${module.id}" must start with "${module.id}."`,
        );
      }
    }
  }

  // Slot bindings must reference enabled modules
  for (const [slot, binding] of Object.entries(config.slots ?? {})) {
    const moduleId = binding.split("/")[0];
    if (!ids.has(moduleId)) {
      errors.push(`Slot "${slot}" is bound to unknown/disabled module "${moduleId}"`);
    }
  }

  return errors;
}
