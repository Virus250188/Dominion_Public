"use client";

import { useCallback, useState } from "react";
import { ResizableContainer } from "./ResizableContainer";
import { updateUserSettings } from "@/lib/actions/settings";

interface DashboardLayoutProps {
  children: React.ReactNode;
  initialWidthPercent: number;
}

export function DashboardLayout({
  children,
  initialWidthPercent,
}: DashboardLayoutProps) {
  const [widthPercent, setWidthPercent] = useState(initialWidthPercent);

  const handleWidthChange = useCallback((percent: number) => {
    setWidthPercent(percent);
  }, []);

  const handleResizeEnd = useCallback((percent: number) => {
    updateUserSettings(undefined, { dashboardWidthPercent: percent });
  }, []);

  return (
    <main className="flex w-full flex-1 gap-6 px-6 py-8">
      <ResizableContainer
        widthPercent={widthPercent}
        onWidthChange={handleWidthChange}
        onResizeEnd={handleResizeEnd}
        className="flex flex-col gap-6 min-w-0"
      >
        {children}
      </ResizableContainer>

      {/* Notification Panel — visible on xl+, collapsed to header bell below xl */}
      <aside className="hidden xl:flex flex-1 flex-shrink-0 flex-col">
        <div className="glass-card flex-1 rounded-xl p-4 opacity-30 border border-dashed border-border/50">
          <p className="text-xs text-muted-foreground text-center mt-8">
            Notifications (coming soon)
          </p>
        </div>
      </aside>
    </main>
  );
}
