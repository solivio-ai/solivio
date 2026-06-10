import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import createNextIntlPlugin from "next-intl/plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(__dirname, "../..");

/**
 * With an operator overlay linked (scripts/overlay.mjs), module sources live
 * outside this checkout — widen the compilation root to the common ancestor
 * so Turbopack can resolve them. Recommended overlay layout keeps the overlay
 * next to (or containing) the solivio checkout, so the root stays tight.
 */
function resolveCompilationRoot() {
  try {
    const state = JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, ".solivio-overlay.json"), "utf8"),
    );
    if (state.overlayDir) {
      const a = path.resolve(workspaceRoot).split(path.sep);
      const b = path.resolve(state.overlayDir).split(path.sep);
      const common = [];
      for (let i = 0; i < Math.min(a.length, b.length) && a[i] === b[i]; i++) common.push(a[i]);
      const ancestor = common.join(path.sep) || path.sep;
      if (ancestor !== path.sep) return ancestor;
    }
  } catch {
    // no overlay linked
  }
  return workspaceRoot;
}
const compilationRoot = resolveCompilationRoot();

/** Module packages enabled in solivio.config.ts, emitted by `yarn generate`. */
const modulePackages = (() => {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(__dirname, "src/generated/next-modules.json"), "utf8"),
    );
  } catch {
    return [];
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: compilationRoot,
  transpilePackages: [
    "@solivio/domain",
    "@solivio/theme",
    "@solivio/sdk",
    "@solivio/ui",
    ...modulePackages,
  ],
  serverExternalPackages: ["@voltagent/core", "@ai-sdk/openai"],
  turbopack: {
    root: compilationRoot,
    resolveAlias: {
      // Sanctioned import for module pages to host slot contributions.
      "@solivio/slots": "./src/generated/slots.tsx",
    },
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
