# Changelog

## v1.3.0-beta (2026-04-09)

### Added
- **Notification Panel** — real-time notification sidebar with SSE streaming, badge counter, collapsible panel
- **Notification Sources** — multi-step wizard to create RSS feeds, API key sources, or connect Enhanced Apps
- **RSS Feed Poller** — automatic polling with configurable intervals (5/15/30/60 min), per-feed category
- **API Key Management** — generate keys for external services (N8N, scripts), curl example on creation
- **Settings Page** — full source management (create, edit, delete, enable/disable, key regeneration)
- **Critical Pulse** — critical notifications glow with inset red pulse animation
- **App Connect Framework** — `supportsNotifications` flag for plugins, AppConnection linking ready

### Security
- SSRF protection on RSS feeds (blocked: localhost, metadata endpoints, link-local IPs)
- Feed URL validation at creation, update, and poll time (triple-check)
- Middleware scoped: only POST `/api/notifications` is public (API key auth), sub-routes require session
- Input validation: URL scheme check, priority bounds, payload length limits
- API keys encrypted at rest (AES-256-GCM)
- Rate limiting per source (configurable, default 60/hour)

### Fixed
- Notification panel no longer crashes on init failure (defensive try-catch)
- `isExpired()` handles both null and undefined correctly
- RSS poller only imports items from source creation date onwards (no old flood)
- Panel limited to 20 newest notifications
- Source deletion is instant (optimistic UI)
- "Mehr anzeigen" uses DOM-based truncation detection (works at any panel width)

---

## v1.0.10-alpha (2026-04-07)

### Added
- **App Catalog** — `docs/apps/` with browsable app pages on GitHub
- **Emby App Page** — full documentation (requirements, config, stats, troubleshooting)
- App Catalog link in README

---

## v1.0.9-alpha (2026-04-07)

### Added
- **Plugin Guide: configField visibility rules** — documents when fields appear in the dialog (connection vs feature split)
- **Plugin Guide: crawlEntities specification** — full spec with interfaces, entity picker behavior, selectedEntities format
- **Plugin Guide: supportedSizes & STAT_LIMITS** — documents auto-reset, limits per size, preview_tile tip

---

## v1.0.8-alpha (2026-04-07)

### Added
- **Community Apps** — renamed from "Plugin Upload", full lifecycle: install, update, delete
- **Entity-Picker auto-crawl** — entities load automatically when editing tiles with linked connections
- **Entity-Picker auto-expand** — domains with selected entities open automatically
- **Editable entity labels** — custom display names per entity, per tile
- **Community files** — CONTRIBUTING.md, SECURITY.md, issue/PR templates for GitHub

### Fixed
- Entity-Picker overflow — long entity names and state values stay within dialog bounds
- Missing ownership checks on `removeTileFromGroup` and `assignTilesToGroup`
- Unused import in crawl route
- Double JSON.parse in auto-crawl effect
- Hardcoded "Spotify" fallback replaced with dynamic plugin name
- Broken links in README and plugin development guide

---

## v1.0.7-alpha (2026-04-06)

### Security
- **Fix XSS in OAuth callback** — pluginId/connectionId now properly escaped via JSON.stringify
- **HMAC-signed OAuth state** — new `/api/enhanced/oauth/state` endpoint prevents state parameter forgery
- **Open redirect prevention** — OAuth returnUrl validated to be relative paths only
- **Security headers** — X-Content-Type-Options, X-Frame-Options, Referrer-Policy on all routes
- **Login rate limiting** — 5 attempts per 15 minutes per IP
- **SSRF protection** — health check blocks cloud metadata endpoints (169.254.x.x)
- **File upload hardening** — extension whitelist (jpg, jpeg, png, webp, avif)
- **Error message sanitization** — no internal details leaked to client
- **AUTH_SECRET warnings** — visible console warnings when using fallback secret

### Fixed
- **Critical: createGroup userId bug** — groups now correctly assigned to authenticated user (was defaulting to user 1)
- **Group ownership checks** — update, delete, reorder, collapse now verify ownership
- **importData transaction safety** — delete + create wrapped in $transaction (no more partial data loss)
- **reorderGroupTiles** — switched from Promise.all to $transaction for atomicity
- **HTTP status codes** — error responses now return proper 400/404/500 instead of 200
- **AbortController in AI test** — timeout signal now actually cancels the request
- **formatUptime** — shows minutes for durations under 1 hour (was showing "0h")
- **getVisibleStats** — JSON.parse wrapped in try/catch
- **createInitialUser** — password length validation added (min 6 chars)
- **handleToggleCollapsed** — wrapped in startTransition (matching all other handlers)
- **Tile unpin label** — "Nicht mehr anheften" instead of "Loesung"
- **SystemSettings version** — now reads from package.json instead of hardcoded "0.9.5"
- **OAuth in AppConnectionManager** — opens popup instead of page navigation (no more lost state)

