-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "dedupKey" TEXT;

-- CreateIndex
CREATE INDEX "Notification_sourceId_dedupKey_idx" ON "Notification"("sourceId", "dedupKey");
