"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { motion } from "motion/react";
import type { TileData } from "@/types/tile";
import { Tile } from "@/components/dashboard/Tile";
import { EnhancedTile } from "@/components/dashboard/EnhancedTile";
import { AddTileButton } from "@/components/dashboard/AddTileButton";
import { useEditMode } from "@/contexts/EditModeContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TileGridProps {
  tiles: TileData[];
  onReorder: (orderedIds: number[]) => void;
  onEdit: (tile: TileData) => void;
  onDelete: (id: number) => void;
  onTogglePin: (id: number, pinned: boolean) => void;
  onAddTile: () => void;
  onAddGroup?: () => void;
  onAddSubDashboard?: () => void;
  /** Hide sub-dashboard creation (e.g. inside a sub-dashboard) */
  hideSubDashboard?: boolean;
  groups?: Array<{ id: number; title: string }>;
  onMoveToGroup?: (tileId: number, groupId: number | null) => void;
  gridColumns?: number;
  /** Extra React nodes rendered as grid items after tiles (e.g. SubDashboard tiles) */
  extraItems?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Sortable wrapper for individual tiles
// ---------------------------------------------------------------------------

interface SortableTileProps {
  tile: TileData;
  index: number;
  onEdit: (tile: TileData) => void;
  onDelete: (id: number) => void;
  onTogglePin: (id: number, pinned: boolean) => void;
  groups?: Array<{ id: number; title: string }>;
  onMoveToGroup?: (tileId: number, groupId: number | null) => void;
}

function SortableTile({ tile, index, onEdit, onDelete, onTogglePin, groups, onMoveToGroup }: SortableTileProps) {
  const { ref, isDragging } = useSortable({
    id: tile.id,
    index,
    group: "tiles",
  });

  return (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
      }}
      className="overflow-hidden rounded-xl"
      style={{
        gridColumn: tile.columnSpan > 1 ? `span ${tile.columnSpan}` : undefined,
        gridRow: tile.rowSpan > 1 ? `span ${tile.rowSpan}` : undefined,
      }}
    >
      {tile.type === "enhanced" ? (
        <EnhancedTile
          tile={tile}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
          groups={groups}
          onMoveToGroup={onMoveToGroup}
        />
      ) : (
        <Tile
          tile={tile}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
          groups={groups}
          onMoveToGroup={onMoveToGroup}
          isDragging={isDragging}
        />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Utility: move an item within an array and return the new array
// ---------------------------------------------------------------------------

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ---------------------------------------------------------------------------
// TileGrid
// ---------------------------------------------------------------------------

export function TileGrid({
  tiles,
  onReorder,
  onEdit,
  onDelete,
  onTogglePin,
  onAddTile,
  onAddGroup,
  onAddSubDashboard,
  hideSubDashboard,
  groups,
  onMoveToGroup,
  gridColumns = 6,
  extraItems,
}: TileGridProps) {
  const { editMode } = useEditMode();

  // Keep local ordering so we can optimistically reorder during drag
  const [orderedTiles, setOrderedTiles] = useState<TileData[]>(tiles);

  // Sync external tiles prop when it changes
  const prevTilesRef = useRef(tiles);
  useEffect(() => {
    if (prevTilesRef.current !== tiles) {
      setOrderedTiles(tiles);
      prevTilesRef.current = tiles;
    }
  }, [tiles]);

  const handleDragEnd = useCallback(
    (event: { operation: { source: { id: string | number } | null; target: { id: string | number } | null }; canceled: boolean }) => {
      if (event.canceled) return;

      const { source, target } = event.operation;
      if (!source || !target) return;

      const sourceId = source.id;
      const targetId = target.id;
      if (sourceId === targetId) return;

      setOrderedTiles((prev) => {
        const fromIndex = prev.findIndex((t) => t.id === sourceId);
        const toIndex = prev.findIndex((t) => t.id === targetId);
        if (fromIndex === -1 || toIndex === -1) return prev;

        const next = arrayMove(prev, fromIndex, toIndex);
        // Notify parent of the new ordering
        onReorder(next.map((t) => t.id));
        return next;
      });
    },
    [onReorder],
  );

  return (
    <DragDropProvider onDragEnd={editMode ? handleDragEnd : undefined}>
      {/* Responsive overrides for the tile grid */}
      <style>{`
        @media (max-width: 1023px) {
          .tile-grid-responsive {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 639px) {
          .tile-grid-responsive {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>

      <motion.div
        className="tile-grid-responsive grid gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05 } },
        }}
        style={{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
          gridAutoRows: "160px",
          gridAutoFlow: "dense",
        }}
      >
        {orderedTiles.map((tile, index) => (
            <SortableTile
              key={tile.id}
              tile={tile}
              index={index}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              groups={groups}
              onMoveToGroup={onMoveToGroup}
            />
        ))}
        {extraItems}
        {editMode && (
          <AddTileButton
            onAddTile={onAddTile}
            onAddGroup={onAddGroup}
            onAddSubDashboard={onAddSubDashboard}
            hideSubDashboard={hideSubDashboard}
          />
        )}
      </motion.div>
    </DragDropProvider>
  );
}
