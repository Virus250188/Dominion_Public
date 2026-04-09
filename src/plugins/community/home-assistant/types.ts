// ── Home Assistant API types ──────────────────────────────────

/** Entity state object from GET /api/states */
export interface HAEntity {
  entity_id: string;
  state: string;
  last_changed: string;
  last_updated: string;
  attributes: {
    friendly_name?: string;
    unit_of_measurement?: string;
    icon?: string;
    device_class?: string;
    [key: string]: unknown;
  };
}

// ── Widget data types ─────────────────────────────────────────

/** Rich entity data passed to the widget via widgetData */
export interface WidgetEntity {
  entityId: string;
  domain: string;
  friendlyName: string;
  state: string;
  unit?: string;
  deviceClass?: string;
  attributes: Record<string, unknown>;
  lastChanged: string;
}

// ── Domain mappings ───────────────────────────────────────────

/** German labels for HA entity domains */
export const DOMAIN_LABELS: Record<string, string> = {
  sensor: "Sensoren",
  binary_sensor: "Binaere Sensoren",
  light: "Lichter",
  switch: "Schalter",
  climate: "Klima",
  media_player: "Mediaplayer",
  weather: "Wetter",
  camera: "Kameras",
  device_tracker: "Geraete-Tracker",
  automation: "Automatisierungen",
  person: "Personen",
  input_boolean: "Eingabe-Schalter",
  input_number: "Eingabe-Zahl",
  cover: "Rolllaeden",
  fan: "Ventilatoren",
  lock: "Schloesser",
  alarm_control_panel: "Alarm",
  sun: "Sonne",
  zone: "Zonen",
  script: "Skripte",
  scene: "Szenen",
  group: "Gruppen",
  vacuum: "Saugroboter",
  water_heater: "Warmwasser",
  humidifier: "Luftbefeuchter",
};

/** Lucide icon names for HA entity domains */
export const DOMAIN_ICONS: Record<string, string> = {
  sensor: "Activity",
  binary_sensor: "ToggleLeft",
  light: "Lightbulb",
  switch: "Power",
  climate: "Thermometer",
  media_player: "Play",
  weather: "Cloud",
  camera: "Camera",
  device_tracker: "MapPin",
  automation: "Zap",
  person: "User",
  input_boolean: "ToggleRight",
  input_number: "Hash",
  cover: "ArrowUpDown",
  fan: "Fan",
  lock: "Lock",
  alarm_control_panel: "ShieldAlert",
  sun: "Sun",
  zone: "Map",
  script: "FileCode",
  scene: "Palette",
  group: "Users",
  vacuum: "Bot",
  water_heater: "Droplets",
  humidifier: "CloudDrizzle",
};

// ── Entity state formatting ───────────────────────────────────

/** Binary sensor device_class to German on/off labels */
const BINARY_LABELS: Record<string, { on: string; off: string }> = {
  door: { on: "Offen", off: "Geschlossen" },
  window: { on: "Offen", off: "Geschlossen" },
  garage_door: { on: "Offen", off: "Geschlossen" },
  opening: { on: "Offen", off: "Geschlossen" },
  lock: { on: "Offen", off: "Verriegelt" },
  motion: { on: "Erkannt", off: "Frei" },
  occupancy: { on: "Belegt", off: "Frei" },
  presence: { on: "Anwesend", off: "Abwesend" },
  vibration: { on: "Erkannt", off: "Frei" },
  smoke: { on: "Erkannt", off: "Frei" },
  gas: { on: "Erkannt", off: "Frei" },
  moisture: { on: "Nass", off: "Trocken" },
  connectivity: { on: "Verbunden", off: "Getrennt" },
  battery: { on: "Niedrig", off: "Normal" },
  plug: { on: "Eingesteckt", off: "Ausgesteckt" },
  power: { on: "An", off: "Aus" },
  running: { on: "Laeuft", off: "Gestoppt" },
  problem: { on: "Problem", off: "OK" },
  safety: { on: "Unsicher", off: "Sicher" },
  update: { on: "Verfuegbar", off: "Aktuell" },
};

/**
 * Format an HA entity state into a human-readable German string.
 * Used by crawlEntities to show current state in the entity picker.
 */
