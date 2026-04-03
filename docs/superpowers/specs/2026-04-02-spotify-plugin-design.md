# Spotify Plugin — Design Spec

## Kontext

Das Dominion Dashboard soll ein Spotify-Plugin bekommen, das als Fernbedienung für die aktive Spotify-Wiedergabe des Users dient. Der User kann Playback steuern (Play/Pause/Skip), Song-Infos mit Album-Cover sehen, Lautstärke regeln, zwischen Geräten wechseln und Songs liken. Zusätzlich zeigt das Plugin Library-Statistiken (gespeicherte Songs, Playlists, Top-Artists). Spotify ist damit nach Emby die zweite vollständige Enhanced App mit Widget-Support.

## Übersicht

- **Plugin-ID:** `spotify`
- **Kategorie:** Media
- **Icon:** Spotify (simple-icons, bereits gemapped in `src/lib/icons.ts`)
- **Farbe:** `#1DB954`
- **Typ:** Fernbedienung (Web API only, kein Playback SDK)
- **Auth:** OAuth 2.0 Authorization Code Flow (PKCE)

## Tile-Größen & Layouts

### 1×1 — Compact Stats (kein Widget)

Drei konfigurierbare Anzeige-Modi, wählbar als `displayMode` ConfigField:

**Modus A — Library Stats:**
- Stat 1: ♡ Titel (Anzahl gespeicherter Songs)
- Stat 2: Playlists (Anzahl eigener Playlists)
- Stat 3: Künstler (Anzahl gefolgter Künstler)

**Modus B — Top Artist:**
- Stat 1: Top Artist (Name des meistgehörten Künstlers)
- Stat 2: ♡ Titel
- Stat 3: Playlists

**Modus C — Now Playing + Stats:**
- Stat 1: Aktueller Song (Titel als Value, wird abgekürzt wenn zu lang)
- Stat 2: ♡ Titel
- Stat 3: Playlists
- Hinweis: 1x1 unterstützt keine Widgets/Bilder → kein Album-Cover möglich, nur Text-Stats

Alle 1x1 Modi zeigen das Spotify-Icon + Link-Icon (↗) oben. Klick auf die Tile öffnet Spotify im Browser (Hyperlink-Verhalten).

**renderHints:** `{ maxStats: 3, layout: "compact" }`

### 2×1 — Mini Widget

Zwei konfigurierbare Modi, wählbar als `widgetMode` ConfigField:

**Modus: Mini Player**
- Links: Album-Cover (130×130px)
- Rechts oben: Song-Titel, Artist, Album
- Rechts mitte: Fortschrittsbalken mit Zeitanzeige
- Rechts unten: ⏮ ▶/⏸ ⏭ Buttons

**Modus: Clean Info**
- Links: Album-Cover (130×130px)
- Rechts: Song-Titel (groß), Artist, Album + Jahr
- Fortschrittsbalken unten
- Keine Steuerungs-Buttons

**renderHints:** `{ maxStats: 6, layout: "widget", widgetComponent: "SpotifyWidget" }`

### 2×2 — Full Player Widget

Vertikales Layout mit allen Features:

1. **Header:** Spotify-Icon + Name + Geräteauswahl-Dropdown (oben rechts)
2. **Album-Cover:** Großes Bild (volle Breite, ~140px Höhe)
3. **Song-Info:** Titel (fett) + Artist · Album + Like-Button (♥/♡)
4. **Fortschrittsbalken:** Klickbar (Seek-Funktion) + Zeitanzeige (elapsed/total)
5. **Controls:** Shuffle ⇄ | ⏮ | ▶/⏸ | ⏭ | Repeat ↻
6. **Volume:** Lautstärkeregler-Slider unten

**renderHints:** `{ maxStats: 6, layout: "widget", widgetComponent: "SpotifyWidget" }`

## Widget-Zustände

