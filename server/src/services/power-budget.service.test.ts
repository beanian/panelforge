import { describe, it, expect } from 'vitest';
import { prismaMock } from '../test/prisma-mock';
import { powerBudgetService } from './power-budget.service';

describe('powerBudgetService.getPowerBudget', () => {
  it('aggregates connections per rail', async () => {
    prismaMock.pinAssignment.findMany.mockResolvedValue([
      {
        powerRail: 'FIVE_V',
        componentInstance: {
          panelSectionId: 's1',
          panelSection: { name: 'Section 1' },
        },
      },
      {
        powerRail: 'FIVE_V',
        componentInstance: {
          panelSectionId: 's1',
          panelSection: { name: 'Section 1' },
        },
      },
      {
        powerRail: 'NINE_V',
        componentInstance: {
          panelSectionId: 's1',
          panelSection: { name: 'Section 1' },
        },
      },
    ] as any);

    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);

    const result = await powerBudgetService.getPowerBudget();
    const fiveV = result.rails.find((r) => r.rail === 'FIVE_V');
    const nineV = result.rails.find((r) => r.rail === 'NINE_V');

    expect(fiveV?.totalConnections).toBe(2);
    expect(nineV?.totalConnections).toBe(1);
  });

  it('groups by section within each rail', async () => {
    prismaMock.pinAssignment.findMany.mockResolvedValue([
      {
        powerRail: 'FIVE_V',
        componentInstance: { panelSectionId: 's1', panelSection: { name: 'Section 1' } },
      },
      {
        powerRail: 'FIVE_V',
        componentInstance: { panelSectionId: 's2', panelSection: { name: 'Section 2' } },
      },
      {
        powerRail: 'FIVE_V',
        componentInstance: { panelSectionId: 's1', panelSection: { name: 'Section 1' } },
      },
    ] as any);

    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);

    const result = await powerBudgetService.getPowerBudget();
    const fiveV = result.rails.find((r) => r.rail === 'FIVE_V')!;
    expect(fiveV.bySection).toHaveLength(2);

    const s1 = fiveV.bySection.find((s) => s.sectionId === 's1');
    const s2 = fiveV.bySection.find((s) => s.sectionId === 's2');
    expect(s1?.count).toBe(2);
    expect(s2?.count).toBe(1);
  });

  it('handles null componentInstance gracefully', async () => {
    prismaMock.pinAssignment.findMany.mockResolvedValue([
      {
        powerRail: 'FIVE_V',
        componentInstance: null,
      },
    ] as any);

    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);

    const result = await powerBudgetService.getPowerBudget();
    // The null instance should be skipped
    expect(result.rails.find((r) => r.rail === 'FIVE_V')?.totalConnections).toBe(0);
  });

  it('computes MOSFET channel used/free counts', async () => {
    prismaMock.pinAssignment.findMany.mockResolvedValue([]);
    prismaMock.mosfetBoard.findMany.mockResolvedValue([
      {
        id: 'mb-1',
        name: 'MOSFET #1',
        channelCount: 4,
        channels: [
          { channelNumber: 1, pinAssignment: { pinNumber: 'D2', componentInstance: { name: 'LED' } } },
          { channelNumber: 2, pinAssignment: null },
          { channelNumber: 3, pinAssignment: null },
          { channelNumber: 4, pinAssignment: { pinNumber: 'D3', componentInstance: null } },
        ],
      },
    ] as any);

    const result = await powerBudgetService.getPowerBudget();
    expect(result.mosfetBoards[0].usedChannels).toBe(2);
    expect(result.mosfetBoards[0].freeChannels).toBe(2);
  });

  it('returns all four rails even when empty', async () => {
    prismaMock.pinAssignment.findMany.mockResolvedValue([]);
    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);

    const result = await powerBudgetService.getPowerBudget();
    expect(result.rails).toHaveLength(4);
    expect(result.rails.map((r) => r.rail)).toEqual(['FIVE_V', 'NINE_V', 'TWENTY_SEVEN_V', 'NONE']);
    expect(result.rails.every((r) => r.totalConnections === 0)).toBe(true);
  });

  it('provides correct rail labels', async () => {
    prismaMock.pinAssignment.findMany.mockResolvedValue([]);
    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);

    const result = await powerBudgetService.getPowerBudget();
    const labels = Object.fromEntries(result.rails.map((r) => [r.rail, r.label]));
    expect(labels['FIVE_V']).toBe('5V');
    expect(labels['NINE_V']).toBe('9V');
    expect(labels['TWENTY_SEVEN_V']).toBe('27V');
  });
});
