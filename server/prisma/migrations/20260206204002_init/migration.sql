-- CreateEnum
CREATE TYPE "PinMode" AS ENUM ('INPUT', 'OUTPUT', 'PWM');

-- CreateEnum
CREATE TYPE "PinType" AS ENUM ('DIGITAL', 'ANALOG');

-- CreateEnum
CREATE TYPE "PowerRail" AS ENUM ('FIVE_V', 'NINE_V', 'TWENTY_SEVEN_V', 'NONE');

-- CreateEnum
CREATE TYPE "WiringStatus" AS ENUM ('UNASSIGNED', 'PLANNED', 'WIRED', 'TESTED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "BuildStatus" AS ENUM ('NOT_ONBOARDED', 'PLANNED', 'IN_PROGRESS', 'COMPLETE', 'HAS_ISSUES');

-- CreateEnum
CREATE TYPE "VariableType" AS ENUM ('SIMVAR', 'LVAR', 'HVAR');

-- CreateEnum
CREATE TYPE "MobiFlightEventType" AS ENUM ('INPUT_ACTION', 'OUTPUT_CONDITION', 'STEPPER_GAUGE', 'LED_PWM');

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boardType" TEXT NOT NULL DEFAULT 'Arduino Mega 2560',
    "digitalPinCount" INTEGER NOT NULL DEFAULT 54,
    "analogPinCount" INTEGER NOT NULL DEFAULT 16,
    "pwmPins" INTEGER[] DEFAULT ARRAY[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 44, 45, 46]::INTEGER[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanelSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "widthMm" DOUBLE PRECISION,
    "heightMm" DOUBLE PRECISION,
    "dzusSizes" TEXT,
    "dimensionNotes" TEXT,
    "buildStatus" "BuildStatus" NOT NULL DEFAULT 'NOT_ONBOARDED',
    "onboardedAt" TIMESTAMP(3),
    "sourceMsn" TEXT,
    "aircraftVariant" TEXT,
    "registration" TEXT,
    "lineageNotes" TEXT,
    "lineageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "svgX" DOUBLE PRECISION,
    "svgY" DOUBLE PRECISION,
    "svgWidth" DOUBLE PRECISION,
    "svgHeight" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanelSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultPinCount" INTEGER NOT NULL,
    "pinTypesRequired" "PinType"[],
    "defaultPowerRail" "PowerRail" NOT NULL DEFAULT 'NONE',
    "defaultPinMode" "PinMode" NOT NULL DEFAULT 'INPUT',
    "pwmRequired" BOOLEAN NOT NULL DEFAULT false,
    "mobiFlightTemplate" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentInstance" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "componentTypeId" TEXT NOT NULL,
    "panelSectionId" TEXT NOT NULL,
    "buildStatus" "BuildStatus" NOT NULL DEFAULT 'PLANNED',
    "powerRail" "PowerRail",
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PinAssignment" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "pinNumber" TEXT NOT NULL,
    "pinType" "PinType" NOT NULL,
    "pinMode" "PinMode" NOT NULL DEFAULT 'INPUT',
    "componentInstanceId" TEXT,
    "description" TEXT,
    "powerRail" "PowerRail" NOT NULL DEFAULT 'NONE',
    "wiringStatus" "WiringStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "notes" TEXT,
    "mosfetChannelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PinAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MosfetBoard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channelCount" INTEGER NOT NULL DEFAULT 16,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MosfetBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MosfetChannel" (
    "id" TEXT NOT NULL,
    "mosfetBoardId" TEXT NOT NULL,
    "channelNumber" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MosfetChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobiFlightMapping" (
    "id" TEXT NOT NULL,
    "pinAssignmentId" TEXT NOT NULL,
    "variableName" TEXT NOT NULL,
    "variableType" "VariableType" NOT NULL DEFAULT 'LVAR',
    "eventType" "MobiFlightEventType" NOT NULL DEFAULT 'INPUT_ACTION',
    "configParams" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobiFlightMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "panelSectionId" TEXT,
    "componentInstanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Board_name_key" ON "Board"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PanelSection_name_key" ON "PanelSection"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PanelSection_slug_key" ON "PanelSection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentType_name_key" ON "ComponentType"("name");

-- CreateIndex
CREATE INDEX "ComponentInstance_panelSectionId_idx" ON "ComponentInstance"("panelSectionId");

-- CreateIndex
CREATE INDEX "ComponentInstance_componentTypeId_idx" ON "ComponentInstance"("componentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "PinAssignment_mosfetChannelId_key" ON "PinAssignment"("mosfetChannelId");

-- CreateIndex
CREATE INDEX "PinAssignment_componentInstanceId_idx" ON "PinAssignment"("componentInstanceId");

-- CreateIndex
CREATE INDEX "PinAssignment_boardId_idx" ON "PinAssignment"("boardId");

-- CreateIndex
CREATE INDEX "PinAssignment_powerRail_idx" ON "PinAssignment"("powerRail");

-- CreateIndex
CREATE INDEX "PinAssignment_wiringStatus_idx" ON "PinAssignment"("wiringStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PinAssignment_boardId_pinNumber_key" ON "PinAssignment"("boardId", "pinNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MosfetBoard_name_key" ON "MosfetBoard"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MosfetChannel_mosfetBoardId_channelNumber_key" ON "MosfetChannel"("mosfetBoardId", "channelNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MobiFlightMapping_pinAssignmentId_key" ON "MobiFlightMapping"("pinAssignmentId");

-- CreateIndex
CREATE INDEX "MobiFlightMapping_variableType_idx" ON "MobiFlightMapping"("variableType");

-- CreateIndex
CREATE INDEX "JournalEntry_panelSectionId_idx" ON "JournalEntry"("panelSectionId");

-- CreateIndex
CREATE INDEX "JournalEntry_componentInstanceId_idx" ON "JournalEntry"("componentInstanceId");

-- CreateIndex
CREATE INDEX "JournalEntry_createdAt_idx" ON "JournalEntry"("createdAt");

-- AddForeignKey
ALTER TABLE "ComponentInstance" ADD CONSTRAINT "ComponentInstance_componentTypeId_fkey" FOREIGN KEY ("componentTypeId") REFERENCES "ComponentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentInstance" ADD CONSTRAINT "ComponentInstance_panelSectionId_fkey" FOREIGN KEY ("panelSectionId") REFERENCES "PanelSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinAssignment" ADD CONSTRAINT "PinAssignment_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinAssignment" ADD CONSTRAINT "PinAssignment_componentInstanceId_fkey" FOREIGN KEY ("componentInstanceId") REFERENCES "ComponentInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinAssignment" ADD CONSTRAINT "PinAssignment_mosfetChannelId_fkey" FOREIGN KEY ("mosfetChannelId") REFERENCES "MosfetChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MosfetChannel" ADD CONSTRAINT "MosfetChannel_mosfetBoardId_fkey" FOREIGN KEY ("mosfetBoardId") REFERENCES "MosfetBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobiFlightMapping" ADD CONSTRAINT "MobiFlightMapping_pinAssignmentId_fkey" FOREIGN KEY ("pinAssignmentId") REFERENCES "PinAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_panelSectionId_fkey" FOREIGN KEY ("panelSectionId") REFERENCES "PanelSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_componentInstanceId_fkey" FOREIGN KEY ("componentInstanceId") REFERENCES "ComponentInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
