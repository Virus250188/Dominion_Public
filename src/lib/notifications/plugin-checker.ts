// ─── Plugin Notification Checker ─────────────────────────────────────────────
// Fire-and-forget service called after fetchStats in the enhanced API route.
// Detects state changes via plugin.checkNotifications(), filters them through
// the user's enabled rule-set, deduplicates, and creates Notification records
// + SSE broadcasts.
//
// NotificationSources are NOT auto-provisioned here — users must explicitly
// enable notifications for an app connection via the `enableAppNotifications`
// server action. If no source exists for a connection (or it is disabled), the
// check silently returns without creating any notifications.

import prisma from "@/lib/db";
import { logger } from "@/lib/logger";
import { sseManager } from "@/lib/notifications/sse-manager";
import type { AppPlugin, PluginConfig } from "@/plugins/types";

// ─── In-memory caches (globalThis singletons, survive HMR) ──────────────────

interface PluginCheckerState {
  /** tileId → last widgetData snapshot */
  previousData: Map<number, Record<string, unknown>>;
  /** tileId → timestamp (ms) of last checkNotifications run */
  throttle: Map<number, number>;
  /** appConnectionId → { id, ruleConfig } (null = no source / disabled) */
  sourceCache: Map<number, { id: number; ruleConfig: string | null } | null>;
}

const globalForChecker = globalThis as unknown as { pluginChecker: PluginCheckerState };

const state: PluginCheckerState = globalForChecker.pluginChecker ?? {
  previousData: new Map(),
  throttle: new Map(),
  sourceCache: new Map(),
};

if (process.env.NODE_ENV !== "production") {
  globalForChecker.pluginChecker = state;
}

const THROTTLE_MS = 30_000; // min 30s between checks per tile
const DEFAULT_DEDUP_MINUTES = 60;

// ─── Public entry point (fire-and-forget) ────────────────────────────────────

/**
 * Called from GET /api/enhanced/[appId] after fetchStats.
 * Synchronous — spawns async work internally. Never throws.
 */
export function maybeCheckPluginNotifications(
  tileId: number,
  userId: number,
  plugin: AppPlugin,
  pluginType: string,
  appConnectionId: number,
  currentWidgetData: Record<string, unknown>,
  config: PluginConfig,
): void {
  // Guard: plugin must support notifications and provide the method
  if (!plugin.supportsNotifications || typeof plugin.checkNotifications !== "function") {
    return;
  }

  // Throttle: skip if checked recently
  const now = Date.now();
  const lastCheck = state.throttle.get(tileId) ?? 0;
  if (now - lastCheck < THROTTLE_MS) {
    return;
  }
  state.throttle.set(tileId, now);

  // Fire-and-forget
  runNotificationCheck(
    tileId, userId, plugin, pluginType,
    appConnectionId, currentWidgetData, config,
  ).catch((err) => {
    logger.error("plugin-checker", "Notification check failed", {
      tileId: String(tileId),
      plugin: pluginType,
      error: (err as Error).message,
    });
  });
}

// ─── Internal async check ────────────────────────────────────────────────────

