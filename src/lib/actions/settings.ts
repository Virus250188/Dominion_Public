"use server";

import prisma from "@/lib/db";
import { requireUserId } from "@/lib/actions/requireUserId";
import { encrypt, decrypt } from "@/lib/crypto";
import { revalidatePath } from "next/cache";

export async function updateUserSettings(
  userId?: number,
  data?: {
    theme?: string;
    background?: string | null;
    backgroundType?: string;
    searchProvider?: string;
    language?: string;
    gridColumns?: number;
    tileSize?: string;
    showSearch?: boolean;
    showClock?: boolean;
    showGreeting?: boolean;
    aiProvider?: string | null;
    aiApiKey?: string | null;
    aiModel?: string | null;
    aiEndpoint?: string | null;
  }
) {
  const authenticatedUserId = await requireUserId();

  // Ignore the userId parameter -- always use the authenticated user
  const actualUserId = authenticatedUserId;

  if (!data) {
    throw new Error("No data provided");
  }

  // Encrypt API key before storing
  if (data.aiApiKey) {
    data.aiApiKey = encrypt(data.aiApiKey);
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: actualUserId },
    update: data,
    create: { userId: actualUserId, ...data },
  });
  revalidatePath("/");
  revalidatePath("/settings");
  return settings;
}

export async function exportData(userId?: number) {
  const authenticatedUserId = await requireUserId();

  const [tiles, settings, searchProviders] = await Promise.all([
    prisma.tile.findMany({ where: { userId: authenticatedUserId } }),
    prisma.userSettings.findUnique({ where: { userId: authenticatedUserId } }),
    prisma.searchProvider.findMany(),
  ]);
  // Decrypt sensitive fields for export
  const decryptedTiles = tiles.map((t) => ({
    ...t,
    enhancedConfig: t.enhancedConfig ? decrypt(t.enhancedConfig) : t.enhancedConfig,
  }));
  const decryptedSettings = settings
    ? { ...settings, aiApiKey: settings.aiApiKey ? decrypt(settings.aiApiKey) : settings.aiApiKey }
    : settings;
  return { tiles: decryptedTiles, settings: decryptedSettings, searchProviders, exportedAt: new Date().toISOString() };
}

export async function importData(
  userId?: number,
  data?: { tiles: Array<Record<string, unknown>>; settings: Record<string, unknown> | null }
) {
  const authenticatedUserId = await requireUserId();

  if (!data) {
    throw new Error("No data provided");
  }

  await prisma.$transaction(async (tx) => {
    // Delete existing tiles for this user
    await tx.tile.deleteMany({ where: { userId: authenticatedUserId } });

    // Import tiles
    for (const tile of data.tiles) {
      await tx.tile.create({
        data: {
          title: tile.title as string,
          url: tile.url as string,
          color: (tile.color as string) || "#6366f1",
          icon: tile.icon as string | null,
          description: tile.description as string | null,
          pinned: (tile.pinned as boolean) || false,
          order: (tile.order as number) || 0,
          columnSpan: (tile.columnSpan as number) || 1,
          rowSpan: (tile.rowSpan as number) || 1,
          type: (tile.type as string) || "standard",
          enhancedType: tile.enhancedType as string | null,
          enhancedConfig: tile.enhancedConfig ? encrypt(tile.enhancedConfig as string) : null,
          userId: authenticatedUserId,
        },
      });
    }

    // Import settings
    if (data.settings) {
      await tx.userSettings.upsert({
        where: { userId: authenticatedUserId },
        update: {
          theme: data.settings.theme as string | undefined,
          background: data.settings.background as string | null | undefined,
          searchProvider: data.settings.searchProvider as string | undefined,
          gridColumns: data.settings.gridColumns as number | undefined,
          tileSize: data.settings.tileSize as string | undefined,
          showSearch: data.settings.showSearch as boolean | undefined,
          showClock: data.settings.showClock as boolean | undefined,
          showGreeting: data.settings.showGreeting as boolean | undefined,
        },
        create: { userId: authenticatedUserId },
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/settings");
}
