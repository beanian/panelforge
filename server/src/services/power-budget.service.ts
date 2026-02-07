import { prisma } from '../lib/prisma';

const RAIL_LABELS: Record<string, string> = {
  FIVE_V: '5V',
  NINE_V: '9V',
  TWENTY_SEVEN_V: '27V',
  NONE: 'None / Unassigned',
};

export const powerBudgetService = {
  async getPowerBudget() {
    // Fetch all pin assignments with their component instance and section info
    const pinAssignments = await prisma.pinAssignment.findMany({
      where: { componentInstanceId: { not: null } },
      select: {
        powerRail: true,
        componentInstance: {
          select: {
            panelSectionId: true,
            panelSection: { select: { name: true } },
          },
        },
      },
    });

    // Build rail breakdown
    const railMap: Record<string, { total: number; bySection: Record<string, { sectionId: string; sectionName: string; count: number }> }> = {
      FIVE_V: { total: 0, bySection: {} },
      NINE_V: { total: 0, bySection: {} },
      TWENTY_SEVEN_V: { total: 0, bySection: {} },
      NONE: { total: 0, bySection: {} },
    };

    for (const pin of pinAssignments) {
      const rail = pin.powerRail;
      const sectionId = pin.componentInstance?.panelSectionId;
      const sectionName = pin.componentInstance?.panelSection?.name;

      if (!sectionId || !sectionName) continue;

      railMap[rail].total += 1;
      if (!railMap[rail].bySection[sectionId]) {
        railMap[rail].bySection[sectionId] = {
          sectionId,
          sectionName,
          count: 0,
        };
      }
      railMap[rail].bySection[sectionId].count += 1;
    }

    const rails = Object.entries(railMap).map(([rail, data]) => ({
      rail,
      label: RAIL_LABELS[rail] || rail,
      totalConnections: data.total,
      bySection: Object.values(data.bySection),
    }));

    // Fetch MOSFET boards with channel and pin assignment details
    const mosfetBoards = await prisma.mosfetBoard.findMany({
      include: {
        channels: {
          include: {
            pinAssignment: {
              select: {
                pinNumber: true,
                componentInstance: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { channelNumber: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const mosfetData = mosfetBoards.map((board) => {
      const usedChannels = board.channels.filter((ch) => ch.pinAssignment !== null).length;

      return {
        id: board.id,
        name: board.name,
        channelCount: board.channelCount,
        usedChannels,
        freeChannels: board.channelCount - usedChannels,
        channels: board.channels.map((ch) => ({
          channelNumber: ch.channelNumber,
          pinAssignment: ch.pinAssignment
            ? {
                pinNumber: ch.pinAssignment.pinNumber,
                componentName: ch.pinAssignment.componentInstance?.name ?? null,
              }
            : null,
        })),
      };
    });

    return {
      rails,
      mosfetBoards: mosfetData,
    };
  },
};
