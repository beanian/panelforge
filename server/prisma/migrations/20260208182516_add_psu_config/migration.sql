-- AlterTable
ALTER TABLE "ComponentType" ALTER COLUMN "pinTypes" DROP DEFAULT;

-- CreateTable
CREATE TABLE "PsuConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "name" TEXT NOT NULL DEFAULT 'Main PSU',
    "capacityWatts" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "converterEfficiency" DOUBLE PRECISION NOT NULL DEFAULT 0.87,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsuConfig_pkey" PRIMARY KEY ("id")
);
