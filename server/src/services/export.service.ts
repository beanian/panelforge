import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

interface ExportData {
  metadata: { exportedAt: string; version: string };
  boards: unknown[];
  panelSections: unknown[];
  componentTypes: unknown[];
  componentInstances: unknown[];
  pinAssignments: unknown[];
  mosfetBoards: unknown[];
  mosfetChannels: unknown[];
  mobiFlightMappings: unknown[];
  journalEntries: unknown[];
}

const EXPECTED_KEYS = [
  'boards',
  'panelSections',
  'componentTypes',
  'componentInstances',
  'pinAssignments',
  'mosfetBoards',
  'mosfetChannels',
  'mobiFlightMappings',
  'journalEntries',
] as const;

export const exportService = {
  async exportAll(): Promise<ExportData> {
    const [
      boards,
      panelSections,
      componentTypes,
      componentInstances,
      pinAssignments,
      mosfetBoards,
      mosfetChannels,
      mobiFlightMappings,
      journalEntries,
    ] = await Promise.all([
      prisma.board.findMany(),
      prisma.panelSection.findMany(),
      prisma.componentType.findMany(),
      prisma.componentInstance.findMany(),
      prisma.pinAssignment.findMany(),
      prisma.mosfetBoard.findMany(),
      prisma.mosfetChannel.findMany(),
      prisma.mobiFlightMapping.findMany(),
      prisma.journalEntry.findMany(),
    ]);

    return {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
      },
      boards,
      panelSections,
      componentTypes,
      componentInstances,
      pinAssignments,
      mosfetBoards,
      mosfetChannels,
      mobiFlightMappings,
      journalEntries,
    };
  },

  async importAll(data: ExportData) {
    // Validate structure
    for (const key of EXPECTED_KEYS) {
      if (!Array.isArray(data[key])) {
        throw new AppError(400, `Import data missing or invalid "${key}" array`);
      }
    }

    await prisma.$transaction(async (tx) => {
      // Delete in FK-safe order (children before parents)
      await tx.mobiFlightMapping.deleteMany();
      await tx.journalEntry.deleteMany();
      await tx.pinAssignment.deleteMany();
      await tx.mosfetChannel.deleteMany();
      await tx.componentInstance.deleteMany();
      await tx.mosfetBoard.deleteMany();
      await tx.componentType.deleteMany();
      await tx.panelSection.deleteMany();
      await tx.board.deleteMany();

      // Re-insert in FK-safe order (parents before children)
      if (data.boards.length > 0) {
        await tx.board.createMany({ data: data.boards as any });
      }
      if (data.panelSections.length > 0) {
        await tx.panelSection.createMany({ data: data.panelSections as any });
      }
      if (data.componentTypes.length > 0) {
        await tx.componentType.createMany({ data: data.componentTypes as any });
      }
      if (data.componentInstances.length > 0) {
        await tx.componentInstance.createMany({ data: data.componentInstances as any });
      }
      if (data.pinAssignments.length > 0) {
        await tx.pinAssignment.createMany({ data: data.pinAssignments as any });
      }
      if (data.mosfetBoards.length > 0) {
        await tx.mosfetBoard.createMany({ data: data.mosfetBoards as any });
      }
      if (data.mosfetChannels.length > 0) {
        await tx.mosfetChannel.createMany({ data: data.mosfetChannels as any });
      }
      if (data.mobiFlightMappings.length > 0) {
        await tx.mobiFlightMapping.createMany({ data: data.mobiFlightMappings as any });
      }
      if (data.journalEntries.length > 0) {
        await tx.journalEntry.createMany({ data: data.journalEntries as any });
      }
    });

    return { success: true, message: 'Import completed successfully' };
  },
};
