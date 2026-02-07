import { beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import { prismaMock } from './prisma-mock';

beforeEach(() => {
  mockReset(prismaMock);

  // Re-apply $transaction mock after reset
  prismaMock.$transaction.mockImplementation(async (fn: any) => {
    if (typeof fn === 'function') {
      return fn(prismaMock);
    }
    return fn;
  });
});
