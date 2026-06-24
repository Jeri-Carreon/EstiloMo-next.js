import type { NextConfig } from "next";

process.env.TZ = 'Asia/Manila'

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
