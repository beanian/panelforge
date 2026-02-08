import { describe, it, expect } from 'vitest';
import { prismaMock } from '../test/prisma-mock';
import { makeBoard, makeComponentType, makeComponentInstance, makePanelSection } from '../test/fixtures';
import { bomService } from './bom.service';

describe('bomService.calculate', () => {
  it('returns empty allocations for fully-assigned components', async () => {
    const ct = makeComponentType({ defaultPinCount: 1 });
    const ci = makeComponentInstance({
      componentType: ct,
      pinAssignments: [{ id: 'pin-1' }],
    });
    const section = makePanelSection({
      componentInstances: [ci],
    });

    prismaMock.panelSection.findUnique.mockResolvedValue(section as any);
    prismaMock.board.findMany.mockResolvedValue([]);
    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);

    const result = await bomService.calculate('section-1');
    expect(result.components[0].pinsNeeded).toBe(0);
    expect(result.components[0].allocations).toEqual([]);
    expect(result.newBoardsNeeded).toBe(0);
  });

  it('allocates digital pins from available boards', async () => {
    const ct = makeComponentType({ defaultPinCount: 2, pinTypes: ['DIGITAL'] });
    const ci = makeComponentInstance({
      componentType: ct,
      pinAssignments: [],
      powerRail: null,
    });
    const section = makePanelSection({ componentInstances: [ci] });

    const board = makeBoard({
      pinAssignments: [],
    });

    prismaMock.panelSection.findUnique.mockResolvedValue(section as any);
    prismaMock.board.findMany.mockResolvedValue([board as any]);
    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);

    const result = await bomService.calculate('section-1');
    expect(result.components[0].pinsNeeded).toBe(2);
    expect(result.components[0].allocations[0].pins).toHaveLength(2);
    expect(result.components[0].allocations[0].boardId).toBe('board-1');
  });

  it('allocates PWM pins from pwmPins list', async () => {
    const ct = makeComponentType({
      defaultPinCount: 1,
      pinTypes: ['DIGITAL'],
      pwmRequired: true,
    });
    const ci = makeComponentInstance({
      componentType: ct,
      pinAssignments: [],
      powerRail: null,
    });
    const section = makePanelSection({ componentInstances: [ci] });

    const board = makeBoard({ pinAssignments: [] });

    prismaMock.panelSection.findUnique.mockResolvedValue(section as any);
    prismaMock.board.findMany.mockResolvedValue([board as any]);
    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);

    const result = await bomService.calculate('section-1');
    expect(result.components[0].pwmRequired).toBe(true);
    // PWM pins on the default board start at D2
    expect(result.components[0].allocations[0].pins[0]).toBe('D2');
  });

  it('skips used pins when allocating', async () => {
    const ct = makeComponentType({ defaultPinCount: 1, pinTypes: ['DIGITAL'] });
    const ci = makeComponentInstance({
      componentType: ct,
      pinAssignments: [],
      powerRail: null,
    });
    const section = makePanelSection({ componentInstances: [ci] });

    const board = makeBoard({
      pinAssignments: [
        { pinNumber: 'D0', pinType: 'DIGITAL', pinMode: 'INPUT' },
      ],
    });

    prismaMock.panelSection.findUnique.mockResolvedValue(section as any);
    prismaMock.board.findMany.mockResolvedValue([board as any]);
    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);

    const result = await bomService.calculate('section-1');
    // D0 is used, so it should allocate D1
    expect(result.components[0].allocations[0].pins[0]).toBe('D1');
  });

  it('calculates newBoardsNeeded when capacity exhausted', async () => {
    const ct = makeComponentType({
      defaultPinCount: 55,
      pinTypes: ['DIGITAL'],
    });
    const ci = makeComponentInstance({
      componentType: ct,
      pinAssignments: [],
      powerRail: null,
    });
    const section = makePanelSection({ componentInstances: [ci] });

    // Board only has 54 digital pins
    const board = makeBoard({ pinAssignments: [] });

    prismaMock.panelSection.findUnique.mockResolvedValue(section as any);
    prismaMock.board.findMany.mockResolvedValue([board as any]);
    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);

    const result = await bomService.calculate('section-1');
    expect(result.newBoardsNeeded).toBe(1);
  });

  it('tracks MOSFET channels for 27V components', async () => {
    const ct = makeComponentType({
      defaultPinCount: 2,
      pinTypes: ['DIGITAL'],
      defaultPowerRail: 'TWENTY_SEVEN_V',
    });
    const ci = makeComponentInstance({
      componentType: ct,
      pinAssignments: [],
      powerRail: null,
    });
    const section = makePanelSection({ componentInstances: [ci] });

    prismaMock.panelSection.findUnique.mockResolvedValue(section as any);
    prismaMock.board.findMany.mockResolvedValue([makeBoard({ pinAssignments: [] }) as any]);
    prismaMock.mosfetBoard.findMany.mockResolvedValue([
      {
        id: 'mb-1',
        channels: [
          { id: 'ch-1', pinAssignment: null },
          { id: 'ch-2', pinAssignment: { id: 'existing' } },
        ],
      },
    ] as any);

    const result = await bomService.calculate('section-1');
    expect(result.mosfetChannelsNeeded).toBe(2);
    expect(result.mosfetChannelsAvailable).toBe(1);
  });

  it('throws 404 for missing section', async () => {
    prismaMock.panelSection.findUnique.mockResolvedValue(null);
    await expect(bomService.calculate('nonexistent')).rejects.toThrow('Panel section not found');
  });

  it('allocates analog pins correctly', async () => {
    const ct = makeComponentType({
      defaultPinCount: 1,
      pinTypes: ['ANALOG'],
    });
    const ci = makeComponentInstance({
      componentType: ct,
      pinAssignments: [],
      powerRail: null,
    });
    const section = makePanelSection({ componentInstances: [ci] });

    prismaMock.panelSection.findUnique.mockResolvedValue(section as any);
    prismaMock.board.findMany.mockResolvedValue([makeBoard({ pinAssignments: [] }) as any]);
    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);

    const result = await bomService.calculate('section-1');
    expect(result.components[0].allocations[0].pins[0]).toBe('A0');
  });
});

