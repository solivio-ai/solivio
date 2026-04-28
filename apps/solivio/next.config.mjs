/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@solivio/domain"],
  turbopack: {
    root: "../../"
  }
};

export default nextConfig;
