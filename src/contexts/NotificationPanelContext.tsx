"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface NotificationPanelContextValue {
  collapsed: boolean;
  toggle: () => void;
  notificationCount: number;
}

const NotificationPanelContext = createContext<NotificationPanelContextValue>({
  collapsed: false,
  toggle: () => {},
  notificationCount: 0,
});

export function NotificationPanelProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("dominion-panel-collapsed") === "true";
  });

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("dominion-panel-collapsed", String(next));
      return next;
    });
  }, []);

  return (
    <NotificationPanelContext.Provider value={{ collapsed, toggle, notificationCount: 0 }}>
      {children}
    </NotificationPanelContext.Provider>
  );
}

export function useNotificationPanel() {
  return useContext(NotificationPanelContext);
}
