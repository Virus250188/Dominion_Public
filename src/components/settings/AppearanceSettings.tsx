"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { themes } from "@/types/theme";
import type { Theme } from "@/types/theme";
import { updateUserSettings } from "@/lib/actions/settings";
import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Upload, X } from "lucide-react";

interface AppearanceSettingsProps {
  currentTheme: string;
  gridColumns: number;
  showSearch: boolean;
  showClock: boolean;
  showGreeting: boolean;
  backgroundType?: string;
}

const backgroundOptions = [
  {
    id: "gradient",
    name: "Gradient",
    preview: "linear-gradient(135deg, #3b0764, #1e1b4b, #0f172a, #312e81)",
  },
  {
    id: "aurora",
    name: "Soft Aurora",
    preview: "linear-gradient(135deg, #581c87, #0f766e, #064e3b, #1e3a8a)",
  },
  {
    id: "lines",
    name: "Floating Lines",
    preview: "linear-gradient(135deg, #0a0a12, #1e1b4b, #0a0a12, #312e81)",
  },
  {
    id: "prism",
    name: "Prism",
    preview: "linear-gradient(135deg, #dc2626, #f59e0b, #22c55e, #3b82f6, #a855f7)",
  },
];

export function AppearanceSettings({
  currentTheme: _currentTheme,
  gridColumns: initialColumns,
  showSearch: _showSearch,
  showClock: _showClock,
  showGreeting: _showGreeting,
  backgroundType: _backgroundType,
}: AppearanceSettingsProps) {
  const { theme, setTheme, background, setBackground, backgroundType, setBackgroundType } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [gridColumns, setGridColumns] = useState(initialColumns);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    startTransition(async () => {
      await updateUserSettings(1, { theme: newTheme });
    });
  };

  const handleBackgroundTypeChange = (type: string) => {
    setBackgroundType(type);
    startTransition(async () => {
      await updateUserSettings(1, { backgroundType: type });
    });
  };

  return (
    <div className="space-y-8">
      {/* Theme Picker */}
      <section>
        <Label className="text-base font-semibold mb-4 block">Theme</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={cn(
                "relative rounded-xl p-4 text-left transition-all border-2",
                theme === t.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40"
              )}
              style={{ backgroundColor: t.previewColors.bg }}
            >
              {theme === t.id && (
                <div className="absolute right-2 top-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              {/* Mini preview */}
              <div className="flex gap-2 mb-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-lg"
                    style={{
                      backgroundColor: t.previewColors.card,
                      border: `1px solid ${t.previewColors.accent}40`,
                    }}
                  />
                ))}
              </div>
              <div className="text-sm font-medium" style={{ color: t.previewColors.text }}>
                {t.name}
              </div>
              <div className="text-xs mt-0.5" style={{ color: `${t.previewColors.text}99` }}>
                {t.description}
              </div>
              {t.isGlass && (
                <div
                  className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${t.previewColors.accent}30`,
                    color: t.previewColors.accent,
                  }}
                >
                  Glass
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Wallpaper */}
      <section>
        <Label className="text-base font-semibold mb-4 block">Hintergrundbild</Label>
        <div className="glass-card p-4 space-y-4">
          {/* Current background preview */}
          {background && (
            <div className="relative h-32 rounded-lg overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${background})` }}
              />
              <button
                onClick={() => {
                  setBackground(null);
                  startTransition(async () => {
                    await updateUserSettings(1, { background: null, backgroundType: "gradient" });
                  });
                }}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          )}

          {/* Upload button */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/jpeg,image/png,image/webp";
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append("file", file);
                  try {
                    const res = await fetch("/api/upload", {
                      method: "POST",
                      body: formData,
                    });
                    const data = await res.json();
                    if (data.url) {
                      setBackground(data.url);
                      startTransition(async () => {
                        await updateUserSettings(1, { background: data.url, backgroundType: "wallpaper" });
                      });
                    }
                  } catch (err) {
                    console.error("Upload failed:", err);
                  }
                };
                input.click();
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Bild hochladen
            </Button>

            {!background && (
              <span className="text-xs text-muted-foreground self-center">
                JPG, PNG oder WebP (max. 10MB)
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Animated Background */}
      <section>
        <Label className="text-base font-semibold mb-4 block">Animierter Hintergrund</Label>
        {background ? (
          <p className="text-sm text-muted-foreground">
            Deaktiviert wenn Hintergrundbild gesetzt
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {backgroundOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleBackgroundTypeChange(opt.id)}
                className={cn(
                  "relative rounded-xl p-3 text-left transition-all border-2",
                  backgroundType === opt.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                )}
              >
                {backgroundType === opt.id && (
                  <div className="absolute right-2 top-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center z-10">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                <div
                  className="h-[50px] w-full rounded-lg mb-2"
                  style={{ background: opt.preview }}
                />
                <div className="text-xs font-medium text-foreground">
                  {opt.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Grid Settings - simplified for now */}
      <section>
        <Label className="text-base font-semibold mb-4 block">Layout</Label>
        <div className="glass-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Grid Spalten (Desktop)</span>
            <div className="flex items-center gap-2">
              {[4, 5, 6].map((cols) => (
                <button
                  key={cols}
                  onClick={() => {
                    setGridColumns(cols);
                    startTransition(async () => {
                      await updateUserSettings(1, { gridColumns: cols });
                    });
                  }}
                  className={cn(
                    "h-8 w-8 rounded-lg text-sm font-medium transition-colors",
                    gridColumns === cols
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground hover:bg-accent/80"
                  )}
                >
                  {cols}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
