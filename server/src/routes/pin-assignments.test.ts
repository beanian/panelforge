import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prismaMock } from '../test/prisma-mock';
import { makeBoard, makePinAssignment } from '../test/fixtures';

const app = createApp();

describe('POST /api/pin-assignments', () => {
  it('returns 400 for invalid pin format', async () => {
    const res = await request(app)
      .post('/api/pin-assignments')
      .send({
        boardId: 'board-1',
        pinNumber: 'X99',
        pinType: 'DIGITAL',
      });
    expect(res.status).toBe(400);
  });

  it('accepts valid pin format', async () => {
    prismaMock.board.findUnique.mockResolvedValue(makeBoard() as any);
    prismaMock.pinAssignment.findUnique.mockResolvedValue(null);
    prismaMock.pinAssignment.create.mockResolvedValue(makePinAssignment() as any);

    const res = await request(app)
      .post('/api/pin-assignments')
      .send({
        boardId: 'board-1',
        pinNumber: 'D2',
        pinType: 'DIGITAL',
      });
    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/pin-assignments/bulk', () => {
  it('validates body structure', async () => {
    const res = await request(app)
      .patch('/api/pin-assignments/bulk')
      .send({ ids: [], data: {} });
    expect(res.status).toBe(400);
  });

  it('accepts valid bulk update', async () => {
    prismaMock.pinAssignment.findMany
      .mockResolvedValueOnce([{ id: 'id-1' }] as any)
      .mockResolvedValueOnce([makePinAssignment()] as any);
    prismaMock.pinAssignment.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .patch('/api/pin-assignments/bulk')
      .send({
        ids: ['id-1'],
        data: { wiringStatus: 'WIRED' },
      });
    expect(res.status).toBe(200);
  });
});
