import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

interface PinAssignmentFilters {
  boardId?: string;
  panelSectionId?: string;
  powerRail?: string;
  wiringStatus?: string;
  assigned?: string;
  search?: string;
}

export const pinAssignmentService = {
  async findAll(filters: PinAssignmentFilters = {}) {
    const where: Prisma.PinAssignmentWhereInput = {};

    if (filters.boardId) {
      where.boardId = filters.boardId;
    }

    if (filters.panelSectionId) {
      where.componentInstance = { panelSectionId: filters.panelSectionId };
    }

    if (filters.powerRail) {
      where.powerRail = filters.powerRail as any;
    }

    if (filters.wiringStatus) {
      where.wiringStatus = filters.wiringStatus as any;
    }

    if (filters.assigned === 'true') {
      where.componentInstanceId = { not: null };
    } else if (filters.assigned === 'false') {
      where.componentInstanceId = null;
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
        {
          componentInstance: {
            name: { contains: filters.search, mode: 'insensitive' },
          },
        },
        {
          mobiFlightMapping: {
            variableName: { contains: filters.search, mode: 'insensitive' },
          },
        },
      ];
    }

    return prisma.pinAssignment.findMany({
      where,
      include: {
        board: true,
        componentInstance: {
          include: {
            panelSection: true,
            componentType: true,
          },
        },
        mosfetChannel: {
          include: { mosfetBoard: true },
        },
        mobiFlightMapping: true,
      },
      orderBy: [{ boardId: 'asc' }, { pinNumber: 'asc' }],
    });
  },

  async findById(id: string) {
    const pin = await prisma.pinAssignment.findUnique({
      where: { id },
      include: {
        board: true,
        componentInstance: {
          include: {
            panelSection: true,
            componentType: true,
          },
        },
        mosfetChannel: {
          include: { mosfetBoard: true },
        },
        mobiFlightMapping: true,
      },
    });

    if (!pin) {
      throw new AppError(404, 'Pin assignment not found');
    }

    return pin;
  },

  async create(data: {
    boardId: string;
    pinNumber: string;
    pinType: string;
    pinMode?: string;
    componentInstanceId?: string;
    description?: string;
    powerRail?: string;
    notes?: string;
  }) {
    // Verify the board exists
    const board = await prisma.board.findUnique({ where: { id: data.boardId } });
    if (!board) {
      throw new AppError(400, 'Board not found');
    }

    // Validate pin number is valid for the board type
    const pinMatch = data.pinNumber.match(/^(D|A)(\d+)$/);
    if (!pinMatch) {
      throw new AppError(400, 'Invalid pin number format. Use D0-D53 or A0-A15.');
    }

    const pinPrefix = pinMatch[1];
    const pinNum = parseInt(pinMatch[2], 10);

    if (pinPrefix === 'D' && pinNum >= board.digitalPinCount) {
      throw new AppError(
        400,
        `Digital pin D${pinNum} exceeds board capacity of ${board.digitalPinCount} digital pins (D0-D${board.digitalPinCount - 1}).`,
      );
    }
    if (pinPrefix === 'A' && pinNum >= board.analogPinCount) {
      throw new AppError(
        400,
        `Analog pin A${pinNum} exceeds board capacity of ${board.analogPinCount} analog pins (A0-A${board.analogPinCount - 1}).`,
      );
    }

    // Check for duplicate pin on this board
    const existing = await prisma.pinAssignment.findUnique({
      where: { boardId_pinNumber: { boardId: data.boardId, pinNumber: data.pinNumber } },
    });
    if (existing) {
      throw new AppError(
        409,
        `Pin ${data.pinNumber} is already assigned on board "${board.name}".`,
      );
    }

    // Verify component instance if provided
    if (data.componentInstanceId) {
      const instance = await prisma.componentInstance.findUnique({
        where: { id: data.componentInstanceId },
      });
      if (!instance) {
        throw new AppError(400, 'Component instance not found');
      }
    }

    return prisma.pinAssignment.create({
      data: data as any,
      include: {
        board: true,
        componentInstance: {
          include: {
            panelSection: true,
            componentType: true,
          },
        },
      },
    });
  },

  async update(id: string, data: Record<string, unknown>) {
    const pin = await prisma.pinAssignment.findUnique({ where: { id } });
    if (!pin) {
      throw new AppError(404, 'Pin assignment not found');
    }

    // Verify component instance if being updated
    if (data.componentInstanceId && typeof data.componentInstanceId === 'string') {
      const instance = await prisma.componentInstance.findUnique({
        where: { id: data.componentInstanceId },
      });
      if (!instance) {
        throw new AppError(400, 'Component instance not found');
      }
    }

    return prisma.pinAssignment.update({
      where: { id },
      data: data as any,
      include: {
        board: true,
        componentInstance: {
          include: {
            panelSection: true,
            componentType: true,
          },
        },
        mosfetChannel: {
          include: { mosfetBoard: true },
        },
        mobiFlightMapping: true,
      },
    });
  },

  async bulkUpdate(ids: string[], data: Record<string, unknown>) {
    // Verify all IDs exist
    const existing = await prisma.pinAssignment.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    if (existing.length !== ids.length) {
      const foundIds = new Set(existing.map((p) => p.id));
      const missing = ids.filter((id) => !foundIds.has(id));
      throw new AppError(404, `Pin assignment(s) not found: ${missing.join(', ')}`);
    }

    await prisma.pinAssignment.updateMany({
      where: { id: { in: ids } },
      data: data as any,
    });

    // Return the updated records
    return prisma.pinAssignment.findMany({
      where: { id: { in: ids } },
      include: {
        board: true,
        componentInstance: {
          include: {
            panelSection: true,
            componentType: true,
          },
        },
      },
    });
  },

  async remove(id: string) {
    const pin = await prisma.pinAssignment.findUnique({
      where: { id },
      include: { mobiFlightMapping: true },
    });

    if (!pin) {
      throw new AppError(404, 'Pin assignment not found');
    }

    // Delete MobiFlight mapping first if it exists (cascade should handle this, but be explicit)
    await prisma.$transaction(async (tx) => {
      if (pin.mobiFlightMapping) {
        await tx.mobiFlightMapping.delete({
          where: { id: pin.mobiFlightMapping.id },
        });
      }
      await tx.pinAssignment.delete({ where: { id } });
    });

    return pin;
  },
};
