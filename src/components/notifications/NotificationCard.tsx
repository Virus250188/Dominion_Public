"use client";

import { useState, useCallback } from "react";
import { Check } from "lucide-react";
import { type Notification } from "@/lib/notifications/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NotificationCardProps {
  notification: Notification & {
    source?: { name: string; icon: string | null; color: string; sourceId: string };
  };
  onAcknowledge: (id: number) => void;
}

// ─── Category styling ───────────────────────────────────────────────────────

const categoryStyles: Record<
  string,
  { bg: string; border: string; label: string; tagBg: string; tagText: string }
> = {
  info: {
    bg: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
    border: "rgba(255,255,255,0.12)",
    label: "text-gray-400",
    tagBg: "rgba(255,255,255,0.08)",
    tagText: "text-gray-300",
  },
  warning: {
    bg: "linear-gradient(135deg, rgba(234,179,8,0.10) 0%, rgba(234,179,8,0.03) 100%)",
    border: "rgba(234,179,8,0.25)",
    label: "text-yellow-400",
    tagBg: "rgba(234,179,8,0.12)",
    tagText: "text-yellow-300",
  },
  critical: {
    bg: "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)",
    border: "rgba(239,68,68,0.35)",
    label: "text-red-400",
    tagBg: "rgba(239,68,68,0.15)",
    tagText: "text-red-300",
  },
  update: {
    bg: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.02) 100%)",
    border: "rgba(59,130,246,0.20)",
    label: "text-blue-400",
    tagBg: "rgba(59,130,246,0.12)",
    tagText: "text-blue-300",
  },
};

// ─── Relative timestamp (German) ────────────────────────────────────────────

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "gerade eben";
  if (minutes === 1) return "vor 1 Min.";
  if (minutes < 60) return `vor ${minutes} Min.`;
  if (hours === 1) return "vor 1 Std.";
  if (hours < 24) return `vor ${hours} Std.`;
  if (days === 1) return "vor 1 Tag";
  return `vor ${days} Tagen`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function NotificationCard({ notification, onAcknowledge }: NotificationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  const style = categoryStyles[notification.category] ?? categoryStyles.info;
  const hasLongMessage = (notification.message?.length ?? 0) > 120;

  const handleAcknowledge = useCallback(async () => {
    if (acknowledging) return;
    setAcknowledging(true);
    try {
      await onAcknowledge(notification.id);
    } finally {
      setAcknowledging(false);
    }
  }, [acknowledging, notification.id, onAcknowledge]);

  const sourceInitial = notification.source?.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div
      className={`relative flex gap-3 rounded-lg p-3 transition-all ${notification.category === "critical" ? "animate-critical-pulse" : ""}`}
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        backdropFilter: "blur(12px) saturate(180%)",
        WebkitBackdropFilter: "blur(12px) saturate(180%)",
      }}
    >
      {/* Left: Source icon */}
      <div className="flex-shrink-0">
        {notification.source?.icon ? (
          <img
            src={notification.source.icon}
            alt={notification.source.name}
            className="h-9 w-9 rounded-lg object-cover"
          />
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: notification.source?.color ?? "rgba(255,255,255,0.1)" }}
          >
            {sourceInitial}
          </div>
        )}
      </div>

      {/* Middle: Content */}
      <div className="min-w-0 flex-1">
        {/* Top row: category + tag + timestamp */}
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`font-semibold uppercase tracking-wider ${style.label}`}>
            {notification.category}
          </span>
          {notification.tag && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${style.tagText}`}
              style={{ backgroundColor: style.tagBg }}
            >
              {notification.tag}
            </span>
          )}
          <span className="ml-auto text-muted-foreground">
            {relativeTime(notification.receivedAt)}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-foreground">{notification.title}</p>

        {/* Message */}
        {notification.message && (
          <div className="mt-1">
            <p
              className={`text-xs text-muted-foreground ${!expanded ? "line-clamp-2" : ""}`}
              style={expanded ? { maxHeight: 150, overflowY: "auto" } : undefined}
            >
              {notification.message}
            </p>
            {hasLongMessage && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-0.5 text-[11px] font-medium text-primary hover:underline"
              >
                {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: Acknowledge button */}
      <div className="flex-shrink-0">
        <button
          onClick={handleAcknowledge}
          disabled={acknowledging}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
          title="Bestätigen"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
