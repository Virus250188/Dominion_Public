import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    // ── Auth check ─────────────────────────────────────────────────────────

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    logger.info("system", "Server restart requested", {
      userId: session.user.id,
      env: process.env.NODE_ENV ?? "unknown",
    });

    // ── In development: dev server auto-reloads on file changes ──────────

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        success: true,
        message: "Entwicklungsserver wird automatisch neu geladen.",
      });
    }

    // ── In production (Docker): exit process, restart policy will restart ─

    // Schedule the exit after the response has been sent
    setTimeout(() => {
      logger.info("system", "Shutting down for restart...");
      process.exit(0);
    }, 1000);

    return NextResponse.json({
      success: true,
      message: "Server wird neu gestartet...",
    });
  } catch (err) {
    logger.error("system", "Failed to process restart request", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Interner Serverfehler." },
      { status: 500 },
    );
  }
}
