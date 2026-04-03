# Dominion - Dashboard Project

## Tech Stack
- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** + CSS Custom Properties for themes
- **shadcn/ui** (base-nova style - APIs differ from standard shadcn!)
- **Prisma 7.x** with `prisma-client-js` generator + SQLite via `@prisma/adapter-better-sqlite3`
- **Auth.js** (next-auth v5 beta) with Credentials provider
- **@dnd-kit/react** v0.3.x (NOT classic @dnd-kit/core - different API!)
- **motion** v12 (import from "motion/react", NOT "framer-motion")
- **simple-icons** for brand SVG logos

## Important Architecture Notes

### Prisma 7.x Quirks
- Generator is `prisma-client-js` (NOT `prisma-client` which causes node:path errors with Turbopack)
- PrismaClient REQUIRES adapter: `new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })`
- Imports from `@/generated/prisma` (NOT `@/generated/prisma/client`)
- DATABASE_URL uses relative path: `file:./prisma/dev.db`

### Middleware / Edge Runtime
- Middleware CANNOT import Prisma (Edge Runtime incompatible)
- Uses `getToken` from `next-auth/jwt` directly instead of importing auth.ts
- Auth.ts imports db.ts which imports Prisma - never import in Edge context

### ThemeProvider
- MUST always wrap children in `<ThemeContext.Provider>` even when not mounted
- `setTheme()` applies data-theme attribute immediately (synchronous DOM update)
- CSS themes use `[data-theme="..."]` selectors - NO `:root` override with color vars allowed
- `backgroundType` controls animated background: "gradient" | "aurora" | "lines" | "prism" | "wallpaper"
- When wallpaper is set, backgroundType auto-switches to "wallpaper"

### shadcn base-nova Style
- Component APIs differ from standard shadcn docs - always read `src/components/ui/*.tsx` before using
- Select uses base-ui under the hood with different callback signatures
- DropdownMenu may need `render` prop instead of `asChild`

### Server Actions vs Queries
- Read-only functions: `src/lib/queries/` (no "use server", imported in server components)
- Mutations: `src/lib/actions/` (with "use server", called from client components)
- NEVER call "use server" functions from server components (causes unnecessary HTTP roundtrip)

### Plugin System (Iteration 3)
- **Interface:** `src/plugins/types.ts` (AppPlugin, PluginMetadata, ConfigField, StatOption, SizeRenderHint)
- **Registry:** `src/plugins/registry.ts` (barrel imports, validates on load, getPlugin/getAllPlugins/getPluginCatalog)
- **Validator:** `src/plugins/validator.ts` (validatePlugin + validateStats for runtime safety)
- **Builtin Plugins:** `src/plugins/builtin/` (1 builtin plugin: emby)
- **Backward Compat:** `src/lib/enhanced/registry.ts` bridges old EnhancedApp interface to new plugin system
- **API proxy:** `/api/enhanced/[appId]` (server-side fetch, keeps API keys hidden)
- **Test endpoint:** `/api/enhanced/test` (POST with type + config)

### Group Dashboards
- Groups are SUB-DASHBOARDS, not collapsible sections
- `GroupTile` junction table enables cloning tiles to groups (not moving)
- Main dashboard shows groups as special 1x1 tiles (GroupTile component)
- Sub-dashboard route: `/dashboard/group/[groupId]`
- GroupDialog handles create/edit with icon selection, color picker, tile assignment
- Apps cloned to groups remain on main dashboard too

### Tile Sizes
- **1x1 (Klein):** Standard tiles always 1x1, enhanced tiles default
- **2x2 (Mittel):** Enhanced tiles only, plugin must support
- **3x2 (Gross):** Enhanced tiles only, for widget rendering
- Size options in TileDialog come from `plugin.supportedSizes`
- Grid uses `gridAutoRows: 140px` for consistent alignment

### Online/Offline Status
- `OnlineIndicator` component: green (online), red (offline), gray (unknown)
- `useHealthCheck` hook polls `/api/health` every 60 seconds
- Server-side health checks cached in `HealthStatus` table (60s TTL)
- Avoids CORS by proxying through server

### Animated Backgrounds
- 4 options: Gradient (CSS default), Soft Aurora, Floating Lines, Prism
- Canvas-based components in `src/components/backgrounds/`
- `BackgroundRenderer` uses React.lazy for code-splitting
- Selection in Settings > Appearance, disabled when wallpaper is set

### AI Chat Integration
- Provider adapters: `src/lib/ai/adapters/` (openai, claude, gemini, ollama)
- Chat API: `/api/ai/chat` (streaming) + `/api/ai/test` (connection test)
- Chat Panel: floating glass overlay, ephemeral messages (not persisted)
- Settings: `/settings/ai` for provider/key/model configuration
- Header button: Sparkles icon, disabled when not configured

### TileDialog Auto-Detection
- Title input triggers fuzzy icon/color/description detection from plugin catalog + simple-icons
- Enhanced config appears automatically when title matches a plugin (no manual type selection)
- URL field has onBlur reachability check (informational, non-blocking)
- Mode selector: "App hinzufuegen" vs "Gruppen-Dashboard"

## File Structure
```
src/
  plugins/
    types.ts              # AppPlugin interface
    registry.ts           # Plugin registry with validation
    validator.ts          # Runtime validation
    builtin/              # 1 builtin plugin (emby), more added incrementally
      emby/
  lib/
    enhanced/             # Legacy bridge (delegates to plugins)
    ai/                   # AI provider adapters
      adapters/           # openai, claude, gemini, ollama
    actions/              # Server mutations
    queries/              # Server reads
  components/
    dashboard/            # Main UI (Dashboard, Tile, TileGrid, TileDialog, GroupTile, GroupDialog, etc.)
    backgrounds/          # Animated background components (SoftAurora, FloatingLines, Prism)
    chat/                 # ChatPanel
    settings/             # Settings components
    theme/                # ThemeProvider
  hooks/
    useHealthCheck.ts     # Health polling hook
  app/
    dashboard/group/[groupId]/  # Sub-dashboard route
    settings/ai/                # AI settings route
    api/health/                 # Health check API
    api/ai/chat/ + test/        # AI chat API
```

## Dev Commands
```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npx prisma studio    # Browse DB
npx prisma db seed   # Re-seed data
```

## Next Tasks
- Phase 8: Enhanced App Widget components (medium/large custom widgets per plugin)
- Phase 9: App catalog expansion to 50+ foundation apps (plugins added incrementally)
- Phase 10: Foundation app seed data auto-generation from plugin catalog
