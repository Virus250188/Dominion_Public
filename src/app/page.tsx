export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Header } from "@/components/dashboard/Header";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { getTiles, getFoundationApps } from "@/lib/queries/tiles";
import { getSearchProviders } from "@/lib/queries/search";
import { getGroups, getGroupsWithFullTiles } from "@/lib/queries/groups";
import { getUserSettings } from "@/lib/queries/settings";
import { getSubDashboards } from "@/lib/queries/subdashboards";
import { getAppConnections } from "@/lib/queries/appConnections";
import { decrypt } from "@/lib/crypto";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = parseInt(session.user.id, 10);

  const [tiles, foundationApps, searchProviders, groups, groupsWithFullTiles, settings, subDashboards, appConnections] = await Promise.all([
    getTiles(userId),
    getFoundationApps(),
    getSearchProviders(),
    getGroups(),
    getGroupsWithFullTiles(),
    getUserSettings(userId),
    getSubDashboards(userId),
    getAppConnections(userId),
  ]);

  const aiConfigured = Boolean(
    settings?.aiProvider &&
    settings?.aiModel &&
    (settings.aiProvider === "ollama" || settings?.aiApiKey)
  );
  const aiProvider = settings?.aiProvider || "";
  const aiModel = settings?.aiModel || "";

  // Build set of tile IDs assigned to any group via the GroupTile junction table
  const groupedTileIds = new Set<number>();
  for (const g of groupsWithFullTiles) {
    for (const gt of g.groupTiles) {
      groupedTileIds.add(gt.tileId);
    }
  }

  // Ungrouped tiles: not present in any group's GroupTile assignments and not in a sub-dashboard
  const ungroupedTiles = tiles.filter((t) => !groupedTileIds.has(t.id) && !t.subDashboardId);

  // Build GroupWithTiles for inline containers
  const initialGroupsWithTiles = groupsWithFullTiles.map((g) => ({
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

  const searchTiles = tiles.map((t) => ({
    id: t.id,
    title: t.title,
    url: t.url,
    color: t.color,
    icon: t.icon,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        searchBar={
          <SearchBar providers={searchProviders} tiles={searchTiles} />
        }
        aiConfigured={aiConfigured}
        aiProvider={aiProvider}
        aiModel={aiModel}
      />
      {/* Mobile search bar (visible below md breakpoint) */}
      <div className="md:hidden px-6 pt-4">
        <SearchBar providers={searchProviders} tiles={searchTiles} />
      </div>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
        <Dashboard
          initialTiles={ungroupedTiles.map((t) => ({
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
          }))}
          foundationApps={foundationApps}
          appConnections={appConnections.map((c) => ({
            id: c.id,
            pluginType: c.pluginType,
            name: c.name,
            icon: c.icon,
            customIconSvg: c.customIconSvg,
            color: c.color,
            url: c.url,
            description: c.description,
          }))}
          initialGroups={groups.map((g) => ({
            id: g.id,
            title: g.title,
            order: g.order,
            icon: g.icon,
            color: g.color,
            tileCount: g._count?.groupTiles ?? 0,
            assignedTileIds: g.groupTiles?.map((gt: { tileId: number }) => gt.tileId) ?? [],
          }))}
          initialGroupsWithTiles={initialGroupsWithTiles}
          initialSubDashboards={subDashboards}
          gridColumns={settings?.gridColumns ?? 6}
        />
      </main>
    </div>
  );
}
