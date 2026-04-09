-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NotificationSource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "apiKey" TEXT NOT NULL,
    "rssUrl" TEXT,
    "rssInterval" INTEGER,
    "rssLastFetch" DATETIME,
    "rateLimit" INTEGER NOT NULL DEFAULT 60,
    "appConnectionId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationSource_appConnectionId_fkey" FOREIGN KEY ("appConnectionId") REFERENCES "AppConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NotificationSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NotificationSource" ("apiKey", "color", "createdAt", "enabled", "icon", "id", "name", "rateLimit", "rssInterval", "rssLastFetch", "rssUrl", "sourceId", "type", "updatedAt", "userId") SELECT "apiKey", "color", "createdAt", "enabled", "icon", "id", "name", "rateLimit", "rssInterval", "rssLastFetch", "rssUrl", "sourceId", "type", "updatedAt", "userId" FROM "NotificationSource";
DROP TABLE "NotificationSource";
ALTER TABLE "new_NotificationSource" RENAME TO "NotificationSource";
CREATE INDEX "NotificationSource_userId_idx" ON "NotificationSource"("userId");
CREATE UNIQUE INDEX "NotificationSource_userId_sourceId_key" ON "NotificationSource"("userId", "sourceId");
CREATE UNIQUE INDEX "NotificationSource_userId_name_key" ON "NotificationSource"("userId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
