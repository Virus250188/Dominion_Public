import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";

// ─── PATCH — Update a notification source ───────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id, 10);
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid source ID" },
        { status: 400 }
      );
    }

    const existing = await prisma.notificationSource.findUnique({
      where: { id },
    });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, icon, color, enabled, rssUrl, rssInterval, rateLimit } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (rssUrl !== undefined) updateData.rssUrl = rssUrl;
    if (rssInterval !== undefined) updateData.rssInterval = rssInterval;
    if (rateLimit !== undefined) updateData.rateLimit = rateLimit;

    const source = await prisma.notificationSource.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ...source, apiKey: decrypt(source.apiKey) });
  } catch (err) {
    logger.error("notifications", "PATCH source failed", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE — Delete a notification source ──────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id, 10);
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid source ID" },
        { status: 400 }
      );
    }

    const existing = await prisma.notificationSource.findUnique({
      where: { id },
    });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    // Prisma cascade (onDelete: Cascade) handles deleting notifications
    await prisma.notificationSource.delete({ where: { id } });

    logger.info("notifications", `Source deleted: ${existing.name}`, {
      sourceId: existing.sourceId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("notifications", "DELETE source failed", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
