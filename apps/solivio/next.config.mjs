import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@solivio/domain", "@solivio/theme"],
  serverExternalPackages: ["@voltagent/core"],
  turbopack: {
    root: "../../"
  }
};

export default nextConfig;
