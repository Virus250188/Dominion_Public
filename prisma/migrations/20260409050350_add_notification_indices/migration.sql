-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_sourceId_idx" ON "Notification"("sourceId");

-- CreateIndex
CREATE INDEX "NotificationSource_userId_idx" ON "NotificationSource"("userId");
