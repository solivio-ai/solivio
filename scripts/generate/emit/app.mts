import fs from "node:fs";
import path from "node:path";

import type { ModuleModel, ScannedExports } from "../discover.mts";
import type { Writer } from "../lib/write.mts";

const APP = "apps/solivio/src/app";

/** Names a page stub may re-export besides `default`. */
const PAGE_EXPORTS = [
  "metadata",
  "generateMetadata",
  "viewport",
  "generateViewport",
  "generateStaticParams",
];

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

/**
 * Next.js statically parses route segment config and rejects re-exports
 * ("It mustn't be reexported" — verified against Next 16), so the stub
 * re-exports handlers/metadata and inlines segment-config literals.
 */
function stubContent(scanned: ScannedExports, allowed: string[], specifier: string): string {
  const names = scanned.named.filter((name) => allowed.includes(name));
  if (scanned.hasDefault) names.unshift("default");
  if (names.length === 0) return "";
  let content = `export { ${names.join(", ")} } from "${specifier}";\n`;
  for (const [name, value] of Object.entries(scanned.segmentConfig)) {
    content += `export const ${name} = ${value};\n`;
  }
  return content;
}

export function emitAppStubs(writer: Writer, modules: ModuleModel[], repoRoot: string): void {
  let needsAdminGuard = false;

  /** Stub → module-source specifier; relative for in-tree modules (see registries.mts). */
  const specifierFor = (module: ModuleModel, stubRel: string, srcPath: string): string => {
    if (!module.inTree) return `${module.packageName}/${srcPath}`;
    const fromDir = path.posix.dirname(`${APP}/${stubRel}`);
    return path.posix.relative(fromDir, `modules/${module.id}/src/${srcPath}`);
  };

  for (const module of modules) {
    const groupDir = module.routeGroup === "protected" ? "(protected)/(gen)" : "(gen-public)";

    for (const page of module.pages) {
      const targetDir = page.routePath === "" ? groupDir : `${groupDir}/${page.routePath}`;
      const specifier = specifierFor(module, `${targetDir}/${page.kind}.tsx`, page.srcPath);
      const content = stubContent(page.exports, PAGE_EXPORTS, specifier);
      if (content === "") continue;
      writer.write(`${APP}/${targetDir}/${page.kind}.tsx`, content);
      if (
        module.routeGroup === "protected" &&
        (page.routePath === "admin" || page.routePath.startsWith("admin/"))
      ) {
        needsAdminGuard = true;
      }
    }

    for (const route of module.apiRoutes) {
      const specifier = specifierFor(
        module,
        `api/(gen)/${route.routePath}/route.ts`,
        route.srcPath,
      );
      const content = stubContent(route.exports, HTTP_METHODS, specifier);
      if (content === "") continue;
      writer.write(`${APP}/api/(gen)/${route.routePath}/route.ts`, content);
    }
  }

  // Admin pages inherit the app's admin guard layout: the generated subtree is a
  // sibling of the handwritten admin folder, so it needs its own layout instance.
  const adminLayout = path.join(repoRoot, APP, "(protected)/admin/layout.tsx");
  if (needsAdminGuard && fs.existsSync(adminLayout)) {
    writer.write(
      `${APP}/(protected)/(gen)/admin/layout.tsx`,
      `export { default } from "@/app/(protected)/admin/layout";\n`,
    );
  }
}
