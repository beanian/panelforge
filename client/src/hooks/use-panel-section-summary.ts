import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PanelSectionSummary {
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
  svgX: number | null;
  svgY: number | null;
  svgWidth: number | null;
  svgHeight: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  componentCount: number;
  pinUsage: { assigned: number; total: number };
  powerBreakdown: Record<string, number>;
  buildProgress: number;
}

export function usePanelSectionSummary() {
  return useQuery<PanelSectionSummary[]>({
    queryKey: ['panel-sections', 'summary'],
    queryFn: () => api.get('/panel-sections/summary'),
  });
}
