"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil } from "lucide-react";
import type { TileData } from "@/types/tile";
import { TileGrid } from "./TileGrid";
import { GroupContainer } from "./GroupContainer";
import { TileDialog, type GroupData } from "./TileDialog";
import { GroupDialog } from "./GroupDialog";
import { SubDashboardDialog } from "./SubDashboardDialog";
import type { SubDashboardData } from "./SubDashboardTile";
import type { GroupTileData } from "./GroupTile";
import type { GroupWithTiles } from "./Dashboard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  createTile,
  updateTile,
  deleteTile,
  togglePinTile,
  reorderTiles,
} from "@/lib/actions/tiles";
import {
  createGroup,
  updateGroup,
  deleteGroup as deleteGroupAction,
  assignTileToGroup,
  assignTilesToGroup,
  toggleGroupCollapsed,
} from "@/lib/actions/groups";
import { updateSubDashboard } from "@/lib/actions/subdashboards";
import { Button } from "@/components/ui/button";
import { GROUP_ICON_MAP } from "./GroupTile";
import type { LucideIcon } from "lucide-react";
import { Folder, LayoutGrid } from "lucide-react";

interface FoundationAppData {
  id: number;
  name: string;
  icon: string;
  color: string;
  website: string | null;
  description: string | null;
  category: string | null;
  enhanced: boolean;
}

interface SubDashboardViewProps {
  subDashboard: {
    id: number;
    title: string;
    icon: string | null;
    color: string;
    description: string | null;
  };
  initialTiles: TileData[];
  initialGroupsWithTiles: GroupWithTiles[];
  initialGroups: (GroupData & {
    icon?: string | null;
    color?: string;
    tileCount?: number;
    assignedTileIds?: number[];
  })[];
  foundationApps: FoundationAppData[];
  gridColumns: number;
}

interface GroupWithCount {
  id: number;
  title: string;
  icon: string | null;
  color: string;
  order: number;
  tileCount: number;
  assignedTileIds: number[];
}

