import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sseManager } from "@/lib/notifications/sse-manager";
import { logger } from "@/lib/logger";

const HEARTBEAT_INTERVAL_MS = 30_000;

// ─── GET — SSE stream for real-time notifications ───────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);

  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Create a writable side to register with SSE manager
      const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
      writer = writable.getWriter();

      // Pipe SSE manager writes into the readable stream controller
      const reader = readable.getReader();
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch {
          // Stream closed
        }
      })();

      sseManager.addClient(userId, writer);

      // Send initial connected event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      // Heartbeat to keep connection alive. If enqueue throws (controller
      // closed), stop the timer immediately so it doesn't leak when the
      // runtime never invokes cancel() (some serverless edges drop the
      // connection without firing cancel).
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:heartbeat\n\n`));
        } catch {
          if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
          }
          if (writer) {
            sseManager.removeClient(userId, writer);
            writer = null;
          }
        }
      }, HEARTBEAT_INTERVAL_MS);

      logger.debug("sse", `Stream opened for user ${userId}`);
    },

    cancel() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (writer) {
        sseManager.removeClient(userId, writer);
        try {
          writer.close().catch(() => {});
        } catch {
          // already closed
        }
        writer = null;
      }
      logger.debug("sse", `Stream closed for user ${userId}`);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
