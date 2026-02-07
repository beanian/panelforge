import { describe, it, expect } from 'vitest';
import {
  createBoardSchema,
  createComponentTypeSchema,
  createPinAssignmentSchema,
  bulkUpdatePinAssignmentSchema,
  createJournalEntrySchema,
  createMosfetBoardSchema,
  createMobiFlightMappingSchema,
  updatePanelSectionSchema,
  pinAssignmentFiltersSchema,
  createComponentInstanceSchema,
  updateComponentInstanceSchema,
  updatePinAssignmentSchema,
} from './index';

describe('createBoardSchema', () => {
  it('accepts valid input', () => {
    const result = createBoardSchema.safeParse({ name: 'Board 1' });
    expect(result.success).toBe(true);
  });

  it('applies default boardType', () => {
    const result = createBoardSchema.parse({ name: 'Board 1' });
    expect(result.boardType).toBe('Arduino Mega 2560');
  });

  it('rejects empty name', () => {
    const result = createBoardSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 50 chars', () => {
    const result = createBoardSchema.safeParse({ name: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe('createComponentTypeSchema', () => {
  const valid = {
    name: 'Toggle Switch',
    defaultPinCount: 1,
    pinTypesRequired: ['DIGITAL'],
  };

  it('accepts valid input with defaults', () => {
    const result = createComponentTypeSchema.parse(valid);
    expect(result.defaultPowerRail).toBe('NONE');
    expect(result.defaultPinMode).toBe('INPUT');
    expect(result.pwmRequired).toBe(false);
  });

  it('validates pinTypesRequired enum', () => {
    const result = createComponentTypeSchema.safeParse({
      ...valid,
      pinTypesRequired: ['INVALID'],
    });
    expect(result.success).toBe(false);
  });

  it('requires at least one pinTypesRequired', () => {
    const result = createComponentTypeSchema.safeParse({
      ...valid,
      pinTypesRequired: [],
    });
    expect(result.success).toBe(false);
  });

  it('validates defaultPinCount is positive integer', () => {
    const bad1 = createComponentTypeSchema.safeParse({ ...valid, defaultPinCount: 0 });
    const bad2 = createComponentTypeSchema.safeParse({ ...valid, defaultPinCount: 1.5 });
    expect(bad1.success).toBe(false);
    expect(bad2.success).toBe(false);
  });
});

describe('createPinAssignmentSchema', () => {
  const valid = {
    boardId: 'board-1',
    pinNumber: 'D2',
    pinType: 'DIGITAL',
  };

  it('accepts valid digital pin', () => {
    const result = createPinAssignmentSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts valid analog pin', () => {
    const result = createPinAssignmentSchema.safeParse({
      ...valid,
      pinNumber: 'A15',
      pinType: 'ANALOG',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid pin format', () => {
    const invalid = ['X1', '2D', 'D', 'A', 'DD2', 'A-1', 'D100', 'a5'];
    for (const pin of invalid) {
      const result = createPinAssignmentSchema.safeParse({ ...valid, pinNumber: pin });
      expect(result.success, `Expected ${pin} to be rejected`).toBe(false);
    }
  });

  it('accepts pins matching D0-D99 and A0-A99 format', () => {
    expect(createPinAssignmentSchema.safeParse({ ...valid, pinNumber: 'D0' }).success).toBe(true);
    expect(createPinAssignmentSchema.safeParse({ ...valid, pinNumber: 'D53' }).success).toBe(true);
    expect(createPinAssignmentSchema.safeParse({ ...valid, pinNumber: 'A0' }).success).toBe(true);
  });

  it('applies default pinMode and powerRail', () => {
    const result = createPinAssignmentSchema.parse(valid);
    expect(result.pinMode).toBe('INPUT');
    expect(result.powerRail).toBe('NONE');
  });

  it('validates pinType enum', () => {
    const result = createPinAssignmentSchema.safeParse({ ...valid, pinType: 'PWM' });
    expect(result.success).toBe(false);
  });
});

describe('bulkUpdatePinAssignmentSchema', () => {
  it('accepts valid bulk update', () => {
    const result = bulkUpdatePinAssignmentSchema.safeParse({
      ids: ['id-1', 'id-2'],
      data: { wiringStatus: 'WIRED' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty ids array', () => {
    const result = bulkUpdatePinAssignmentSchema.safeParse({
      ids: [],
      data: { wiringStatus: 'WIRED' },
    });
    expect(result.success).toBe(false);
  });

  it('validates wiringStatus enum', () => {
    const result = bulkUpdatePinAssignmentSchema.safeParse({
      ids: ['id-1'],
      data: { wiringStatus: 'INVALID' },
    });
    expect(result.success).toBe(false);
  });
});

describe('createJournalEntrySchema', () => {
  it('accepts valid entry', () => {
    const result = createJournalEntrySchema.safeParse({
      title: 'Test Entry',
      body: 'Some content',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createJournalEntrySchema.safeParse({ title: '', body: 'content' });
    expect(result.success).toBe(false);
  });

  it('rejects empty body', () => {
    const result = createJournalEntrySchema.safeParse({ title: 'Title', body: '' });
    expect(result.success).toBe(false);
  });

  it('allows optional panelSectionId and componentInstanceId', () => {
    const result = createJournalEntrySchema.parse({
      title: 'Title',
      body: 'Body',
      panelSectionId: 'sec-1',
      componentInstanceId: 'ci-1',
    });
    expect(result.panelSectionId).toBe('sec-1');
  });
});

describe('createMosfetBoardSchema', () => {
  it('accepts valid input with defaults', () => {
    const result = createMosfetBoardSchema.parse({ name: 'MOSFET #1' });
    expect(result.channelCount).toBe(16);
  });

  it('rejects empty name', () => {
    const result = createMosfetBoardSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('validates channelCount range', () => {
    const tooLow = createMosfetBoardSchema.safeParse({ name: 'M', channelCount: 0 });
    const tooHigh = createMosfetBoardSchema.safeParse({ name: 'M', channelCount: 65 });
    expect(tooLow.success).toBe(false);
    expect(tooHigh.success).toBe(false);
  });
});

describe('createMobiFlightMappingSchema', () => {
  const valid = {
    pinAssignmentId: 'pin-1',
    variableName: 'A:ENG1_FIRE',
  };

  it('accepts valid mapping with defaults', () => {
    const result = createMobiFlightMappingSchema.parse(valid);
    expect(result.variableType).toBe('LVAR');
    expect(result.eventType).toBe('INPUT_ACTION');
  });

  it('validates variableType enum', () => {
    const result = createMobiFlightMappingSchema.safeParse({
      ...valid,
      variableType: 'UNKNOWN',
    });
    expect(result.success).toBe(false);
  });

  it('validates eventType enum', () => {
    const result = createMobiFlightMappingSchema.safeParse({
      ...valid,
      eventType: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});

describe('updatePanelSectionSchema', () => {
  it('accepts valid partial update', () => {
    const result = updatePanelSectionSchema.safeParse({
      buildStatus: 'IN_PROGRESS',
    });
    expect(result.success).toBe(true);
  });

  it('validates buildStatus enum', () => {
    const result = updatePanelSectionSchema.safeParse({
      buildStatus: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('validates lineageUrls are valid URLs', () => {
    const result = updatePanelSectionSchema.safeParse({
      lineageUrls: ['not-a-url'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid lineageUrls', () => {
    const result = updatePanelSectionSchema.safeParse({
      lineageUrls: ['https://example.com/photo.jpg'],
    });
    expect(result.success).toBe(true);
  });
});

describe('pinAssignmentFiltersSchema', () => {
  it('accepts empty filters', () => {
    const result = pinAssignmentFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts all valid filter combinations', () => {
    const result = pinAssignmentFiltersSchema.safeParse({
      boardId: 'board-1',
      powerRail: 'FIVE_V',
      wiringStatus: 'PLANNED',
      assigned: 'true',
      search: 'fire',
    });
    expect(result.success).toBe(true);
  });

  it('validates powerRail enum', () => {
    const result = pinAssignmentFiltersSchema.safeParse({ powerRail: 'TWELVE_V' });
    expect(result.success).toBe(false);
  });
});

describe('createComponentInstanceSchema', () => {
  it('accepts valid input', () => {
    const result = createComponentInstanceSchema.safeParse({
      name: 'ENG1 Fire Switch',
      componentTypeId: 'ct-1',
      panelSectionId: 'sec-1',
    });
    expect(result.success).toBe(true);
  });

  it('applies default sortOrder', () => {
    const result = createComponentInstanceSchema.parse({
      name: 'Switch',
      componentTypeId: 'ct-1',
      panelSectionId: 'sec-1',
    });
    expect(result.sortOrder).toBe(0);
  });
});

describe('updateComponentInstanceSchema', () => {
  it('accepts valid buildStatus', () => {
    const result = updateComponentInstanceSchema.safeParse({
      buildStatus: 'COMPLETE',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid buildStatus', () => {
    const result = updateComponentInstanceSchema.safeParse({
      buildStatus: 'DONE',
    });
    expect(result.success).toBe(false);
  });
});

describe('updatePinAssignmentSchema', () => {
  it('accepts valid partial update', () => {
    const result = updatePinAssignmentSchema.safeParse({
      wiringStatus: 'TESTED',
      pinMode: 'PWM',
    });
    expect(result.success).toBe(true);
  });

  it('allows nullable componentInstanceId', () => {
    const result = updatePinAssignmentSchema.safeParse({
      componentInstanceId: null,
    });
    expect(result.success).toBe(true);
  });
});
