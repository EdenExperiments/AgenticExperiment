import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@rpgtracker/auth', '@rpgtracker/ui', '@rpgtracker/api-client'],
  turbopack: { root: '../../' },
  /* config options here */
};

export default nextConfig;
