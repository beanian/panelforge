import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    alias: {
      '@panelforge/shared': path.resolve(__dirname, '../packages/shared/src'),
    },
  },
});
