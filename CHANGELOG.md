# Changelog

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
