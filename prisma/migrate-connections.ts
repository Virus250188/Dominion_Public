import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env BEFORE importing crypto (which reads AUTH_SECRET at call time)
try {
  const envPath = resolve(__dirname, "../.env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env not found — rely on process.env or crypto.ts fallback
}

// Dynamic imports after .env is loaded
const { PrismaClient } = await import("../src/generated/prisma");
const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
const { encrypt } = await import("../src/lib/crypto");

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

// Connection/credential fields that belong in AppConnection.config (encrypted)
const CONNECTION_FIELDS = new Set(["apiKey", "accessToken", "username", "password"]);

// apiUrl goes into AppConnection.url directly (not into config JSON)
const URL_FIELD = "apiUrl";

async function main() {
  console.log("=== AppConnection Migration ===\n");

  const tiles = await prisma.tile.findMany({
    orderBy: { id: "asc" },
  });

  console.log(`Found ${tiles.length} tiles to process.\n`);

  let created = 0;
  let skipped = 0;

  for (const tile of tiles) {
    // Idempotency: skip tiles that already have a connection
    if (tile.appConnectionId != null) {
      console.log(`SKIP  Tile #${tile.id} "${tile.title}" — already has appConnectionId=${tile.appConnectionId}`);
      skipped++;
      continue;
    }

    if (tile.type === "enhanced" && tile.enhancedConfig) {
      // ── Enhanced Tile ──────────────────────────────────────────────
      let parsedConfig: Record<string, unknown>;
      try {
        parsedConfig = JSON.parse(tile.enhancedConfig);
      } catch {
        console.log(`SKIP  Tile #${tile.id} "${tile.title}" — invalid enhancedConfig JSON`);
        skipped++;
        continue;
      }

      // Separate connection fields from display fields
      const connectionConfig: Record<string, string> = {};
      const displayConfig: Record<string, unknown> = {};
      let extractedUrl: string | null = null;

      for (const [key, value] of Object.entries(parsedConfig)) {
        if (key === URL_FIELD) {
          extractedUrl = value as string;
        } else if (CONNECTION_FIELDS.has(key) && value != null && value !== "") {
          connectionConfig[key] = value as string;
        } else {
          displayConfig[key] = value;
        }
      }

      // Encrypt connection config (only if there are credential fields)
      const encryptedConfig = Object.keys(connectionConfig).length > 0
        ? encrypt(JSON.stringify(connectionConfig))
        : null;

      // Create AppConnection
      const connection = await prisma.appConnection.create({
        data: {
          userId: tile.userId,
          pluginType: tile.enhancedType ?? "unknown",
          name: tile.title,
          icon: tile.icon,
          customIconSvg: tile.customIconSvg,
          color: tile.color,
          url: extractedUrl,
          config: encryptedConfig,
          description: null,
        },
      });

      // Update tile: link to connection + strip connection fields from enhancedConfig
      await prisma.tile.update({
        where: { id: tile.id },
        data: {
          appConnectionId: connection.id,
          enhancedConfig: JSON.stringify(displayConfig),
        },
      });

      console.log(`CREATE AppConnection #${connection.id} for enhanced tile #${tile.id} "${tile.title}" (plugin: ${tile.enhancedType})`);
      console.log(`  → url: ${extractedUrl ?? "(none)"}`);
      console.log(`  → credentials: ${Object.keys(connectionConfig).join(", ") || "(none)"}`);
      console.log(`  → display fields kept: ${Object.keys(displayConfig).join(", ") || "(none)"}`);
      created++;

    } else {
      // ── Standard Tile — skip, bookmarks don't need AppConnections ──
      console.log(`SKIP  Tile #${tile.id} "${tile.title}" — standard tile (bookmark only)`);
      skipped++;
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Created: ${created} connections`);
  console.log(`Skipped: ${skipped} tiles`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Migration failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
