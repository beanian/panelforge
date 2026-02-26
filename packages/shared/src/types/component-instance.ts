import type { BuildStatus, PowerRail } from './enums';
import type { ComponentType } from './component-type';
import type { PanelSection } from './panel-section';
import type { PinAssignment } from './pin-assignment';

export interface ComponentInstance {
  id: string;
  name: string;
  componentTypeId: string;
  panelSectionId: string;
  buildStatus: BuildStatus;
  powerRail: PowerRail | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentInstanceWithDetails extends ComponentInstance {
  componentType: ComponentType;
  panelSection: PanelSection;
  pinAssignments: PinAssignment[];
}
