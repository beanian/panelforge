import { describe, it, expect } from 'vitest';
import {
  calculateRailCurrentMa,
  calculatePsuDemandWatts,
  getUtilizationLevel,
  SCENARIOS,
  type PowerComponent,
  type Scenario,
} from './power-calc';

function makeComponent(overrides: Partial<PowerComponent> = {}): PowerComponent {
  return {
    instanceId: 'test-1',
    instanceName: 'Test',
    componentTypeName: 'Gauge',
    panelSectionId: 'sec-1',
    panelSectionName: 'Test Section',
    powerRail: 'NINE_V',
    typicalCurrentMa: 20,
    standbyCurrentMa: 0,
    ...overrides,
  };
}

const worstCase = SCENARIOS.find((s) => s.name === 'worst-case')!;
const coldDark = SCENARIOS.find((s) => s.name === 'cold-dark')!;
const cruise = SCENARIOS.find((s) => s.name === 'cruise')!;

const customScenario: Scenario = {
  name: 'custom',
  label: 'Custom',
  activationRules: { default: 0 },
};

describe('calculateRailCurrentMa', () => {
  it('returns empty for no components', () => {
    const result = calculateRailCurrentMa([], worstCase);
    expect(result).toEqual({});
  });

  it('sums current for single annunciator on worst-case', () => {
    const annunciator = makeComponent({
      componentTypeName: 'Annunciator',
      powerRail: 'TWENTY_SEVEN_V',
      typicalCurrentMa: 80,
    });
    const result = calculateRailCurrentMa([annunciator], worstCase);
    expect(result['TWENTY_SEVEN_V']).toBe(80);
  });

  it('applies cruise scenario — annunciators at 10%', () => {
    const annunciator = makeComponent({
      componentTypeName: 'Annunciator',
      powerRail: 'TWENTY_SEVEN_V',
      typicalCurrentMa: 80,
    });
    const result = calculateRailCurrentMa([annunciator], cruise);
    expect(result['TWENTY_SEVEN_V']).toBeCloseTo(8);
  });

  it('cold-dark: 9V and 28V rails are zero', () => {
    const components = [
      makeComponent({ powerRail: 'NINE_V', typicalCurrentMa: 20 }),
      makeComponent({
        instanceId: 'ann-1',
        componentTypeName: 'Annunciator',
        powerRail: 'TWENTY_SEVEN_V',
        typicalCurrentMa: 80,
      }),
      makeComponent({
        instanceId: 'led-1',
        componentTypeName: 'Illuminated Pushbutton',
        powerRail: 'FIVE_V',
        typicalCurrentMa: 25,
      }),
    ];
    const result = calculateRailCurrentMa(components, coldDark);
    expect(result['NINE_V'] ?? 0).toBe(0);
    expect(result['TWENTY_SEVEN_V'] ?? 0).toBe(0);
    expect(result['FIVE_V']).toBe(25);
  });

  it('custom scenario with section toggles', () => {
    const comp1 = makeComponent({ panelSectionId: 'sec-a', typicalCurrentMa: 20 });
    const comp2 = makeComponent({ instanceId: 'test-2', panelSectionId: 'sec-b', typicalCurrentMa: 30 });
    const toggles = { 'sec-a': true, 'sec-b': false };
    const result = calculateRailCurrentMa([comp1, comp2], customScenario, toggles);
    expect(result['NINE_V']).toBe(20);
  });
});

describe('calculatePsuDemandWatts', () => {
  it('returns 0W for empty rails', () => {
    const result = calculatePsuDemandWatts({}, 0.87);
    expect(result.totalWatts).toBe(0);
  });

  it('single annunciator worst-case — 28V direct, no converter loss', () => {
    const result = calculatePsuDemandWatts({ TWENTY_SEVEN_V: 80 }, 0.87);
    // 80mA × 28V = 2.24W, direct (no efficiency loss)
    expect(result.perRail['TWENTY_SEVEN_V'].psuDrawWatts).toBeCloseTo(2.24);
    expect(result.totalWatts).toBeCloseTo(2.24);
  });

  it('single gauge worst-case — 9V through converter', () => {
    const result = calculatePsuDemandWatts({ NINE_V: 20 }, 0.87);
    // 20mA × 9V / 1000 = 0.18W rail power, PSU draw = 0.18 / 0.87 ≈ 0.2069W
    expect(result.perRail['NINE_V'].psuDrawWatts).toBeCloseTo(0.18 / 0.87, 3);
    expect(result.totalWatts).toBeCloseTo(0.18 / 0.87, 3);
  });

  it('infrastructure current adds to total', () => {
    const result = calculatePsuDemandWatts({}, 0.87, 130);
    // 130mA × 5V / 1000 = 0.65W, PSU draw = 0.65 / 0.87 ≈ 0.747W
    expect(result.totalWatts).toBeCloseTo(0.65 / 0.87, 3);
  });
});

describe('getUtilizationLevel', () => {
  it('returns green below 70%', () => {
    expect(getUtilizationLevel(50, 350)).toBe('green');
    expect(getUtilizationLevel(244, 350)).toBe('green');
  });

  it('returns amber between 70% and 90%', () => {
    expect(getUtilizationLevel(245, 350)).toBe('amber');
    expect(getUtilizationLevel(314, 350)).toBe('amber');
  });

  it('returns red above 90%', () => {
    expect(getUtilizationLevel(316, 350)).toBe('red');
    expect(getUtilizationLevel(400, 350)).toBe('red');
  });

  it('returns red for zero capacity', () => {
    expect(getUtilizationLevel(10, 0)).toBe('red');
  });
});
