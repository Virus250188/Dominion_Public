-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "glassAccent" TEXT;
ALTER TABLE "UserSettings" ADD COLUMN "textPrimary" TEXT;
ALTER TABLE "UserSettings" ADD COLUMN "textSecondary" TEXT;

-- Migrate backgroundType values (order matters: aurora→mesh BEFORE lines→aurora)
UPDATE "UserSettings" SET "backgroundType" = 'plasma' WHERE "backgroundType" = 'gradient';
UPDATE "UserSettings" SET "backgroundType" = 'mesh' WHERE "backgroundType" = 'aurora';
UPDATE "UserSettings" SET "backgroundType" = 'aurora' WHERE "backgroundType" = 'lines';
UPDATE "UserSettings" SET "backgroundType" = 'nebula' WHERE "backgroundType" = 'prism';
