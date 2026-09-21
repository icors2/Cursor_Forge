/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@volleyball-manager/shared-types"],
  images: { unoptimized: true },
  // LAN / Tailscale: Next 14.2+ blocks unknown Host headers in `next dev`.
  allowedDevOrigins: [
    ...(process.env.LAN_IP ? [process.env.LAN_IP] : []),
    "127.0.0.1",
    "localhost",
  ],
};

export default nextConfig;
