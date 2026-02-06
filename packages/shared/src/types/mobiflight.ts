import { MobiFlightEventType, VariableType } from './enums';

export interface MobiFlightMapping {
  id: string;
  pinAssignmentId: string;
  variableName: string;
  variableType: VariableType;
  eventType: MobiFlightEventType;
  configParams: unknown | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
