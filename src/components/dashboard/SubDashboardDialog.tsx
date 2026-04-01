"use client";

import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { GROUP_ICON_MAP, GROUP_ICON_NAMES } from "./GroupTile";
import type { SubDashboardData } from "./SubDashboardTile";

// Same preset colors as TileDialog / GroupDialog
const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#84cc16", "#22c55e", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#64748b",
];

interface SubDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subDashboard: SubDashboardData | null;
  onSave: (data: {
    title: string;
    icon: string;
    color: string;
    description: string;
  }) => void;
}

export function SubDashboardDialog({
  open,
  onOpenChange,
  subDashboard,
  onSave,
}: SubDashboardDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("LayoutGrid");
  const [color, setColor] = useState("#6366f1");

  // Reset form when subDashboard/open changes
  useEffect(() => {
    if (subDashboard) {
      setTitle(subDashboard.title);
      setDescription(subDashboard.description || "");
      setIcon(subDashboard.icon || "LayoutGrid");
      setColor(subDashboard.color);
    } else {
      setTitle("");
      setDescription("");
      setIcon("LayoutGrid");
      setColor("#6366f1");
    }
  }, [subDashboard, open]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      icon,
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-surface sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {subDashboard
              ? "Sub-Dashboard bearbeiten"
              : "Neues Sub-Dashboard"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="sub-dashboard-title">Titel</Label>
            <Input
              id="sub-dashboard-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Medien, Server, Smart Home..."
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="sub-dashboard-description">
              Beschreibung{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="sub-dashboard-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung..."
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {subDashboard ? "Speichern" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
