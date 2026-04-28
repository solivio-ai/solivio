import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(__dirname, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ["@solivio/domain", "@solivio/theme"],
  serverExternalPackages: ["@voltagent/core"],
  turbopack: {
    root: workspaceRoot
  }
};

export default nextConfig;
