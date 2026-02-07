import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export const mosfetService = {
  async findAll() {
    const boards = await prisma.mosfetBoard.findMany({
      include: {
        channels: {
          include: {
            pinAssignment: {
              select: {
                id: true,
                pinNumber: true,
                description: true,
                board: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { channelNumber: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return boards.map((board) => {
      const usedChannels = board.channels.filter((ch) => ch.pinAssignment !== null).length;
      return {
        ...board,
        usedChannels,
        freeChannels: board.channelCount - usedChannels,
      };
    });
  },

  async findById(id: string) {
    const board = await prisma.mosfetBoard.findUnique({
      where: { id },
      include: {
        channels: {
          include: {
            pinAssignment: {
              include: {
                board: true,
                componentInstance: {
                  include: {
                    panelSection: true,
                    componentType: true,
                  },
                },
              },
            },
          },
          orderBy: { channelNumber: 'asc' },
        },
      },
    });

    if (!board) {
      throw new AppError(404, 'MOSFET board not found');
    }

    const usedChannels = board.channels.filter((ch) => ch.pinAssignment !== null).length;

    return {
      ...board,
      usedChannels,
      freeChannels: board.channelCount - usedChannels,
    };
  },

  async create(data: { name: string; channelCount?: number; notes?: string }) {
    const channelCount = data.channelCount ?? 16;

    return prisma.$transaction(async (tx) => {
      const board = await tx.mosfetBoard.create({
        data: {
          name: data.name,
          channelCount,
          notes: data.notes,
        },
      });

      // Create all channels for this board
      const channelData = Array.from({ length: channelCount }, (_, i) => ({
        mosfetBoardId: board.id,
        channelNumber: i + 1,
      }));

      await tx.mosfetChannel.createMany({ data: channelData });

      // Fetch the complete board with channels
      return tx.mosfetBoard.findUnique({
        where: { id: board.id },
        include: {
          channels: {
            orderBy: { channelNumber: 'asc' },
          },
        },
      });
    });
  },

  async update(id: string, data: { name?: string; channelCount?: number; notes?: string }) {
    const board = await prisma.mosfetBoard.findUnique({ where: { id } });
    if (!board) {
      throw new AppError(404, 'MOSFET board not found');
    }

    // Don't allow changing channelCount if channels are in use
    if (data.channelCount !== undefined && data.channelCount !== board.channelCount) {
      const usedChannels = await prisma.mosfetChannel.count({
        where: {
          mosfetBoardId: id,
          pinAssignment: { isNot: null },
        },
      });

      if (usedChannels > 0) {
        throw new AppError(
          409,
          `Cannot change channel count because ${usedChannels} channel(s) are currently in use.`,
        );
      }
    }

    // Only update name and notes (not channelCount, which requires channel management)
    const { channelCount: _cc, ...updateData } = data;

    return prisma.mosfetBoard.update({
      where: { id },
      data: updateData,
      include: {
        channels: {
          orderBy: { channelNumber: 'asc' },
        },
      },
    });
  },
};
