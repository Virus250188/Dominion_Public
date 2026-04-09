"use server";

import prisma from "@/lib/db";
import { requireUserId } from "@/lib/actions/requireUserId";
import { encrypt, decrypt } from "@/lib/crypto";
import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/notifications/keys";

const SETTINGS_PATH = "/settings/notifications";

// ─── SSRF protection for RSS feeds ─────────────────────────────────────────

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.internal",
]);

function isRssUrlBlocked(rawUrl: string): boolean {
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

async function validateRssFeed(url: string): Promise<{ ok: boolean; error?: string }> {
  if (isRssUrlBlocked(url)) {
    return { ok: false, error: "Diese URL ist nicht erlaubt" };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Dominion-Dashboard/1.0 RSS-Validator" },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return { ok: false, error: `Feed nicht erreichbar (HTTP ${res.status})` };
    }
    const text = await res.text();
    if (!text.includes("<rss") && !text.includes("<feed") && !text.includes("<channel")) {
      return { ok: false, error: "URL liefert keinen gültigen RSS/Atom Feed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Feed nicht erreichbar — URL prüfen" };
  }
}

// ─── Acknowledge ────────────────────────────────────────────────────────────

export async function acknowledgeNotification(id: number) {
  const userId = await requireUserId();

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    throw new Error("Notification not found or access denied");
  }

  await prisma.notification.update({
    where: { id },
    data: { acknowledged: true },
  });
}

// ─── List Sources ───────────────────────────────────────────────────────────

export async function getNotificationSources() {
  const userId = await requireUserId();

  const sources = await prisma.notificationSource.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return sources.map((source) => ({
    ...source,
    apiKey: decrypt(source.apiKey),
  }));
}

// ─── Create Source ──────────────────────────────────────────────────────────

export async function createNotificationSource(data: {
  sourceId: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
  rssUrl?: string;
  rssInterval?: number;
  rateLimit?: number;
  appConnectionId?: number;
  defaultCategory?: string;
}) {
  const userId = await requireUserId();

  // Check name uniqueness (case-insensitive) via raw SQL — SQLite doesn't support mode:"insensitive"
  const duplicates = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM "NotificationSource"
    WHERE "userId" = ${userId}
      AND LOWER("name") = LOWER(${data.name})
    LIMIT 1
  `;
  if (duplicates.length > 0) {
    return { error: "Dieser Name ist bereits vergeben" };
  }

  // Validate RSS feed URL before creating
  if (data.type === "rss" && data.rssUrl) {
    const feedCheck = await validateRssFeed(data.rssUrl);
    if (!feedCheck.ok) {
      return { error: feedCheck.error ?? "Feed nicht erreichbar" };
    }
  }

  const plainKey = data.type === "rss" ? null : generateApiKey();
  const encryptedKey = plainKey ? encrypt(plainKey) : "";

  const source = await prisma.notificationSource.create({
    data: {
      userId,
      sourceId: data.sourceId,
      name: data.name,
      type: data.type,
      icon: data.icon || null,
      color: data.color || "#6366f1",
      apiKey: encryptedKey,
      rssUrl: data.rssUrl || null,
      rssInterval: data.rssInterval || null,
      rateLimit: data.rateLimit || 60,
      defaultCategory: data.defaultCategory || null,
      appConnectionId: data.appConnectionId || null,
    },
  });

  revalidatePath(SETTINGS_PATH);
  return { ...source, apiKey: plainKey || "" };
}

// ─── Update Source ──────────────────────────────────────────────────────────

export async function updateNotificationSource(
  id: number,
  data: Partial<{
    name: string;
    icon: string;
    color: string;
    enabled: boolean;
    rssUrl: string;
    rssInterval: number;
    rateLimit: number;
  }>
) {
  const userId = await requireUserId();

  const existing = await prisma.notificationSource.findUnique({
    where: { id },
  });
  if (!existing || existing.userId !== userId) {
    throw new Error("NotificationSource not found or access denied");
  }

  // Validate RSS URL if it's being changed
  if (data.rssUrl !== undefined) {
    const feedCheck = await validateRssFeed(data.rssUrl);
    if (!feedCheck.ok) {
      return { error: feedCheck.error ?? "Feed nicht erreichbar" };
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.enabled !== undefined) updateData.enabled = data.enabled;
  if (data.rssUrl !== undefined) updateData.rssUrl = data.rssUrl;
  if (data.rssInterval !== undefined) updateData.rssInterval = data.rssInterval;
  if (data.rateLimit !== undefined) updateData.rateLimit = data.rateLimit;

  const source = await prisma.notificationSource.update({
    where: { id },
    data: updateData,
  });

  revalidatePath(SETTINGS_PATH);
  return source;
}

// ─── Delete Source ──────────────────────────────────────────────────────────

export async function deleteNotificationSource(id: number) {
  const userId = await requireUserId();

  const existing = await prisma.notificationSource.findUnique({
    where: { id },
  });
  if (!existing || existing.userId !== userId) {
    throw new Error("NotificationSource not found or access denied");
  }

  // Prisma cascade (onDelete: Cascade) handles deleting notifications
  await prisma.notificationSource.delete({ where: { id } });

  revalidatePath(SETTINGS_PATH);
}

// ─── Regenerate API Key ─────────────────────────────────────────────────────

export async function regenerateApiKey(id: number) {
  const userId = await requireUserId();

  const existing = await prisma.notificationSource.findUnique({
    where: { id },
  });
  if (!existing || existing.userId !== userId) {
    throw new Error("NotificationSource not found or access denied");
  }

  const plainKey = generateApiKey();
  const encryptedKey = encrypt(plainKey);

  await prisma.notificationSource.update({
    where: { id },
    data: { apiKey: encryptedKey },
  });

  revalidatePath(SETTINGS_PATH);
  return plainKey;
}
