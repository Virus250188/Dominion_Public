import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@prisma/client", "better-sqlite3", "@prisma/adapter-better-sqlite3", "adm-zip"],
};

export default nextConfig;
