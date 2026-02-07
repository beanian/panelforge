import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prismaMock } from '../test/prisma-mock';
import { makeComponentInstance } from '../test/fixtures';

const app = createApp();

describe('GET /api/build-progress', () => {
  it('returns overall and sections', async () => {
    prismaMock.panelSection.findMany.mockResolvedValue([
      {
        id: 's1',
        name: 'Section 1',
        sortOrder: 0,
        componentInstances: [
          { ...makeComponentInstance(), buildStatus: 'PLANNED', pinAssignments: [] },
        ],
      },
    ] as any);

    const res = await request(app).get('/api/build-progress');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('overall');
    expect(res.body).toHaveProperty('sections');
    expect(res.body.overall).toHaveProperty('total');
    expect(res.body.overall).toHaveProperty('completed');
    expect(res.body.overall).toHaveProperty('percentage');
  });
});

describe('PATCH /api/build-progress/component/:id/status', () => {
  it('validates status enum', async () => {
    const res = await request(app)
      .patch('/api/build-progress/component/ci-1/status')
      .send({ status: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid status/);
  });

  it('rejects missing status', async () => {
    const res = await request(app)
      .patch('/api/build-progress/component/ci-1/status')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 with valid status', async () => {
    prismaMock.componentInstance.findUnique.mockResolvedValue({
      ...makeComponentInstance(),
      pinAssignments: [],
    } as any);
    prismaMock.componentInstance.update.mockResolvedValue({
      ...makeComponentInstance(),
      buildStatus: 'COMPLETE',
    } as any);

    const res = await request(app)
      .patch('/api/build-progress/component/ci-1/status')
      .send({ status: 'COMPLETE' });
    expect(res.status).toBe(200);
  });
});
