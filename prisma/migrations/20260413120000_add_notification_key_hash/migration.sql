-- AlterTable
ALTER TABLE "NotificationSource" ADD COLUMN "apiKeyHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSource_apiKeyHash_key" ON "NotificationSource"("apiKeyHash");
