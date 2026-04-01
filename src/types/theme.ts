export type Theme = "glass-dark" | "glass-light" | "dark" | "light" | "nord" | "catppuccin";

export interface ThemeConfig {
  id: Theme;
  name: string;
  description: string;
  isGlass: boolean;
  previewColors: {
    bg: string;
    card: string;
    accent: string;
    text: string;
  };
}

export const themes: ThemeConfig[] = [
  {
    id: "glass-dark",
    name: "Glass Dark",
    description: "Dunkler Glasmorphismus mit Blur-Effekten",
    isGlass: true,
    previewColors: { bg: "#1a1a2e", card: "rgba(255,255,255,0.06)", accent: "#7c6ff7", text: "#f0f0f0" },
  },
  {
    id: "glass-light",
    name: "Glass Light",
    description: "Heller Glasmorphismus mit Transparenz",
    isGlass: true,
    previewColors: { bg: "#eeeef5", card: "rgba(255,255,255,0.5)", accent: "#6c4ff7", text: "#1a1a2e" },
  },
  {
    id: "dark",
    name: "Dark",
    description: "Klassisches dunkles Theme",
    isGlass: false,
    previewColors: { bg: "#1a1a2e", card: "#242440", accent: "#7c6ff7", text: "#f0f0f0" },
  },
  {
    id: "light",
    name: "Light",
    description: "Klassisches helles Theme",
    isGlass: false,
    previewColors: { bg: "#f5f5fa", card: "#ffffff", accent: "#5535f7", text: "#1a1a2e" },
  },
  {
    id: "nord",
    name: "Nord",
    description: "Inspiriert von der Nord Farbpalette",
    isGlass: false,
    previewColors: { bg: "#2e3440", card: "#3b4252", accent: "#88c0d0", text: "#eceff4" },
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    description: "Catppuccin Mocha Farbpalette",
    isGlass: false,
    previewColors: { bg: "#1e1e2e", card: "#313244", accent: "#cba6f7", text: "#cdd6f4" },
  },
];
