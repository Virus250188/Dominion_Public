"use client";

import { useState } from "react";
import type { TileData } from "@/types/tile";
import { EnhancedTile } from "./EnhancedTile";
import { Tile } from "./Tile";
import { ChevronDown, ChevronRight, Pencil, GripVertical, Trash2, MoreVertical } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useEditMode } from "@/contexts/EditModeContext";

// Icon lookup map (mirrored from GroupTile.tsx)
const GROUP_ICON_MAP: Record<string, LucideIcon> = {
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

interface GroupContainerProps {
  group: {
    id: number;
    title: string;
    icon: string | null;
    color: string;
    collapsed: boolean;
  };
  tiles: TileData[];
  gridColumns?: number;
  onEditGroup?: (group: {
    id: number;
    title: string;
    icon: string | null;
    color: string;
  }) => void;
  onDeleteGroup?: (groupId: number) => void;
  onEditTile?: (tile: TileData) => void;
  onDeleteTile?: (id: number) => void;
  onTogglePin?: (id: number, pinned: boolean) => void;
  onToggleCollapsed?: (groupId: number) => void;
  groups?: Array<{ id: number; title: string }>;
  onMoveToGroup?: (tileId: number, groupId: number | null) => void;
}

export function GroupContainer({
  group,
  tiles,
  gridColumns = 6,
  onEditGroup,
  onDeleteGroup,
  onEditTile,
  onDeleteTile,
  onTogglePin,
  onToggleCollapsed,
  groups,
  onMoveToGroup,
}: GroupContainerProps) {
  const { editMode } = useEditMode();
  const [menuOpen, setMenuOpen] = useState(false);
  // Local collapsed state as fallback when no external handler is provided
  const [localCollapsed, setLocalCollapsed] = useState(group.collapsed);
  const isCollapsed = onToggleCollapsed ? group.collapsed : localCollapsed;

  const handleToggleCollapsed = () => {
    if (onToggleCollapsed) {
      onToggleCollapsed(group.id);
    } else {
      setLocalCollapsed((prev) => !prev);
    }
  };

  const IconComponent = GROUP_ICON_MAP[group.icon || "Folder"] || Folder;

  return (
    <div
      className="glass-card overflow-hidden border-l-4"
      style={{ borderLeftColor: group.color }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleToggleCollapsed}
        className={cn(
          "flex w-full items-center gap-3 px-4 select-none",
          "h-11 text-left transition-colors",
          "hover:bg-white/[0.04]"
        )}
      >
        {/* Drag handle (visual only for now) */}
        <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground/40 cursor-grab" />

        {/* Group icon with color tint */}
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
          style={{ backgroundColor: `${group.color}20` }}
        >
          <IconComponent
            className="h-4 w-4"
            style={{ color: group.color }}
          />
        </div>

        {/* Title */}
        <span className="text-sm font-semibold text-foreground truncate">
          {group.title}
        </span>

        {/* Tile count badge */}
        <span className="text-xs text-muted-foreground tabular-nums">
          {tiles.length} {tiles.length === 1 ? "App" : "Apps"}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Collapse/expand chevron */}
        <motion.div
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>

        {/* 3-dot menu (only in edit mode) */}
        {editMode && (
          <div className="relative flex-shrink-0">
            <div
              role="button"
              tabIndex={0}
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }
              }}
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            {menuOpen && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                />
                <div className="absolute right-0 top-full mt-1 z-50 glass-card rounded-lg border border-border/50 shadow-xl overflow-hidden min-w-[160px]">
                  {onEditGroup && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEditGroup({ id: group.id, title: group.title, icon: group.icon, color: group.color });
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-foreground hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      Bearbeiten
                    </button>
                  )}
                  {onDeleteGroup && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDeleteGroup(group.id);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-destructive hover:bg-white/10 transition-colors cursor-pointer border-t border-border/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Gruppe loeschen
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </button>

      {/* ── Collapsible content ──────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1">
              {tiles.length === 0 ? (
                /* Empty state */
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground/60">
                  Keine Apps in dieser Gruppe
                </div>
              ) : (
                /* Tile sub-grid */
                <>
                  {/* Responsive overrides for group sub-grid */}
                  <style>{`
                    @media (max-width: 1023px) {
                      .group-grid-${group.id} {
                        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                      }
                    }
                    @media (max-width: 639px) {
                      .group-grid-${group.id} {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                      }
                    }
                  `}</style>

                  <motion.div
                    className={cn("grid gap-4", `group-grid-${group.id}`)}
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.04 } },
                    }}
                    style={{
                      gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
                      gridAutoRows: "160px",
                      gridAutoFlow: "dense",
                    }}
                  >
                    {tiles.map((tile) => (
                        <motion.div
                          key={`group-${group.id}-tile-${tile.id}`}
                          variants={{
                            hidden: { opacity: 0, y: 12 },
                            visible: {
                              opacity: 1,
                              y: 0,
                              transition: { duration: 0.25 },
                            },
                          }}
                          className="overflow-hidden rounded-xl"
                          style={{
                            gridColumn:
                              tile.columnSpan > 1
                                ? `span ${tile.columnSpan}`
                                : undefined,
                            gridRow:
                              tile.rowSpan > 1
                                ? `span ${tile.rowSpan}`
                                : undefined,
                          }}
                        >
                          {tile.type === "enhanced" ? (
                            <EnhancedTile
                              tile={tile}
                              onEdit={onEditTile}
                              onDelete={onDeleteTile}
                              onTogglePin={onTogglePin}
                              groups={groups}
                              onMoveToGroup={onMoveToGroup}
                            />
                          ) : (
                            <Tile
                              tile={tile}
                              onEdit={onEditTile}
                              onDelete={onDeleteTile}
                              onTogglePin={onTogglePin}
                              groups={groups}
                              onMoveToGroup={onMoveToGroup}
                            />
                          )}
                        </motion.div>
                    ))}
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
