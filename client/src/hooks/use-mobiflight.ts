import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MobiFlightDevice {
  pinNumber: string;
  deviceType: 'Button' | 'Output' | 'LedModule' | 'Stepper';
  name: string;
  variableName: string | null;
  variableType: string | null;
  eventType: string | null;
  configParams: unknown | null;
  pairedPin?: string;
}

export interface MobiFlightPreview {
  boardName: string;
  deviceCount: number;
  devices: MobiFlightDevice[];
}

export interface MobiFlightExport extends MobiFlightPreview {
  serialNumber: string;
}

export interface AutoAssignResult {
  assigned: { pinId: string; pinNumber: string; variableName: string }[];
  skipped: { pinId: string; pinNumber: string; reason: string }[];
  failed: { pinId: string; pinNumber: string; error: string }[];
}

export function useMobiFlightPreview(boardId: string | null) {
  return useQuery<MobiFlightPreview>({
    queryKey: ['mobiflight-preview', boardId],
    queryFn: () => api.get(`/mobiflight/preview/${boardId}`),
    enabled: !!boardId,
  });
}

export async function exportMobiFlightConfig(boardId: string, boardName: string) {
  const data = await api.get<MobiFlightExport>(`/mobiflight/export/${boardId}`);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${boardName}.mfmc`;
  a.click();
  URL.revokeObjectURL(url);
  return data;
}

export function useAutoAssignLvars() {
  const queryClient = useQueryClient();
  return useMutation<AutoAssignResult, Error, string>({
    mutationFn: (boardId: string) =>
      api.post(`/mobiflight/auto-assign/${boardId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobiflight-preview'] });
      queryClient.invalidateQueries({ queryKey: ['pin-assignments'] });
    },
  });
}
