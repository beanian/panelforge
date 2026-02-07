import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';
import { vi } from 'vitest';

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

export const prismaMock = mockDeep<PrismaClient>();

// When $transaction is called with a callback, pass the mock as the `tx` argument
prismaMock.$transaction.mockImplementation(async (fn: any) => {
  if (typeof fn === 'function') {
    return fn(prismaMock);
  }
  return fn;
});

vi.mock('../lib/prisma', () => ({
  prisma: prismaMock,
}));
