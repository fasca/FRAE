import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 uses native .node bindings — must not be bundled by Next.js
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
