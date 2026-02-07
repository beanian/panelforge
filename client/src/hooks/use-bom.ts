import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface BomComponent {
  componentInstanceId: string;
  name: string;
  typeName: string;
  pinsNeeded: number;
  pinMode: string;
  pinType: string;
  pwmRequired: boolean;
  powerRail: string;
  allocations: Array<{
    boardId: string;
    boardName: string;
    pins: string[];
  }>;
}

export interface BomCalculateResult {
  sectionId: string;
  sectionName: string;
  components: BomComponent[];
  newBoardsNeeded: number;
  mosfetChannelsNeeded: number;
  mosfetChannelsAvailable: number;
}

export interface BomApplyResult {
  sectionId: string;
  sectionName: string;
  totalPinsCreated: number;
  assignments: Array<{
    componentInstanceId: string;
    componentName: string;
    boardId: string;
    boardName: string;
    pinNumber: string;
  }>;
}

export function useBomCalculate() {
  return useMutation<BomCalculateResult, Error, { sectionId: string }>({
    mutationFn: (data) => api.post('/bom/calculate', data),
  });
}

export function useBomApply() {
  const queryClient = useQueryClient();
  return useMutation<BomApplyResult, Error, BomCalculateResult>({
    mutationFn: (data) => api.post('/bom/apply', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pin-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}
