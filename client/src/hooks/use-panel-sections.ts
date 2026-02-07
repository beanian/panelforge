import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PanelSection {
  id: string;
  name: string;
  slug: string;
  buildStatus: string;
  componentCount: number;
}

export function usePanelSections() {
  return useQuery<PanelSection[]>({
    queryKey: ['panel-sections'],
    queryFn: () => api.get('/panel-sections'),
  });
}
