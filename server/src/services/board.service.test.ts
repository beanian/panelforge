import { describe, it, expect } from 'vitest';
import { prismaMock } from '../test/prisma-mock';
import { makeBoard } from '../test/fixtures';
import { boardService } from './board.service';

describe('boardService.findAll', () => {
  it('calculates pin availability correctly', async () => {
    prismaMock.board.findMany.mockResolvedValue([
      {
        ...makeBoard(),
        _count: { pinAssignments: 3 },
        pinAssignments: [
          { pinType: 'DIGITAL', pinMode: 'INPUT', componentInstanceId: 'ci-1' },
          { pinType: 'ANALOG', pinMode: 'INPUT', componentInstanceId: 'ci-2' },
          { pinType: 'DIGITAL', pinMode: 'PWM', componentInstanceId: 'ci-3' },
        ],
      },
    ] as any);

    const result = await boardService.findAll();
    expect(result[0].pinAvailability).toEqual({
      digitalUsed: 2,
      digitalFree: 52,
      analogUsed: 1,
      analogFree: 15,
      pwmFree: 11,
    });
  });

  it('excludes unassigned pins from used count', async () => {
    prismaMock.board.findMany.mockResolvedValue([
      {
        ...makeBoard(),
        _count: { pinAssignments: 2 },
        pinAssignments: [
          { pinType: 'DIGITAL', pinMode: 'INPUT', componentInstanceId: null },
          { pinType: 'DIGITAL', pinMode: 'INPUT', componentInstanceId: 'ci-1' },
        ],
      },
    ] as any);

    const result = await boardService.findAll();
    expect(result[0].pinAvailability.digitalUsed).toBe(1);
  });
});

describe('boardService.findById', () => {
  it('returns board with pin assignments', async () => {
    const board = { ...makeBoard(), pinAssignments: [] };
    prismaMock.board.findUnique.mockResolvedValue(board as any);

    const result = await boardService.findById('board-1');
    expect(result.id).toBe('board-1');
  });

  it('throws 404 on missing board', async () => {
    prismaMock.board.findUnique.mockResolvedValue(null);

    await expect(boardService.findById('nonexistent')).rejects.toThrow('Board not found');
  });
});

describe('boardService.create', () => {
  it('creates a board', async () => {
    const created = makeBoard({ name: 'New Board' });
    prismaMock.board.create.mockResolvedValue(created as any);

    const result = await boardService.create({ name: 'New Board' });
    expect(result.name).toBe('New Board');
  });
});

describe('boardService.update', () => {
  it('updates an existing board', async () => {
    prismaMock.board.findUnique.mockResolvedValue(makeBoard() as any);
    prismaMock.board.update.mockResolvedValue(makeBoard({ name: 'Updated' }) as any);

    const result = await boardService.update('board-1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('throws 404 on missing board', async () => {
    prismaMock.board.findUnique.mockResolvedValue(null);

    await expect(boardService.update('nonexistent', { name: 'X' })).rejects.toThrow('Board not found');
  });
});

describe('boardService.remove', () => {
  it('deletes board with no assignments', async () => {
    prismaMock.board.findUnique.mockResolvedValue({
      ...makeBoard(),
      _count: { pinAssignments: 0 },
    } as any);
    prismaMock.board.delete.mockResolvedValue(makeBoard() as any);

    const result = await boardService.remove('board-1');
    expect(result.id).toBe('board-1');
  });

  it('throws 404 on missing board', async () => {
    prismaMock.board.findUnique.mockResolvedValue(null);

    await expect(boardService.remove('nonexistent')).rejects.toThrow('Board not found');
  });

  it('throws 409 when board has pin assignments', async () => {
    prismaMock.board.findUnique.mockResolvedValue({
      ...makeBoard(),
      _count: { pinAssignments: 3 },
    } as any);

    await expect(boardService.remove('board-1')).rejects.toThrow(/Cannot delete board/);
  });
});
