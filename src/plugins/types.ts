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

// ─── Plugin Notifications ──────────────────────────────────────────────────

export interface PluginNotification {
  /** Unique key for deduplication — same key won't fire again within dedupWindow */
  dedupKey: string;
  title: string;
  message?: string;
  category: "info" | "warning" | "critical" | "update";
  /** 0 = low, 1 = normal, 2 = high, 3 = critical. Default: 1 */
  priority?: number;
  /** Free-form grouping label (e.g. "Docker", "Array", "Updates") */
  tag?: string;
  /** Click-through URL */
  url?: string;
  /** Minutes to suppress duplicate dedupKey. Default: 60 */
  dedupMinutes?: number;
}

export interface PluginNotificationRule {
  /** Must match PluginNotification.tag emitted for this rule */
  id: string;
  label: string;
  description: string;
  severity: "info" | "warning" | "critical";
  defaultEnabled: boolean;
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
  type: "text" | "password" | "url" | "textarea" | "select" | "number" | "oauth";
  placeholder?: string;
  required?: boolean;
  description?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  oauth?: {
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
    pkce?: boolean;
  };
  /** When set, this field is only shown in the TileDialog for the specified sizes */
  showForSizes?: TileSize[];
}

// ─── Stat Options ──────────────────────────────────────────────────────────

export interface StatOption {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  /** When set, this stat option is only shown in the TileDialog for the specified sizes */
  showForSizes?: TileSize[];
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
  exchangeToken?(code: string, redirectUri: string, config: PluginConfig): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }>;
  refreshToken?(config: PluginConfig): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }>;
  supportsNotifications?: boolean;
  /** Catalog of notification rules users can enable/disable per source */
  notificationRules?: PluginNotificationRule[];
  /**
   * Called after fetchStats when the plugin supports notifications
   * and the tile has a linked NotificationSource.
   * Receives the previous widgetData to detect state changes.
   */
  checkNotifications?(
    config: PluginConfig,
    currentData: Record<string, unknown>,
    previousData: Record<string, unknown> | null,
  ): Promise<PluginNotification[]>;
}

// ─── Backward Compatibility ────────────────────────────────────────────────

export type EnhancedAppConfig = PluginConfig;
export type EnhancedAppStats = PluginStats;
