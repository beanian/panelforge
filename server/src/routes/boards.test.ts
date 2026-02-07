import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prismaMock } from '../test/prisma-mock';
import { makeBoard } from '../test/fixtures';

const app = createApp();

describe('GET /api/boards', () => {
  it('returns 200 with array', async () => {
    prismaMock.board.findMany.mockResolvedValue([
      {
        ...makeBoard(),
        _count: { pinAssignments: 0 },
        pinAssignments: [],
      },
    ] as any);

    const res = await request(app).get('/api/boards');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('pinAvailability');
  });
});

describe('POST /api/boards', () => {
  it('returns 400 for empty name', async () => {
    const res = await request(app)
      .post('/api/boards')
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('returns 201 with valid data', async () => {
    prismaMock.board.create.mockResolvedValue(makeBoard({ name: 'New Board' }) as any);

    const res = await request(app)
      .post('/api/boards')
      .send({ name: 'New Board' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Board');
  });
});

describe('DELETE /api/boards/:id', () => {
  it('returns 204 on success', async () => {
    prismaMock.board.findUnique.mockResolvedValue({
      ...makeBoard(),
      _count: { pinAssignments: 0 },
    } as any);
    prismaMock.board.delete.mockResolvedValue(makeBoard() as any);

    const res = await request(app).delete('/api/boards/board-1');
    expect(res.status).toBe(204);
  });

  it('returns 404 for missing board', async () => {
    prismaMock.board.findUnique.mockResolvedValue(null);

    const res = await request(app).delete('/api/boards/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns 409 when board has assignments', async () => {
    prismaMock.board.findUnique.mockResolvedValue({
      ...makeBoard(),
      _count: { pinAssignments: 3 },
    } as any);

    const res = await request(app).delete('/api/boards/board-1');
    expect(res.status).toBe(409);
  });
});
