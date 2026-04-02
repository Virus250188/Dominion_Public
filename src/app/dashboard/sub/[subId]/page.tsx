export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSubDashboardWithData } from "@/lib/queries/subdashboards";
import { getFoundationApps } from "@/lib/queries/tiles";
import { getUserSettings } from "@/lib/queries/settings";
import { decrypt } from "@/lib/crypto";
import { SubDashboardView } from "@/components/dashboard/SubDashboardView";
import { Header } from "@/components/dashboard/Header";
import type { TileData } from "@/types/tile";

interface SubDashboardPageProps {
  params: Promise<{ subId: string }>;
}

export default async function SubDashboardPage({ params }: SubDashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = parseInt(session.user.id, 10);

  const { subId: subIdStr } = await params;
  const subId = parseInt(subIdStr, 10);

  if (isNaN(subId)) {
    redirect("/");
  }

  const [subDashboard, foundationApps, settings] = await Promise.all([
    getSubDashboardWithData(subId),
    getFoundationApps(),
    getUserSettings(userId),
  ]);

  if (!subDashboard) {
    redirect("/");
  }

  // Build set of tile IDs assigned to any group within this sub-dashboard
  const groupedTileIds = new Set<number>();
  for (const g of subDashboard.groupsWithTiles) {
    for (const gt of g.groupTiles) {
      groupedTileIds.add(gt.tileId);
    }
  }

  // Ungrouped tiles within this sub-dashboard
  const ungroupedTiles: TileData[] = subDashboard.tiles
    .filter((t) => !groupedTileIds.has(t.id))
    .map((t) => ({
      id: t.id,
      title: t.title,
      url: t.url,
      color: t.color,
      icon: t.icon,
      description: t.description,
      pinned: t.pinned,
      order: t.order,
      columnSpan: t.columnSpan,
      rowSpan: t.rowSpan,
      type: t.type as "standard" | "enhanced",
      enhancedType: t.enhancedType,
      enhancedConfig: t.enhancedConfig ? decrypt(t.enhancedConfig) : t.enhancedConfig,
      customIconSvg: t.customIconSvg,
      groupId: t.groupId,
      appConnectionId: t.appConnectionId ?? null,
    }));

  // Groups with full tile data within this sub-dashboard
  const groupsWithTiles = subDashboard.groupsWithTiles.map((g) => ({
    id: g.id,
    title: g.title,
    icon: g.icon,
    color: g.color,
    order: g.order,
    collapsed: g.collapsed,
    tiles: g.groupTiles.map((gt) => ({
      id: gt.tile.id,
      title: gt.tile.title,
      url: gt.tile.url,
      color: gt.tile.color,
      icon: gt.tile.icon,
      description: gt.tile.description,
      pinned: gt.tile.pinned,
      order: gt.order,
      columnSpan: gt.columnSpan ?? gt.tile.columnSpan,
      rowSpan: gt.rowSpan ?? gt.tile.rowSpan,
      type: gt.tile.type as "standard" | "enhanced",
      enhancedType: gt.tile.enhancedType,
      enhancedConfig: gt.tile.enhancedConfig ? decrypt(gt.tile.enhancedConfig) : gt.tile.enhancedConfig,
      customIconSvg: gt.tile.customIconSvg,
      groupId: g.id,
      appConnectionId: gt.tile.appConnectionId ?? null,
    })),
  }));

  // Groups summary for the dialog
  const groups = subDashboard.groupsWithTiles.map((g) => ({
    id: g.id,
    title: g.title,
    order: g.order,
    icon: g.icon,
    color: g.color,
    tileCount: g.groupTiles.length,
    assignedTileIds: g.groupTiles.map((gt) => gt.tileId),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
        <SubDashboardView
          subDashboard={{
            id: subDashboard.id,
            title: subDashboard.title,
            icon: subDashboard.icon,
            color: subDashboard.color,
            description: subDashboard.description,
          }}
          initialTiles={ungroupedTiles}
          initialGroups={groups}
          initialGroupsWithTiles={groupsWithTiles}
          foundationApps={foundationApps}
          gridColumns={settings?.gridColumns ?? 6}
        />
      </main>
    </div>
  );
}
