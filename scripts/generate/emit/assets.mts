import fs from "node:fs";
import path from "node:path";

import type { ModuleModel } from "../discover.mts";
import type { Writer } from "../lib/write.mts";

const GEN = "apps/solivio/src/generated";
const APP_MESSAGES_DIR = "apps/solivio/messages";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix === "" ? key : `${prefix}.${key}`),
  );
}

export function emitI18n(writer: Writer, modules: ModuleModel[], repoRoot: string): string[] {
  const warnings: string[] = [];
  const messagesDir = path.join(repoRoot, APP_MESSAGES_DIR);
  const locales = fs
    .readdirSync(messagesDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""));

  for (const locale of locales) {
    const appMessages = JSON.parse(
      fs.readFileSync(path.join(messagesDir, `${locale}.json`), "utf8"),
    ) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...appMessages };
    for (const module of modules) {
      if (Object.keys(module.i18n).length === 0) continue;
      if (module.id in appMessages) {
        throw new Error(
          `i18n namespace collision: module id "${module.id}" already exists as a top-level key in ${APP_MESSAGES_DIR}/${locale}.json`,
        );
      }
      const messages = module.i18n[locale];
      if (!messages) {
        warnings.push(`Module "${module.id}" has no i18n/${locale}.json`);
        continue;
      }
      merged[module.id] = messages;
    }
    writer.write(`${GEN}/messages/${locale}.json`, `${JSON.stringify(merged, null, 2)}\n`);
  }

  // Key drift between locales (per module)
  for (const module of modules) {
    const moduleLocales = Object.keys(module.i18n);
    if (moduleLocales.length < 2) continue;
    const [first, ...rest] = moduleLocales;
    const firstKeys = new Set(flattenKeys(module.i18n[first]));
    for (const locale of rest) {
      const keys = new Set(flattenKeys(module.i18n[locale]));
      for (const key of firstKeys) {
        if (!keys.has(key)) {
          warnings.push(
            `Module "${module.id}": key "${key}" present in ${first} but missing in ${locale}`,
          );
        }
      }
      for (const key of keys) {
        if (!firstKeys.has(key)) {
          warnings.push(
            `Module "${module.id}": key "${key}" present in ${locale} but missing in ${first}`,
          );
        }
      }
    }
  }
  return warnings;
}

export function emitTailwind(writer: Writer, modules: ModuleModel[], repoRoot: string): void {
  const genDirAbs = path.join(repoRoot, GEN);
  const lines = modules.map((module) => {
    const rel = path.relative(genDirAbs, path.join(module.dir, "src")).split(path.sep).join("/");
    return `@source "${rel}";`;
  });
  writer.write(`${GEN}/tailwind.css`, `${lines.join("\n")}\n`);
}

export function emitNextModules(writer: Writer, modules: ModuleModel[]): void {
  const packages = modules.map((module) => module.packageName).sort();
  writer.write(`${GEN}/next-modules.json`, `${JSON.stringify(packages, null, 2)}\n`);
}

/**
 * URLs contributed by `routeGroup: "public"` modules — the session proxy
 * (src/proxy.ts) lets these through without a session cookie.
 */
export function emitPublicRoutes(writer: Writer, modules: ModuleModel[]): void {
  const publicModules = modules.filter((module) => module.routeGroup === "public");
  const pages = publicModules
    .flatMap((module) => module.pages.filter((page) => page.kind === "page"))
    .map((page) => (page.routePath === "" ? "/" : `/${page.routePath}`));
  const api = publicModules.flatMap((module) =>
    module.apiRoutes.map((route) => `/api/${route.routePath}`),
  );
  writer.write(
    `${GEN}/public-routes.json`,
    `${JSON.stringify({ pages: pages.sort(), api: api.sort() }, null, 2)}\n`,
  );
}
