import type { NextConfig } from "next";

const adminPath = process.env.ADMIN_PATH;

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pino', 'pino-pretty'],
  turbopack: {
    root: __dirname,
  },
  // Rewrite the configured admin path to the internal /portal route so that
  // the public URL is the obscure value from ADMIN_PATH rather than /portal.
  async rewrites() {
    if (!adminPath) return [];
    return [
      {
        source: `/${adminPath}`,
        destination: "/portal",
      },
      {
        source: `/${adminPath}/:path*`,
        destination: "/portal/:path*",
      },
    ];
  },
};

export default nextConfig;
