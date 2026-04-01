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
    "userId" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TileGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TileGroup" ("color", "createdAt", "icon", "id", "order", "title", "updatedAt", "userId") SELECT "color", "createdAt", "icon", "id", "order", "title", "updatedAt", "userId" FROM "TileGroup";
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
INSERT INTO "new_UserSettings" ("aiApiKey", "aiEndpoint", "aiModel", "aiProvider", "background", "backgroundType", "gridColumns", "id", "language", "searchProvider", "showClock", "showGreeting", "showSearch", "theme", "tileSize", "userId") SELECT "aiApiKey", "aiEndpoint", "aiModel", "aiProvider", "background", "backgroundType", "gridColumns", "id", "language", "searchProvider", "showClock", "showGreeting", "showSearch", "theme", "tileSize", "userId" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
