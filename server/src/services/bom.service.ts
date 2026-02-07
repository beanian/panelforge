import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

interface PinAllocation {
  boardId: string;
  boardName: string;
  pins: string[];
}

interface ComponentAllocation {
  componentInstanceId: string;
  name: string;
  typeName: string;
  pinsNeeded: number;
  pinMode: string;
  pinType: string;
  pwmRequired: boolean;
  powerRail: string;
  allocations: PinAllocation[];
}

interface BomCalculateResult {
  sectionId: string;
  sectionName: string;
  components: ComponentAllocation[];
  newBoardsNeeded: number;
  mosfetChannelsNeeded: number;
  mosfetChannelsAvailable: number;
}

interface BoardAvailability {
  id: string;
  name: string;
  digitalPinCount: number;
  analogPinCount: number;
  pwmPins: number[];
  usedDigitalPins: Set<string>;
  usedAnalogPins: Set<string>;
  usedPwmPins: Set<string>;
}

function getFreePins(board: BoardAvailability, pinType: string, pwmRequired: boolean, count: number): string[] {
  const result: string[] = [];

  if (pwmRequired) {
    // Allocate from PWM-capable digital pins
    for (const pwmPin of board.pwmPins) {
      if (result.length >= count) break;
      const pinStr = `D${pwmPin}`;
      if (!board.usedDigitalPins.has(pinStr) && !board.usedPwmPins.has(pinStr)) {
        result.push(pinStr);
      }
    }
  } else if (pinType === 'ANALOG') {
    for (let i = 0; i < board.analogPinCount; i++) {
      if (result.length >= count) break;
      const pinStr = `A${i}`;
      if (!board.usedAnalogPins.has(pinStr)) {
        result.push(pinStr);
      }
    }
  } else {
    // DIGITAL pins — skip PWM-capable pins to preserve them for PWM needs
    for (let i = 0; i < board.digitalPinCount; i++) {
      if (result.length >= count) break;
      const pinStr = `D${i}`;
      if (!board.usedDigitalPins.has(pinStr)) {
        result.push(pinStr);
      }
    }
  }

  return result;
}

