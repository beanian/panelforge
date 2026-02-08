import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDebounce } from './use-debounce';

export interface LvarEntry {
  name: string;
  sectionCode: string;
  sectionLabel: string;
}

export interface LvarSection {
  code: string;
  label: string;
  count: number;
}

/** Search LVARs with debounce */
export function useLvarSearch(query: string) {
  const debouncedQuery = useDebounce(query, 200);
  return useQuery<LvarEntry[]>({
    queryKey: ['lvar-search', debouncedQuery],
    queryFn: () => api.get(`/lvars?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 2,
    placeholderData: (prev) => prev,
  });
}

/** Get suggestions for a specific pin */
export function useLvarSuggestions(pinAssignmentId: string | null) {
  return useQuery<LvarEntry[]>({
    queryKey: ['lvar-suggestions', pinAssignmentId],
    queryFn: () => api.get(`/lvars/suggest/${pinAssignmentId}`),
    enabled: !!pinAssignmentId,
    staleTime: 60_000,
  });
}

/** Upsert a MobiFlight mapping */
export function useUpsertMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pinAssignmentId,
      variableName,
      variableType,
      eventType,
    }: {
      pinAssignmentId: string;
      variableName: string;
      variableType?: string;
      eventType?: string;
    }) =>
      api.put(`/mobiflight/mapping/${pinAssignmentId}`, {
        variableName,
        variableType,
        eventType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pin-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['mobiflight-preview'] });
    },
  });
}

/** Delete a MobiFlight mapping */
export function useDeleteMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pinAssignmentId: string) =>
      api.delete(`/mobiflight/mapping/${pinAssignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pin-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['mobiflight-preview'] });
    },
  });
}
