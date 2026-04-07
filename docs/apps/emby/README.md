# Emby

**Category:** Media | **Sizes:** 1x1, 2x1, 2x2 | **Auth:** API Key

> Built-in -- Emby ships pre-installed with Dominion. No download needed.

Monitor your Emby media server directly from your dashboard. See active streams, library statistics, and a poster carousel of recently added movies and series.

---

## Requirements

- **Emby Server** 4.7 or newer
- **API Key** -- create one in Emby under *Settings > API Keys > New API Key*
- **Server URL** -- the base URL of your Emby instance (e.g. `http://192.168.1.50:8096`)

---

## Features

- Live stream count with green status indicator when someone is watching
- Library statistics: Movies, Series, Episodes, Music Albums, Artists
- Poster carousel with cover art for recently added media (2x1 and 2x2 tiles)
- Configurable carousel speed and item count
- Mixed mode that interleaves movies and series in the carousel
- Built-in connection test to verify your setup

---

## Tile Sizes

| Size | Layout | What you see | Widget |
|------|--------|-------------|--------|
| **1x1** | Compact | Up to 3 stats (streams, movies, series) | No |
| **2x1** | Widget | Up to 6 stats + poster carousel | Yes |
| **2x2** | Widget | Up to 4 stats + large poster carousel | Yes |

---

## Configuration

These fields appear in **Settings > App Connections** after adding Emby to your dashboard.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| Server URL | URL | Yes | -- | Base URL of your Emby server (e.g. `http://emby.local:8096`) |
| API Key | Password | Yes | -- | API key from Emby's API Keys settings |
| Media Category | Select | No | Mixed | Which media to show in the carousel: Movies, Series, or Mixed |
| Carousel Speed | Select | No | Normal (5s) | How fast covers rotate: Slow (8s), Normal (5s), Fast (3s) |
| Cover Count | Select | No | 5 | Number of covers in the carousel: 3, 5, 8, or 10 |

---

## Statistics

Toggle individual stats on or off in the app connection settings.

| Stat | Description | Default |
|------|-------------|---------|
| Active Streams | Number of currently playing streams | On |
| Movies | Total movie count | On |
| Series | Total series count | On |
| Episodes | Total episode count | Off |
| Music Albums | Total music album count | Off |
| Artists | Total artist count | Off |

---

## Screenshots

<!-- Screenshots coming soon -->

---

## Troubleshooting

**"Connection failed" or timeout**
- Verify the Server URL is reachable from the machine running Dominion
- Check that the API Key is correct (re-create it if unsure)
- Ensure no firewall is blocking port 8096 (or whichever port Emby uses)
- Use the **Test Connection** button in Settings to get a detailed error message

**"No streams showing"**
- The stream count only reflects currently active playback sessions
- If nothing is playing right now, the count will be 0

**"No covers in the carousel"**
- Make sure the selected Media Category has content in your library
- At least one movie or series with a poster image is needed
- Check that the Emby user account has access to the library
