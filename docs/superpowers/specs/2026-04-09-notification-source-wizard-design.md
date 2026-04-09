# Notification Source Wizard — Design Spec

**Datum:** 2026-04-09  
**Status:** Draft  
**Betrifft:** `src/components/settings/NotificationSourceManager.tsx`

## Kontext

Der aktuelle "Neue Quelle"-Dialog ist ein flaches Formular mit einem Typ-Dropdown. Das ist funktional, aber nicht intuitiv — besonders fuer neue User. Der Tile-Dialog (`TileDialog.tsx`) zeigt bereits einen mehrstufigen Wizard mit grossen Auswahl-Karten, der deutlich besser funktioniert.

**Ziel:** Den Source-Erstellungsprozess als gefuehrten, mehrstufigen Wizard umbauen — gleicher UX-Pattern wie der Tile-Dialog.

## Wizard Flow

```
[+ Neue Quelle]
  │
  ├── Schritt 1: Quellentyp waehlen
  │     ├── 📡 RSS Feed
  │     └── 📱 App
  │
  ├── (wenn RSS Feed) → Schritt 2: RSS Formular
  │     → Feed URL, Anzeigename, Kategorie, Intervall, Icon, Farbe
  │     → "Feed hinzufuegen" → Quelle erstellt, Dialog schliesst
  │
  └── (wenn App) → Schritt 2: App-Unterauswahl
        ├── 🔑 API Key generieren
        │     → Schritt 3: Name, Icon, Farbe → "Erstellen"
        │     → Ergebnis-Screen: Key + curl-Beispiel + Copy-Buttons
        │
        └── 🔗 App verbinden
              → Schritt 3: Liste installierter Enhanced Apps mit supportsNotifications
              → Klick auf App → Quelle wird automatisch erstellt (Name/Icon/Farbe von App)
```

## Schritt 1: Quellentyp waehlen

**Layout:** Zwei grosse Karten nebeneinander (wie Tile-Dialog "App hinzufuegen" / "Gruppen-Dashboard").

| Karte | Icon | Titel | Beschreibung |
|-------|------|-------|-------------|
| Links | RSS-Icon (Lucide: `Rss`) | RSS Feed | Nachrichten von Blogs, News-Seiten oder Service-Feeds automatisch empfangen |
| Rechts | App-Icon (Lucide: `AppWindow`) | App | API-Key fuer externe Services generieren oder eine installierte Enhanced App verbinden |

**Verhalten:** Klick auf Karte → naechster Schritt. Kein "Weiter"-Button noetig.

## Schritt 2a: RSS Feed Formular

**Felder:**

| Feld | Typ | Pflicht | Validierung | Default |
|------|-----|---------|-------------|---------|
| Feed URL | Text-Input | Ja | URL-Format, Erreichbarkeitstest beim Erstellen | — |
| Anzeigename | Text-Input | Ja | Eindeutig (kein Duplikat in bestehenden Quellen) | — |

**sourceId (intern):** Wird automatisch aus dem Anzeigenamen generiert (slugified, z.B. "Hacker News" → "hacker-news"). Kein sichtbares Feld im Formular.
| Kategorie | Select-Dropdown | Ja | Feste Werte: info, warning, critical, update | info |
| Abfrageintervall | Select-Dropdown | Nein | Feste Werte: 5, 15, 30, 60 (Minuten) | 15 |
| Icon | IconPicker + URL-Input | Nein | IconPicker (simple-icons) ODER externe URL | RSS-Icon |
| Farbe | Preset-Palette + Hex | Nein | Hex-Farbwert | #f97316 (Orange) |

**Buttons:** "Zurueck" (→ Schritt 1), "Feed hinzufuegen" (→ erstellt Quelle, schliesst Dialog)

**Beim Erstellen:**
- Feed URL wird auf Erreichbarkeit getestet (Fetch mit Timeout)
- Anzeigename wird auf Eindeutigkeit geprueft
- Bei Fehler: Inline-Fehlermeldung, Dialog bleibt offen

## Schritt 2b: App-Unterauswahl

**Layout:** Zwei grosse Karten nebeneinander (gleicher Style wie Schritt 1).

| Karte | Icon | Titel | Beschreibung |
|-------|------|-------|-------------|
| Links | Key-Icon (Lucide: `Key`) | API Key generieren | Fuer externe Services wie N8N, Uptime Kuma, oder eigene Skripte |
| Rechts | Link-Icon (Lucide: `Link`) | App verbinden | Eine installierte Enhanced App fuer Benachrichtigungen aktivieren |

**Buttons:** "Zurueck" (→ Schritt 1)

## Schritt 3a: API Key Formular

**Felder:**

| Feld | Typ | Pflicht | Validierung | Default |
|------|-----|---------|-------------|---------|
| Anzeigename | Text-Input | Ja | Eindeutig (kein Duplikat) | — |
| Icon | IconPicker + URL-Input | Nein | IconPicker (simple-icons) ODER externe URL | — |
| Farbe | Preset-Palette + Hex | Nein | Hex-Farbwert | #6366f1 (Indigo) |

