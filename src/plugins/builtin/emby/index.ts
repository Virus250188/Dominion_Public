import type { AppPlugin, PluginConfig, PluginStats } from "../../types";
import { getVisibleStats, normalizeUrl, createErrorResponse, createFetchOptions } from "../../utils";

export const embyPlugin: AppPlugin = {
  metadata: {
    id: "emby",
    name: "Emby",
    icon: "Emby",
    color: "#52b54b",
    description: "Zeigt an: Aktive Streams, Anzahl Filme, Anzahl Serien",
    category: "Media",
    website: "https://emby.media",
  },

  configFields: [
    {
      key: "apiUrl",
      label: "Emby Server URL",
      type: "url",
      placeholder: "http://emby.local:8096",
      required: true,
      description: "Die URL deines Emby Servers",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      description:
        "Erstelle einen API Key unter Einstellungen → API Keys",
    },
    {
      key: "mediaCategory",
      label: "Medien-Kategorie",
      type: "select",
      description: "Welche Kategorie soll in den Widgets angezeigt werden?",
      options: [
        { label: "Filme", value: "Movie" },
        { label: "Serien", value: "Series" },
        { label: "Filme & Serien", value: "Mixed" },
      ],
    },
    {
      key: "carouselSpeed",
      label: "Karussell-Geschwindigkeit",
      type: "select",
      description: "Wie schnell sollen die Covers wechseln?",
      options: [
        { label: "Langsam (8s)", value: "8000" },
        { label: "Normal (5s)", value: "5000" },
        { label: "Schnell (3s)", value: "3000" },
      ],
    },
    {
      key: "carouselItems",
      label: "Anzahl Covers",
      type: "select",
      description: "Wie viele Covers sollen im Karussell angezeigt werden?",
      options: [
        { label: "3 Covers", value: "3" },
        { label: "5 Covers", value: "5" },
        { label: "8 Covers", value: "8" },
        { label: "10 Covers", value: "10" },
      ],
    },
  ],

  statOptions: [
    {
      key: "streams",
      label: "Aktive Streams",
      description: "Anzahl aktuell laufender Streams",
      defaultEnabled: true,
    },
    {
      key: "movies",
      label: "Filme",
      description: "Gesamtzahl der Filme",
      defaultEnabled: true,
    },
    {
      key: "series",
      label: "Serien",
      description: "Gesamtzahl der Serien",
      defaultEnabled: true,
    },
    {
      key: "episodes",
      label: "Episoden",
      description: "Gesamtzahl der Episoden",
      defaultEnabled: false,
    },
    {
      key: "music",
      label: "Musikalben",
      description: "Gesamtzahl der Musikalben",
      defaultEnabled: false,
    },
    {
      key: "artists",
      label: "Künstler",
      description: "Gesamtzahl der Künstler",
      defaultEnabled: false,
    },
  ],

  supportedSizes: ["1x1", "2x1", "2x2"],

  renderHints: {
    "1x1": { maxStats: 3, layout: "compact" },
    "2x1": { maxStats: 6, layout: "widget", widgetComponent: "EmbyWidget" },
    "2x2": { maxStats: 4, layout: "widget", widgetComponent: "EmbyWidget" },
  },

  async fetchStats(config: PluginConfig): Promise<PluginStats> {
    try {
      const visibleStats = getVisibleStats(config, this.statOptions);
      const baseUrl = normalizeUrl(config.apiUrl);
      const apiKey = String(config.apiKey || "");
      const mediaCategory = String(config.mediaCategory || "Mixed");
      const carouselItemsLimit = parseInt(String(config.carouselItems || "5"), 10);

      const headers: HeadersInit = {
        "X-Emby-Token": apiKey,
      };
      const fetchOpts = { ...createFetchOptions(8000), headers };

      function getImageUrl(itemId: string, maxHeight: number): string {
        return `${baseUrl}/Items/${itemId}/Images/Primary?maxHeight=${maxHeight}&quality=90&api_key=${encodeURIComponent(apiKey)}`;
      }

      // Resolve the first admin user ID (required for /Users/{id}/Items/Latest)
      let userId = "";
      try {
        const usersRes = await fetch(`${baseUrl}/Users`, fetchOpts);
        if (usersRes.ok) {
          const users = await usersRes.json();
          if (Array.isArray(users) && users.length > 0) {
            userId = String(users[0].Id);
          }
        }
      } catch {
        // If user lookup fails, widget data will be skipped
      }

      // Build all fetches in parallel: sessions, counts, and recently added items
      const fetches: Promise<Response>[] = [
        fetch(`${baseUrl}/Sessions`, fetchOpts),
        fetch(`${baseUrl}/Items/Counts`, fetchOpts),
      ];

      // Recently added items for widget data (requires userId)
      const recentFetchIndices: Array<{ index: number; type: "Movie" | "Series" }> = [];
      if (userId) {
        const latestBase = `${baseUrl}/Users/${userId}/Items/Latest`;
        const latestFields = "Fields=Overview,CommunityRating,OfficialRating,ProductionYear&EnableImageTypes=Primary";

        if (mediaCategory === "Movie" || mediaCategory === "Mixed") {
          recentFetchIndices.push({ index: fetches.length, type: "Movie" });
          fetches.push(
            fetch(`${latestBase}?IncludeItemTypes=Movie&Limit=${carouselItemsLimit}&${latestFields}`, fetchOpts),
          );
        }
        if (mediaCategory === "Series" || mediaCategory === "Mixed") {
          recentFetchIndices.push({ index: fetches.length, type: "Series" });
          fetches.push(
            fetch(`${latestBase}?IncludeItemTypes=Series&Limit=${carouselItemsLimit}&${latestFields}`, fetchOpts),
          );
        }
      }

      const results = await Promise.all(fetches);
      const [sessionsRes, countsRes] = results;

      // ── Build stat items ──────────────────────────────────────────────
      const items = [];

      if (visibleStats.includes("streams") && sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        const activeSessions = Array.isArray(sessions)
          ? sessions.filter((s: { NowPlayingItem?: unknown }) => s.NowPlayingItem)
          : [];
        items.push({
          label: "Streams",
          value: activeSessions.length,
          color: activeSessions.length > 0 ? "green" : undefined,
        });
      }

      if (countsRes.ok) {
        const counts = await countsRes.json();
        if (visibleStats.includes("movies") && counts.MovieCount !== undefined) {
          items.push({ label: "Filme", value: counts.MovieCount });
        }
        if (visibleStats.includes("series") && counts.SeriesCount !== undefined) {
          items.push({ label: "Serien", value: counts.SeriesCount });
        }
        if (visibleStats.includes("episodes") && counts.EpisodeCount !== undefined) {
          items.push({ label: "Episoden", value: counts.EpisodeCount });
        }
        if (visibleStats.includes("music") && counts.MusicAlbumCount !== undefined) {
          items.push({ label: "Musikalben", value: counts.MusicAlbumCount });
        }
        if (visibleStats.includes("artists") && counts.ArtistCount !== undefined) {
          items.push({ label: "Künstler", value: counts.ArtistCount });
        }
      }

      // ── Build widget data (recently added items) ──────────────────────
      let recentItems: Array<{
        id: string;
        title: string;
        year: number | null;
        rating: number | null;
        officialRating: string | null;
        type: "Movie" | "Series";
        imageUrl: string;
        overview: string | null;
      }> = [];

      try {
        const allRawItems: Array<{ item: Record<string, unknown>; type: "Movie" | "Series" }> = [];

        for (const { index, type } of recentFetchIndices) {
          const res = results[index];
          if (res.ok) {
            const data = await res.json();
            const arr = Array.isArray(data) ? data : [];
            for (const item of arr) {
              allRawItems.push({ item, type });
            }
          }
        }

        // For "Mixed", interleave movies and series by taking alternately
        if (mediaCategory === "Mixed" && recentFetchIndices.length === 2) {
          const movies = allRawItems.filter((r) => r.type === "Movie");
          const series = allRawItems.filter((r) => r.type === "Series");
          const interleaved: typeof allRawItems = [];
          const maxLen = Math.max(movies.length, series.length);
          for (let i = 0; i < maxLen; i++) {
            if (i < movies.length) interleaved.push(movies[i]);
            if (i < series.length) interleaved.push(series[i]);
          }
          allRawItems.length = 0;
          allRawItems.push(...interleaved);
        }

        const sliceLimit = mediaCategory === "Mixed" ? carouselItemsLimit * 2 : carouselItemsLimit;
        recentItems = allRawItems.slice(0, sliceLimit).map(({ item }) => ({
          id: String(item.Id),
          title: item.Type === "Episode" ? (String(item.SeriesName || item.Name)) : String(item.Name),
          year: (item.ProductionYear as number) || null,
          rating: (item.CommunityRating as number) || null,
          officialRating: item.OfficialRating ? String(item.OfficialRating) : null,
          type: item.Type === "Series" ? "Series" as const : "Movie" as const,
          imageUrl: (item.ImageTags as Record<string, string> | undefined)?.Primary
            ? getImageUrl(String(item.Id), 400)
            : "",
          overview: item.Overview ? String(item.Overview).substring(0, 120) : null,
        }));
      } catch {
        // Widget data fetch failed - continue with stats only
      }

      return {
        items,
        status: "ok",
        widgetData: {
          recentItems,
          mediaCategory,
          carouselSpeed: parseInt(String(config.carouselSpeed || "5000"), 10),
          carouselItems: parseInt(String(config.carouselItems || "5"), 10),
        },
      };
    } catch (err) {
      return createErrorResponse(err);
    }
  },

  async testConnection(
    config: PluginConfig,
  ): Promise<{ ok: boolean; message: string }> {
    try {
      const baseUrl = normalizeUrl(config.apiUrl);
      const res = await fetch(`${baseUrl}/System/Info/Public`, {
        ...createFetchOptions(),
        headers: {
          "X-Emby-Token": String(config.apiKey || ""),
        },
      });
      if (!res.ok) {
        return { ok: false, message: `HTTP ${res.status}: Zugriff verweigert` };
      }
      const info = await res.json();
      return {
        ok: true,
        message: `Verbunden mit ${info.ServerName || "Emby"} (v${info.Version || "?"})`,
      };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  },
};
