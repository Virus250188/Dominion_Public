# Home Assistant

**Category:** Automation | **Sizes:** 1x1, 2x1 | **Auth:** Long-Lived Access Token

> Community Plugin -- Install via ZIP upload in Settings > Community Apps.

Display any Home Assistant entities on your dashboard -- sensors, lights, switches, climate, binary sensors and more. Features an entity picker with domain grouping and customizable labels.

---

## Requirements

- **Home Assistant** 2024.1 or newer
- **Long-Lived Access Token** -- create one under *Profile > Long-Lived Access Tokens*
- **Network access** to your Home Assistant instance (e.g. `http://192.168.1.100:8123`)

---

## Features

- Display any entity type: sensors, lights, switches, climate, covers, and 25+ more domains
- Entity picker with domain grouping and live status preview
- Custom labels for each entity
- Color-coded states (on/off, percentage thresholds, temperature ranges)
- German translations for all entity domains and binary sensor device classes
- 2x1 widget with entity cards and status dots
- Built-in connection test to verify your setup

---

## Tile Sizes

| Size | Layout | What you see | Widget |
|------|--------|-------------|--------|
| **1x1** | Compact | Up to 3 entities with state | No |
| **2x1** | Widget | Up to 6 entities with cards and status dots | Yes |

---

## Configuration

These fields appear in **Settings > App Connections** after adding Home Assistant to your dashboard.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| Home Assistant URL | URL | Yes | -- | Base URL of your instance (e.g. `http://192.168.1.100:8123`) |
| Access Token | Password | Yes | -- | Long-Lived Access Token from Profile > Long-Lived Access Tokens |

After connecting, use the **Entity Picker** to select which entities appear on your tile.

---

## Statistics

Selected entities are displayed as individual stats on your tile.

| Stat | Description | Default |
|------|-------------|---------|
| Selected Entities | Each picked entity shows as a stat with its current state | On |

---

## Screenshots

<!-- Screenshots coming soon -->

---

## Troubleshooting

**"Connection failed" or timeout**
- Verify the Home Assistant URL is reachable from the machine running Dominion
- Make sure there is no trailing slash in the URL
- Check firewall rules (port 8123 must be open)
- Use the **Test Connection** button in Settings to get a detailed error message

**"Access denied (401)"**
- Re-create the token under Profile > Long-Lived Access Tokens
- Copy the full token (starts with `eyJ...`)
- Check that the token has not expired

**"No entities showing"**
- Select at least one entity via the Entity Picker
- Verify the entity ID format (e.g. `sensor.temperature`, `light.living_room`)
- Make sure the entity exists and is available in Home Assistant

---

## Download

[home-assistant.zip](https://github.com/Virus250188/Dominion_Public/raw/main/docs/apps/home-assistant/home-assistant.zip) -- Upload via **Settings > Community Apps**.
