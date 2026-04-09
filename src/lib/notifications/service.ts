import { Notification, NotificationTransport } from "./types";
import { SSETransport } from "./sse-transport";

export class NotificationService {
  private transport: NotificationTransport;

  constructor(transport?: NotificationTransport) {
    this.transport = transport ?? new SSETransport();
  }

  connect(onNotification: (notification: Notification) => void): void {
    this.transport.subscribe(onNotification);
  }

  disconnect(): void {
    this.transport.unsubscribe();
  }

  async fetchNotifications(): Promise<Notification[]> {
    const res = await fetch("/api/notifications");
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((n: Record<string, unknown>) => ({
      ...n,
      receivedAt: new Date(n.receivedAt as string),
      expiresAt: n.expiresAt ? new Date(n.expiresAt as string) : undefined,
    }));
  }

  async acknowledge(id: number): Promise<boolean> {
    const res = await fetch(`/api/notifications/${id}/ack`, { method: "POST" });
    return res.ok;
  }
}
