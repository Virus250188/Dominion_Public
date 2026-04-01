"use client";

import { cn } from "@/lib/utils";
import type { EnhancedStats, StatItem } from "@/types/tile";
import { Loader2, AlertCircle } from "lucide-react";

interface StatsDisplayProps {
  stats: EnhancedStats;
  size: "small" | "medium" | "large";
}

export function StatsDisplay({ stats, size }: StatsDisplayProps) {
  if (stats.status === "loading") {
    return <StatsLoading size={size} />;
  }
  if (stats.status === "error") {
    return <StatsError size={size} error={stats.error} />;
  }

  if (size === "small") return <SmallStats items={stats.items} />;
  if (size === "medium") return <MediumStats items={stats.items} />;
  return <LargeStats items={stats.items} />;
}

// Small (1x1): max 3 stats, compact horizontal row
function SmallStats({ items }: { items: StatItem[] }) {
  return (
    <div className="flex items-center justify-around gap-2 px-3 py-1.5 border-t border-border/30">
      {items.slice(0, 3).map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <span className={cn("text-xs font-semibold tabular-nums", getColor(item.color))}>
            {item.value}{item.unit && <span className="text-muted-foreground ml-0.5 text-[10px]">{item.unit}</span>}
          </span>
          <span className="text-[9px] text-muted-foreground leading-tight">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// Medium (2x1): max 6 stats in a horizontal row
function MediumStats({ items }: { items: StatItem[] }) {
  return (
    <div className="flex items-center justify-end gap-4">
      {items.slice(0, 6).map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <span className={cn("text-xs font-bold tabular-nums", getColor(item.color))}>
            {item.value}{item.unit && <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{item.unit}</span>}
          </span>
          <span className="text-[9px] text-muted-foreground leading-tight">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// Large (2x2): max 6 stats in a 3x2 grid with larger text
function LargeStats({ items }: { items: StatItem[] }) {
  return (
    <div className="space-y-3 w-full">
      <div className="grid grid-cols-3 gap-x-4 gap-y-3">
        {items.slice(0, 6).map((item, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</span>
            <span className={cn("text-base font-bold tabular-nums", getColor(item.color))}>
              {item.value}
              {item.unit && <span className="text-xs text-muted-foreground font-normal ml-0.5">{item.unit}</span>}
            </span>
          </div>
        ))}
      </div>
      {/* Show a simple progress bar if any value looks like a percentage */}
      {items.filter(i => typeof i.value === "string" && i.value.endsWith("%")).slice(0, 1).map((item, idx) => {
        const pct = parseInt(String(item.value));
        if (isNaN(pct)) return null;
        return (
          <div key={`bar-${idx}`} className="space-y-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all",
                  pct > 85 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatsLoading({ size }: { size: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground", size === "large" ? "justify-center py-4" : "justify-center py-1")}>
      <Loader2 className={cn("animate-spin", size === "large" ? "h-5 w-5" : "h-3 w-3")} />
      <span className={size === "large" ? "text-sm" : "text-xs"}>Laden...</span>
    </div>
  );
}

function StatsError({ size, error }: { size: string; error?: string }) {
  return (
    <div className={cn("flex items-center gap-1 text-destructive", size === "large" ? "justify-center py-4" : "justify-center py-1")}>
      <AlertCircle className={size === "large" ? "h-4 w-4" : "h-3 w-3"} />
      <span className={size === "large" ? "text-sm" : "text-xs"}>{error || "Fehler"}</span>
    </div>
  );
}

function getColor(color?: string) {
  if (color === "green") return "text-emerald-400";
  if (color === "red") return "text-red-400";
  if (color === "yellow") return "text-yellow-400";
  return "text-foreground";
}
