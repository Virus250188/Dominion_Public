"use client";

import { useState, useTransition, useCallback } from "react";
import type { TileData } from "@/types/tile";
import { TileGrid } from "./TileGrid";
import { TileDialog, type GroupData } from "./TileDialog";
import { type GroupTileData } from "./GroupTile";
import { GroupContainer } from "./GroupContainer";
import { GroupDialog } from "./GroupDialog";
import { SubDashboardTile, type SubDashboardData } from "./SubDashboardTile";
import { SubDashboardDialog } from "./SubDashboardDialog";
import { createTile, updateTile, deleteTile, reorderTiles, togglePinTile, createEnhancedTileWithConnection } from "@/lib/actions/tiles";
import {
  createGroup,
  updateGroup,
  deleteGroup as deleteGroupAction,
  assignTileToGroup,
  assignTilesToGroup,
  toggleGroupCollapsed,
} from "@/lib/actions/groups";
import {
  createSubDashboard,
  updateSubDashboard,
  deleteSubDashboard as deleteSubDashboardAction,
} from "@/lib/actions/subdashboards";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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

interface GroupWithCount {
  id: number;
  title: string;
  icon: string | null;
  color: string;
  order: number;
  tileCount: number;
  assignedTileIds: number[];
}

export interface GroupWithTiles {
  id: number;
  title: string;
  icon: string | null;
  color: string;
  order: number;
  collapsed: boolean;
  tiles: TileData[];
}

export interface AppConnectionSummary {
  id: number;
  pluginType: string;
  name: string;
  icon: string | null;
  customIconSvg: string | null;
  color: string;
  url: string | null;
  description: string | null;
}

interface DashboardProps {
  initialTiles: TileData[];  // Only ungrouped tiles
  foundationApps: FoundationAppData[];
  appConnections?: AppConnectionSummary[];
  initialGroups: (GroupData & { icon?: string | null; color?: string; tileCount?: number; assignedTileIds?: number[] })[];
  initialGroupsWithTiles?: GroupWithTiles[];  // Groups with their full tile data
  initialSubDashboards?: SubDashboardData[];
  gridColumns?: number;
}

