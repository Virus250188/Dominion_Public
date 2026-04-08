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
  textPrimary?: string | null;
  textSecondary?: string | null;
  glassAccent?: string | null;
}

const backgroundOptions = [
  {
    id: "plasma",
    name: "Plasma Flow",
    preview: "linear-gradient(135deg, #3b0764, #6d28d9, #1e1b4b, #4338ca)",
  },
  {
    id: "mesh",
    name: "Mesh Gradient",
    preview: "linear-gradient(135deg, #6366f1, #ec4899, #22d3ee, #fbbf24)",
  },
  {
    id: "aurora",
    name: "Aurora Waves",
    preview: "linear-gradient(135deg, #0f766e, #7c3aed, #22d3ee, #a855f7)",
  },
  {
    id: "nebula",
    name: "Particle Nebula",
    preview: "linear-gradient(135deg, #0a0a18, #6366f1, #ec4899, #0a0a18)",
  },
];

export function AppearanceSettings({
  currentTheme: _currentTheme,
  gridColumns: initialColumns,
  showSearch: _showSearch,
  showClock: _showClock,
  showGreeting: _showGreeting,
  backgroundType: _backgroundType,
  textPrimary: _textPrimary,
  textSecondary: _textSecondary,
  glassAccent: _glassAccent,
}: AppearanceSettingsProps) {
  const {
    theme, setTheme,
    background, setBackground,
    backgroundType, setBackgroundType,
    textPrimary: ctxTextPrimary, setTextPrimary,
    textSecondary: ctxTextSecondary, setTextSecondary,
    glassAccent: ctxGlassAccent, setGlassAccent,
  } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [gridColumns, setGridColumns] = useState(initialColumns);
  const [localTextPrimary, setLocalTextPrimary] = useState(ctxTextPrimary || "");
  const [localTextSecondary, setLocalTextSecondary] = useState(ctxTextSecondary || "");
  const [localGlassAccent, setLocalGlassAccent] = useState(ctxGlassAccent || "");

  // Theme and background changes are persisted to DB by ThemeProvider itself,
  // so we only need to call the context setters here.
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleBackgroundTypeChange = (type: string) => {
    setBackgroundType(type);
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

      {/* Anpassen — Color Customization */}
      <section>
        <Label className="text-base font-semibold mb-4 block">Anpassen</Label>
        <div className="glass-card p-5 space-y-5">
          <div className="flex gap-6 items-start">
            {/* Live Preview Tile */}
            <div
              className="glass-card relative flex flex-col items-center justify-center gap-1.5 p-3 pt-6 w-[120px] h-[120px] flex-shrink-0"
              style={{
                ...(localTextPrimary ? { "--text-primary-custom": localTextPrimary } as React.CSSProperties : {}),
                ...(localTextSecondary ? { "--text-secondary-custom": localTextSecondary } as React.CSSProperties : {}),
                ...(localGlassAccent ? { "--glass-accent": localGlassAccent } as React.CSSProperties : {}),
              }}
            >
              <div className="glass-chromatic rounded-[inherit]" />
              <div className="glass-shine" />
              <div className="glass-edge-glow" />
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg relative z-[4]"
                style={{ backgroundColor: "#6366f1" }}
              >
                ⚡
              </div>
              <span
                className="text-xs font-semibold text-center leading-tight relative z-[4]"
                style={{ color: "var(--text-primary-custom, var(--foreground))" }}
              >
                Emby
              </span>
              <span
                className="text-[10px] text-center relative z-[4]"
                style={{ color: "var(--text-secondary-custom, var(--muted-foreground))" }}
              >
                Media Server
              </span>
            </div>

            {/* Color Pickers */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={localTextPrimary || "#f0f0f0"}
                  onChange={(e) => {
                    setLocalTextPrimary(e.target.value);
                    setTextPrimary(e.target.value);
                  }}
                  className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <div>
                  <div className="text-sm font-medium text-foreground">Primary Text</div>
                  <div className="text-xs text-muted-foreground">Tile-Titel, Gruppen-Titel</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={localTextSecondary || "#999999"}
                  onChange={(e) => {
                    setLocalTextSecondary(e.target.value);
                    setTextSecondary(e.target.value);
                  }}
                  className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <div>
                  <div className="text-sm font-medium text-foreground">Secondary Text</div>
                  <div className="text-xs text-muted-foreground">Beschreibungen, Stats-Labels</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={localGlassAccent || "#6366f1"}
                  onChange={(e) => {
                    setLocalGlassAccent(e.target.value);
                    setGlassAccent(e.target.value);
                  }}
                  className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <div>
                  <div className="text-sm font-medium text-foreground">Glass Akzent</div>
                  <div className="text-xs text-muted-foreground">Chromatische Kanten, Glow-Effekte</div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocalTextPrimary("");
                  setLocalTextSecondary("");
                  setLocalGlassAccent("");
                  setTextPrimary(null);
                  setTextSecondary(null);
                  setGlassAccent(null);
                }}
              >
                Zuruecksetzen
              </Button>
            </div>
          </div>
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
          <div className="space-y-2">
            <Label>Dashboard-Layout</Label>
            <p className="text-sm text-muted-foreground">
              Das Grid passt sich automatisch an die verfuegbare Breite an.
              Im Bearbeitungsmodus kannst du die Dashboard-Breite per Drag anpassen.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
