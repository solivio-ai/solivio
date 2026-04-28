/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@solivio/domain", "@solivio/theme"],
  turbopack: {
    root: "../../"
  }
};

export default nextConfig;
