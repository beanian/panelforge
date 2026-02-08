-- AlterTable: replace pinTypesRequired (PinType enum array) with pinTypes (String array, per-pin)
ALTER TABLE "ComponentType" ADD COLUMN "pinTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data: convert enum values to strings
UPDATE "ComponentType" SET "pinTypes" = "pinTypesRequired"::TEXT[];

-- Drop old column
ALTER TABLE "ComponentType" DROP COLUMN "pinTypesRequired";
