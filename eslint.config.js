import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import headers from 'eslint-plugin-headers';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// The GPL-3.0 notice every source file under src/, pipeline/, and tests/
// must carry (conventions.md §4). Applied and checked by the `headers`
// plugin below rather than by hand. data/ and public/decks/ are excluded —
// they are CC BY-SA 4.0 (WO-002).
const gplHeader = `Chinese Flashcards — a spaced-repetition Hanzi flashcard app.
Copyright (C) 2026 the Chinese Flashcards contributors.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.`;

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'public/**',
      'data/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '**/*.gitkeep',
      // Compiled by tsconfig.build-data.json (npm run build:data), in place
      // next to their .ts sources so import.meta.url-relative paths into
      // data/ resolve correctly — see pipeline/build-data.ts. Generated,
      // gitignored, not this project's lint surface.
      'pipeline/**/*.js',
      'src/domain/**/*.js',
    ],
  },

  js.configs.recommended,

  // Type-aware TypeScript rules, restricted to actual TS/TSX files so config
  // files parsed as plain JS (this file included) are not forced through the
  // TS project service.
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // No `any` in committed code (conventions.md §2) — recommendedTypeChecked
      // already errors on this; restated here so it can never be silently
      // downgraded by a future config edit.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Plain JS config and tooling scripts (this file, vite/playwright configs,
  // scripts/) run under Node, untyped.
  {
    files: ['*.config.js', '*.config.mjs', 'scripts/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // GPL-3.0 header, application/pipeline/test source only.
  {
    files: ['src/**/*.{ts,tsx}', 'pipeline/**/*.ts', 'tests/**/*.{ts,tsx}'],
    plugins: { headers },
    rules: {
      'headers/header-format': [
        'error',
        {
          source: 'string',
          content: gplHeader,
        },
      ],
    },
  },

  // Must be last: turns off stylistic rules that would otherwise fight
  // Prettier (conventions.md §2 — formatting is never a review topic).
  prettier,
);
