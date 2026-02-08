// Pure power budget calculation engine — no React dependencies

export type ScenarioName = 'worst-case' | 'cold-dark' | 'cruise' | 'emergency' | 'custom';

export interface Scenario {
  name: ScenarioName;
  label: string;
  activationRules: {
    default: number;
    byTypeName?: Record<string, number>;
    byRail?: Record<string, number>;
  };
}

export interface PowerComponent {
  instanceId: string;
  instanceName: string;
  componentTypeName: string;
  panelSectionId: string;
  panelSectionName: string;
  powerRail: string;
  typicalCurrentMa: number;
  standbyCurrentMa: number;
}

// Rail voltages (actual supply voltages)
export const RAIL_VOLTAGES: Record<string, number> = {
  FIVE_V: 5,
  NINE_V: 9,
  TWENTY_SEVEN_V: 28,
};

// Built-in scenarios
export const SCENARIOS: Scenario[] = [
  {
    name: 'worst-case',
    label: 'Worst Case',
    activationRules: { default: 1.0 },
  },
  {
    name: 'cold-dark',
    label: 'Cold & Dark',
    activationRules: {
      default: 0,
      byRail: { FIVE_V: 1.0, NINE_V: 0, TWENTY_SEVEN_V: 0 },
    },
  },
  {
    name: 'cruise',
    label: 'Cruise',
    activationRules: {
      default: 0,
      byTypeName: {
        Gauge: 1.0,
        Annunciator: 0.1,
        'Illuminated Pushbutton': 1.0,
      },
    },
  },
  {
    name: 'emergency',
    label: 'Emergency',
    activationRules: {
      default: 0,
      byTypeName: {
        Gauge: 1.0,
        Annunciator: 0.8,
        'Illuminated Pushbutton': 1.0,
      },
    },
  },
];

/**
 * Get activation factor for a component under a given scenario.
 */
function getActivation(
  component: PowerComponent,
  scenario: Scenario,
  customToggles?: Record<string, boolean>,
): number {
  if (scenario.name === 'custom' && customToggles) {
    return customToggles[component.panelSectionId] ? 1.0 : 0;
  }

  const rules = scenario.activationRules;

  // Type-specific override takes priority
  if (rules.byTypeName && component.componentTypeName in rules.byTypeName) {
    return rules.byTypeName[component.componentTypeName];
  }

  // Rail-specific override
  if (rules.byRail && component.powerRail in rules.byRail) {
    return rules.byRail[component.powerRail];
  }

  return rules.default;
}

/**
 * Calculate total current draw per rail in mA.
 */
export function calculateRailCurrentMa(
  components: PowerComponent[],
  scenario: Scenario,
  customToggles?: Record<string, boolean>,
): Record<string, number> {
  const railCurrents: Record<string, number> = {};

  for (const comp of components) {
    if (comp.powerRail === 'NONE' || comp.typicalCurrentMa === 0) continue;

    const activation = getActivation(comp, scenario, customToggles);
    const currentMa = comp.typicalCurrentMa * activation;

    if (!railCurrents[comp.powerRail]) {
      railCurrents[comp.powerRail] = 0;
    }
    railCurrents[comp.powerRail] += currentMa;
  }

  return railCurrents;
}

export interface RailPowerDetail {
  watts: number;
  currentMa: number;
  voltage: number;
  psuDrawWatts: number;
}

export interface PsuDemandResult {
  totalWatts: number;
  perRail: Record<string, RailPowerDetail>;
}

/**
 * Calculate PSU demand in watts, accounting for converter efficiency losses.
 * 28V rail is direct (no converter loss), 9V and 5V go through step-down converter.
 */
export function calculatePsuDemandWatts(
  railCurrents: Record<string, number>,
  efficiency: number,
  infrastructureCurrentMa: number = 0,
): PsuDemandResult {
  const perRail: Record<string, RailPowerDetail> = {};
  let totalWatts = 0;

  for (const [rail, currentMa] of Object.entries(railCurrents)) {
    const voltage = RAIL_VOLTAGES[rail] ?? 0;
    const watts = (currentMa * voltage) / 1000;

    // 28V rail is direct from PSU, others go through step-down converter
    const psuDrawWatts = rail === 'TWENTY_SEVEN_V' ? watts : watts / efficiency;

    perRail[rail] = { watts, currentMa, voltage, psuDrawWatts };
    totalWatts += psuDrawWatts;
  }

  // Add infrastructure current (5V rail, through converter)
  if (infrastructureCurrentMa > 0) {
    const infraWatts = (infrastructureCurrentMa * 5) / 1000;
    const infraPsuWatts = infraWatts / efficiency;
    totalWatts += infraPsuWatts;
  }

  return { totalWatts, perRail };
}

export type UtilizationLevel = 'green' | 'amber' | 'red';

/**
 * Determine utilization color based on demand vs capacity.
 * green < 70%, amber 70-90%, red > 90%
 */
export function getUtilizationLevel(
  demandWatts: number,
  capacityWatts: number,
): UtilizationLevel {
  if (capacityWatts <= 0) return 'red';
  const ratio = demandWatts / capacityWatts;
  if (ratio > 0.9) return 'red';
  if (ratio >= 0.7) return 'amber';
  return 'green';
}
