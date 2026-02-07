import { describe, it, expect } from 'vitest';
import { prismaMock } from '../test/prisma-mock';
import { makeComponentInstance } from '../test/fixtures';
import { buildProgressService } from './build-progress.service';

describe('buildProgressService.getProgress', () => {
  it('calculates percentages correctly', async () => {
    prismaMock.panelSection.findMany.mockResolvedValue([
      {
        id: 's1',
        name: 'Section 1',
        sortOrder: 0,
        componentInstances: [
          { ...makeComponentInstance(), buildStatus: 'COMPLETE', pinAssignments: [] },
          { ...makeComponentInstance({ id: 'ci-2' }), buildStatus: 'PLANNED', pinAssignments: [] },
          { ...makeComponentInstance({ id: 'ci-3' }), buildStatus: 'COMPLETE', pinAssignments: [] },
          { ...makeComponentInstance({ id: 'ci-4' }), buildStatus: 'IN_PROGRESS', pinAssignments: [] },
        ],
      },
    ] as any);

    const result = await buildProgressService.getProgress();
    expect(result.overall.total).toBe(4);
    expect(result.overall.completed).toBe(2);
    expect(result.overall.percentage).toBe(50);
    expect(result.sections[0].complete).toBe(2);
    expect(result.sections[0].planned).toBe(1);
    expect(result.sections[0].inProgress).toBe(1);
    expect(result.sections[0].percentage).toBe(50);
  });

  it('counts wired pins (WIRED, TESTED, COMPLETE)', async () => {
    prismaMock.panelSection.findMany.mockResolvedValue([
      {
        id: 's1',
        name: 'Section 1',
        sortOrder: 0,
        componentInstances: [
          {
            ...makeComponentInstance(),
            buildStatus: 'IN_PROGRESS',
            pinAssignments: [
              { wiringStatus: 'WIRED' },
              { wiringStatus: 'TESTED' },
              { wiringStatus: 'COMPLETE' },
              { wiringStatus: 'PLANNED' },
              { wiringStatus: 'UNASSIGNED' },
            ],
          },
        ],
      },
    ] as any);

    const result = await buildProgressService.getProgress();
    expect(result.sections[0].pinStats.wired).toBe(3);
    expect(result.sections[0].pinStats.total).toBe(5);
  });

  it('handles zero-division (no components)', async () => {
    prismaMock.panelSection.findMany.mockResolvedValue([
      {
        id: 's1',
        name: 'Empty Section',
        sortOrder: 0,
        componentInstances: [],
      },
    ] as any);

    const result = await buildProgressService.getProgress();
    expect(result.overall.percentage).toBe(0);
    expect(result.sections[0].percentage).toBe(0);
  });

  it('returns data across multiple sections', async () => {
    prismaMock.panelSection.findMany.mockResolvedValue([
      {
        id: 's1',
        name: 'Section 1',
        sortOrder: 0,
        componentInstances: [
          { ...makeComponentInstance(), buildStatus: 'COMPLETE', pinAssignments: [] },
        ],
      },
      {
        id: 's2',
        name: 'Section 2',
        sortOrder: 1,
        componentInstances: [
          { ...makeComponentInstance({ id: 'ci-2' }), buildStatus: 'PLANNED', pinAssignments: [] },
        ],
      },
    ] as any);

    const result = await buildProgressService.getProgress();
    expect(result.sections).toHaveLength(2);
    expect(result.overall.total).toBe(2);
    expect(result.overall.completed).toBe(1);
    expect(result.overall.percentage).toBe(50);
  });
});

describe('buildProgressService.updateComponentStatus', () => {
  it('cascades PLANNED status to PLANNED wiring', async () => {
    prismaMock.componentInstance.findUnique.mockResolvedValue({
      ...makeComponentInstance(),
      pinAssignments: [{ id: 'pin-1' }, { id: 'pin-2' }],
    } as any);
    prismaMock.componentInstance.update.mockResolvedValue(makeComponentInstance() as any);
    prismaMock.pinAssignment.updateMany.mockResolvedValue({ count: 2 });

    await buildProgressService.updateComponentStatus('ci-1', 'PLANNED');

    expect(prismaMock.pinAssignment.updateMany).toHaveBeenCalledWith({
      where: { componentInstanceId: 'ci-1' },
      data: { wiringStatus: 'PLANNED' },
    });
  });

  it('cascades IN_PROGRESS status to WIRED wiring', async () => {
    prismaMock.componentInstance.findUnique.mockResolvedValue({
      ...makeComponentInstance(),
      pinAssignments: [{ id: 'pin-1' }],
    } as any);
    prismaMock.componentInstance.update.mockResolvedValue(makeComponentInstance() as any);
    prismaMock.pinAssignment.updateMany.mockResolvedValue({ count: 1 });

    await buildProgressService.updateComponentStatus('ci-1', 'IN_PROGRESS');

    expect(prismaMock.pinAssignment.updateMany).toHaveBeenCalledWith({
      where: { componentInstanceId: 'ci-1' },
      data: { wiringStatus: 'WIRED' },
    });
  });

  it('cascades COMPLETE status to COMPLETE wiring', async () => {
    prismaMock.componentInstance.findUnique.mockResolvedValue({
      ...makeComponentInstance(),
      pinAssignments: [{ id: 'pin-1' }],
    } as any);
    prismaMock.componentInstance.update.mockResolvedValue(makeComponentInstance() as any);
    prismaMock.pinAssignment.updateMany.mockResolvedValue({ count: 1 });

    await buildProgressService.updateComponentStatus('ci-1', 'COMPLETE');

    expect(prismaMock.pinAssignment.updateMany).toHaveBeenCalledWith({
      where: { componentInstanceId: 'ci-1' },
      data: { wiringStatus: 'COMPLETE' },
    });
  });

  it('does NOT cascade wiring on HAS_ISSUES', async () => {
    prismaMock.componentInstance.findUnique.mockResolvedValue({
      ...makeComponentInstance(),
      pinAssignments: [{ id: 'pin-1' }],
    } as any);
    prismaMock.componentInstance.update.mockResolvedValue(makeComponentInstance() as any);

    await buildProgressService.updateComponentStatus('ci-1', 'HAS_ISSUES');

    expect(prismaMock.pinAssignment.updateMany).not.toHaveBeenCalled();
  });

  it('throws 404 for missing component', async () => {
    prismaMock.componentInstance.findUnique.mockResolvedValue(null);

    await expect(
      buildProgressService.updateComponentStatus('nonexistent', 'PLANNED'),
    ).rejects.toThrow('Component instance not found');
  });
});
