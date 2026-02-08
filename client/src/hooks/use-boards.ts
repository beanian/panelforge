import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Board {
  id: string;
  name: string;
  boardType: string;
  digitalPinCount: number;
  analogPinCount: number;
  pwmPins: number[];
  notes: string | null;
  pinAvailability: {
    digitalUsed: number;
    digitalFree: number;
    analogUsed: number;
    analogFree: number;
    pwmFree: number;
  };
}

export function useBoards() {
  return useQuery<Board[]>({
    queryKey: ['boards'],
    queryFn: () => api.get('/boards'),
  });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; notes?: string }) => api.post('/boards', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards'] }),
  });
}

export function useUpdateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; notes?: string }) =>
      api.patch(`/boards/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards'] }),
  });
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/boards/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards'] }),
  });
}
