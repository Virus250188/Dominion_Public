// ─── SSE Broadcast Manager ──────────────────────────────────────────────────
// Singleton that manages Server-Sent Events connections per user.
// API routes use broadcast() to push notifications to all open connections.

import { logger } from "@/lib/logger";

type SSEWriter = WritableStreamDefaultWriter<Uint8Array>;

interface SSEManager {
  addClient(userId: number, writer: SSEWriter): void;
  removeClient(userId: number, writer: SSEWriter): void;
  broadcast(userId: number, notification: unknown): void;
}

function formatSSE(data: unknown): Uint8Array {
  const json = JSON.stringify(data);
  return new TextEncoder().encode(`data: ${json}\n\n`);
}

function createSSEManager(): SSEManager {
  const clients = new Map<number, Set<SSEWriter>>();

  return {
    addClient(userId: number, writer: SSEWriter) {
      let userClients = clients.get(userId);
      if (!userClients) {
        userClients = new Set();
        clients.set(userId, userClients);
      }
      userClients.add(writer);
      logger.debug("sse", `Client connected for user ${userId}`, {
        total: userClients.size,
      });
    },

    removeClient(userId: number, writer: SSEWriter) {
      const userClients = clients.get(userId);
      if (!userClients) return;
      userClients.delete(writer);
      if (userClients.size === 0) {
        clients.delete(userId);
      }
      logger.debug("sse", `Client disconnected for user ${userId}`, {
        remaining: userClients.size,
      });
    },

    broadcast(userId: number, notification: unknown) {
      const userClients = clients.get(userId);
      if (!userClients || userClients.size === 0) return;

      const payload = formatSSE(notification);
      const dead: SSEWriter[] = [];

      for (const writer of userClients) {
        try {
          writer.write(payload).catch(() => {
            dead.push(writer);
          });
        } catch {
          dead.push(writer);
        }
      }

      // Clean up dead connections
      for (const writer of dead) {
        userClients.delete(writer);
        try {
          writer.close().catch(() => {});
        } catch {
          // already closed
        }
      }

      if (userClients.size === 0) {
        clients.delete(userId);
      }
    },
  };
}

// Global singleton (survives HMR in development)
const globalForSSE = globalThis as unknown as { sseManager: SSEManager };
export const sseManager = globalForSSE.sseManager ?? createSSEManager();
if (process.env.NODE_ENV !== "production") globalForSSE.sseManager = sseManager;
