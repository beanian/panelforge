import { z } from 'zod';

// ─── Board ──────────────────────────────────────────────

export const createBoardSchema = z.object({
  name: z.string().min(1).max(50),
  boardType: z.string().default('Arduino Mega 2560'),
  notes: z.string().nullable().optional(),
});

export const updateBoardSchema = createBoardSchema.partial();

// ─── Component Type ─────────────────────────────────────

export const createComponentTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  defaultPinCount: z.number().int().min(1).max(20),
  pinLabels: z.array(z.string().max(50)).default([]),
  pinTypes: z.array(z.enum(['DIGITAL', 'ANALOG', 'ANY'])).default([]),
  pinPowerRails: z.array(z.enum(['FIVE_V', 'NINE_V', 'TWENTY_SEVEN_V', 'NONE'])).default([]),
  pinMosfetRequired: z.array(z.boolean()).default([]),
  defaultPinMode: z.enum(['INPUT', 'OUTPUT', 'PWM']).default('INPUT'),
  pwmRequired: z.boolean().default(false),
  typicalCurrentMa: z.number().int().min(0).default(0),
  standbyCurrentMa: z.number().int().min(0).default(0),
  mobiFlightTemplate: z.unknown().optional(),
  notes: z.string().nullable().optional(),
});

export const updateComponentTypeSchema = createComponentTypeSchema.partial();

// ─── Component Instance ─────────────────────────────────

export const createComponentInstanceSchema = z.object({
  name: z.string().min(1).max(200),
  componentTypeId: z.string().min(1),
  panelSectionId: z.string().min(1),
  powerRail: z.enum(['FIVE_V', 'NINE_V', 'TWENTY_SEVEN_V', 'NONE']).optional(),
  notes: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  mapX: z.number().min(0).max(100).optional(),
  mapY: z.number().min(0).max(100).optional(),
  mapWidth: z.number().min(0).max(100).optional(),
  mapHeight: z.number().min(0).max(100).optional(),
});

export const updateComponentInstanceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  buildStatus: z
    .enum(['NOT_ONBOARDED', 'PLANNED', 'IN_PROGRESS', 'COMPLETE', 'HAS_ISSUES'])
    .optional(),
  powerRail: z.enum(['FIVE_V', 'NINE_V', 'TWENTY_SEVEN_V', 'NONE']).optional(),
  notes: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  mapX: z.number().min(0).max(100).nullable().optional(),
  mapY: z.number().min(0).max(100).nullable().optional(),
  mapWidth: z.number().min(0).max(100).nullable().optional(),
  mapHeight: z.number().min(0).max(100).nullable().optional(),
});

// ─── Pin Assignment ─────────────────────────────────────

export const createPinAssignmentSchema = z.object({
  boardId: z.string().min(1),
  pinNumber: z.string().regex(/^(D\d{1,2}|A\d{1,2})$/, 'Pin must be D0-D53 or A0-A15'),
  pinType: z.enum(['DIGITAL', 'ANALOG']),
  pinMode: z.enum(['INPUT', 'OUTPUT', 'PWM']).default('INPUT'),
  componentInstanceId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  powerRail: z.enum(['FIVE_V', 'NINE_V', 'TWENTY_SEVEN_V', 'NONE']).default('NONE'),
  notes: z.string().nullable().optional(),
});

export const updatePinAssignmentSchema = z.object({
  pinMode: z.enum(['INPUT', 'OUTPUT', 'PWM']).optional(),
  componentInstanceId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  powerRail: z.enum(['FIVE_V', 'NINE_V', 'TWENTY_SEVEN_V', 'NONE']).optional(),
  wiringStatus: z.enum(['UNASSIGNED', 'PLANNED', 'WIRED', 'TESTED', 'COMPLETE']).optional(),
  notes: z.string().nullable().optional(),
  mosfetChannelId: z.string().nullable().optional(),
});

export const bulkUpdatePinAssignmentSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  data: z.object({
    wiringStatus: z.enum(['UNASSIGNED', 'PLANNED', 'WIRED', 'TESTED', 'COMPLETE']).optional(),
    powerRail: z.enum(['FIVE_V', 'NINE_V', 'TWENTY_SEVEN_V', 'NONE']).optional(),
  }),
});

// ─── Panel Section ──────────────────────────────────────

export const createPanelSectionSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  widthMm: z.number().positive().nullable().optional(),
  heightMm: z.number().positive().nullable().optional(),
  dzusSizes: z.string().nullable().optional(),
  dimensionNotes: z.string().nullable().optional(),
  sourceMsn: z.string().nullable().optional(),
  owned: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const updatePanelSectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  widthMm: z.number().positive().nullable().optional(),
  heightMm: z.number().positive().nullable().optional(),
  dzusSizes: z.string().nullable().optional(),
  owned: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  buildStatus: z
    .enum(['NOT_ONBOARDED', 'PLANNED', 'IN_PROGRESS', 'COMPLETE', 'HAS_ISSUES'])
    .optional(),
  sourceMsn: z.string().nullable().optional(),
  aircraftVariant: z.string().nullable().optional(),
  registration: z.string().nullable().optional(),
  lineageNotes: z.string().nullable().optional(),
  lineageUrls: z.array(z.string().url()).optional(),
  dimensionNotes: z.string().nullable().optional(),
  svgX: z.number().min(0).max(100).nullable().optional(),
  svgY: z.number().min(0).max(100).nullable().optional(),
  svgWidth: z.number().min(0).max(100).nullable().optional(),
  svgHeight: z.number().min(0).max(100).nullable().optional(),
});

// ─── MOSFET Board ───────────────────────────────────────

export const createMosfetBoardSchema = z.object({
  name: z.string().min(1).max(50),
  channelCount: z.number().int().min(1).max(64).default(8),
  notes: z.string().nullable().optional(),
});

export const updateMosfetBoardSchema = createMosfetBoardSchema.partial();

// ─── MobiFlight Mapping ─────────────────────────────────

export const createMobiFlightMappingSchema = z.object({
  pinAssignmentId: z.string().min(1),
  variableName: z.string().min(1),
  variableType: z.enum(['SIMVAR', 'LVAR', 'HVAR']).default('LVAR'),
  eventType: z
    .enum(['INPUT_ACTION', 'OUTPUT_CONDITION', 'STEPPER_GAUGE', 'LED_PWM'])
    .default('INPUT_ACTION'),
  configParams: z.unknown().optional(),
  notes: z.string().nullable().optional(),
});

export const updateMobiFlightMappingSchema = createMobiFlightMappingSchema
  .partial()
  .omit({ pinAssignmentId: true });

// ─── Journal Entry ──────────────────────────────────────

export const createJournalEntrySchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  panelSectionId: z.string().nullable().optional(),
  componentInstanceId: z.string().nullable().optional(),
});

export const updateJournalEntrySchema = createJournalEntrySchema.partial();

// ─── PSU Config ────────────────────────────────────────

export const updatePsuConfigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  capacityWatts: z.number().positive().max(5000).optional(),
  converterEfficiency: z.number().min(0.5).max(1.0).optional(),
  notes: z.string().nullable().optional(),
});

// ─── Query Filters ──────────────────────────────────────

export const pinAssignmentFiltersSchema = z.object({
  boardId: z.string().optional(),
  panelSectionId: z.string().optional(),
  powerRail: z.enum(['FIVE_V', 'NINE_V', 'TWENTY_SEVEN_V', 'NONE']).optional(),
  wiringStatus: z.enum(['UNASSIGNED', 'PLANNED', 'WIRED', 'TESTED', 'COMPLETE']).optional(),
  assigned: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
});
