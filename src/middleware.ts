import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes
  const publicRoutes = ["/login", "/setup", "/api/auth"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET || "dominion-dev-secret-change-in-production";
  if (!process.env.AUTH_SECRET && process.env.NODE_ENV === "production") {
    console.warn("[middleware] WARNING: AUTH_SECRET is not set! Authentication may be insecure.");
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
