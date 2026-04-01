"use client";

import { useMemo } from "react";
import { fuzzyMatchIcon } from "@/lib/icons";

function sanitizeSvg(html: string): string {
  if (typeof window === "undefined") return html;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DOMPurify = require("dompurify");
  return DOMPurify.sanitize(html);
}

interface AppIconProps {
  appName: string;
  color: string;
  size?: number;
  className?: string;
  customIcon?: string | null;
}

export function AppIcon({ appName, color, size = 48, className, customIcon }: AppIconProps) {
  const icon = useMemo(() => fuzzyMatchIcon(appName), [appName]);

  // Priority 1: Custom uploaded icon (base64 or SVG string)
  if (customIcon) {
    const isBase64 = customIcon.startsWith("data:image/");
    const isSvgString = customIcon.trimStart().startsWith("<svg");

    if (isBase64 || !isSvgString) {
      // Render as <img> for base64 data URIs (or treat unknown format as base64)
      const src = isBase64 ? customIcon : `data:image/png;base64,${customIcon}`;
      return (
        <div
          className={`flex items-center justify-center rounded-xl overflow-hidden ${className || ""}`}
          style={{
            backgroundColor: color,
            width: size,
            height: size,
          }}
        >
          <img
            src={src}
            alt={appName}
            className="object-contain"
            style={{ width: size * 0.6, height: size * 0.6 }}
          />
        </div>
      );
    }

    // Render SVG string via dangerouslySetInnerHTML
    return (
      <div
        className={`flex items-center justify-center rounded-xl ${className || ""}`}
        style={{
          backgroundColor: color,
          width: size,
          height: size,
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(customIcon) }}
          className="[&>svg]:fill-white [&>svg]:w-full [&>svg]:h-full flex items-center justify-center"
          style={{ width: size * 0.6, height: size * 0.6 }}
        />
      </div>
    );
  }

  // Priority 2-4: Plugin registry / Foundation map / Fuzzy match
  if (icon) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl ${className || ""}`}
        style={{
          backgroundColor: color,
          width: size,
          height: size,
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(icon.svg) }}
          className="[&>svg]:fill-white flex items-center justify-center"
          style={{ width: size * 0.6, height: size * 0.6 }}
        />
      </div>
    );
  }

  // Priority 5: First letter fallback
  return (
    <div
      className={`flex items-center justify-center rounded-xl text-white font-bold ${className || ""}`}
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
    >
      {appName.charAt(0).toUpperCase()}
    </div>
  );
}
