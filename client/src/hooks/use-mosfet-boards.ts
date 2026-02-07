import { useQuery } from '@tanstack/react-query';
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
