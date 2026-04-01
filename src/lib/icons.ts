import * as simpleIcons from "simple-icons";
import { getPluginIconSlug } from "@/plugins/registry";

// Foundation-only icon map for apps that are NOT plugins.
// Plugin apps get their icon slug directly from metadata.icon via the registry.
const FOUNDATION_ICON_MAP: Record<string, string> = {
  // ── Media ───────────────────────────────────────────────────────────
  "Plex": "Plex",
  "Jellyfin": "Jellyfin",
  "Sonarr": "Sonarr",
  "Radarr": "Radarr",
  "Immich": "Immich",
  "Overseerr": "Plex",
  "Tautulli": "Plex",
  "Lidarr": "Musicbrainz",
  "Readarr": "Calibreweb",
  "Prowlarr": "Sonarr",
  "Bazarr": "Subtitleedit",
  "Navidrome": "Musicbrainz",
  "PhotoPrism": "Googlephotos",

  // ── Network ─────────────────────────────────────────────────────────
  "Pi-hole": "Pihole",
  "Nginx Proxy Manager": "Nginx",
  "AdGuard Home": "Adguard",
  "Traefik": "Traefikproxy",
  "WireGuard": "Wireguard",
  "Tailscale": "Tailscale",
  "Caddy": "Caddy",

  // ── System ──────────────────────────────────────────────────────────
  "Portainer": "Portainer",
  "Proxmox": "Proxmox",
  "Cockpit": "Cockpit",
  "Webmin": "Webmin",

  // ── Monitoring ──────────────────────────────────────────────────────
  "Uptime Kuma": "Uptimekuma",
  "Grafana": "Grafana",
  "Prometheus": "Prometheus",
  "Netdata": "Netdata",
  "Checkmk": "Checkmk",
  "InfluxDB": "Influxdb",

  // ── Downloads ───────────────────────────────────────────────────────
  "qBittorrent": "Qbittorrent",
  "Transmission": "Transmission",
  "Deluge": "Deluge",

  // ── Security ────────────────────────────────────────────────────────
  "Vaultwarden": "Vaultwarden",
  "Authentik": "Authentik",
  "Authelia": "Authelia",
  "Keycloak": "Keycloak",

  // ── Productivity ────────────────────────────────────────────────────
  "Nextcloud": "Nextcloud",
  "Syncthing": "Syncthing",
  "Paperless-ngx": "Paperlessngx",
  "Bookstack": "Bookstack",
  "Wiki.js": "Wikidotjs",
  "Outline": "Outline",
  "Mealie": "Mealie",
  "Element": "Element",
  "Rocket.Chat": "Rocketdotchat",

  // ── Development ─────────────────────────────────────────────────────
  "Gitea": "Gitea",
  "Forgejo": "Forgejo",
  "GitLab": "Gitlab",
  "Drone CI": "Drone",
  "Jenkins": "Jenkins",
  "VS Code Server": "Vscodium",

  // ── Storage ─────────────────────────────────────────────────────────
  "MinIO": "Minio",
  "Seafile": "Seafile",

  // ── Streaming / Social ───────────────────────────────────────────────
  "YouTube": "Youtube",
  "Twitch": "Twitch",
  "Netflix": "Netflix",
  "Spotify": "Spotify",
  "Discord": "Discord",

  // ── Other ───────────────────────────────────────────────────────────
  "N8N": "N8n",
  "n8n": "N8n",
  "Ntfy": "Ntfy",
  "Homebridge": "Homebridge",
  "Duplicati": "Duplicati",
};

export interface IconData {
  svg: string;
  hex: string;
}

/**
 * Resolve a simple-icons slug for the given app name.
 * Order: plugin registry (auto) -> foundation map -> null.
 */
function resolveSlug(appName: string): string | null {
  // 1. Check plugin registry (covers all builtin + community plugins)
  const pluginSlug = getPluginIconSlug(appName);
  if (pluginSlug) return pluginSlug;

  // 2. Check foundation icon map
  return FOUNDATION_ICON_MAP[appName] ?? null;
}

export function getSimpleIcon(appName: string): IconData | null {
  const slug = resolveSlug(appName);
  if (!slug) return null;

  const key = `si${slug}` as keyof typeof simpleIcons;
  const icon = simpleIcons[key];

  if (icon && typeof icon === "object" && "svg" in icon) {
    return {
      svg: (icon as { svg: string }).svg,
      hex: (icon as { hex: string }).hex,
    };
  }

  return null;
}

/**
 * Fuzzy match an app title to a known icon.
 * Tries: exact match -> case-insensitive -> substring match.
 * Checks plugin registry first, then foundation map.
 */
export function fuzzyMatchIcon(title: string): IconData | null {
  // 1. Exact match (plugin + foundation)
  const exact = getSimpleIcon(title);
  if (exact) return exact;

  // 2. Case-insensitive match against foundation map
  const lowerTitle = title.toLowerCase();
  for (const [name] of Object.entries(FOUNDATION_ICON_MAP)) {
    if (name.toLowerCase() === lowerTitle) {
      return getSimpleIcon(name);
    }
  }

  // 3. Substring match (title contains known name or vice versa)
  for (const [name] of Object.entries(FOUNDATION_ICON_MAP)) {
    const lowerName = name.toLowerCase();
    if (lowerTitle.includes(lowerName) || lowerName.includes(lowerTitle)) {
      return getSimpleIcon(name);
    }
  }

  return null;
}

/**
 * Get the brand color hex string for a matched app icon.
 * Returns the color with '#' prefix, or null if no match.
 */
export function getIconColor(appName: string): string | null {
  const icon = fuzzyMatchIcon(appName);
  return icon ? `#${icon.hex}` : null;
}
