-- AlterTable: Add current draw columns
ALTER TABLE "ComponentType" ADD COLUMN IF NOT EXISTS "typicalCurrentMa" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ComponentType" ADD COLUMN IF NOT EXISTS "standbyCurrentMa" INTEGER NOT NULL DEFAULT 0;