export const bomService = {
  async calculate(sectionId: string): Promise<BomCalculateResult> {
    // Validate section exists
    const section = await prisma.panelSection.findUnique({
      where: { id: sectionId },
      include: {
        componentInstances: {
          include: {
            componentType: true,
            pinAssignments: { select: { id: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!section) {
      throw new AppError(404, 'Panel section not found');
    }

    // Get all boards with their current pin assignments
    const boards = await prisma.board.findMany({
      include: {
        pinAssignments: {
          select: {
            pinNumber: true,
            pinType: true,
            pinMode: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build board availability map
    const boardAvailability: BoardAvailability[] = boards.map((board) => {
      const usedDigitalPins = new Set<string>();
      const usedAnalogPins = new Set<string>();
      const usedPwmPins = new Set<string>();

      for (const pin of board.pinAssignments) {
        if (pin.pinType === 'DIGITAL') {
          usedDigitalPins.add(pin.pinNumber);
        }
        if (pin.pinType === 'ANALOG') {
          usedAnalogPins.add(pin.pinNumber);
        }
        if (pin.pinMode === 'PWM') {
          usedPwmPins.add(pin.pinNumber);
        }
      }

      return {
        id: board.id,
        name: board.name,
        digitalPinCount: board.digitalPinCount,
        analogPinCount: board.analogPinCount,
        pwmPins: board.pwmPins,
        usedDigitalPins,
        usedAnalogPins,
        usedPwmPins,
      };
    });

    // Get MOSFET board availability
    const mosfetBoards = await prisma.mosfetBoard.findMany({
      include: {
        channels: {
          include: {
            pinAssignment: { select: { id: true } },
          },
        },
      },
    });

    let totalMosfetFree = 0;
    for (const mb of mosfetBoards) {
      totalMosfetFree += mb.channels.filter((ch) => ch.pinAssignment === null).length;
    }

    // Calculate allocations for each component
    let newBoardsNeeded = 0;
    let mosfetChannelsNeeded = 0;
    const componentAllocations: ComponentAllocation[] = [];

    for (const instance of section.componentInstances) {
      const ct = instance.componentType;

      // Skip components that already have all their pins assigned
      const existingPinCount = instance.pinAssignments.length;
      const pinsStillNeeded = ct.defaultPinCount - existingPinCount;

      if (pinsStillNeeded <= 0) {
        componentAllocations.push({
          componentInstanceId: instance.id,
          name: instance.name,
          typeName: ct.name,
          pinsNeeded: 0,
          pinMode: ct.defaultPinMode,
          pinType: ct.pinTypesRequired.length > 0 ? ct.pinTypesRequired[0] : 'DIGITAL',
          pwmRequired: ct.pwmRequired,
          powerRail: (instance.powerRail ?? ct.defaultPowerRail) as string,
          allocations: [],
        });
        continue;
      }

      // Determine the pin type needed (first required type, default to DIGITAL)
      const pinType = ct.pinTypesRequired.length > 0 ? ct.pinTypesRequired[0] : 'DIGITAL';
      const pwmRequired = ct.pwmRequired;
      const powerRail = (instance.powerRail ?? ct.defaultPowerRail) as string;

      // Check if component needs MOSFET (27V power rail)
      if (powerRail === 'TWENTY_SEVEN_V') {
        mosfetChannelsNeeded += pinsStillNeeded;
      }

      // Best-fit allocation: try existing boards first
      let remainingPins = pinsStillNeeded;
      const allocations: PinAllocation[] = [];

      for (const board of boardAvailability) {
        if (remainingPins <= 0) break;

        const freePins = getFreePins(board, pinType, pwmRequired, remainingPins);

        if (freePins.length > 0) {
          allocations.push({
            boardId: board.id,
            boardName: board.name,
            pins: freePins,
          });

          // Mark these pins as used in the availability map
          for (const pin of freePins) {
            if (pwmRequired) {
              board.usedPwmPins.add(pin);
              board.usedDigitalPins.add(pin);
            } else if (pin.startsWith('A')) {
              board.usedAnalogPins.add(pin);
            } else {
              board.usedDigitalPins.add(pin);
            }
          }

          remainingPins -= freePins.length;
        }
      }

      // If we still need more pins, we need new boards
      if (remainingPins > 0) {
        newBoardsNeeded += Math.ceil(remainingPins / (pinType === 'ANALOG' ? 16 : 54));
      }

      componentAllocations.push({
        componentInstanceId: instance.id,
        name: instance.name,
        typeName: ct.name,
        pinsNeeded: pinsStillNeeded,
        pinMode: ct.defaultPinMode,
        pinType,
        pwmRequired,
        powerRail,
        allocations,
      });
    }

    return {
      sectionId: section.id,
      sectionName: section.name,
      components: componentAllocations,
      newBoardsNeeded,
      mosfetChannelsNeeded,
      mosfetChannelsAvailable: totalMosfetFree,
    };
  },

  async apply(bomResult: BomCalculateResult) {
    // Validate that the section still exists
    const section = await prisma.panelSection.findUnique({
      where: { id: bomResult.sectionId },
    });

    if (!section) {
      throw new AppError(404, 'Panel section not found');
    }

    const createdAssignments: Array<{
      componentInstanceId: string;
      componentName: string;
      boardId: string;
      boardName: string;
      pinNumber: string;
    }> = [];

    await prisma.$transaction(async (tx) => {
      for (const component of bomResult.components) {
        if (component.pinsNeeded === 0 || component.allocations.length === 0) {
          continue;
        }

        // Verify the component instance still exists
        const instance = await tx.componentInstance.findUnique({
          where: { id: component.componentInstanceId },
        });

        if (!instance) {
          throw new AppError(
            400,
            `Component instance "${component.name}" (${component.componentInstanceId}) no longer exists.`,
          );
        }

        for (const allocation of component.allocations) {
          // Verify board exists
          const board = await tx.board.findUnique({
            where: { id: allocation.boardId },
          });

          if (!board) {
            throw new AppError(
              400,
              `Board "${allocation.boardName}" (${allocation.boardId}) no longer exists.`,
            );
          }

          for (const pinNumber of allocation.pins) {
            // Check pin is not already taken (race condition guard)
            const existing = await tx.pinAssignment.findUnique({
              where: {
                boardId_pinNumber: {
                  boardId: allocation.boardId,
                  pinNumber,
                },
              },
            });

            if (existing) {
              throw new AppError(
                409,
                `Pin ${pinNumber} on board "${allocation.boardName}" is already assigned. Re-run calculate to get fresh allocations.`,
              );
            }

            await tx.pinAssignment.create({
              data: {
                boardId: allocation.boardId,
                pinNumber,
                pinType: pinNumber.startsWith('A') ? 'ANALOG' : 'DIGITAL',
                pinMode: component.pwmRequired ? 'PWM' : component.pinMode as any,
                componentInstanceId: component.componentInstanceId,
                powerRail: component.powerRail as any,
                wiringStatus: 'PLANNED',
                description: `Auto-assigned for ${component.name}`,
              },
            });

            createdAssignments.push({
              componentInstanceId: component.componentInstanceId,
              componentName: component.name,
              boardId: allocation.boardId,
              boardName: allocation.boardName,
              pinNumber,
            });
          }
        }
      }
    });

    return {
      sectionId: bomResult.sectionId,
      sectionName: bomResult.sectionName,
      totalPinsCreated: createdAssignments.length,
      assignments: createdAssignments,
    };
  },
};
