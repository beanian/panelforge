import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PinAssignment {
  id: string;
  boardId: string;
  pinNumber: string;
  pinType: string;
  pinMode: string;
  componentInstanceId: string | null;
  description: string | null;
  powerRail: string;
  wiringStatus: string;
  notes: string | null;
  mosfetChannelId: string | null;
  board: { id: string; name: string };
  componentInstance: {
    id: string;
    name: string;
    panelSection: { id: string; name: string };
    componentType: { id: string; name: string };
  } | null;
  mobiFlightMapping: {
    id: string;
    variableName: string;
    variableType: string;
  } | null;
}

interface PinFilters {
  boardId?: string;
  panelSectionId?: string;
  powerRail?: string;
  wiringStatus?: string;
  assigned?: string;
  search?: string;
}

export function usePinAssignments(filters: PinFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const queryString = params.toString();
  return useQuery<PinAssignment[]>({
    queryKey: ['pin-assignments', filters],
    queryFn: () => api.get(`/pin-assignments${queryString ? `?${queryString}` : ''}`),
  });
}

export function useUpdatePinAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      api.patch(`/pin-assignments/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pin-assignments'] }),
  });
}

export function useBulkUpdatePinAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { ids: string[]; data: Record<string, string> }) =>
      api.patch('/pin-assignments/bulk', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pin-assignments'] }),
  });
}

export function useCreatePinAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/pin-assignments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pin-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}

export function useDeletePinAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pin-assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pin-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}
