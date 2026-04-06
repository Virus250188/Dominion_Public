import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/enhanced/oauth/state
 * Creates an HMAC-signed OAuth state parameter.
 * This prevents state forgery/CSRF in the OAuth flow.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pluginId, connectionId, returnUrl } = body;

    if (typeof pluginId !== "string" || typeof connectionId !== "number" || typeof returnUrl !== "string") {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Validate pluginId format
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(pluginId)) {
      return NextResponse.json({ error: "Invalid plugin ID format" }, { status: 400 });
    }

    // Validate returnUrl is relative
    if (returnUrl && (!returnUrl.startsWith("/") || returnUrl.startsWith("//"))) {
      return NextResponse.json({ error: "returnUrl must be a relative path" }, { status: 400 });
    }

    const secret = process.env.AUTH_SECRET || "dominion-dev-secret-change-in-production";
    const payload = Buffer.from(JSON.stringify({ pluginId, connectionId, returnUrl })).toString("base64url");
    const signature = createHmac("sha256", secret).update(payload).digest("base64url");
    const signedState = `${payload}.${signature}`;

    logger.debug("oauth-state", `Created signed OAuth state for plugin ${pluginId}`);
    return NextResponse.json({ state: signedState });
  } catch {
    return NextResponse.json({ error: "Failed to create OAuth state" }, { status: 500 });
  }
}
