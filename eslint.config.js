// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';

export default tseslint.config(
  {
    ignores: [
      'claude/**',
      'codex/**',
      'opencode/**',
      'node_modules/**',
      'tests/snapshots/**',
      'generator/scripts/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**/*.test.ts', 'generator/**/*.test.ts'],
    plugins: { vitest },
    rules: vitest.configs.recommended.rules,
  },
);
