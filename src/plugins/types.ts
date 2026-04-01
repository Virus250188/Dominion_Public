// ─── Tile Sizes & Categories ───────────────────────────────────────────────

export type TileSize = "1x1" | "2x1" | "2x2";

export type PluginCategory =
  | "Storage"
  | "Media"
  | "Network"
  | "Automation"
  | "System"
  | "Monitoring"
  | "Downloads"
  | "Security"
  | "Productivity"
  | "Development"
  | "Custom";

// ─── Stat Items ────────────────────────────────────────────────────────────

export interface StatItem {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  color?: string;
}

// ─── Plugin Stats (fetched at runtime) ─────────────────────────────────────

export interface PluginStats {
  items: StatItem[];
  status: "ok" | "error";
  error?: string;
  /** Optional rich data for widget rendering (cover images, lists, etc.) */
  widgetData?: Record<string, unknown>;
}

// ─── Config ────────────────────────────────────────────────────────────────

export interface PluginConfig {
  apiUrl: string;
  apiKey?: string;
  accessToken?: string;
  username?: string;
  password?: string;
  entityIds?: string;
  [key: string]: unknown;
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "textarea" | "select" | "number";
  placeholder?: string;
  required?: boolean;
  description?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
}

// ─── Stat Options ──────────────────────────────────────────────────────────

export interface StatOption {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

// ─── Render Hints ──────────────────────────────────────────────────────────

export interface SizeRenderHint {
  maxStats: number;
  layout: "compact" | "detailed" | "widget";
  widgetComponent?: string;
}

// ─── Plugin Metadata ───────────────────────────────────────────────────────

export interface PluginMetadata {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  category: PluginCategory;
  website?: string;
}

// ─── App Plugin Interface ──────────────────────────────────────────────────

export interface CrawlEntityGroup {
  domain: string;
  label: string;
  icon: string;
  entities: Array<{ id: string; name: string; state: string }>;
}

export interface AppPlugin {
  metadata: PluginMetadata;
  configFields: ConfigField[];
  statOptions: StatOption[];
  supportedSizes: TileSize[];
  renderHints: Partial<Record<TileSize, SizeRenderHint>>;
  fetchStats(config: PluginConfig): Promise<PluginStats>;
  testConnection(config: PluginConfig): Promise<{ ok: boolean; message: string }>;
  crawlEntities?(config: PluginConfig): Promise<{ groups: CrawlEntityGroup[] }>;
}

// ─── Backward Compatibility ────────────────────────────────────────────────

export type EnhancedAppConfig = PluginConfig;
export type EnhancedAppStats = PluginStats;