export function formatEntityState(entity: HAEntity): string {
  const { state, attributes, entity_id } = entity;
  const domain = entity_id.split(".")[0];

  if (state === "unavailable") return "Nicht verfuegbar";
  if (state === "unknown") return "Unbekannt";

  if (domain === "binary_sensor") {
    const dc = String(attributes.device_class || "");
    const labels = BINARY_LABELS[dc] || { on: "An", off: "Aus" };
    return state === "on" ? labels.on : labels.off;
  }

  if (domain === "light" || domain === "switch" || domain === "input_boolean" || domain === "fan") {
    return state === "on" ? "An" : "Aus";
  }

  const unit = attributes.unit_of_measurement;
  if (unit) return `${state} ${unit}`;

  return state;
}

/**
 * Map an HA entity to a StatItem-compatible shape.
 * Returns label, value, unit, and color for the stats display.
 */
export function mapEntityToStat(entity: HAEntity): {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
} {
  const { state, attributes, entity_id } = entity;
  const domain = entity_id.split(".")[0];
  const label = attributes.friendly_name || entity_id;

  // Unavailable / unknown
  if (state === "unavailable" || state === "unknown") {
    return { label, value: "N/A", color: "red" };
  }

  // Binary sensors — color depends on device_class
  if (domain === "binary_sensor") {
    const dc = String(attributes.device_class || "");
    const labels = BINARY_LABELS[dc] || { on: "An", off: "Aus" };
    const displayValue = state === "on" ? labels.on : labels.off;
    // Most binary sensors: "on" = problem/attention = red, "off" = normal = green
    // Exceptions: connectivity, plug, power — "on" = good = green
    const positiveOnClasses = new Set(["connectivity", "plug", "power", "running"]);
    let color: string | undefined;
    if (state === "on") {
      color = positiveOnClasses.has(dc) ? "green" : "red";
    } else {
      color = positiveOnClasses.has(dc) ? undefined : "green";
    }
    return { label, value: displayValue, color };
  }

  // Lights, switches, input_boolean, fan
  if (domain === "light" || domain === "switch" || domain === "input_boolean" || domain === "fan") {
    return {
      label,
      value: state === "on" ? "An" : "Aus",
      color: state === "on" ? "green" : undefined,
    };
  }

  // Numeric with unit
  const unit = attributes.unit_of_measurement as string | undefined;
  const numValue = parseFloat(state);

  if (!isNaN(numValue) && unit) {
    let color: string | undefined;

    // Percentage — threshold coloring
    if (unit === "%") {
      if (numValue > 85) color = "red";
      else if (numValue > 70) color = "yellow";
      else color = "green";
    }
    // Temperature — blue
    else if (unit === "°C" || unit === "°F") {
      color = "blue";
    }

    return { label, value: numValue, unit, color };
  }

  // Pure numeric without unit (e.g. days countdown)
  if (!isNaN(numValue)) {
    const dc = String(attributes.device_class || "");
    let color: string | undefined;
    // If it looks like a countdown (small number, name suggests days)
    if (dc === "duration" || entity_id.includes("tage") || entity_id.includes("days")) {
      if (numValue <= 0) color = "red";
      else if (numValue <= 3) color = "yellow";
      else color = "green";
    }
    return { label, value: numValue, color };
  }

  // Text state (fallback)
  return { label, value: state };
}

/**
 * Parse entity config from textarea input.
 * Supports format: "entity_id:Custom Label, entity_id2:Label2, entity_id3"
 * Returns array of { id, customLabel } objects.
 */
export function parseEntityConfig(input: unknown): Array<{ id: string; customLabel?: string }> {
  // Handle array of { id, label } objects (from crawlEntities picker)
  if (Array.isArray(input)) {
    return input
      .map((e) => {
        if (typeof e === "object" && e !== null && "id" in e) {
          return { id: String((e as { id: unknown }).id), customLabel: (e as { label?: unknown }).label ? String((e as { label?: unknown }).label) : undefined };
        }
        return { id: String(e) };
      })
      .filter((e) => e.id);
  }

  // Handle string (textarea input or JSON)
  if (typeof input === "string") {
    // Try JSON first
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parseEntityConfig(parsed);
    } catch {
      // Comma-separated, possibly with :Label
    }

    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((entry) => {
        const colonIdx = entry.indexOf(":");
        if (colonIdx > 0) {
          return { id: entry.substring(0, colonIdx).trim(), customLabel: entry.substring(colonIdx + 1).trim() };
        }
        return { id: entry };
      });
  }

  return [];
}

/**
 * Extract just entity IDs from parsed config.
 */
export function parseSelectedEntities(entities: unknown): string[] {
  return parseEntityConfig(entities).map((e) => e.id);
}