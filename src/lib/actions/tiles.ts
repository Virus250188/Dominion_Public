"use server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { getPlugin } from "@/plugins/registry";
import { encrypt, decrypt } from "@/lib/crypto";
import { revalidatePath } from "next/cache";

/**
 * Get the authenticated userId from the session.
 * Throws if not authenticated.
 */
async function requireUserId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: no active session");
  }
  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    throw new Error("Unauthorized: invalid user ID in session");
  }
  return userId;
}

/**
 * Validate enhanced tile configuration.
 * Checks that JSON is valid, required config fields are present,
 * and the requested tile size is supported by the plugin.
 */
function validateEnhancedTile(data: {
  enhancedType?: string;
  enhancedConfig?: string;
  columnSpan?: number;
  rowSpan?: number;
  hasAppConnection?: boolean;
}): { error?: string } {
  if (!data.enhancedType) return {};

  const plugin = getPlugin(data.enhancedType);
  if (!plugin) {
    return { error: `Unknown enhanced type: ${data.enhancedType}` };
  }

  // Validate enhancedConfig is valid JSON and has required fields
  if (data.enhancedConfig) {
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(data.enhancedConfig);
    } catch {
      return { error: "enhancedConfig is not valid JSON" };
    }

    if (typeof config !== "object" || config === null || Array.isArray(config)) {
      return { error: "enhancedConfig must be a JSON object" };
    }

    // Skip connection field validation when tile has an AppConnection
    // (connection fields like apiUrl/apiKey are stored in AppConnection, not enhancedConfig)
    const CONNECTION_KEYS = new Set(["apiUrl", "apiKey", "accessToken", "username", "password"]);

    const missingFields = plugin.configFields
      .filter((f) => f.required)
      .filter((f) => !(data.hasAppConnection && CONNECTION_KEYS.has(f.key)))
      .filter((f) => !config[f.key])
      .map((f) => f.label);

    if (missingFields.length > 0) {
      return {
        error: `Missing required config fields: ${missingFields.join(", ")}`,
      };
    }
  }

  // Validate tile size is supported by the plugin
  const colSpan = data.columnSpan ?? 1;
  const rowSpan = data.rowSpan ?? 1;
  const sizeKey = `${colSpan}x${rowSpan}`;

  if (!plugin.supportedSizes.includes(sizeKey as "1x1" | "2x1" | "2x2")) {
    return {
      error: `Size ${sizeKey} is not supported by ${plugin.metadata.name}. Supported: ${plugin.supportedSizes.join(", ")}`,
    };
  }

  return {};
}

export async function createTile(data: {
  title: string;
  url: string;
  color?: string;
  icon?: string;
  customIconSvg?: string | null;
  description?: string;
  type?: string;
  enhancedType?: string;
  enhancedConfig?: string;
  columnSpan?: number;
  rowSpan?: number;
  groupId?: number | null;
  subDashboardId?: number | null;
  userId?: number;
  appConnectionId?: number | null;
}) {
  const userId = await requireUserId();

  // Validate enhanced tile config and size if applicable
  if (data.type === "enhanced" || data.enhancedType) {
    const validation = validateEnhancedTile({
      ...data,
      hasAppConnection: !!data.appConnectionId,
    });
    if (validation.error) {
      throw new Error(validation.error);
    }
  }

  // Encrypt enhanced config before storing
  const encryptedConfig = data.enhancedConfig ? encrypt(data.enhancedConfig) : null;

  // Get the max order for this user
  const maxOrder = await prisma.tile.aggregate({
    where: { userId },
    _max: { order: true },
  });

  const tile = await prisma.tile.create({
    data: {
      title: data.title,
      url: data.url,
      color: data.color ?? "#6366f1",
      icon: data.icon ?? null,
      customIconSvg: data.customIconSvg ?? null,
      description: data.description ?? null,
      type: data.type ?? "standard",
      enhancedType: data.enhancedType ?? null,
      enhancedConfig: encryptedConfig,
      columnSpan: data.columnSpan ?? 1,
      rowSpan: data.rowSpan ?? 1,
      groupId: data.groupId ?? null,
      subDashboardId: data.subDashboardId ?? null,
      appConnectionId: data.appConnectionId ?? null,
      order: (maxOrder._max.order ?? 0) + 1,
      userId,
    },
  });

  revalidatePath("/");
  return tile;
}

