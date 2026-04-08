"use client";

import { useCallback, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ResizableContainer } from "./ResizableContainer";
import { updateUserSettings } from "@/lib/actions/settings";
import { useNotificationPanel } from "@/contexts/NotificationPanelContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
  initialWidthPercent: number;
}

export function DashboardLayout({
  children,
  initialWidthPercent,
}: DashboardLayoutProps) {
  const [widthPercent, setWidthPercent] = useState(initialWidthPercent);
  const { collapsed, toggle } = useNotificationPanel();

  // When panel is collapsed, use a separate width state (defaults to 100%)
  const [collapsedWidthPercent, setCollapsedWidthPercent] = useState(100);

  // Left margin for non-collapsed mode (not persisted, resets to 0)
  const [marginLeftPercent, setMarginLeftPercent] = useState(0);

  const handleWidthChange = useCallback((percent: number) => {
    setWidthPercent(percent);
  }, []);

  const handleResizeEnd = useCallback((percent: number) => {
    updateUserSettings(undefined, { dashboardWidthPercent: percent });
  }, []);

  const handleCollapsedWidthChange = useCallback((percent: number) => {
    setCollapsedWidthPercent(percent);
  }, []);

  const handleMarginLeftChange = useCallback((percent: number) => {
    setMarginLeftPercent(percent);
  }, []);

  // Determine effective props based on panel state
  const panelCollapsed = collapsed;
  const effectiveWidth = panelCollapsed ? collapsedWidthPercent : widthPercent;
  const effectiveOnWidthChange = panelCollapsed ? handleCollapsedWidthChange : handleWidthChange;
  const effectiveOnResizeEnd = panelCollapsed ? undefined : handleResizeEnd;

  return (
    <main className="flex w-full flex-1 gap-6 px-6 py-8">
      <ResizableContainer
        widthPercent={effectiveWidth}
        onWidthChange={effectiveOnWidthChange}
        onResizeEnd={effectiveOnResizeEnd}
        className="flex flex-col gap-6 min-w-0"
        showLeftHandle={true}
        showRightHandle={true}
        symmetricMode={panelCollapsed}
        marginLeftPercent={panelCollapsed ? 0 : marginLeftPercent}
        onMarginLeftChange={panelCollapsed ? undefined : handleMarginLeftChange}
        minPercent={panelCollapsed ? 40 : 40}
        maxPercent={panelCollapsed ? 100 : 95}
      >
        {children}
      </ResizableContainer>

      {/* Notification Panel — collapsible on xl+, hidden below xl */}
      {!collapsed && (
        <aside className="hidden xl:flex flex-1 flex-shrink-0 flex-col">
          <div className="glass-card flex-1 rounded-xl p-4 opacity-30 border border-dashed border-border/50 relative">
            {/* Collapse button */}
            <button
              onClick={toggle}
              className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-accent"
              title="Benachrichtigungen einklappen"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <p className="text-xs text-muted-foreground text-center mt-8">
              Notifications (coming soon)
            </p>
          </div>
        </aside>
      )}
    </main>
  );
}
