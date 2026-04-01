"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface WidgetHeaderProps {
  icon?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  status?: "online" | "offline" | "unknown";
  children?: ReactNode;
}

const statusColors = {
  online: "bg-emerald-500",
  offline: "bg-red-500",
  unknown: "bg-muted-foreground/40",
};

export function WidgetHeader({
  icon,
  iconColor,
  title,
  subtitle,
  status,
  children,
}: WidgetHeaderProps) {
  // Resolve Lucide icon by name
  const IconComponent = icon
    ? ((LucideIcons as unknown as Record<string, LucideIcon>)[icon] ?? null) as LucideIcon | null
    : null;

  return (
    <div className="flex items-center gap-2 h-10 px-3 border-b border-border/30 flex-shrink-0">
      {/* Status dot */}
      {status && (
        <span
          className={cn(
            "h-2 w-2 rounded-full flex-shrink-0",
            statusColors[status]
          )}
        />
      )}

      {/* Icon */}
      {IconComponent && (
        <IconComponent
          className="h-5 w-5 flex-shrink-0"
          style={iconColor ? { color: iconColor } : undefined}
        />
      )}

      {/* Title + subtitle */}
      <div className="flex items-baseline gap-2 min-w-0 flex-1">
        <span className="text-sm font-semibold text-foreground truncate">
          {title}
        </span>
        {subtitle && (
          <span className="text-[10px] text-muted-foreground truncate">
            {subtitle}
          </span>
        )}
      </div>

      {/* Right-side actions */}
      {children}
    </div>
  );
}
