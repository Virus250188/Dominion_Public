"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import type { TileData } from "@/types/tile";
import { TileGrid } from "./TileGrid";
import { assignTilesToGroup, reorderGroupTiles } from "@/lib/actions/groups";
import { updateTile, deleteTile, togglePinTile } from "@/lib/actions/tiles";
import { TileDialog } from "./TileDialog";
import { Button } from "@/components/ui/button";
import { AppIcon } from "./AppIcon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { GROUP_ICON_MAP } from "./GroupTile";
import type { LucideIcon } from "lucide-react";
import { Folder } from "lucide-react";

interface GroupDashboardProps {
  group: {
    id: number;
    title: string;
    icon: string | null;
    color: string;
  };
  tiles: TileData[];
  allTiles: TileData[];
  assignedTileIds: number[];
  gridColumns: number;
}

export function GroupDashboard({
  group,
  tiles: initialTiles,
  allTiles,
  assignedTileIds: initialAssignedIds,
  gridColumns,
}: GroupDashboardProps) {
  const [tiles, setTiles] = useState<TileData[]>(initialTiles);
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set(initialAssignedIds));
  const [isPending, startTransition] = useTransition();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTile, setEditingTile] = useState<TileData | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSelected, setPickerSelected] = useState<Set<number>>(new Set());


  const IconComponent: LucideIcon = GROUP_ICON_MAP[group.icon || "Folder"] || Folder;

  const handleReorder = useCallback(
    (orderedIds: number[]) => {
      const reordered = orderedIds
        .map((id) => tiles.find((t) => t.id === id))
        .filter(Boolean) as TileData[];
      setTiles(reordered);

      startTransition(async () => {
        await reorderGroupTiles(group.id, orderedIds);
      });
    },
    [tiles, group.id]
  );

  const handleEdit = useCallback((tile: TileData) => {
    setEditingTile(tile);
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: number) => {
      startTransition(async () => {
        await deleteTile(id);
        setTiles((prev) => prev.filter((t) => t.id !== id));
        setAssignedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
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
    });
  }, []);

  const handleSaveTile = useCallback(
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
      if (!editingTile) return;
      startTransition(async () => {
        await updateTile(editingTile.id, data);
        setTiles((prev) =>
          prev.map((t) => (t.id === editingTile.id ? { ...t, ...data, customIconSvg: data.customIconSvg ?? t.customIconSvg } : t))
        );
        setEditDialogOpen(false);
        setEditingTile(null);
      });
    },
    [editingTile]
  );

  // Open picker dialog
  const handleOpenPicker = useCallback(() => {
    setPickerSelected(new Set(assignedIds));
    setPickerSearch("");
    setPickerOpen(true);
  }, [assignedIds]);

  // Save picker selection
  const handleSavePicker = useCallback(() => {
    const newIds = Array.from(pickerSelected);
    startTransition(async () => {
      await assignTilesToGroup(group.id, newIds);
      // Rebuild tiles list from allTiles
      const newTiles = newIds
        .map((id) => allTiles.find((t) => t.id === id))
        .filter(Boolean) as TileData[];
      setTiles(newTiles);
      setAssignedIds(pickerSelected);
      setPickerOpen(false);
    });
  }, [pickerSelected, group.id, allTiles]);

  const filteredPickerTiles = useMemo(() => {
    if (!pickerSearch.trim()) return allTiles;
    const q = pickerSearch.toLowerCase();
    return allTiles.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [allTiles, pickerSearch]);

  const togglePickerTile = (tileId: number) => {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tileId)) {
        next.delete(tileId);
      } else {
        next.add(tileId);
      }
      return next;
    });
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Hauptdashboard
        </Link>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-1.5 text-foreground font-medium">
          <IconComponent className="h-4 w-4" style={{ color: group.color }} />
          {group.title}
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleOpenPicker}>
            <Plus className="h-4 w-4 mr-1" />
            Apps verwalten
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
        onAddTile={handleOpenPicker}
        gridColumns={gridColumns}
      />

      {/* Edit Tile Dialog */}
      <TileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        tile={editingTile}
        foundationApps={[]}
        groups={[]}
        onSave={handleSaveTile}
      />

      {/* Tile Picker Dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="glass-surface sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Apps fuer &quot;{group.title}&quot; verwalten</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Apps filtern..."
                className="pl-8"
              />
            </div>
            <ScrollArea className="max-h-72 overflow-y-auto">
              <div className="space-y-1 py-1">
                {filteredPickerTiles.map((tile) => {
                  const checked = pickerSelected.has(tile.id);
                  return (
                    <label
                      key={tile.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2 py-1.5 cursor-pointer transition-colors",
                        checked ? "bg-primary/10" : "hover:bg-accent/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePickerTile(tile.id)}
                        className="rounded"
                      />
                      <AppIcon
                        appName={tile.icon || tile.title}
                        color={tile.color}
                        size={24}
                        customIcon={tile.customIconSvg}
                        className="rounded-md flex-shrink-0"
                      />
                      <span className="text-sm text-foreground truncate">
                        {tile.title}
                      </span>
                    </label>
                  );
                })}
                {filteredPickerTiles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Keine Apps gefunden
                  </p>
                )}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {pickerSelected.size} von {allTiles.length} Apps ausgewaehlt
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSavePicker}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
