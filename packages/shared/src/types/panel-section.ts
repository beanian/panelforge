import { BuildStatus, PowerRail } from './enums';

export interface PanelSection {
  id: string;
  name: string;
  slug: string;
  widthMm: number | null;
  heightMm: number | null;
  dzusSizes: string | null;
  dimensionNotes: string | null;
  buildStatus: BuildStatus;
  onboardedAt: string | null;
  sourceMsn: string | null;
  aircraftVariant: string | null;
  registration: string | null;
  lineageNotes: string | null;
  lineageUrls: string[];
  svgX: number | null;
  svgY: number | null;
  svgWidth: number | null;
  svgHeight: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PanelSectionSummary extends PanelSection {
  componentCount: number;
  pinUsage: { assigned: number; total: number };
  powerBreakdown: Record<PowerRail, number>;
  buildProgress: number;
}
