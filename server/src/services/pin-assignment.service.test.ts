import { describe, it, expect } from 'vitest';
import { prismaMock } from '../test/prisma-mock';
import { makeBoard, makePinAssignment, makeComponentInstance } from '../test/fixtures';
import { pinAssignmentService } from './pin-assignment.service';

describe('pinAssignmentService.create', () => {
  it('creates a valid pin assignment', async () => {
    prismaMock.board.findUnique.mockResolvedValue(makeBoard() as any);
    prismaMock.pinAssignment.findUnique.mockResolvedValue(null);
    prismaMock.pinAssignment.create.mockResolvedValue(makePinAssignment() as any);

    const result = await pinAssignmentService.create({
      boardId: 'board-1',
      pinNumber: 'D2',
      pinType: 'DIGITAL',
    });
    expect(result.pinNumber).toBe('D2');
  });

  it('rejects invalid pin format', async () => {
    prismaMock.board.findUnique.mockResolvedValue(makeBoard() as any);

    await expect(
      pinAssignmentService.create({
        boardId: 'board-1',
        pinNumber: 'X99',
        pinType: 'DIGITAL',
      }),
    ).rejects.toThrow('Invalid pin number format');
  });

  it('rejects digital pin exceeding board capacity', async () => {
    prismaMock.board.findUnique.mockResolvedValue(makeBoard({ digitalPinCount: 10 }) as any);

    await expect(
      pinAssignmentService.create({
        boardId: 'board-1',
        pinNumber: 'D10',
        pinType: 'DIGITAL',
      }),
    ).rejects.toThrow(/exceeds board capacity/);
  });

  it('rejects analog pin exceeding board capacity', async () => {
    prismaMock.board.findUnique.mockResolvedValue(makeBoard({ analogPinCount: 8 }) as any);

    await expect(
      pinAssignmentService.create({
        boardId: 'board-1',
        pinNumber: 'A8',
        pinType: 'ANALOG',
      }),
    ).rejects.toThrow(/exceeds board capacity/);
  });

  it('throws 409 on duplicate pin', async () => {
    prismaMock.board.findUnique.mockResolvedValue(makeBoard() as any);
    prismaMock.pinAssignment.findUnique.mockResolvedValue(makePinAssignment() as any);

    await expect(
      pinAssignmentService.create({
        boardId: 'board-1',
        pinNumber: 'D2',
        pinType: 'DIGITAL',
      }),
    ).rejects.toThrow(/already assigned/);
  });

  it('validates component instance exists when provided', async () => {
    prismaMock.board.findUnique.mockResolvedValue(makeBoard() as any);
    prismaMock.pinAssignment.findUnique.mockResolvedValue(null);
    prismaMock.componentInstance.findUnique.mockResolvedValue(null);

    await expect(
      pinAssignmentService.create({
        boardId: 'board-1',
        pinNumber: 'D2',
        pinType: 'DIGITAL',
        componentInstanceId: 'nonexistent',
      }),
    ).rejects.toThrow('Component instance not found');
  });

  it('throws 400 for missing board', async () => {
    prismaMock.board.findUnique.mockResolvedValue(null);

    await expect(
      pinAssignmentService.create({
        boardId: 'nonexistent',
        pinNumber: 'D2',
        pinType: 'DIGITAL',
      }),
    ).rejects.toThrow('Board not found');
  });
});

describe('pinAssignmentService.findAll', () => {
  it('applies boardId filter', async () => {
    prismaMock.pinAssignment.findMany.mockResolvedValue([]);

    await pinAssignmentService.findAll({ boardId: 'board-1' });

    expect(prismaMock.pinAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ boardId: 'board-1' }),
      }),
    );
  });

  it('applies assigned=true filter', async () => {
    prismaMock.pinAssignment.findMany.mockResolvedValue([]);

    await pinAssignmentService.findAll({ assigned: 'true' });

    expect(prismaMock.pinAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ componentInstanceId: { not: null } }),
      }),
    );
  });

  it('applies assigned=false filter', async () => {
    prismaMock.pinAssignment.findMany.mockResolvedValue([]);

    await pinAssignmentService.findAll({ assigned: 'false' });

    expect(prismaMock.pinAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ componentInstanceId: null }),
      }),
    );
  });

  it('applies search filter with OR clause', async () => {
    prismaMock.pinAssignment.findMany.mockResolvedValue([]);

    await pinAssignmentService.findAll({ search: 'fire' });

    expect(prismaMock.pinAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ description: expect.any(Object) }),
          ]),
        }),
      }),
    );
  });
});

describe('pinAssignmentService.bulkUpdate', () => {
  it('throws 404 when some IDs are missing', async () => {
    prismaMock.pinAssignment.findMany.mockResolvedValue([{ id: 'id-1' }] as any);

    await expect(
      pinAssignmentService.bulkUpdate(['id-1', 'id-2'], { wiringStatus: 'WIRED' }),
    ).rejects.toThrow(/not found.*id-2/);
  });

  it('updates and returns matching records', async () => {
    prismaMock.pinAssignment.findMany
      .mockResolvedValueOnce([{ id: 'id-1' }, { id: 'id-2' }] as any)
      .mockResolvedValueOnce([makePinAssignment({ id: 'id-1' }), makePinAssignment({ id: 'id-2' })] as any);
    prismaMock.pinAssignment.updateMany.mockResolvedValue({ count: 2 });

    const result = await pinAssignmentService.bulkUpdate(
      ['id-1', 'id-2'],
      { wiringStatus: 'WIRED' },
    );
    expect(result).toHaveLength(2);
  });
});

describe('pinAssignmentService.remove', () => {
  it('deletes MobiFlight mapping then pin in transaction', async () => {
    prismaMock.pinAssignment.findUnique.mockResolvedValue({
      ...makePinAssignment(),
      mobiFlightMapping: { id: 'mf-1' },
    } as any);
    prismaMock.mobiFlightMapping.delete.mockResolvedValue({} as any);
    prismaMock.pinAssignment.delete.mockResolvedValue({} as any);

    await pinAssignmentService.remove('pin-1');

    expect(prismaMock.mobiFlightMapping.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'mf-1' } }),
    );
    expect(prismaMock.pinAssignment.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pin-1' } }),
    );
  });

  it('skips MobiFlight delete when no mapping exists', async () => {
    prismaMock.pinAssignment.findUnique.mockResolvedValue({
      ...makePinAssignment(),
      mobiFlightMapping: null,
    } as any);
    prismaMock.pinAssignment.delete.mockResolvedValue({} as any);

    await pinAssignmentService.remove('pin-1');

    expect(prismaMock.mobiFlightMapping.delete).not.toHaveBeenCalled();
    expect(prismaMock.pinAssignment.delete).toHaveBeenCalled();
  });

  it('throws 404 on missing pin', async () => {
    prismaMock.pinAssignment.findUnique.mockResolvedValue(null);

    await expect(pinAssignmentService.remove('nonexistent')).rejects.toThrow('Pin assignment not found');
  });
});
