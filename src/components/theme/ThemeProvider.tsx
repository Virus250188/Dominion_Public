"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { Theme } from "@/types/theme";
import { updateUserSettings } from "@/lib/actions/settings";
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

/**
 * Persist appearance settings to DB (fire-and-forget).
 * Errors are silently caught - DB persistence is best-effort,
 * localStorage is the immediate store for UI responsiveness.
 */
function persistToDb(data: { theme?: string; background?: string | null; backgroundType?: string }) {
  updateUserSettings(undefined, data).catch(() => {
    // Silently ignore - user may not be authenticated (login page)
  });
}

export function ThemeProvider({
  children,
  defaultTheme = "glass-dark",
  defaultBackground = null,
  defaultBackgroundType = "gradient",
  dbSettingsLoaded = false,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultBackground?: string | null;
  defaultBackgroundType?: string;
  /** True when settings were loaded from DB (authenticated user). DB values take priority over localStorage. */
  dbSettingsLoaded?: boolean;
}) {
  // DB values come as props (server-rendered). Use them as initial state.
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [background, setBackgroundState] = useState<string | null>(defaultBackground);
  const [backgroundType, setBackgroundTypeState] = useState<string>(defaultBackgroundType);
  const [mounted, setMounted] = useState(false);

  const dbLoaded = useRef(dbSettingsLoaded);

  // On mount: sync localStorage with DB values, or fall back to localStorage if no DB data
  useEffect(() => {
    if (dbLoaded.current) {
      // DB values were provided - they take priority. Sync localStorage to match.
      localStorage.setItem(THEME_STORAGE_KEY, defaultTheme);
      if (defaultBackground) {
        localStorage.setItem(BG_STORAGE_KEY, defaultBackground);
      } else {
        localStorage.removeItem(BG_STORAGE_KEY);
      }
      localStorage.setItem(BG_TYPE_STORAGE_KEY, defaultBackgroundType);
      document.documentElement.setAttribute("data-theme", defaultTheme);
    } else {
      // No DB data (unauthenticated or fresh user) - fall back to localStorage
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
    }

    setMounted(true);
  }, [defaultTheme, defaultBackground, defaultBackgroundType]);

  // When theme changes, apply immediately to DOM + localStorage + DB
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    // Apply immediately, don't wait for re-render
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    persistToDb({ theme: newTheme });
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
      persistToDb({ background: bg, backgroundType: "wallpaper" });
    } else {
      // Wallpaper removed - revert to gradient
      setBackgroundTypeState("gradient");
      localStorage.removeItem(BG_STORAGE_KEY);
      localStorage.setItem(BG_TYPE_STORAGE_KEY, "gradient");
      persistToDb({ background: null, backgroundType: "gradient" });
    }
  }, []);

  const setBackgroundType = useCallback((type: string) => {
    setBackgroundTypeState(type);
    localStorage.setItem(BG_TYPE_STORAGE_KEY, type);
    persistToDb({ backgroundType: type });
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
