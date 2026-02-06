export interface Board {
  id: string;
  name: string;
  boardType: string;
  digitalPinCount: number;
  analogPinCount: number;
  pwmPins: number[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardWithPinAvailability extends Board {
  pinAvailability: {
    digital: { total: number; used: number; free: number };
    analog: { total: number; used: number; free: number };
    pwmFree: number;
  };
}