export async function updateTile(
  id: number,
  data: {
    title?: string;
    url?: string;
    color?: string;
    icon?: string;
    customIconSvg?: string | null;
    description?: string;
    type?: string;
    enhancedType?: string;
    enhancedConfig?: string;
    columnSpan?: number;
    rowSpan?: number;
    pinned?: boolean;
    groupId?: number | null;
    appConnectionId?: number | null;
  }
) {
  const userId = await requireUserId();

  // Verify ownership before updating
  const existing = await prisma.tile.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Tile not found or access denied");
  }

  // Validate enhanced tile config and size if applicable
  // Merge existing values with update data for validation
  // Note: existing.enhancedConfig may be encrypted, so decrypt for validation
  const enhancedType = data.enhancedType ?? existing.enhancedType;
  if (enhancedType && (data.enhancedType || data.enhancedConfig || data.columnSpan || data.rowSpan)) {
    const existingConfigPlain = existing.enhancedConfig ? decrypt(existing.enhancedConfig) : undefined;
    const hasConnection = !!(data.appConnectionId ?? existing.appConnectionId);
    const validation = validateEnhancedTile({
      enhancedType,
      enhancedConfig: data.enhancedConfig ?? existingConfigPlain ?? undefined,
      columnSpan: data.columnSpan ?? existing.columnSpan,
      rowSpan: data.rowSpan ?? existing.rowSpan,
      hasAppConnection: hasConnection,
    });
    if (validation.error) {
      throw new Error(validation.error);
    }
  }

  // Encrypt enhanced config before storing
  const updateData = { ...data };
  if (updateData.enhancedConfig) {
    updateData.enhancedConfig = encrypt(updateData.enhancedConfig);
  }

  const tile = await prisma.tile.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/");
  return tile;
}

export async function deleteTile(id: number) {
  const userId = await requireUserId();

  // Verify ownership before deleting
  const existing = await prisma.tile.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Tile not found or access denied");
  }

  await prisma.tile.delete({ where: { id } });
  revalidatePath("/");
}

export async function reorderTiles(orderedIds: number[]) {
  const userId = await requireUserId();

  // Verify all tiles belong to the authenticated user
  const tiles = await prisma.tile.findMany({
    where: { id: { in: orderedIds }, userId },
    select: { id: true },
  });

  const ownedIds = new Set(tiles.map((t) => t.id));
  const unauthorizedIds = orderedIds.filter((id) => !ownedIds.has(id));
  if (unauthorizedIds.length > 0) {
    throw new Error("Access denied: some tiles do not belong to this user");
  }

  // Batch update all tiles with new order values
  const updates = orderedIds.map((id, index) =>
    prisma.tile.update({
      where: { id },
      data: { order: index },
    })
  );

  await prisma.$transaction(updates);
  revalidatePath("/");
}

/**
 * Creates an enhanced tile and auto-creates an AppConnection if one doesn't exist
 * for the given plugin type. If an AppConnection already exists, links to it.
 * The enhancedConfig on the tile only stores display-related config (visibleStats, etc.).
 * Connection data (apiUrl, apiKey, etc.) is stored in AppConnection.config.
 */
export async function createEnhancedTileWithConnection(data: {
  title: string;
  url: string;
  color?: string;
  icon?: string;
  customIconSvg?: string | null;
  description?: string;
  enhancedType: string;
  enhancedConfig?: string; // Full config JSON (will be split)
  columnSpan?: number;
  rowSpan?: number;
  groupId?: number | null;
  subDashboardId?: number | null;
  appConnectionId?: number | null;
}) {
  const userId = await requireUserId();

  let appConnectionId = data.appConnectionId;

  // If no existing connection, create one from the config
  if (!appConnectionId && data.enhancedConfig) {
    let fullConfig: Record<string, unknown> = {};
    try {
      fullConfig = JSON.parse(data.enhancedConfig);
    } catch {
      // ignore
    }

    // Extract connection-level fields
    const CONNECTION_KEYS = new Set(["apiUrl", "apiKey", "accessToken", "username", "password"]);
    const connectionConfig: Record<string, unknown> = {};
    for (const key of CONNECTION_KEYS) {
      if (fullConfig[key]) {
        connectionConfig[key] = fullConfig[key];
      }
    }

    // Check if connection already exists for this plugin type
    const existing = await prisma.appConnection.findFirst({
      where: { pluginType: data.enhancedType, userId },
    });

    if (existing) {
      appConnectionId = existing.id;
      // Update the existing connection config
      await prisma.appConnection.update({
        where: { id: existing.id },
        data: {
          config: encrypt(JSON.stringify(connectionConfig)),
          url: (fullConfig.apiUrl as string) || data.url || existing.url,
          name: data.title || existing.name,
          icon: data.icon || existing.icon,
          color: data.color || existing.color,
        },
      });
    } else {
      // Create new AppConnection
      const newConn = await prisma.appConnection.create({
        data: {
          userId,
          pluginType: data.enhancedType,
          name: data.title,
          icon: data.icon ?? null,
          customIconSvg: data.customIconSvg ?? null,
          color: data.color ?? "#3b82f6",
          url: (fullConfig.apiUrl as string) || data.url || null,
          config: encrypt(JSON.stringify(connectionConfig)),
          description: data.description ?? null,
        },
      });
      appConnectionId = newConn.id;
    }

    // Strip connection keys from enhancedConfig, keep only display config
    const displayConfig: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fullConfig)) {
      if (!CONNECTION_KEYS.has(key)) {
        displayConfig[key] = value;
      }
    }
    data.enhancedConfig = JSON.stringify(displayConfig);
  }

  // Now create the tile with the linked connection
  return createTile({
    ...data,
    type: "enhanced",
    appConnectionId,
  });
}

export async function togglePinTile(id: number, pinned: boolean) {
  const userId = await requireUserId();

  // Verify ownership before updating
  const existing = await prisma.tile.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Tile not found or access denied");
  }

  await prisma.tile.update({
    where: { id },
    data: { pinned },
  });
  revalidatePath("/");
}
