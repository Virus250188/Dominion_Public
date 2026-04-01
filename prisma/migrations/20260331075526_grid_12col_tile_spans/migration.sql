-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'glass-dark',
    "background" TEXT,
    "backgroundType" TEXT NOT NULL DEFAULT 'gradient',
    "searchProvider" TEXT NOT NULL DEFAULT 'google',
    "language" TEXT NOT NULL DEFAULT 'de',
    "gridColumns" INTEGER NOT NULL DEFAULT 12,
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

-- Data migration: update existing 2x2 tiles from columnSpan=2 to columnSpan=4
UPDATE "Tile" SET "columnSpan" = 4 WHERE "columnSpan" = 2 AND "rowSpan" = 2;
UPDATE "GroupTile" SET "columnSpan" = 4 WHERE "columnSpan" = 2 AND "rowSpan" = 2;
UPDATE "UserSettings" SET "gridColumns" = 12 WHERE "gridColumns" = 6;
