import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { sseManager } from "@/lib/notifications/sse-manager";
import { hashApiKey } from "@/lib/notifications/keys";
import type { NotificationCategory } from "@/lib/notifications/types";

const VALID_CATEGORIES: NotificationCategory[] = [
  "info",
  "warning",
  "critical",
  "update",
];
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TITLE_LENGTH = 255;

// ─── POST — External services send notifications ────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("X-Notification-Key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing X-Notification-Key header" },
        { status: 401 }
      );
    }

    // Look up by sha256(apiKey) — indexed unique column. Constant-time at
    // the DB layer and no decrypt-everything-and-compare loop.
    const incomingHash = hashApiKey(apiKey);
    let source = await prisma.notificationSource.findUnique({
      where: { apiKeyHash: incomingHash },
    });

    // Lazy backfill for sources created before the apiKeyHash column existed.
    // On the next successful POST their hash is persisted, so this branch is
    // taken at most once per legacy source.
    if (!source) {
      const legacySources = await prisma.notificationSource.findMany({
        where: { apiKeyHash: null, type: { not: "rss" } },
      });
      for (const candidate of legacySources) {
        if (!candidate.apiKey) continue;
        try {
          if (decrypt(candidate.apiKey) === apiKey) {
            source = await prisma.notificationSource.update({
              where: { id: candidate.id },
              data: { apiKeyHash: incomingHash },
            });
            break;
          }
        } catch {
          // skip undecryptable rows
        }
      }
    }

    if (!source) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Parse body early so we can return 400 before touching more DB
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Check source is enabled
    if (!source.enabled) {
      return NextResponse.json(
        { error: "Notification source is paused" },
        { status: 403 }
      );
    }

    // Rate limit: count notifications from this source in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.notification.count({
      where: {
        sourceId: source.id,
        receivedAt: { gte: oneHourAgo },
      },
    });

    if (recentCount >= source.rateLimit) {
      return NextResponse.json(
        { error: "Rate limit exceeded for this source" },
        { status: 429 }
      );
    }

    // Validate payload
    const { title, message, category, tag, priority, url, icon, expiresAt } =
      body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "title is required and must be a string" },
        { status: 400 }
      );
    }

    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `Title exceeds ${MAX_TITLE_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (message && typeof message === "string" && message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `message exceeds ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (category && !VALID_CATEGORIES.includes(category as NotificationCategory)) {
      return NextResponse.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (url && typeof url === "string" && !url.startsWith("http://") && !url.startsWith("https://")) {
      return NextResponse.json(
        { error: "Invalid URL — must start with http:// or https://" },
        { status: 400 }
      );
    }

    if (typeof priority === "number" && (priority < 0 || priority > 3)) {
      return NextResponse.json(
        { error: "Priority must be between 0 and 3" },
        { status: 400 }
      );
    }

    if (expiresAt) {
      const parsed = new Date(expiresAt as string);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid expiresAt date format" },
          { status: 400 }
        );
      }
    }

    // Save to DB
    const notification = await prisma.notification.create({
      data: {
        userId: source.userId,
        sourceId: source.id,
        title: title as string,
        message: (message as string | undefined) ?? null,
        category: (category as string | undefined) ?? "info",
        tag: (tag as string | undefined) ?? null,
        priority: typeof priority === "number" ? priority : 1,
        url: (url as string | undefined) ?? null,
        icon: (icon as string | undefined) ?? null,
        expiresAt: expiresAt ? new Date(expiresAt as string) : null,
      },
      include: {
        source: {
          select: { name: true, icon: true, color: true, sourceId: true },
        },
      },
    });

    // Broadcast via SSE
    sseManager.broadcast(source.userId, {
      type: "notification",
      data: notification,
    });

    logger.info("notifications", `New notification from ${source.name}`, {
      sourceId: source.sourceId,
      title,
    });

    return NextResponse.json({ id: notification.id }, { status: 201 });
  } catch (err) {
    logger.error("notifications", "POST failed", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET — Dashboard loads notifications ────────────────────────────────────

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id, 10);

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        acknowledged: false,
      },
      include: {
        source: {
          select: { name: true, icon: true, color: true, sourceId: true },
        },
      },
      orderBy: { receivedAt: "desc" },
      take: 20,
    });

    return NextResponse.json(notifications);
  } catch (err) {
    logger.error("notifications", "GET failed", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
