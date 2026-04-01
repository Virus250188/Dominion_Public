"use client";

import { cn } from "@/lib/utils";

interface HorizontalProgressBarProps {
  label: string;
  value: number;
  displayValue?: string;
  color?: string;
  height?: number;
  className?: string;
}

function getAutoColor(value: number): string {
  if (value >= 85) return "bg-red-500";
  if (value >= 70) return "bg-yellow-500";
  return "bg-emerald-500";
}

export function HorizontalProgressBar({
  label,
  value,
  displayValue,
  color,
  height = 8,
  className,
}: HorizontalProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const barColor = color ?? getAutoColor(clampedValue);
  const isCustomColor = color != null && !color.startsWith("bg-");

  return (
    <div className={cn("w-full", className)}>
      {/* Label row */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {displayValue && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {displayValue}
          </span>
        )}
      </div>
      {/* Bar track */}
      <div
        className="w-full rounded-full bg-muted/40 overflow-hidden"
        style={{ height }}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            !isCustomColor && barColor
          )}
          style={{
            width: `${clampedValue}%`,
            ...(isCustomColor ? { backgroundColor: color } : {}),
          }}
        />
      </div>
    </div>
  );
}
