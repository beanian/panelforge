import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MosfetChannel {
  id: string;
  channelNumber: number;
  pinAssignment: {
    id: string;
    pinNumber: string;
    description: string | null;
    board: { id: string; name: string };
  } | null;
}

export interface MosfetBoard {
  id: string;
  name: string;
  channelCount: number;
  notes: string | null;
  channels: MosfetChannel[];
  usedChannels: number;
  freeChannels: number;
}

export function useMosfetBoards() {
  return useQuery<MosfetBoard[]>({
    queryKey: ['mosfet-boards'],
    queryFn: () => api.get('/mosfet-boards'),
  });
}

export function useCreateMosfetBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; channelCount?: number; notes?: string }) =>
      api.post('/mosfet-boards', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mosfet-boards'] }),
  });
}

export function useUpdateMosfetBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; notes?: string }) =>
      api.patch(`/mosfet-boards/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mosfet-boards'] }),
  });
}

export function useDeleteMosfetBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/mosfet-boards/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mosfet-boards'] }),
  });
}
