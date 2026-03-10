import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pino', 'pino-pretty'],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
