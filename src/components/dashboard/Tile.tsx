"use client";

import { cn } from "@/lib/utils";
import type { TileData, EnhancedStats } from "@/types/tile";
import { motion } from "motion/react";
import { useState } from "react";
import { MoreVertical, ExternalLink, Pencil, Trash2, Pin, PinOff, FolderMinus, FolderOpen } from "lucide-react";
import { AppIcon } from "./AppIcon";
import { StatsDisplay } from "./StatsDisplay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditMode } from "@/contexts/EditModeContext";

interface TileProps {
  tile: TileData;
  onEdit?: (tile: TileData) => void;
  onDelete?: (id: number) => void;
  onTogglePin?: (id: number, pinned: boolean) => void;
  groups?: Array<{ id: number; title: string }>;
  onMoveToGroup?: (tileId: number, groupId: number | null) => void;
  stats?: EnhancedStats;
  isDragging?: boolean;
  className?: string;
  widget?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Context menu shared across all sizes
// ---------------------------------------------------------------------------

function TileContextMenu({
  tile,
  onEdit,
  onDelete,
  onTogglePin,
  groups,
  onMoveToGroup,
  setIsMenuOpen,
}: {
  tile: TileData;
  onEdit?: (tile: TileData) => void;
  onDelete?: (id: number) => void;
  onTogglePin?: (id: number, pinned: boolean) => void;
  groups?: Array<{ id: number; title: string }>;
  onMoveToGroup?: (tileId: number, groupId: number | null) => void;
  setIsMenuOpen: (open: boolean) => void;
}) {
  const { editMode } = useEditMode();

  if (!editMode) return null;

  return (
    <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 z-10">
      <DropdownMenu onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger
          render={<button
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
            onClick={(e) => e.stopPropagation()}
          />}
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-surface">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(tile.url, "_blank"); }}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Oeffnen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(tile); }}>
            <Pencil className="mr-2 h-4 w-4" />
            Bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin?.(tile.id, !tile.pinned); }}>
            {tile.pinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
            {tile.pinned ? "Loesung" : "Anheften"}
          </DropdownMenuItem>
          {groups && groups.length > 0 && onMoveToGroup && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Verschieben nach...</div>
              {tile.groupId && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveToGroup(tile.id, null); }}>
                  <FolderMinus className="mr-2 h-4 w-4" />
                  Ungruppiert
                </DropdownMenuItem>
              )}
              {groups.filter(g => g.id !== tile.groupId).map((group) => (
                <DropdownMenuItem key={group.id} onClick={(e) => { e.stopPropagation(); onMoveToGroup(tile.id, group.id); }}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  {group.title}
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete?.(tile.id); }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Loeschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small tile (1x1) - compact square layout
// ---------------------------------------------------------------------------

function SmallTileLayout({
  tile,
  onEdit,
  onDelete,
  onTogglePin,
  groups,
  onMoveToGroup,
  stats,
  isDragging,
  className,
}: TileProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <motion.div
      className={cn(
        "glass-card group relative flex flex-col items-center justify-center gap-1.5 p-3 pt-6 cursor-pointer select-none h-full",
        isDragging && "opacity-50 scale-105",
        className
      )}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      layout
      layoutId={`tile-${tile.id}`}
      onClick={() => {
        if (isMenuOpen) return;
        window.open(tile.url, "_blank", "noopener,noreferrer");
      }}
    >
      {/* Pin indicator */}
      {tile.pinned && (
        <div className="absolute left-2 top-2">
          <Pin className="h-3 w-3 text-primary/60" />
        </div>
      )}

      <TileContextMenu tile={tile} onEdit={onEdit} onDelete={onDelete} onTogglePin={onTogglePin} groups={groups} onMoveToGroup={onMoveToGroup} setIsMenuOpen={setIsMenuOpen} />

      {/* Icon */}
      <AppIcon
        appName={tile.title}
        color={tile.color}
        size={40}
        customIcon={tile.customIconSvg}
        className="shadow-lg transition-all duration-200 group-hover:shadow-xl group-hover:brightness-110 group-hover:scale-105"
      />

      {/* Title */}
      <span className="text-xs font-semibold text-foreground text-center leading-tight line-clamp-1">
        {tile.title}
      </span>

      {/* Description - only show when no stats (stats are more important in 1x1) */}
      {tile.description && !stats && (
        <span className="text-[10px] text-muted-foreground text-center line-clamp-1">
          {tile.description}
        </span>
      )}

      {/* Stats for small tile */}
      {stats && <StatsDisplay stats={stats} size="small" />}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Medium tile (2x1) - wide tile: icon + title left, stats right
// ---------------------------------------------------------------------------

function MediumTileLayout({
  tile,
  onEdit,
  onDelete,
  onTogglePin,
  groups,
  onMoveToGroup,
  stats,
  isDragging,
  className,
  widget,
}: TileProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // If a widget is provided, render it full-bleed (widget handles its own header)
  if (widget) {
    return (
      <motion.div
        className={cn(
          "glass-card group relative flex flex-col cursor-pointer select-none h-full overflow-hidden",
          isDragging && "opacity-50 scale-105",
          className
        )}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        layout
        layoutId={`tile-${tile.id}`}
        onClick={() => {
          if (isMenuOpen) return;
          window.open(tile.url, "_blank", "noopener,noreferrer");
        }}
      >
        <TileContextMenu tile={tile} onEdit={onEdit} onDelete={onDelete} onTogglePin={onTogglePin} groups={groups} onMoveToGroup={onMoveToGroup} setIsMenuOpen={setIsMenuOpen} />
        {widget}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        "glass-card group relative flex items-center gap-4 p-4 cursor-pointer select-none h-full",
        isDragging && "opacity-50 scale-105",
        className
      )}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      layout
      layoutId={`tile-${tile.id}`}
      onClick={() => {
        if (isMenuOpen) return;
        window.open(tile.url, "_blank", "noopener,noreferrer");
      }}
    >
      {/* Pin indicator */}
      {tile.pinned && (
        <div className="absolute left-2 top-2">
          <Pin className="h-3 w-3 text-primary/60" />
        </div>
      )}

      <TileContextMenu tile={tile} onEdit={onEdit} onDelete={onDelete} onTogglePin={onTogglePin} groups={groups} onMoveToGroup={onMoveToGroup} setIsMenuOpen={setIsMenuOpen} />

      {/* Icon */}
      <div className="flex-shrink-0">
        <AppIcon
          appName={tile.title}
          color={tile.color}
          size={44}
          customIcon={tile.customIconSvg}
          className="shadow-lg transition-all duration-200 group-hover:shadow-xl group-hover:brightness-110 group-hover:scale-105"
        />
      </div>

      {/* Title + description */}
      <div className="flex flex-col gap-0.5 min-w-0 shrink-0">
        <span className="text-sm font-semibold text-foreground leading-tight line-clamp-1">
          {tile.title}
        </span>
        {tile.description && (
          <span className="text-[11px] text-muted-foreground line-clamp-1">
            {tile.description}
          </span>
        )}
      </div>

      {/* Stats row (fills remaining space) */}
      {stats && (
        <div className="flex-1 min-w-0">
          <StatsDisplay stats={stats} size="medium" />
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Large tile (2x2) - compact header + widget/stats area
// ---------------------------------------------------------------------------

function LargeTileLayout({
  tile,
  onEdit,
  onDelete,
  onTogglePin,
  groups,
  onMoveToGroup,
  stats,
  isDragging,
  className,
  widget,
}: TileProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // If a widget is provided, render it full-bleed (widget handles its own header)
  if (widget) {
    return (
      <motion.div
        className={cn(
          "glass-card group relative flex flex-col cursor-pointer select-none h-full overflow-hidden",
          isDragging && "opacity-50 scale-105",
          className
        )}
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.99 }}
        layout
        layoutId={`tile-${tile.id}`}
        onClick={() => {
          if (isMenuOpen) return;
          window.open(tile.url, "_blank", "noopener,noreferrer");
        }}
      >
        <TileContextMenu tile={tile} onEdit={onEdit} onDelete={onDelete} onTogglePin={onTogglePin} groups={groups} onMoveToGroup={onMoveToGroup} setIsMenuOpen={setIsMenuOpen} />
        <div className="flex-1 flex flex-col min-h-0">
          {widget}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        "glass-card group relative flex flex-col p-5 cursor-pointer select-none h-full",
        isDragging && "opacity-50 scale-105",
        className
      )}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      layout
      layoutId={`tile-${tile.id}`}
      onClick={() => {
        if (isMenuOpen) return;
        window.open(tile.url, "_blank", "noopener,noreferrer");
      }}
    >
      <TileContextMenu tile={tile} onEdit={onEdit} onDelete={onDelete} onTogglePin={onTogglePin} groups={groups} onMoveToGroup={onMoveToGroup} setIsMenuOpen={setIsMenuOpen} />

      {/* Compact header row */}
      <div className="flex items-center gap-3 mb-3">
        <AppIcon
          appName={tile.title}
          color={tile.color}
          size={32}
          customIcon={tile.customIconSvg}
          className="shadow-md flex-shrink-0"
        />
        <span className="text-sm font-semibold text-foreground leading-tight line-clamp-1 flex-1 min-w-0">
          {tile.title}
        </span>
        {tile.pinned && <Pin className="h-3 w-3 text-primary/60 flex-shrink-0" />}
        {tile.enhancedType && (
          <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium flex-shrink-0">
            {tile.enhancedType}
          </span>
        )}
      </div>

      {/* Widget / stats area */}
      <div className="flex-1 flex flex-col">
        {stats ? (
          <div className="flex-1 flex items-start">
            <div className="w-full">
              <StatsDisplay stats={stats} size="large" />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            {tile.description && (
              <span className="text-sm text-muted-foreground text-center line-clamp-3 max-w-[80%]">
                {tile.description}
              </span>
            )}
            <span className="text-xs text-muted-foreground/50 truncate max-w-[80%]">
              {tile.url}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Tile component - delegates to the appropriate layout
// ---------------------------------------------------------------------------

export function Tile({ tile, onEdit, onDelete, onTogglePin, groups, onMoveToGroup, stats, isDragging, className, widget }: TileProps) {
  // Large: 2x2 (2 columns wide, 2 rows tall in 6-col grid)
  if (tile.columnSpan >= 2 && tile.rowSpan >= 2) {
    return (
      <LargeTileLayout
        tile={tile}
        onEdit={onEdit}
        onDelete={onDelete}
        onTogglePin={onTogglePin}
        groups={groups}
        onMoveToGroup={onMoveToGroup}
        stats={stats}
        isDragging={isDragging}
        className={className}
        widget={widget}
      />
    );
  }

  // Medium: 2x1
  if (tile.columnSpan >= 2 && tile.rowSpan === 1) {
    return (
      <MediumTileLayout
        tile={tile}
        onEdit={onEdit}
        onDelete={onDelete}
        onTogglePin={onTogglePin}
        groups={groups}
        onMoveToGroup={onMoveToGroup}
        stats={stats}
        isDragging={isDragging}
        className={className}
        widget={widget}
      />
    );
  }

  // Small: 1x1 (default)
  return (
    <SmallTileLayout
      tile={tile}
      onEdit={onEdit}
      onDelete={onDelete}
      onTogglePin={onTogglePin}
      groups={groups}
      onMoveToGroup={onMoveToGroup}
      stats={stats}
      isDragging={isDragging}
      className={className}
    />
  );
}
