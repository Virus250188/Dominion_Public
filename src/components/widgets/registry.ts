import type { EnhancedStats } from "@/types/tile";
import type { ComponentType } from "react";

export interface WidgetProps {
  stats: EnhancedStats;
  config: Record<string, unknown>;
  tileId: number;
  size: "2x1" | "2x2";
  onAction?: (action: string, payload?: unknown) => void;
}

// Static map of widget component names to implementations.
// Plugins reference these by string in renderHints.widgetComponent.
const widgetRegistry = new Map<string, ComponentType<WidgetProps>>();

export function registerWidget(
  name: string,
  component: ComponentType<WidgetProps>,
) {
  widgetRegistry.set(name, component);
}

export function getWidget(
  name: string,
): ComponentType<WidgetProps> | undefined {
  return widgetRegistry.get(name);
}

// ─── Register Built-in Widgets ──────────────────────────────────────────────
// These live alongside the UI layer in src/components/widgets/ because they
// contain React components with JSX.

import { EmbyWidget } from "./emby/EmbyWidget";

registerWidget("EmbyWidget", EmbyWidget);

// ─── Auto-Register Community Widgets ─────────────────────────────────────────
// Community plugins export a `communityWidgets` map from their barrel.
// When a community plugin ships a widget, it adds it there and it gets
// auto-registered here -- no other core files to edit.

import { communityWidgets } from "@/plugins/community";

for (const [name, component] of Object.entries(communityWidgets)) {
  if (typeof component === "function" && !widgetRegistry.has(name)) {
    registerWidget(name, component as ComponentType<WidgetProps>);
  }
}
