import type { AIAdapter, AIConfig, ChatMessage } from "../types";

const ollamaAdapter: AIAdapter = {
  async chat(
    messages: ChatMessage[],
    config: AIConfig
  ): Promise<ReadableStream<Uint8Array>> {
    const endpoint = config.endpoint || "http://localhost:11434";
    const url = `${endpoint.replace(/\/$/, "")}/api/chat`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API Fehler (${response.status}): ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error("Keine Antwort von Ollama erhalten");
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
              if (!trimmed) continue;

              try {
                const json = JSON.parse(trimmed);
                const content = json.message?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
                if (json.done) {
                  break;
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

export default ollamaAdapter;
