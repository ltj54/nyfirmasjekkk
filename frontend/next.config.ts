import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // Keep Next.js tracing inside this frontend when other projects also live
  // under C:\\Prosjekt and have their own lockfiles.
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["unzipper"],
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
