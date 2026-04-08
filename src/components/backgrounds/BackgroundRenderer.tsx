"use client";

import { lazy, Suspense } from "react";

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
}

export function BackgroundRenderer({ backgroundType }: BackgroundRendererProps) {
  switch (backgroundType) {
    case "plasma":
      return <Suspense fallback={null}><PlasmaFlow /></Suspense>;
    case "mesh":
      return <Suspense fallback={null}><MeshGradient /></Suspense>;
    case "aurora":
      return <Suspense fallback={null}><AuroraWaves /></Suspense>;
    case "nebula":
      return <Suspense fallback={null}><ParticleNebula /></Suspense>;
    case "wallpaper":
    default:
      return null;
  }
}
