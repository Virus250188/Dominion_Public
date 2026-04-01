import type { AppPlugin } from "./types";
import { validatePlugin } from "./validator";
import { logger } from "@/lib/logger";

// ─── Builtin Plugin Imports ───────────────────────────────────────────────

import { embyPlugin } from "./builtin/emby";

// ─── Community Plugins ───────────────────────────────────────────────────

import { communityPlugins } from "./community";

// ─── Registration ─────────────────────────────────────────────────────────

const builtinPlugins: AppPlugin[] = [
  embyPlugin,
];

const registry = new Map<string, AppPlugin>();

/** Validate and register a plugin. Returns true if registration succeeded. */
function registerPlugin(plugin: AppPlugin, source: string): boolean {
  const errors = validatePlugin(plugin);
  if (errors.length > 0) {
    logger.error("plugin-registry", `Validation failed for ${plugin.metadata?.id ?? "unknown"}`, { source, errors: errors.join(", ") });
    return false;
  }
  if (registry.has(plugin.metadata.id)) {
    logger.warn("plugin-registry", `Duplicate plugin ID: ${plugin.metadata.id}`, { source });
    return false;
  }
  registry.set(plugin.metadata.id, plugin);
  return true;
}

// Register all builtin plugins
for (const plugin of builtinPlugins) {
  registerPlugin(plugin, "builtin");
}

// Register all community plugins
for (const plugin of communityPlugins) {
  registerPlugin(plugin, "community");
}

logger.info("plugin-registry", `Registered ${registry.size} plugins`);

// ─── Icon Map (auto-generated from registry) ─────────────────────────────

/**
 * Auto-generated map of plugin name -> simple-icons slug.
 * Built once from all registered plugins so that icon resolution
 * works without a separate hand-maintained ICON_MAP.
 */
const pluginIconMap = new Map<string, string>();

for (const plugin of registry.values()) {
  pluginIconMap.set(plugin.metadata.name, plugin.metadata.icon);
  // Also index by lowercase for fuzzy matching
  pluginIconMap.set(plugin.metadata.name.toLowerCase(), plugin.metadata.icon);
}

/**
 * Resolve a simple-icons slug from a plugin name.
 * Checks the auto-generated plugin icon map first,
 * returns undefined for non-plugin (foundation) apps.
 */
export function getPluginIconSlug(appName: string): string | undefined {
  return pluginIconMap.get(appName) ?? pluginIconMap.get(appName.toLowerCase());
}

// ─── Public API ───────────────────────────────────────────────────────────

/** Get a single plugin by its metadata id. */
export function getPlugin(id: string): AppPlugin | undefined {
  return registry.get(id);
}

/** Get all registered (validated) plugins. */
export function getAllPlugins(): AppPlugin[] {
  return Array.from(registry.values());
}

/** Get all plugins matching a given category. */
export function getPluginsByCategory(category: string): AppPlugin[] {
  return getAllPlugins().filter((p) => p.metadata.category === category);
}

/**
 * Returns a catalog array suitable for populating the "Add App" UI.
 * Each entry contains the presentational metadata that used to live in
 * the FoundationApp database table for enhanced apps.
 */
export function getPluginCatalog() {
  return getAllPlugins().map((p) => ({
    name: p.metadata.name,
    icon: p.metadata.icon,
    color: p.metadata.color,
    website: p.metadata.website ?? null,
    description: p.metadata.description,
    category: p.metadata.category,
    enhanced: true as const,
    pluginId: p.metadata.id,
    supportedSizes: p.supportedSizes,
  }));
}
