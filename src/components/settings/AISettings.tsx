"use client";

import { useState, useTransition } from "react";
import { updateUserSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";

interface AISettingsProps {
  currentProvider: string;
  currentApiKey: string;
  currentModel: string;
  currentEndpoint: string;
}

const providerOptions = [
  { value: "", label: "Kein KI Anbieter" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "claude", label: "Anthropic (Claude)" },
  { value: "gemini", label: "Google (Gemini)" },
  { value: "ollama", label: "Ollama (Lokal)" },
];

const modelOptions: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  claude: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
};

export function AISettings({
  currentProvider,
  currentApiKey,
  currentModel,
  currentEndpoint,
}: AISettingsProps) {
  const [provider, setProvider] = useState(currentProvider);
  const [apiKey, setApiKey] = useState(currentApiKey);
  const [model, setModel] = useState(currentModel);
  const [endpoint, setEndpoint] = useState(
    currentEndpoint || "http://localhost:11434"
  );
  const [isPending, startTransition] = useTransition();
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saved, setSaved] = useState(false);

  const handleProviderChange = (value: string | null) => {
    const newProvider = value || "";
    setProvider(newProvider);
    setTestStatus("idle");
    setSaved(false);
    // Reset model when provider changes
    if (newProvider && modelOptions[newProvider]) {
      setModel(modelOptions[newProvider][0].value);
    } else if (newProvider === "ollama") {
      setModel("llama3");
    } else {
      setModel("");
    }
    // Reset api key if switching provider
    if (newProvider !== provider) {
      setApiKey("");
    }
  };

  const handleTest = async () => {
    setTestStatus("testing");
    setTestMessage("");
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: provider === "ollama" ? undefined : apiKey,
          model,
          endpoint: provider === "ollama" ? endpoint : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus("success");
        setTestMessage(data.message);
      } else {
        setTestStatus("error");
        setTestMessage(data.error || "Verbindungstest fehlgeschlagen");
      }
    } catch (err) {
      setTestStatus("error");
      setTestMessage((err as Error).message || "Verbindungstest fehlgeschlagen");
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      await updateUserSettings(1, {
        aiProvider: provider || null,
        aiApiKey: provider === "ollama" ? null : apiKey || null,
        aiModel: model || null,
        aiEndpoint: provider === "ollama" ? endpoint || null : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const canTest =
    provider &&
    model &&
    (provider === "ollama" || apiKey);

  const canSave = provider && model && (provider === "ollama" || apiKey);

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <section className="glass-card p-5 space-y-4">
        <Label className="text-base font-semibold block">KI Anbieter</Label>
        <Select value={provider} onValueChange={handleProviderChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Anbieter waehlen..." />
          </SelectTrigger>
          <SelectContent>
            {providerOptions.map((opt) => (
              <SelectItem key={opt.value || "none"} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {/* Provider-specific config */}
      {provider && provider !== "" && (
        <section className="glass-card p-5 space-y-4">
          <Label className="text-base font-semibold block">Konfiguration</Label>

          {/* API Key (not for Ollama) */}
          {provider !== "ollama" && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Schluessel</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestStatus("idle");
                  setSaved(false);
                }}
                placeholder="sk-..."
                className="w-full"
              />
            </div>
          )}

          {/* Endpoint (Ollama only) */}
          {provider === "ollama" && (
            <div className="space-y-2">
              <Label htmlFor="endpoint">Server URL</Label>
              <Input
                id="endpoint"
                type="text"
                value={endpoint}
                onChange={(e) => {
                  setEndpoint(e.target.value);
                  setTestStatus("idle");
                  setSaved(false);
                }}
                placeholder="http://localhost:11434"
                className="w-full"
              />
            </div>
          )}

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">Modell</Label>
            {provider === "ollama" ? (
              <Input
                id="model"
                type="text"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setTestStatus("idle");
                  setSaved(false);
                }}
                placeholder="z.B. llama3, mistral, codellama"
                className="w-full"
              />
            ) : (
              <Select
                value={model}
                onValueChange={(v) => {
                  setModel(v || "");
                  setTestStatus("idle");
                  setSaved(false);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Modell waehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {(modelOptions[provider] || []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </section>
      )}

      {/* Test & Save */}
      {provider && provider !== "" && (
        <section className="glass-card p-5 space-y-4">
          {/* Test Connection */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!canTest || testStatus === "testing"}
            >
              {testStatus === "testing" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Verbindung testen
            </Button>

            {testStatus === "success" && (
              <span className="flex items-center gap-1.5 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                {testMessage}
              </span>
            )}
            {testStatus === "error" && (
              <span className="flex items-center gap-1.5 text-sm text-red-400">
                <XCircle className="h-4 w-4" />
                {testMessage}
              </span>
            )}
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={!canSave || isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Speichern
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                Einstellungen gespeichert
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