export function Dashboard({ initialTiles, foundationApps, appConnections, initialGroups, initialGroupsWithTiles, initialSubDashboards, gridColumns = 6 }: DashboardProps) {
  const [tiles, setTiles] = useState<TileData[]>(initialTiles);
  const [groups, setGroups] = useState<GroupWithCount[]>(
    initialGroups.map((g): GroupWithCount => ({
      id: g.id,
      title: g.title,
      icon: g.icon ?? null,
      color: g.color ?? "#6366f1",
      order: g.order,
      tileCount: g.tileCount ?? 0,
      assignedTileIds: g.assignedTileIds ?? [],
    }))
  );
  const [groupsWithTiles, setGroupsWithTiles] = useState<GroupWithTiles[]>(
    initialGroupsWithTiles || []
  );
  const [subDashboards, setSubDashboards] = useState<SubDashboardData[]>(
    initialSubDashboards || []
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTile, setEditingTile] = useState<TileData | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupTileData | null>(null);
  const [subDashboardDialogOpen, setSubDashboardDialogOpen] = useState(false);
  const [editingSubDashboard, setEditingSubDashboard] = useState<SubDashboardData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "tile" | "group" | "subdashboard"; id: number; title: string } | null>(null);
  const [, startTransition] = useTransition();


  const handleAddTile = useCallback(() => {
    setEditingTile(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((tile: TileData) => {
    setEditingTile(tile);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((id: number) => {
    const tile = tiles.find((t) => t.id === id) ||
      groupsWithTiles.flatMap((g) => g.tiles).find((t) => t.id === id);
    setDeleteConfirm({ type: "tile", id, title: tile?.title || "App" });
  }, [tiles, groupsWithTiles]);

  const executeDeleteTile = useCallback((id: number) => {
    startTransition(async () => {
      await deleteTile(id);
      setTiles((prev) => prev.filter((t) => t.id !== id));
      // Also remove from any group
      setGroupsWithTiles((prev) =>
        prev.map((g) => ({ ...g, tiles: g.tiles.filter((t) => t.id !== id) }))
      );
    });
  }, []);

  const handleTogglePin = useCallback((id: number, pinned: boolean) => {
    startTransition(async () => {
      await togglePinTile(id, pinned);
      setTiles((prev) =>
        prev.map((t) => (t.id === id ? { ...t, pinned } : t))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return a.order - b.order;
          })
      );
      // Also update in group tiles
      setGroupsWithTiles((prev) =>
        prev.map((g) => ({
          ...g,
          tiles: g.tiles.map((t) => (t.id === id ? { ...t, pinned } : t)),
        }))
      );
    });
  }, []);

  const handleReorder = useCallback((orderedIds: number[]) => {
    // Optimistic update
    const reordered = orderedIds
      .map((id) => tiles.find((t) => t.id === id))
      .filter(Boolean) as TileData[];
    setTiles(reordered);

    startTransition(async () => {
      await reorderTiles(orderedIds);
    });
  }, [tiles]);

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
      appConnectionId?: number | null;
    }) => {
      startTransition(async () => {
        if (editingTile) {
          await updateTile(editingTile.id, data);
          const updatedTile = { ...editingTile, ...data, customIconSvg: data.customIconSvg ?? editingTile.customIconSvg };
          const oldGroupId = editingTile.groupId;
          const newGroupId = data.groupId;
          const groupChanged = oldGroupId !== newGroupId;

          if (groupChanged && newGroupId !== null) {
            // Moving to a group: remove from ungrouped, add to target group
            setTiles((prev) => prev.filter((t) => t.id !== editingTile.id));
            setGroupsWithTiles((prev) =>
              prev.map((g) => {
                if (g.id === newGroupId) {
                  const alreadyIn = g.tiles.some((t) => t.id === editingTile.id);
                  return alreadyIn
                    ? { ...g, tiles: g.tiles.map((t) => (t.id === editingTile.id ? updatedTile : t)) }
                    : { ...g, tiles: [...g.tiles, updatedTile] };
                }
                // Remove from other groups
                return { ...g, tiles: g.tiles.filter((t) => t.id !== editingTile.id) };
              })
            );
          } else if (groupChanged && newGroupId === null) {
            // Moving out of group: remove from groups, add to ungrouped
            setGroupsWithTiles((prev) =>
              prev.map((g) => ({ ...g, tiles: g.tiles.filter((t) => t.id !== editingTile.id) }))
            );
            setTiles((prev) => [...prev, updatedTile]);
          } else {
            // Same group — just update in place
            setTiles((prev) =>
              prev.map((t) => (t.id === editingTile.id ? updatedTile : t))
            );
            setGroupsWithTiles((prev) =>
              prev.map((g) => ({
                ...g,
                tiles: g.tiles.map((t) => (t.id === editingTile.id ? updatedTile : t)),
              }))
            );
          }
        } else {
          // For enhanced tiles, use the combined action that auto-creates AppConnection
          const isEnhanced = data.type === "enhanced" && data.enhancedType;
          const created = isEnhanced
            ? await createEnhancedTileWithConnection({
                ...data,
                enhancedType: data.enhancedType,
              })
            : await createTile(data);
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
    [editingTile]
  );

  const handleMoveToGroup = useCallback((tileId: number, groupId: number | null) => {
    startTransition(async () => {
      await assignTileToGroup(tileId, groupId);
      // If moving to a group, remove from ungrouped tiles and add to group
      if (groupId !== null) {
        const tile = tiles.find((t) => t.id === tileId);
        // Also check group tiles for cross-group moves
        const groupTile = !tile
          ? groupsWithTiles.flatMap((g) => g.tiles).find((t) => t.id === tileId)
          : null;
        const movingTile = tile || groupTile;

        if (movingTile) {
          // Remove from ungrouped tiles
          setTiles((prev) => prev.filter((t) => t.id !== tileId));
          // Remove from any current group and add to target group
          setGroupsWithTiles((prev) =>
            prev.map((g) => {
              if (g.id === groupId) {
                // Add tile to this group (if not already there)
                const alreadyIn = g.tiles.some((t) => t.id === tileId);
                return alreadyIn ? g : { ...g, tiles: [...g.tiles, { ...movingTile, groupId }] };
              }
              // Remove from other groups
              return { ...g, tiles: g.tiles.filter((t) => t.id !== tileId) };
            })
          );
        }
      } else {
        // Moving out of group back to ungrouped
        const groupTile = groupsWithTiles.flatMap((g) => g.tiles).find((t) => t.id === tileId);
        if (groupTile) {
          setTiles((prev) => [...prev, { ...groupTile, groupId: null }]);
          setGroupsWithTiles((prev) =>
            prev.map((g) => ({ ...g, tiles: g.tiles.filter((t) => t.id !== tileId) }))
          );
        } else {
          setTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, groupId: null } : t)));
        }
      }
    });
  }, [tiles, groupsWithTiles]);

  const handleToggleCollapsed = useCallback(async (groupId: number) => {
    // Optimistic update
    setGroupsWithTiles((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g))
    );
    // Persist to server
    await toggleGroupCollapsed(groupId);
  }, []);

  // ─── Group CRUD ────────────────────────────────────────────────

  const handleCreateGroup = useCallback(() => {
    setEditingGroup(null);
    setGroupDialogOpen(true);
  }, []);

  const handleEditGroup = useCallback((group: GroupTileData) => {
    setEditingGroup(group);
    setGroupDialogOpen(true);
  }, []);

  const handleDeleteGroup = useCallback((id: number) => {
    const group = groupsWithTiles.find((g) => g.id === id) || groups.find((g) => g.id === id);
    setDeleteConfirm({ type: "group", id, title: group?.title || "Gruppe" });
  }, [groupsWithTiles, groups]);

  const executeDeleteGroup = useCallback((id: number) => {
    startTransition(async () => {
      await deleteGroupAction(id);
      // Move group tiles back to ungrouped
      const deletedGroup = groupsWithTiles.find((g) => g.id === id);
      if (deletedGroup) {
        setTiles((prev) => [
          ...prev,
          ...deletedGroup.tiles.map((t) => ({ ...t, groupId: null })),
        ]);
      }
      setTiles((prev) => prev.map((t) => (t.groupId === id ? { ...t, groupId: null } : t)));
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setGroupsWithTiles((prev) => prev.filter((g) => g.id !== id));
    });
  }, [groupsWithTiles]);

  const handleSaveGroup = useCallback(
    async (data: { title: string; icon: string; color: string; selectedTileIds: number[] }) => {
      startTransition(async () => {
        if (editingGroup) {
          // Update existing group
          await updateGroup(editingGroup.id, {
            title: data.title,
            icon: data.icon,
            color: data.color,
          });
          await assignTilesToGroup(editingGroup.id, data.selectedTileIds);
          setGroups((prev) =>
            prev.map((g) =>
              g.id === editingGroup.id
                ? { ...g, title: data.title, icon: data.icon, color: data.color, tileCount: data.selectedTileIds.length, assignedTileIds: data.selectedTileIds }
                : g
            )
          );
          // Update groupsWithTiles: update metadata and recalculate tile assignments
          setGroupsWithTiles((prev) =>
            prev.map((g) => {
              if (g.id !== editingGroup.id) return g;
              // Collect all known tiles (ungrouped + all groups)
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
          // Remove newly-assigned tiles from ungrouped
          const assignedSet = new Set(data.selectedTileIds);
          setTiles((prev) => prev.filter((t) => !assignedSet.has(t.id)));
        } else {
          // Create new group
          const created = await createGroup({
            title: data.title,
            icon: data.icon,
            color: data.color,
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
          // Build tiles for the new group from ungrouped tiles
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
              tiles: newGroupTiles.map((t) => ({ ...t, groupId: created.id })),
            },
          ]);
          // Remove assigned tiles from ungrouped
          setTiles((prev) => prev.filter((t) => !assignedSet.has(t.id)));
        }
        setGroupDialogOpen(false);
        setEditingGroup(null);
      });
    },
    [editingGroup, tiles]
  );

  // ─── Sub-Dashboard CRUD ──────────────────────────────────────

  const handleCreateSubDashboard = useCallback(() => {
    setEditingSubDashboard(null);
    setSubDashboardDialogOpen(true);
  }, []);

  const handleEditSubDashboard = useCallback((subDashboard: SubDashboardData) => {
    setEditingSubDashboard(subDashboard);
    setSubDashboardDialogOpen(true);
  }, []);

  const handleDeleteSubDashboard = useCallback((id: number) => {
    const sd = subDashboards.find((s) => s.id === id);
    setDeleteConfirm({ type: "subdashboard", id, title: sd?.title || "Sub-Dashboard" });
  }, [subDashboards]);

  const executeDeleteSubDashboard = useCallback((id: number) => {
    startTransition(async () => {
      await deleteSubDashboardAction(id);
      setSubDashboards((prev) => prev.filter((sd) => sd.id !== id));
    });
  }, []);

  const handleSaveSubDashboard = useCallback(
    async (data: { title: string; icon: string; color: string; description: string }) => {
      startTransition(async () => {
        if (editingSubDashboard) {
          await updateSubDashboard(editingSubDashboard.id, data);
          setSubDashboards((prev) =>
            prev.map((sd) =>
              sd.id === editingSubDashboard.id
                ? { ...sd, ...data }
                : sd
            )
          );
        } else {
          const created = await createSubDashboard(data);
          setSubDashboards((prev) => [
            ...prev,
            {
              id: created.id,
              title: created.title,
              icon: created.icon,
              color: created.color,
              description: created.description,
              tileCount: 0,
            },
          ]);
        }
        setSubDashboardDialogOpen(false);
        setEditingSubDashboard(null);
      });
    },
    [editingSubDashboard]
  );

  // When TileDialog's "Group" mode is selected, open GroupDialog instead
  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
    },
    []
  );

  // tiles state already contains only ungrouped tiles (grouped tiles live in groupsWithTiles)
  // This filter is a safety net in case any tile still has a stale groupId
  const ungroupedTiles = tiles;

  // Build GroupData for TileDialog (needed for group assignment dropdown in app form)
  const groupDataForDialog: GroupData[] = groups.map((g) => ({
    id: g.id,
    title: g.title,
    order: g.order,
  }));

  return (
    <>
      {/* Main tile grid with ungrouped tiles only */}
      <TileGrid
        tiles={ungroupedTiles}
        onReorder={handleReorder}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
        onAddTile={handleAddTile}
        onAddGroup={handleCreateGroup}
        onAddSubDashboard={handleCreateSubDashboard}
        groups={groupDataForDialog}
        onMoveToGroup={handleMoveToGroup}
        gridColumns={gridColumns}
        extraItems={subDashboards.map((sd) => (
          <SubDashboardTile
            key={`sub-${sd.id}`}
            subDashboard={sd}
            onEdit={handleEditSubDashboard}
            onDelete={handleDeleteSubDashboard}
          />
        ))}
      />

      {/* Inline Group Containers */}
      {groupsWithTiles.length > 0 && (
        <>
          {/* Divider between ungrouped tiles and groups */}
          <div className="flex items-center gap-3 pt-4">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Gruppen</span>
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

      <TileDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        tile={editingTile}
        foundationApps={foundationApps}
        appConnections={appConnections || []}
        groups={groupDataForDialog}
        onGroupsChange={(newGroups) =>
          setGroups((prev) => {
            // Merge new groups into existing, preserving icon/color/tileCount
            const map = new Map(prev.map((g) => [g.id, g]));
            for (const ng of newGroups) {
              if (!map.has(ng.id)) {
                map.set(ng.id, { ...ng, icon: null, color: "#6366f1", tileCount: 0, assignedTileIds: [] });
              }
            }
            return Array.from(map.values());
          })
        }
        onSave={handleSave}
        onOpenGroupDialog={handleCreateGroup}
      />

      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        group={editingGroup}
        tiles={[...tiles, ...groupsWithTiles.flatMap((g) => g.tiles)]}
        assignedTileIds={editingGroup
          ? (groups.find((g) => g.id === editingGroup.id)?.assignedTileIds ?? [])
          : []
        }
        onSave={handleSaveGroup}
      />

      <SubDashboardDialog
        open={subDashboardDialogOpen}
        onOpenChange={setSubDashboardDialogOpen}
        subDashboard={editingSubDashboard}
        onSave={handleSaveSubDashboard}
      />

      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Loeschen bestaetigen"
        message={
          deleteConfirm?.type === "tile"
            ? `"${deleteConfirm.title}" wirklich loeschen?`
            : deleteConfirm?.type === "group"
              ? `Gruppe "${deleteConfirm.title}" wirklich loeschen? Die Apps werden zurueck ins Dashboard verschoben.`
              : `Sub-Dashboard "${deleteConfirm?.title}" wirklich loeschen?`
        }
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (!deleteConfirm) return;
          if (deleteConfirm.type === "tile") executeDeleteTile(deleteConfirm.id);
          else if (deleteConfirm.type === "group") executeDeleteGroup(deleteConfirm.id);
          else if (deleteConfirm.type === "subdashboard") executeDeleteSubDashboard(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
      />
    </>
  );
}
