"use server";

import prisma from "@/lib/db";
import { requireUserId } from "@/lib/actions/requireUserId";
import { revalidatePath } from "next/cache";

export async function createGroup(data: { title: string; icon?: string; color?: string; subDashboardId?: number | null }) {
  const userId = await requireUserId();

  const maxOrder = await prisma.tileGroup.aggregate({ _max: { order: true } });
  const group = await prisma.tileGroup.create({
    data: {
      title: data.title,
      icon: data.icon ?? null,
      color: data.color ?? "#6366f1",
      order: (maxOrder._max.order ?? 0) + 1,
      userId,
      ...(data.subDashboardId != null && { subDashboardId: data.subDashboardId }),
    },
  });
  revalidatePath("/");
  return group;
}

export async function updateGroup(id: number, data: { title?: string; icon?: string; color?: string }) {
  const userId = await requireUserId();

  const group = await prisma.tileGroup.update({
    where: { id, userId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.color !== undefined && { color: data.color }),
    },
  });
  revalidatePath("/");
  return group;
}

export async function deleteGroup(id: number) {
  const userId = await requireUserId();

  // Verify ownership before deleting
  const group = await prisma.tileGroup.findUnique({ where: { id } });
  if (!group || group.userId !== userId) {
    throw new Error("Group not found or access denied");
  }

  await prisma.$transaction([
    prisma.groupTile.deleteMany({ where: { groupId: id } }),
    prisma.tile.updateMany({
      where: { groupId: id },
      data: { groupId: null },
    }),
    prisma.tileGroup.delete({ where: { id } }),
  ]);
  revalidatePath("/");
}

export async function assignTileToGroup(tileId: number, groupId: number | null) {
  const userId = await requireUserId();

  // Verify the tile belongs to the authenticated user
  const tile = await prisma.tile.findUnique({ where: { id: tileId } });
  if (!tile || tile.userId !== userId) {
    throw new Error("Tile not found or access denied");
  }

  await prisma.tile.update({
    where: { id: tileId },
    data: { groupId },
  });
  revalidatePath("/");
}

export async function cloneTileToGroup(tileId: number, groupId: number) {
  const userId = await requireUserId();

  // Verify the tile belongs to the authenticated user
  const tile = await prisma.tile.findUnique({ where: { id: tileId } });
  if (!tile || tile.userId !== userId) {
    throw new Error("Tile not found or access denied");
  }

  const maxOrder = await prisma.groupTile.aggregate({
    _max: { order: true },
    where: { groupId },
  });
  const groupTile = await prisma.groupTile.create({
    data: {
      tileId,
      groupId,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });
  revalidatePath("/");
  return groupTile;
}

export async function removeTileFromGroup(tileId: number, groupId: number) {
  await requireUserId();

  await prisma.groupTile.deleteMany({
    where: { tileId, groupId },
  });
  revalidatePath("/");
}

export async function reorderGroupTiles(groupId: number, orderedTileIds: number[]) {
  const userId = await requireUserId();

  // Verify ownership
  const group = await prisma.tileGroup.findUnique({ where: { id: groupId } });
  if (!group || group.userId !== userId) {
    throw new Error("Group not found or access denied");
  }

  const updates = orderedTileIds.map((tileId, index) =>
    prisma.groupTile.updateMany({
      where: { groupId, tileId },
      data: { order: index },
    })
  );
  await prisma.$transaction(updates);
  revalidatePath("/");
}

export async function toggleGroupCollapsed(groupId: number) {
  const userId = await requireUserId();

  const group = await prisma.tileGroup.findUnique({ where: { id: groupId } });
  if (!group || group.userId !== userId) {
    throw new Error("Group not found or access denied");
  }

  await prisma.tileGroup.update({
    where: { id: groupId },
    data: { collapsed: !group.collapsed },
  });
  revalidatePath("/");
}

export async function assignTilesToGroup(groupId: number, tileIds: number[]) {
  await requireUserId();

  // Get existing assignments
  const existing = await prisma.groupTile.findMany({
    where: { groupId },
    select: { tileId: true },
  });
  const existingIds = new Set(existing.map((e) => e.tileId));
  const targetIds = new Set(tileIds);

  // Remove assignments not in the new list
  const toRemove = [...existingIds].filter((id) => !targetIds.has(id));
  if (toRemove.length > 0) {
    await prisma.groupTile.deleteMany({
      where: { groupId, tileId: { in: toRemove } },
    });
  }

  // Add new assignments
  const toAdd = tileIds.filter((id) => !existingIds.has(id));
  if (toAdd.length > 0) {
    const maxOrder = await prisma.groupTile.aggregate({
      _max: { order: true },
      where: { groupId },
    });
    let nextOrder = (maxOrder._max.order ?? 0) + 1;
    await prisma.groupTile.createMany({
      data: toAdd.map((tileId) => ({
        groupId,
        tileId,
        order: nextOrder++,
      })),
    });
  }

  revalidatePath("/");
}
