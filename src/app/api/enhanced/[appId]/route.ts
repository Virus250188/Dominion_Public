import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getPlugin } from "@/plugins/registry";
import { validateStats } from "@/plugins/validator";
import { decrypt, encrypt } from "@/lib/crypto";
import type { PluginConfig } from "@/plugins/types";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    // Authenticate the request
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { items: [], status: "error", error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id, 10);
    const { appId } = await params;
    const tileId = parseInt(appId, 10);

    if (isNaN(tileId)) {
      return NextResponse.json({ items: [], status: "error", error: "Invalid tile ID" }, { status: 400 });
    }

    // Fetch tile with userId ownership check + appConnection relation
    const tile = await prisma.tile.findUnique({
      where: { id: tileId },
      include: { appConnection: true },
    });

    if (!tile || tile.type !== "enhanced" || !tile.enhancedType) {
      return NextResponse.json({ items: [], status: "error", error: "Not an enhanced tile" }, { status: 404 });
    }

    // Verify the tile belongs to the authenticated user
    if (tile.userId !== userId) {
      return NextResponse.json(
        { items: [], status: "error", error: "Forbidden" },
        { status: 403 }
      );
    }

    const plugin = getPlugin(tile.enhancedType);
    if (!plugin) {
      return NextResponse.json({ items: [], status: "error", error: `Unknown app type: ${tile.enhancedType}` }, { status: 404 });
    }

    // Merge config: AppConnection (connection data) + tile.enhancedConfig (display/tile data)
    let config: PluginConfig = { apiUrl: "" };
    try {
      // Start with connection config (url, api keys)
      let connectionConfig: Record<string, unknown> = {};
      if (tile.appConnection?.config) {
        connectionConfig = JSON.parse(decrypt(tile.appConnection.config));
      }
      // If AppConnection has a URL, use it as apiUrl
      if (tile.appConnection?.url) {
        connectionConfig.apiUrl = tile.appConnection.url;
      }

      // Overlay tile-specific display config (visibleStats, selectedEntities, widget options)
      let tileConfig: Record<string, unknown> = {};
      if (tile.enhancedConfig) {
        tileConfig = JSON.parse(decrypt(tile.enhancedConfig));
      }

      // Merge: connection data is the base, tile display config overlays
      config = { ...connectionConfig, ...tileConfig, apiUrl: (connectionConfig.apiUrl as string) || "" } as PluginConfig;

      // Backward compat: if no AppConnection, fall back to legacy tile-only config
      if (!tile.appConnection) {
        config = tile.enhancedConfig ? JSON.parse(decrypt(tile.enhancedConfig)) : { apiUrl: "" };
      }
    } catch {
      return NextResponse.json({ items: [], status: "error", error: "Invalid config" }, { status: 400 });
    }

    // Token refresh: if plugin supports it and token is expired
    if (plugin.refreshToken && config.expiresAt) {
      const expiresAt = Number(config.expiresAt);
      const now = Math.floor(Date.now() / 1000);
      if (now >= expiresAt - 60) { // Refresh 60s before expiry
        try {
          const newTokens = await plugin.refreshToken(config as PluginConfig);
          config.accessToken = newTokens.accessToken;
          if (newTokens.refreshToken) config.refreshToken = newTokens.refreshToken;
          if (newTokens.expiresAt) config.expiresAt = newTokens.expiresAt;

          // Persist new tokens to AppConnection
          if (tile.appConnection) {
            const existingConfig = tile.appConnection.config
              ? JSON.parse(decrypt(tile.appConnection.config))
              : {};
            const updatedConfig = {
              ...existingConfig,
              accessToken: newTokens.accessToken,
              ...(newTokens.refreshToken && { refreshToken: newTokens.refreshToken }),
              ...(newTokens.expiresAt && { expiresAt: newTokens.expiresAt }),
            };
            await prisma.appConnection.update({
              where: { id: tile.appConnection.id },
              data: { config: encrypt(JSON.stringify(updatedConfig)) },
            });
          }
        } catch (e) {
          logger.warn("enhanced", `Token refresh failed for ${tile.enhancedType}`, { error: (e as Error).message });
        }
      }
    }

    const rawStats = await plugin.fetchStats(config);
    const stats = validateStats(rawStats);
    logger.debug("enhanced-api", "Fetched stats", { tileId: String(tileId), plugin: tile.enhancedType });
    return NextResponse.json(stats);
  } catch (err) {
    const message = (err as Error).message;
    logger.error("enhanced-api", "Failed to fetch stats", { error: message });
    return NextResponse.json(
      { items: [], status: "error", error: message },
      { status: 500 }
    );
  }
}
