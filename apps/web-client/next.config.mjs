/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@volleyball-manager/shared-types"],
  images: { unoptimized: true },
};

export default nextConfig;
