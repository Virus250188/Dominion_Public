"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MoreVertical, Pencil, Trash2, LayoutGrid } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder,
  FolderHeart,
  Server,
  Tv,
  Shield,
  Download,
  Home,
  Cloud,
  Database,
  Music,
  Camera,
  Wrench,
  Network,
  Monitor,
  Globe,
  Gamepad2,
  Film,
  Code,
  Lock,
  Zap,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Icon lookup map
export const GROUP_ICON_MAP: Record<string, LucideIcon> = {
  Folder,
  FolderHeart,
  Server,
  Tv,
  Shield,
  Download,
  Home,
  Cloud,
  Database,
  Music,
  Camera,
  Wrench,
  Network,
  Monitor,
  Globe,
  Gamepad2,
  Film,
  Code,
  Lock,
  Zap,
  Star,
  LayoutGrid,
};

export const GROUP_ICON_NAMES = Object.keys(GROUP_ICON_MAP);

export interface GroupTileData {
  id: number;
  title: string;
  icon: string | null;
  color: string;
  order: number;
  tileCount: number;
}

interface GroupTileProps {
  group: GroupTileData;
  onEdit: (group: GroupTileData) => void;
  onDelete: (id: number) => void;
}

export function GroupTile({ group, onEdit, onDelete }: GroupTileProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const IconComponent = GROUP_ICON_MAP[group.icon || "Folder"] || Folder;

  return (
    <motion.div
      className="glass-card group relative flex flex-col items-center justify-center gap-3 p-5 cursor-pointer select-none"
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      layout
      onClick={() => {
        if (isMenuOpen) return;
        router.push(`/dashboard/group/${group.id}`);
      }}
    >
      {/* LayoutGrid indicator top-left */}
      <div className="absolute left-2 top-2 flex items-center gap-1.5">
        <LayoutGrid className="h-3 w-3 text-primary/60" />
      </div>

      {/* Context menu */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 z-10">
        <DropdownMenu onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger
            render={
              <button
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-surface">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit(group);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Bearbeiten
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(group.id);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Loeschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Icon */}
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl shadow-lg transition-all duration-200",
          "group-hover:shadow-xl group-hover:brightness-110 group-hover:scale-105"
        )}
        style={{ backgroundColor: group.color }}
      >
        <IconComponent className="h-6 w-6 text-white" />
      </div>

      {/* Title */}
      <span className="text-sm font-medium text-foreground text-center leading-tight line-clamp-2">
        {group.title}
      </span>

      {/* App count badge */}
      <span className="text-xs text-muted-foreground">
        {group.tileCount} {group.tileCount === 1 ? "App" : "Apps"}
      </span>
    </motion.div>
  );
}
