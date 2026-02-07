import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export const buildProgressService = {
  async getProgress() {
    const sections = await prisma.panelSection.findMany({
      include: {
        componentInstances: {
          include: {
            pinAssignments: {
              select: { wiringStatus: true },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    let totalAll = 0;
    let completedAll = 0;

    const sectionData = sections.map((section) => {
      const instances = section.componentInstances;
      const total = instances.length;
      const planned = instances.filter((ci) => ci.buildStatus === 'PLANNED').length;
      const inProgress = instances.filter((ci) => ci.buildStatus === 'IN_PROGRESS').length;
      const complete = instances.filter((ci) => ci.buildStatus === 'COMPLETE').length;
      const hasIssues = instances.filter((ci) => ci.buildStatus === 'HAS_ISSUES').length;

      // Pin stats: wired = pins with status WIRED, TESTED, or COMPLETE
      const allPins = instances.flatMap((ci) => ci.pinAssignments);
      const wired = allPins.filter((p) =>
        p.wiringStatus === 'WIRED' || p.wiringStatus === 'TESTED' || p.wiringStatus === 'COMPLETE',
      ).length;

      totalAll += total;
      completedAll += complete;

      return {
        sectionId: section.id,
        sectionName: section.name,
        total,
        planned,
        inProgress,
        complete,
        hasIssues,
        percentage: total > 0 ? Math.round((complete / total) * 100) : 0,
        pinStats: { wired, total: allPins.length },
      };
    });

    return {
      overall: {
        total: totalAll,
        completed: completedAll,
        percentage: totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0,
      },
      sections: sectionData,
    };
  },

  async updateComponentStatus(id: string, newStatus: string) {
    const instance = await prisma.componentInstance.findUnique({
      where: { id },
      include: { pinAssignments: { select: { id: true } } },
    });

    if (!instance) {
      throw new AppError(404, 'Component instance not found');
    }

    // Determine the wiring status to cascade to pins
    let wiringStatus: string | null = null;
    switch (newStatus) {
      case 'PLANNED':
        wiringStatus = 'PLANNED';
        break;
      case 'IN_PROGRESS':
        wiringStatus = 'WIRED';
        break;
      case 'COMPLETE':
        wiringStatus = 'COMPLETE';
        break;
      case 'HAS_ISSUES':
        // Pins stay as-is
        wiringStatus = null;
        break;
    }

    return prisma.$transaction(async (tx) => {
      // Update the component instance's build status
      const updated = await tx.componentInstance.update({
        where: { id },
        data: { buildStatus: newStatus as any },
        include: {
          componentType: true,
          panelSection: true,
        },
      });

      // Cascade wiring status to pin assignments (unless HAS_ISSUES)
      if (wiringStatus !== null && instance.pinAssignments.length > 0) {
        await tx.pinAssignment.updateMany({
          where: { componentInstanceId: id },
          data: { wiringStatus: wiringStatus as any },
        });
      }

      return updated;
    });
  },
};
