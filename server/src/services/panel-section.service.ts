import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export const panelSectionService = {
  async findAll() {
    const sections = await prisma.panelSection.findMany({
      include: {
        _count: { select: { componentInstances: true } },
        componentInstances: {
          select: { buildStatus: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return sections.map((section) => {
      const statusCounts = section.componentInstances.reduce(
        (acc, ci) => {
          acc[ci.buildStatus] = (acc[ci.buildStatus] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const { componentInstances: _instances, ...sectionData } = section;

      return {
        ...sectionData,
        componentCount: section._count.componentInstances,
        buildStatusBreakdown: statusCounts,
      };
    });
  },

  async findById(id: string) {
    const section = await prisma.panelSection.findUnique({
      where: { id },
      include: {
        componentInstances: {
          include: {
            componentType: true,
            pinAssignments: {
              select: {
                id: true,
                pinNumber: true,
                pinType: true,
                pinMode: true,
                powerRail: true,
                wiringStatus: true,
                board: { select: { id: true, name: true } },
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

    const totalPins = section.componentInstances.reduce(
      (sum, ci) => sum + ci.pinAssignments.length,
      0,
    );

    const powerBreakdown = section.componentInstances.reduce(
      (acc, ci) => {
        ci.pinAssignments.forEach((pin) => {
          if (pin.powerRail !== 'NONE') {
            acc[pin.powerRail] = (acc[pin.powerRail] || 0) + 1;
          }
        });
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      ...section,
      pinCount: totalPins,
      powerBreakdown,
    };
  },

  async getSummary() {
    const sections = await prisma.panelSection.findMany({
      include: {
        componentInstances: {
          include: {
            componentType: { select: { defaultPinCount: true } },
            pinAssignments: {
              select: {
                id: true,
                powerRail: true,
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return sections.map((section) => {
      const componentCount = section.componentInstances.length;

      // Pin usage: assigned = actual pin assignments, total = sum of defaultPinCount from types
      const assignedPins = section.componentInstances.reduce(
        (sum, ci) => sum + ci.pinAssignments.length,
        0,
      );
      const totalPins = section.componentInstances.reduce(
        (sum, ci) => sum + ci.componentType.defaultPinCount,
        0,
      );

      // Power breakdown by rail
      const powerBreakdown = { FIVE_V: 0, NINE_V: 0, TWENTY_SEVEN_V: 0, NONE: 0 };
      section.componentInstances.forEach((ci) => {
        ci.pinAssignments.forEach((pin) => {
          powerBreakdown[pin.powerRail as keyof typeof powerBreakdown] += 1;
        });
      });

      // Build progress: percentage of components with COMPLETE status
      const completeCount = section.componentInstances.filter(
        (ci) => ci.buildStatus === 'COMPLETE',
      ).length;
      const buildProgress = componentCount > 0
        ? Math.round((completeCount / componentCount) * 100)
        : 0;

      const { componentInstances: _instances, ...sectionData } = section;

      return {
        ...sectionData,
        componentCount,
        pinUsage: { assigned: assignedPins, total: totalPins },
        powerBreakdown,
        buildProgress,
      };
    });
  },

  async update(
    id: string,
    data: {
      buildStatus?: string;
      sourceMsn?: string;
      aircraftVariant?: string;
      registration?: string;
      lineageNotes?: string;
      lineageUrls?: string[];
      dimensionNotes?: string;
      svgX?: number | null;
      svgY?: number | null;
      svgWidth?: number | null;
      svgHeight?: number | null;
    },
  ) {
    const section = await prisma.panelSection.findUnique({ where: { id } });
    if (!section) {
      throw new AppError(404, 'Panel section not found');
    }

    return prisma.panelSection.update({ where: { id }, data: data as any });
  },
};
