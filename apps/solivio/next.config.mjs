import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import createNextIntlPlugin from "next-intl/plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(__dirname, "../..");

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
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: [
    "@solivio/domain",
    "@solivio/theme",
    "@solivio/sdk",
    "@solivio/ui",
    ...modulePackages,
  ],
  serverExternalPackages: ["@voltagent/core", "@ai-sdk/openai"],
  turbopack: {
    root: workspaceRoot,
    resolveAlias: {
      // Sanctioned import for module pages to host slot contributions.
      "@solivio/slots": "./src/generated/slots.tsx",
    },
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
