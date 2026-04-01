"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Theme } from "@/types/theme";
export type { Theme };

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  background: string | null;
  setBackground: (bg: string | null) => void;
  backgroundType: string;
  setBackgroundType: (type: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "dominion-theme";
const BG_STORAGE_KEY = "dominion-background";
const BG_TYPE_STORAGE_KEY = "dominion-background-type";

export function ThemeProvider({
  children,
  defaultTheme = "glass-dark",
  defaultBackground = null,
  defaultBackgroundType = "gradient",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultBackground?: string | null;
  defaultBackgroundType?: string;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [background, setBackgroundState] = useState<string | null>(defaultBackground);
  const [backgroundType, setBackgroundTypeState] = useState<string>(defaultBackgroundType);
  const [mounted, setMounted] = useState(false);

  // On mount, read from localStorage and apply
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (storedTheme) {
      setThemeState(storedTheme);
      document.documentElement.setAttribute("data-theme", storedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", defaultTheme);
    }

    const storedBg = localStorage.getItem(BG_STORAGE_KEY);
    if (storedBg) {
      setBackgroundState(storedBg);
    }

    const storedBgType = localStorage.getItem(BG_TYPE_STORAGE_KEY);
    if (storedBgType) {
      setBackgroundTypeState(storedBgType);
    }

    setMounted(true);
  }, [defaultTheme]);

  // When theme changes, apply immediately
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    // Apply immediately, don't wait for re-render
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);

  // Apply backgroundType classes to body
  useEffect(() => {
    if (!mounted) return;

    if (backgroundType === "gradient") {
      document.body.classList.add("bg-animated-gradient");
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundPosition = "";
      document.body.style.backgroundAttachment = "";
      document.body.style.animation = "";
    } else if (backgroundType === "wallpaper" && background) {
      document.body.classList.remove("bg-animated-gradient");
      const isUrl = background.startsWith("http") || background.startsWith("/") || background.startsWith("blob:");
      document.body.style.backgroundImage = isUrl ? `url(${background})` : background;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundAttachment = "fixed";
      document.body.style.animation = "none";
    } else {
      // aurora, lines, prism - canvas handles the background
      document.body.classList.remove("bg-animated-gradient");
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundPosition = "";
      document.body.style.backgroundAttachment = "";
      document.body.style.animation = "none";
    }

    localStorage.setItem(BG_TYPE_STORAGE_KEY, backgroundType);
  }, [backgroundType, background, mounted]);

  // When wallpaper background value changes (set or removed)
  const setBackground = useCallback((bg: string | null) => {
    setBackgroundState(bg);
    if (bg) {
      // Wallpaper set - switch to wallpaper mode
      setBackgroundTypeState("wallpaper");
      localStorage.setItem(BG_STORAGE_KEY, bg);
      localStorage.setItem(BG_TYPE_STORAGE_KEY, "wallpaper");
    } else {
      // Wallpaper removed - revert to gradient
      setBackgroundTypeState("gradient");
      localStorage.removeItem(BG_STORAGE_KEY);
      localStorage.setItem(BG_TYPE_STORAGE_KEY, "gradient");
    }
  }, []);

  const setBackgroundType = useCallback((type: string) => {
    setBackgroundTypeState(type);
    localStorage.setItem(BG_TYPE_STORAGE_KEY, type);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, background, setBackground, backgroundType, setBackgroundType }}>
      {mounted ? children : <div style={{ visibility: "hidden" }}>{children}</div>}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
