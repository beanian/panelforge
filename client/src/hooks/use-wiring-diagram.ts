import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MosfetChannelInfo {
  boardName: string;
  channelNumber: number;
}

export interface WiringPin {
  pinAssignmentId: string;
  pinNumber: string;
  boardName: string;
  boardId: string;
  pinMode: string;
  pinType: string;
  powerRail: string;
  wiringStatus: string;
  mosfetChannel: MosfetChannelInfo | null;
}

export interface WiringComponent {
  id: string;
  name: string;
  typeName: string;
  pins: WiringPin[];
}

export interface WiringDiagramData {
  sectionId: string;
  sectionName: string;
  components: WiringComponent[];
}

export function useWiringDiagram(sectionId: string | null) {
  return useQuery<WiringDiagramData>({
    queryKey: ['wiring-diagram', sectionId],
    queryFn: () => api.get(`/wiring-diagram/${sectionId}`),
    enabled: !!sectionId,
  });
}
