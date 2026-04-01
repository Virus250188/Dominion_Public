export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
  endpoint?: string;
}

export interface AIAdapter {
  chat(
    messages: ChatMessage[],
    config: AIConfig
  ): Promise<ReadableStream<Uint8Array>>;
}
