export function makeBoard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'board-1',
    name: 'Arduino Mega #1',
    boardType: 'Arduino Mega 2560',
    digitalPinCount: 54,
    analogPinCount: 16,
    pwmPins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    notes: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function makeComponentType(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ct-1',
    name: 'Toggle Switch',
    description: 'A standard toggle switch',
    defaultPinCount: 1,
    pinLabels: ['Signal'],
    pinTypes: ['DIGITAL'] as string[],
    defaultPowerRail: 'FIVE_V' as const,
    defaultPinMode: 'INPUT' as const,
    pwmRequired: false,
    mobiFlightTemplate: null,
    notes: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function makePanelSection(overrides: Record<string, unknown> = {}) {
  return {
    id: 'section-1',
    name: 'Overhead Panel Left',
    slug: 'overhead-panel-left',
    widthMm: null,
    heightMm: null,
    dzusSizes: null,
    dimensionNotes: null,
    buildStatus: 'PLANNED' as const,
    onboardedAt: null,
    sourceMsn: null,
    aircraftVariant: null,
    registration: null,
    lineageNotes: null,
    lineageUrls: [],
    svgX: null,
    svgY: null,
    svgWidth: null,
    svgHeight: null,
    sortOrder: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function makeComponentInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ci-1',
    name: 'ENG 1 Fire Switch',
    componentTypeId: 'ct-1',
    panelSectionId: 'section-1',
    buildStatus: 'PLANNED' as const,
    powerRail: null,
    notes: null,
    sortOrder: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function makePinAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pin-1',
    boardId: 'board-1',
    pinNumber: 'D2',
    pinType: 'DIGITAL' as const,
    pinMode: 'INPUT' as const,
    componentInstanceId: 'ci-1',
    description: null,
    powerRail: 'FIVE_V' as const,
    wiringStatus: 'PLANNED' as const,
    notes: null,
    mosfetChannelId: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}
