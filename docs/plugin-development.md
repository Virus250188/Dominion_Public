# Plugin Development Guide

Dominion Enhanced Apps are server-side plugins that fetch live data from self-hosted services and display it on your dashboard. A plugin can show stats (active streams, disk usage, download speed), support multiple tile sizes, and optionally render a rich widget with cover art, charts, or interactive controls.

This guide covers everything you need to build, test, and publish a community plugin.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Plugin Manifest](#2-plugin-manifest-pluginmanifestjson)
3. [Plugin Structure](#3-plugin-structure)
4. [The Plugin Interface (AppPlugin)](#4-the-plugin-interface-appplugin)
5. [ConfigField Types](#5-configfield-types)
6. [fetchStats -- The Heart of Your Plugin](#6-fetchstats--the-heart-of-your-plugin)
7. [Tile Sizes and Render Hints](#7-tile-sizes-and-render-hints)
8. [Building a Widget (Optional)](#8-building-a-widget-optional)
9. [OAuth Plugins](#9-oauth-plugins)
10. [Testing Your Plugin](#10-testing-your-plugin)
11. [Available Utilities](#11-available-utilities)
12. [Limits and Rules](#12-limits-and-rules)
13. [Complete Example -- Minimal Plugin](#13-complete-example--minimal-plugin)
14. [Complete Example -- Full Plugin with Widget](#14-complete-example--full-plugin-with-widget)

---

## 1. Quick Start

Five steps to a working plugin:

### Step 1 -- Create the folder

```
src/plugins/community/my-service/
```

### Step 2 -- Create `plugin.manifest.json`

```json
{
  "id": "my-service",
  "name": "My Service",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Shows stats from My Service"
}
```

### Step 3 -- Create `index.ts`

```ts
import type { AppPlugin } from "../../types";

export const plugin: AppPlugin = {
  metadata: {
    id: "my-service",
    name: "My Service",
    icon: "myservice",          // simple-icons slug from simpleicons.org
    color: "#3498db",
    description: "Shows stats from My Service",
    category: "Monitoring",
  },
  configFields: [
    { key: "apiUrl", label: "Server URL", type: "url", required: true },
    { key: "apiKey", label: "API Key", type: "password", required: true },
  ],
  statOptions: [
    { key: "status", label: "Status", description: "Service status", defaultEnabled: true },
  ],
  supportedSizes: ["1x1"],
  renderHints: {
    "1x1": { maxStats: 3, layout: "compact" },
  },
  async fetchStats(config) {
    // Your API calls here
    return { items: [{ label: "Status", value: "Online" }], status: "ok" };
  },
  async testConnection(config) {
    return { ok: true, message: "Connected" };
  },
};
```

### Step 4 -- Register the plugin

```bash
npm run generate:plugins
```

This runs automatically on `npm run dev` and `npm run build` (via `predev`/`prebuild` hooks).

### Step 5 -- Start the dev server

```bash
npm run dev
```

Your plugin now appears in the tile dialog when adding a new app. Alternatively, you can ZIP the folder and upload it via **Einstellungen > Plugin Upload**.

> [!TIP]
> Use the [Dominion MCP Server](https://github.com/Virus250188/Dominion_MCP) to scaffold, validate, and test plugins with AI assistance.

---

## 2. Plugin Manifest (`plugin.manifest.json`)

The manifest is required for ZIP-uploaded plugins. It is also recommended for manually placed plugins as it provides metadata for the plugin list in Einstellungen.

### Full Spec

| Field                  | Type    | Required | Description                                           |
|------------------------|---------|----------|-------------------------------------------------------|
| `id`                   | string  | Yes      | Unique identifier, **must be kebab-case** (`my-service`, not `myService`) |
| `name`                 | string  | Yes      | Display name shown in the UI                          |
| `version`              | string  | Yes      | Semver format (`1.0.0`, `2.1.0-beta`)                |
| `author`               | string  | Yes      | Your name or handle                                   |
| `description`          | string  | Yes      | Short description (one sentence)                      |
| `minDashboardVersion`  | string  | No       | Minimum Dominion version required (e.g. `1.0.5`)     |
| `hasWidget`            | boolean | No       | Set `true` if your plugin includes a widget component |
| `widgetFile`           | string  | No       | Filename of the widget (e.g. `MyWidget.tsx`). Required if `hasWidget` is true |

### Validation Rules

- `id` must match `/^[a-z0-9]+(-[a-z0-9]+)*$/` (lowercase letters, digits, hyphens only)
- `version` must match semver (`1.0.0`, allows pre-release suffixes)
- All five required fields must be non-empty strings
- If `hasWidget` is true, `widgetFile` must be set and the file must exist in the ZIP

### Example

```json
{
  "id": "opnsense",
  "name": "OPNsense",
  "version": "1.0.0",
  "author": "CommunityDev",
  "description": "Firewall stats: interfaces, gateways, services",
  "minDashboardVersion": "1.0.5",
  "hasWidget": true,
  "widgetFile": "OpnsenseWidget.tsx"
}
```

---

## 3. Plugin Structure

```
community/my-plugin/
  plugin.manifest.json      <- Required (for ZIP upload; recommended for manual placement)
  index.ts                  <- Required (must export `const plugin`)
  MyPluginWidget.tsx         <- Optional (widget for 2x1/2x2 tiles)
  types.ts                  <- Optional (your own type definitions)
```

### Required exports from `index.ts`

```ts
// Always required:
export const plugin: AppPlugin = { ... };

// Only if you have a widget:
export { MyPluginWidget as widget } from "./MyPluginWidget";
export const widgetName: string = "MyPluginWidget";
```

The auto-discovery script (`scripts/generate-community-plugins.ts`) scans for these exports and generates the barrel file `src/plugins/community/index.ts`. You never edit that file manually.

---

## 4. The Plugin Interface (`AppPlugin`)

Every plugin must implement the `AppPlugin` interface from `src/plugins/types.ts`.

### `metadata` (required)

```ts
metadata: {
  id: string;          // Must match manifest id, kebab-case
  name: string;        // Display name
  icon: string;        // simple-icons slug (see simpleicons.org)
  color: string;       // Hex color, e.g. "#52b54b" (validated: #XXXXXX)
  description: string; // Short description for the tile catalog
  category: PluginCategory; // See below
  website?: string;    // Optional link to the service's homepage
}
```

**Valid categories:** `"Storage"`, `"Media"`, `"Network"`, `"Automation"`, `"System"`, `"Monitoring"`, `"Downloads"`, `"Security"`, `"Productivity"`, `"Development"`, `"Custom"`

### `configFields` (required, array)

Defines what the user enters in the Verbindung (connection) settings. See [Section 5](#5-configfield-types) for all types.

### `statOptions` (required, array)

Defines which stats the user can toggle on/off in the tile settings:

```ts
statOptions: [
  {
    key: "streams",           // Used internally to filter visible stats
    label: "Aktive Streams",  // Shown in the toggle UI
    description: "Number of currently active streams",
    defaultEnabled: true,     // Checked by default
  },
]
```

### `supportedSizes` (required, array)

Which tile sizes your plugin supports. Valid values: `"1x1"`, `"2x1"`, `"2x2"`.

### `renderHints` (required, partial record)

One entry per supported size:

```ts
renderHints: {
  "1x1": { maxStats: 3, layout: "compact" },
  "2x1": { maxStats: 6, layout: "detailed" },
  "2x2": { maxStats: 4, layout: "widget", widgetComponent: "MyWidget" },
}
```

`widgetComponent` is the string name used to look up the widget in the registry. Only needed when `layout` is `"widget"`.

### `fetchStats(config)` (required)

The main function. Receives the merged config, returns stats. See [Section 6](#6-fetchstats--the-heart-of-your-plugin).

### `testConnection(config)` (required)

Validates credentials. Must return `{ ok: boolean, message: string }`.

### `exchangeToken(code, redirectUri, config)` (optional)

For OAuth plugins. Exchanges an authorization code for tokens. See [Section 9](#9-oauth-plugins).

### `refreshToken(config)` (optional)

For OAuth plugins. Refreshes an expired access token.

### `crawlEntities(config)` (optional)

For plugins that expose selectable entities (e.g. Home Assistant entities). Returns grouped entity lists.

---

## 5. ConfigField Types

Each entry in `configFields` defines one form field in the tile dialog.

```ts
interface ConfigField {
  key: string;            // Config property name (e.g. "apiUrl")
  label: string;          // Form label
  type: ConfigFieldType;  // See table below
  placeholder?: string;   // Placeholder text
  required?: boolean;     // Shows validation error if empty
  description?: string;   // Help text below the field
  options?: { label: string; value: string }[];  // For "select" type
  min?: number;           // For "number" type
  max?: number;           // For "number" type
  oauth?: OAuthConfig;    // For "oauth" type only
}
```

### Type Reference

| Type       | Renders as        | Use case                              |
|------------|-------------------|---------------------------------------|
| `text`     | Text input        | General text (usernames, entity IDs)  |
| `password` | Password input    | API keys, tokens (stored encrypted)   |
| `url`      | URL input         | Server URLs with validation           |
| `textarea` | Multi-line input  | Long text, JSON configs               |
| `select`   | Dropdown          | Predefined options (requires `options` array) |
| `number`   | Number input      | Numeric values (supports `min`/`max`) |
| `oauth`    | OAuth button      | OAuth flow trigger (requires `oauth` property) |

### Authentication Methods

The dashboard doesn't care HOW your plugin authenticates — it just stores credentials securely and passes them to `fetchStats`. Here are the three common patterns:

#### API Key (most common)

Most self-hosted services use API keys. Use `type: "password"` to store them encrypted:

```ts
configFields: [
  { key: "apiUrl", label: "Server URL", type: "url", required: true },
  { key: "apiKey", label: "API Key", type: "password", required: true },
]

// In fetchStats:
async fetchStats(config) {
  const res = await fetch(`${config.apiUrl}/api/status`, {
    headers: { "X-Api-Key": String(config.apiKey) },
  });
  // ...
}
```

#### Username & Password (Basic Auth)

For services that use HTTP Basic Auth:

```ts
configFields: [
  { key: "apiUrl", label: "Server URL", type: "url", required: true },
  { key: "username", label: "Benutzername", type: "text", required: true },
  { key: "password", label: "Passwort", type: "password", required: true },
]

// In fetchStats:
async fetchStats(config) {
  const credentials = btoa(`${config.username}:${config.password}`);
  const res = await fetch(`${config.apiUrl}/api/status`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  // ...
}
```

#### OAuth (for third-party services like Spotify, GitHub)

For services that require browser-based authorization. This is the most complex method — only use it when the service doesn't offer API keys. See [Section 9](#9-oauth-plugins) for full details.

### Important: `password` fields

All `type: "password"` values are **encrypted at rest** (AES-256-GCM). The dashboard decrypts them before passing to `fetchStats`. Use this type for any secret: API keys, tokens, passwords, client secrets.

### The `oauth` field type

```ts
{
  key: "oauth",
  label: "Mit Spotify verbinden",
  type: "oauth",
  oauth: {
    authUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    scopes: ["user-read-playback-state", "user-modify-playback-state"],
    pkce: true,  // Optional: use PKCE flow
  },
}
```

When the user clicks this field, the dashboard redirects them to `authUrl`. After authorization, the callback at `/api/enhanced/oauth/callback` calls your plugin's `exchangeToken` method.

---

## 6. fetchStats -- The Heart of Your Plugin

### What `config` contains

The `config` parameter is a `PluginConfig` object with your decrypted connection data merged with tile display settings:

```ts
interface PluginConfig {
  apiUrl: string;            // Always present (from AppConnection URL)
  apiKey?: string;           // If the user entered one
  accessToken?: string;      // If OAuth
  username?: string;
  password?: string;
  [key: string]: unknown;    // Your custom config fields
}
```

The merge order is: **AppConnection config (base)** + **tile display config (overlay)**. This means connection-level settings like `apiUrl` and `apiKey` come from the shared AppConnection, while tile-specific settings like `visibleStats` or `mediaCategory` come from the tile's own config.

### What you MUST return

```ts
interface PluginStats {
  items: StatItem[];           // Your stat values
  status: "ok" | "error";     // Must be one of these two
  error?: string;              // Human-readable error message
  widgetData?: Record<string, unknown>;  // Optional rich data for widgets
}
```

### StatItem format

```ts
interface StatItem {
  label: string;              // Displayed name (e.g. "Streams", "Disk Usage")
  value: string | number;     // The value (e.g. 42, "Online")
  unit?: string;              // Optional unit (e.g. "GB", "%", "ms")
  icon?: string;              // Optional Lucide icon name
  color?: string;             // Optional color hint ("green", "red", "#52b54b")
}
```

### Error handling

**Never throw exceptions from `fetchStats`.** Always catch errors and return an error response:

```ts
async fetchStats(config) {
  try {
    const res = await fetch(`${baseUrl}/api/status`, fetchOpts);
    if (!res.ok) {
      return { items: [], status: "error", error: `HTTP ${res.status}` };
    }
    // ... parse and return
  } catch (err) {
    return createErrorResponse(err);  // from plugins/utils
  }
}
```

### Key rules

- **Max 6 stat items** -- the validator truncates beyond this
- **Runs server-side** -- you can access internal IPs, private DNS. No CORS issues
- **Default timeout**: Use `createFetchOptions(8000)` for 8-second timeout
- **Use `getVisibleStats`** to respect the user's stat toggle preferences:

```ts
const visibleStats = getVisibleStats(config, this.statOptions);
if (visibleStats.includes("disk")) {
  items.push({ label: "Disk", value: "1.2", unit: "TB" });
}
```

### widgetData

If your plugin supports 2x1/2x2 widgets, pass rich data through `widgetData`:

```ts
return {
  items,
  status: "ok",
  widgetData: {
    recentItems: [...],
    chartData: [...],
  },
};
```

The widget component receives this via `stats.widgetData`.

---

## 7. Tile Sizes and Render Hints

The dashboard grid uses `gridAutoRows: 140px`. Tiles snap to these sizes:

| Size | Grid Cells    | Layout      | maxStats | Use case                                |
|------|---------------|-------------|----------|-----------------------------------------|
| 1x1  | 1 col x 1 row | `compact`  | 3        | Quick glance: 1-3 key stats            |
| 2x1  | 2 col x 1 row | `detailed` or `widget` | 6 | More room for stats or a mini widget |
| 2x2  | 2 col x 2 row | `widget`   | 4        | Full widget with custom React component |

### When you need a widget

- **1x1 only**: No widget needed. The dashboard renders stats automatically
- **2x1 with `layout: "detailed"`**: No widget needed. Stats render with labels
- **2x1 or 2x2 with `layout: "widget"`**: You must provide a widget component

### renderHints configuration

```ts
renderHints: {
  "1x1": { maxStats: 3, layout: "compact" },                                    // auto-rendered
  "2x1": { maxStats: 6, layout: "widget", widgetComponent: "MyServiceWidget" }, // custom widget
  "2x2": { maxStats: 4, layout: "widget", widgetComponent: "MyServiceWidget" }, // custom widget
}
```

The `widgetComponent` string must match the name you export as `widgetName` in your `index.ts`.

---

## 8. Building a Widget (Optional)

Widgets are React components that render inside 2x1 or 2x2 tiles. They receive full control over the tile's content area.

### When you need a widget

- Rich visual data: cover art, images, charts
- Interactive controls: play/pause, seek bars
- Custom layouts that go beyond simple stat numbers

### File location

Place your widget file in the same folder as `index.ts`:

```
community/my-plugin/
  index.ts
  MyPluginWidget.tsx    <- Widget component
```

### Widget Props

```ts
interface WidgetProps {
  stats: EnhancedStats;                    // { items, status, error?, widgetData? }
  config: Record<string, unknown>;         // Tile config
  tileId: number;                          // Tile database ID
  size: "2x1" | "2x2";                    // Current tile size
  onAction?: (action: string, payload?: unknown) => void;  // Optional action callback
}
```

### Requirements

1. Must be a `"use client"` component
2. Must handle both the `2x1` and `2x2` sizes if you support both
3. Must handle missing/error data gracefully (show a fallback)

### Example Widget

```tsx
"use client";

import type { WidgetProps } from "@/components/widgets/registry";
import { WidgetHeader } from "@/components/widgets/shared/WidgetHeader";

export function MyPluginWidget({ stats, size }: WidgetProps) {
  const data = stats.widgetData as { items: string[] } | undefined;
  const statusValue = stats.status === "ok" ? "online"
    : stats.status === "error" ? "offline" : "unknown";

  if (!data || stats.status === "error") {
    return (
      <div className="flex flex-col h-full">
        <WidgetHeader icon="Server" iconColor="#3498db" title="My Service" status={statusValue} />
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Keine Daten
        </div>
      </div>
    );
  }

  if (size === "2x2") {
    return (
      <div className="flex flex-col h-full">
        <WidgetHeader icon="Server" iconColor="#3498db" title="My Service" status={statusValue} />
        <div className="flex-1 p-3">
          {/* Full widget layout */}
        </div>
      </div>
    );
  }

  // 2x1 compact layout
  return (
    <div className="flex flex-col h-full">
      <WidgetHeader icon="Server" iconColor="#3498db" title="My Service" status={statusValue} />
      <div className="flex-1 p-2">
        {/* Mini layout */}
      </div>
    </div>
  );
}
```

### Registering the widget

In your `index.ts`, add these exports alongside the plugin:

```ts
export { MyPluginWidget as widget } from "./MyPluginWidget";
export const widgetName: string = "MyPluginWidget";
```

The auto-discovery script picks up `widget` and `widgetName` exports and registers them in the widget registry automatically. No core files need editing.

### WidgetHeader utility

The shared `WidgetHeader` component provides a consistent header bar:

```tsx
<WidgetHeader
  icon="Server"          // Lucide icon name
  iconColor="#3498db"    // Icon color
  title="My Service"     // Title text
  subtitle="Dashboard"   // Optional subtitle
  status="online"        // "online" | "offline" | "unknown"
/>
```

---

## 9. OAuth Plugins

Some services (Spotify, Google, etc.) require OAuth instead of a simple API key.

### When to use OAuth vs API key

- **API key**: The service provides a static key in its admin panel. Simpler for the user. Prefer this when available.
- **OAuth**: The service requires user consent via browser redirect. Use when there is no API key option or when you need user-scoped access.

### Step 1: Declare the oauth configField

```ts
configFields: [
  {
    key: "clientId",
    label: "Client ID",
    type: "text",
    required: true,
    description: "From your app's developer settings",
  },
  {
    key: "clientSecret",
    label: "Client Secret",
    type: "password",
    required: true,
  },
  {
    key: "oauth",
    label: "Authorize",
    type: "oauth",
    oauth: {
      authUrl: "https://provider.com/authorize",
      tokenUrl: "https://provider.com/api/token",
      scopes: ["read", "write"],
      pkce: false,
    },
  },
]
```

The user enters their `clientId` and `clientSecret` first, then clicks the OAuth button to authorize.

### Step 2: Implement `exchangeToken`

After the user authorizes, the dashboard's callback route (`/api/enhanced/oauth/callback`) calls your `exchangeToken` method with the authorization code:

```ts
async exchangeToken(code: string, redirectUri: string, config: PluginConfig) {
  const res = await fetch("https://provider.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: String(config.clientId),
      client_secret: String(config.clientSecret),
    }),
  });

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
  };
}
```

### Step 3: Implement `refreshToken`

The dashboard automatically calls `refreshToken` when `config.expiresAt` is within 60 seconds of expiry:

```ts
async refreshToken(config: PluginConfig) {
  const res = await fetch("https://provider.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: String(config.refreshToken),
      client_id: String(config.clientId),
      client_secret: String(config.clientSecret),
    }),
  });

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? String(config.refreshToken),
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
  };
}
```

### What the dashboard handles

- Redirecting the user to the provider's auth URL
- Receiving the callback with the authorization code
- Calling your `exchangeToken` with the code
- Storing tokens encrypted in the database
- Calling `refreshToken` automatically before tokens expire
- Persisting new tokens after refresh

### What your plugin handles

- The actual HTTP calls to the provider's token endpoint
- Returning `{ accessToken, refreshToken?, expiresAt? }`
- Using `config.accessToken` in `fetchStats` for API calls

---

## 10. Testing Your Plugin

### Option A: Manual placement (development)

1. Place your plugin folder at `src/plugins/community/{your-plugin-id}/`
2. Run `npm run generate:plugins` (or just `npm run dev`, which runs it automatically)
3. The plugin appears in the tile dialog

### Option B: ZIP upload (production)

1. ZIP your plugin folder (manifest + index.ts + optional widget)
2. Go to **Einstellungen > Plugins** (Settings > Plugins)
3. Upload the ZIP via the upload form
4. The dashboard validates, extracts, and registers the plugin

### Testing the connection

1. Add a new tile and select your plugin
2. Enter the connection details (URL, API key, etc.)
3. Click **"Verbindung testen"** (Test Connection) -- this calls your `testConnection` method
4. If successful, save the tile

### Debugging

- Check the server console (terminal running `npm run dev`) for errors
- The `logger` output shows plugin registration, fetch errors, and validation failures
- If your plugin fails to register, the validator logs the specific errors

### Common issues

| Symptom | Cause |
|---------|-------|
| Plugin not in tile dialog | `index.ts` missing `export const plugin` |
| "Validation failed" in logs | Check `metadata.color` format (`#XXXXXX`), `supportedSizes` is non-empty |
| Stats always empty | `fetchStats` is throwing -- wrap in try/catch |
| Widget not rendering | Missing `widget`/`widgetName` exports, or `widgetComponent` name mismatch in renderHints |

---

## 11. Available Utilities

Import from `../../utils` (or `@/plugins/utils` from builtin plugins):

### `normalizeUrl(url)`

Strips trailing slash from URLs. Always use this when building API endpoints:

```ts
const baseUrl = normalizeUrl(config.apiUrl);
// "http://myserver:8080/" -> "http://myserver:8080"
```

### `getVisibleStats(config, statOptions)`

Returns an array of stat keys the user has enabled. Respects the user's toggles from the tile settings, falls back to `defaultEnabled`:

```ts
const visible = getVisibleStats(config, this.statOptions);
if (visible.includes("disk")) {
  items.push({ label: "Disk", value: used, unit: "GB" });
}
```

### `createErrorResponse(err)`

Converts a caught error into a valid `PluginStats` error response:

```ts
catch (err) {
  return createErrorResponse(err);
  // -> { items: [], status: "error", error: "fetch failed" }
}
```

### `createFetchOptions(timeout?, headers?)`

Creates a `RequestInit` with an `AbortSignal.timeout`. Default timeout is 5000ms:

```ts
const opts = createFetchOptions(8000, { "Authorization": `Bearer ${token}` });
const res = await fetch(url, opts);
```

### `formatBytes(bytes)`

Formats bytes to human-readable string:

```ts
formatBytes(1536000000) // -> "1.4 GB"
```

### `formatUptime(seconds)`

Formats seconds to uptime string:

```ts
formatUptime(270000) // -> "3d 3h"
```

---

## 12. Limits and Rules

### Runtime environment

- `fetchStats` and `testConnection` run **server-side only** (Node.js). You can access internal IPs, private DNS names, and self-signed certs
- Widget components run **client-side** (React, browser). They must use `"use client"`
- No direct database access -- use `config` and `fetchStats` only

### File constraints

- Max ZIP upload size: **5 MB**
- Your plugin **must not** modify files outside its own folder
- Don't import from `@/lib/` or `@/components/` in your `index.ts` -- only import from `../../types` and `../../utils`
- Widget components **can** import from `@/components/widgets/registry` (for the `WidgetProps` type) and `@/components/widgets/shared/` (for shared components like `WidgetHeader`)

### Naming rules

- `metadata.id` must be kebab-case, unique, and must not conflict with builtin plugin IDs (currently: `emby`)
- `metadata.icon` must be a valid slug from [simpleicons.org](https://simpleicons.org)
- `metadata.color` must be a valid hex color in `#XXXXXX` format (6 digits, with hash)

### Validation

The plugin validator checks on registration:
- `metadata` exists with non-empty `id`, `name`, and valid `color`
- `configFields` is an array
- `supportedSizes` is a non-empty array of valid sizes
- `fetchStats` is a function
- `testConnection` is a function

Duplicate plugin IDs are rejected. The first registered plugin wins.

### Stats validation

The `validateStats` function sanitizes your `fetchStats` output:
- Truncates `items` to max 6 entries
- Drops items missing `label` or `value`
- Only allows `string` or `number` for `value`
- Falls back to `{ items: [], status: "error" }` if output is malformed

---

## 13. Complete Example -- Minimal Plugin

A simple plugin for a fictional "StatusPage" service that shows uptime and response time. No widget, 1x1 only.

### `plugin.manifest.json`

```json
{
  "id": "statuspage",
  "name": "StatusPage",
  "version": "1.0.0",
  "author": "CommunityDev",
  "description": "Uptime monitoring: status, response time, incidents"
}
```

### `index.ts`

```ts
import type { AppPlugin, PluginConfig, PluginStats } from "../../types";
import { normalizeUrl, getVisibleStats, createErrorResponse, createFetchOptions } from "../../utils";

export const plugin: AppPlugin = {
  metadata: {
    id: "statuspage",
    name: "StatusPage",
    icon: "statuspage",
    color: "#3BD671",
    description: "Uptime monitoring: status, response time, incidents",
    category: "Monitoring",
    website: "https://statuspage.example.com",
  },

  configFields: [
    {
      key: "apiUrl",
      label: "StatusPage URL",
      type: "url",
      placeholder: "https://status.example.com",
      required: true,
      description: "Die URL deiner StatusPage-Instanz",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      description: "API Key aus den StatusPage-Einstellungen",
    },
  ],

  statOptions: [
    {
      key: "status",
      label: "Status",
      description: "Overall system status",
      defaultEnabled: true,
    },
    {
      key: "uptime",
      label: "Uptime",
      description: "Uptime percentage (30 days)",
      defaultEnabled: true,
    },
    {
      key: "responseTime",
      label: "Response Time",
      description: "Average response time",
      defaultEnabled: true,
    },
    {
      key: "incidents",
      label: "Offene Incidents",
      description: "Number of unresolved incidents",
      defaultEnabled: false,
    },
  ],

  supportedSizes: ["1x1"],

  renderHints: {
    "1x1": { maxStats: 3, layout: "compact" },
  },

  async fetchStats(config: PluginConfig): Promise<PluginStats> {
    try {
      const baseUrl = normalizeUrl(config.apiUrl);
      const visibleStats = getVisibleStats(config, this.statOptions);
      const fetchOpts = createFetchOptions(8000, {
        "Authorization": `Bearer ${String(config.apiKey || "")}`,
      });

      const res = await fetch(`${baseUrl}/api/v1/summary`, fetchOpts);
      if (!res.ok) {
        return { items: [], status: "error", error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      const items = [];

      if (visibleStats.includes("status")) {
        const isUp = data.status === "operational";
        items.push({
          label: "Status",
          value: isUp ? "Operational" : "Degraded",
          color: isUp ? "green" : "red",
        });
      }

      if (visibleStats.includes("uptime") && data.uptime != null) {
        items.push({
          label: "Uptime",
          value: data.uptime.toFixed(2),
          unit: "%",
        });
      }

      if (visibleStats.includes("responseTime") && data.avgResponseMs != null) {
        items.push({
          label: "Response",
          value: Math.round(data.avgResponseMs),
          unit: "ms",
        });
      }

      if (visibleStats.includes("incidents") && data.openIncidents != null) {
        items.push({
          label: "Incidents",
          value: data.openIncidents,
          color: data.openIncidents > 0 ? "red" : undefined,
        });
      }

      return { items, status: "ok" };
    } catch (err) {
      return createErrorResponse(err);
    }
  },

  async testConnection(config: PluginConfig): Promise<{ ok: boolean; message: string }> {
    try {
      const baseUrl = normalizeUrl(config.apiUrl);
      const res = await fetch(`${baseUrl}/api/v1/health`, {
        ...createFetchOptions(),
        headers: { "Authorization": `Bearer ${String(config.apiKey || "")}` },
      });
      if (!res.ok) {
        return { ok: false, message: `HTTP ${res.status}: Zugriff verweigert` };
      }
      const data = await res.json();
      return { ok: true, message: `Verbunden mit ${data.name || "StatusPage"}` };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  },
};
```

---

## 14. Complete Example -- Full Plugin with Widget

A more complex plugin with OAuth, multiple sizes, and a custom widget. This example shows the structure for a music streaming service.

> For a real-world production example, see the builtin Emby plugin at `src/plugins/builtin/emby/index.ts` and its widget at `src/components/widgets/emby/EmbyWidget.tsx`.

### `plugin.manifest.json`

```json
{
  "id": "music-stream",
  "name": "MusicStream",
  "version": "1.0.0",
  "author": "CommunityDev",
  "description": "Now playing, library stats, and playback controls",
  "hasWidget": true,
  "widgetFile": "MusicStreamWidget.tsx"
}
```

### `index.ts`

```ts
import type { AppPlugin, PluginConfig, PluginStats } from "../../types";
import { normalizeUrl, getVisibleStats, createErrorResponse, createFetchOptions } from "../../utils";

// Re-export widget for auto-discovery
export { MusicStreamWidget as widget } from "./MusicStreamWidget";
export const widgetName: string = "MusicStreamWidget";

export const plugin: AppPlugin = {
  metadata: {
    id: "music-stream",
    name: "MusicStream",
    icon: "musicbrainz",
    color: "#BA5D07",
    description: "Now playing, library stats, and playback controls",
    category: "Media",
    website: "https://musicstream.example.com",
  },

  configFields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "text",
      required: true,
      description: "From the MusicStream developer portal",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "password",
      required: true,
    },
    {
      key: "oauth",
      label: "Mit MusicStream verbinden",
      type: "oauth",
      oauth: {
        authUrl: "https://musicstream.example.com/authorize",
        tokenUrl: "https://musicstream.example.com/api/token",
        scopes: ["user-read-playback-state", "user-library-read"],
        pkce: true,
      },
    },
  ],

  statOptions: [
    { key: "nowPlaying", label: "Now Playing", description: "Currently playing track", defaultEnabled: true },
    { key: "tracks", label: "Tracks", description: "Total tracks in library", defaultEnabled: true },
    { key: "playlists", label: "Playlists", description: "Number of playlists", defaultEnabled: true },
    { key: "artists", label: "Artists", description: "Followed artists", defaultEnabled: false },
  ],

  supportedSizes: ["1x1", "2x1", "2x2"],

  renderHints: {
    "1x1": { maxStats: 3, layout: "compact" },
    "2x1": { maxStats: 4, layout: "widget", widgetComponent: "MusicStreamWidget" },
    "2x2": { maxStats: 4, layout: "widget", widgetComponent: "MusicStreamWidget" },
  },

  async fetchStats(config: PluginConfig): Promise<PluginStats> {
    try {
      const token = String(config.accessToken || "");
      if (!token) {
        return { items: [], status: "error", error: "Not authenticated. Please connect via OAuth." };
      }

      const visibleStats = getVisibleStats(config, this.statOptions);
      const headers = { "Authorization": `Bearer ${token}` };
      const fetchOpts = createFetchOptions(8000, headers);

      // Parallel fetches
      const [playerRes, libraryRes] = await Promise.all([
        fetch("https://api.musicstream.example.com/v1/me/player", fetchOpts),
        fetch("https://api.musicstream.example.com/v1/me/library", fetchOpts),
      ]);

      const items = [];

      // Now playing
      if (visibleStats.includes("nowPlaying") && playerRes.ok) {
        const player = await playerRes.json();
        if (player.is_playing && player.item) {
          items.push({
            label: "Playing",
            value: player.item.name,
            color: "green",
          });
        } else {
          items.push({ label: "Playing", value: "Paused" });
        }
      }

      // Library stats
      if (libraryRes.ok) {
        const lib = await libraryRes.json();
        if (visibleStats.includes("tracks")) {
          items.push({ label: "Tracks", value: lib.totalTracks ?? 0 });
        }
        if (visibleStats.includes("playlists")) {
          items.push({ label: "Playlists", value: lib.totalPlaylists ?? 0 });
        }
        if (visibleStats.includes("artists")) {
          items.push({ label: "Artists", value: lib.followedArtists ?? 0 });
        }
      }

      // Widget data for 2x1/2x2
      let widgetData: Record<string, unknown> | undefined;
      if (playerRes.ok) {
        const player = await playerRes.json();
        widgetData = {
          isPlaying: player.is_playing ?? false,
          trackName: player.item?.name ?? null,
          artistName: player.item?.artist ?? null,
          albumArt: player.item?.album?.image ?? null,
          progress: player.progress_ms ?? 0,
          duration: player.item?.duration_ms ?? 0,
        };
      }

      return { items, status: "ok", widgetData };
    } catch (err) {
      return createErrorResponse(err);
    }
  },

  async testConnection(config: PluginConfig) {
    try {
      const token = String(config.accessToken || "");
      if (!token) {
        return { ok: false, message: "Bitte zuerst OAuth-Verbindung herstellen" };
      }
      const res = await fetch("https://api.musicstream.example.com/v1/me", {
        ...createFetchOptions(),
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      const user = await res.json();
      return { ok: true, message: `Verbunden als ${user.display_name}` };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  },

  async exchangeToken(code: string, redirectUri: string, config: PluginConfig) {
    const res = await fetch("https://musicstream.example.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: String(config.clientId),
        client_secret: String(config.clientSecret),
      }),
    });
    if (!res.ok) throw new Error(`Token exchange failed: HTTP ${res.status}`);
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    };
  },

  async refreshToken(config: PluginConfig) {
    const res = await fetch("https://musicstream.example.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: String(config.refreshToken),
        client_id: String(config.clientId),
        client_secret: String(config.clientSecret),
      }),
    });
    if (!res.ok) throw new Error(`Token refresh failed: HTTP ${res.status}`);
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? String(config.refreshToken),
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    };
  },
};
```

### `MusicStreamWidget.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import type { WidgetProps } from "@/components/widgets/registry";
import { WidgetHeader } from "@/components/widgets/shared/WidgetHeader";

interface MusicWidgetData {
  isPlaying: boolean;
  trackName: string | null;
  artistName: string | null;
  albumArt: string | null;
  progress: number;
  duration: number;
}

function parseWidgetData(raw: Record<string, unknown> | undefined): MusicWidgetData | null {
  if (!raw || !raw.trackName) return null;
  return {
    isPlaying: Boolean(raw.isPlaying),
    trackName: raw.trackName as string,
    artistName: (raw.artistName as string) ?? null,
    albumArt: (raw.albumArt as string) ?? null,
    progress: (raw.progress as number) ?? 0,
    duration: (raw.duration as number) ?? 0,
  };
}

function formatMs(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function MusicStreamWidget({ stats, size }: WidgetProps) {
  const data = parseWidgetData(stats.widgetData);
  const statusValue = stats.status === "ok" ? "online"
    : stats.status === "error" ? "offline" : "unknown";

  // Fallback when no data
  if (!data) {
    return (
      <div className="flex flex-col h-full">
        <WidgetHeader icon="Music" iconColor="#BA5D07" title="MusicStream" status={statusValue} />
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          {stats.status === "error" ? stats.error : "Keine Wiedergabe"}
        </div>
      </div>
    );
  }

  // 2x2: full player layout
  if (size === "2x2") {
    return (
      <div className="flex flex-col h-full">
        <WidgetHeader icon="Music" iconColor="#BA5D07" title="MusicStream" status={statusValue} />
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
          {data.albumArt && (
            <img
              src={data.albumArt}
              alt={data.trackName ?? "Album"}
              className="w-24 h-24 rounded-lg object-cover shadow-lg"
            />
          )}
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground truncate max-w-full">
              {data.trackName}
            </p>
            {data.artistName && (
              <p className="text-xs text-muted-foreground">{data.artistName}</p>
            )}
          </div>
          <div className="w-full flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{formatMs(data.progress)}</span>
            <div className="flex-1 h-1 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#BA5D07] rounded-full"
                style={{ width: `${data.duration > 0 ? (data.progress / data.duration) * 100 : 0}%` }}
              />
            </div>
            <span>{formatMs(data.duration)}</span>
          </div>
        </div>
      </div>
    );
  }

  // 2x1: compact now-playing strip
  return (
    <div className="flex flex-col h-full">
      <WidgetHeader icon="Music" iconColor="#BA5D07" title="MusicStream" status={statusValue} />
      <div className="flex-1 flex items-center gap-3 px-3">
        {data.albumArt && (
          <img
            src={data.albumArt}
            alt={data.trackName ?? "Album"}
            className="h-[calc(100%-8px)] aspect-square rounded-md object-cover"
          />
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-semibold text-foreground truncate">
            {data.trackName}
          </span>
          {data.artistName && (
            <span className="text-[9px] text-muted-foreground truncate">
              {data.artistName}
            </span>
          )}
          <span className="text-[9px] text-muted-foreground/60 mt-0.5">
            {data.isPlaying ? "Playing" : "Paused"} · {formatMs(data.progress)} / {formatMs(data.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## Questions?

Open an issue on the [Dominion GitHub repository](https://github.com) or check the existing community plugins in `src/plugins/community/` for more examples.
