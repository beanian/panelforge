import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prismaMock } from '../test/prisma-mock';
import { makePanelSection } from '../test/fixtures';

const app = createApp();

describe('POST /api/bom/calculate', () => {
  it('rejects missing sectionId', async () => {
    const res = await request(app)
      .post('/api/bom/calculate')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sectionId/);
  });

  it('rejects non-string sectionId', async () => {
    const res = await request(app)
      .post('/api/bom/calculate')
      .send({ sectionId: 123 });
    expect(res.status).toBe(400);
  });

  it('returns expected shape for valid request', async () => {
    const section = {
      ...makePanelSection(),
      componentInstances: [],
    };
    prismaMock.panelSection.findUnique.mockResolvedValue(section as any);
    prismaMock.board.findMany.mockResolvedValue([]);
    prismaMock.mosfetBoard.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/bom/calculate')
      .send({ sectionId: 'section-1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sectionId');
    expect(res.body).toHaveProperty('components');
    expect(res.body).toHaveProperty('newBoardsNeeded');
    expect(res.body).toHaveProperty('mosfetChannelsNeeded');
    expect(res.body).toHaveProperty('mosfetChannelsAvailable');
  });
});

describe('POST /api/bom/apply', () => {
  it('rejects invalid body', async () => {
    const res = await request(app)
      .post('/api/bom/apply')
      .send({});
    expect(res.status).toBe(400);
  });
});
