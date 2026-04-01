import type { AIAdapter } from "./types";
import openaiAdapter from "./adapters/openai";
import claudeAdapter from "./adapters/claude";
import geminiAdapter from "./adapters/gemini";
import ollamaAdapter from "./adapters/ollama";

const adapters: Record<string, AIAdapter> = {
  openai: openaiAdapter,
  claude: claudeAdapter,
  gemini: geminiAdapter,
  ollama: ollamaAdapter,
};

export function getAdapter(provider: string): AIAdapter | undefined {
  return adapters[provider];
}