async function runNotificationCheck(
  tileId: number,
  userId: number,
  plugin: AppPlugin,
  pluginType: string,
  appConnectionId: number,
  currentWidgetData: Record<string, unknown>,
  config: PluginConfig,
): Promise<void> {
  const previousData = state.previousData.get(tileId) ?? null;

  // Always update the cache before calling the plugin (even if it throws)
  state.previousData.set(tileId, currentWidgetData);

  // Call the plugin
  const notifications = await plugin.checkNotifications!(config, currentWidgetData, previousData);

  if (!Array.isArray(notifications) || notifications.length === 0) {
    return;
  }

  // Resolve the NotificationSource for this connection.
  // NOTE: sources are no longer auto-created — users must explicitly enable
  // notifications for the connection first via `enableAppNotifications`.
  const source = await getPluginSource(userId, pluginType, appConnectionId);
  if (source === null) {
    // No source (or disabled) — user hasn't enabled notifications for this connection
    return;
  }

  // Strict rule-filter: only emit notifications whose `tag` is in `enabledRules`.
  // Notifications without a tag or with an unknown tag are silently dropped.
  const enabledRules: string[] = source.ruleConfig
    ? (() => {
        try {
          const parsed = JSON.parse(source.ruleConfig);
          return Array.isArray(parsed?.enabledRules) ? parsed.enabledRules : [];
        } catch {
          return [];
        }
      })()
    : [];
  const ruleIds = new Set(enabledRules);
  const filtered = notifications.filter(
    (n) => n.tag !== undefined && n.tag !== null && ruleIds.has(n.tag),
  );
  if (filtered.length === 0) return;

  const sourceId = source.id;

  for (const n of filtered) {
    if (!n.dedupKey || !n.title) continue;

    try {
      const isDuplicate = await checkDedup(sourceId, n.dedupKey, n.dedupMinutes ?? DEFAULT_DEDUP_MINUTES);
      if (isDuplicate) {
        logger.debug("plugin-checker", `Dedup hit: ${n.dedupKey}`, { plugin: pluginType });
        continue;
      }

      const notification = await prisma.notification.create({
        data: {
          userId,
          sourceId,
          title: n.title.slice(0, 255),
          message: n.message?.slice(0, 2000) ?? null,
          category: n.category ?? "info",
          tag: n.tag ?? null,
          priority: typeof n.priority === "number" ? Math.min(Math.max(n.priority, 0), 3) : 1,
          url: n.url ?? null,
          dedupKey: n.dedupKey,
        },
        include: {
          source: {
            select: { name: true, icon: true, color: true, sourceId: true },
          },
        },
      });

      sseManager.broadcast(userId, {
        type: "notification",
        data: notification,
      });

      logger.info("plugin-checker", `Notification created: ${n.title}`, {
        plugin: pluginType,
        dedupKey: n.dedupKey,
      });
    } catch (err) {
      logger.error("plugin-checker", `Failed to create notification: ${n.dedupKey}`, {
        error: (err as Error).message,
      });
    }
  }
}

// ─── Dedup check ─────────────────────────────────────────────────────────────

async function checkDedup(
  sourceId: number,
  dedupKey: string,
  dedupMinutes: number,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - dedupMinutes * 60 * 1000);

  const existing = await prisma.notification.findFirst({
    where: {
      sourceId,
      dedupKey,
      acknowledged: false,
      receivedAt: { gte: cutoff },
    },
    select: { id: true },
  });

  return existing !== null;
}

// ─── Resolve NotificationSource (no auto-provisioning) ──────────────────────

async function getPluginSource(
  userId: number,
  pluginType: string,
  appConnectionId: number,
): Promise<{ id: number; ruleConfig: string | null } | null> {
  // Check in-memory cache first (null means "no source / disabled")
  const cached = state.sourceCache.get(appConnectionId);
  if (cached !== undefined) {
    return cached;
  }

  const sourceId = `plugin-${pluginType}-${appConnectionId}`;

  const existing = await prisma.notificationSource.findUnique({
    where: { userId_sourceId: { userId, sourceId } },
    select: { id: true, enabled: true, ruleConfig: true },
  });

  if (!existing || !existing.enabled) {
    state.sourceCache.set(appConnectionId, null);
    return null;
  }

  const result = { id: existing.id, ruleConfig: existing.ruleConfig };
  state.sourceCache.set(appConnectionId, result);
  return result;
}

/**
 * Invalidate the cached source for a given appConnectionId.
 * Call this from server actions after creating/updating/deleting a
 * NotificationSource so the next notification check re-reads from the DB.
 */
export function invalidatePluginSourceCache(appConnectionId: number): void {
  state.sourceCache.delete(appConnectionId);
}
