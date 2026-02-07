import { describe, it, expect } from 'vitest';
import { prismaMock } from '../test/prisma-mock';
import { makeBoard } from '../test/fixtures';
import { mobiFlightService } from './mobiflight.service';

function makePinAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pin-1',
    pinNumber: 'D2',
    pinMode: 'INPUT',
    description: null,
    componentInstanceId: 'ci-1',
    componentInstance: {
      name: 'ENG1 Fire Switch',
      componentType: { name: 'Toggle Switch' },
    },
    mobiFlightMapping: null,
    ...overrides,
  };
}

describe('mobiFlightService.getDevicesForBoard', () => {
  it('maps INPUT pinMode to Button device', async () => {
    const board = {
      ...makeBoard(),
      pinAssignments: [makePinAssignment({ pinMode: 'INPUT' })],
    };

    prismaMock.board.findUnique.mockResolvedValue(board as any);

    const result = await mobiFlightService.getDevicesForBoard('board-1');
    expect(result.devices[0].deviceType).toBe('Button');
  });

  it('maps OUTPUT pinMode to Output device', async () => {
    const board = {
      ...makeBoard(),
      pinAssignments: [makePinAssignment({ pinMode: 'OUTPUT' })],
    };

    prismaMock.board.findUnique.mockResolvedValue(board as any);

    const result = await mobiFlightService.getDevicesForBoard('board-1');
    expect(result.devices[0].deviceType).toBe('Output');
  });

  it('maps PWM pinMode to LedModule device', async () => {
    const board = {
      ...makeBoard(),
      pinAssignments: [makePinAssignment({ pinMode: 'PWM' })],
    };

    prismaMock.board.findUnique.mockResolvedValue(board as any);

    const result = await mobiFlightService.getDevicesForBoard('board-1');
    expect(result.devices[0].deviceType).toBe('LedModule');
  });

  it('maps Gauge component type to Stepper device', async () => {
    const board = {
      ...makeBoard(),
      pinAssignments: [
        makePinAssignment({
          id: 'pin-1',
          pinNumber: 'D2',
          componentInstanceId: 'ci-gauge',
          componentInstance: {
            name: 'Fuel Gauge',
            componentType: { name: 'Gauge' },
          },
        }),
        makePinAssignment({
          id: 'pin-2',
          pinNumber: 'D3',
          componentInstanceId: 'ci-gauge',
          componentInstance: {
            name: 'Fuel Gauge',
            componentType: { name: 'Gauge' },
          },
        }),
      ],
    };

    prismaMock.board.findUnique.mockResolvedValue(board as any);

    const result = await mobiFlightService.getDevicesForBoard('board-1');
    // Two pins for same gauge should produce 1 Stepper device
    const steppers = result.devices.filter((d) => d.deviceType === 'Stepper');
    expect(steppers).toHaveLength(1);
    expect(steppers[0].pairedPin).toBe('D3');
    expect(result.deviceCount).toBe(1);
  });

  it('includes MobiFlight mapping data when present', async () => {
    const board = {
      ...makeBoard(),
      pinAssignments: [
        makePinAssignment({
          mobiFlightMapping: {
            variableName: 'A:ENG1_FIRE',
            variableType: 'LVAR',
            eventType: 'INPUT_ACTION',
            configParams: { threshold: 50 },
          },
        }),
      ],
    };

    prismaMock.board.findUnique.mockResolvedValue(board as any);

    const result = await mobiFlightService.getDevicesForBoard('board-1');
    expect(result.devices[0].variableName).toBe('A:ENG1_FIRE');
    expect(result.devices[0].variableType).toBe('LVAR');
    expect(result.devices[0].configParams).toEqual({ threshold: 50 });
  });

  it('throws 404 for missing board', async () => {
    prismaMock.board.findUnique.mockResolvedValue(null);

    await expect(mobiFlightService.getDevicesForBoard('nonexistent')).rejects.toThrow(
      'Board not found',
    );
  });

  it('returns correct device count', async () => {
    const board = {
      ...makeBoard(),
      pinAssignments: [
        makePinAssignment({ id: 'p1', pinNumber: 'D2' }),
        makePinAssignment({ id: 'p2', pinNumber: 'D3', componentInstanceId: 'ci-2' }),
      ],
    };

    prismaMock.board.findUnique.mockResolvedValue(board as any);

    const result = await mobiFlightService.getDevicesForBoard('board-1');
    expect(result.deviceCount).toBe(2);
    expect(result.boardName).toBe('Arduino Mega #1');
  });
});

describe('mobiFlightService.export', () => {
  it('includes serialNumber and pairedPin', async () => {
    const board = {
      ...makeBoard(),
      pinAssignments: [
        makePinAssignment({
          id: 'pin-1',
          pinNumber: 'D2',
          componentInstanceId: 'ci-gauge',
          componentInstance: {
            name: 'Fuel Gauge',
            componentType: { name: 'Gauge' },
          },
        }),
        makePinAssignment({
          id: 'pin-2',
          pinNumber: 'D3',
          componentInstanceId: 'ci-gauge',
          componentInstance: {
            name: 'Fuel Gauge',
            componentType: { name: 'Gauge' },
          },
        }),
      ],
    };

    prismaMock.board.findUnique.mockResolvedValue(board as any);

    const result = await mobiFlightService.export('board-1');
    expect(result.serialNumber).toBe('board-1');
    expect(result.boardName).toBe('Arduino Mega #1');

    const stepper = result.devices.find((d) => d.deviceType === 'Stepper');
    expect(stepper?.pairedPin).toBe('D3');
  });

  it('does not include pairedPin for non-stepper devices', async () => {
    const board = {
      ...makeBoard(),
      pinAssignments: [makePinAssignment()],
    };

    prismaMock.board.findUnique.mockResolvedValue(board as any);

    const result = await mobiFlightService.export('board-1');
    expect(result.devices[0]).not.toHaveProperty('pairedPin');
  });
});
