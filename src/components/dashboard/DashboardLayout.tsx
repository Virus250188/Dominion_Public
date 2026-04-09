"use client";

import { useCallback, useState } from "react";
import { ResizableContainer } from "./ResizableContainer";
import { updateUserSettings } from "@/lib/actions/settings";
import { useNotificationPanel } from "@/contexts/NotificationPanelContext";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";

interface DashboardLayoutProps {
  children: React.ReactNode;
  initialWidthPercent: number;
}

export function DashboardLayout({
  children,
  initialWidthPercent,
}: DashboardLayoutProps) {
  const [widthPercent, setWidthPercent] = useState(initialWidthPercent);
  const { collapsed } = useNotificationPanel();

  // Left margin for non-collapsed mode (not persisted — resets to 0 on refresh, intentional)
  const [marginLeftPercent, setMarginLeftPercent] = useState(0);

  const handleWidthChange = useCallback((percent: number) => {
    setWidthPercent(percent);
  }, []);

  // Always persist width on resize end regardless of panel state
  const handleResizeEnd = useCallback((percent: number) => {
    updateUserSettings(undefined, { dashboardWidthPercent: percent });
  }, []);

  const handleMarginLeftChange = useCallback((percent: number) => {
    setMarginLeftPercent(percent);
  }, []);

  // widthPercent is the single source of truth for dashboard width (persisted)
  // collapsed is persisted in localStorage via NotificationPanelContext
  const panelCollapsed = collapsed;
  const effectiveOnResizeEnd = handleResizeEnd; // always persist

  return (
    <main className="flex w-full flex-1 gap-6 px-6 py-8">
      <ResizableContainer
        widthPercent={widthPercent}
        onWidthChange={handleWidthChange}
        onResizeEnd={effectiveOnResizeEnd}
        className="flex flex-col gap-6 min-w-0"
        showLeftHandle={true}
        showRightHandle={true}
        symmetricMode={panelCollapsed}
        marginLeftPercent={panelCollapsed ? 0 : marginLeftPercent}
        onMarginLeftChange={panelCollapsed ? undefined : handleMarginLeftChange}
        minPercent={40}
        maxPercent={panelCollapsed ? 100 : 95}
      >
        {children}
      </ResizableContainer>

      {/* Notification Panel — collapsible on xl+, hidden below xl */}
      {!collapsed && <NotificationPanel />}
    </main>
  );
}
