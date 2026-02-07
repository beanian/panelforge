import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

interface WiringPin {
  pinAssignmentId: string;
  pinNumber: string;
  boardName: string;
  boardId: string;
  pinMode: string;
  pinType: string;
  powerRail: string;
  wiringStatus: string;
  mosfetChannel: {
    boardName: string;
    channelNumber: number;
  } | null;
}

interface WiringComponent {
  id: string;
  name: string;
  typeName: string;
  pins: WiringPin[];
}

interface WiringDiagramResult {
  sectionId: string;
  sectionName: string;
  components: WiringComponent[];
}

export const wiringService = {
  async getDiagram(sectionId: string): Promise<WiringDiagramResult> {
    const section = await prisma.panelSection.findUnique({
      where: { id: sectionId },
      include: {
        componentInstances: {
          include: {
            componentType: true,
            pinAssignments: {
              include: {
                board: true,
                mosfetChannel: {
                  include: { mosfetBoard: true },
                },
              },
              orderBy: { pinNumber: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!section) {
      throw new AppError(404, 'Panel section not found');
    }

    const components: WiringComponent[] = section.componentInstances.map((instance) => ({
      id: instance.id,
      name: instance.name,
      typeName: instance.componentType.name,
      pins: instance.pinAssignments.map((pin) => ({
        pinAssignmentId: pin.id,
        pinNumber: pin.pinNumber,
        boardName: pin.board.name,
        boardId: pin.boardId,
        pinMode: pin.pinMode,
        pinType: pin.pinType,
        powerRail: pin.powerRail,
        wiringStatus: pin.wiringStatus,
        mosfetChannel: pin.mosfetChannel
          ? {
              boardName: pin.mosfetChannel.mosfetBoard.name,
              channelNumber: pin.mosfetChannel.channelNumber,
            }
          : null,
      })),
    }));

    return {
      sectionId: section.id,
      sectionName: section.name,
      components,
    };
  },
};
