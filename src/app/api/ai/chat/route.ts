import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdapter } from "@/lib/ai/providers";
import { getUserSettings } from "@/lib/queries/settings";
import { decrypt } from "@/lib/crypto";
import type { ChatMessage } from "@/lib/ai/types";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messages } = body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Keine Nachrichten gesendet" },
        { status: 400 }
      );
    }

    // Load AI config from database
    const userId = parseInt(session.user.id ?? "0", 10);
    const settings = await getUserSettings(userId);

    if (!settings?.aiProvider) {
      return NextResponse.json(
        { error: "Kein KI-Anbieter konfiguriert" },
        { status: 400 }
      );
    }

    if (!settings.aiModel) {
      return NextResponse.json(
        { error: "Kein KI-Modell konfiguriert" },
        { status: 400 }
      );
    }

    // Ollama doesn't need an API key
    if (settings.aiProvider !== "ollama" && !settings.aiApiKey) {
      return NextResponse.json(
        { error: "Kein API-Schluessel konfiguriert" },
        { status: 400 }
      );
    }

    const adapter = getAdapter(settings.aiProvider);
    if (!adapter) {
      return NextResponse.json(
        { error: `Unbekannter Anbieter: ${settings.aiProvider}` },
        { status: 400 }
      );
    }

    const stream = await adapter.chat(messages, {
      provider: settings.aiProvider,
      apiKey: settings.aiApiKey ? decrypt(settings.aiApiKey) : "",
      model: settings.aiModel,
      endpoint: settings.aiEndpoint || undefined,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = (err as Error).message || "Unknown error";
    logger.error("ai-chat", "Chat request failed", { provider: "unknown", error: message });
    // Fix 6: Don't leak raw error details to client
    return NextResponse.json(
      { error: "KI-Anfrage fehlgeschlagen. Bitte Konfiguration pruefen." },
      { status: 500 }
    );
  }
}
