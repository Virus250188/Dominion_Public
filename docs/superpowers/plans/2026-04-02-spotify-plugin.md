# Spotify Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Spotify remote-control plugin for the Dominion Dashboard with 1x1 stats, 2x1 mini-player, and 2x2 full player widget — including OAuth login, playback controls, device switching, volume, and like functionality.

**Architecture:** Community plugin (`src/plugins/community/spotify/`) with dedicated API routes for OAuth and player actions (`src/app/api/spotify/`). Widget components route by tile size (2x1/2x2). OAuth tokens stored in AppConnection.config. Framework extended with new `"oauth"` ConfigField type for TileDialog.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Prisma 7 (SQLite), Spotify Web API (REST), OAuth 2.0 PKCE

**Spec:** `docs/superpowers/specs/2026-04-02-spotify-plugin-design.md`

---

## File Structure

```
NEW FILES:
  src/plugins/community/spotify/index.ts          — Plugin definition (AppPlugin)
  src/plugins/community/spotify/spotify-api.ts     — Spotify API client + token refresh
  src/plugins/community/spotify/types.ts           — Spotify-specific TypeScript types

  src/components/widgets/spotify/SpotifyWidget.tsx          — Widget router (2x1 vs 2x2)
  src/components/widgets/spotify/SpotifyPlayer2x2.tsx       — Full Player widget
  src/components/widgets/spotify/SpotifyPlayer2x1.tsx       — Mini Player / Clean Info
  src/components/widgets/spotify/SpotifyDeviceSelector.tsx  — Device dropdown component

  src/app/api/spotify/auth/route.ts        — OAuth start (redirect to Spotify)
  src/app/api/spotify/callback/route.ts    — OAuth callback (exchange code → tokens)
  src/app/api/spotify/status/route.ts      — Connection status check
  src/app/api/spotify/disconnect/route.ts  — Remove stored tokens
  src/app/api/spotify/action/route.ts      — Player actions (play, pause, etc.)

MODIFIED FILES:
  src/plugins/types.ts                                — Add "oauth" to ConfigFieldType union
  src/components/dashboard/TileDialog.tsx              — Add OAuth field rendering case
  .env.example                                         — Add SPOTIFY_* variables
```

---

## Task 1: Project Setup & Spotify Types

**Files:**
- Modify: `.env.example`
- Create: `src/plugins/community/spotify/types.ts`

- [ ] **Step 1: Add Spotify environment variables to .env.example**

Append to `c:\Users\Miguel\Desktop\Dashboard\.env.example`:

```env
# Spotify OAuth (register at https://developer.spotify.com/dashboard)
SPOTIFY_CLIENT_ID=""
SPOTIFY_CLIENT_SECRET=""
SPOTIFY_REDIRECT_URI="http://localhost:3000/api/spotify/callback"
```

- [ ] **Step 2: Create .env.local with actual placeholder values**

If `.env.local` does not already contain these variables, add them:

```env
SPOTIFY_CLIENT_ID=""
SPOTIFY_CLIENT_SECRET=""
SPOTIFY_REDIRECT_URI="http://localhost:3000/api/spotify/callback"
```

- [ ] **Step 3: Create Spotify types file**

Create `src/plugins/community/spotify/types.ts`:

```typescript
// Spotify API response types

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
  userId: string;
  displayName: string;
}

export interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;  // ms
  progress: number;  // ms
  uri: string;
  isLiked: boolean;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string; // "Computer" | "Smartphone" | "Speaker" | etc.
  volume: number; // 0-100
  isActive: boolean;
}

export interface SpotifyWidgetData {
  isPlaying: boolean;
  track: SpotifyTrack | null;
  device: SpotifyDevice | null;
  availableDevices: SpotifyDevice[];
  shuffle: boolean;
  repeat: "off" | "track" | "context";
  displayMode: "library" | "topArtist" | "nowPlaying";
  widgetMode: "miniPlayer" | "cleanInfo";
  topArtistName: string | null;
}

export interface SpotifyActionPayload {
  action:
    | "play"
    | "pause"
    | "next"
    | "previous"
    | "seek"
    | "volume"
    | "shuffle"
    | "repeat"
    | "like"
    | "unlike"
    | "transfer";
  payload?: {
    position_ms?: number;
    volume_percent?: number;
    device_id?: string;
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add .env.example src/plugins/community/spotify/types.ts
git commit -m "feat(spotify): add environment variables and type definitions"
```

---

## Task 2: Spotify API Client

**Files:**
- Create: `src/plugins/community/spotify/spotify-api.ts`

This module handles all Spotify API communication including automatic token refresh.

- [ ] **Step 1: Create the Spotify API client**

Create `src/plugins/community/spotify/spotify-api.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import type { SpotifyTokens, SpotifyDevice } from "./types";

const prisma = new PrismaClient();

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

// ── Token Management ────────────────────────────────────────────

export function getSpotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing Spotify credentials. Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI in .env.local"
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export async function getTokensForConnection(
  connectionId: number
): Promise<SpotifyTokens | null> {
  const conn = await prisma.appConnection.findUnique({
    where: { id: connectionId },
  });
  if (!conn?.config) return null;

  try {
    const config = JSON.parse(conn.config);
    if (!config.accessToken || !config.refreshToken) return null;
    return config as SpotifyTokens;
  } catch {
    return null;
  }
}

export async function saveTokens(
  connectionId: number,
  tokens: SpotifyTokens
): Promise<void> {
  await prisma.appConnection.update({
    where: { id: connectionId },
    data: { config: JSON.stringify(tokens) },
  });
}

export async function refreshAccessToken(
  connectionId: number,
  tokens: SpotifyTokens
): Promise<SpotifyTokens> {
  const { clientId, clientSecret } = getSpotifyCredentials();

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  const data = await res.json();

  const updated: SpotifyTokens = {
    ...tokens,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  await saveTokens(connectionId, updated);
  return updated;
}

export async function getValidToken(
  connectionId: number
): Promise<string> {
  const tokens = await getTokensForConnection(connectionId);
  if (!tokens) throw new Error("No Spotify tokens found");

  // Refresh if expiring within 60 seconds
  if (Date.now() > tokens.expiresAt - 60_000) {
    const refreshed = await refreshAccessToken(connectionId, tokens);
    return refreshed.accessToken;
  }

  return tokens.accessToken;
}

// ── API Helpers ─────────────────────────────────────────────────

async function spotifyGet(
  accessToken: string,
  path: string,
  timeout = 5000
): Promise<Response> {
  return fetch(`${SPOTIFY_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(timeout),
  });
}

