-- CreateTable
CREATE TABLE "AircraftCache" (
    "id" TEXT NOT NULL,
    "msn" TEXT NOT NULL,
    "currentRegistration" TEXT,
    "icaoHex" TEXT,
    "icaoTypeCode" TEXT,
    "manufacturer" TEXT,
    "registeredOwners" TEXT,
    "operatorFlagCode" TEXT,
    "typeName" TEXT,
    "airlineName" TEXT,
    "builtDate" TEXT,
    "imageUrl" TEXT,
    "registrationHistory" JSONB,
    "photos" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fetchErrors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AircraftCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AircraftCache_msn_key" ON "AircraftCache"("msn");