export function SubDashboardView({
  subDashboard: initialSubDashboard,
  initialTiles,
  initialGroupsWithTiles,
  initialGroups,
  foundationApps,
  gridColumns,
}: SubDashboardViewProps) {
  const [subDashboard, setSubDashboard] = useState(initialSubDashboard);
  const [tiles, setTiles] = useState<TileData[]>(initialTiles);
  const [groups, setGroups] = useState<GroupWithCount[]>(
    initialGroups.map(
      (g): GroupWithCount => ({
        id: g.id,
        title: g.title,
        icon: g.icon ?? null,
        color: g.color ?? "#6366f1",
        order: g.order,
        tileCount: g.tileCount ?? 0,
        assignedTileIds: g.assignedTileIds ?? [],
      })
    )
  );
  const [groupsWithTiles, setGroupsWithTiles] =
    useState<GroupWithTiles[]>(initialGroupsWithTiles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTile, setEditingTile] = useState<TileData | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupTileData | null>(null);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "tile" | "group"; id: number; title: string } | null>(null);
  const [, startTransition] = useTransition();


  const IconComponent: LucideIcon =
    GROUP_ICON_MAP[subDashboard.icon || "LayoutGrid"] || LayoutGrid;

  // ─── Tile CRUD ─────────────────────────────────────────────────

  const handleAddTile = useCallback(() => {
    setEditingTile(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((tile: TileData) => {
    setEditingTile(tile);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: number) => {
      const tile = tiles.find((t) => t.id === id) ||
        groupsWithTiles.flatMap((g) => g.tiles).find((t) => t.id === id);
      setDeleteConfirm({ type: "tile", id, title: tile?.title || "App" });
    },
    [tiles, groupsWithTiles]
  );

  const executeDeleteTile = useCallback(
    (id: number) => {
      startTransition(async () => {
        await deleteTile(id);
        setTiles((prev) => prev.filter((t) => t.id !== id));
        setGroupsWithTiles((prev) =>
          prev.map((g) => ({
            ...g,
            tiles: g.tiles.filter((t) => t.id !== id),
          }))
        );
      });
    },
    []
  );

  const handleTogglePin = useCallback((id: number, pinned: boolean) => {
    startTransition(async () => {
      await togglePinTile(id, pinned);
      setTiles((prev) =>
        prev
          .map((t) => (t.id === id ? { ...t, pinned } : t))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return a.order - b.order;
          })
      );
      setGroupsWithTiles((prev) =>
        prev.map((g) => ({
          ...g,
          tiles: g.tiles.map((t) => (t.id === id ? { ...t, pinned } : t)),
        }))
      );
    });
  }, []);

  const handleReorder = useCallback(
    (orderedIds: number[]) => {
      const reordered = orderedIds
        .map((id) => tiles.find((t) => t.id === id))
        .filter(Boolean) as TileData[];
      setTiles(reordered);

      startTransition(async () => {
        await reorderTiles(orderedIds);
      });
    },
    [tiles]
  );

  const handleSave = useCallback(
    async (data: {
      title: string;
      url: string;
      color: string;
      icon: string;
      description: string;
      type: "standard" | "enhanced";
      enhancedType: string;
      enhancedConfig: string;
      columnSpan: number;
      rowSpan: number;
      groupId: number | null;
      customIconSvg?: string | null;
    }) => {
      startTransition(async () => {
        if (editingTile) {
          await updateTile(editingTile.id, data);
          const updatedTile = {
            ...editingTile,
            ...data,
            customIconSvg: data.customIconSvg ?? editingTile.customIconSvg,
          };
          setTiles((prev) =>
            prev.map((t) => (t.id === editingTile.id ? updatedTile : t))
          );
          setGroupsWithTiles((prev) =>
            prev.map((g) => ({
              ...g,
              tiles: g.tiles.map((t) =>
                t.id === editingTile.id ? updatedTile : t
              ),
            }))
          );
        } else {
          // Create tile and assign to this sub-dashboard
          const created = await createTile({
            ...data,
            subDashboardId: subDashboard.id,
          });
          const newTile: TileData = {
            id: created.id,
            title: created.title,
            url: created.url,
            color: created.color,
            icon: created.icon,
            description: created.description,
            pinned: created.pinned,
            order: created.order,
            columnSpan: created.columnSpan,
            rowSpan: created.rowSpan,
            type: created.type as "standard" | "enhanced",
            enhancedType: created.enhancedType,
            enhancedConfig: created.enhancedConfig,
            customIconSvg: created.customIconSvg,
            groupId: created.groupId,
            appConnectionId: created.appConnectionId ?? null,
          };
          setTiles((prev) => [...prev, newTile]);
        }
        setDialogOpen(false);
        setEditingTile(null);
      });
    },
    [editingTile, subDashboard.id]
  );

  const handleMoveToGroup = useCallback(
    (tileId: number, groupId: number | null) => {
      startTransition(async () => {
        await assignTileToGroup(tileId, groupId);
        if (groupId !== null) {
          const tile = tiles.find((t) => t.id === tileId);
          const groupTile = !tile
            ? groupsWithTiles.flatMap((g) => g.tiles).find((t) => t.id === tileId)
            : null;
          const movingTile = tile || groupTile;

          if (movingTile) {
            setTiles((prev) => prev.filter((t) => t.id !== tileId));
            setGroupsWithTiles((prev) =>
              prev.map((g) => {
                if (g.id === groupId) {
                  const alreadyIn = g.tiles.some((t) => t.id === tileId);
                  return alreadyIn
                    ? g
                    : { ...g, tiles: [...g.tiles, { ...movingTile, groupId }] };
                }
                return { ...g, tiles: g.tiles.filter((t) => t.id !== tileId) };
              })
            );
          }
        } else {
          const groupTile = groupsWithTiles
            .flatMap((g) => g.tiles)
            .find((t) => t.id === tileId);
          if (groupTile) {
            setTiles((prev) => [...prev, { ...groupTile, groupId: null }]);
            setGroupsWithTiles((prev) =>
              prev.map((g) => ({
                ...g,
                tiles: g.tiles.filter((t) => t.id !== tileId),
              }))
            );
          }
        }
      });
    },
    [tiles, groupsWithTiles]
  );

  const handleToggleCollapsed = useCallback(
    async (groupId: number) => {
      setGroupsWithTiles((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
        )
      );
      await toggleGroupCollapsed(groupId);
    },
    []
  );

  // ─── Group CRUD ────────────────────────────────────────────────

  const handleCreateGroup = useCallback(() => {
    setEditingGroup(null);
    setGroupDialogOpen(true);
  }, []);

  const handleEditGroup = useCallback((group: GroupTileData) => {
    setEditingGroup(group);
    setGroupDialogOpen(true);
  }, []);

  const handleDeleteGroup = useCallback(
    (id: number) => {
      const group = groupsWithTiles.find((g) => g.id === id) || groups.find((g) => g.id === id);
      setDeleteConfirm({ type: "group", id, title: group?.title || "Gruppe" });
    },
    [groupsWithTiles, groups]
  );

  const executeDeleteGroup = useCallback(
    (id: number) => {
      startTransition(async () => {
        await deleteGroupAction(id);
        const deletedGroup = groupsWithTiles.find((g) => g.id === id);
        if (deletedGroup) {
          setTiles((prev) => [
            ...prev,
            ...deletedGroup.tiles.map((t) => ({ ...t, groupId: null })),
          ]);
        }
        setGroups((prev) => prev.filter((g) => g.id !== id));
        setGroupsWithTiles((prev) => prev.filter((g) => g.id !== id));
      });
    },
    [groupsWithTiles]
  );

  const handleSaveGroup = useCallback(
    async (data: {
      title: string;
      icon: string;
      color: string;
      selectedTileIds: number[];
    }) => {
      startTransition(async () => {
        if (editingGroup) {
          await updateGroup(editingGroup.id, {
            title: data.title,
            icon: data.icon,
            color: data.color,
          });
          await assignTilesToGroup(editingGroup.id, data.selectedTileIds);
          setGroups((prev) =>
            prev.map((g) =>
              g.id === editingGroup.id
                ? {
                    ...g,
                    title: data.title,
                    icon: data.icon,
                    color: data.color,
                    tileCount: data.selectedTileIds.length,
                    assignedTileIds: data.selectedTileIds,
                  }
                : g
            )
          );
          setGroupsWithTiles((prev) =>
            prev.map((g) => {
              if (g.id !== editingGroup.id) return g;
              const allTiles = [...tiles, ...prev.flatMap((grp) => grp.tiles)];
              const uniqueTiles = new Map(allTiles.map((t) => [t.id, t]));
              const newGroupTiles = data.selectedTileIds
                .map((id) => uniqueTiles.get(id))
                .filter(Boolean) as TileData[];
              return {
                ...g,
                title: data.title,
                icon: data.icon,
                color: data.color,
                tiles: newGroupTiles,
              };
            })
          );
          const assignedSet = new Set(data.selectedTileIds);
          setTiles((prev) => prev.filter((t) => !assignedSet.has(t.id)));
        } else {
          const created = await createGroup({
            title: data.title,
            icon: data.icon,
            color: data.color,
            subDashboardId: subDashboard.id,
          });
          if (data.selectedTileIds.length > 0) {
            await assignTilesToGroup(created.id, data.selectedTileIds);
          }
          setGroups((prev) => [
            ...prev,
            {
              id: created.id,
              title: created.title,
              icon: created.icon,
              color: created.color,
              order: created.order,
              tileCount: data.selectedTileIds.length,
              assignedTileIds: data.selectedTileIds,
            },
          ]);
          const assignedSet = new Set(data.selectedTileIds);
          const newGroupTiles = tiles.filter((t) => assignedSet.has(t.id));
          setGroupsWithTiles((prev) => [
            ...prev,
            {
              id: created.id,
              title: created.title,
              icon: created.icon,
              color: created.color,
              order: created.order,
              collapsed: false,
              tiles: newGroupTiles.map((t) => ({
                ...t,
                groupId: created.id,
              })),
            },
          ]);
          setTiles((prev) => prev.filter((t) => !assignedSet.has(t.id)));
        }
        setGroupDialogOpen(false);
        setEditingGroup(null);
      });
    },
    [editingGroup, tiles]
  );

  // ─── Sub-Dashboard Edit ────────────────────────────────────────

  const handleEditSubDashboard = useCallback(() => {
    setSubDialogOpen(true);
  }, []);

  const handleSaveSubDashboard = useCallback(
    async (data: {
      title: string;
      icon: string;
      color: string;
      description: string;
    }) => {
      startTransition(async () => {
        await updateSubDashboard(subDashboard.id, data);
        setSubDashboard((prev) => ({ ...prev, ...data }));
        setSubDialogOpen(false);
      });
    },
    [subDashboard.id]
  );

  // Build GroupData for TileDialog
  const groupDataForDialog: GroupData[] = groups.map((g) => ({
    id: g.id,
    title: g.title,
    order: g.order,
  }));

  return (
    <>
      {/* Breadcrumb header */}
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck
        </Link>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-1.5 text-foreground font-medium">
          <IconComponent
            className="h-4 w-4"
            style={{ color: subDashboard.color }}
          />
          {subDashboard.title}
        </div>
        {subDashboard.description && (
          <>
            <span className="text-muted-foreground hidden sm:inline">-</span>
            <span className="text-muted-foreground text-xs hidden sm:inline truncate max-w-48">
              {subDashboard.description}
            </span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEditSubDashboard}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Bearbeiten
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddTile}>
            <Plus className="h-4 w-4 mr-1" />
            Hinzufuegen
          </Button>
        </div>
      </div>

      {/* Tile Grid */}
      <TileGrid
        tiles={tiles}
        onReorder={handleReorder}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
        onAddTile={handleAddTile}
        onAddGroup={handleCreateGroup}
        hideSubDashboard
        groups={groupDataForDialog}
        onMoveToGroup={handleMoveToGroup}
        gridColumns={gridColumns}
      />

      {/* Inline Group Containers */}
      {groupsWithTiles.length > 0 && (
        <>
          <div className="flex items-center gap-3 pt-4">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Gruppen
            </span>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="flex flex-col gap-4">
            {groupsWithTiles.map((group) => (
              <GroupContainer
                key={group.id}
                group={group}
                tiles={group.tiles}
                gridColumns={gridColumns}
                onEditGroup={(g) => {
                  handleEditGroup({
                    ...g,
                    order: group.order,
                    tileCount: group.tiles.length,
                  });
                }}
                onDeleteGroup={handleDeleteGroup}
                onEditTile={handleEdit}
                onDeleteTile={handleDelete}
                onTogglePin={handleTogglePin}
                onToggleCollapsed={handleToggleCollapsed}
                groups={groupDataForDialog}
                onMoveToGroup={handleMoveToGroup}
              />
            ))}
          </div>
        </>
      )}

      {/* Tile Dialog */}
      <TileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tile={editingTile}
        foundationApps={foundationApps}
        groups={groupDataForDialog}
        onGroupsChange={(newGroups) =>
          setGroups((prev) => {
            const map = new Map(prev.map((g) => [g.id, g]));
            for (const ng of newGroups) {
              if (!map.has(ng.id)) {
                map.set(ng.id, {
                  ...ng,
                  icon: null,
                  color: "#6366f1",
                  tileCount: 0,
                  assignedTileIds: [],
                });
              }
            }
            return Array.from(map.values());
          })
        }
        onSave={handleSave}
        onOpenGroupDialog={handleCreateGroup}
      />

      {/* Group Dialog */}
      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        group={editingGroup}
        tiles={[...tiles, ...groupsWithTiles.flatMap((g) => g.tiles)]}
        assignedTileIds={
          editingGroup
            ? groups.find((g) => g.id === editingGroup.id)?.assignedTileIds ??
              []
            : []
        }
        onSave={handleSaveGroup}
      />

      {/* Sub-Dashboard Edit Dialog */}
      <SubDashboardDialog
        open={subDialogOpen}
        onOpenChange={setSubDialogOpen}
        subDashboard={{
          ...subDashboard,
          tileCount:
            tiles.length +
            groupsWithTiles.reduce((sum, g) => sum + g.tiles.length, 0),
        }}
        onSave={handleSaveSubDashboard}
      />

      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Loeschen bestaetigen"
        message={
          deleteConfirm?.type === "tile"
            ? `"${deleteConfirm.title}" wirklich loeschen?`
            : `Gruppe "${deleteConfirm?.title}" wirklich loeschen? Die Apps werden zurueck ins Dashboard verschoben.`
        }
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (!deleteConfirm) return;
          if (deleteConfirm.type === "tile") executeDeleteTile(deleteConfirm.id);
          else if (deleteConfirm.type === "group") executeDeleteGroup(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
      />
    </>
  );
}
