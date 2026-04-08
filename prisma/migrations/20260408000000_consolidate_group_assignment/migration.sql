-- Migration: Consolidate group assignment to GroupTile only
-- Removes Tile.groupId FK (direct relation) and ensures a tile can only be in one group via @@unique([tileId]) on GroupTile

-- Step 0: Backfill — ensure every Tile with groupId has a corresponding GroupTile entry
-- This preserves group assignments that were stored via the old Tile.groupId FK
INSERT OR IGNORE INTO "GroupTile" ("groupId", "tileId", "order", "createdAt")
SELECT t."groupId", t."id", t."order", CURRENT_TIMESTAMP
FROM "Tile" t
WHERE t."groupId" IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM "GroupTile" gt WHERE gt."tileId" = t."id"
);

-- Step 1: Recreate Tile table without groupId column
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT,
    "customIconSvg" TEXT,
    "description" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "columnSpan" INTEGER NOT NULL DEFAULT 1,
    "rowSpan" INTEGER NOT NULL DEFAULT 1,
    "type" TEXT NOT NULL DEFAULT 'standard',
    "enhancedType" TEXT,
    "enhancedConfig" TEXT,
    "appConnectionId" INTEGER,
    "subDashboardId" INTEGER,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tile_appConnectionId_fkey" FOREIGN KEY ("appConnectionId") REFERENCES "AppConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tile_subDashboardId_fkey" FOREIGN KEY ("subDashboardId") REFERENCES "SubDashboard" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Tile" ("appConnectionId", "color", "columnSpan", "createdAt", "customIconSvg", "description", "enhancedConfig", "enhancedType", "icon", "id", "order", "pinned", "rowSpan", "subDashboardId", "title", "type", "updatedAt", "url", "userId") SELECT "appConnectionId", "color", "columnSpan", "createdAt", "customIconSvg", "description", "enhancedConfig", "enhancedType", "icon", "id", "order", "pinned", "rowSpan", "subDashboardId", "title", "type", "updatedAt", "url", "userId" FROM "Tile";
DROP TABLE "Tile";
ALTER TABLE "new_Tile" RENAME TO "Tile";
CREATE INDEX "Tile_userId_idx" ON "Tile"("userId");
CREATE INDEX "Tile_subDashboardId_idx" ON "Tile"("subDashboardId");
CREATE INDEX "Tile_appConnectionId_idx" ON "Tile"("appConnectionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Step 2: Add @@unique([tileId]) to GroupTile (ensures 1 tile can only be in 1 group)
-- SQLite requires table recreation to add a unique constraint
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GroupTile" (
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
INSERT INTO "new_GroupTile" ("columnSpan", "createdAt", "groupId", "id", "order", "rowSpan", "tileId") SELECT "columnSpan", "createdAt", "groupId", "id", "order", "rowSpan", "tileId" FROM "GroupTile";
DROP TABLE "GroupTile";
ALTER TABLE "new_GroupTile" RENAME TO "GroupTile";
CREATE UNIQUE INDEX "GroupTile_groupId_tileId_key" ON "GroupTile"("groupId", "tileId");
CREATE UNIQUE INDEX "GroupTile_tileId_key" ON "GroupTile"("tileId");
CREATE INDEX "GroupTile_groupId_idx" ON "GroupTile"("groupId");
CREATE INDEX "GroupTile_tileId_idx" ON "GroupTile"("tileId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
