import path from "node:path";
import { fileURLToPath } from "node:url";

import createNextIntlPlugin from "next-intl/plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(__dirname, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ["@solivio/domain", "@solivio/theme"],
  // @solivio/module-* are compiled packages loaded at Node.js runtime — keep them external.
  serverExternalPackages: ["@voltagent/core", "@ai-sdk/openai", "@solivio/module-*"],
  turbopack: {
    root: workspaceRoot,
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
