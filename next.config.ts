import type { NextConfig } from "next";
import { readFileSync } from "fs";

// Read version from package.json at build time
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const APP_VERSION: string = pkg.version || "dev";

// Basic security headers -- pragmatic set for a self-hosted dashboard
// No HSTS (no SSL requirement), no restrictive CSP (breaks Next.js hydration)
const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@prisma/client", "better-sqlite3", "@prisma/adapter-better-sqlite3", "adm-zip"],
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