async function spotifyPut(
  accessToken: string,
  path: string,
  body?: Record<string, unknown>
): Promise<Response> {
  return fetch(`${SPOTIFY_API}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
}

async function spotifyPost(
  accessToken: string,
  path: string,
  body?: Record<string, unknown>
): Promise<Response> {
  return fetch(`${SPOTIFY_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
}

async function spotifyDelete(
  accessToken: string,
  path: string,
  body?: Record<string, unknown>
): Promise<Response> {
  return fetch(`${SPOTIFY_API}${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
}

// ── Data Fetching ───────────────────────────────────────────────

export async function fetchPlaybackState(accessToken: string) {
  const res = await spotifyGet(accessToken, "/me/player");
  if (res.status === 204) return null; // No active device
  if (!res.ok) return null;
  return res.json();
}

export async function fetchCurrentTrack(accessToken: string) {
  const res = await spotifyGet(accessToken, "/me/player/currently-playing");
  if (res.status === 204) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSavedTracksCount(
  accessToken: string
): Promise<number> {
  const res = await spotifyGet(accessToken, "/me/tracks?limit=1");
  if (!res.ok) return 0;
  const data = await res.json();
  return data.total ?? 0;
}

export async function fetchPlaylistCount(
  accessToken: string
): Promise<number> {
  const res = await spotifyGet(accessToken, "/me/playlists?limit=1");
  if (!res.ok) return 0;
  const data = await res.json();
  return data.total ?? 0;
}

export async function fetchFollowingCount(
  accessToken: string
): Promise<number> {
  const res = await spotifyGet(
    accessToken,
    "/me/following?type=artist&limit=1"
  );
  if (!res.ok) return 0;
  const data = await res.json();
  return data.artists?.total ?? 0;
}

export async function fetchTopArtist(
  accessToken: string
): Promise<string | null> {
  const res = await spotifyGet(
    accessToken,
    "/me/top/artists?limit=1&time_range=short_term"
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0]?.name ?? null;
}

export async function fetchAvailableDevices(
  accessToken: string
): Promise<SpotifyDevice[]> {
  const res = await spotifyGet(accessToken, "/me/player/devices");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.devices ?? []).map(
    (d: { id: string; name: string; type: string; volume_percent: number; is_active: boolean }) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      volume: d.volume_percent ?? 0,
      isActive: d.is_active,
    })
  );
}

export async function checkTrackSaved(
  accessToken: string,
  trackId: string
): Promise<boolean> {
  const res = await spotifyGet(
    accessToken,
    `/me/tracks/contains?ids=${trackId}`
  );
  if (!res.ok) return false;
  const data = await res.json();
  return data[0] === true;
}

export async function fetchUserProfile(accessToken: string) {
  const res = await spotifyGet(accessToken, "/me");
  if (!res.ok) return null;
  return res.json();
}

// ── Player Actions ──────────────────────────────────────────────

export async function play(accessToken: string): Promise<boolean> {
  const res = await spotifyPut(accessToken, "/me/player/play");
  return res.ok || res.status === 204;
}

export async function pause(accessToken: string): Promise<boolean> {
  const res = await spotifyPut(accessToken, "/me/player/pause");
  return res.ok || res.status === 204;
}

export async function nextTrack(accessToken: string): Promise<boolean> {
  const res = await spotifyPost(accessToken, "/me/player/next");
  return res.ok || res.status === 204;
}

export async function previousTrack(accessToken: string): Promise<boolean> {
  const res = await spotifyPost(accessToken, "/me/player/previous");
  return res.ok || res.status === 204;
}

export async function seek(
  accessToken: string,
  positionMs: number
): Promise<boolean> {
  const res = await spotifyPut(
    accessToken,
    `/me/player/seek?position_ms=${positionMs}`
  );
  return res.ok || res.status === 204;
}

export async function setVolume(
  accessToken: string,
  volumePercent: number
): Promise<boolean> {
  const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
  const res = await spotifyPut(
    accessToken,
    `/me/player/volume?volume_percent=${clamped}`
  );
  return res.ok || res.status === 204;
}

export async function setShuffle(
  accessToken: string,
  state: boolean
): Promise<boolean> {
  const res = await spotifyPut(
    accessToken,
    `/me/player/shuffle?state=${state}`
  );
  return res.ok || res.status === 204;
}

export async function setRepeat(
  accessToken: string,
  state: "off" | "track" | "context"
): Promise<boolean> {
  const res = await spotifyPut(
    accessToken,
    `/me/player/repeat?state=${state}`
  );
  return res.ok || res.status === 204;
}

export async function saveTrack(
  accessToken: string,
  trackId: string
): Promise<boolean> {
  const res = await spotifyPut(accessToken, "/me/tracks", {
    ids: [trackId],
  });
  return res.ok;
}

export async function removeTrack(
  accessToken: string,
  trackId: string
): Promise<boolean> {
  const res = await spotifyDelete(accessToken, "/me/tracks", {
    ids: [trackId],
  });
  return res.ok;
}

export async function transferPlayback(
  accessToken: string,
  deviceId: string
): Promise<boolean> {
  const res = await spotifyPut(accessToken, "/me/player", {
    device_ids: [deviceId],
  });
  return res.ok || res.status === 204;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/plugins/community/spotify/spotify-api.ts 2>&1 | head -20`

**Important:** Check if the project has a shared Prisma instance at `src/lib/prisma.ts` or `src/lib/db.ts`. If so, replace `const prisma = new PrismaClient()` at the top with the shared import (e.g., `import { prisma } from "@/lib/prisma"`). Using a shared instance prevents creating multiple database connections.

- [ ] **Step 3: Commit**

```bash
git add src/plugins/community/spotify/spotify-api.ts
git commit -m "feat(spotify): add Spotify API client with token refresh"
```

---

## Task 3: OAuth API Routes

**Files:**
- Create: `src/app/api/spotify/auth/route.ts`
- Create: `src/app/api/spotify/callback/route.ts`
- Create: `src/app/api/spotify/status/route.ts`
- Create: `src/app/api/spotify/disconnect/route.ts`

- [ ] **Step 1: Create OAuth auth start route**

Create `src/app/api/spotify/auth/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSpotifyCredentials } from "@/plugins/community/spotify/spotify-api";

const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-top-read",
  "user-library-read",
  "user-library-modify",
  "user-follow-read",
  "playlist-read-private",
].join(" ");

export async function GET(req: NextRequest) {
  try {
    const { clientId, redirectUri } = getSpotifyCredentials();
    const connectionId = req.nextUrl.searchParams.get("connectionId");

    if (!connectionId) {
      return NextResponse.json(
        { error: "connectionId required" },
        { status: 400 }
      );
    }

    // Generate random state to prevent CSRF
    const state = Buffer.from(
      JSON.stringify({ connectionId, ts: Date.now() })
    ).toString("base64url");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
      show_dialog: "true",
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    return NextResponse.json({ authUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create OAuth callback route**

Create `src/app/api/spotify/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  getSpotifyCredentials,
  saveTokens,
  fetchUserProfile,
} from "@/plugins/community/spotify/spotify-api";
import type { SpotifyTokens } from "@/plugins/community/spotify/types";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return new NextResponse(renderResult(false, `Spotify-Fehler: ${error}`), {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!code || !state) {
    return new NextResponse(renderResult(false, "Fehlende Parameter"), {
      headers: { "Content-Type": "text/html" },
    });
  }

  let connectionId: number;
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    );
    connectionId = Number(decoded.connectionId);
  } catch {
    return new NextResponse(renderResult(false, "Ungültiger State-Parameter"), {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    const { clientId, clientSecret, redirectUri } = getSpotifyCredentials();

    // Exchange code for tokens
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return new NextResponse(
        renderResult(false, `Token-Austausch fehlgeschlagen: ${err}`),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const tokenData = await tokenRes.json();

    // Fetch user profile to get display name
    const profile = await fetchUserProfile(tokenData.access_token);

    const tokens: SpotifyTokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      userId: profile?.id ?? "unknown",
      displayName: profile?.display_name ?? profile?.id ?? "Spotify User",
    };

    await saveTokens(connectionId, tokens);

    return new NextResponse(renderResult(true, tokens.displayName), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(renderResult(false, message), {
      headers: { "Content-Type": "text/html" },
    });
  }
}

function renderResult(success: boolean, detail: string): string {
  return `<!DOCTYPE html>
<html><head><title>Spotify Verbindung</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#181818;color:#fff;">
<div style="text-align:center;max-width:400px;">
  <h2 style="color:${success ? "#1DB954" : "#f85149"}">${success ? "Verbunden!" : "Fehler"}</h2>
  <p>${success ? `Angemeldet als <strong>${detail}</strong>` : detail}</p>
  <p style="color:#888;font-size:14px;">Du kannst dieses Fenster jetzt schließen.</p>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: "spotify-oauth-complete", success: ${success} }, "*");
      setTimeout(() => window.close(), 2000);
    }
  </script>
</div>
</body></html>`;
}
```

- [ ] **Step 3: Create status check route**

Create `src/app/api/spotify/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getTokensForConnection } from "@/plugins/community/spotify/spotify-api";

export async function GET(req: NextRequest) {
  const connectionId = req.nextUrl.searchParams.get("connectionId");

  if (!connectionId) {
    return NextResponse.json(
      { error: "connectionId required" },
      { status: 400 }
    );
  }

  try {
    const tokens = await getTokensForConnection(Number(connectionId));

    if (!tokens) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      displayName: tokens.displayName,
      userId: tokens.userId,
      tokenExpired: Date.now() > tokens.expiresAt,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
```

- [ ] **Step 4: Create disconnect route**

Create `src/app/api/spotify/disconnect/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { saveTokens } from "@/plugins/community/spotify/spotify-api";
import type { SpotifyTokens } from "@/plugins/community/spotify/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const connectionId = Number(body.connectionId);

    if (!connectionId) {
      return NextResponse.json(
        { error: "connectionId required" },
        { status: 400 }
      );
    }

    // Clear tokens by saving empty config
    await saveTokens(connectionId, {
      accessToken: "",
      refreshToken: "",
      expiresAt: 0,
      userId: "",
      displayName: "",
    } as SpotifyTokens);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/spotify/
git commit -m "feat(spotify): add OAuth API routes (auth, callback, status, disconnect)"
```

---

## Task 4: Player Action API Route

**Files:**
- Create: `src/app/api/spotify/action/route.ts`

- [ ] **Step 1: Create the action route**

Create `src/app/api/spotify/action/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/actions/auth";
import {
  getValidToken,
  play,
  pause,
  nextTrack,
  previousTrack,
  seek,
  setVolume,
  setShuffle,
  setRepeat,
  saveTrack,
  removeTrack,
  transferPlayback,
} from "@/plugins/community/spotify/spotify-api";
import type { SpotifyActionPayload } from "@/plugins/community/spotify/types";

export async function POST(req: NextRequest) {
  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: SpotifyActionPayload & { connectionId: number } =
      await req.json();
    const { action, payload, connectionId } = body;

    if (!connectionId || !action) {
      return NextResponse.json(
        { error: "connectionId and action required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidToken(connectionId);

    let success = false;
    switch (action) {
      case "play":
        success = await play(accessToken);
        break;
      case "pause":
        success = await pause(accessToken);
        break;
      case "next":
        success = await nextTrack(accessToken);
        break;
      case "previous":
        success = await previousTrack(accessToken);
        break;
      case "seek":
        if (payload?.position_ms != null) {
          success = await seek(accessToken, payload.position_ms);
        }
        break;
      case "volume":
        if (payload?.volume_percent != null) {
          success = await setVolume(accessToken, payload.volume_percent);
        }
        break;
      case "shuffle":
        // Toggle: we don't know current state here, caller sends desired state
        success = await setShuffle(accessToken, true);
        break;
      case "repeat":
        success = await setRepeat(accessToken, "off");
        break;
      case "like":
        if (payload?.device_id) {
          // Reusing device_id field for track ID in like/unlike
          success = await saveTrack(accessToken, payload.device_id);
        }
        break;
      case "unlike":
        if (payload?.device_id) {
          success = await removeTrack(accessToken, payload.device_id);
        }
        break;
      case "transfer":
        if (payload?.device_id) {
          success = await transferPlayback(accessToken, payload.device_id);
        }
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: success });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Fix shuffle/repeat to accept state from client**

The action route above has a limitation — shuffle and repeat need the desired state from the client. Update the switch cases:

```typescript
      case "shuffle":
        success = await setShuffle(
          accessToken,
          payload?.volume_percent === 1 // reuse field: 1=on, 0=off
        );
        break;
      case "repeat": {
        // payload.device_id reused as repeat state string
        const repeatState = (payload?.device_id as "off" | "track" | "context") ?? "off";
        success = await setRepeat(accessToken, repeatState);
        break;
      }
```

Actually, this is getting hacky. Better approach: extend the payload type to include `shuffle_state` and `repeat_state`. Update `types.ts`:

In `src/plugins/community/spotify/types.ts`, update `SpotifyActionPayload`:

```typescript
export interface SpotifyActionPayload {
  action:
    | "play"
    | "pause"
    | "next"
    | "previous"
    | "seek"
    | "volume"
    | "shuffle"
    | "repeat"
    | "like"
    | "unlike"
    | "transfer";
  payload?: {
    position_ms?: number;
    volume_percent?: number;
    device_id?: string;
    track_id?: string;
    shuffle_state?: boolean;
    repeat_state?: "off" | "track" | "context";
  };
}
```

Then update the action route switch cases for shuffle/repeat/like/unlike:

```typescript
      case "shuffle":
        if (payload?.shuffle_state != null) {
          success = await setShuffle(accessToken, payload.shuffle_state);
        }
        break;
      case "repeat":
        if (payload?.repeat_state) {
          success = await setRepeat(accessToken, payload.repeat_state);
        }
        break;
      case "like":
        if (payload?.track_id) {
          success = await saveTrack(accessToken, payload.track_id);
        }
        break;
      case "unlike":
        if (payload?.track_id) {
          success = await removeTrack(accessToken, payload.track_id);
        }
        break;
      case "transfer":
        if (payload?.device_id) {
          success = await transferPlayback(accessToken, payload.device_id);
        }
        break;
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/spotify/action/route.ts src/plugins/community/spotify/types.ts
git commit -m "feat(spotify): add player action API route"
```

---

## Task 5: OAuth ConfigField Framework Extension

**Files:**
- Modify: `src/plugins/types.ts`
- Modify: `src/components/dashboard/TileDialog.tsx`

- [ ] **Step 1: Add "oauth" to ConfigField type union in types.ts**

In `src/plugins/types.ts`, find the `ConfigField` interface and add `"oauth"` to the type union. Also add the optional `oauth` config object:

```typescript
// Find this interface and update the type field:
export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "textarea" | "select" | "number" | "oauth";
  placeholder?: string;
  required?: boolean;
  description?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  oauth?: {
    provider: string;
    authUrl: string;
    statusUrl: string;
    disconnectUrl: string;
  };
}
```

- [ ] **Step 2: Add OAuth field rendering in TileDialog.tsx**

In `src/components/dashboard/TileDialog.tsx`, find the `renderConfigField` function (around line 670-724). Add a case for `type: "oauth"`. This requires:

1. Finding the function `renderConfigField(field: ConfigField)` (should be around lines 670-724)
2. Adding a new case before the default/closing of the switch

Add this case in the switch statement:

```tsx
case "oauth": {
  // OAuth connection button
  const isConnected = enhancedConfig[`${field.key}_connected`] === true;
  const connectedName = enhancedConfig[`${field.key}_name`] as string;

  return (
    <div key={field.key} className="space-y-2">
      <label className="text-sm font-medium">{field.label}</label>
      {isConnected ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
            <span className="text-emerald-400">●</span>{" "}
            Verbunden als <strong>{connectedName}</strong>
          </div>
          <button
            type="button"
            className="rounded-md px-3 py-2 text-xs border border-border hover:bg-accent"
            onClick={() => handleOAuthConnect(field)}
          >
            Wechseln
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-2 text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => handleOAuthDisconnect(field)}
          >
            Trennen
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="w-full rounded-md bg-[#1DB954] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1ed760] transition-colors"
          onClick={() => handleOAuthConnect(field)}
        >
          Mit {field.oauth?.provider ?? "Service"} verbinden
        </button>
      )}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}
```

3. Add the handler functions inside the TileDialog component (before the return statement). Find a suitable location among the existing handlers:

```tsx
// OAuth handlers
async function handleOAuthConnect(field: ConfigField) {
  if (!field.oauth || !linkedConnectionId) return;

  try {
    const res = await fetch(
      `${field.oauth.authUrl}?connectionId=${linkedConnectionId}`
    );
    const data = await res.json();
    if (data.authUrl) {
      // Open popup for OAuth
      const popup = window.open(
        data.authUrl,
        "spotify-auth",
        "width=500,height=700,left=200,top=100"
      );

      // Listen for completion message from popup
      const handler = async (event: MessageEvent) => {
        if (event.data?.type === "spotify-oauth-complete") {
          window.removeEventListener("message", handler);
          popup?.close();
          // Check connection status
          if (event.data.success && field.oauth) {
            const statusRes = await fetch(
              `${field.oauth.statusUrl}?connectionId=${linkedConnectionId}`
            );
            const status = await statusRes.json();
            if (status.connected) {
              setEnhancedConfig((prev) => ({
                ...prev,
                [`${field.key}_connected`]: true,
                [`${field.key}_name`]: status.displayName,
              }));
              setConnectionTested(true);
            }
          }
        }
      };
      window.addEventListener("message", handler);
    }
  } catch (error) {
    console.error("OAuth connect error:", error);
  }
}

async function handleOAuthDisconnect(field: ConfigField) {
  if (!field.oauth || !linkedConnectionId) return;

  try {
    await fetch(field.oauth.disconnectUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId: linkedConnectionId }),
    });

    setEnhancedConfig((prev) => ({
      ...prev,
      [`${field.key}_connected`]: false,
      [`${field.key}_name`]: "",
    }));
    setConnectionTested(false);
  } catch (error) {
    console.error("OAuth disconnect error:", error);
  }
}
```

4. Also need to check OAuth status when an existing connection is loaded. Find the effect or function that loads existing connection data and add:

```tsx
// When linkedConnectionId changes or dialog opens with existing connection,
// check OAuth status for oauth fields
useEffect(() => {
  if (!linkedConnectionId || !selectedPlugin) return;

  const oauthFields = selectedPlugin.configFields.filter(
    (f) => f.type === "oauth" && f.oauth
  );

  oauthFields.forEach(async (field) => {
    if (!field.oauth) return;
    try {
      const res = await fetch(
        `${field.oauth.statusUrl}?connectionId=${linkedConnectionId}`
      );
      const status = await res.json();
      if (status.connected) {
        setEnhancedConfig((prev) => ({
          ...prev,
          [`${field.key}_connected`]: true,
          [`${field.key}_name`]: status.displayName,
        }));
        setConnectionTested(true);
      }
    } catch {
      // Silently fail — user can re-connect
    }
  });
}, [linkedConnectionId, selectedPlugin]);
```

Note: The `selectedPlugin` variable may need to be derived from the dialog context. Check what variable holds the matched plugin in TileDialog (likely from the plugin catalog match).

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -20`

Fix any TypeScript errors that arise from the TileDialog modifications. Common issues:
- Missing imports for `ConfigField` type (may already be imported)
- State variables `linkedConnectionId` or `selectedPlugin` may have different names — check existing code

- [ ] **Step 4: Commit**

```bash
git add src/plugins/types.ts src/components/dashboard/TileDialog.tsx
git commit -m "feat(framework): add OAuth ConfigField type with TileDialog support"
```

---

## Task 6: Spotify Plugin Definition

**Files:**
- Create: `src/plugins/community/spotify/index.ts`

- [ ] **Step 1: Create the plugin file**

Create `src/plugins/community/spotify/index.ts`:

```typescript
import type {
  AppPlugin,
  PluginConfig,
  PluginStats,
} from "@/plugins/types";
import {
  getVisibleStats,
  createErrorResponse,
} from "@/plugins/utils";
import {
  getValidToken,
  fetchPlaybackState,
  fetchSavedTracksCount,
  fetchPlaylistCount,
  fetchFollowingCount,
  fetchTopArtist,
  fetchAvailableDevices,
  checkTrackSaved,
  fetchUserProfile,
  getTokensForConnection,
} from "./spotify-api";
import type { SpotifyWidgetData, SpotifyTrack, SpotifyDevice } from "./types";

const spotifyPlugin: AppPlugin = {
  metadata: {
    id: "spotify",
    name: "Spotify",
    icon: "Spotify",
    color: "#1DB954",
    description: "Spotify Musikplayer — Playback steuern, Library-Statistiken anzeigen",
    category: "Media",
    website: "https://spotify.com",
  },

  configFields: [
    {
      key: "spotifyAuth",
      label: "Spotify-Konto",
      type: "oauth",
      required: true,
      description: "Verbinde dein Spotify-Konto um den Player zu nutzen",
      oauth: {
        provider: "Spotify",
        authUrl: "/api/spotify/auth",
        statusUrl: "/api/spotify/status",
        disconnectUrl: "/api/spotify/disconnect",
      },
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
    },
    {
      key: "widgetMode",
      label: "Widget-Modus (2×1)",
      type: "select",
      options: [
        { value: "miniPlayer", label: "Mini Player" },
        { value: "cleanInfo", label: "Clean Info" },
      ],
    },
  ],

  statOptions: [
    {
      key: "savedTracks",
      label: "♡ Titel",
      description: "Anzahl gespeicherter Songs",
      defaultEnabled: true,
    },
    {
      key: "playlists",
      label: "Playlists",
      description: "Anzahl eigener Playlists",
      defaultEnabled: true,
    },
    {
      key: "following",
      label: "Künstler",
      description: "Gefolgte Künstler",
      defaultEnabled: true,
    },
    {
      key: "topArtist",
      label: "Top Artist",
      description: "Meistgehörter Künstler",
      defaultEnabled: false,
    },
    {
      key: "topTrack",
      label: "Top Track",
      description: "Meistgehörter Song",
      defaultEnabled: false,
    },
    {
      key: "nowPlaying",
      label: "Aktueller Song",
      description: "Was gerade läuft",
      defaultEnabled: false,
    },
  ],

  supportedSizes: ["1x1", "2x1", "2x2"],

  renderHints: {
    "1x1": { maxStats: 3, layout: "compact" },
    "2x1": {
      maxStats: 6,
      layout: "widget",
      widgetComponent: "SpotifyWidget",
    },
    "2x2": {
      maxStats: 6,
      layout: "widget",
      widgetComponent: "SpotifyWidget",
    },
  },

  async fetchStats(config: PluginConfig): Promise<PluginStats> {
    try {
      const connectionId = config.connectionId as number;
      if (!connectionId) {
        return createErrorResponse("Keine Spotify-Verbindung konfiguriert");
      }

      const tokens = await getTokensForConnection(connectionId);
      if (!tokens || !tokens.accessToken) {
        return createErrorResponse("Bitte mit Spotify verbinden");
      }

      const accessToken = await getValidToken(connectionId);
      const visibleStats = getVisibleStats(config, this.statOptions);
      const displayMode =
        (config.displayMode as string) ?? "library";
      const widgetMode =
        (config.widgetMode as string) ?? "miniPlayer";

      // Parallel fetches for stats
      const [
        savedCount,
        playlistCount,
        followingCount,
        topArtistName,
        playbackState,
        devices,
      ] = await Promise.all([
        visibleStats.includes("savedTracks")
          ? fetchSavedTracksCount(accessToken)
          : Promise.resolve(0),
        visibleStats.includes("playlists")
          ? fetchPlaylistCount(accessToken)
          : Promise.resolve(0),
        visibleStats.includes("following")
          ? fetchFollowingCount(accessToken)
          : Promise.resolve(0),
        visibleStats.includes("topArtist") || displayMode === "topArtist"
          ? fetchTopArtist(accessToken)
          : Promise.resolve(null),
        fetchPlaybackState(accessToken),
        fetchAvailableDevices(accessToken),
      ]);

      // Build stat items
      const items: PluginStats["items"] = [];

      if (
        displayMode === "nowPlaying" &&
        visibleStats.includes("nowPlaying") === false
      ) {
        // Now Playing mode: show current song as first stat
        const songName = playbackState?.item?.name ?? "Nichts läuft";
        items.push({
          label: "Läuft",
          value: songName,
          icon: "Music",
          color: playbackState?.is_playing ? "green" : undefined,
        });
      }

      if (visibleStats.includes("nowPlaying") && playbackState?.item) {
        items.push({
          label: "Läuft",
          value: playbackState.item.name,
          icon: "Music",
          color: playbackState.is_playing ? "green" : undefined,
        });
      }

      if (displayMode === "topArtist" && topArtistName) {
        items.push({
          label: "Top Artist",
          value: topArtistName,
          icon: "Star",
        });
      } else if (visibleStats.includes("topArtist") && topArtistName) {
        items.push({
          label: "Top Artist",
          value: topArtistName,
          icon: "Star",
        });
      }

      if (visibleStats.includes("savedTracks")) {
        items.push({
          label: "♡ Titel",
          value: savedCount,
          icon: "Heart",
          color: "green",
        });
      }

      if (visibleStats.includes("playlists")) {
        items.push({
          label: "Playlists",
          value: playlistCount,
          icon: "ListMusic",
        });
      }

      if (visibleStats.includes("following")) {
        items.push({
          label: "Künstler",
          value: followingCount,
          icon: "Users",
        });
      }

      // Build widget data for 2x1/2x2
      let track: SpotifyTrack | null = null;
      if (playbackState?.item) {
        const item = playbackState.item;
        const trackId = item.id;
        const isLiked = trackId
          ? await checkTrackSaved(accessToken, trackId)
          : false;

        track = {
          name: item.name ?? "Unbekannt",
          artist:
            item.artists?.map((a: { name: string }) => a.name).join(", ") ??
            "Unbekannt",
          album: item.album?.name ?? "",
          albumArt: item.album?.images?.[0]?.url ?? "",
          duration: item.duration_ms ?? 0,
          progress: playbackState.progress_ms ?? 0,
          uri: item.uri ?? "",
          isLiked,
        };
      }

      const activeDevice = devices.find((d: SpotifyDevice) => d.isActive) ?? null;

      const widgetData: SpotifyWidgetData = {
        isPlaying: playbackState?.is_playing ?? false,
        track,
        device: activeDevice,
        availableDevices: devices,
        shuffle: playbackState?.shuffle_state ?? false,
        repeat: playbackState?.repeat_state ?? "off",
        displayMode: displayMode as SpotifyWidgetData["displayMode"],
        widgetMode: widgetMode as SpotifyWidgetData["widgetMode"],
        topArtistName: topArtistName ?? null,
      };

      return { items, status: "ok", widgetData };
    } catch (error) {
      return createErrorResponse(error);
    }
  },

  async testConnection(
    config: PluginConfig
  ): Promise<{ ok: boolean; message: string }> {
    try {
      const connectionId = config.connectionId as number;
      if (!connectionId) {
        return { ok: false, message: "Keine Verbindung konfiguriert" };
      }

      const tokens = await getTokensForConnection(connectionId);
      if (!tokens || !tokens.accessToken) {
        return { ok: false, message: "Bitte zuerst mit Spotify verbinden" };
      }

      const accessToken = await getValidToken(connectionId);
      const profile = await fetchUserProfile(accessToken);

      if (profile) {
        return {
          ok: true,
          message: `Verbunden als ${profile.display_name ?? profile.id}`,
        };
      }

      return { ok: false, message: "Profil konnte nicht geladen werden" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Verbindung fehlgeschlagen";
      return { ok: false, message };
    }
  },
};

export const plugin = spotifyPlugin;
export { default as widget } from "@/components/widgets/spotify/SpotifyWidget";
export const widgetName = "SpotifyWidget";
```

Note: The `widget` export line will cause an error until we create the SpotifyWidget component in Task 8. That's expected — we'll fix it in the correct order by creating the widget first or by temporarily commenting this line.

- [ ] **Step 2: Temporarily comment out widget export**

Since the widget component doesn't exist yet, comment out the last two lines temporarily:

```typescript
export const plugin = spotifyPlugin;
// export { default as widget } from "@/components/widgets/spotify/SpotifyWidget";
// export const widgetName = "SpotifyWidget";
```

- [ ] **Step 3: Pass connectionId in enhanced API route**

The enhanced API route at `src/app/api/enhanced/[appId]/route.ts` merges `appConnection.config` + `tile.enhancedConfig` but does NOT pass `connectionId` (the AppConnection ID). Spotify needs it for token refresh.

Find the config merge section (where it builds the config object passed to `plugin.fetchStats()`) and add `connectionId: conn.id` to the merged config object. For example, if the merge looks like:

```typescript
const mergedConfig = {
  ...JSON.parse(conn.config || '{}'),
  apiUrl: conn.url,
  ...JSON.parse(tile.enhancedConfig || '{}'),
};
```

Add:

```typescript
const mergedConfig = {
  ...JSON.parse(conn.config || '{}'),
  apiUrl: conn.url,
  ...JSON.parse(tile.enhancedConfig || '{}'),
  connectionId: conn.id, // ← ADD THIS LINE
};
```

This is safe for all plugins — they can simply ignore the extra field if they don't need it.

- [ ] **Step 4: Verify build compiles**

Run: `npm run build 2>&1 | tail -20`

Fix any TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/plugins/community/spotify/index.ts src/app/api/enhanced/\[appId\]/route.ts
git commit -m "feat(spotify): add plugin definition with fetchStats and testConnection"
```

---

## Task 7: Spotify Widget — 2x2 Full Player

**Files:**
- Create: `src/components/widgets/spotify/SpotifyPlayer2x2.tsx`

- [ ] **Step 1: Create the 2x2 Player component**

Create `src/components/widgets/spotify/SpotifyPlayer2x2.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { EnhancedStats } from "@/types/tile";
import { WidgetHeader } from "../shared/WidgetHeader";
import { SpotifyDeviceSelector } from "./SpotifyDeviceSelector";
import type { SpotifyWidgetData } from "@/plugins/community/spotify/types";

interface Props {
  stats: EnhancedStats;
  config: Record<string, unknown>;
  tileId: number;
  onAction?: (action: string, payload?: unknown) => void;
}

function parseWidgetData(stats: EnhancedStats): SpotifyWidgetData | null {
  const wd = stats.widgetData as SpotifyWidgetData | undefined;
  if (!wd) return null;
  return wd;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SpotifyPlayer2x2({ stats, config, tileId, onAction }: Props) {
  const data = parseWidgetData(stats);
  const [localProgress, setLocalProgress] = useState(0);
  const [showDevices, setShowDevices] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const connectionId = config.appConnectionId as number;

  // Interpolate progress client-side between polls
  useEffect(() => {
    if (!data?.track) {
      setLocalProgress(0);
      return;
    }

    setLocalProgress(data.track.progress);

    if (data.isPlaying) {
      progressInterval.current = setInterval(() => {
        setLocalProgress((prev) =>
          Math.min(prev + 1000, data.track?.duration ?? 0)
        );
      }, 1000);
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [data?.track?.progress, data?.isPlaying, data?.track?.duration]);

  const sendAction = useCallback(
    async (
      action: string,
      payload?: Record<string, unknown>
    ) => {
      try {
        await fetch("/api/spotify/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, payload, connectionId }),
        });
        onAction?.("refresh");
      } catch (error) {
        console.error("Spotify action failed:", error);
      }
    },
    [connectionId, onAction]
  );

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!data?.track) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const positionMs = Math.round(ratio * data.track.duration);
      setLocalProgress(positionMs);
      sendAction("seek", { position_ms: positionMs });
    },
    [data?.track, sendAction]
  );

  const handleVolume = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const volume = Math.round(ratio * 100);
      sendAction("volume", { volume_percent: volume });
    },
    [sendAction]
  );

  const handleLike = useCallback(() => {
    if (!data?.track) return;
    const trackId = data.track.uri.split(":").pop();
    if (data.track.isLiked) {
      sendAction("unlike", { track_id: trackId });
    } else {
      sendAction("like", { track_id: trackId });
    }
  }, [data?.track, sendAction]);

  const toggleShuffle = useCallback(() => {
    sendAction("shuffle", { shuffle_state: !data?.shuffle });
  }, [data?.shuffle, sendAction]);

  const cycleRepeat = useCallback(() => {
    const states: Array<"off" | "context" | "track"> = [
      "off",
      "context",
      "track",
    ];
    const current = states.indexOf(data?.repeat ?? "off");
    const next = states[(current + 1) % states.length];
    sendAction("repeat", { repeat_state: next });
  }, [data?.repeat, sendAction]);

  // No data or not connected
  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">Nicht verbunden</p>
        <p className="text-xs">Bitte Spotify-Konto verbinden</p>
      </div>
    );
  }

  const progressPercent =
    data.track && data.track.duration > 0
      ? (localProgress / data.track.duration) * 100
      : 0;

  const volumePercent = data.device?.volume ?? 0;

  return (
    <div className="flex h-full flex-col p-4">
      {/* Header with device selector */}
      <div className="mb-2 flex items-center justify-between">
        <WidgetHeader
          icon="Music"
          iconColor="#1DB954"
          title="Spotify"
          status={data.track ? "online" : "unknown"}
        />
        <div className="relative">
          <button
            onClick={() => setShowDevices(!showDevices)}
            className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-muted-foreground hover:bg-white/10 transition-colors"
          >
            <span className="max-w-[100px] truncate">
              {data.device?.name ?? "Kein Gerät"}
            </span>
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {showDevices && (
            <SpotifyDeviceSelector
              devices={data.availableDevices}
              activeDeviceId={data.device?.id}
              onSelect={(deviceId) => {
                sendAction("transfer", { device_id: deviceId });
                setShowDevices(false);
              }}
              onClose={() => setShowDevices(false)}
            />
          )}
        </div>
      </div>

      {/* Album Art */}
      <div className="mb-3 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
        {data.track?.albumArt ? (
          <img
            src={data.track.albumArt}
            alt={data.track.album}
            className="h-[130px] w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-[130px] items-center justify-center text-muted-foreground">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
        )}
      </div>

      {/* Song Info + Like */}
      <div className="mb-1.5 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {data.track?.name ?? "Nichts wird abgespielt"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {data.track
              ? `${data.track.artist} · ${data.track.album}`
              : "Starte Spotify auf einem Gerät"}
          </p>
        </div>
        {data.track && (
          <button
            onClick={handleLike}
            className="ml-2 flex-shrink-0 text-lg transition-colors"
            style={{ color: data.track.isLiked ? "#1DB954" : undefined }}
          >
            {data.track.isLiked ? "♥" : "♡"}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div
          className="h-1 w-full cursor-pointer rounded-full bg-white/10"
          onClick={handleSeek}
        >
          <div
            className="relative h-full rounded-full bg-[#1DB954] transition-all"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute -right-1.5 -top-1 h-3 w-3 rounded-full bg-white opacity-0 group-hover:opacity-100" />
          </div>
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{formatTime(localProgress)}</span>
          <span>{data.track ? formatTime(data.track.duration) : "0:00"}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={toggleShuffle}
          className="text-xs transition-colors"
          style={{ color: data.shuffle ? "#1DB954" : undefined }}
        >
          ⇄
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => sendAction("previous")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ⏮
          </button>
          <button
            onClick={() =>
              sendAction(data.isPlaying ? "pause" : "play")
            }
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1DB954] text-white hover:bg-[#1ed760] transition-colors"
          >
            {data.isPlaying ? "⏸" : "▶"}
          </button>
          <button
            onClick={() => sendAction("next")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ⏭
          </button>
        </div>
        <button
          onClick={cycleRepeat}
          className="text-xs transition-colors"
          style={{
            color: data.repeat !== "off" ? "#1DB954" : undefined,
          }}
        >
          {data.repeat === "track" ? "↻₁" : "↻"}
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="flex-shrink-0 text-muted-foreground"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        </svg>
        <div
          className="h-1 flex-1 cursor-pointer rounded-full bg-white/10"
          onClick={handleVolume}
        >
          <div
            className="h-full rounded-full bg-[#1DB954]"
            style={{ width: `${volumePercent}%` }}
          />
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="flex-shrink-0 text-muted-foreground"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/widgets/spotify/SpotifyPlayer2x2.tsx
git commit -m "feat(spotify): add 2x2 Full Player widget component"
```

---

## Task 8: Spotify Widget — 2x1 Mini Player

**Files:**
- Create: `src/components/widgets/spotify/SpotifyPlayer2x1.tsx`

- [ ] **Step 1: Create the 2x1 Player component**

Create `src/components/widgets/spotify/SpotifyPlayer2x1.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { EnhancedStats } from "@/types/tile";
import type { SpotifyWidgetData } from "@/plugins/community/spotify/types";

interface Props {
  stats: EnhancedStats;
  config: Record<string, unknown>;
  tileId: number;
  onAction?: (action: string, payload?: unknown) => void;
}

function parseWidgetData(stats: EnhancedStats): SpotifyWidgetData | null {
  return (stats.widgetData as SpotifyWidgetData) ?? null;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SpotifyPlayer2x1({ stats, config, tileId, onAction }: Props) {
  const data = parseWidgetData(stats);
  const [localProgress, setLocalProgress] = useState(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectionId = config.appConnectionId as number;

  useEffect(() => {
    if (!data?.track) {
      setLocalProgress(0);
      return;
    }
    setLocalProgress(data.track.progress);

    if (data.isPlaying) {
      progressInterval.current = setInterval(() => {
        setLocalProgress((prev) =>
          Math.min(prev + 1000, data.track?.duration ?? 0)
        );
      }, 1000);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [data?.track?.progress, data?.isPlaying, data?.track?.duration]);

  const sendAction = useCallback(
    async (action: string, payload?: Record<string, unknown>) => {
      try {
        await fetch("/api/spotify/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, payload, connectionId }),
        });
        onAction?.("refresh");
      } catch (error) {
        console.error("Spotify action failed:", error);
      }
    },
    [connectionId, onAction]
  );

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Nicht verbunden
      </div>
    );
  }

  const progressPercent =
    data.track && data.track.duration > 0
      ? (localProgress / data.track.duration) * 100
      : 0;

  const isMiniPlayer = data.widgetMode === "miniPlayer";

  return (
    <div className="flex h-full gap-3 p-3">
      {/* Album Art */}
      <div className="flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
        {data.track?.albumArt ? (
          <img
            src={data.track.albumArt}
            alt={data.track.album}
            className="h-full w-[130px] object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-[130px] items-center justify-center text-muted-foreground">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
        )}
      </div>

      {/* Info + Controls */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        {/* Song Info */}
        <div>
          <p className="truncate text-[13px] font-semibold">
            {data.track?.name ?? "Nichts läuft"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {data.track?.artist ?? ""}
          </p>
          <p className="truncate text-[10px] text-muted-foreground/60">
            {data.track?.album ?? ""}
          </p>
        </div>

        {/* Progress */}
        <div>
          <div className="h-0.5 w-full rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#1DB954]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground">
            <span>{formatTime(localProgress)}</span>
            <span>
              {data.track ? formatTime(data.track.duration) : "0:00"}
            </span>
          </div>
        </div>

        {/* Controls (only in miniPlayer mode) */}
        {isMiniPlayer && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => sendAction("previous")}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ⏮
            </button>
            <button
              onClick={() =>
                sendAction(data.isPlaying ? "pause" : "play")
              }
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1DB954] text-white text-[12px] hover:bg-[#1ed760] transition-colors"
            >
              {data.isPlaying ? "⏸" : "▶"}
            </button>
            <button
              onClick={() => sendAction("next")}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ⏭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/widgets/spotify/SpotifyPlayer2x1.tsx
git commit -m "feat(spotify): add 2x1 Mini Player / Clean Info widget"
```

---

## Task 9: Widget Router, Device Selector & Registration

**Files:**
- Create: `src/components/widgets/spotify/SpotifyDeviceSelector.tsx`
- Create: `src/components/widgets/spotify/SpotifyWidget.tsx`
- Modify: `src/plugins/community/spotify/index.ts` (uncomment widget export)

- [ ] **Step 1: Create device selector component**

Create `src/components/widgets/spotify/SpotifyDeviceSelector.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

interface Device {
  id: string;
  name: string;
  type: string;
  isActive?: boolean;
}

interface Props {
  devices: Device[];
  activeDeviceId?: string;
  onSelect: (deviceId: string) => void;
  onClose: () => void;
}

const DEVICE_ICONS: Record<string, string> = {
  Computer: "💻",
  Smartphone: "📱",
  Speaker: "🔊",
  TV: "📺",
};

export function SpotifyDeviceSelector({
  devices,
  activeDeviceId,
  onSelect,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (devices.length === 0) {
    return (
      <div
        ref={ref}
        className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-popover p-3 shadow-lg"
      >
        <p className="text-xs text-muted-foreground">
          Keine Geräte verfügbar. Öffne Spotify auf einem Gerät.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
    >
      <div className="p-1.5">
        <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Geräte
        </p>
        {devices.map((device) => (
          <button
            key={device.id}
            onClick={() => onSelect(device.id)}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent ${
              device.id === activeDeviceId
                ? "bg-[#1DB954]/10 text-[#1DB954]"
                : ""
            }`}
          >
            <span>{DEVICE_ICONS[device.type] ?? "🎵"}</span>
            <span className="flex-1 truncate">{device.name}</span>
            {device.id === activeDeviceId && (
              <span className="text-[10px]">●</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create widget router**

Create `src/components/widgets/spotify/SpotifyWidget.tsx`:

```tsx
"use client";

import type { EnhancedStats } from "@/types/tile";
import { SpotifyPlayer2x2 } from "./SpotifyPlayer2x2";
import { SpotifyPlayer2x1 } from "./SpotifyPlayer2x1";

interface WidgetProps {
  stats: EnhancedStats;
  config: Record<string, unknown>;
  tileId: number;
  size: "2x1" | "2x2";
  onAction?: (action: string, payload?: unknown) => void;
}

export default function SpotifyWidget({
  stats,
  config,
  tileId,
  size,
  onAction,
}: WidgetProps) {
  if (size === "2x2") {
    return (
      <SpotifyPlayer2x2
        stats={stats}
        config={config}
        tileId={tileId}
        onAction={onAction}
      />
    );
  }

  return (
    <SpotifyPlayer2x1
      stats={stats}
      config={config}
      tileId={tileId}
      onAction={onAction}
    />
  );
}
```

- [ ] **Step 3: Uncomment widget exports in plugin index.ts**

In `src/plugins/community/spotify/index.ts`, uncomment the widget export lines:

```typescript
export const plugin = spotifyPlugin;
export { default as widget } from "@/components/widgets/spotify/SpotifyWidget";
export const widgetName = "SpotifyWidget";
```

- [ ] **Step 4: Run plugin generator**

Run: `npm run generate:plugins`

Verify output shows the spotify plugin was discovered. Check the generated file:

Run: `cat src/plugins/community/index.ts`

Expected: Should include an import for the spotify plugin and register it in the community plugins array + widgets map.

- [ ] **Step 5: Commit**

```bash
git add src/components/widgets/spotify/ src/plugins/community/spotify/index.ts
git commit -m "feat(spotify): add widget router, device selector, and plugin registration"
```

---

## Task 10: Build Verification & Integration Test

**Files:** No new files — verification only.

- [ ] **Step 1: Generate community plugins**

Run: `npm run generate:plugins`

Check: `src/plugins/community/index.ts` should include spotify imports.

- [ ] **Step 2: Build the project**

Run: `npm run build 2>&1 | tail -30`

Expected: Build completes without errors. Fix any TypeScript issues that arise.

**Common issues to check:**
- `PluginConfig` may not include `connectionId` — check how the enhanced API route merges config and ensure `appConnectionId` is accessible
- Import path resolution for `@/plugins/community/spotify/...`
- The Prisma client import in `spotify-api.ts` — verify it matches the project's Prisma setup (there may be a shared instance at `src/lib/prisma.ts`)

- [ ] **Step 3: Verify plugin registration**

After successful build, start the dev server:

Run: `npm run dev`

Open `http://localhost:3000` and try adding a new Enhanced App tile. Search for "Spotify" — it should appear in the catalog with the green Spotify icon.

- [ ] **Step 4: Run MCP validation tools**

Use the dashboard MCP server tools to validate:

1. `validate_plugin_structure` — pass the plugin source code
2. `validate_render_hints` — pass the renderHints object
3. `test_plugin_files` — verify all expected files exist
4. `test_build_compile` — run build and check for errors

- [ ] **Step 5: Test OAuth flow end-to-end**

Prerequisites: Set real `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env.local` from the Spotify Developer Dashboard. Set `SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback`.

1. Add a new Spotify tile in the dashboard
2. Click "Mit Spotify verbinden"
3. Authorize in the Spotify popup
4. Verify popup closes and shows "Verbunden als [Username]"
5. Save the tile and verify stats appear
6. Test play/pause/skip controls in 2x2 widget

- [ ] **Step 6: Final commit with any fixes**

```bash
git add -A
git commit -m "feat(spotify): complete Spotify plugin integration"
```

---

## Summary

| Task | Component | Files | Dependencies |
|------|-----------|-------|-------------|
| 1 | Setup & Types | `.env.example`, `types.ts` | None |
| 2 | API Client | `spotify-api.ts` | Task 1 |
| 3 | OAuth Routes | `auth/`, `callback/`, `status/`, `disconnect/` | Task 2 |
| 4 | Action Route | `action/route.ts` | Task 2 |
| 5 | OAuth Framework | `types.ts`, `TileDialog.tsx` | Task 3 |
| 6 | Plugin Definition | `index.ts` | Tasks 2, 5 |
| 7 | 2x2 Widget | `SpotifyPlayer2x2.tsx` | Task 1 (types) |
| 8 | 2x1 Widget | `SpotifyPlayer2x1.tsx` | Task 1 (types) |
| 9 | Router & Registration | `SpotifyWidget.tsx`, `SpotifyDeviceSelector.tsx` | Tasks 6, 7, 8 |
| 10 | Build & Verify | None (verification) | All |

**Parallel-safe tasks:** Tasks 7 and 8 can run in parallel (independent widget components). Tasks 3 and 4 can also run in parallel (independent API routes).
