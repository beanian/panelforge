import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

interface ComponentInstanceFilters {
  panelSectionId?: string;
  componentTypeId?: string;
  buildStatus?: string;
  mapped?: string;
}

export const componentInstanceService = {
  async findAll(filters: ComponentInstanceFilters = {}) {
    const where: Prisma.ComponentInstanceWhereInput = {};

    if (filters.panelSectionId) {
      where.panelSectionId = filters.panelSectionId;
    }
    if (filters.componentTypeId) {
      where.componentTypeId = filters.componentTypeId;
    }
    if (filters.buildStatus) {
      where.buildStatus = filters.buildStatus as any;
    }
    if (filters.mapped === 'true') {
      where.mapX = { not: null };
      where.mapY = { not: null };
      where.mapWidth = { not: null };
      where.mapHeight = { not: null };
    }

    return prisma.componentInstance.findMany({
      where,
      include: {
        componentType: true,
        panelSection: true,
        _count: { select: { pinAssignments: true } },
      },
      orderBy: [{ panelSectionId: 'asc' }, { sortOrder: 'asc' }],
    });
  },

  async findMapData() {
    return prisma.componentInstance.findMany({
      where: {
        mapX: { not: null },
        mapY: { not: null },
        mapWidth: { not: null },
        mapHeight: { not: null },
      },
      select: {
        id: true,
        name: true,
        buildStatus: true,
        powerRail: true,
        mapX: true,
        mapY: true,
        mapWidth: true,
        mapHeight: true,
        componentType: {
          select: { name: true, defaultPinCount: true },
        },
        panelSection: {
          select: { name: true },
        },
        _count: { select: { pinAssignments: true } },
      },
      orderBy: [{ panelSectionId: 'asc' }, { sortOrder: 'asc' }],
    });
  },

  async findById(id: string) {
    const instance = await prisma.componentInstance.findUnique({
      where: { id },
      include: {
        componentType: true,
        panelSection: true,
        pinAssignments: {
          include: {
            board: true,
            mosfetChannel: {
              include: { mosfetBoard: true },
            },
            mobiFlightMapping: true,
          },
          orderBy: { pinNumber: 'asc' },
        },
      },
    });

    if (!instance) {
      throw new AppError(404, 'Component instance not found');
    }

    return instance;
  },

  async create(data: {
    name: string;
    componentTypeId: string;
    panelSectionId: string;
    powerRail?: string;
    notes?: string;
    sortOrder?: number;
  }) {
    // Verify the referenced component type exists
    const componentType = await prisma.componentType.findUnique({
      where: { id: data.componentTypeId },
    });
    if (!componentType) {
      throw new AppError(400, 'Component type not found');
    }

    // Verify the referenced panel section exists
    const panelSection = await prisma.panelSection.findUnique({
      where: { id: data.panelSectionId },
    });
    if (!panelSection) {
      throw new AppError(400, 'Panel section not found');
    }

    return prisma.componentInstance.create({
      data: data as any,
      include: {
        componentType: true,
        panelSection: true,
      },
    });
  },

  async update(id: string, data: Record<string, unknown>) {
    const instance = await prisma.componentInstance.findUnique({ where: { id } });
    if (!instance) {
      throw new AppError(404, 'Component instance not found');
    }

    return prisma.componentInstance.update({
      where: { id },
      data: data as any,
      include: {
        componentType: true,
        panelSection: true,
      },
    });
  },

  async remove(id: string) {
    const instance = await prisma.componentInstance.findUnique({
      where: { id },
      include: { _count: { select: { pinAssignments: true } } },
    });

    if (!instance) {
      throw new AppError(404, 'Component instance not found');
    }

    // Delete cascading pin assignments first, then the instance
    await prisma.$transaction(async (tx) => {
      if (instance._count.pinAssignments > 0) {
        // Delete MobiFlight mappings for the pins
        await tx.mobiFlightMapping.deleteMany({
          where: {
            pinAssignment: { componentInstanceId: id },
          },
        });

        // Delete pin assignments
        await tx.pinAssignment.deleteMany({
          where: { componentInstanceId: id },
        });
      }

      await tx.componentInstance.delete({ where: { id } });
    });

    return instance;
  },
};
