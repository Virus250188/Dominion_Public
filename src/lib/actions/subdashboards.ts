"use server";

import prisma from "@/lib/db";
import { requireUserId } from "@/lib/actions/requireUserId";
import { revalidatePath } from "next/cache";

export async function createSubDashboard(data: {
  title: string;
  icon?: string;
  color?: string;
  description?: string;
}) {
  const userId = await requireUserId();

  const maxOrder = await prisma.subDashboard.aggregate({
    _max: { order: true },
    where: { userId },
  });

  const subDashboard = await prisma.subDashboard.create({
    data: {
      title: data.title,
      icon: data.icon ?? null,
      color: data.color ?? "#6366f1",
      description: data.description ?? null,
      order: (maxOrder._max.order ?? 0) + 1,
      userId,
    },
  });

  revalidatePath("/");
  return subDashboard;
}

export async function updateSubDashboard(
  id: number,
  data: {
    title?: string;
    icon?: string;
    color?: string;
    description?: string;
  }
) {
  const userId = await requireUserId();

  // Verify ownership
  const existing = await prisma.subDashboard.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Sub-Dashboard not found or access denied");
  }

  const subDashboard = await prisma.subDashboard.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });

  revalidatePath("/");
  return subDashboard;
}

export async function deleteSubDashboard(id: number) {
  const userId = await requireUserId();

  // Verify ownership
  const existing = await prisma.subDashboard.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Sub-Dashboard not found or access denied");
  }

  // Unlink tiles: move them back to main dashboard (set subDashboardId to null)
  await prisma.tile.updateMany({
    where: { subDashboardId: id },
    data: { subDashboardId: null },
  });

  // Unlink groups: move them back to main dashboard
  await prisma.tileGroup.updateMany({
    where: { subDashboardId: id },
    data: { subDashboardId: null },
  });

  // Delete the sub-dashboard
  await prisma.subDashboard.delete({ where: { id } });

  revalidatePath("/");
}

export async function assignTileToSubDashboard(
  tileId: number,
  subDashboardId: number | null
) {
  const userId = await requireUserId();

  // Verify tile ownership
  const tile = await prisma.tile.findUnique({ where: { id: tileId } });
  if (!tile || tile.userId !== userId) {
    throw new Error("Tile not found or access denied");
  }

  // If assigning to a sub-dashboard, verify ownership
  if (subDashboardId !== null) {
    const sub = await prisma.subDashboard.findUnique({
      where: { id: subDashboardId },
    });
    if (!sub || sub.userId !== userId) {
      throw new Error("Sub-Dashboard not found or access denied");
    }
  }

  await prisma.tile.update({
    where: { id: tileId },
    data: { subDashboardId },
  });

  revalidatePath("/");
}

export async function assignTilesToSubDashboard(
  subDashboardId: number,
  tileIds: number[]
) {
  const userId = await requireUserId();

  // Verify sub-dashboard ownership
  const sub = await prisma.subDashboard.findUnique({
    where: { id: subDashboardId },
  });
  if (!sub || sub.userId !== userId) {
    throw new Error("Sub-Dashboard not found or access denied");
  }

  // Remove all current tile assignments for this sub-dashboard
  await prisma.tile.updateMany({
    where: { subDashboardId },
    data: { subDashboardId: null },
  });

  // Assign the new set of tiles
  if (tileIds.length > 0) {
    await prisma.tile.updateMany({
      where: { id: { in: tileIds }, userId },
      data: { subDashboardId },
    });
  }

  revalidatePath("/");
}
