import type { AppPlugin, PluginStats, StatItem, TileSize } from "./types";

const VALID_SIZES: TileSize[] = ["1x1", "2x1", "2x2"];
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_STAT_ITEMS = 6;

export function validatePlugin(plugin: AppPlugin): string[] {
  const errors: string[] = [];

  if (!plugin.metadata) {
    errors.push("metadata is required");
    return errors;
  }

  const { metadata } = plugin;

  if (typeof metadata.id !== "string" || metadata.id.length === 0) {
    errors.push("metadata.id must be a non-empty string");
  }

  if (typeof metadata.name !== "string" || metadata.name.length === 0) {
    errors.push("metadata.name must be a non-empty string");
  }

  if (typeof metadata.color !== "string" || !HEX_COLOR_RE.test(metadata.color)) {
    errors.push("metadata.color must be a valid hex color (#XXXXXX)");
  }

  if (!Array.isArray(plugin.configFields)) {
    errors.push("configFields must be an array");
  }

  if (!Array.isArray(plugin.supportedSizes) || plugin.supportedSizes.length === 0) {
    errors.push("supportedSizes must be a non-empty array");
  } else {
    for (const size of plugin.supportedSizes) {
      if (!VALID_SIZES.includes(size)) {
        errors.push(`supportedSizes contains invalid size: "${size}"`);
      }
    }
  }

  if (typeof plugin.fetchStats !== "function") {
    errors.push("fetchStats must be a function");
  }

  if (typeof plugin.testConnection !== "function") {
    errors.push("testConnection must be a function");
  }

  return errors;
}

function sanitizeStatItem(raw: unknown): StatItem | null {
  if (raw == null || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;

  if (typeof item.label !== "string" || item.label.length === 0) return null;

  if (typeof item.value !== "string" && typeof item.value !== "number") return null;

  const sanitized: StatItem = {
    label: item.label,
    value: item.value,
  };

  if (typeof item.unit === "string") sanitized.unit = item.unit;
  if (typeof item.icon === "string") sanitized.icon = item.icon;
  if (typeof item.color === "string") sanitized.color = item.color;

  return sanitized;
}

export function validateStats(raw: unknown): PluginStats {
  if (raw == null || typeof raw !== "object") {
    return { items: [], status: "error", error: "Plugin returned invalid data" };
  }

  const obj = raw as Record<string, unknown>;

  const status = obj.status === "ok" ? "ok" : "error";
  const error = typeof obj.error === "string" ? obj.error : undefined;

  if (!Array.isArray(obj.items)) {
    return {
      items: [],
      status: "error",
      error: error ?? "Plugin returned no items array",
    };
  }

  const items: StatItem[] = [];
  for (const entry of obj.items.slice(0, MAX_STAT_ITEMS)) {
    const item = sanitizeStatItem(entry);
    if (item) items.push(item);
  }

  // Pass through widgetData for rich widget rendering (covers, lists, etc.)
  const widgetData = obj.widgetData != null && typeof obj.widgetData === "object"
    ? obj.widgetData as Record<string, unknown>
    : undefined;

  return { items, status, error, ...(widgetData ? { widgetData } : {}) };
}
