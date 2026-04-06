"use server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/crypto";
import { revalidatePath } from "next/cache";

/**
 * Get the authenticated userId from the session.
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

export async function createAppConnection(data: {
  pluginType: string;
  name: string;
  icon?: string | null;
  customIconSvg?: string | null;
  color?: string;
  url?: string | null;
  config?: string | null; // plaintext JSON - will be encrypted
  description?: string | null;
}) {
  const userId = await requireUserId();

  const encryptedConfig = data.config ? encrypt(data.config) : null;

  const connection = await prisma.appConnection.create({
    data: {
      userId,
      pluginType: data.pluginType,
      name: data.name,
      icon: data.icon ?? null,
      customIconSvg: data.customIconSvg ?? null,
      color: data.color ?? "#3b82f6",
      url: data.url ?? null,
      config: encryptedConfig,
      description: data.description ?? null,
    },
  });

  revalidatePath("/");
  revalidatePath("/settings/apps");
  return connection;
}

export async function updateAppConnection(
  id: number,
  data: {
    name?: string;
    icon?: string | null;
    customIconSvg?: string | null;
    color?: string;
    url?: string | null;
    config?: string | null; // plaintext JSON - will be encrypted
    description?: string | null;
  }
) {
  const userId = await requireUserId();

  const existing = await prisma.appConnection.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("AppConnection not found or access denied");
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.customIconSvg !== undefined) updateData.customIconSvg = data.customIconSvg;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.url !== undefined) updateData.url = data.url;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.config !== undefined) {
    updateData.config = data.config ? encrypt(data.config) : null;
  }

  const connection = await prisma.appConnection.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/");
  revalidatePath("/settings/apps");
  return connection;
}

export async function deleteAppConnection(id: number) {
  const userId = await requireUserId();

  const existing = await prisma.appConnection.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("AppConnection not found or access denied");
  }

  // Unlink tiles (set appConnectionId to null) — schema has onDelete: SetNull
  await prisma.tile.updateMany({
    where: { appConnectionId: id },
    data: { appConnectionId: null },
  });

  // Delete the connection itself
  await prisma.appConnection.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/settings/apps");
}

export async function getAppConnectionConfig(connectionId: number) {
  const userId = await requireUserId();

  const connection = await prisma.appConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection || connection.userId !== userId) {
    return null;
  }

  if (!connection.config) return null;

  try {
    const decrypted = JSON.parse(decrypt(connection.config));
    return {
      accessToken: decrypted.accessToken as string | undefined,
      refreshToken: decrypted.refreshToken as string | undefined,
      expiresAt: decrypted.expiresAt as number | undefined,
    };
  } catch {
    return null;
  }
}
