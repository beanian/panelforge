import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PanelSection {
  id: string;
  name: string;
  slug: string;
  buildStatus: string;
  componentCount: number;
}

export interface PanelSectionDetail {
  id: string;
  name: string;
  slug: string;
  widthMm: number | null;
  heightMm: number | null;
  dzusSizes: string | null;
  dimensionNotes: string | null;
  buildStatus: string;
  onboardedAt: string | null;
  sourceMsn: string | null;
  aircraftVariant: string | null;
  registration: string | null;
  lineageNotes: string | null;
  lineageUrls: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  pinCount: number;
  powerBreakdown: Record<string, number>;
  componentInstances: ComponentInstanceDetail[];
}

export interface ComponentInstanceDetail {
  id: string;
  name: string;
  buildStatus: string;
  powerRail: string | null;
  notes: string | null;
  sortOrder: number;
  componentType: {
    id: string;
    name: string;
    description: string | null;
    defaultPinCount: number;
    defaultPowerRail: string;
    defaultPinMode: string;
  };
  pinAssignments: {
    id: string;
    pinType: string;
    powerRail: string;
  }[];
}

export function usePanelSections() {
  return useQuery<PanelSection[]>({
    queryKey: ['panel-sections'],
    queryFn: () => api.get('/panel-sections'),
  });
}

export function usePanelSection(id: string | null) {
  return useQuery<PanelSectionDetail>({
    queryKey: ['panel-sections', id],
    queryFn: () => api.get(`/panel-sections/${id}`),
    enabled: !!id,
  });
}
