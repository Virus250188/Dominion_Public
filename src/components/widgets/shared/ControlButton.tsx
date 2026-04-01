"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface ControlButtonProps {
  icon: string;
  label?: string;
  onClick: () => void;
  variant?: "default" | "success" | "danger" | "warning";
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "md";
}

const variantStyles = {
  default:
    "bg-muted/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground",
  success:
    "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300",
  danger:
    "bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300",
  warning:
    "bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 hover:text-yellow-300",
};

const sizeStyles = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
};

const iconSizes = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
};

export function ControlButton({
  icon,
  label,
  onClick,
  variant = "default",
  disabled = false,
  loading = false,
  size = "sm",
}: ControlButtonProps) {
  const IconComponent =
    ((LucideIcons as unknown as Record<string, LucideIcon>)[icon] ?? null) as LucideIcon | null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && !loading) onClick();
      }}
      disabled={disabled || loading}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed"
      )}
    >
      {loading ? (
        <Loader2 className={cn("animate-spin", iconSizes[size])} />
      ) : IconComponent ? (
        <IconComponent className={iconSizes[size]} />
      ) : null}
    </button>
  );
}
