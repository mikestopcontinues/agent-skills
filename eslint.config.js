// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'tests/snapshots/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    plugins: { vitest },
    rules: vitest.configs.recommended.rules,
  },
);