| Zustand | Darstellung |
|---------|-------------|
| **Läuft (▶)** | Volle Anzeige mit Song-Info, Controls aktiv, Fortschritt animiert |
| **Pausiert (⏸)** | Letzter Song angezeigt, Play-Button prominent, Fortschritt statisch |
| **Inaktiv** | "Nichts wird abgespielt" + Play-Button (setzt letzten Kontext fort) |
| **Nicht verbunden** | "Bitte mit Spotify verbinden" + Link zu Einstellungen |
| **Kein Gerät** | "Kein aktives Gerät" + Hinweis Spotify zu öffnen |
| **Token abgelaufen** | Auto-Refresh. Wenn Refresh fehlschlägt: "Bitte neu verbinden" |

## Authentifizierung

### OAuth 2.0 Authorization Code Flow mit PKCE

**Ablauf:**
1. User klickt "Mit Spotify verbinden" in der Tile-Konfiguration
2. Dashboard generiert `code_verifier` + `code_challenge`
3. Redirect zu Spotify Authorization URL mit Scopes
4. User autorisiert in Spotify
5. Spotify redirected zurück zu `/api/spotify/callback`
6. Backend tauscht Code gegen Access Token + Refresh Token
7. Tokens werden in der DB gespeichert (AppConnection)
8. Tile-Konfiguration zeigt "Verbunden als: [Username]"

**Benötigte Scopes:**
```
user-read-playback-state
user-modify-playback-state
user-read-currently-playing
user-read-recently-played
user-top-read
user-library-read
user-library-modify
user-follow-read
playlist-read-private
```

**Token-Management:**
- Access Token: ~1 Stunde gültig
- Refresh Token: Langlebig
- Auto-Refresh bei jedem `fetchStats()`-Aufruf wenn Token abgelaufen
- Refresh Token wird bei Refresh erneuert (Token Rotation)

### ConfigFields für OAuth

Neuer ConfigField-Typ `"oauth"` im Framework:

```typescript
{
  key: "spotifyAuth",
  label: "Spotify-Konto",
  type: "oauth",
  required: true,
  oauth: {
    provider: "spotify",
    authUrl: "/api/spotify/auth",
    statusUrl: "/api/spotify/status",
    disconnectUrl: "/api/spotify/disconnect"
  }
}
```

Darstellung im TileDialog:
- **Nicht verbunden:** Grüner Button "Mit Spotify verbinden"
- **Verbunden:** "Verbunden als: [Display Name]" + "Konto wechseln" + "Trennen"
- **Fehler:** Roter Hinweis + "Neu verbinden"

## API-Endpunkte

### Neue Spotify-spezifische Routes

| Route | Methode | Zweck |
|-------|---------|-------|
| `/api/spotify/auth` | GET | Startet OAuth-Flow (redirect zu Spotify) |
| `/api/spotify/callback` | GET | Empfängt OAuth-Callback, speichert Tokens |
| `/api/spotify/status` | GET | Prüft Verbindungsstatus + Username |
| `/api/spotify/disconnect` | POST | Löscht gespeicherte Tokens |
| `/api/spotify/action` | POST | Führt Player-Actions aus (play, pause, next, prev, seek, volume, shuffle, repeat, like, transfer) |

### Bestehende Enhanced-Routes (unverändert)

| Route | Methode | Zweck |
|-------|---------|-------|
| `/api/enhanced/[tileId]` | GET | `fetchStats()` — liefert StatItems + widgetData |
| `/api/enhanced/test` | POST | `testConnection()` — prüft ob Token gültig |

## Datenfluss

### fetchStats() → PluginStats

```typescript
// Parallele API-Aufrufe an Spotify
const [playback, savedTracks, playlists, following, topArtist] = await Promise.all([
  fetch("https://api.spotify.com/v1/me/player"),
  fetch("https://api.spotify.com/v1/me/tracks?limit=1"),    // nur total count
  fetch("https://api.spotify.com/v1/me/playlists?limit=1"), // nur total count
  fetch("https://api.spotify.com/v1/me/following?type=artist&limit=1"),
  fetch("https://api.spotify.com/v1/me/top/artists?limit=1&time_range=short_term"),
]);
```

