-- AlterTable: Add per-pin power rail and MOSFET arrays
ALTER TABLE "ComponentType" ADD COLUMN "pinPowerRails" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ComponentType" ADD COLUMN "pinMosfetRequired" BOOLEAN[] DEFAULT ARRAY[]::BOOLEAN[];

-- Backfill pinPowerRails from defaultPowerRail repeated × defaultPinCount
UPDATE "ComponentType"
SET "pinPowerRails" = array_fill("defaultPowerRail"::TEXT, ARRAY["defaultPinCount"]);

-- Backfill pinMosfetRequired from requiresMosfet repeated × defaultPinCount
UPDATE "ComponentType"
SET "pinMosfetRequired" = array_fill("requiresMosfet", ARRAY["defaultPinCount"]);

-- Drop old columns
ALTER TABLE "ComponentType" DROP COLUMN "defaultPowerRail";
ALTER TABLE "ComponentType" DROP COLUMN "requiresMosfet";
