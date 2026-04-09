"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { type Notification } from "@/lib/notifications/types";
import { NotificationService } from "@/lib/notifications/service";

interface NotificationPanelContextValue {
  collapsed: boolean;
  toggle: () => void;
  notifications: Notification[];
  notificationCount: number;
  acknowledge: (id: number) => Promise<void>;
}

const NotificationPanelContext = createContext<NotificationPanelContextValue>({
  collapsed: false,
  toggle: () => {},
  notifications: [],
  notificationCount: 0,
  acknowledge: async () => {},
});

function isExpired(notification: Notification): boolean {
  if (!notification.expiresAt) return false;
  return notification.expiresAt < new Date();
}

export function NotificationPanelProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("dominion-panel-collapsed") === "true";
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const serviceRef = useRef<NotificationService | null>(null);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("dominion-panel-collapsed", String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    let service: NotificationService | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    try {
      service = new NotificationService();
      serviceRef.current = service;

      // Fetch existing unacknowledged notifications
      service.fetchNotifications().then((fetched) => {
        setNotifications(fetched.filter((n) => !isExpired(n)));
      }).catch(() => {});

      // Subscribe to real-time SSE notifications
      service.connect((notification) => {
        if (!isExpired(notification)) {
          setNotifications((prev) => {
            // Avoid duplicates by id
            const exists = prev.some((n) => n.id === notification.id);
            return exists ? prev : [notification, ...prev];
          });
        }
      });

      // Auto-poll RSS feeds every 5 minutes while the dashboard is open
      fetch("/api/notifications/rss-poll").catch(() => {});
      pollInterval = setInterval(() => {
        fetch("/api/notifications/rss-poll").catch(() => {});
      }, 5 * 60 * 1000);
    } catch (err) {
      console.error("[NotificationPanel] Init failed:", err);
    }

    return () => {
      try { service?.disconnect(); } catch {}
      serviceRef.current = null;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  const acknowledge = useCallback(async (id: number) => {
    const service = serviceRef.current;
    if (!service) return;
    const ok = await service.acknowledge(id);
    if (ok) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }, []);

  const notificationCount = notifications.length;

  return (
    <NotificationPanelContext.Provider
      value={{ collapsed, toggle, notifications, notificationCount, acknowledge }}
    >
      {children}
    </NotificationPanelContext.Provider>
  );
}

export function useNotificationPanel() {
  return useContext(NotificationPanelContext);
}
