import type { NextConfig } from "next";

process.env.TZ = 'Asia/Manila'

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
};

export default nextConfig;
