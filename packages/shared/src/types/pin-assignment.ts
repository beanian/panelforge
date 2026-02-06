import { PinMode, PinType, PowerRail, WiringStatus } from './enums';
import { MobiFlightMapping } from './mobiflight';

export interface PinAssignment {
  id: string;
  boardId: string;
  pinNumber: string;
  pinType: PinType;
  pinMode: PinMode;
  componentInstanceId: string | null;
  description: string | null;
  powerRail: PowerRail;
  wiringStatus: WiringStatus;
  notes: string | null;
  mosfetChannelId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PinAssignmentWithRelations extends PinAssignment {
  board: { id: string; name: string };
  componentInstance: {
    id: string;
    name: string;
    panelSection: { id: string; name: string };
    componentType: { id: string; name: string };
  } | null;
  mosfetChannel: {
    id: string;
    channelNumber: number;
    mosfetBoard: { id: string; name: string };
  } | null;
  mobiFlightMapping: MobiFlightMapping | null;
}
