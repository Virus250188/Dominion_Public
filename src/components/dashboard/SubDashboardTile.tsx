"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MoreVertical, Pencil, Trash2, LayoutDashboard } from "lucide-react";
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
  LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Icon lookup map (same as GroupTile)
const SUB_DASHBOARD_ICON_MAP: Record<string, LucideIcon> = {
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

export interface SubDashboardData {
  id: number;
  title: string;
  icon: string | null;
  color: string;
  description: string | null;
  tileCount: number;
}

interface SubDashboardTileProps {
  subDashboard: SubDashboardData;
  onEdit: (subDashboard: SubDashboardData) => void;
  onDelete: (id: number) => void;
}

export function SubDashboardTile({
  subDashboard,
  onEdit,
  onDelete,
}: SubDashboardTileProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const IconComponent =
    SUB_DASHBOARD_ICON_MAP[subDashboard.icon || "LayoutGrid"] || LayoutGrid;

  return (
    <motion.div
      className="glass-card group relative flex flex-col items-center justify-center gap-1.5 p-3 pt-6 cursor-pointer select-none"
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      layout
      onClick={() => {
        if (isMenuOpen) return;
        router.push(`/dashboard/sub/${subDashboard.id}`);
      }}
    >
      {/* Sub-dashboard indicator top-left */}
      <div className="absolute left-2 top-2 flex items-center gap-1.5">
        <LayoutDashboard className="h-3 w-3 text-primary/60" />
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
                onEdit(subDashboard);
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
                onDelete(subDashboard.id);
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
        style={{ backgroundColor: subDashboard.color }}
      >
        <IconComponent className="h-6 w-6 text-white" />
      </div>

      {/* Title */}
      <span className="text-xs font-semibold text-foreground text-center leading-tight line-clamp-1">
        {subDashboard.title}
      </span>

      {/* Description */}
      {subDashboard.description && (
        <span className="text-[10px] text-muted-foreground text-center line-clamp-1">
          {subDashboard.description}
        </span>
      )}

      {/* Tile count badge */}
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
        {subDashboard.tileCount} {subDashboard.tileCount === 1 ? "App" : "Apps"}
      </span>
    </motion.div>
  );
}
