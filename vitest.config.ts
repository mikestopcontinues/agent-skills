import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['generator/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'claude/**', 'codex/**', 'opencode/**', 'tests/snapshots/**'],
  },
});
