"use client";

import { lazy, Suspense } from "react";
import type { BackgroundConfig } from "@/types/background";

const PlasmaFlow = lazy(() =>
  import("./PlasmaFlow").then((m) => ({ default: m.PlasmaFlow }))
);
const MeshGradient = lazy(() =>
  import("./MeshGradient").then((m) => ({ default: m.MeshGradient }))
);
const AuroraWaves = lazy(() =>
  import("./AuroraWaves").then((m) => ({ default: m.AuroraWaves }))
);
const ParticleNebula = lazy(() =>
  import("./ParticleNebula").then((m) => ({ default: m.ParticleNebula }))
);

interface BackgroundRendererProps {
  backgroundType: string;
  backgroundConfig?: BackgroundConfig;
}

export function BackgroundRenderer({ backgroundType, backgroundConfig = {} }: BackgroundRendererProps) {
  switch (backgroundType) {
    case "plasma":
      return <Suspense fallback={null}><PlasmaFlow config={backgroundConfig.plasma} /></Suspense>;
    case "mesh":
      return <Suspense fallback={null}><MeshGradient config={backgroundConfig.mesh} /></Suspense>;
    case "aurora":
      return <Suspense fallback={null}><AuroraWaves config={backgroundConfig.aurora} /></Suspense>;
    case "nebula":
      return <Suspense fallback={null}><ParticleNebula config={backgroundConfig.nebula} /></Suspense>;
    case "wallpaper":
    default:
      return null;
  }
}
