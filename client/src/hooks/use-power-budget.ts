import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PowerRailData {
  rail: string;
  label: string;
  totalConnections: number;
  bySection: Array<{ sectionId: string; sectionName: string; count: number }>;
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
  rails: PowerRailData[];
  mosfetBoards: MosfetBoardData[];
}

export function usePowerBudget() {
  return useQuery<PowerBudgetData>({
    queryKey: ['power-budget'],
    queryFn: () => api.get('/power-budget'),
  });
}
