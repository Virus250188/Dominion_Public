import { NextRequest, NextResponse } from "next/server";
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

function parseState(stateParam: string): OAuthState | null {
  try {
    const decoded = Buffer.from(stateParam, "base64").toString("utf-8");
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

function errorRedirect(baseUrl: string, returnUrl: string, error: string): NextResponse {
  const url = new URL(returnUrl || "/", baseUrl);
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

  // Parse state
  const state = parseState(stateParam);
  if (!state) {
    logger.warn("oauth-callback", "Invalid state parameter");
    return errorRedirect(origin, "/", "Invalid state parameter");
  }

  const { pluginId, connectionId, returnUrl } = state;

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
              pluginId: "${pluginId}",
              connectionId: ${connectionId}
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
    return errorRedirect(origin, returnUrl, `Token exchange failed: ${message}`);
  }
}
