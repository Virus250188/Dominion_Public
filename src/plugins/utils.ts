import type { PluginConfig, PluginStats, StatOption } from "./types";

/**
 * Resolve which stat keys are visible for a given config and plugin's stat options.
 * Uses the config's `visibleStats` JSON array if set, otherwise falls back to
 * the default-enabled stat options.
 */
export function getVisibleStats(config: PluginConfig, statOptions: StatOption[]): string[] {
  if (config.visibleStats) {
    // Handle both formats: native array (new) or JSON string (old DB data)
    if (Array.isArray(config.visibleStats)) return config.visibleStats;
    if (typeof config.visibleStats === "string") {
      try {
        const parsed = JSON.parse(config.visibleStats);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Invalid JSON — fall through to defaults
      }
    }
  }
  return statOptions.filter((o) => o.defaultEnabled).map((o) => o.key);
}

/**
 * Normalize a URL by stripping a trailing slash.
 */
export function normalizeUrl(url: string | unknown): string {
  return String(url || "").replace(/\/$/, "");
}

/**
 * Create an error PluginStats response from a caught error.
 */
export function createErrorResponse(err: unknown): PluginStats {
  return { items: [], status: "error", error: (err as Error).message };
}

/**
 * Create a standard RequestInit object with an abort timeout and optional headers.
 */
export function createFetchOptions(timeout = 5000, headers?: Record<string, string>): RequestInit {
  return { signal: AbortSignal.timeout(timeout), headers };
}

/**
 * Format bytes into a human-readable string (e.g., "1.5 TB").
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Format seconds into a human-readable uptime string (e.g., "3d 5h").
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
