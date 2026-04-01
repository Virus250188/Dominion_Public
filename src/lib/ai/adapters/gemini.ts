import type { AIAdapter, AIConfig, ChatMessage } from "../types";

const geminiAdapter: AIAdapter = {
  async chat(
    messages: ChatMessage[],
    config: AIConfig
  ): Promise<ReadableStream<Uint8Array>> {
    const endpoint =
      config.endpoint ||
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?key=${config.apiKey}&alt=sse`;

    // Convert messages to Gemini format
    // Gemini uses "user" and "model" roles, and doesn't support "system" as a role in contents
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = {
      contents: conversationMessages,
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini API Fehler (${response.status}): ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error("Keine Antwort vom Gemini API erhalten");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              // Gemini SSE format with alt=sse: data: {...}
              if (!trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);

              try {
                const json = JSON.parse(data);
                const text =
                  json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });
  },
};

export default geminiAdapter;
