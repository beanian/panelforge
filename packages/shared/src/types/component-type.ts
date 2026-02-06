import { PinMode, PinType, PowerRail } from './enums';

export interface ComponentType {
  id: string;
  name: string;
  description: string | null;
  defaultPinCount: number;
  pinTypesRequired: PinType[];
  defaultPowerRail: PowerRail;
  defaultPinMode: PinMode;
  pwmRequired: boolean;
  mobiFlightTemplate: unknown | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentTypeWithUsage extends ComponentType {
  usageCount: number;
}
