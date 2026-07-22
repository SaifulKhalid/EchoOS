/**
 * ESLint flat config — EchoOS.
 *
 * Rules:
 *   • TypeScript strict (via typescript-eslint)
 *   • React Hooks best practices
 *   • Vite React Refresh compatibility
 *   • Config files (vite.config.ts, vitest configs) use Node globals
 */

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignore patterns
  { ignores: ['dist', 'node_modules', '*.tsbuildinfo'] },

  // Base JS/TS recommended rules for source files
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks — enforce Rules of Hooks and exhaustive deps
      ...reactHooks.configs.recommended.rules,

      // Vite React Refresh — components must be named exports
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          // App.tsx exports `App`, router.tsx exports `router`
          allowExportNames: ['App', 'router'],
        },
      ],

      // Allow async event handlers, firebase patterns, etc.
      '@typescript-eslint/no-floating-promises': 'off',

      // _ prefixed args are explicitly ignored (unused callback params)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },

  // Node.js config files (vite, vitest, postcss, tailwind)
  {
    files: [
      'vite.config.ts',
      'vitest.config.ts',
      'vitest.setup.ts',
      'postcss.config.js',
      'tailwind.config.js',
      'eslint.config.js',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Allow require-style imports in CJS-lite files
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
