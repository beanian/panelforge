import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ComponentType {
  id: string;
  name: string;
  description: string | null;
  defaultPinCount: number;
  pinTypesRequired: string[];
  defaultPowerRail: string;
  defaultPinMode: string;
  pwmRequired: boolean;
  mobiFlightTemplate: unknown | null;
  notes: string | null;
  _count?: { componentInstances: number };
}

export function useComponentTypes() {
  return useQuery<ComponentType[]>({
    queryKey: ['component-types'],
    queryFn: () => api.get('/component-types'),
  });
}

export function useCreateComponentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ComponentType>) => api.post('/component-types', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['component-types'] }),
  });
}

export function useUpdateComponentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<ComponentType>) =>
      api.patch(`/component-types/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['component-types'] }),
  });
}

export function useDeleteComponentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/component-types/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['component-types'] }),
  });
}
