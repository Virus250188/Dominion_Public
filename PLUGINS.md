# Dominion - Plugin-Entwicklung

Dieses Dokument erklaert, wie du eigene Plugins (Enhanced Apps) fuer das Dominion Dashboard entwickelst. Plugins erweitern das Dashboard um Live-Daten von selbst-gehosteten Services.

---

## Schnellstart

Ein Plugin ist eine einzelne TypeScript-Datei, die ein `AppPlugin`-Objekt exportiert.

### 1. Neuen Ordner anlegen

```
src/plugins/builtin/mein-service/index.ts
```

### 2. Plugin implementieren

```typescript
import type { AppPlugin, PluginConfig, PluginStats } from "../../types";

export const meinServicePlugin: AppPlugin = {
  metadata: {
    id: "mein-service",           // Eindeutige ID (lowercase, kebab-case)
    name: "Mein Service",         // Anzeigename
    icon: "Meinservice",          // simple-icons Key (https://simpleicons.org)
    color: "#3b82f6",             // Brand-Farbe (Hex)
    description: "Kurze Beschreibung was angezeigt wird",
    category: "Monitoring",       // Siehe Kategorien unten
    website: "https://example.com",
  },

  configFields: [
    {
      key: "apiUrl",
      label: "Server URL",
      type: "url",
      placeholder: "http://mein-service.local:8080",
      required: true,
      description: "Die URL deiner Instanz",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      description: "API-Schluessel aus den Einstellungen",
    },
  ],

  statOptions: [
    { key: "status", label: "Status", description: "Aktueller Service-Status", defaultEnabled: true },
    { key: "count", label: "Anzahl", description: "Anzahl der Eintraege", defaultEnabled: true },
    { key: "uptime", label: "Uptime", description: "Betriebszeit", defaultEnabled: false },
  ],

  supportedSizes: ["1x1", "2x2"],

  renderHints: {
    "1x1": { maxStats: 3, layout: "compact" },
    "2x2": { maxStats: 6, layout: "detailed" },
  },

  async fetchStats(config: PluginConfig): Promise<PluginStats> {
    try {
      const baseUrl = String(config.apiUrl || "").replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/status`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      return {
        status: "ok",
        items: [
          { label: "Status", value: data.status, color: "green" },
          { label: "Eintraege", value: data.count },
        ],
      };
    } catch (err) {
      return { items: [], status: "error", error: (err as Error).message };
    }
  },

  async testConnection(config: PluginConfig): Promise<{ ok: boolean; message: string }> {
    try {
      const baseUrl = String(config.apiUrl || "").replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/status`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      return { ok: true, message: "Verbindung erfolgreich" };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  },
};
```

### 3. Plugin registrieren

In `src/plugins/registry.ts` den Import hinzufuegen:

```typescript
import { meinServicePlugin } from "./builtin/mein-service";

const builtinPlugins: AppPlugin[] = [
  // ... bestehende Plugins ...
  meinServicePlugin,
];
```

### 4. Icon in ICON_MAP eintragen

In `src/lib/icons.ts`:

```typescript
const ICON_MAP: Record<string, string> = {
  // ... bestehende ...
  "Mein Service": "Meinservice",  // Muss zum simple-icons Slug passen
};
```

### 5. Testen

```bash
npm run build    # Muss ohne Fehler kompilieren
npm run dev      # Dashboard starten, neue App hinzufuegen
```

---

## AppPlugin Interface (Referenz)

```typescript
interface AppPlugin {
  metadata: PluginMetadata;
  configFields: ConfigField[];
  statOptions: StatOption[];
  supportedSizes: TileSize[];
  renderHints: Partial<Record<TileSize, SizeRenderHint>>;
  fetchStats(config: PluginConfig): Promise<PluginStats>;
  testConnection(config: PluginConfig): Promise<{ ok: boolean; message: string }>;
}
```

### metadata

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `id` | `string` | Ja | Eindeutige Plugin-ID, lowercase, kebab-case. Beispiel: `"truenas"`, `"home-assistant"` |
| `name` | `string` | Ja | Anzeigename im Dashboard. Beispiel: `"TrueNAS"` |
| `icon` | `string` | Ja | simple-icons Key (siehe [simpleicons.org](https://simpleicons.org)). Beispiel: `"Truenas"` |
| `color` | `string` | Ja | Brand-Farbe als Hex. Beispiel: `"#0095d5"` |
| `description` | `string` | Ja | Kurzbeschreibung (Deutsch). Wird im Tile und in der App-Auswahl angezeigt |
| `category` | `PluginCategory` | Ja | Kategorie fuer Gruppierung (siehe unten) |
| `website` | `string` | Nein | Offizielle Website des Services |

**Kategorien:** `"Storage"` | `"Media"` | `"Network"` | `"Automation"` | `"System"` | `"Monitoring"` | `"Downloads"` | `"Security"` | `"Productivity"` | `"Development"` | `"Custom"`

### configFields

Definiert die Eingabefelder, die der User beim Einrichten ausfuellt. Das Dashboard generiert das Formular automatisch.

```typescript
interface ConfigField {
  key: string;        // Schluessel im config-Objekt (z.B. "apiUrl")
  label: string;      // Anzeige-Label (Deutsch)
  type: "text" | "password" | "url" | "textarea" | "number" | "select";
  placeholder?: string;
  required?: boolean;
  description?: string;   // Hilfetext unter dem Feld
  options?: Array<{ value: string; label: string }>;  // Nur fuer type "select"
  min?: number;           // Nur fuer type "number"
  max?: number;           // Nur fuer type "number"
}
```

**Beispiele:**

```typescript
// URL-Feld
{ key: "apiUrl", label: "Server URL", type: "url", placeholder: "http://...", required: true }

// Passwort-Feld (wird maskiert dargestellt)
{ key: "apiKey", label: "API Key", type: "password", required: true }

// Mehrzeiliges Textfeld
{ key: "entityIds", label: "Sensoren", type: "textarea", placeholder: "sensor.temp:Name" }

// Dropdown-Auswahl
{ key: "protocol", label: "Protokoll", type: "select", options: [
  { value: "http", label: "HTTP" },
  { value: "https", label: "HTTPS" },
]}

// Nummer mit Grenzen
{ key: "carId", label: "Auto-ID", type: "number", min: 1, max: 10 }
```

### statOptions

Definiert welche Statistiken der User ein-/ausblenden kann (max. 3 auf 1x1 Tiles).

```typescript
interface StatOption {
  key: string;             // Eindeutiger Schluessel
  label: string;           // Anzeigename
  description: string;     // Beschreibung fuer den User
  defaultEnabled: boolean; // Standardmaessig sichtbar?
}
```

Der User waehlt im TileDialog welche Stats angezeigt werden. Die Auswahl wird als `config.visibleStats` (JSON-Array) an `fetchStats` uebergeben.

### supportedSizes

Welche Tile-Groessen dein Plugin unterstuetzt:

| Groesse | Grid-Ausmass | Beschreibung |
|---------|-------------|--------------|
| `"1x1"` | 1 Spalte, 1 Zeile | Kompakt: Icon, Titel, max 3 Stats |
| `"2x1"` | 2 Spalten, 1 Zeile | Breit: Icon, Titel, max 6 Stats oder Widget |
| `"2x2"` | 2 Spalten, 2 Zeilen | Gross: Widget-Darstellung, eigene Komponente |

Standard-Plugins sollten mindestens `"1x1"` unterstuetzen.

### renderHints

Gibt dem Dashboard Hinweise wie Stats pro Groesse dargestellt werden sollen:

```typescript
interface SizeRenderHint {
  maxStats: number;     // Max angezeigte Statistik-Werte
  layout: "compact" | "detailed" | "widget";
  widgetComponent?: string;   // Name der Widget-Komponente (nur fuer "widget" layout)
}
```

### fetchStats(config)

Die Kernfunktion deines Plugins. Wird alle 30 Sekunden vom Dashboard aufgerufen.

**Eingabe:** `PluginConfig` - Objekt mit den vom User eingegebenen Werten.

```typescript
interface PluginConfig {
  apiUrl: string;
  apiKey?: string;
  accessToken?: string;
  visibleStats?: string;    // JSON-Array der ausgewaehlten Stats
  [key: string]: unknown;   // Weitere custom Felder
}
```

**Ausgabe:** `PluginStats`

```typescript
interface PluginStats {
  items: StatItem[];      // Die anzuzeigenden Werte
  status: "ok" | "error";
  error?: string;         // Fehlermeldung bei status "error"
}

interface StatItem {
  label: string;              // Anzeige-Label
  value: string | number;     // Der Wert
  unit?: string;              // Einheit (z.B. "%", "GB", "MB/s")
  icon?: string;              // Lucide-Icon Name
  color?: string;             // Farbe: "green", "red", "yellow", "blue"
}
```

**Regeln:**
- Immer `try/catch` verwenden
- Bei Fehler: `{ items: [], status: "error", error: "Fehlermeldung" }` zurueckgeben
- Timeout: `AbortSignal.timeout(5000)` fuer alle fetch-Aufrufe
- URLs normalisieren: `String(config.apiUrl || "").replace(/\/$/, "")`
- `visibleStats` aus Config parsen und nur angefragte Stats zurueckgeben
- Max 6 Items (der Validator schneidet mehr ab)

### testConnection(config)

Wird aufgerufen wenn der User "Verbindung testen" klickt.

**Eingabe:** Gleiche `PluginConfig` wie bei `fetchStats`.

**Ausgabe:** `{ ok: boolean; message: string }`

- `ok: true` + Erfolgsmeldung bei erfolgreicher Verbindung
- `ok: false` + Fehlerbeschreibung bei Fehler

Sollte schneller sein als `fetchStats` - nur pruefen ob Server erreichbar und Auth korrekt ist.

---

## visibleStats Pattern

Der User waehlt im TileDialog welche Stats angezeigt werden. Diese Auswahl kommt als JSON-String in `config.visibleStats` an. So verarbeitest du sie:

```typescript
async fetchStats(config: PluginConfig): Promise<PluginStats> {
  // 1. Ausgewaehlte Stats laden (oder Defaults nehmen)
  const visibleStats: string[] = config.visibleStats
    ? JSON.parse(config.visibleStats as string)
    : this.statOptions.filter(o => o.defaultEnabled).map(o => o.key);

  // 2. Nur angefragte Daten sammeln
  const items = [];

  if (visibleStats.includes("status")) {
    items.push({ label: "Status", value: "Online", color: "green" });
  }

  if (visibleStats.includes("count")) {
    items.push({ label: "Anzahl", value: 42 });
  }

  return { items: items.slice(0, 3), status: "ok" };
}
```

---

## Farben fuer StatItems

Verwende diese Farb-Strings fuer Status-Anzeigen:

| Farbe | Verwendung | Beispiel |
|-------|-----------|---------|
| `"green"` | Positiv, Online, Aktiv | Streams > 0, Service online |
| `"red"` | Kritisch, Fehler, Offline | Speicher > 85%, Fehler-Count |
| `"yellow"` | Warnung | Speicher 70-85%, Updates verfuegbar |
| `"blue"` | Information | Neutrale Werte |
| `undefined` | Standard (Theme-Farbe) | Normale Zahlenwerte |

---

## Vollstaendiges Beispiel: Uptime Kuma Plugin

```typescript
import type { AppPlugin, PluginConfig, PluginStats } from "../../types";

export const uptimeKumaPlugin: AppPlugin = {
  metadata: {
    id: "uptime-kuma",
    name: "Uptime Kuma",
    icon: "Uptimekuma",
    color: "#5cdd8b",
    description: "Monitoring - Ueberwachte Services und Verfuegbarkeit",
    category: "Monitoring",
    website: "https://github.com/louislam/uptime-kuma",
  },

  configFields: [
    {
      key: "apiUrl",
      label: "Uptime Kuma URL",
      type: "url",
      placeholder: "http://uptime-kuma.local:3001",
      required: true,
      description: "Die URL deiner Uptime Kuma Instanz",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      description: "API Key aus Einstellungen → API Keys",
    },
  ],

  statOptions: [
    { key: "monitorsUp", label: "Online", description: "Anzahl der erreichbaren Monitore", defaultEnabled: true },
    { key: "monitorsDown", label: "Offline", description: "Anzahl der nicht erreichbaren Monitore", defaultEnabled: true },
    { key: "avgPing", label: "Avg. Ping", description: "Durchschnittliche Antwortzeit", defaultEnabled: false },
    { key: "totalMonitors", label: "Gesamt", description: "Gesamtzahl aller Monitore", defaultEnabled: false },
  ],

  supportedSizes: ["1x1", "2x1", "2x2"],

  renderHints: {
    "1x1": { maxStats: 3, layout: "compact" },
    "2x1": { maxStats: 6, layout: "detailed" },
    "2x2": { maxStats: 6, layout: "widget", widgetComponent: "UptimeKumaWidget" },
  },

  async fetchStats(config: PluginConfig): Promise<PluginStats> {
    try {
      const visibleStats: string[] = config.visibleStats
        ? JSON.parse(config.visibleStats as string)
        : this.statOptions.filter(o => o.defaultEnabled).map(o => o.key);

      const baseUrl = String(config.apiUrl || "").replace(/\/$/, "");
      const headers: HeadersInit = {
        Authorization: `Bearer ${String(config.apiKey || "")}`,
        "Content-Type": "application/json",
      };

      const res = await fetch(`${baseUrl}/api/status-page/heartbeat/default`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const heartbeats = data.heartbeatList || {};
      const items = [];

      // Monitore zaehlen
      let up = 0;
      let down = 0;
      let totalPing = 0;
      let pingCount = 0;

      for (const monitorId of Object.keys(heartbeats)) {
        const beats = heartbeats[monitorId];
        if (Array.isArray(beats) && beats.length > 0) {
          const latest = beats[beats.length - 1];
          if (latest.status === 1) up++;
          else down++;
          if (latest.ping > 0) {
            totalPing += latest.ping;
            pingCount++;
          }
        }
      }

      if (visibleStats.includes("monitorsUp")) {
        items.push({ label: "Online", value: up, color: "green" });
      }
      if (visibleStats.includes("monitorsDown")) {
        items.push({
          label: "Offline",
          value: down,
          color: down > 0 ? "red" : "green",
        });
      }
      if (visibleStats.includes("avgPing") && pingCount > 0) {
        items.push({
          label: "Avg. Ping",
          value: Math.round(totalPing / pingCount),
          unit: "ms",
        });
      }
      if (visibleStats.includes("totalMonitors")) {
        items.push({ label: "Gesamt", value: up + down });
      }

      return { items: items.slice(0, 3), status: "ok" };
    } catch (err) {
      return { items: [], status: "error", error: (err as Error).message };
    }
  },

  async testConnection(config: PluginConfig): Promise<{ ok: boolean; message: string }> {
    try {
      const baseUrl = String(config.apiUrl || "").replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/status-page/heartbeat/default`, {
        headers: {
          Authorization: `Bearer ${String(config.apiKey || "")}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      return { ok: true, message: "Verbindung zu Uptime Kuma erfolgreich" };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  },
};
```

---

## Validierung

Jedes Plugin wird beim Laden automatisch validiert. Fehlerhafte Plugins werden nicht registriert. Die Validierung prueft:

- `metadata.id` ist ein nicht-leerer String
- `metadata.name` ist ein nicht-leerer String
- `metadata.color` ist ein gueltiger Hex-Code (`#XXXXXX`)
- `configFields` ist ein Array
- `supportedSizes` ist nicht-leer und enthaelt nur gueltige Groessen
- `fetchStats` ist eine Funktion
- `testConnection` ist eine Funktion

Zusaetzlich werden die Rueckgabewerte von `fetchStats` zur Laufzeit validiert:
- `status` muss `"ok"` oder `"error"` sein
- `items` wird auf max. 6 Eintraege begrenzt
- Jedes `StatItem` muss `label` (String) und `value` (String/Number) haben
- Ungueltige Items werden gefiltert, das Dashboard bricht nie

---

## Checkliste vor dem Einreichen

- [ ] Plugin kompiliert fehlerfrei (`npm run build`)
- [ ] `metadata.id` ist eindeutig (kein Konflikt mit bestehenden Plugins)
- [ ] `metadata.icon` existiert auf [simpleicons.org](https://simpleicons.org)
- [ ] `metadata.color` passt zur App-Brand (Hex-Format)
- [ ] `configFields` hat alle noetigten Felder mit Beschreibungen (Deutsch)
- [ ] `statOptions` hat mindestens eine Option mit `defaultEnabled: true`
- [ ] `fetchStats` verwendet `AbortSignal.timeout(5000)`
- [ ] `fetchStats` gibt bei Fehlern `{ items: [], status: "error", error: "..." }` zurueck
- [ ] `testConnection` ist implementiert und gibt verstaendliche Meldungen zurueck
- [ ] `supportedSizes` enthaelt mindestens `"1x1"`
- [ ] ICON_MAP Eintrag in `src/lib/icons.ts` hinzugefuegt
- [ ] Plugin in `src/plugins/registry.ts` importiert und registriert
- [ ] Manuell getestet: App hinzufuegen, Verbindung testen, Stats werden angezeigt

---

## Bestehende Plugins als Referenz

| Plugin | Datei | API-Muster | Auth |
|--------|-------|-----------|------|
| Emby | `builtin/emby/index.ts` | REST API, Custom Header | `X-Emby-Token: key` |

Weitere Plugins werden inkrementell hinzugefuegt. Nutze das Emby-Plugin als Referenz fuer neue Implementierungen.

---

## Haeufige Fehler

**"Plugin validation failed"**
Pruefe die Konsole beim Start. Wahrscheinlich fehlt ein Pflichtfeld in `metadata` oder `supportedSizes` ist leer.

**Icon wird nicht angezeigt**
Der `metadata.icon` Wert muss exakt dem simple-icons Slug entsprechen. Suche auf [simpleicons.org](https://simpleicons.org) und verwende den Slug mit grossem Anfangsbuchstaben.

**Stats kommen nicht an**
Stelle sicher, dass `fetchStats` ein Objekt mit `{ items: [...], status: "ok" }` zurueckgibt. Der Validator filtert ungueltige Items - pruefe ob `label` und `value` korrekt gesetzt sind.

**Config-Werte sind undefined**
Config-Werte kommen als `unknown` an. Immer casten: `String(config.apiUrl || "")` oder `Number(config.port || 8080)`.
