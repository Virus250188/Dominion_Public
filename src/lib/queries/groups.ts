import prisma from "@/lib/db";

export async function getGroups(subDashboardId: number | null = null) {
  // Fetch groups with basic fields only (filtered by sub-dashboard context)
  const groups = await prisma.tileGroup.findMany({
    where: { subDashboardId },
    orderBy: { order: "asc" },
  });

  // Fetch group tile assignments for the relevant groups only
  const groupIds = groups.map((g) => g.id);
  const groupTileAssignments = groupIds.length > 0
    ? await prisma.groupTile.findMany({
        where: { groupId: { in: groupIds } },
        select: { groupId: true, tileId: true },
        orderBy: { order: "asc" },
      })
    : [];

  // Build lookup: groupId -> tileIds[]
  const assignmentMap = new Map<number, number[]>();
  for (const gt of groupTileAssignments) {
    const existing = assignmentMap.get(gt.groupId) || [];
    existing.push(gt.tileId);
    assignmentMap.set(gt.groupId, existing);
  }

  return groups.map((g) => {
    const tileIds = assignmentMap.get(g.id) || [];
    return {
      ...g,
      _count: { groupTiles: tileIds.length },
      groupTiles: tileIds.map((tileId) => ({ tileId })),
    };
  });
}

export async function getGroupsWithFullTiles(subDashboardId: number | null = null) {
  // Fetch groups filtered by sub-dashboard context (null = main dashboard)
  const groups = await prisma.tileGroup.findMany({
    where: { subDashboardId },
    orderBy: { order: "asc" },
  });

  // Fetch group tile assignments for the relevant groups only
  const groupIds = groups.map((g) => g.id);
  const groupTileAssignments = groupIds.length > 0
    ? await prisma.groupTile.findMany({
        where: { groupId: { in: groupIds } },
        orderBy: { order: "asc" },
        include: { tile: true },
      })
    : [];

  // Build lookup: groupId -> tiles
  const tilesByGroup = new Map<number, typeof groupTileAssignments>();
  for (const gt of groupTileAssignments) {
    const existing = tilesByGroup.get(gt.groupId) || [];
    existing.push(gt);
    tilesByGroup.set(gt.groupId, existing);
  }

  return groups.map((g) => ({
    ...g,
    groupTiles: tilesByGroup.get(g.id) || [],
  }));
}

export async function getGroupWithTiles(groupId: number) {
  const group = await prisma.tileGroup.findUnique({
    where: { id: groupId },
  });

  if (!group) return null;

  // Fetch assignments with full tile data
  const groupTiles = await prisma.groupTile.findMany({
    where: { groupId },
    orderBy: { order: "asc" },
    include: { tile: true },
  });

  return { ...group, groupTiles };
}
