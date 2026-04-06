import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getPlugin } from "@/plugins/registry";
import { encrypt, decrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import type { PluginConfig } from "@/plugins/types";

interface OAuthState {
  pluginId: string;
  connectionId: number;
  returnUrl: string;
}

/** Get the signing secret (same fallback logic as auth/crypto) */
function getSigningSecret(): string {
  return process.env.AUTH_SECRET || "dominion-dev-secret-change-in-production";
}

/** Verify HMAC-signed state parameter. Format: <base64url-payload>.<base64url-signature> */
function parseSignedState(stateParam: string): OAuthState | null {
  try {
    const dotIndex = stateParam.lastIndexOf(".");
    if (dotIndex === -1) {
      // Fallback: try legacy unsigned base64 state (for in-flight OAuth flows during upgrade)
      return parseLegacyState(stateParam);
    }

    const payload = stateParam.substring(0, dotIndex);
    const signature = stateParam.substring(dotIndex + 1);
    if (!payload || !signature) return null;

    const secret = getSigningSecret();
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");

    // Timing-safe comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature, "utf-8");
    const expBuf = Buffer.from(expected, "utf-8");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      logger.warn("oauth-callback", "State signature mismatch -- possible tampering");
      return null;
    }

    const decoded = Buffer.from(payload, "base64url").toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (
      typeof parsed.pluginId === "string" &&
      typeof parsed.connectionId === "number" &&
      typeof parsed.returnUrl === "string"
    ) {
      return parsed as OAuthState;
    }
    return null;
  } catch {
    return null;
  }
}

/** Legacy parser for unsigned base64 state (backward compat during upgrade) */
function parseLegacyState(stateParam: string): OAuthState | null {
  try {
    const decoded = Buffer.from(stateParam, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (
      typeof parsed.pluginId === "string" &&
      typeof parsed.connectionId === "number" &&
      typeof parsed.returnUrl === "string"
    ) {
      logger.warn("oauth-callback", "Accepted legacy unsigned OAuth state -- clients should upgrade");
      return parsed as OAuthState;
    }
    return null;
  } catch {
    return null;
  }
}

/** Validate pluginId is safe kebab-case (no injection) */
const PLUGIN_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function errorRedirect(baseUrl: string, returnUrl: string, error: string): NextResponse {
  // Fix 4: Validate returnUrl is a relative same-origin path
  let safePath = "/";
  if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
    safePath = returnUrl;
  }
  const url = new URL(safePath, baseUrl);
  url.searchParams.set("oauth_error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  // Validate required parameters
  if (!code || !stateParam) {
    logger.warn("oauth-callback", "Missing code or state parameter");
    return errorRedirect(origin, "/", "Missing code or state parameter");
  }

  // Parse and verify signed state
  const state = parseSignedState(stateParam);
  if (!state) {
    logger.warn("oauth-callback", "Invalid or tampered state parameter");
    return errorRedirect(origin, "/", "Invalid state parameter");
  }

  const { pluginId, connectionId, returnUrl } = state;

  // Validate pluginId format to prevent injection
  if (!PLUGIN_ID_RE.test(pluginId)) {
    logger.warn("oauth-callback", `Invalid pluginId format: ${pluginId.substring(0, 50)}`);
    return errorRedirect(origin, "/", "Invalid plugin ID format");
  }

  try {
    // Authenticate the user
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn("oauth-callback", "Unauthenticated OAuth callback");
      return errorRedirect(origin, returnUrl, "Not authenticated");
    }

    const userId = parseInt(session.user.id, 10);

    // Validate plugin exists
    const plugin = getPlugin(pluginId);
    if (!plugin) {
      logger.warn("oauth-callback", `Plugin not found: ${pluginId}`);
      return errorRedirect(origin, returnUrl, "Plugin not found");
    }

    // Check plugin has exchangeToken method
    if (!plugin.exchangeToken) {
      logger.warn("oauth-callback", `Plugin ${pluginId} does not support OAuth token exchange`);
      return errorRedirect(origin, returnUrl, "Plugin does not support OAuth");
    }

    // Validate AppConnection exists and belongs to user
    const connection = await prisma.appConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      logger.warn("oauth-callback", `AppConnection not found: ${connectionId}`);
      return errorRedirect(origin, returnUrl, "Connection not found");
    }

    if (connection.userId !== userId) {
      logger.warn("oauth-callback", `AppConnection ${connectionId} does not belong to user ${userId}`);
      return errorRedirect(origin, returnUrl, "Forbidden");
    }

    // Decrypt existing config
    let existingConfig: Record<string, unknown> = {};
    if (connection.config) {
      existingConfig = JSON.parse(decrypt(connection.config));
    }

    // Build redirect URI (same origin + callback path)
    const redirectUri = `${origin}/api/enhanced/oauth/callback`;

    // Let the plugin handle token exchange
    const tokens = await plugin.exchangeToken(code, redirectUri, existingConfig as PluginConfig);

    // Merge tokens into existing config
    const updatedConfig = {
      ...existingConfig,
      accessToken: tokens.accessToken,
      ...(tokens.refreshToken && { refreshToken: tokens.refreshToken }),
      ...(tokens.expiresAt && { expiresAt: tokens.expiresAt }),
    };

    // Encrypt and save updated config
    await prisma.appConnection.update({
      where: { id: connectionId },
      data: { config: encrypt(JSON.stringify(updatedConfig)) },
    });

    logger.info("oauth-callback", `OAuth tokens saved for plugin ${pluginId}, connection ${connectionId}`);

    // Fix 1: Use JSON.stringify to safely embed values in <script> (prevents XSS)
    const safePluginId = JSON.stringify(pluginId);
    const safeConnectionId = JSON.stringify(connectionId);

    return new NextResponse(
      `<!DOCTYPE html>
      <html><head><title>OAuth erfolgreich</title></head>
      <body style="background:#0a0a0a;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <div style="text-align:center">
          <p style="font-size:1.25rem;margin-bottom:0.5rem">&#10003; Erfolgreich verbunden</p>
          <p style="color:#888;font-size:0.875rem">Dieses Fenster schliesst sich automatisch...</p>
        </div>
        <script>
          try {
            const bc = new BroadcastChannel("oauth-callback");
            bc.postMessage({
              type: "oauth_success",
              pluginId: ${safePluginId},
              connectionId: ${safeConnectionId}
            });
            bc.close();
          } catch(e) {}
          setTimeout(function() { window.close(); }, 2000);
        </script>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (e) {
    const message = (e as Error).message;
    logger.error("oauth-callback", `OAuth token exchange failed for ${pluginId}`, { error: message });
    // Fix 6: Don't leak raw error details to client
    return errorRedirect(origin, returnUrl, "Token exchange failed");
  }
}
