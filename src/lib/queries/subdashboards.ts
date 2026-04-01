import prisma from "@/lib/db";

export async function getSubDashboards(userId: number) {
  // Fetch sub-dashboards
  const subDashboards = await prisma.subDashboard.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  });

  // Fetch tile counts per sub-dashboard
  const tileCounts = await prisma.tile.groupBy({
    by: ["subDashboardId"],
    where: {
      subDashboardId: { not: null },
      userId,
    },
    _count: { id: true },
  });

  const countMap = new Map<number, number>();
  for (const tc of tileCounts) {
    if (tc.subDashboardId !== null) {
      countMap.set(tc.subDashboardId, tc._count.id);
    }
  }

  return subDashboards.map((sd) => ({
    ...sd,
    tileCount: countMap.get(sd.id) ?? 0,
  }));
}

export async function getSubDashboardWithData(id: number) {
  const subDashboard = await prisma.subDashboard.findUnique({
    where: { id },
  });

  if (!subDashboard) return null;

  // Fetch tiles belonging to this sub-dashboard
  const tiles = await prisma.tile.findMany({
    where: { subDashboardId: id },
    orderBy: [{ pinned: "desc" }, { order: "asc" }],
  });

  // Fetch groups belonging to this sub-dashboard
  const groups = await prisma.tileGroup.findMany({
    where: { subDashboardId: id },
    orderBy: { order: "asc" },
  });

  // Fetch group tile assignments for these groups
  const groupIds = groups.map((g) => g.id);
  const groupTileAssignments =
    groupIds.length > 0
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

  const groupsWithTiles = groups.map((g) => ({
    ...g,
    groupTiles: tilesByGroup.get(g.id) || [],
  }));

  return {
    ...subDashboard,
    tiles,
    groupsWithTiles,
  };
}
