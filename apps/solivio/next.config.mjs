/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@solivio/domain", "@solivio/theme"],
  serverExternalPackages: ["@voltagent/core"],
  turbopack: {
    root: "../../"
  }
};

export default nextConfig;
