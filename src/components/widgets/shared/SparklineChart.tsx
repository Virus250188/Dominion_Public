"use client";

import { cn } from "@/lib/utils";
import { useId } from "react";

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  className?: string;
}

export function SparklineChart({
  data,
  width = 120,
  height = 40,
  color = "currentColor",
  fill = false,
  className,
}: SparklineChartProps) {
  const gradientId = useId();

  if (!data || data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={cn("text-muted-foreground/40", className)}
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padding + ((max - val) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const polylinePoints = points.join(" ");

  // Fill polygon: same points but close path along the bottom
  const fillPoints = `0,${height} ${polylinePoints} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <polygon
            points={fillPoints}
            fill={`url(#${gradientId})`}
          />
        </>
      )}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
