"use client";

import { lazy, Suspense } from "react";

const SoftAurora = lazy(() =>
  import("./SoftAurora").then((m) => ({ default: m.SoftAurora }))
);
const FloatingLines = lazy(() =>
  import("./FloatingLines").then((m) => ({ default: m.FloatingLines }))
);
const Prism = lazy(() =>
  import("./Prism").then((m) => ({ default: m.Prism }))
);

interface BackgroundRendererProps {
  backgroundType: string;
}

export function BackgroundRenderer({ backgroundType }: BackgroundRendererProps) {
  switch (backgroundType) {
    case "aurora":
      return (
        <Suspense fallback={null}>
          <SoftAurora />
        </Suspense>
      );
    case "lines":
      return (
        <Suspense fallback={null}>
          <FloatingLines />
        </Suspense>
      );
    case "prism":
      return (
        <Suspense fallback={null}>
          <Prism />
        </Suspense>
      );
    case "gradient":
    case "wallpaper":
    default:
      return null;
  }
}