describe('bomService.apply', () => {
  it('creates pin assignments in transaction', async () => {
    const bomResult = {
      sectionId: 'section-1',
      sectionName: 'Test Section',
      components: [
        {
          componentInstanceId: 'ci-1',
          name: 'Switch 1',
          typeName: 'Toggle Switch',
          pinsNeeded: 1,
          pinMode: 'INPUT',
          pinType: 'DIGITAL',
          pwmRequired: false,
          powerRail: 'FIVE_V',
          allocations: [
            { boardId: 'board-1', boardName: 'Arduino #1', pins: ['D5'] },
          ],
        },
      ],
      newBoardsNeeded: 0,
      mosfetChannelsNeeded: 0,
      mosfetChannelsAvailable: 0,
    };

    prismaMock.panelSection.findUnique.mockResolvedValue(makePanelSection() as any);
    prismaMock.componentInstance.findUnique.mockResolvedValue(makeComponentInstance() as any);
    prismaMock.board.findUnique.mockResolvedValue(makeBoard() as any);
    prismaMock.pinAssignment.findUnique.mockResolvedValue(null);
    prismaMock.pinAssignment.create.mockResolvedValue({} as any);

    const result = await bomService.apply(bomResult);
    expect(result.totalPinsCreated).toBe(1);
    expect(result.assignments[0].pinNumber).toBe('D5');
    expect(prismaMock.pinAssignment.create).toHaveBeenCalledOnce();
  });

  it('throws 409 when pin is already assigned (race condition)', async () => {
    const bomResult = {
      sectionId: 'section-1',
      sectionName: 'Test Section',
      components: [
        {
          componentInstanceId: 'ci-1',
          name: 'Switch 1',
          typeName: 'Toggle',
          pinsNeeded: 1,
          pinMode: 'INPUT',
          pinType: 'DIGITAL',
          pwmRequired: false,
          powerRail: 'FIVE_V',
          allocations: [
            { boardId: 'board-1', boardName: 'Arduino #1', pins: ['D5'] },
          ],
        },
      ],
      newBoardsNeeded: 0,
      mosfetChannelsNeeded: 0,
      mosfetChannelsAvailable: 0,
    };

    prismaMock.panelSection.findUnique.mockResolvedValue(makePanelSection() as any);
    prismaMock.componentInstance.findUnique.mockResolvedValue(makeComponentInstance() as any);
    prismaMock.board.findUnique.mockResolvedValue(makeBoard() as any);
    prismaMock.pinAssignment.findUnique.mockResolvedValue({ id: 'existing' } as any);

    await expect(bomService.apply(bomResult)).rejects.toThrow(/already assigned/);
  });

  it('throws 404 for missing section on apply', async () => {
    prismaMock.panelSection.findUnique.mockResolvedValue(null);

    const bomResult = {
      sectionId: 'nonexistent',
      sectionName: 'Missing',
      components: [],
      newBoardsNeeded: 0,
      mosfetChannelsNeeded: 0,
      mosfetChannelsAvailable: 0,
    };

    await expect(bomService.apply(bomResult)).rejects.toThrow('Panel section not found');
  });

  it('skips components with pinsNeeded=0', async () => {
    prismaMock.panelSection.findUnique.mockResolvedValue(makePanelSection() as any);

    const bomResult = {
      sectionId: 'section-1',
      sectionName: 'Test',
      components: [
        {
          componentInstanceId: 'ci-1',
          name: 'Already assigned',
          typeName: 'Toggle',
          pinsNeeded: 0,
          pinMode: 'INPUT',
          pinType: 'DIGITAL',
          pwmRequired: false,
          powerRail: 'FIVE_V',
          allocations: [],
        },
      ],
      newBoardsNeeded: 0,
      mosfetChannelsNeeded: 0,
      mosfetChannelsAvailable: 0,
    };

    const result = await bomService.apply(bomResult);
    expect(result.totalPinsCreated).toBe(0);
    expect(prismaMock.pinAssignment.create).not.toHaveBeenCalled();
  });
});
