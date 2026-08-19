import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Next.js tracing inside this frontend when other projects also live
  // under C:\\Prosjekt and have their own lockfiles.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
