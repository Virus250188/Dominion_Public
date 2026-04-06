"use client";

import { useState, useEffect, useMemo } from "react";
import type { TileData } from "@/types/tile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppIcon } from "./AppIcon";
import { GROUP_ICON_MAP, GROUP_ICON_NAMES } from "./GroupTile";
import type { GroupTileData } from "./GroupTile";

import { PRESET_COLORS } from "@/lib/constants";

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupTileData | null;
  tiles: TileData[];
  assignedTileIds?: number[];
  onSave: (data: {
    title: string;
    icon: string;
    color: string;
    selectedTileIds: number[];
  }) => void;
}

export function GroupDialog({
  open,
  onOpenChange,
  group,
  tiles,
  assignedTileIds,
  onSave,
}: GroupDialogProps) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("Folder");
  const [color, setColor] = useState("#6366f1");
  const [selectedTileIds, setSelectedTileIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  // Reset form when group/open changes
  useEffect(() => {
    if (group) {
      setTitle(group.title);
      setIcon(group.icon || "Folder");
      setColor(group.color);
      setSelectedTileIds(new Set(assignedTileIds || []));
    } else {
      setTitle("");
      setIcon("Folder");
      setColor("#6366f1");
      setSelectedTileIds(new Set());
    }
    setSearch("");
  }, [group, open, assignedTileIds]);

  const filteredTiles = useMemo(() => {
    if (!search.trim()) return tiles;
    const q = search.toLowerCase();
    return tiles.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [tiles, search]);

  const toggleTile = (tileId: number) => {
    setSelectedTileIds((prev) => {
      const next = new Set(prev);
      if (next.has(tileId)) {
        next.delete(tileId);
      } else {
        next.add(tileId);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      icon,
      color,
      selectedTileIds: Array.from(selectedTileIds),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-surface sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {group ? "Gruppen-Dashboard bearbeiten" : "Neues Gruppen-Dashboard"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="group-title">Titel</Label>
            <Input
              id="group-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Medien, Server, Smart Home..."
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {GROUP_ICON_NAMES.map((name) => {
                const IconComp = GROUP_ICON_MAP[name];
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border-2 transition-all hover:scale-110",
                      icon === name
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:border-border"
                    )}
                    title={name}
                  >
                    <IconComp className="h-4 w-4 text-foreground" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-1.5">
            <Label>Farbe</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c, i) => (
                <button
                  key={`${c}-${i}`}
                  aria-label={`Farbe ${c}`}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                    color === c ? "border-white scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-12 cursor-pointer p-0 border-0"
              />
            </div>
          </div>

          {/* App Assignment List */}
          <div className="space-y-1.5">
            <Label>Apps zuweisen</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Apps filtern..."
                className="pl-8"
              />
            </div>
            <ScrollArea className="max-h-60 overflow-y-auto">
              <div className="space-y-1 py-1">
                {filteredTiles.map((tile) => {
                  const checked = selectedTileIds.has(tile.id);
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
                        onChange={() => toggleTile(tile.id)}
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
                {filteredTiles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Keine Apps gefunden
                  </p>
                )}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selectedTileIds.size} von {tiles.length} Apps ausgewaehlt
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {group ? "Speichern" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
