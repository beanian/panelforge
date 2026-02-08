import { describe, it, expect } from 'vitest';
import { prismaMock } from '../test/prisma-mock';
import { mosfetService } from './mosfet.service';

describe('mosfetService.remove', () => {
  it('deletes board with no channels in use', async () => {
    prismaMock.mosfetBoard.findUnique.mockResolvedValue({
      id: 'mb-1',
      name: 'MOSFET Alpha',
      channelCount: 8,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      channels: [],
    } as any);

    prismaMock.mosfetChannel.deleteMany.mockResolvedValue({ count: 8 });
    prismaMock.mosfetBoard.delete.mockResolvedValue({} as any);

    await mosfetService.remove('mb-1');
    expect(prismaMock.mosfetChannel.deleteMany).toHaveBeenCalledWith({
      where: { mosfetBoardId: 'mb-1' },
    });
    expect(prismaMock.mosfetBoard.delete).toHaveBeenCalledWith({
      where: { id: 'mb-1' },
    });
  });

  it('throws 404 for missing board', async () => {
    prismaMock.mosfetBoard.findUnique.mockResolvedValue(null);
    await expect(mosfetService.remove('nonexistent')).rejects.toThrow(
      'MOSFET board not found',
    );
  });

  it('throws 409 when channels are in use', async () => {
    prismaMock.mosfetBoard.findUnique.mockResolvedValue({
      id: 'mb-1',
      name: 'MOSFET Alpha',
      channelCount: 8,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      channels: [{ id: 'ch-1' }],
    } as any);

    await expect(mosfetService.remove('mb-1')).rejects.toThrow(
      /Cannot delete.*1 channel\(s\) are in use/,
    );
  });
});
