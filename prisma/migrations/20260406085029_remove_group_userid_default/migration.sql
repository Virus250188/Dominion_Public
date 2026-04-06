-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TileGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "subDashboardId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TileGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TileGroup_subDashboardId_fkey" FOREIGN KEY ("subDashboardId") REFERENCES "SubDashboard" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TileGroup" ("collapsed", "color", "createdAt", "icon", "id", "order", "subDashboardId", "title", "updatedAt", "userId") SELECT "collapsed", "color", "createdAt", "icon", "id", "order", "subDashboardId", "title", "updatedAt", "userId" FROM "TileGroup";
DROP TABLE "TileGroup";
ALTER TABLE "new_TileGroup" RENAME TO "TileGroup";
CREATE INDEX "TileGroup_userId_idx" ON "TileGroup"("userId");
CREATE INDEX "TileGroup_subDashboardId_idx" ON "TileGroup"("subDashboardId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
