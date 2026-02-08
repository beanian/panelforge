import { describe, it, expect } from 'vitest';
import { prismaMock } from '../test/prisma-mock';
import { powerBudgetService } from './power-budget.service';

function mockDefaults() {
  prismaMock.componentInstance.findMany.mockResolvedValue([]);
  prismaMock.board.count.mockResolvedValue(1);
  prismaMock.mosfetBoard.count.mockResolvedValue(0);
  prismaMock.mosfetBoard.findMany.mockResolvedValue([]);
  prismaMock.psuConfig.findUnique.mockResolvedValue({
    id: 'singleton',
    name: 'Main PSU',
    capacityWatts: 350,
    converterEfficiency: 0.87,
    notes: null,
    updatedAt: new Date(),
  });
}

describe('powerBudgetService.getPowerBudget', () => {
  it('returns enriched components with effective power rail', async () => {
    mockDefaults();
    prismaMock.componentInstance.findMany.mockResolvedValue([
      {
        id: 'ci-1',
        name: 'Gauge 1',
        powerRail: null,
        panelSectionId: 's1',
        panelSection: { name: 'Air Supply' },
        componentType: {
          name: 'Gauge',
          pinPowerRails: ['NINE_V', 'NINE_V'],
          typicalCurrentMa: 20,
          standbyCurrentMa: 0,
        },
      },
    ] as any);

    const result = await powerBudgetService.getPowerBudget();
    expect(result.components).toHaveLength(1);
    expect(result.components[0].powerRail).toBe('NINE_V');
    expect(result.components[0].typicalCurrentMa).toBe(20);
  });

  it('uses instance powerRail override when set', async () => {
    mockDefaults();
    prismaMock.componentInstance.findMany.mockResolvedValue([
      {
        id: 'ci-1',
        name: 'Custom',
        powerRail: 'FIVE_V',
        panelSectionId: 's1',
        panelSection: { name: 'Section 1' },
        componentType: {
          name: 'Gauge',
          pinPowerRails: ['NINE_V'],
          typicalCurrentMa: 20,
          standbyCurrentMa: 0,
        },
      },
    ] as any);

    const result = await powerBudgetService.getPowerBudget();
    expect(result.components[0].powerRail).toBe('FIVE_V');
  });

  it('returns infrastructure board counts', async () => {
    mockDefaults();
    prismaMock.board.count.mockResolvedValue(2);
    prismaMock.mosfetBoard.count.mockResolvedValue(3);

    const result = await powerBudgetService.getPowerBudget();
    expect(result.infrastructure.boardCount).toBe(2);
    expect(result.infrastructure.mosfetBoardCount).toBe(3);
    expect(result.infrastructure.estimatedBoardCurrentMa).toBe(2 * 50 + 3 * 30);
  });

  it('returns PSU config', async () => {
    mockDefaults();

    const result = await powerBudgetService.getPowerBudget();
    expect(result.psuConfig.name).toBe('Main PSU');
    expect(result.psuConfig.capacityWatts).toBe(350);
    expect(result.psuConfig.converterEfficiency).toBe(0.87);
  });

  it('computes MOSFET channel used/free counts', async () => {
    mockDefaults();
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

  it('defaults NONE rail for types with all NONE pinPowerRails', async () => {
    mockDefaults();
    prismaMock.componentInstance.findMany.mockResolvedValue([
      {
        id: 'ci-1',
        name: 'Switch',
        powerRail: null,
        panelSectionId: 's1',
        panelSection: { name: 'Section 1' },
        componentType: {
          name: 'Toggle Switch',
          pinPowerRails: ['NONE'],
          typicalCurrentMa: 0,
          standbyCurrentMa: 0,
        },
      },
    ] as any);

    const result = await powerBudgetService.getPowerBudget();
    expect(result.components[0].powerRail).toBe('NONE');
  });
});
