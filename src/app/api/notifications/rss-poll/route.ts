// ─── RSS Poll Endpoint ───────────────────────────────────────────────────────
// Triggers RSS feed polling for all due sources belonging to the logged-in user.
// Called by the NotificationPanelContext every 5 minutes, or by an external cron.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pollRSSFeeds } from "@/lib/notifications/rss-poller";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await pollRSSFeeds();
    return NextResponse.json(results);
  } catch (err) {
    logger.error("rss-poll", "Polling failed", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