**StatItems (für 1x1 compact):**
```typescript
items: [
  { label: "♡ Titel", value: 847, icon: "Heart", color: "green" },
  { label: "Playlists", value: 23, icon: "ListMusic" },
  { label: "Künstler", value: 156, icon: "Users" },
]
```

**widgetData (für 2x1/2x2 Widgets):**
```typescript
widgetData: {
  // Playback State
  isPlaying: boolean,
  track: {
    name: string,
    artist: string,
    album: string,
    albumArt: string,        // URL zum Cover-Bild (300x300)
    duration: number,        // ms
    progress: number,        // ms
    uri: string,             // Spotify Track URI
    isLiked: boolean,
  } | null,
  
  // Device Info
  device: {
    name: string,
    type: string,            // "Computer" | "Smartphone" | "Speaker"
    volume: number,          // 0-100
  } | null,
  availableDevices: Array<{ id: string, name: string, type: string }>,
  
  // Playback Options
  shuffle: boolean,
  repeat: "off" | "track" | "context",
  
  // Config-abhängig
  displayMode: "library" | "topArtist" | "nowPlaying",
  widgetMode: "miniPlayer" | "cleanInfo",
  topArtistName: string | null,
}
```

### Widget Actions → /api/spotify/action

```typescript
// POST /api/spotify/action
{
  action: "play" | "pause" | "next" | "previous" | "seek" | "volume" | "shuffle" | "repeat" | "like" | "unlike" | "transfer",
  payload?: {
    position_ms?: number,    // für seek
    volume_percent?: number, // für volume
    device_id?: string,      // für transfer
  }
}
```

## Plugin-Konfiguration

### ConfigFields

```typescript
configFields: [
  {
    key: "spotifyAuth",
    label: "Spotify-Konto",
    type: "oauth",
    required: true,
  },
  {
    key: "displayMode",
    label: "Anzeige-Modus (1×1)",
    type: "select",
    options: [
      { value: "library", label: "Library Stats" },
      { value: "topArtist", label: "Top Artist" },
      { value: "nowPlaying", label: "Now Playing + Stats" },
    ],
    defaultValue: "library",
  },
  {
    key: "widgetMode",
    label: "Widget-Modus (2×1)",
    type: "select",
    options: [
      { value: "miniPlayer", label: "Mini Player" },
      { value: "cleanInfo", label: "Clean Info" },
    ],
    defaultValue: "miniPlayer",
  },
]
```

### StatOptions

```typescript
statOptions: [
  { key: "savedTracks", label: "♡ Titel", description: "Anzahl gespeicherter Songs", defaultEnabled: true },
  { key: "playlists", label: "Playlists", description: "Anzahl eigener Playlists", defaultEnabled: true },
  { key: "following", label: "Künstler", description: "Gefolgte Künstler", defaultEnabled: true },
  { key: "topArtist", label: "Top Artist", description: "Meistgehörter Künstler", defaultEnabled: false },
  { key: "topTrack", label: "Top Track", description: "Meistgehörter Song", defaultEnabled: false },
  { key: "recentlyPlayed", label: "Zuletzt gehört", description: "Letzter gespielter Song", defaultEnabled: false },
]
```

## Datei-Struktur

```
src/plugins/community/spotify/
├── index.ts                    # AppPlugin Definition + fetchStats + testConnection
├── spotify-api.ts              # Spotify API Client (Token-Refresh, Endpoints)
└── types.ts                    # Spotify-spezifische TypeScript-Types

src/components/widgets/spotify/
├── SpotifyWidget.tsx           # Hauptwidget (routet nach size: 2x1/2x2)
├── SpotifyPlayer2x2.tsx        # Full Player Component
├── SpotifyPlayer2x1.tsx        # Mini Player / Clean Info Component
└── SpotifyDeviceSelector.tsx   # Geräteauswahl Dropdown

src/app/api/spotify/
├── auth/route.ts               # OAuth Start (redirect)
├── callback/route.ts           # OAuth Callback (Token speichern)
├── status/route.ts             # Verbindungsstatus
├── disconnect/route.ts         # Verbindung trennen
└── action/route.ts             # Player Actions (play, pause, etc.)
```

