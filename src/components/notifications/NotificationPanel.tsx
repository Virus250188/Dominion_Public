"use client";

import { ChevronRight, BellOff } from "lucide-react";
import { useNotificationPanel } from "@/contexts/NotificationPanelContext";
import { NotificationCard } from "./NotificationCard";

export function NotificationPanel() {
  const { toggle, notifications, notificationCount, acknowledge } =
    useNotificationPanel();

  return (
    <aside className="hidden xl:flex flex-1 flex-shrink-0 flex-col">
      <div className="glass-card flex-1 rounded-xl p-4 flex flex-col relative">
        {/* Glass decorative layers */}
        <div className="glass-chromatic" />
        <div className="glass-shine" />
        <div className="glass-edge-glow" />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Benachrichtigungen
            </h2>
            {notificationCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium leading-none text-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </div>
          <button
            onClick={toggle}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-accent"
            title="Benachrichtigungen einklappen"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable notification list */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2 scrollbar-thin">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onAcknowledge={acknowledge}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <BellOff className="h-8 w-8 opacity-40" />
              <p className="text-xs">Keine neuen Benachrichtigungen</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
