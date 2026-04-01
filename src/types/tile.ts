export interface TileData {
  id: number;
  title: string;
  url: string;
  color: string;
  icon: string | null;
  description: string | null;
  pinned: boolean;
  order: number;
  columnSpan: number;
  rowSpan: number;
  type: "standard" | "enhanced";
  enhancedType: string | null;
  enhancedConfig: string | null;
  customIconSvg: string | null;
  groupId: number | null;
  appConnectionId: number | null;
}

export interface EnhancedStats {
  items: StatItem[];
  status: "ok" | "error" | "loading";
  error?: string;
  /** Optional rich data for widget rendering (cover images, lists, etc.) */
  widgetData?: Record<string, unknown>;
}

export interface StatItem {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  color?: string;
}
