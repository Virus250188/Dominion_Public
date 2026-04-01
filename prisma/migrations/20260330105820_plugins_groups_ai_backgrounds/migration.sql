-- AlterTable
ALTER TABLE "Tile" ADD COLUMN "customIconSvg" TEXT;

-- CreateTable
CREATE TABLE "GroupTile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "groupId" INTEGER NOT NULL,
    "tileId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "columnSpan" INTEGER,
    "rowSpan" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupTile_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TileGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupTile_tileId_fkey" FOREIGN KEY ("tileId") REFERENCES "Tile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HealthStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastCheck" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latencyMs" INTEGER
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TileGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TileGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TileGroup" ("createdAt", "id", "order", "title", "updatedAt") SELECT "createdAt", "id", "order", "title", "updatedAt" FROM "TileGroup";
DROP TABLE "TileGroup";
ALTER TABLE "new_TileGroup" RENAME TO "TileGroup";
CREATE INDEX "TileGroup_userId_idx" ON "TileGroup"("userId");
CREATE TABLE "new_UserSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'glass-dark',
    "background" TEXT,
    "backgroundType" TEXT NOT NULL DEFAULT 'gradient',
    "searchProvider" TEXT NOT NULL DEFAULT 'google',
    "language" TEXT NOT NULL DEFAULT 'de',
    "gridColumns" INTEGER NOT NULL DEFAULT 6,
    "tileSize" TEXT NOT NULL DEFAULT 'medium',
    "showSearch" BOOLEAN NOT NULL DEFAULT true,
    "showClock" BOOLEAN NOT NULL DEFAULT true,
    "showGreeting" BOOLEAN NOT NULL DEFAULT true,
    "aiProvider" TEXT,
    "aiApiKey" TEXT,
    "aiModel" TEXT,
    "aiEndpoint" TEXT,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSettings" ("background", "gridColumns", "id", "language", "searchProvider", "showClock", "showGreeting", "showSearch", "theme", "tileSize", "userId") SELECT "background", "gridColumns", "id", "language", "searchProvider", "showClock", "showGreeting", "showSearch", "theme", "tileSize", "userId" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GroupTile_groupId_idx" ON "GroupTile"("groupId");

-- CreateIndex
CREATE INDEX "GroupTile_tileId_idx" ON "GroupTile"("tileId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupTile_groupId_tileId_key" ON "GroupTile"("groupId", "tileId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthStatus_url_key" ON "HealthStatus"("url");

-- CreateIndex
CREATE INDEX "HealthStatus_url_idx" ON "HealthStatus"("url");
