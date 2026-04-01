import { PrismaClient } from "../src/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
      isAdmin: true,
      isPublic: true,
      settings: {
        create: {
          theme: "glass-dark",
          searchProvider: "google",
          language: "de",
          gridColumns: 6,
          tileSize: "medium",
          showSearch: true,
          showClock: true,
          showGreeting: true,
        },
      },
    },
  });

  // Search Providers
  const searchProviders = [
    { name: "Google", url: "https://www.google.com/search?q={query}", icon: "search", isDefault: true },
    { name: "DuckDuckGo", url: "https://duckduckgo.com/?q={query}", icon: "shield", isDefault: false },
    { name: "Bing", url: "https://www.bing.com/search?q={query}", icon: "globe", isDefault: false },
    { name: "Startpage", url: "https://www.startpage.com/sp/search?query={query}", icon: "lock", isDefault: false },
    { name: "Brave", url: "https://search.brave.com/search?q={query}", icon: "compass", isDefault: false },
  ];

  for (const provider of searchProviders) {
    await prisma.searchProvider.upsert({
      where: { name: provider.name },
      update: {},
      create: provider,
    });
  }

  // Foundation Apps - User's services + popular self-hosted apps (50+)
  const foundationApps = [
    // ── User's actual services ──────────────────────────────────────────
    { name: "Emby", icon: "Emby", color: "#52B54B", website: "https://emby.media", description: "Media Server", category: "Media", enhanced: true },
    { name: "N8N", icon: "N8n", color: "#EA4B71", website: "https://n8n.io", description: "Workflow Automation", category: "Automation", enhanced: false },

    // ── Media ────────────────────────────────────────────────────────────
    { name: "Plex", icon: "Plex", color: "#EBAF00", website: "https://www.plex.tv", description: "Media Server", category: "Media", enhanced: false },
    { name: "Jellyfin", icon: "Jellyfin", color: "#00A4DC", website: "https://jellyfin.org", description: "Media Server", category: "Media", enhanced: false },
    { name: "Sonarr", icon: "Sonarr", color: "#35C5F4", website: "https://sonarr.tv", description: "Serien-Management", category: "Media", enhanced: false },
    { name: "Radarr", icon: "Radarr", color: "#FFC230", website: "https://radarr.video", description: "Film-Management", category: "Media", enhanced: false },
    { name: "Immich", icon: "Immich", color: "#4250AF", website: "https://immich.app", description: "Foto-Management", category: "Media", enhanced: false },
    { name: "Overseerr", icon: "Plex", color: "#7B2FED", website: "https://overseerr.dev", description: "Medien-Anfragen verwalten", category: "Media", enhanced: false },
    { name: "Tautulli", icon: "Plex", color: "#E5A00D", website: "https://tautulli.com", description: "Plex Monitoring und Statistiken", category: "Media", enhanced: false },
    { name: "Lidarr", icon: "Musicbrainz", color: "#1A9C55", website: "https://lidarr.audio", description: "Musik-Management", category: "Media", enhanced: false },
    { name: "Readarr", icon: "Calibreweb", color: "#8E4A21", website: "https://readarr.com", description: "eBook-Management", category: "Media", enhanced: false },
    { name: "Prowlarr", icon: "Sonarr", color: "#E48827", website: "https://prowlarr.com", description: "Indexer-Manager", category: "Media", enhanced: false },
    { name: "Bazarr", icon: "Subtitleedit", color: "#7F7F26", website: "https://www.bazarr.media", description: "Untertitel-Management", category: "Media", enhanced: false },
    { name: "Navidrome", icon: "Musicbrainz", color: "#0A69DA", website: "https://www.navidrome.org", description: "Musik-Streaming Server", category: "Media", enhanced: false },
    { name: "PhotoPrism", icon: "Googlephotos", color: "#E5AB47", website: "https://www.photoprism.app", description: "KI-gestuetzte Foto-Verwaltung", category: "Media", enhanced: false },

    // ── Network ──────────────────────────────────────────────────────────
    { name: "Pi-hole", icon: "Pihole", color: "#96060B", website: "https://pi-hole.net", description: "DNS Ad Blocker", category: "Network", enhanced: false },
    { name: "Nginx Proxy Manager", icon: "Nginx", color: "#F15833", website: "https://nginxproxymanager.com", description: "Reverse Proxy", category: "Network", enhanced: false },
    { name: "AdGuard Home", icon: "Adguard", color: "#68BC71", website: "https://adguard.com", description: "DNS Ad Blocker", category: "Network", enhanced: false },
    { name: "Traefik", icon: "Traefikproxy", color: "#37ABC8", website: "https://traefik.io", description: "Reverse Proxy", category: "Network", enhanced: false },
    { name: "WireGuard", icon: "Wireguard", color: "#88171A", website: "https://www.wireguard.com", description: "VPN-Tunnel", category: "Network", enhanced: false },
    { name: "Tailscale", icon: "Tailscale", color: "#242424", website: "https://tailscale.com", description: "Zero-Config VPN", category: "Network", enhanced: false },
    { name: "Caddy", icon: "Caddy", color: "#1F88C0", website: "https://caddyserver.com", description: "Automatischer HTTPS Web-Server", category: "Network", enhanced: false },

    // ── System ───────────────────────────────────────────────────────────
    { name: "Portainer", icon: "Portainer", color: "#13BEF9", website: "https://www.portainer.io", description: "Container Management", category: "System", enhanced: false },
    { name: "Proxmox", icon: "Proxmox", color: "#E57000", website: "https://www.proxmox.com", description: "Virtualisierungs-Plattform", category: "System", enhanced: false },
    { name: "Cockpit", icon: "Cockpit", color: "#0066CC", website: "https://cockpit-project.org", description: "Server-Administration im Browser", category: "System", enhanced: false },
    { name: "Webmin", icon: "Webmin", color: "#7DA0D0", website: "https://webmin.com", description: "Unix System-Administration", category: "System", enhanced: false },

    // ── Monitoring ───────────────────────────────────────────────────────
    { name: "Uptime Kuma", icon: "Uptimekuma", color: "#5CDD8B", website: "https://github.com/louislam/uptime-kuma", description: "Uptime Monitor", category: "Monitoring", enhanced: false },
    { name: "Grafana", icon: "Grafana", color: "#F46800", website: "https://grafana.com", description: "Analytics & Monitoring", category: "Monitoring", enhanced: false },
    { name: "Prometheus", icon: "Prometheus", color: "#E6522C", website: "https://prometheus.io", description: "Metriken und Monitoring", category: "Monitoring", enhanced: false },
    { name: "Netdata", icon: "Netdata", color: "#00AB44", website: "https://www.netdata.cloud", description: "Echtzeit System-Monitoring", category: "Monitoring", enhanced: false },
    { name: "Checkmk", icon: "Checkmk", color: "#15D1A0", website: "https://checkmk.com", description: "Enterprise-Monitoring", category: "Monitoring", enhanced: false },
    { name: "InfluxDB", icon: "Influxdb", color: "#22ADF6", website: "https://www.influxdata.com", description: "Zeitreihen-Datenbank", category: "Monitoring", enhanced: false },

    // ── Downloads ────────────────────────────────────────────────────────
    { name: "qBittorrent", icon: "Qbittorrent", color: "#2F67BA", website: "https://www.qbittorrent.org", description: "Torrent Client", category: "Downloads", enhanced: false },
    { name: "SABnzbd", icon: "arrow-down-circle", color: "#FEB600", website: "https://sabnzbd.org", description: "Usenet Downloader", category: "Downloads", enhanced: false },
    { name: "Transmission", icon: "Transmission", color: "#D70008", website: "https://transmissionbt.com", description: "BitTorrent-Client", category: "Downloads", enhanced: false },
    { name: "Deluge", icon: "Deluge", color: "#094491", website: "https://deluge-torrent.org", description: "BitTorrent-Client", category: "Downloads", enhanced: false },

    // ── Security ─────────────────────────────────────────────────────────
    { name: "Vaultwarden", icon: "Vaultwarden", color: "#175DDC", website: "https://github.com/dani-garcia/vaultwarden", description: "Passwort-Manager", category: "Security", enhanced: false },
    { name: "Authentik", icon: "Authentik", color: "#FD4B2D", website: "https://goauthentik.io", description: "Identity Provider", category: "Security", enhanced: false },
    { name: "Authelia", icon: "Authelia", color: "#113155", website: "https://www.authelia.com", description: "Multi-Faktor Authentifizierung", category: "Security", enhanced: false },
    { name: "Keycloak", icon: "Keycloak", color: "#4D4D4D", website: "https://www.keycloak.org", description: "Identity und Access Management", category: "Security", enhanced: false },

    // ── Productivity ─────────────────────────────────────────────────────
    { name: "Nextcloud", icon: "Nextcloud", color: "#0082C9", website: "https://nextcloud.com", description: "Datei-Hosting und Kollaboration", category: "Productivity", enhanced: false },
    { name: "Syncthing", icon: "Syncthing", color: "#0891D1", website: "https://syncthing.net", description: "Datei-Synchronisation", category: "Productivity", enhanced: false },
    { name: "Paperless-ngx", icon: "Paperlessngx", color: "#17541F", website: "https://docs.paperless-ngx.com", description: "Dokumenten-Management", category: "Productivity", enhanced: false },
    { name: "Bookstack", icon: "Bookstack", color: "#0288D1", website: "https://www.bookstackapp.com", description: "Wiki und Dokumentation", category: "Productivity", enhanced: false },
    { name: "Wiki.js", icon: "Wikidotjs", color: "#1976D2", website: "https://js.wiki", description: "Modernes Wiki", category: "Productivity", enhanced: false },
    { name: "Outline", icon: "Outline", color: "#5C6BC0", website: "https://www.getoutline.com", description: "Team-Wiki und Wissensbasis", category: "Productivity", enhanced: false },
    { name: "Mealie", icon: "Mealie", color: "#E58325", website: "https://mealie.io", description: "Rezept-Manager", category: "Productivity", enhanced: false },

    // ── Development ──────────────────────────────────────────────────────
    { name: "Gitea", icon: "Gitea", color: "#609926", website: "https://gitea.io", description: "Git Hosting", category: "Development", enhanced: false },
    { name: "Forgejo", icon: "Forgejo", color: "#FB923C", website: "https://forgejo.org", description: "Git-Hosting (Gitea Fork)", category: "Development", enhanced: false },
    { name: "GitLab", icon: "Gitlab", color: "#FC6D26", website: "https://about.gitlab.com", description: "DevOps-Plattform mit Git-Hosting", category: "Development", enhanced: false },
    { name: "Drone CI", icon: "Drone", color: "#212121", website: "https://www.drone.io", description: "CI/CD Pipeline", category: "Development", enhanced: false },
    { name: "Jenkins", icon: "Jenkins", color: "#D24939", website: "https://www.jenkins.io", description: "Automatisierungs-Server fuer CI/CD", category: "Development", enhanced: false },
    { name: "VS Code Server", icon: "Vscodium", color: "#2F80ED", website: "https://github.com/coder/code-server", description: "Code-Editor im Browser", category: "Development", enhanced: false },

    // ── Storage ──────────────────────────────────────────────────────────
    { name: "MinIO", icon: "Minio", color: "#C72E49", website: "https://min.io", description: "S3-kompatibler Objekt-Speicher", category: "Storage", enhanced: false },
    { name: "Seafile", icon: "Seafile", color: "#FF9800", website: "https://www.seafile.com", description: "Datei-Sync und Cloud-Speicher", category: "Storage", enhanced: false },

    // ── Communication ────────────────────────────────────────────────────
    { name: "Ntfy", icon: "Ntfy", color: "#317F6F", website: "https://ntfy.sh", description: "Push-Benachrichtigungen", category: "Automation", enhanced: false },
    { name: "Element", icon: "Element", color: "#0DBD8B", website: "https://element.io", description: "Sichere Kommunikation (Matrix)", category: "Productivity", enhanced: false },
    { name: "Rocket.Chat", icon: "Rocketdotchat", color: "#F5455C", website: "https://rocket.chat", description: "Team-Chat und Kollaboration", category: "Productivity", enhanced: false },

    // ── Other ────────────────────────────────────────────────────────────
    { name: "Homebridge", icon: "Homebridge", color: "#491F59", website: "https://homebridge.io", description: "HomeKit-Unterstuetzung", category: "Automation", enhanced: false },
    { name: "Duplicati", icon: "Duplicati", color: "#1E3A8A", website: "https://www.duplicati.com", description: "Backup-Software", category: "System", enhanced: false },
  ];

  for (const app of foundationApps) {
    await prisma.foundationApp.upsert({
      where: { name: app.name },
      update: {},
      create: app,
    });
  }

  console.log("Seed completed successfully!");
  console.log(`Created admin user: ${admin.username}`);
  console.log(`Created ${searchProviders.length} search providers`);
  console.log(`Created ${foundationApps.length} foundation apps`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
