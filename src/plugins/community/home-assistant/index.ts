import type { AppPlugin, PluginConfig } from "@/plugins/types";
import {
  getVisibleStats,
  normalizeUrl,
  createErrorResponse,
  createFetchOptions,
} from "@/plugins/utils";
import {
  DOMAIN_LABELS,
  DOMAIN_ICONS,
  formatEntityState,
  mapEntityToStat,
  parseEntityConfig,
} from "./types";
import type { HAEntity, WidgetEntity } from "./types";
import { HomeAssistantWidget } from "./HomeAssistantWidget";

export const plugin: AppPlugin = {
  metadata: {
    id: "home-assistant",
    name: "Home Assistant",
    icon: "Homeassistant",
    color: "#18BCF2",
    description:
      "Zeigt an: Beliebige Home Assistant Entities (Sensoren, Lichter, Schalter, Klima und mehr)",
    category: "Automation",
    website: "https://www.home-assistant.io",
  },

  configFields: [
    {
      key: "apiUrl",
      label: "Home Assistant URL",
      type: "url",
      required: true,
      placeholder: "http://192.168.1.100:8123",
      description: "URL deiner Home Assistant Instanz",
    },
    {
      key: "apiKey",
      label: "Access Token",
      type: "password",
      required: true,
      placeholder: "eyJhbGciOiJI...",
      description:
        "Langlebiger Zugangstoken (erstellen unter Profil > Langlebige Zugangstoken)",
    },
  ],

  statOptions: [
    {
      key: "entities",
      label: "Ausgewaehlte Entities",
      description:
        "Die konfigurierten Entities werden angezeigt",
      defaultEnabled: true,
    },
  ],

  supportedSizes: ["1x1", "2x1"],

  renderHints: {
    "1x1": { maxStats: 3, layout: "compact" },
    "2x1": {
      maxStats: 6,
      layout: "widget",
      widgetComponent: "HomeAssistantWidget",
    },
  },

  async fetchStats(config: PluginConfig) {
    try {
      const visibleStats = getVisibleStats(config, this.statOptions);
      const baseUrl = normalizeUrl(config.apiUrl);
      const token = String(config.apiKey || "");

      // If "entities" stat is disabled, return empty
      if (!visibleStats.includes("entities")) {
        return { items: [], status: "ok" as const };
      }

      // Read entities from two sources (entity picker or textarea)
      let entityConfig = parseEntityConfig(config.selectedEntities);
      if (entityConfig.length === 0) {
        entityConfig = parseEntityConfig((config as Record<string, unknown>).entityIds);
      }
      if (entityConfig.length === 0) {
        return {
          items: [
            {
              label: "Hinweis",
              value: "Keine Entities konfiguriert",
              color: "yellow",
            },
          ],
          status: "ok" as const,
        };
      }

      // Build a map of custom labels: entity_id -> custom name
      const customLabels = new Map<string, string>();
      for (const e of entityConfig) {
        if (e.customLabel) customLabels.set(e.id, e.customLabel);
      }
      const entityIds = entityConfig.map((e) => e.id);

      const res = await fetch(
        `${baseUrl}/api/states`,
        createFetchOptions(8000, { Authorization: `Bearer ${token}` })
      );

      if (!res.ok) {
        return {
          items: [
            { label: "Fehler", value: `HTTP ${res.status}`, color: "red" },
          ],
          status: "error" as const,
          error: `HTTP ${res.status}`,
        };
      }

      const allStates: HAEntity[] = await res.json();
      const stateMap = new Map(allStates.map((s) => [s.entity_id, s]));

      const items: Array<{
        label: string;
        value: string | number;
        unit?: string;
        color?: string;
      }> = [];
      const widgetEntities: WidgetEntity[] = [];

      for (const entityId of entityIds) {
        const entity = stateMap.get(entityId);
        if (!entity) continue;

        // Use custom label if provided, otherwise HA friendly_name
        const displayName =
          customLabels.get(entityId) ||
          entity.attributes.friendly_name ||
          entityId;

        const stat = mapEntityToStat(entity);
        items.push({ ...stat, label: displayName });

        widgetEntities.push({
          entityId: entity.entity_id,
          domain: entity.entity_id.split(".")[0],
          friendlyName: displayName,
          state: entity.state,
          unit: entity.attributes.unit_of_measurement as string | undefined,
          deviceClass: entity.attributes.device_class as string | undefined,
          attributes: entity.attributes,
          lastChanged: entity.last_changed,
        });
      }

      return {
        items,
        status: "ok" as const,
        widgetData: { entities: widgetEntities },
      };
    } catch (err) {
      return createErrorResponse(err);
    }
  },

  async testConnection(config: PluginConfig) {
    const baseUrl = normalizeUrl(config.apiUrl);
    const token = String(config.apiKey || "");

    try {
      const res = await fetch(
        `${baseUrl}/api/config`,
        createFetchOptions(5000, { Authorization: `Bearer ${token}` })
      );

      if (res.ok) {
        const data = await res.json();
        return {
          ok: true,
          message: `Verbunden mit ${data.location_name || "Home Assistant"}`,
        };
      }
      if (res.status === 401) {
        return {
          ok: false,
          message: "Zugriff verweigert — Access Token pruefen",
        };
      }
      return { ok: false, message: `HTTP ${res.status}: ${res.statusText}` };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  },

  async crawlEntities(config: PluginConfig) {
    const baseUrl = normalizeUrl(config.apiUrl);
    const token = String(config.apiKey || "");

    const res = await fetch(
      `${baseUrl}/api/states`,
      createFetchOptions(10000, { Authorization: `Bearer ${token}` })
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const states: HAEntity[] = await res.json();
    const domainMap = new Map<
      string,
      {
        domain: string;
        label: string;
        icon: string;
        entities: Array<{ id: string; name: string; state: string }>;
      }
    >();

    for (const entity of states) {
      const [domain] = entity.entity_id.split(".");
      if (!domainMap.has(domain)) {
        domainMap.set(domain, {
          domain,
          label: DOMAIN_LABELS[domain] || domain,
          icon: DOMAIN_ICONS[domain] || "CircleDot",
          entities: [],
        });
      }
      domainMap.get(domain)!.entities.push({
        id: entity.entity_id,
        name: entity.attributes.friendly_name || entity.entity_id,
        state: formatEntityState(entity),
      });
    }

    const groups = Array.from(domainMap.values())
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((g) => ({
        ...g,
        entities: g.entities.sort((a, b) => a.name.localeCompare(b.name)),
      }));

    return { groups };
  },
};

// ── Community Plugin Auto-Discovery Exports ───────────────────
export const widget = HomeAssistantWidget;
export const widgetName = "HomeAssistantWidget";