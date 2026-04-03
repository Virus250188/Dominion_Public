# Dominion -- Enhanced App Framework Spezifikation

Dieses Dokument ist die verbindliche Referenz fuer die Architektur und Implementierung von Enhanced Apps im Dominion Dashboard. Es definiert den vollstaendigen Lebenszyklus, die Datenvertraege, die Tile-Groessen, die Widget-Integration und alle Regeln, die ein Plugin einhalten muss.

---

## Inhaltsverzeichnis

1. [Enhanced App Lebenszyklus](#1-enhanced-app-lebenszyklus)
2. [Tile-Groessen Spezifikation](#2-tile-groessen-spezifikation)
3. [Datenvertrag: fetchStats Rueckgabe](#3-datenvertrag-fetchstats-rueckgabe)
4. [Widget-Komponenten Vertrag](#4-widget-komponenten-vertrag)
5. [Plugin Size Declaration Regeln](#5-plugin-size-declaration-regeln)
6. [Grid Layout Regeln](#6-grid-layout-regeln)
7. [Vollstaendiges Beispiel: Portainer Plugin](#7-vollstaendiges-beispiel-portainer-plugin)
8. [Validierung & Fehlerbehandlung](#8-validierung--fehlerbehandlung)
9. [Entity-Crawler (Optional)](#9-entity-crawler-optional)

---

## 1. Enhanced App Lebenszyklus

### Vom Plugin zur lebendigen Kachel

Ein Enhanced App durchlaeuft folgende Phasen, bevor Live-Daten auf dem Dashboard erscheinen:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: Registrierung (Server-Start)                                │
│                                                                       │
│  src/plugins/builtin/mein-plugin/index.ts                             │
│       │                                                               │
│       ▼                                                               │
│  src/plugins/registry.ts                                              │
│       │  validatePlugin() prueft Pflichtfelder                        │
│       │  Bei Erfolg: registry.set(id, plugin)                         │
│       │  Bei Fehler: console.error, Plugin wird ignoriert             │
│       ▼                                                               │
│  getPluginCatalog() stellt Plugin im "App hinzufuegen"-Dialog bereit  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: Konfiguration (User-Interaktion)                            │
│                                                                       │
│  TileDialog erkennt Plugin-Match via Titel-Eingabe (Fuzzy-Matching)   │
│       │                                                               │
│       ▼                                                               │
│  configFields generieren automatisch das Formular                     │
│       │                                                               │
│       ▼                                                               │
│  "Verbindung testen" → POST /api/enhanced/test                       │
│       │  Server ruft plugin.testConnection(config) auf                │
│       │  Ergebnis: { ok: boolean, message: string }                   │
│       │                                                               │
│       ▼  Bei Erfolg: connectionTested = true                          │
│                                                                       │
│  Auto-Crawl → POST /api/enhanced/crawl (falls Plugin crawlEntities   │
│       │  unterstuetzt). Gibt gruppierte Entity-Liste zurueck.         │
│       ▼                                                               │
│                                                                       │
│  Erst NACH erfolgreichem Test werden sichtbar:                        │
│    - Groessen-Selektor (supportedSizes)                               │
│    - Entity-Picker (wenn crawlEntities verfuegbar)                    │
│    - ODER: statOptions Checkboxen (wenn kein Crawler)                 │
│       │                                                               │
│       ▼                                                               │
│  Tile wird in DB gespeichert:                                         │
│    type="enhanced", enhancedType="plugin-id",                         │
│    enhancedConfig=JSON.stringify({apiUrl, apiKey, visibleStats,        │
│      selectedEntities, ...})                                          │
│    columnSpan/rowSpan je nach gewaehlter Groesse                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: Laufzeit (Polling-Loop)                                     │
│                                                                       │
│  TileGrid rendert <EnhancedTile> fuer type="enhanced"                 │
│       │                                                               │
│       ▼                                                               │
│  EnhancedTile startet Polling-Loop:                                   │
│    1. Sofortiger erster Fetch                                         │
│    2. setInterval(fetchStats, 30000)                                  │
│    3. visibilitychange Listener:                                      │
│       - Tab verborgen → clearInterval (Pause)                         │
│       - Tab sichtbar  → sofortiger Fetch + neuer Interval (Resume)    │
│       │                                                               │
│       ▼                                                               │
│  Client: GET /api/enhanced/{tileId}                                   │
│       │                                                               │
│       ▼                                                               │
│  API Route (Server):                                                  │
│    1. Tile aus DB laden (id, enhancedType, enhancedConfig)            │
│    2. Plugin aus Registry holen: getPlugin(enhancedType)              │
│    3. Config parsen: JSON.parse(enhancedConfig)                       │
│    4. plugin.fetchStats(config) aufrufen                              │
│    5. validateStats(rawStats) zur Absicherung                         │
│    6. Validierte Stats als JSON zurueckgeben                          │
│       │                                                               │
│       ▼                                                               │
│  EnhancedTile empfaengt Stats:                                       │
│    - status="ok"    → Stats an <Tile> weiterreichen                   │
│    - status="error" → Fehlerzustand anzeigen                          │
│    - status="loading" → Ladeanzeige (nur beim ersten Render)          │
│       │                                                               │
│       ▼                                                               │
│  Tile delegiert an die richtige Layout-Komponente:                    │
│    1x1 → SmallTileLayout  → <StatsDisplay size="small">              │
│    2x1 → MediumTileLayout → <StatsDisplay size="medium">             │
│    2x2 → LargeTileLayout  → <Widget> oder <StatsDisplay size="large">│
└─────────────────────────────────────────────────────────────────────────┘
```

### Datenfluss-Zusammenfassung

```
Plugin.fetchStats(config)
  → validateStats(rawResult)
    → JSON Response via /api/enhanced/[appId]
      → EnhancedTile (React State)
        → Tile (Layout-Auswahl)
          → StatsDisplay (Stats-Rendering)
          → WidgetComponent (Widget-Rendering, bei 2x1/2x2)
```

### Polling-Verhalten

| Eigenschaft | Wert |
|---|---|
| Standard-Intervall | 30 Sekunden (`pollInterval = 30000`) |
| Erster Fetch | Sofort bei Mount |
| Tab verborgen | Polling pausiert (`clearInterval`) |
| Tab wieder sichtbar | Sofortiger Fetch + neuer Interval |
| API Timeout | 5 Sekunden (`AbortSignal.timeout(5000)`) |
| Fehlerbehandlung | Stats wechseln zu `status: "error"`, naechster Poll versucht erneut |

### Warum ein API-Proxy?

`fetchStats` wird **immer serverseitig** ausgefuehrt, ueber die Route `/api/enhanced/[appId]`. Das hat drei Gruende:

1. **API-Keys bleiben verborgen** -- Der Browser sieht nie die Credentials
2. **Kein CORS** -- Server-zu-Server Requests unterliegen keinen Browser-Einschraenkungen
3. **Validierung** -- `validateStats()` schuetzt das Frontend vor fehlerhaften Plugin-Rueckgaben

---

## 2. Tile-Groessen Spezifikation

Das Dashboard unterstuetzt drei Tile-Groessen. Jede Groesse hat ein festes Layout, spezifische Stat-Limits und eigene Render-Regeln.

### 2.1 -- 1x1 (Klein): Kompakte Info-Kachel

```
┌──────────────────────┐
│  ●  [Status]     [⋮] │ ← OnlineIndicator + Pin + ContextMenu
│                      │
│      ┌────┐          │
│      │Icon│  48px    │ ← Zentriert
│      └────┘          │
│     App-Name         │ ← 1 Zeile, zentriert
│   Beschreibung       │ ← Optional, 1 Zeile, muted
│ ┌──────┬──────┐      │
│ │Stat 1│Stat 2│      │ ← Stats-Bereich (border-top)
│ └──────┴──────┘      │
└──────────────────────┘
```

**Grid:** 1 Spalte, 1 Zeile (140px Hoehe)

**Layout-Details:**
- Icon: zentriert, 48px, mit Hover-Effekt (scale + brightness)
- Titel: `text-sm font-medium`, zentriert, max 2 Zeilen (`line-clamp-2`)
- Beschreibung: `text-xs text-muted-foreground`, 1 Zeile, optional
- Stats-Bereich: horizontale Reihe am unteren Rand, `border-t border-border/30`

**Stats-Verhalten (1-3 Items):**

| Anzahl | Layout |
|--------|--------|
| 1 Stat | Zentriert unter dem Titel |
| 2 Stats | Zwei Spalten, gleichmaessig verteilt |
| 3 Stats | Drei Spalten, gleichmaessig verteilt |

**Jeder Stat zeigt:**
- **Wert:** `text-xs font-semibold tabular-nums` + optionale Einheit (`text-[10px] text-muted-foreground`)
- **Label:** `text-[9px] text-muted-foreground` darunter

**Farbzuweisung:**

| Farbe | CSS-Klasse | Verwendung |
|-------|------------|------------|
| `"green"` | `text-emerald-400` | Online, aktiv, positiv |
| `"red"` | `text-red-400` | Kritisch, offline, Fehler |
| `"yellow"` | `text-yellow-400` | Warnung (z.B. Speicher 70-85%) |
| `undefined` | `text-foreground` | Neutrale Werte (Standard) |

**renderHints fuer 1x1:**
```typescript
"1x1": { maxStats: 3, layout: "compact" }
```

---

### 2.2 -- 2x1 (Mittel): Breite Info-Kachel oder Mini-Widget

```
Variante A -- "Stats Mode" (layout: "detailed"):
┌──────────────────────────────────────────────┐
│  ● [Status]                             [⋮] │
│                                              │
│  ┌────┐  App-Name       Stat1 Stat2 Stat3   │
│  │Icon│  Beschreibung   Stat4 Stat5 Stat6   │
│  └────┘                                     │
└──────────────────────────────────────────────┘

Variante B -- "Mini-Widget Mode" (layout: "widget"):
┌──────────────────────────────────────────────┐
│  ● [Status]                             [⋮] │
│                                              │
│  ┌──── Widget-Area ────┐ ┌────┐             │
│  │                     │ │Icon│  App-Name    │
│  │  (Custom Content)   │ └────┘  Stat1 Stat2│
│  │                     │         Stat3       │
│  └─────────────────────┘                     │
└──────────────────────────────────────────────┘
```

**Grid:** 2 Spalten, 1 Zeile (140px Hoehe)

**Variante A -- Stats Mode (`layout: "detailed"`):**
- Standard-Layout fuer 2x1-Tiles ohne Widget-Komponente
- Icon (44px) + Titel/Beschreibung links, Stats rechts
- Stats in horizontaler Reihe, rechtsbuendig (`justify-end`)
- Bis zu 6 Stats sichtbar
- Jeder Stat: Wert (`text-xs font-bold`) + Label (`text-[9px]`) vertikal gestapelt

**Variante B -- Mini-Widget Mode (`layout: "widget"`):**
- Nur wenn `renderHints["2x1"].layout === "widget"` UND `widgetComponent` gesetzt
- Widget-Komponente erhaelt `size="2x1"` und entscheidet selbst ueber das Layout
- Widget bekommt die vollen `PluginStats` als Props

**Welche Variante wird gewaehlt?**
- Das Plugin entscheidet ueber `renderHints["2x1"].layout`
- `"detailed"` → Variante A (Stats Mode)
- `"widget"` → Variante B (Mini-Widget, erfordert `widgetComponent`)

**renderHints fuer 2x1:**
```typescript
// Variante A
"2x1": { maxStats: 6, layout: "detailed" }

// Variante B
"2x1": { maxStats: 6, layout: "widget", widgetComponent: "MeinWidget" }
```

---

### 2.3 -- 2x2 (Widget): Volle Widget-Kachel

```
Variante A -- "Standalone Widget" (layout: "widget"):
┌──────────────────────────────────────────────┐
│  ● Status │ 🔶 App-Name  [emby]        [⋮] │ ← Kompakter Header (40px)
│──────────────────────────────────────────────│
│                                              │
│            ┌─────────────────┐               │
│            │                 │               │
│            │  Widget-Area    │               │
│            │  (~240px)       │               │
│            │                 │               │
│            └─────────────────┘               │
│                                              │
└──────────────────────────────────────────────┘

Variante B -- "Stats Grid" (layout: "detailed", kein Widget):
┌──────────────────────────────────────────────┐
│  ● │ 🔶 App-Name          [emby]       [⋮] │
│──────────────────────────────────────────────│
│                                              │
│  STAT 1     STAT 2     STAT 3               │
│  Label      Label      Label                │
│                                              │
│  STAT 4     STAT 5     STAT 6               │
│  Label      Label      Label                │
│                                              │
│  ████████████████████░░░░░  72%             │ ← Optionale Progress-Bar
│                                              │
└──────────────────────────────────────────────┘
```

**Grid:** 2 Spalten, 2 Zeilen (288px Hoehe inkl. 8px Gap)

**Header-Zeile (beide Varianten):**
- Kompakte Toolbar: OnlineIndicator + Icon (32px) + Titel (`text-sm font-semibold`) + Plugin-Badge + Pin
- Hoehe: ca. 40px (`flex items-center gap-3 mb-3`)

**Variante A -- Standalone Widget (`layout: "widget"`):**
- Widget-Komponente fuellt den gesamten restlichen Raum (~240px)
- Widget rendert seinen eigenen Header via `<WidgetHeader>` (s. Widget-Vertrag)
- Tile-Komponente rendert nur den Glass-Card-Rahmen + ContextMenu
- Widget bekommt `size="2x2"` als Prop

**Variante B -- Stats Grid (`layout: "detailed"`):**
- 3x2 Grid fuer bis zu 6 Stats (`grid-cols-3 gap-x-4 gap-y-3`)
- Groessere Darstellung als 1x1: Label (`text-[10px] uppercase tracking-wide`) + Wert (`text-base font-bold`)
- Automatische Progress-Bar: wenn ein Stat-Wert auf `%` endet, wird eine Fortschrittsanzeige gerendert
  - `> 85%`: rot
  - `> 70%`: gelb
  - `<= 70%`: gruen

**renderHints fuer 2x2:**
```typescript
// Variante A (empfohlen fuer komplexe Plugins)
"2x2": {
  maxStats: 4,
  layout: "widget",
  widgetComponent: "EmbyWidget",
  features: ["streamList", "recentlyAdded", "libraryBreakdown"]
}

// Variante B (einfachere Plugins ohne eigene Widget-Komponente)
"2x2": { maxStats: 6, layout: "detailed" }
```

---

## 3. Datenvertrag: fetchStats Rueckgabe

### PluginStats -- Das Rueckgabe-Objekt

```typescript
interface PluginStats {
  items: StatItem[];         // Array der Stat-Werte (max 6, validiert)
  status: "ok" | "error";   // Gesamtstatus der Abfrage
  error?: string;            // Fehlermeldung (nur bei status: "error")
}
```

### StatItem -- Einzelner Statistik-Wert

```typescript
interface StatItem {
  label: string;             // Anzeige-Label (Deutsch, kurz). Beispiel: "Belegt", "Streams"
  value: string | number;    // Der eigentliche Wert. Beispiel: "72%", 42, "3d 12h"
  unit?: string;             // Optionale Einheit. Beispiel: "GB", "%", "MB/s"
  icon?: string;             // Optionaler Lucide-Icon-Name. Beispiel: "HardDrive"
  color?: string;            // Farbhinweis: "green" | "red" | "yellow" | "blue" | undefined
}
```

### Regeln fuer die Stats-Rueckgabe

**Das Plugin gibt ALLE verfuegbaren Stats zurueck.** Die Selektion geschieht in mehreren Stufen:

```
Plugin.fetchStats()
  │  Gibt z.B. 4 Items zurueck (gefiltert nach visibleStats)
  ▼
validateStats()
  │  Validiert jedes Item (label + value Pflicht)
  │  Schneidet auf max 6 Items ab
  │  Filtert ungueltige Items heraus
  ▼
StatsDisplay
  │  Sliced nach Groesse:
  │    small:  items.slice(0, 3)
  │    medium: items.slice(0, 6)
  │    large:  items.slice(0, 6)
  ▼
Anzeige auf dem Tile
```

**Wichtig -- Reihenfolge bestimmt Prioritaet:**
- Die ersten Items im Array werden auf kleinen Tiles angezeigt
- Ein 1x1-Tile zeigt nur die ersten 3 Stats
- Platziere die wichtigsten Stats immer am Anfang

**Config-Formate fuer Entity-Auswahl:**

Es gibt zwei Formate, ueber die ein Plugin erfahren kann, welche Datenquellen der User ausgewaehlt hat:

| Format | Config-Key | Beschreibung |
|---|---|---|
| `selectedEntities` | `config.selectedEntities` | JSON-String: `[{id: "sensor.temp", label: "Temperatur"}, ...]`. Neues Format, vom Entity-Picker erzeugt. |
| `entityIds` | `config.entityIds` | Legacy-Textformat: `"entity_id:Label"` pro Zeile oder kommasepariert. |

Plugins die `crawlEntities` unterstuetzen, sollten **beide Formate** lesen (Abwaertskompatibilitaet). Das Home Assistant Plugin zeigt das Muster:

```typescript
// Neues Format zuerst pruefen
let entries = [];
if (config.selectedEntities) {
  entries = JSON.parse(String(config.selectedEntities));
}
// Fallback auf Legacy
if (entries.length === 0 && config.entityIds) {
  entries = parseEntityIdsLegacy(config.entityIds);
}
```

**visibleStats-Pattern:**

Der User waehlt im TileDialog, welche Stats sichtbar sein sollen. Diese Auswahl kommt als JSON-String in `config.visibleStats` an. Das Plugin muss sie respektieren:

```typescript
async fetchStats(config: PluginConfig): Promise<PluginStats> {
  // 1. Gewaehlte Stats laden oder Defaults verwenden
  const visibleStats: string[] = config.visibleStats
    ? JSON.parse(config.visibleStats as string)
    : this.statOptions
        .filter((o) => o.defaultEnabled)
        .map((o) => o.key);

  // 2. Nur angefragte Stats sammeln
  const items: StatItem[] = [];

  if (visibleStats.includes("usage")) {
    items.push({ label: "Belegt", value: "72%", color: "yellow" });
  }

  if (visibleStats.includes("free")) {
    items.push({ label: "Frei", value: "1.2", unit: "TB" });
  }

  // 3. Zurueckgeben -- NICHT selbst slicen!
  //    Der Validator und StatsDisplay uebernehmen das Slicing
  return { items, status: "ok" };
}
```

### EnhancedStats -- Client-seitige Erweiterung

Auf dem Client wird `PluginStats` zu `EnhancedStats` erweitert, das einen zusaetzlichen `"loading"`-Status kennt:

```typescript
interface EnhancedStats {
  items: StatItem[];
  status: "ok" | "error" | "loading";  // "loading" existiert nur auf dem Client
  error?: string;
}
```

Der `"loading"`-Status wird nur beim initialen Render gesetzt, bevor der erste API-Response eintrifft.

---

## 4. Widget-Komponenten Vertrag

### WidgetProps -- Die Schnittstelle

Jede Widget-Komponente erhaelt exakt diese Props:

```typescript
interface WidgetProps {
  stats: EnhancedStats;                    // Aktuelle Stats (kann loading/error/ok sein)
  config: Record<string, unknown>;         // Geparste Tile-Konfiguration
  tileId: number;                          // ID des Tiles in der DB
  size: "2x1" | "2x2";                    // Aktuelle Groesse des Tiles
  onAction?: (action: string, payload?: unknown) => void;  // Optionale Action-Callbacks
}
```

### Widget-Regeln

1. **`"use client"` ist Pflicht.** Widget-Komponenten sind React Client Components.

2. **Alle drei Zustaende behandeln:**
   ```typescript
   export function MeinWidget({ stats, size }: WidgetProps) {
     if (stats.status === "loading") return <WidgetLoading />;
     if (stats.status === "error") return <WidgetError error={stats.error} />;
     // ... normales Rendering
   }
   ```

3. **KEINE eigenen API-Calls.** Widgets empfangen Daten ausschliesslich ueber die `stats`-Prop. Der Polling-Loop in `EnhancedTile` liefert die Daten.

4. **Groessen-Varianten via `size`-Prop:**
   ```typescript
   export function MeinWidget(props: WidgetProps) {
     if (props.size === "2x2") return <MeinWidget2x2 {...props} />;
     return <MeinWidgetDefault {...props} />;
   }
   ```

5. **Shared Components verwenden.** Fuer einheitliches Aussehen:
   - `<WidgetHeader>` aus `src/components/widgets/shared/WidgetHeader.tsx`
     - Props: `icon`, `iconColor`, `title`, `subtitle?`, `status?`, `children?`
     - Rendert: Status-Dot + Icon + Titel + optionale Aktionen
     - Feste Hoehe: `h-10` (40px), `border-b border-border/30`

6. **Registrierung in der Widget-Registry:**
   ```typescript
   // src/components/widgets/registry.ts
   import { MeinWidget } from "./mein-plugin/MeinWidget";
   registerWidget("MeinWidget", MeinWidget);
   ```

7. **Name muss mit `renderHints.widgetComponent` uebereinstimmen:**
   ```typescript
   // Im Plugin:
   renderHints: {
     "2x2": { layout: "widget", widgetComponent: "MeinWidget", ... }
   }

   // In der Registry:
   registerWidget("MeinWidget", MeinWidget);  // Gleicher String!
   ```

### Widget-Aufloesung zur Laufzeit

```typescript
// EnhancedTile.tsx -- vereinfachte Logik:
const plugin = getPlugin(tile.enhancedType);
const hint = plugin.renderHints[size];

if (hint?.layout === "widget" && hint.widgetComponent) {
  const WidgetComponent = getWidget(hint.widgetComponent);
  // WidgetComponent wird als `widget`-Prop an <Tile> weitergereicht
}
```

Wenn `layout !== "widget"` oder kein `widgetComponent` gesetzt ist, faellt das Tile auf `<StatsDisplay>` zurueck -- es wird nie ein leerer Widget-Bereich angezeigt.

### Widget-Dateistruktur

```
src/components/widgets/
  registry.ts                    # Zentrale Widget-Registry
  shared/
    WidgetHeader.tsx              # Gemeinsamer Widget-Header
  emby/
    EmbyWidget.tsx               # Emby Widget (2x1 + 2x2 Varianten)
  mein-plugin/                   # ← Neues Widget hier anlegen
    MeinWidget.tsx
```

---

## 5. Plugin Size Declaration Regeln

### supportedSizes -- Was das Plugin kann

```typescript
supportedSizes: TileSize[]  // z.B. ["1x1", "2x1", "2x2"]
```

| Deklaration | Verhalten im TileDialog | Beschreibung |
|---|---|---|
| `["1x1"]` | Kein Groessen-Selektor | Immer 1x1, einfachste Form |
| `["1x1", "2x1"]` | 2 Optionen: Klein / Mittel | Stats-Erweiterung, kein Widget noetig |
| `["1x1", "2x1", "2x2"]` | 3 Optionen: Klein / Mittel / Gross | Volle Widget-Unterstuetzung |
| `["1x1", "2x2"]` | 2 Optionen: Klein / Gross | Ueberspringt 2x1, direkt zum Widget |

### Pflichtregeln

1. **`"1x1"` ist Pflicht.** Jedes Plugin MUSS mindestens `"1x1"` in `supportedSizes` haben.
2. **Standard-Apps sind immer 1x1.** Nur Tiles mit `type="enhanced"` koennen groessere Groessen haben.
3. **Keine Groesse ohne renderHints.** Jede deklarierte Groesse MUSS einen Eintrag in `renderHints` haben.
4. **Widget-Groessen brauchen Widget-Komponenten.** Wenn `renderHints[size].layout === "widget"`, muss `widgetComponent` gesetzt und die Komponente in der Registry registriert sein.

### Groessen-Mapping auf Grid-Spans

| TileSize | `columnSpan` | `rowSpan` | Pixel (bei gridAutoRows: 140px) |
|---|---|---|---|
| `"1x1"` | 1 | 1 | ~1 Spalte x 140px |
| `"2x1"` | 2 | 1 | ~2 Spalten x 140px |
| `"2x2"` | 2 | 2 | ~2 Spalten x 288px (140+8+140) |

---

## 6. Grid Layout Regeln

### Dashboard-Grid Konfiguration

```typescript
// TileGrid.tsx
style={{
  gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
  gridAutoRows: "140px",
}}
```

| Eigenschaft | Wert |
|---|---|
| Spaltenanzahl | Konfigurierbar: 4-8 Spalten (Standard: 5) |
| Zeilenhoehe | 140px (`gridAutoRows`) |
| Gap | 16px (`gap-4`) |
| Maximale Tile-Breite | 2 Spalten |
| Maximale Tile-Hoehe | 2 Zeilen |

### Responsive Breakpoints

```css
/* Desktop: konfigurierte Spaltenanzahl */
grid-template-columns: repeat(gridColumns, minmax(0, 1fr));

/* Tablet (< 1024px): 3 Spalten */
@media (max-width: 1023px) {
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
}

/* Mobile (< 640px): 2 Spalten */
@media (max-width: 639px) {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}
```

### Positionierung

- **CSS Grid Auto-Placement** uebernimmt die Positionierung
- Tiles werden in der Reihenfolge ihrer `order`-Property platziert
- Groessere Tiles (`columnSpan > 1` / `rowSpan > 1`) setzen `gridColumn: span X` / `gridRow: span X`
- Drag-and-Drop via `@dnd-kit/react` ermoeglicht Umsortierung

### Groessen-Einschraenkungen

- **Kein Tile darf breiter als 2 Spalten sein.** Das Grid erlaubt maximal `span 2`.
- **Kein Tile darf hoeher als 2 Zeilen sein.** Maximum ist `span 2`.
- **Auf Mobile (2 Spalten):** Ein 2x1-Tile fuellt die volle Breite.
- **2x2-Tiles auf Mobile:** Belegen die volle Breite und 2 Zeilen Hoehe.

---

## 7. Vollstaendiges Beispiel: Portainer Plugin

Dieses Beispiel zeigt Schritt fuer Schritt, wie ein neues Enhanced App von Grund auf implementiert wird.

### Schritt 1: Plugin-Datei anlegen

```
src/plugins/builtin/portainer/index.ts
```

### Schritt 2: Plugin implementieren

```typescript
import type { AppPlugin, PluginConfig, PluginStats } from "../../types";

export const portainerPlugin: AppPlugin = {
  // ── Metadata ───────────────────────────────────────────────────────
  metadata: {
    id: "portainer",
    name: "Portainer",
    icon: "Portainer",
    color: "#13bef9",
    description: "Zeigt an: Laufende Container, gestoppte Container, Volumes",
    category: "System",
    website: "https://www.portainer.io",
  },

  // ── Config-Felder (generieren das Formular im TileDialog) ─────────
  configFields: [
    {
      key: "apiUrl",
      label: "Portainer URL",
      type: "url",
      placeholder: "http://portainer.local:9000",
      required: true,
      description: "Die URL deiner Portainer Instanz",
    },
    {
      key: "apiKey",
      label: "API Token",
      type: "password",
      required: true,
      description: "API Token aus Portainer: Mein Account → Zugangstoken",
    },
    {
      key: "environmentId",
      label: "Umgebungs-ID",
      type: "number",
      placeholder: "1",
      required: false,
      min: 1,
      description: "ID der Umgebung (Standard: 1)",
    },
  ],

  // ── Stat-Optionen (User waehlt im TileDialog) ─────────────────────
  statOptions: [
    {
      key: "running",
      label: "Laufend",
      description: "Anzahl laufender Container",
      defaultEnabled: true,
    },
    {
      key: "stopped",
      label: "Gestoppt",
      description: "Anzahl gestoppter Container",
      defaultEnabled: true,
    },
    {
      key: "volumes",
      label: "Volumes",
      description: "Anzahl der Docker Volumes",
      defaultEnabled: false,
    },
    {
      key: "images",
      label: "Images",
      description: "Anzahl der Docker Images",
      defaultEnabled: false,
    },
    {
      key: "networks",
      label: "Netzwerke",
      description: "Anzahl der Docker Networks",
      defaultEnabled: false,
    },
    {
      key: "stacks",
      label: "Stacks",
      description: "Anzahl der Portainer Stacks",
      defaultEnabled: true,
    },
  ],

  // ── Unterstuetzte Groessen ─────────────────────────────────────────
  supportedSizes: ["1x1", "2x1", "2x2"],

  // ── Render-Hinweise pro Groesse ────────────────────────────────────
  renderHints: {
    "1x1": { maxStats: 3, layout: "compact" },
    "2x1": { maxStats: 6, layout: "detailed", features: ["containerList"] },
    "2x2": {
      maxStats: 4,
      layout: "widget",
      widgetComponent: "PortainerWidget",
      features: ["containerList", "resourceUsage", "stackOverview"],
    },
  },

  // ── fetchStats: Kernfunktion, wird alle 30s aufgerufen ─────────────
  async fetchStats(config: PluginConfig): Promise<PluginStats> {
    try {
      // 1. visibleStats parsen
      const visibleStats: string[] = config.visibleStats
        ? JSON.parse(config.visibleStats as string)
        : this.statOptions
            .filter((o) => o.defaultEnabled)
            .map((o) => o.key);

      const baseUrl = String(config.apiUrl || "").replace(/\/$/, "");
      const envId = Number(config.environmentId || 1);
      const headers: HeadersInit = {
        "X-API-Key": String(config.apiKey || ""),
      };

      // 2. Parallele API-Calls
      const [containersRes, volumesRes, imagesRes, networksRes] =
        await Promise.all([
          fetch(`${baseUrl}/api/endpoints/${envId}/docker/containers/json?all=true`, {
            headers,
            signal: AbortSignal.timeout(5000),
          }),
          fetch(`${baseUrl}/api/endpoints/${envId}/docker/volumes`, {
            headers,
            signal: AbortSignal.timeout(5000),
          }),
          fetch(`${baseUrl}/api/endpoints/${envId}/docker/images/json`, {
            headers,
            signal: AbortSignal.timeout(5000),
          }),
          fetch(`${baseUrl}/api/endpoints/${envId}/docker/networks`, {
            headers,
            signal: AbortSignal.timeout(5000),
          }),
        ]);

      const items = [];

      // 3. Container-Stats
      if (containersRes.ok) {
        const containers = await containersRes.json();
        const running = containers.filter(
          (c: { State: string }) => c.State === "running"
        ).length;
        const stopped = containers.length - running;

        if (visibleStats.includes("running")) {
          items.push({
            label: "Laufend",
            value: running,
            color: running > 0 ? "green" : undefined,
          });
        }
        if (visibleStats.includes("stopped")) {
          items.push({
            label: "Gestoppt",
            value: stopped,
            color: stopped > 0 ? "red" : undefined,
          });
        }
      }

      // 4. Volumes
      if (visibleStats.includes("volumes") && volumesRes.ok) {
        const data = await volumesRes.json();
        items.push({
          label: "Volumes",
          value: Array.isArray(data.Volumes) ? data.Volumes.length : 0,
        });
      }

      // 5. Images
      if (visibleStats.includes("images") && imagesRes.ok) {
        const images = await imagesRes.json();
        items.push({ label: "Images", value: images.length });
      }

      // 6. Networks
      if (visibleStats.includes("networks") && networksRes.ok) {
        const networks = await networksRes.json();
        items.push({ label: "Netzwerke", value: networks.length });
      }

      // 7. Stacks (separater Endpoint)
      if (visibleStats.includes("stacks")) {
        try {
          const stacksRes = await fetch(
            `${baseUrl}/api/stacks?filters={"EndpointID":${envId}}`,
            { headers, signal: AbortSignal.timeout(5000) }
          );
          if (stacksRes.ok) {
            const stacks = await stacksRes.json();
            items.push({ label: "Stacks", value: stacks.length });
          }
        } catch {
          // Stacks sind optional -- bei Fehler ignorieren
        }
      }

      return { items, status: "ok" };
    } catch (err) {
      return { items: [], status: "error", error: (err as Error).message };
    }
  },

  // ── testConnection: Schneller Verbindungstest ──────────────────────
  async testConnection(
    config: PluginConfig
  ): Promise<{ ok: boolean; message: string }> {
    try {
      const baseUrl = String(config.apiUrl || "").replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/system/status`, {
        headers: {
          "X-API-Key": String(config.apiKey || ""),
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        return {
          ok: false,
          message: `HTTP ${res.status}: Zugriff verweigert. Pruefe den API Token.`,
        };
      }
      const info = await res.json();
      return {
        ok: true,
        message: `Verbunden mit Portainer v${info.Version || "?"}`,
      };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  },

  // ── crawlEntities (Optional): Listet verfuegbare Container ──────────
  async crawlEntities(config: PluginConfig) {
    const baseUrl = String(config.apiUrl || "").replace(/\/$/, "");
    const envId = Number(config.environmentId || 1);
    const headers: HeadersInit = { "X-API-Key": String(config.apiKey || "") };

    const res = await fetch(
      `${baseUrl}/api/endpoints/${envId}/docker/containers/json?all=true`,
      { headers, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const containers = await res.json();

    // Group by state (running / stopped)
    const running = containers
      .filter((c: { State: string }) => c.State === "running")
      .map((c: { Id: string; Names: string[]; State: string }) => ({
        id: c.Id.substring(0, 12),
        name: c.Names[0]?.replace(/^\//, "") || c.Id.substring(0, 12),
        state: c.State,
      }));
    const stopped = containers
      .filter((c: { State: string }) => c.State !== "running")
      .map((c: { Id: string; Names: string[]; State: string }) => ({
        id: c.Id.substring(0, 12),
        name: c.Names[0]?.replace(/^\//, "") || c.Id.substring(0, 12),
        state: c.State,
      }));

    return {
      groups: [
        { domain: "running", label: "Laufend", icon: "Play", entities: running },
        { domain: "stopped", label: "Gestoppt", icon: "Square", entities: stopped },
      ].filter(g => g.entities.length > 0),
    };
  },
};
```

### Schritt 3: Plugin registrieren

In `src/plugins/registry.ts`:

```typescript
import { portainerPlugin } from "./builtin/portainer";

const builtinPlugins: AppPlugin[] = [
  embyPlugin,
  // ... bestehende Plugins ...
  portainerPlugin,  // ← Hier einfuegen
];
```

### Schritt 4: ICON_MAP Eintrag

In `src/lib/icons.ts`:

```typescript
const ICON_MAP: Record<string, string> = {
  // ... bestehende ...
  "Portainer": "Portainer",
};
```

### Schritt 5 (Optional): Widget-Komponente erstellen

Nur noetig wenn `renderHints` ein `widgetComponent` referenziert.

Datei: `src/components/widgets/portainer/PortainerWidget.tsx`

```typescript
"use client";

import type { WidgetProps } from "../registry";
import { WidgetHeader } from "../shared/WidgetHeader";
import { Container, Square, Play } from "lucide-react";

function PortainerWidget2x2({ stats }: WidgetProps) {
  const items = stats.items;

  return (
    <div className="flex flex-col h-full">
      <WidgetHeader
        icon="Container"
        iconColor="#13bef9"
        title="Portainer"
        subtitle="Container-Verwaltung"
        status={stats.status === "ok" ? "online" : stats.status === "error" ? "offline" : "unknown"}
      />
      <div className="flex-1 p-3">
        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 h-full">
            {items.slice(0, 4).map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg bg-muted/20 p-3"
              >
                <span className="text-lg font-bold tabular-nums">
                  {item.value}
                  {item.unit && (
                    <span className="text-xs font-normal text-muted-foreground ml-0.5">
                      {item.unit}
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Keine Daten
          </div>
        )}
      </div>
    </div>
  );
}

export function PortainerWidget(props: WidgetProps) {
  if (props.size === "2x2") return <PortainerWidget2x2 {...props} />;
  // Fallback fuer 2x1 -- nur Stats anzeigen
  return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
      Portainer
    </div>
  );
}
```

### Schritt 6: Widget registrieren

In `src/components/widgets/registry.ts`:

```typescript
import { PortainerWidget } from "./portainer/PortainerWidget";
registerWidget("PortainerWidget", PortainerWidget);
```

### Schritt 7: Testen

```bash
npm run build          # Muss ohne Fehler kompilieren
npm run dev            # Dashboard starten

# Im Dashboard:
# 1. "+" klicken → "Portainer" eintippen
# 2. Auto-Detection fuellt Icon, Farbe, Beschreibung
# 3. URL + API Token eingeben
# 4. "Verbindung testen" → Erfolgsmeldung
# 5. Stats und Groesse waehlen → Speichern
# 6. Tile erscheint mit Live-Daten
```

---

## 8. Validierung & Fehlerbehandlung

### Plugin-Validierung beim Laden

Beim Modulstart wird jedes Plugin durch `validatePlugin()` geprueft. Fehlerhafte Plugins werden **nicht registriert** und erscheinen nicht im Dashboard.

```typescript
// Geprueft durch validatePlugin():
function validatePlugin(plugin: AppPlugin): string[] {
  // ✓ metadata existiert
  // ✓ metadata.id ist ein non-empty String
  // ✓ metadata.name ist ein non-empty String
  // ✓ metadata.color ist ein gueltiger Hex-Code (#XXXXXX)
  // ✓ configFields ist ein Array
  // ✓ supportedSizes ist non-empty, enthaelt nur "1x1", "2x1", "2x2"
  // ✓ fetchStats ist eine Funktion
  // ✓ testConnection ist eine Funktion
}
```

**Fehlerhafte Plugins produzieren eine Konsolenwarnung:**
```
Plugin "mein-service" failed validation: ["metadata.color must be a valid hex color (#XXXXXX)"]
```

### Stats-Validierung zur Laufzeit

Jede `fetchStats`-Rueckgabe durchlaeuft `validateStats()` bevor sie den Client erreicht:

```typescript
function validateStats(raw: unknown): PluginStats {
  // 1. Ist raw ein Objekt? → Sonst: { items: [], status: "error" }
  // 2. Hat raw.items ein Array? → Sonst: { items: [], status: "error" }
  // 3. Fuer jedes Item in items (max 6):
  //    - label muss ein non-empty String sein
  //    - value muss ein String oder Number sein
  //    - Ungueltige Items werden GEFILTERT, nicht abgebrochen
  // 4. unit, icon, color werden nur uebernommen wenn sie Strings sind
}
```

**Kernprinzip:** Das Dashboard bricht NIE wegen fehlerhafter Plugin-Daten. Ungueltige Stats werden stillschweigend entfernt, und das Tile zeigt die verbleibenden gueltigen Stats an.

### Max-Item-Limit

```typescript
const MAX_STAT_ITEMS = 6;

// In validateStats:
for (const entry of obj.items.slice(0, MAX_STAT_ITEMS)) {
  // ...
}
```

Ein Plugin kann theoretisch 100 Items zurueckgeben -- der Validator schneidet auf 6 ab. Das StatsDisplay schneidet dann nochmals basierend auf der Tile-Groesse:
- 1x1: max 3
- 2x1: max 6
- 2x2: max 6

### Fetch-Timeout

**Alle API-Calls muessen `AbortSignal.timeout(5000)` verwenden.** Das verhindert, dass ein nicht erreichbarer Service den gesamten Polling-Loop blockiert.

```typescript
// Richtig:
const res = await fetch(url, {
  headers,
  signal: AbortSignal.timeout(5000),
});

// FALSCH -- kein Timeout:
const res = await fetch(url, { headers });
```

### Fehlerbehandlung in fetchStats

```typescript
async fetchStats(config: PluginConfig): Promise<PluginStats> {
  try {
    // ... API-Calls ...
    return { items, status: "ok" };
  } catch (err) {
    // PFLICHT: Fehler als PluginStats zurueckgeben, NICHT werfen
    return {
      items: [],
      status: "error",
      error: (err as Error).message,
    };
  }
}
```

**Regeln:**
- `fetchStats` darf NIEMALS eine Exception nach aussen werfen
- Netzwerkfehler, Timeouts, JSON-Parse-Fehler -- alles muss gefangen werden
- Die `error`-Nachricht wird dem User in der Fehleranzeige gezeigt
- Der naechste Polling-Zyklus (30s spaeter) versucht es automatisch erneut

### testConnection Fehlermeldungen

`testConnection` muss **klare, deutsche Fehlermeldungen** zurueckgeben:

```typescript
// Gut:
{ ok: false, message: "HTTP 401: Zugriff verweigert. Pruefe den API Key." }
{ ok: false, message: "Server nicht erreichbar. Pruefe die URL." }

// Schlecht:
{ ok: false, message: "fetch failed" }
{ ok: false, message: "ECONNREFUSED" }
```

---

## 9. Entity-Crawler (Optional)

### Zweck

Manche Plugins verbinden sich mit Diensten, die eine grosse Anzahl von Datenquellen bereitstellen -- z.B. Home Assistant (Entities), Portainer (Container), Proxmox (VMs). Der Entity-Crawler erlaubt dem TileDialog, diese Datenquellen automatisch aufzulisten, sodass der User sie bequem per Checkbox auswaehlen kann, statt IDs manuell einzutippen.

### Wann implementieren?

Implementiere `crawlEntities` nur, wenn:
- Die API des Dienstes eine Liste von einzeln adressierbaren Datenquellen zurueckgeben kann
- Der User normalerweise eine Teilmenge davon auf seinem Tile sehen moechte
- Ohne Crawler muesste der User IDs manuell kopieren (schlechte UX)

**Gute Kandidaten:** Home Assistant (Entities), Portainer/Docker (Container), Proxmox (VMs/LXCs), Pi-hole (Blockierlisten)

**Nicht sinnvoll:** Emby (Streams sind dynamisch), Dienste mit festen System-/Firewall-Stats

### Interface

```typescript
// In AppPlugin (src/plugins/types.ts):
crawlEntities?(config: PluginConfig): Promise<{ groups: CrawlEntityGroup[] }>;

interface CrawlEntityGroup {
  domain: string;     // Technischer Schluessel (z.B. "sensor", "light", "running")
  label: string;      // Deutsche Anzeige (z.B. "Sensoren", "Lichter", "Laufend")
  icon: string;       // Lucide-Icon-Name (z.B. "Activity", "Lightbulb")
  entities: Array<{
    id: string;        // Eindeutige Entity-ID (z.B. "sensor.temperature_wohnzimmer")
    name: string;      // Friendly Name (z.B. "Temperatur Wohnzimmer")
    state: string;     // Aktueller Wert/Status (z.B. "22.5", "on")
  }>;
}
```

### API-Endpunkt

```
POST /api/enhanced/crawl
Body: { enhancedType: string, config: PluginConfig }
Response: { success: true, groups: CrawlEntityGroup[] }
       | { success: false, error: string }
```

Der Endpunkt (`src/app/api/enhanced/crawl/route.ts`) prueft:
1. Plugin existiert in der Registry
2. Plugin hat `crawlEntities`-Methode
3. Ruft `plugin.crawlEntities(config)` auf und gibt das Ergebnis zurueck

### TileDialog-Integration: "Test → Crawl → Pick"

Der TileDialog folgt einem strikten Ablauf:

```
1. User gibt Credentials ein (apiUrl, apiKey, ...)
2. User klickt "Verbindung testen"
   → POST /api/enhanced/test
   → Erfolg: connectionTested = true
3. Automatischer Crawl-Versuch
   → POST /api/enhanced/crawl
   → Erfolg: crawledGroups werden gesetzt, Entity-Picker erscheint
   → Fehler: Kein Entity-Picker, statOption-Checkboxen als Fallback
4. Groessen-Selektor + Entity-Picker/Stats erscheinen
5. User waehlt Entities / Stats und Groesse
6. Speichern: selectedEntities als JSON in enhancedConfig
```

**Wichtig:** Wenn sich die Credentials aendern (apiUrl, apiKey, accessToken), wird `connectionTested` zurueckgesetzt und der User muss erneut testen.

### Entity-Picker UI

Der Entity-Picker zeigt die gecrawlten Entities gruppiert nach Domain an:

- Gruppen sind per Default eingeklappt (klick zum Aufklappen)
- Suchfeld filtert Entities nach Name
- Checkboxen respektieren das Limit der aktuellen Tile-Groesse (z.B. max 3 bei 1x1)
- Ausgewaehlte Entities werden als `selectedEntities` JSON-String gespeichert

### fetchStats mit selectedEntities

Das Plugin muss in `fetchStats` beide Formate unterstuetzen:

```typescript
async fetchStats(config: PluginConfig): Promise<PluginStats> {
  // 1. Neues Format pruefen (vom Entity-Picker)
  let entityEntries: { id: string; customLabel?: string }[] = [];
  if (config.selectedEntities) {
    const parsed = JSON.parse(String(config.selectedEntities));
    entityEntries = parsed.map((e: { id: string; label?: string }) => ({
      id: e.id, customLabel: e.label,
    }));
  }

  // 2. Fallback auf Legacy-Format (entityIds Textfeld)
  if (entityEntries.length === 0 && config.entityIds) {
    entityEntries = parseLegacyEntityIds(config.entityIds);
  }

  // 3. Wenn keine Entities konfiguriert: System-Defaults anzeigen
  if (entityEntries.length === 0) {
    return fetchDefaultStats(config);
  }

  // 4. Ausgewaehlte Entities abrufen und als StatItems zurueckgeben
  // ...
}
```

### Referenz-Implementierung

Das Portainer-Beispiel oben zeigt eine vollstaendige Implementierung mit `crawlEntities`. Plugins mit Entity-Crawling sollten beide Formate (`selectedEntities` JSON und `entityIds` Legacy) in `fetchStats` unterstuetzen.

---

## Anhang: Checkliste fuer neue Plugins

Vor dem Einreichen eines neuen Plugins muessen alle Punkte erfuellt sein:

- [ ] Plugin kompiliert fehlerfrei (`npm run build`)
- [ ] `metadata.id` ist eindeutig und in kebab-case
- [ ] `metadata.icon` existiert auf [simpleicons.org](https://simpleicons.org)
- [ ] `metadata.color` ist die offizielle Brand-Farbe (Hex `#XXXXXX`)
- [ ] `metadata.description` ist auf Deutsch und beschreibt die angezeigten Daten
- [ ] `configFields` haben deutsche Labels und Beschreibungen
- [ ] `statOptions` hat mindestens eine Option mit `defaultEnabled: true`
- [ ] `supportedSizes` enthaelt mindestens `"1x1"`
- [ ] `renderHints` hat einen Eintrag fuer jede deklarierte Groesse
- [ ] `fetchStats` verwendet `AbortSignal.timeout(5000)` fuer alle Requests
- [ ] `fetchStats` respektiert `config.visibleStats`
- [ ] `fetchStats` faengt alle Fehler und gibt `{ status: "error", ... }` zurueck
- [ ] `testConnection` gibt verstaendliche deutsche Meldungen zurueck
- [ ] Plugin ist in `src/plugins/registry.ts` importiert und registriert
- [ ] ICON_MAP Eintrag in `src/lib/icons.ts` vorhanden
- [ ] Falls Widget: Komponente erstellt und in `src/components/widgets/registry.ts` registriert
- [ ] Falls crawlEntities: Methode implementiert und Rueckgabe-Format geprueft (groups mit domain/label/icon/entities)
- [ ] Falls crawlEntities: `fetchStats` unterstuetzt sowohl `selectedEntities` (JSON) als auch `entityIds` (Legacy)
- [ ] Manuell getestet: App hinzufuegen, Verbindung testen, Stats werden korrekt angezeigt
