import { Notification, NotificationTransport } from "./types";

export class SSETransport implements NotificationTransport {
  private eventSource: EventSource | null = null;
  private callback: ((notification: Notification) => void) | null = null;

  subscribe(onMessage: (notification: Notification) => void): void {
    this.callback = onMessage;
    this.eventSource = new EventSource("/api/notifications/stream");

    this.eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "notification" && this.callback) {
          // Convert date strings back to Date objects
          const notification: Notification = {
            ...parsed.data,
            receivedAt: new Date(parsed.data.receivedAt),
            expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
          };
          this.callback(notification);
        }
      } catch {
        // Ignore parse errors (heartbeats, malformed data)
      }
    };

    this.eventSource.onerror = () => {
      // EventSource auto-reconnects, no manual handling needed
    };
  }

  unsubscribe(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.callback = null;
  }
}
