import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPlugin } from "@/plugins/registry";
import { createRateLimiter } from "@/lib/rate-limit";
import type { PluginConfig } from "@/plugins/types";

// Rate limit: 5 requests per minute per user
const rateLimiter = createRateLimiter("enhanced-crawl", 5, 60_000);

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limit check
    const rateCheck = rateLimiter.check(session.user.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Try again in ${Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000)} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { enhancedType, config } = body as {
      enhancedType: string;
      config: PluginConfig;
    };

    if (!enhancedType || typeof enhancedType !== "string") {
      return NextResponse.json(
        { success: false, error: "enhancedType is required" },
        { status: 400 }
      );
    }

    const plugin = getPlugin(enhancedType);
    if (!plugin) {
      return NextResponse.json(
        { success: false, error: "Unbekannter App-Typ" },
        { status: 404 }
      );
    }

    // If plugin has a crawl method, use it
    if (plugin.crawlEntities) {
      try {
        const result = await plugin.crawlEntities(config);
        return NextResponse.json({ success: true, ...result });
      } catch (err) {
        return NextResponse.json(
          { success: false, error: (err as Error).message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Plugin unterstuetzt kein Entity-Crawling" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
