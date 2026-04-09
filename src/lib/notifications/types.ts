// ─── Notification Category ──────────────────────────────────────────────────

export type NotificationCategory = "info" | "warning" | "critical" | "update";

// ─── Notification Payload ───────────────────────────────────────────────────

// What external apps/services send via POST
export interface NotificationPayload {
  source: string;        // Registered source ID (e.g. "home-assistant")
  title: string;         // Short title
  message?: string;      // Free text, max 2000 chars
  category: NotificationCategory;
  tag?: string;          // Free choice: "Updates", "Monitoring", "RSS"
  priority?: number;     // 0=low, 1=normal, 2=high, 3=critical
  url?: string;          // Link to open on click
  icon?: string;         // SimpleIcons name or Base64 (override source icon)
  expiresAt?: string;    // ISO date, auto-expire
}

// ─── Notification ───────────────────────────────────────────────────────────

// What the dashboard stores (DB record, standalone — not extending payload)
export interface Notification {
  id: number;
  userId: number;
  sourceId: number;
  title: string;
  message?: string;
  category: NotificationCategory;
  tag?: string;
  priority: number;
  url?: string;
  icon?: string;
  acknowledged: boolean;
  receivedAt: Date;
  expiresAt?: Date;
}

// ─── Notification Transport ─────────────────────────────────────────────────

// Transport abstraction for SSE/WebSocket swap
export interface NotificationTransport {
  subscribe(onMessage: (notification: Notification) => void): void;
  unsubscribe(): void;
}
