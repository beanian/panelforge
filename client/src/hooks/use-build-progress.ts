import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface BuildProgressSection {
  sectionId: string;
  sectionName: string;
  total: number;
  planned: number;
  inProgress: number;
  complete: number;
  hasIssues: number;
  percentage: number;
  pinStats: { wired: number; total: number };
}

export interface BuildProgressData {
  overall: { total: number; completed: number; percentage: number };
  sections: BuildProgressSection[];
}

export function useBuildProgress() {
  return useQuery<BuildProgressData>({
    queryKey: ['build-progress'],
    queryFn: () => api.get('/build-progress'),
  });
}

export function useUpdateComponentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/build-progress/component/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['build-progress'] });
      queryClient.invalidateQueries({ queryKey: ['panel-sections'] });
    },
  });
}
