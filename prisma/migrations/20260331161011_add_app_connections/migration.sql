-- CreateTable
CREATE TABLE "AppConnection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "pluginType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "customIconSvg" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "url" TEXT,
    "config" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AppConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "appConnectionId" INTEGER,
    "groupId" INTEGER,
    "subDashboardId" INTEGER,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tile_appConnectionId_fkey" FOREIGN KEY ("appConnectionId") REFERENCES "AppConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tile_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TileGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tile_subDashboardId_fkey" FOREIGN KEY ("subDashboardId") REFERENCES "SubDashboard" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Tile" ("color", "columnSpan", "createdAt", "customIconSvg", "description", "enhancedConfig", "enhancedType", "groupId", "icon", "id", "order", "pinned", "rowSpan", "subDashboardId", "title", "type", "updatedAt", "url", "userId") SELECT "color", "columnSpan", "createdAt", "customIconSvg", "description", "enhancedConfig", "enhancedType", "groupId", "icon", "id", "order", "pinned", "rowSpan", "subDashboardId", "title", "type", "updatedAt", "url", "userId" FROM "Tile";
DROP TABLE "Tile";
ALTER TABLE "new_Tile" RENAME TO "Tile";
CREATE INDEX "Tile_userId_idx" ON "Tile"("userId");
CREATE INDEX "Tile_groupId_idx" ON "Tile"("groupId");
CREATE INDEX "Tile_subDashboardId_idx" ON "Tile"("subDashboardId");
CREATE INDEX "Tile_appConnectionId_idx" ON "Tile"("appConnectionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AppConnection_userId_idx" ON "AppConnection"("userId");

-- CreateIndex
CREATE INDEX "AppConnection_pluginType_idx" ON "AppConnection"("pluginType");
