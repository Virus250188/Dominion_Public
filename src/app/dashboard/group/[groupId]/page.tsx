export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGroupWithTiles } from "@/lib/queries/groups";
import { getUserSettings } from "@/lib/queries/settings";
import { getTiles } from "@/lib/queries/tiles";
import { getAppConnectionsWithNotifications } from "@/lib/actions/notifications";
import { decrypt } from "@/lib/crypto";
import { GroupDashboard } from "@/components/dashboard/GroupDashboard";
import { Header } from "@/components/dashboard/Header";
import type { TileData } from "@/types/tile";

interface GroupPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupPage({ params }: GroupPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = parseInt(session.user.id, 10);

  const { groupId: groupIdStr } = await params;
  const groupId = parseInt(groupIdStr, 10);

  if (isNaN(groupId)) {
    redirect("/");
  }

  const [group, settings, allTiles, connectionsWithNotifications] = await Promise.all([
    getGroupWithTiles(userId, groupId),
    getUserSettings(userId),
    getTiles(userId),
    getAppConnectionsWithNotifications(),
  ]);

  if (!group) {
    notFound();
  }

  // Map group tiles from the junction table
  const groupTiles: TileData[] = group.groupTiles.map((gt) => ({
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
    appConnectionId: gt.tile.appConnectionId ?? null,
  }));

  // All user tiles for the "add to group" picker
  const allTilesMapped: TileData[] = allTiles.map((t) => ({
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
    appConnectionId: t.appConnectionId ?? null,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex w-full flex-1 flex-col gap-6 px-6 py-8">
        <GroupDashboard
          group={{
            id: group.id,
            title: group.title,
            icon: group.icon,
            color: group.color,
          }}
          tiles={groupTiles}
          allTiles={allTilesMapped}
          assignedTileIds={group.groupTiles.map((gt) => gt.tileId)}
          connectionsWithNotifications={connectionsWithNotifications}
          gridColumns={settings?.gridColumns ?? 6}
        />
      </main>
    </div>
  );
}