### Added
- **Toast notifications** (Sonner) — glass-dark styled success/error feedback on all dashboard actions
- **Empty dashboard onboarding** — welcome screen with guided "Add first app" button for new users
- **Import confirmation dialog** — warns before overwriting all data
- **Search empty state** — "Keine Apps gefunden" when no results match
- **Plugin upload error feedback** — clear error messages instead of silent failures

### Changed
- **Shared requireUserId()** — extracted to single module (was duplicated in 6 files)
- **Shared constants** — PRESET_COLORS and GROUP_ICON_MAP extracted (was duplicated in 4/3 files)
- **Accessibility improvements** — ARIA labels on color swatches, alertdialog role on confirm dialog, keyboard-visible context menus, search input aria-label
- **Schema migration** — removed dangerous `@default(1)` from TileGroup.userId

---

## v1.0.6-alpha (2026-04-03)

### Added
- **OAuth framework** for Enhanced Apps — plugins can declare OAuth config fields, shared callback route handles token exchange, automatic token refresh before fetchStats
- **Plugin Upload** (Settings > Plugin Upload) — ZIP upload with drag & drop, manifest validation, automatic extraction and registration
- **Plugin Manifest spec** (`plugin.manifest.json`) — required metadata for community plugins with 9-point validation
- **Server Restart** button in Settings > System — two-step confirmation, auto-reload when server is back
- **Auto-reload after restart** — browser polls `/api/health` and refreshes when server responds

### Fixed
- **Last hardcoded userId=1** in Settings > Apps — connections now load correctly for all users
- **ConfigField validator** now checks field types against whitelist
- **AppConnectionManager** now renders all field types (textarea, select, number, oauth) instead of just text/password/url

---

## v1.0.5-alpha (2026-04-02)

### Fixed
- **Critical: Hardcoded userId=1 replaced with dynamic session ID** — all pages and API routes now read the user ID from the JWT session instead of assuming user 1. This fixes 403 errors on Enhanced tiles and ensures multi-user readiness.

---

## v1.0.4-alpha (2026-04-01)

### Fixed
- **Logout redirect** — no longer redirects to `0.0.0.0`, stays on your actual host
- **Theme loads immediately after login** — hard navigation ensures server fetches DB settings with new session

---

## v1.0.3-alpha (2026-04-01)

### Fixed
- **Theme & wallpaper sync across browsers/devices** — settings now persist in database, not just localStorage
- On login, your theme, background type, and wallpaper load from the server — same look on every device

---

## v1.0.2-alpha (2026-04-01)

### Fixed
- **Wallpaper uploads in Docker** — uploads now stored in persistent `/data/uploads/` volume instead of read-only container filesystem
- New API route `/api/uploads/[filename]` serves uploaded files with auth protection and cache headers

---

## v1.0.1-alpha (2026-04-01)

### Added
- **Password change** in Settings > System — users can now change their password without CLI access
- **Logout button** in dashboard header
- **Health check GET endpoint** (`/api/health`) for Docker health monitoring

### Fixed
- Docker: `AUTH_TRUST_HOST=true` baked into image (no more UntrustedHost errors)
- Docker: CRLF line endings in entrypoint script (exit code 127 on Linux)
- Docker: All pages marked as `force-dynamic` (no more build-time DB errors)
- `.dockerignore` no longer blocks required build files

### Changed
- Docker Compose uses `image: miguel1988/dominion:latest` instead of local build
- README redesigned with storytelling, progressive disclosure, plugin focus

---

## v1.0.0-alpha (2026-04-01)

### Initial Release
- 60+ foundation apps with auto-detected icons from simple-icons
- Enhanced App plugin system (Emby shipped as first plugin)
- 6 themes: Glass Dark, Glass Light, Dark, Light, Nord, Catppuccin
- 4 animated backgrounds: Gradient, Soft Aurora, Floating Lines, Prism
- Drag-and-drop tile arrangement with groups and sub-dashboards
- Command palette search (Ctrl+K)
- AES-256-GCM encryption for stored API keys
- Auth.js with JWT sessions
- Docker-ready with SQLite persistent volume
- Export/Import backup system
- AI chat integration (experimental): OpenAI, Claude, Gemini, Ollama
- Custom login page with Dominion branding and decrypt animation
