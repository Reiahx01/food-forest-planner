// @ts-check
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Project ESLint config (flat config, ESLint v9).
 *
 * Rule firing contract enforced by `eslint.config.test.ts`. If you change a
 * rule severity here, run `npm test eslint.config` to verify the contract.
 *
 * Anti-generic Tailwind palette enforcement (the AGENTS.md DON'T list) is
 * NOT done here — the runtime check in `app/page.test.tsx` is the v1 gate.
 * A custom ESLint rule that catches it at lint-time is queued for v1.x.
 */
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'next-env.d.ts',
      'coverage/**',
      'public/**',
      '*.d.ts',
    ],
  },

  // JS recommended
  js.configs.recommended,

  // TypeScript strict + stylistic
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  // Project-wide rules + plugins
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      'import-x': importX,
      '@next/next': nextPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React recommended + new JSX transform (no React import needed)
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      'react/prop-types': 'off', // we use TS

      // React Hooks
      ...reactHooks.configs.recommended.rules,

      // JSX a11y — full recommended set
      ...jsxA11y.configs.recommended.rules,

      // Import order — group + alphabetise within group
      'import-x/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // Next.js recommended + Core Web Vitals
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // Test files — slightly relaxed (no-explicit-any allowed for fixtures)
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
