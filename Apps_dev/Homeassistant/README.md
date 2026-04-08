# Home Assistant

**Category:** Automation | **Sizes:** 1x1, 2x1 | **Auth:** Long-Lived Access Token

> Community Plugin -- Install via ZIP upload in Settings > Plugins.

Zeigt beliebige Home Assistant Entities auf deinem Dashboard an — Sensoren, Lichter, Schalter, Klima, Binaersensoren und mehr. Mit Entity-Picker und individuellen Labels.

---

## Requirements

- **Home Assistant 2024.1 oder neuer**
- **Langlebiger Zugangstoken (Long-Lived Access Token)**
- **Netzwerkzugriff auf die Home Assistant Instanz**

---

## Features

- Beliebige Entities anzeigen (Sensoren, Lichter, Schalter, Klima, etc.)
- Entity-Picker mit Domain-Gruppierung und Live-Status
- Individuelle Labels fuer jede Entity
- Farbcodierte Zustaende (An/Aus, Schwellwerte fuer Prozent und Temperatur)
- Deutsche Uebersetzungen fuer alle Entity-Domaenen und Binary-Sensor-Klassen
- 2x1 Widget mit Entity-Cards und Status-Dots
- Unterstuetzt 25+ Home Assistant Domaenen

---

## Tile Sizes

| Size | Layout | What you see | Widget |
|------|--------|-------------|--------|
| **1x1** | Compact | Up to 3 entities | No |
| **2x1** | Widget | Up to 6 entities | Yes |

---

## Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| Home Assistant URL | URL | Yes | -- | URL deiner Home Assistant Instanz (z.B. http://192.168.1.100:8123) |
| Access Token | Password | Yes | -- | Langlebiger Zugangstoken (erstellen unter Profil > Langlebige Zugangstoken) |

---

## Statistics

| Stat | Description | Default |
|------|-------------|---------|
| Ausgewaehlte Entities | Die konfigurierten Entities werden als Stats angezeigt | On |

---

## Troubleshooting

**"Verbindung fehlgeschlagen"**
- Pruefen ob die Home Assistant URL erreichbar ist
- Sicherstellen dass kein Trailing-Slash in der URL steht
- Firewall-Regeln pruefen (Port 8123 muss offen sein)

**"Zugriff verweigert (401)"**
- Access Token unter Profil > Langlebige Zugangstoken neu erstellen
- Token muss vollstaendig kopiert werden (beginnt mit 'eyJ...')
- Pruefen ob der Token nicht abgelaufen ist

**"Entities werden nicht angezeigt"**
- Mindestens eine Entity im Entity-Picker auswaehlen
- Entity-ID Format pruefen (z.B. sensor.temperatur, light.wohnzimmer)
- Pruefen ob die Entity in Home Assistant existiert und verfuegbar ist
