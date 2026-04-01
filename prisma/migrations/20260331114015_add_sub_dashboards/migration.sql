-- CreateTable
CREATE TABLE "SubDashboard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubDashboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "groupId" INTEGER,
    "subDashboardId" INTEGER,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tile_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TileGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tile_subDashboardId_fkey" FOREIGN KEY ("subDashboardId") REFERENCES "SubDashboard" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Tile" ("color", "columnSpan", "createdAt", "customIconSvg", "description", "enhancedConfig", "enhancedType", "groupId", "icon", "id", "order", "pinned", "rowSpan", "title", "type", "updatedAt", "url", "userId") SELECT "color", "columnSpan", "createdAt", "customIconSvg", "description", "enhancedConfig", "enhancedType", "groupId", "icon", "id", "order", "pinned", "rowSpan", "title", "type", "updatedAt", "url", "userId" FROM "Tile";
DROP TABLE "Tile";
ALTER TABLE "new_Tile" RENAME TO "Tile";
CREATE INDEX "Tile_userId_idx" ON "Tile"("userId");
CREATE INDEX "Tile_groupId_idx" ON "Tile"("groupId");
CREATE INDEX "Tile_subDashboardId_idx" ON "Tile"("subDashboardId");
CREATE TABLE "new_TileGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL DEFAULT 1,
    "subDashboardId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TileGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TileGroup_subDashboardId_fkey" FOREIGN KEY ("subDashboardId") REFERENCES "SubDashboard" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TileGroup" ("collapsed", "color", "createdAt", "icon", "id", "order", "title", "updatedAt", "userId") SELECT "collapsed", "color", "createdAt", "icon", "id", "order", "title", "updatedAt", "userId" FROM "TileGroup";
DROP TABLE "TileGroup";
ALTER TABLE "new_TileGroup" RENAME TO "TileGroup";
CREATE INDEX "TileGroup_userId_idx" ON "TileGroup"("userId");
CREATE INDEX "TileGroup_subDashboardId_idx" ON "TileGroup"("subDashboardId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SubDashboard_userId_idx" ON "SubDashboard"("userId");
