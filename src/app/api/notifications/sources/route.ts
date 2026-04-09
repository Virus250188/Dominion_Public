import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { generateApiKey } from "@/lib/notifications/keys";

// ─── GET — List notification sources ────────────────────────────────────────

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id, 10);

    const sources = await prisma.notificationSource.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const decrypted = sources.map((source) => ({
      ...source,
      apiKey: decrypt(source.apiKey),
    }));

    return NextResponse.json(decrypted);
  } catch (err) {
    logger.error("notifications", "GET sources failed", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST — Create a notification source ────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id, 10);

    const body = await request.json();
    const { sourceId, name, type, icon, color, rssUrl, rssInterval, rateLimit } =
      body;

    if (!sourceId || typeof sourceId !== "string") {
      return NextResponse.json(
        { error: "sourceId is required" },
        { status: 400 }
      );
    }
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }
    if (!type || typeof type !== "string") {
      return NextResponse.json(
        { error: "type is required" },
        { status: 400 }
      );
    }

    const plainKey = generateApiKey();
    const encryptedKey = encrypt(plainKey);

    const source = await prisma.notificationSource.create({
      data: {
        userId,
        sourceId,
        name,
        type,
        icon: icon ?? null,
        color: color ?? "#6366f1",
        apiKey: encryptedKey,
        rssUrl: rssUrl ?? null,
        rssInterval: rssInterval ?? null,
        rateLimit: rateLimit ?? 60,
      },
    });

    logger.info("notifications", `Source created: ${name}`, {
      sourceId,
      type,
    });

    return NextResponse.json(
      { ...source, apiKey: plainKey },
      { status: 201 }
    );
  } catch (err) {
    logger.error("notifications", "POST source failed", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
