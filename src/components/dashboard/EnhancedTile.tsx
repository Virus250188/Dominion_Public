"use client";

import type { TileData, EnhancedStats } from "@/types/tile";
import type { TileSize } from "@/plugins/types";
import { Tile } from "./Tile";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { getPlugin } from "@/plugins/registry";
import { getWidget } from "@/components/widgets/registry";

interface EnhancedTileProps {
  tile: TileData;
  onEdit?: (tile: TileData) => void;
  onDelete?: (id: number) => void;
  onTogglePin?: (id: number, pinned: boolean) => void;
  groups?: Array<{ id: number; title: string }>;
  onMoveToGroup?: (tileId: number, groupId: number | null) => void;
  pollInterval?: number;
  className?: string;
}

/** Determine the tile size key from column/row spans. */
function getTileSize(tile: TileData): TileSize {
  if (tile.columnSpan >= 2 && tile.rowSpan >= 2) return "2x2";
  if (tile.columnSpan >= 2) return "2x1";
  return "1x1";
}

export function EnhancedTile({
  tile,
  onEdit,
  onDelete,
  onTogglePin,
  groups,
  onMoveToGroup,
  pollInterval = 30000,
  className,
}: EnhancedTileProps) {
  const [stats, setStats] = useState<EnhancedStats>({ items: [], status: "loading" });

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/enhanced/${tile.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EnhancedStats = await res.json();
      setStats(data);
    } catch (err) {
      setStats({ items: [], status: "error", error: (err as Error).message });
    }
  }, [tile.id, tile.enhancedConfig]);

  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    let mounted = true;

    const safeFetch = () => {
      if (mounted) fetchStats();
    };

    /** Clear any running interval and start a fresh one. */
    const startPolling = () => {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(safeFetch, pollInterval);
    };

    // Initial fetch + start polling
    safeFetch();
    startPolling();

    const handleVisibility = () => {
      if (document.hidden) {
        // Tab hidden -- stop polling to save resources
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      } else {
        // Tab visible again -- always clear first, then fetch + restart
        clearInterval(intervalRef.current);
        safeFetch();
        startPolling();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchStats, pollInterval]);

  // Resolve widget component for 2x1 / 2x2 tiles
  const widgetNode = useMemo(() => {
    const size = getTileSize(tile);
    if (size === "1x1" || !tile.enhancedType) return undefined;

    const plugin = getPlugin(tile.enhancedType);
    if (!plugin) return undefined;

    const hint = plugin.renderHints[size];
    if (!hint || hint.layout !== "widget" || !hint.widgetComponent) return undefined;

    const WidgetComponent = getWidget(hint.widgetComponent);
    if (!WidgetComponent) return undefined;

    // Parse config for the widget
    let config: Record<string, unknown> = {};
    try {
      if (tile.enhancedConfig) {
        config = JSON.parse(tile.enhancedConfig);
      }
    } catch {
      // ignore parse errors
    }

    return (
      <WidgetComponent
        stats={stats}
        config={config}
        tileId={tile.id}
        size={size as "2x1" | "2x2"}
      />
    );
  }, [tile, stats]);

  return (
    <Tile
      tile={tile}
      onEdit={onEdit}
      onDelete={onDelete}
      onTogglePin={onTogglePin}
      groups={groups}
      onMoveToGroup={onMoveToGroup}
      stats={stats}
      className={className}
      widget={widgetNode}
    />
  );
}
