import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface CreateComponentInstanceData {
  name: string;
  componentTypeId: string;
  panelSectionId: string;
  powerRail?: string;
  notes?: string;
  sortOrder?: number;
  mapX?: number;
  mapY?: number;
  mapWidth?: number;
  mapHeight?: number;
}

export function useCreateComponentInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateComponentInstanceData) =>
      api.post('/component-instances', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-sections'] });
      queryClient.invalidateQueries({ queryKey: ['component-instances'] });
      queryClient.invalidateQueries({ queryKey: ['component-instances', 'map-data'] });
    },
  });
}

export function useDeleteComponentInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/component-instances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-sections'] });
      queryClient.invalidateQueries({ queryKey: ['component-instances'] });
      queryClient.invalidateQueries({ queryKey: ['component-instances', 'map-data'] });
      queryClient.invalidateQueries({ queryKey: ['pin-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}
