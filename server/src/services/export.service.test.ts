import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '../test/prisma-mock';
import { exportService } from './export.service';

describe('exportService.exportAll', () => {
  it('fetches all 9 tables', async () => {
    prismaMock.board.findMany.mockResolvedValue([]);
    prismaMock.panelSection.findMany.mockResolvedValue([]);
    prismaMock.componentType.findMany.mockResolvedValue([]);
    prismaMock.componentInstance.findMany.mockResolvedValue([]);
    prismaMock.pinAssignment.findMany.mockResolvedValue([]);
    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);
    prismaMock.mosfetChannel.findMany.mockResolvedValue([]);
    prismaMock.mobiFlightMapping.findMany.mockResolvedValue([]);
    prismaMock.journalEntry.findMany.mockResolvedValue([]);

    const result = await exportService.exportAll();

    expect(result.metadata).toHaveProperty('exportedAt');
    expect(result.metadata.version).toBe('1.0');
    expect(result).toHaveProperty('boards');
    expect(result).toHaveProperty('panelSections');
    expect(result).toHaveProperty('componentTypes');
    expect(result).toHaveProperty('componentInstances');
    expect(result).toHaveProperty('pinAssignments');
    expect(result).toHaveProperty('mosfetBoards');
    expect(result).toHaveProperty('mosfetChannels');
    expect(result).toHaveProperty('mobiFlightMappings');
    expect(result).toHaveProperty('journalEntries');
  });
});

describe('exportService.importAll', () => {
  const validImport = {
    metadata: { exportedAt: '2025-01-01', version: '1.0' },
    boards: [{ id: 'b1' }],
    panelSections: [],
    componentTypes: [],
    componentInstances: [],
    pinAssignments: [],
    mosfetBoards: [],
    mosfetChannels: [],
    mobiFlightMappings: [],
    journalEntries: [],
  };

  it('validates required keys', async () => {
    const badImport = { ...validImport, boards: 'not-an-array' } as any;

    await expect(exportService.importAll(badImport)).rejects.toThrow(/missing or invalid.*boards/);
  });

  it('deletes in FK-safe order then inserts', async () => {
    const deleteOrder: string[] = [];
    prismaMock.mobiFlightMapping.deleteMany.mockImplementation(async () => {
      deleteOrder.push('mobiFlightMapping');
      return { count: 0 };
    });
    prismaMock.journalEntry.deleteMany.mockImplementation(async () => {
      deleteOrder.push('journalEntry');
      return { count: 0 };
    });
    prismaMock.pinAssignment.deleteMany.mockImplementation(async () => {
      deleteOrder.push('pinAssignment');
      return { count: 0 };
    });
    prismaMock.mosfetChannel.deleteMany.mockImplementation(async () => {
      deleteOrder.push('mosfetChannel');
      return { count: 0 };
    });
    prismaMock.componentInstance.deleteMany.mockImplementation(async () => {
      deleteOrder.push('componentInstance');
      return { count: 0 };
    });
    prismaMock.mosfetBoard.deleteMany.mockImplementation(async () => {
      deleteOrder.push('mosfetBoard');
      return { count: 0 };
    });
    prismaMock.componentType.deleteMany.mockImplementation(async () => {
      deleteOrder.push('componentType');
      return { count: 0 };
    });
    prismaMock.panelSection.deleteMany.mockImplementation(async () => {
      deleteOrder.push('panelSection');
      return { count: 0 };
    });
    prismaMock.board.deleteMany.mockImplementation(async () => {
      deleteOrder.push('board');
      return { count: 0 };
    });
    prismaMock.board.createMany.mockResolvedValue({ count: 1 });

    const result = await exportService.importAll(validImport as any);
    expect(result.success).toBe(true);

    // Verify FK-safe delete order: children before parents
    expect(deleteOrder.indexOf('mobiFlightMapping')).toBeLessThan(deleteOrder.indexOf('pinAssignment'));
    expect(deleteOrder.indexOf('pinAssignment')).toBeLessThan(deleteOrder.indexOf('board'));
    expect(deleteOrder.indexOf('componentInstance')).toBeLessThan(deleteOrder.indexOf('componentType'));
    expect(deleteOrder.indexOf('componentInstance')).toBeLessThan(deleteOrder.indexOf('panelSection'));
  });

  it('skips createMany for empty arrays', async () => {
    const emptyImport = {
      ...validImport,
      boards: [],
    };

    // Set up all delete mocks
    prismaMock.mobiFlightMapping.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.journalEntry.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.pinAssignment.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.mosfetChannel.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.componentInstance.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.mosfetBoard.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.componentType.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.panelSection.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.board.deleteMany.mockResolvedValue({ count: 0 });

    await exportService.importAll(emptyImport as any);
    expect(prismaMock.board.createMany).not.toHaveBeenCalled();
  });
});
