import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MapComponent {
  id: string;
  name: string;
  buildStatus: string;
  powerRail: string | null;
  mapX: number;
  mapY: number;
  mapWidth: number;
  mapHeight: number;
  componentType: { name: string; defaultPinCount: number };
  panelSection: { id: string; name: string };
  _count: { pinAssignments: number };
}

export function useComponentMapData() {
  return useQuery<MapComponent[]>({
    queryKey: ['component-instances', 'map-data'],
    queryFn: () => api.get('/component-instances/map-data'),
  });
}
