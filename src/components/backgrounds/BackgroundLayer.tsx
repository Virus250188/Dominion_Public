"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { BackgroundRenderer } from "./BackgroundRenderer";

export function BackgroundLayer() {
  const { backgroundType, backgroundConfig } = useTheme();
  return <BackgroundRenderer backgroundType={backgroundType} backgroundConfig={backgroundConfig} />;
}
