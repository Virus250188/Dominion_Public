import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Fix 8: Simple in-memory rate limiter for login attempts
// 5 attempts per 15 minutes per IP -- generous enough for local use
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 5 minutes to prevent memory leak
let lastCleanup = Date.now();
function cleanupLoginAttempts() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [ip, entry] of loginAttempts) {
    if (now >= entry.resetAt) loginAttempts.delete(ip);
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Fix 8: Rate limit login attempts (NextAuth credentials callback)
  if (pathname.startsWith("/api/auth/callback/credentials")) {
    cleanupLoginAttempts();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const now = Date.now();
    const entry = loginAttempts.get(ip);

    if (entry && now < entry.resetAt) {
      if (entry.count >= LOGIN_MAX_ATTEMPTS) {
        const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
        return NextResponse.json(
          { error: "Zu viele Login-Versuche. Bitte spaeter erneut versuchen." },
          {
            status: 429,
            headers: { "Retry-After": String(retryAfterSec) },
          }
        );
      }
      entry.count++;
    } else {
      loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    }
    return NextResponse.next();
  }

  // Public routes
  const publicRoutes = ["/login", "/setup", "/api/auth", "/api/enhanced/oauth"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET || "dominion-dev-secret-change-in-production";
  if (!process.env.AUTH_SECRET) {
    console.warn("[middleware] WARNING: AUTH_SECRET is not set! Authentication is insecure. Set AUTH_SECRET in .env.");
  }

  const token = await getToken({ req, secret });

  if (!token) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.*|icon.*|dominion-.*\\.png|Logo_without_bg\\.png|logo-trimmed\\.png|fonts|icons|backgrounds|uploads).*)"],
};
