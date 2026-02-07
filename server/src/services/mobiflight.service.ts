import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

interface MobiFlightDevice {
  pinNumber: string;
  deviceType: 'Button' | 'Output' | 'LedModule' | 'Stepper';
  name: string;
  variableName: string | null;
  variableType: string | null;
  eventType: string | null;
  configParams: unknown | null;
  /** For Stepper: the secondary pin (STEP) paired with this DIR pin */
  pairedPin?: string;
}

function mapPinModeToDeviceType(
  pinMode: string,
  componentTypeName: string | null,
): MobiFlightDevice['deviceType'] {
  // Gauges with stepper motors get grouped as Stepper devices
  if (componentTypeName === 'Gauge') {
    return 'Stepper';
  }
  switch (pinMode) {
    case 'INPUT':
      return 'Button';
    case 'OUTPUT':
      return 'Output';
    case 'PWM':
      return 'LedModule';
    default:
      return 'Button';
  }
}

export const mobiFlightService = {
  async getDevicesForBoard(boardId: string): Promise<{
    boardName: string;
    deviceCount: number;
    devices: MobiFlightDevice[];
  }> {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        pinAssignments: {
          where: { componentInstanceId: { not: null } },
          include: {
            componentInstance: {
              include: { componentType: true },
            },
            mobiFlightMapping: true,
          },
          orderBy: { pinNumber: 'asc' },
        },
      },
    });

    if (!board) {
      throw new AppError(404, 'Board not found');
    }

    const devices: MobiFlightDevice[] = [];
    const processedPinIds = new Set<string>();

    // First pass: group stepper pins (Gauge components have DIR+STEP pin pairs)
    // Stepper components have 2 pins per component instance — group them together
    const stepperComponentPins = new Map<string, typeof board.pinAssignments>();

    for (const pin of board.pinAssignments) {
      const typeName = pin.componentInstance?.componentType?.name ?? null;
      if (typeName === 'Gauge' && pin.componentInstanceId) {
        const existing = stepperComponentPins.get(pin.componentInstanceId) ?? [];
        existing.push(pin);
        stepperComponentPins.set(pin.componentInstanceId, existing);
      }
    }

    // Process stepper pairs
    for (const [_componentInstanceId, pins] of stepperComponentPins) {
      // Sort by pin number to ensure DIR comes first, then STEP
      const sorted = [...pins].sort((a, b) => a.pinNumber.localeCompare(b.pinNumber, undefined, { numeric: true }));

      // Mark all pins in this group as processed
      for (const p of sorted) {
        processedPinIds.add(p.id);
      }

      const firstPin = sorted[0];
      const secondPin = sorted.length > 1 ? sorted[1] : null;

      const mapping = firstPin.mobiFlightMapping;
      devices.push({
        pinNumber: firstPin.pinNumber,
        deviceType: 'Stepper',
        name: firstPin.componentInstance?.name ?? firstPin.description ?? firstPin.pinNumber,
        variableName: mapping?.variableName ?? null,
        variableType: mapping?.variableType ?? null,
        eventType: mapping?.eventType ?? null,
        configParams: mapping?.configParams ?? null,
        pairedPin: secondPin?.pinNumber,
      });
    }

    // Second pass: process remaining non-stepper pins
    for (const pin of board.pinAssignments) {
      if (processedPinIds.has(pin.id)) continue;

      const typeName = pin.componentInstance?.componentType?.name ?? null;
      const deviceType = mapPinModeToDeviceType(pin.pinMode, typeName);
      const mapping = pin.mobiFlightMapping;

      devices.push({
        pinNumber: pin.pinNumber,
        deviceType,
        name: pin.componentInstance?.name ?? pin.description ?? pin.pinNumber,
        variableName: mapping?.variableName ?? null,
        variableType: mapping?.variableType ?? null,
        eventType: mapping?.eventType ?? null,
        configParams: mapping?.configParams ?? null,
      });
    }

    // Sort by pin number
    devices.sort((a, b) => a.pinNumber.localeCompare(b.pinNumber, undefined, { numeric: true }));

    return {
      boardName: board.name,
      deviceCount: devices.length,
      devices,
    };
  },

  async preview(boardId: string) {
    return this.getDevicesForBoard(boardId);
  },

  async export(boardId: string) {
    const data = await this.getDevicesForBoard(boardId);

    return {
      boardName: data.boardName,
      serialNumber: boardId,
      devices: data.devices.map((device) => ({
        pinNumber: device.pinNumber,
        deviceType: device.deviceType,
        name: device.name,
        variableName: device.variableName,
        variableType: device.variableType,
        eventType: device.eventType,
        configParams: device.configParams,
        ...(device.pairedPin ? { pairedPin: device.pairedPin } : {}),
      })),
    };
  },
};
