import fs from "node:fs";
import path from "node:path";

import type { SolivioConfig } from "@solivio/sdk/config";

import type { ModuleModel } from "./discover.mts";

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

  // Table ownership: module tables must be prefixed with the module id
  for (const module of modules) {
    if (!module.has.schema) continue;
    const schemaSource = fs.readFileSync(path.join(module.dir, "src/data/schema.ts"), "utf8");
    for (const match of schemaSource.matchAll(/pgTable\(\s*["'`]([^"'`]+)["'`]/g)) {
      const table = match[1];
      const prefix = snake(module.id);
      if (table === prefix || table.startsWith(`${prefix}_`)) continue;
      errors.push(
        `Module "${module.id}" defines table "${table}" — module tables must be named "${prefix}" or "${prefix}_*"`,
      );
    }
  }

  // Cross-module service usage must be declared in dependsOn, and runtime
  // accessors must not run at module scope (the runtime boots after import).
  const RUNTIME_ACCESSORS =
    /\b(getDb|getService|getAi|getAuth|getAgentTools|getImporter|getModuleOptions|getLogger)\(/;
  for (const module of modules) {
    const ownServices = new Set<string>(["users"]);
    const servicesPath = path.join(module.dir, "src/services.ts");
    if (fs.existsSync(servicesPath)) {
      const servicesSource = fs.readFileSync(servicesPath, "utf8");
      const block = servicesSource.match(/interface Services \{([^}]*)\}/);
      for (const m of (block?.[1] ?? "").matchAll(/^\s*([a-zA-Z0-9_]+)\s*:/gm)) {
        ownServices.add(m[1]);
      }
    }
    const allowed = new Set([...module.dependsOn, ...ownServices]);

    const walkSrc = (dir: string): string[] =>
      fs.existsSync(dir)
        ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
            const absPath = path.join(dir, entry.name);
            if (entry.isDirectory()) return walkSrc(absPath);
            return /\.(ts|tsx)$/.test(entry.name) ? [absPath] : [];
          })
        : [];

    for (const filePath of walkSrc(path.join(module.dir, "src"))) {
      const source = fs.readFileSync(filePath, "utf8");
      const relFile = path.relative(repoRoot, filePath);

      for (const m of source.matchAll(/getService\(\s*["']([a-z0-9-]+)["']\s*\)/g)) {
        const name = m[1];
        if (!allowed.has(name)) {
          errors.push(
            `${relFile}: getService("${name}") but module "${module.id}" does not declare it in dependsOn — ` +
              `add dependsOn: [..., "${name}"] to the manifest (or it is the module's own/unknown service)`,
          );
        }
      }

      for (const line of source.split("\n")) {
        // Module-scope statements only (no indentation): a runtime accessor
        // CALL here runs at import time, before instrumentation boots.
        const accessorMatch = RUNTIME_ACCESSORS.exec(line);
        const beforeAccessor = accessorMatch ? line.slice(0, accessorMatch.index) : "";
        if (
          /^(export )?(const|let|var)\b/.test(line) &&
          accessorMatch &&
          // a "=>" or "function" before the call means it runs lazily — fine
          !/=>|function/.test(beforeAccessor)
        ) {
          errors.push(
            `${relFile}: runtime accessor called at module scope ("${line.trim().slice(0, 60)}…") — ` +
              "resolve services/db/models lazily inside handlers or factories; the runtime boots after modules are imported",
          );
        }
      }
    }
  }

  // Job names and subscriber ids must be module-prefixed and unique — each
  // maps to a pg-boss queue, so a collision silently shares a queue across
  // modules.
  const queueOwners = new Map<string, string>();
  for (const module of modules) {
    const checkDefinition = (file: string, field: "name" | "id", kind: string): void => {
      const source = fs.readFileSync(path.join(module.dir, "src", file), "utf8");
      const literal = source.match(new RegExp(`\\b${field}:\\s*["']([^"']+)["']`));
      if (!literal) {
        errors.push(
          `${kind} "${module.id}/${file}" has no literal ${field} — every file in that directory ` +
            `is registered, and must define ${field}: "${module.id}.…"`,
        );
        return;
      }
      const value = literal[1];
      if (!value.startsWith(`${module.id}.`)) {
        errors.push(
          `${kind} ${field} "${value}" in module "${module.id}" must start with "${module.id}."`,
        );
      }
      const key = `${kind}:${value}`;
      const owner = queueOwners.get(key);
      if (owner) {
        errors.push(`${kind} ${field} collision: "${value}" (modules "${owner}", "${module.id}")`);
      }
      queueOwners.set(key, module.id);
    };
    for (const file of module.jobFiles) checkDefinition(file, "name", "Job");
    for (const file of module.subscriberFiles) checkDefinition(file, "id", "Subscriber");
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
