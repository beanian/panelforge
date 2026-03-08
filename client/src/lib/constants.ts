export const MEGA_2560 = {
  digitalPins: Array.from({ length: 54 }, (_, i) => `D${i}`),
  analogPins: Array.from({ length: 16 }, (_, i) => `A${i}`),
  pwmPins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((n) => `D${n}`),
  reservedPins: ['D0', 'D1'],
};

export const NANO = {
  digitalPins: Array.from({ length: 14 }, (_, i) => `D${i}`),
  analogPins: Array.from({ length: 8 }, (_, i) => `A${i}`),
  pwmPins: [3, 5, 6, 9, 10, 11].map((n) => `D${n}`),
  reservedPins: ['D0', 'D1'],
};

export const BOARD_CONFIGS: Record<string, typeof MEGA_2560> = {
  'Arduino Mega 2560': MEGA_2560,
  'Arduino Nano': NANO,
};

export const BOARD_TYPE_OPTIONS = [
  { value: 'Arduino Mega 2560', label: 'Arduino Mega 2560', description: '54 digital, 16 analog pins' },
  { value: 'Arduino Nano', label: 'Arduino Nano', description: '14 digital, 8 analog pins' },
] as const;

export const POWER_RAIL_COLORS: Record<string, string> = {
  FIVE_V: 'bg-green-500',
  NINE_V: 'bg-blue-500',
  TWENTY_SEVEN_V: 'bg-amber-500',
  NONE: 'bg-gray-400',
};

export const POWER_RAIL_LABELS: Record<string, string> = {
  FIVE_V: '5V',
  NINE_V: '9V',
  TWENTY_SEVEN_V: '27V',
  NONE: 'None',
};

export const BUILD_STATUS_COLORS: Record<string, string> = {
  NOT_ONBOARDED: 'bg-gray-300',
  PLANNED: 'bg-slate-400',
  IN_PROGRESS: 'bg-amber-400',
  COMPLETE: 'bg-green-500',
  HAS_ISSUES: 'bg-red-500',
};
