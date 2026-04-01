import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdapter } from "@/lib/ai/providers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey, model, endpoint } = body as {
      provider: string;
      apiKey?: string;
      model: string;
      endpoint?: string;
    };

    if (!provider || !model) {
      return NextResponse.json(
        { success: false, error: "Anbieter und Modell sind erforderlich" },
        { status: 400 }
      );
    }

    if (provider !== "ollama" && !apiKey) {
      return NextResponse.json(
        { success: false, error: "API-Schluessel ist erforderlich" },
        { status: 400 }
      );
    }

    const adapter = getAdapter(provider);
    if (!adapter) {
      return NextResponse.json(
        { success: false, error: `Unbekannter Anbieter: ${provider}` },
        { status: 400 }
      );
    }

    // Set up timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const stream = await adapter.chat(
        [{ role: "user", content: "Say hello in one sentence." }],
        {
          provider,
          apiKey: apiKey || "",
          model,
          endpoint: endpoint || undefined,
        }
      );

      // Read a bit of the stream to confirm it works
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let result = "";
      let chunks = 0;

      while (chunks < 20) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        chunks++;
      }

      reader.cancel();
      clearTimeout(timeout);

      if (result.length > 0) {
        return NextResponse.json({
          success: true,
          message: "Verbindung erfolgreich",
        });
      } else {
        return NextResponse.json({
          success: false,
          error: "Keine Antwort vom Modell erhalten",
        });
      }
    } catch (innerErr) {
      clearTimeout(timeout);
      throw innerErr;
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: (err as Error).message || "Verbindungstest fehlgeschlagen",
    });
  }
}