## Framework-Erweiterungen

### Neuer ConfigField-Typ: "oauth"

Minimale Erweiterung in `src/plugins/types.ts`:

```typescript
// Neuer Typ in ConfigField.type union
type ConfigFieldType = "text" | "password" | "url" | "textarea" | "select" | "number" | "oauth";

// Zusätzliche Felder wenn type === "oauth"
interface OAuthConfig {
  provider: string;
  authUrl: string;
  statusUrl: string;
  disconnectUrl: string;
}
```

UI-Erweiterung im TileDialog für `type: "oauth"`:
- Rendert OAuth-Button statt Text-Input
- Zeigt Verbindungsstatus
- "Konto wechseln" / "Trennen" Optionen

### Spotify Developer App

Der Dashboard-Admin muss einmalig eine App im [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) registrieren:
- App Name: z.B. "Dominion Dashboard"
- Redirect URI: `http://localhost:3000/api/spotify/callback` (bzw. produktive URL)
- Client ID + Client Secret werden als **Environment Variables** konfiguriert:

```env
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
```

Diese werden in `.env.local` gespeichert (nicht in der DB, nicht im Plugin-Config).

### Token-Speicherung

Tokens werden in der bestehenden `AppConnection`-Tabelle gespeichert:
- `configData` JSON-Feld enthält encrypted Access Token, Refresh Token, Token Expiry, Spotify User ID

## Polling & Performance

- **fetchStats Polling:** Alle 30 Sekunden (Dashboard-Standard)
- **Widget-internes Polling:** Fortschrittsbalken wird client-seitig interpoliert (kein extra API-Call)
- **Rate Limits:** Spotify erlaubt ~100 Requests/Minute. Bei 30s Polling sind das ~2 Req/Interval × 5 parallele Calls = ~10 Req/Min — weit unter dem Limit
- **Timeout:** 5000ms für alle Spotify API Calls (via `createFetchOptions()`)
- **Batch-Optimierung:** `Promise.all()` für parallele Requests

## Verifizierung / Testplan

1. **OAuth Flow testen:**
   - "Mit Spotify verbinden" → Redirect → Callback → Token gespeichert
   - "Konto wechseln" → Re-Auth mit neuem Account
   - "Trennen" → Token gelöscht, Tile zeigt "Nicht verbunden"

2. **1x1 Tile testen:**
   - Alle 3 Anzeige-Modi durchschalten
   - Korrekte Zahlen prüfen (Vergleich mit Spotify App)
   - Klick öffnet Spotify im Browser

3. **2x1 Widget testen:**
   - Mini Player Modus: Cover, Song-Info, Controls funktionieren
   - Clean Info Modus: Nur Anzeige, keine Buttons
   - Wechsel zwischen Modi in Config

4. **2x2 Widget testen:**
   - Alle Controls: Play/Pause/Skip/Shuffle/Repeat
   - Like-Button: Song zu Favoriten hinzufügen/entfernen
   - Volume-Slider: Lautstärke ändern
   - Geräteauswahl: Zwischen Geräten wechseln
   - Seek: Fortschrittsbalken klicken
   - Alle Widget-Zustände: Läuft, Pausiert, Inaktiv, Nicht verbunden, Kein Gerät

5. **Token-Refresh testen:**
   - Nach 1h: Auto-Refresh funktioniert
   - Refresh-Token ungültig: User wird zum Re-Auth aufgefordert

6. **Edge Cases:**
   - Kein aktives Gerät → "Kein Gerät" Zustand
   - Spotify App geschlossen → Graceful Fallback
   - Netzwerkfehler → Error State mit Retry

7. **Build-Test:**
   - `npm run build` erfolgreich
   - Plugin wird auto-discovered via `generate-community-plugins.ts`
   - MCP Validation: `validate_plugin_structure`, `test_build_compile`
