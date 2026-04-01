import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPlugin } from "@/plugins/registry";
import { createRateLimiter } from "@/lib/rate-limit";
import type { PluginConfig } from "@/plugins/types";

// Rate limit: 10 requests per minute per user
const rateLimiter = createRateLimiter("enhanced-test", 10, 60_000);

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
    const { enhancedType, config } = body as { enhancedType: string; config: PluginConfig };

    if (!enhancedType || typeof enhancedType !== "string") {
      return NextResponse.json(
        { success: false, error: "enhancedType is required" },
        { status: 400 }
      );
    }

    const plugin = getPlugin(enhancedType);
    if (!plugin) {
      return NextResponse.json({ success: false, error: "Unbekannter App-Typ" });
    }

    // Validate that required config fields are present
    const missingFields = plugin.configFields
      .filter((f) => f.required)
      .filter((f) => !config || !config[f.key])
      .map((f) => f.label);

    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const result = await plugin.testConnection(config);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
      });
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: (err as Error).message,
    });
  }
}
