import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PowerBudgetComponent {
  instanceId: string;
  instanceName: string;
  componentTypeName: string;
  panelSectionId: string;
  panelSectionName: string;
  powerRail: string;
  typicalCurrentMa: number;
  standbyCurrentMa: number;
}

export interface PsuConfig {
  name: string;
  capacityWatts: number;
  converterEfficiency: number;
  notes: string | null;
}

export interface InfrastructureData {
  boardCount: number;
  mosfetBoardCount: number;
  estimatedBoardCurrentMa: number;
}

export interface MosfetChannel {
  channelNumber: number;
  pinAssignment: {
    pinNumber: string;
    componentName: string | null;
  } | null;
}

export interface MosfetBoardData {
  id: string;
  name: string;
  channelCount: number;
  usedChannels: number;
  freeChannels: number;
  channels: MosfetChannel[];
}

export interface PowerBudgetData {
  psuConfig: PsuConfig;
  components: PowerBudgetComponent[];
  infrastructure: InfrastructureData;
  mosfetBoards: MosfetBoardData[];
}

export function usePowerBudget() {
  return useQuery<PowerBudgetData>({
    queryKey: ['power-budget'],
    queryFn: () => api.get('/power-budget'),
  });
}

export function useUpdatePsuConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PsuConfig>) => api.patch('/power-budget/psu', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['power-budget'] }),
  });
}
