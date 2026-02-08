import { prisma } from '../lib/prisma';

export const powerBudgetService = {
  async getPowerBudget() {
    // Fetch all component instances with type + section info
    const instances = await prisma.componentInstance.findMany({
      select: {
        id: true,
        name: true,
        powerRail: true,
        panelSectionId: true,
        panelSection: { select: { name: true } },
        componentType: {
          select: {
            name: true,
            pinPowerRails: true,
            typicalCurrentMa: true,
            standbyCurrentMa: true,
          },
        },
      },
    });

    // Map instances to power budget components
    const components = instances.map((inst) => {
      // Derive effective power rail: instance override, or first non-NONE pin rail from type
      const typePrimaryRail = inst.componentType.pinPowerRails.find(
        (r) => r !== 'NONE',
      ) ?? 'NONE';
      const effectiveRail = inst.powerRail ?? typePrimaryRail;

      return {
        instanceId: inst.id,
        instanceName: inst.name,
        componentTypeName: inst.componentType.name,
        panelSectionId: inst.panelSectionId,
        panelSectionName: inst.panelSection.name,
        powerRail: effectiveRail,
        typicalCurrentMa: inst.componentType.typicalCurrentMa,
        standbyCurrentMa: inst.componentType.standbyCurrentMa,
      };
    });

    // Infrastructure: count boards and MOSFET boards
    const [boardCount, mosfetBoardCount] = await Promise.all([
      prisma.board.count(),
      prisma.mosfetBoard.count(),
    ]);
    const estimatedBoardCurrentMa = boardCount * 50 + mosfetBoardCount * 30;

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

    // Fetch PSU config
    const psuConfig = await this.getPsuConfig();

    return {
      psuConfig,
      components,
      infrastructure: {
        boardCount,
        mosfetBoardCount,
        estimatedBoardCurrentMa,
      },
      mosfetBoards: mosfetData,
    };
  },

  async getPsuConfig() {
    let config = await prisma.psuConfig.findUnique({
      where: { id: 'singleton' },
    });
    if (!config) {
      config = await prisma.psuConfig.create({
        data: {
          capacityWatts: 350,
          converterEfficiency: 0.87,
          name: 'Main PSU',
        },
      });
    }
    return {
      name: config.name,
      capacityWatts: config.capacityWatts,
      converterEfficiency: config.converterEfficiency,
      notes: config.notes,
    };
  },

  async updatePsuConfig(data: {
    name?: string;
    capacityWatts?: number;
    converterEfficiency?: number;
    notes?: string | null;
  }) {
    const config = await prisma.psuConfig.upsert({
      where: { id: 'singleton' },
      update: data,
      create: {
        ...data,
        capacityWatts: data.capacityWatts ?? 350,
        converterEfficiency: data.converterEfficiency ?? 0.87,
        name: data.name ?? 'Main PSU',
      },
    });
    return {
      name: config.name,
      capacityWatts: config.capacityWatts,
      converterEfficiency: config.converterEfficiency,
      notes: config.notes,
    };
  },
};
