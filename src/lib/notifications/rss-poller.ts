// ─── RSS Feed Poller ─────────────────────────────────────────────────────────
// Polls RSS feeds for all enabled RSS-type NotificationSources.
// Called by the /api/notifications/rss-poll endpoint (triggered by cron or
// client-side interval from NotificationPanelContext).

import Parser from "rss-parser";
import prisma from "@/lib/db";
import { logger } from "@/lib/logger";
import { sseManager } from "@/lib/notifications/sse-manager";

// ─── SSRF protection ──────────────────────────────────────────────────────────

const BLOCKED_HOSTNAMES = new Set([
  "localhost", "metadata.google.internal", "metadata.internal",
]);

function isUrlBlocked(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return true;
    if (BLOCKED_HOSTNAMES.has(url.hostname.toLowerCase())) return true;
    if (url.hostname === "127.0.0.1" || url.hostname === "::1" || url.hostname === "0.0.0.0") return true;
    if (url.hostname.startsWith("169.254.")) return true;
    return false;
  } catch {
    return true;
  }
}

const MAX_MESSAGE_LENGTH = 2000;

interface PollResult {
  sourceId: number;
  sourceName: string;
  status: "ok" | "skipped" | "error";
  newNotifications: number;
  error?: string;
}

interface RSSPollSummary {
  polled: number;
  totalNew: number;
  results: PollResult[];
}

const parser = new Parser({
  timeout: 10_000,
  headers: { "User-Agent": "Dominion-Dashboard/1.0 RSS-Poller" },
});

/**
 * Polls all enabled RSS-type notification sources that are due for a refresh.
 * Safe to call concurrently — failures on individual feeds are isolated.
 */
export async function pollRSSFeeds(): Promise<RSSPollSummary> {
  const now = new Date();

  // Load all enabled RSS sources
  const sources = await prisma.notificationSource.findMany({
    where: {
      type: "rss",
      enabled: true,
      rssUrl: { not: null },
    },
  });

  logger.info("rss-poller", `Found ${sources.length} enabled RSS source(s)`);

  const results: PollResult[] = [];

  for (const source of sources) {
    // Skip sources that are not yet due
    if (source.rssLastFetch && source.rssInterval) {
      const nextFetch = new Date(
        source.rssLastFetch.getTime() + source.rssInterval * 60 * 1000
      );
      if (now < nextFetch) {
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          status: "skipped",
          newNotifications: 0,
        });
        logger.debug(
          "rss-poller",
          `Skipping ${source.name} — next fetch at ${nextFetch.toISOString()}`
        );
        continue;
      }
    }

    // Poll the feed
    const result = await pollSingleFeed(source, now);
    results.push(result);
  }

  const polled = results.filter((r) => r.status !== "skipped").length;
  const totalNew = results.reduce((sum, r) => sum + r.newNotifications, 0);

  logger.info("rss-poller", `Poll complete: ${polled} polled, ${totalNew} new notifications`);

  return { polled, totalNew, results };
}

// ─── Internal: poll a single feed ───────────────────────────────────────────

async function pollSingleFeed(
  source: {
    id: number;
    userId: number;
    name: string;
    rssUrl: string | null;
    rssLastFetch: Date | null;
    createdAt: Date;
    defaultCategory: string | null;
  },
  now: Date
): Promise<PollResult> {
  const url = source.rssUrl!;

  if (isUrlBlocked(url)) {
    logger.warn("rss-poller", `SSRF protection: blocked poll for ${source.name}`, { url });
    return {
      sourceId: source.id,
      sourceName: source.name,
      status: "error" as const,
      newNotifications: 0,
      error: "URL blocked by SSRF protection",
    };
  }

  try {
    const feed = await parser.parseURL(url);
    const items = feed.items ?? [];

    // Determine cutoff: on first poll use source creation date to avoid importing old items
    const cutoff = source.rssLastFetch ?? source.createdAt;

    const newItems = items.filter((item) => {
      if (!cutoff) return true; // Safety fallback
      const pubDate = item.pubDate
        ? new Date(item.pubDate)
        : item.isoDate
        ? new Date(item.isoDate)
        : null;
      return pubDate !== null && pubDate > cutoff;
    });

    logger.info(
      "rss-poller",
      `${source.name}: ${items.length} total items, ${newItems.length} new`
    );

    let created = 0;

    for (const item of newItems) {
      const title = (item.title ?? "Untitled").slice(0, 255);
      const rawContent =
        item.contentSnippet ?? item.content ?? item.summary ?? "";
      const message = rawContent.slice(0, MAX_MESSAGE_LENGTH) || null;
      const itemUrl = item.link ?? null;

      try {
        const notification = await prisma.notification.create({
          data: {
            userId: source.userId,
            sourceId: source.id,
            title,
            message,
            category: source.defaultCategory || "info",
            tag: "RSS",
            url: itemUrl,
            priority: 1,
          },
          include: {
            source: {
              select: { name: true, icon: true, color: true, sourceId: true },
            },
          },
        });

        sseManager.broadcast(source.userId, {
          type: "notification",
          data: notification,
        });

        created++;
      } catch (itemErr) {
        logger.error("rss-poller", `Failed to save item for ${source.name}`, {
          title,
          error: (itemErr as Error).message,
        });
      }
    }

    // Update rssLastFetch regardless of whether new items were found
    await prisma.notificationSource.update({
      where: { id: source.id },
      data: { rssLastFetch: now },
    });

    return {
      sourceId: source.id,
      sourceName: source.name,
      status: "ok",
      newNotifications: created,
    };
  } catch (err) {
    logger.error("rss-poller", `Failed to poll feed for ${source.name}`, {
      url,
      error: (err as Error).message,
    });

    return {
      sourceId: source.id,
      sourceName: source.name,
      status: "error",
      newNotifications: 0,
      error: (err as Error).message,
    };
  }
}
