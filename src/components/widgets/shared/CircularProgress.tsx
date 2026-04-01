"use client";

import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  className?: string;
}

function getAutoColor(value: number): string {
  if (value >= 85) return "#ef4444";
  if (value >= 70) return "#eab308";
  return "#10b981";
}

export function CircularProgress({
  value,
  size = 64,
  strokeWidth = 6,
  color,
  label,
  className,
}: CircularProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;
  const resolvedColor = color ?? getAutoColor(clampedValue);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={resolvedColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Center text */}
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-foreground">
          {Math.round(clampedValue)}%
        </span>
      </div>
      {label && (
        <span className="text-[10px] text-muted-foreground leading-tight text-center">
          {label}
        </span>
      )}
    </div>
  );
}