**Buttons:** "Zurueck" (→ Schritt 2b), "Erstellen" (→ Ergebnis-Screen)

**Ergebnis-Screen (nach Erstellen):**
- Erfolgs-Icon + "Quelle erstellt!" Bestaetigung
- API Key vollstaendig angezeigt (einmalig!) in Monospace-Box
- Warnung: "Kopiere den Key jetzt — er wird nur einmal vollstaendig angezeigt!"
- curl-Beispiel mit dem generierten Key (Notification senden)
- Copy-Buttons: "Key kopieren", "curl kopieren"
- "Fertig"-Button schliesst den Dialog

## Schritt 3b: App verbinden

**Datenquelle:** Alle registrierten Plugins gefiltert nach `supportsNotifications: true`, gekreuzt mit bestehenden AppConnections des Users.

**Liste zeigt pro App:**
- App-Icon + Name (aus Plugin-Metadata)
- Verbindungsname + URL (aus AppConnection)
- Status-Indikator (● Verbunden)
- Bereits registrierte Apps: ausgegraut mit "Bereits als Quelle registriert"

**Verhalten bei Klick auf eine App:**
- NotificationSource wird automatisch erstellt:
  - `name` = AppConnection.name (z.B. "Home Assistant Zuhause")
  - `type` = "app"
  - `icon` = Plugin-Icon
  - `color` = Plugin-Farbe
  - `appConnectionId` = Referenz zur bestehenden AppConnection (neues Feld im Schema)
- Kein separates Formular noetig
- Dialog schliesst nach Erfolg

**Leerer Zustand (heute):**
- Zentrierter Platzhalter: "Noch keine installierten Apps unterstuetzen Benachrichtigungen."
- Erklaertext: "Enhanced Apps koennen diese Funktion in ihrem Plugin aktivieren."

## Validierung: Eindeutiger Anzeigename

- Bei Erstellung wird geprueft ob der Name bereits existiert (case-insensitive)
- Server Action `createNotificationSource` prueft Eindeutigkeit
- Client-seitig: Inline-Fehlermeldung "Dieser Name ist bereits vergeben"
- Gilt fuer alle drei Pfade (RSS, API Key, App verbinden)

## Schema-Erweiterung

Neues optionales Feld auf `NotificationSource`:

```prisma
model NotificationSource {
  // ... bestehende Felder ...
  appConnectionId  Int?
  appConnection    AppConnection? @relation(fields: [appConnectionId], references: [id], onDelete: SetNull)
}
```

- `appConnectionId` ist nur gesetzt wenn `type = "app"` und via "App verbinden" erstellt
- `onDelete: SetNull` — wenn die AppConnection geloescht wird, bleibt die NotificationSource bestehen (Quelle wird deaktiviert, nicht geloescht)

## Plugin-Interface fuer Notification-Support

Plugins die Notifications unterstuetzen wollen, setzen:

```typescript
// In ihrem Plugin:
supportsNotifications: true
```

Spaeter kann das Plugin-Interface um Notification-spezifische Methoden erweitert werden (z.B. `getNotificationEvents()` fuer konfigurierbare Event-Typen). Das ist aber nicht Teil dieses Specs.

## UI-Pattern: Wiederverwendung

| Komponente | Quelle | Wiederverwendung |
|-----------|--------|-----------------|
| Auswahl-Karten (Schritt 1/2b) | `TileDialog.tsx` dialogMode="select" | Gleicher Style, eigene Implementierung |
| IconPicker | `src/components/dashboard/IconPicker.tsx` | Direkt importieren |
| Farb-Palette | `PRESET_COLORS` aus `src/lib/constants.ts` | Direkt importieren |
| Glass-Design | `.glass-card`, `.glass-chromatic`, etc. | Bestehende CSS-Klassen |
| Dialog-Shell | `src/components/ui/dialog.tsx` | Direkt importieren |

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `src/components/settings/NotificationSourceManager.tsx` | Wizard-Logik komplett umbauen (Add-Dialog) |
| `src/lib/actions/notifications.ts` | Eindeutigkeits-Check fuer Name, `appConnectionId` Support |
| `prisma/schema.prisma` | `appConnectionId` Feld auf NotificationSource |
| `src/plugins/types.ts` | Bereits vorhanden (`supportsNotifications?: boolean`) |

## Verifikation

1. "Neue Quelle" zeigt den Wizard mit zwei Karten (RSS / App)
2. RSS-Pfad: Feed URL wird getestet, alle Felder validiert, Quelle erscheint in Liste
3. API-Key-Pfad: Key wird generiert, Ergebnis-Screen mit Copy-Buttons, curl-Beispiel funktioniert
4. App-Pfad: Leerer Zustand zeigt Platzhalter (da noch keine App supportsNotifications hat)
5. Duplikat-Name wird abgelehnt mit Fehlermeldung
6. "Zurueck"-Navigation funktioniert auf jeder Ebene
7. Bestehende Quellen-Verwaltung (Detail-View, Loeschen, API-Key anzeigen, etc.) bleibt unveraendert
