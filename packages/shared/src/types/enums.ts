export enum PinMode {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
  PWM = 'PWM',
}

export enum PinType {
  DIGITAL = 'DIGITAL',
  ANALOG = 'ANALOG',
}

export enum PowerRail {
  FIVE_V = 'FIVE_V',
  NINE_V = 'NINE_V',
  TWENTY_SEVEN_V = 'TWENTY_SEVEN_V',
  NONE = 'NONE',
}

export enum WiringStatus {
  UNASSIGNED = 'UNASSIGNED',
  PLANNED = 'PLANNED',
  WIRED = 'WIRED',
  TESTED = 'TESTED',
  COMPLETE = 'COMPLETE',
}

export enum BuildStatus {
  NOT_ONBOARDED = 'NOT_ONBOARDED',
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  HAS_ISSUES = 'HAS_ISSUES',
}

export enum VariableType {
  SIMVAR = 'SIMVAR',
  LVAR = 'LVAR',
  HVAR = 'HVAR',
}

export enum MobiFlightEventType {
  INPUT_ACTION = 'INPUT_ACTION',
  OUTPUT_CONDITION = 'OUTPUT_CONDITION',
  STEPPER_GAUGE = 'STEPPER_GAUGE',
  LED_PWM = 'LED_PWM',
}
