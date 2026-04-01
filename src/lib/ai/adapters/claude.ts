import type { AIAdapter, AIConfig, ChatMessage } from "../types";

const claudeAdapter: AIAdapter = {
  async chat(
    messages: ChatMessage[],
    config: AIConfig
  ): Promise<ReadableStream<Uint8Array>> {
    const endpoint =
      config.endpoint || "https://api.anthropic.com/v1/messages";

    // Separate system message from conversation messages
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const body: Record<string, unknown> = {
      model: config.model,
      messages: conversationMessages,
      max_tokens: 4096,
      stream: true,
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Claude API Fehler (${response.status}): ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error("Keine Antwort vom Claude API erhalten");
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
              if (!trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);

              try {
                const json = JSON.parse(data);
                if (
                  json.type === "content_block_delta" &&
                  json.delta?.text
                ) {
                  controller.enqueue(encoder.encode(json.delta.text));
                }
                if (json.type === "content_block_stop") {
                  // Block ended, continue for possible more blocks
                }
                if (json.type === "message_stop") {
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

export default claudeAdapter;
