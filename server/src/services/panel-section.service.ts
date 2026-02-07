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
                pinType: true,
                powerRail: true,
              },
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
    },
  ) {
    const section = await prisma.panelSection.findUnique({ where: { id } });
    if (!section) {
      throw new AppError(404, 'Panel section not found');
    }

    return prisma.panelSection.update({ where: { id }, data: data as any });
  },
};
