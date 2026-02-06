export interface MosfetBoard {
  id: string;
  name: string;
  channelCount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MosfetChannel {
  id: string;
  mosfetBoardId: string;
  channelNumber: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MosfetBoardWithChannels extends MosfetBoard {
  channels: (MosfetChannel & {
    pinAssignment: {
      id: string;
      pinNumber: string;
      componentInstance: { id: string; name: string } | null;
    } | null;
  })[];
  usedChannels: number;
  freeChannels: number;
}
