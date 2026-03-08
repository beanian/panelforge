import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export const boardService = {
  async findAll() {
    const boards = await prisma.board.findMany({
      include: {
        _count: { select: { pinAssignments: true } },
        pinAssignments: {
          select: {
            pinType: true,
            pinMode: true,
            componentInstanceId: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return boards.map((board) => {
      const digitalUsed = board.pinAssignments.filter(
        (p) => p.pinType === 'DIGITAL' && p.componentInstanceId !== null,
      ).length;
      const analogUsed = board.pinAssignments.filter(
        (p) => p.pinType === 'ANALOG' && p.componentInstanceId !== null,
      ).length;
      const pwmUsed = board.pinAssignments.filter(
        (p) => p.pinMode === 'PWM' && p.componentInstanceId !== null,
      ).length;

      const { pinAssignments: _pins, ...boardData } = board;

      return {
        ...boardData,
        pinAvailability: {
          digitalUsed,
          digitalFree: board.digitalPinCount - digitalUsed,
          analogUsed,
          analogFree: board.analogPinCount - analogUsed,
          pwmFree: board.pwmPins.length - pwmUsed,
        },
      };
    });
  },

  async findById(id: string) {
    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        pinAssignments: {
          include: {
            componentInstance: {
              include: {
                panelSection: true,
                componentType: true,
              },
            },
          },
          orderBy: { pinNumber: 'asc' },
        },
      },
    });

    if (!board) {
      throw new AppError(404, 'Board not found');
    }

    return board;
  },

  async create(data: { name: string; boardType?: string; notes?: string }) {
    const boardType = data.boardType ?? 'Arduino Mega 2560';
    const boardDefaults: Record<string, { digitalPinCount: number; analogPinCount: number; pwmPins: number[] }> = {
      'Arduino Mega 2560': { digitalPinCount: 54, analogPinCount: 16, pwmPins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
      'Arduino Nano': { digitalPinCount: 14, analogPinCount: 8, pwmPins: [3, 5, 6, 9, 10, 11] },
    };
    const defaults = boardDefaults[boardType] ?? boardDefaults['Arduino Mega 2560'];
    return prisma.board.create({
      data: {
        ...data,
        boardType,
        digitalPinCount: defaults.digitalPinCount,
        analogPinCount: defaults.analogPinCount,
        pwmPins: defaults.pwmPins,
      },
    });
  },

  async update(id: string, data: { name?: string; boardType?: string; notes?: string }) {
    const board = await prisma.board.findUnique({ where: { id } });
    if (!board) {
      throw new AppError(404, 'Board not found');
    }

    return prisma.board.update({ where: { id }, data });
  },

  async remove(id: string) {
    const board = await prisma.board.findUnique({
      where: { id },
      include: { _count: { select: { pinAssignments: true } } },
    });

    if (!board) {
      throw new AppError(404, 'Board not found');
    }

    if (board._count.pinAssignments > 0) {
      throw new AppError(
        409,
        `Cannot delete board "${board.name}" because it has ${board._count.pinAssignments} pin assignment(s). Remove them first.`,
      );
    }

    return prisma.board.delete({ where: { id } });
  },
};
