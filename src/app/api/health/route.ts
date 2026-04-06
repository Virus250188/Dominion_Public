import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import https from "node:https";
import { logger } from "@/lib/logger";

const MAX_URLS = 50;
const CACHE_TTL_MS = 60_000; // 60 seconds
const REQUEST_TIMEOUT_MS = 3_000; // 3 seconds
const MAX_CONCURRENT = 10;

// Fix 9: SSRF protection -- block cloud metadata and localhost, but ALLOW private IPs
// (the dashboard is designed to check local services like TrueNAS, Emby, HA, etc.)
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.internal",
]);

function isUrlBlocked(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);

    // Only allow http(s) protocols
    if (url.protocol !== "http:" && url.protocol !== "https:") return true;

    // Block known metadata/localhost hostnames
    if (BLOCKED_HOSTNAMES.has(url.hostname.toLowerCase())) return true;

    // Block loopback IPs
    if (url.hostname === "127.0.0.1" || url.hostname === "::1" || url.hostname === "0.0.0.0") return true;

    // Block cloud metadata IP range (169.254.169.254 and link-local)
    if (url.hostname.startsWith("169.254.")) return true;

    return false;
  } catch {
    return true; // Invalid URL = blocked
  }
}

interface HealthResult {
  online: boolean;
  latencyMs: number | null;
}

// Simple semaphore for concurrency control
function createSemaphore(max: number) {
  let count = 0;
  const queue: Array<() => void> = [];

  return {
    async acquire(): Promise<void> {
      if (count < max) {
        count++;
        return;
      }
      return new Promise<void>((resolve) => {
        queue.push(() => {
          count++;
          resolve();
        });
      });
    },
    release() {
      count--;
      const next = queue.shift();
      if (next) next();
    },
  };
}

// Check via node:https for self-signed cert support
function checkWithHttps(url: string): Promise<HealthResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const req = https.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || 443,
          path: parsed.pathname || "/",
          method: "HEAD",
          rejectUnauthorized: false,
          timeout: REQUEST_TIMEOUT_MS,
        },
        (res) => {
          res.on("data", () => {});
          res.on("end", () => {
            const latencyMs = Date.now() - start;
            resolve({ online: (res.statusCode || 500) < 500, latencyMs });
          });
        },
      );
      req.on("error", (e) => { logger.warn("health", `HTTPS check failed for ${url}`, { error: e.message }); resolve({ online: false, latencyMs: null }); });
      req.on("timeout", () => { req.destroy(); resolve({ online: false, latencyMs: null }); });
      req.end();
    } catch {
      resolve({ online: false, latencyMs: null });
    }
  });
}

async function checkUrl(url: string): Promise<HealthResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      return { online: res.ok || res.status < 500, latencyMs };
    } catch {
      clearTimeout(timeout);
      // If HTTPS URL failed (likely self-signed cert), try with node:https
      if (url.startsWith("https://")) {
        return checkWithHttps(url);
      }
      return { online: false, latencyMs: null };
    }
  } catch {
    return { online: false, latencyMs: null };
  }
}

// GET /api/health — simple liveness probe for Docker healthcheck
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const urls: string[] = body.urls;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ results: {} });
    }

    // Limit to MAX_URLS
    const limitedUrls = urls.slice(0, MAX_URLS);
    const results: Record<string, HealthResult> = {};
    const urlsToCheck: string[] = [];
    const now = new Date();

    // Fix 9: Filter out blocked URLs (cloud metadata, localhost)
    const safeUrls: string[] = [];
    for (const url of limitedUrls) {
      if (isUrlBlocked(url)) {
        logger.warn("health", `SSRF protection: blocked health check for ${url}`);
        results[url] = { online: false, latencyMs: null };
      } else {
        safeUrls.push(url);
      }
    }

    // Check cache for each URL
    const cachedEntries = await prisma.healthStatus.findMany({
      where: { url: { in: safeUrls } },
    });

    const cacheMap = new Map<string, typeof cachedEntries[number]>();
    for (const entry of cachedEntries) {
      cacheMap.set(entry.url, entry);
    }

    for (const url of safeUrls) {
      const cached = cacheMap.get(url);
      if (cached && now.getTime() - cached.lastCheck.getTime() < CACHE_TTL_MS) {
        results[url] = { online: cached.isOnline, latencyMs: cached.latencyMs };
      } else {
        urlsToCheck.push(url);
      }
    }

    // Perform actual health checks for stale/missing URLs
    if (urlsToCheck.length > 0) {
      const semaphore = createSemaphore(MAX_CONCURRENT);

      const checks = urlsToCheck.map(async (url) => {
        await semaphore.acquire();
        try {
          const result = await checkUrl(url);
          results[url] = result;

          // Update cache in database
          try {
            await prisma.healthStatus.upsert({
              where: { url },
              create: {
                url,
                isOnline: result.online,
                latencyMs: result.latencyMs,
                lastCheck: now,
              },
              update: {
                isOnline: result.online,
                latencyMs: result.latencyMs,
                lastCheck: now,
              },
            });
          } catch {
            // Database errors shouldn't break the health check response
          }
        } finally {
          semaphore.release();
        }
      });

      await Promise.allSettled(checks);
    }

    const onlineCount = Object.values(results).filter((r) => r.online).length;
    const offlineCount = Object.values(results).filter((r) => !r.online).length;
    logger.info("health", `Checked ${limitedUrls.length} URLs`, { online: onlineCount, offline: offlineCount });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: {} }, { status: 500 });
  }
}
