export const PinMode = {
  INPUT: 'INPUT',
  OUTPUT: 'OUTPUT',
  PWM: 'PWM',
} as const;
export type PinMode = (typeof PinMode)[keyof typeof PinMode];

export const PinType = {
  DIGITAL: 'DIGITAL',
  ANALOG: 'ANALOG',
} as const;
export type PinType = (typeof PinType)[keyof typeof PinType];

export const PowerRail = {
  FIVE_V: 'FIVE_V',
  NINE_V: 'NINE_V',
  TWENTY_SEVEN_V: 'TWENTY_SEVEN_V',
  NONE: 'NONE',
} as const;
export type PowerRail = (typeof PowerRail)[keyof typeof PowerRail];

export const WiringStatus = {
  UNASSIGNED: 'UNASSIGNED',
  PLANNED: 'PLANNED',
  WIRED: 'WIRED',
  TESTED: 'TESTED',
  COMPLETE: 'COMPLETE',
} as const;
export type WiringStatus = (typeof WiringStatus)[keyof typeof WiringStatus];

export const BuildStatus = {
  NOT_ONBOARDED: 'NOT_ONBOARDED',
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
  HAS_ISSUES: 'HAS_ISSUES',
} as const;
export type BuildStatus = (typeof BuildStatus)[keyof typeof BuildStatus];

export const VariableType = {
  SIMVAR: 'SIMVAR',
  LVAR: 'LVAR',
  HVAR: 'HVAR',
} as const;
export type VariableType = (typeof VariableType)[keyof typeof VariableType];

export const MobiFlightEventType = {
  INPUT_ACTION: 'INPUT_ACTION',
  OUTPUT_CONDITION: 'OUTPUT_CONDITION',
  STEPPER_GAUGE: 'STEPPER_GAUGE',
  LED_PWM: 'LED_PWM',
} as const;
export type MobiFlightEventType = (typeof MobiFlightEventType)[keyof typeof MobiFlightEventType];
