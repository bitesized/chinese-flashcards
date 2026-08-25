#!/usr/bin/env node
/**
 * Chinese Flashcards — a spaced-repetition Hanzi flashcard app.
 * Copyright (C) 2026 the Chinese Flashcards contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Extracts stroke-order data (DEC-035) for exactly the individual Hanzi
 * characters used across the compiled HSK 1-6 decks, from the
 * `hanzi-writer-data` package — which is NOT a project dependency
 * (package.json never lists it; `data/source/hanzi-writer-data/SOURCE.md`
 * pins the exact version this was run against). Re-run this manually,
 * after `npm run build:data`, whenever HSK vocabulary changes:
 *
 *   npm install hanzi-writer-data@<pinned version> --no-save
 *   node scripts/extract-strokes.mjs
 *   rm -rf node_modules/hanzi-writer-data
 *
 * Output (`public/strokes/*.json`) is committed, like `public/decks/*.json`
 * — the app never depends on this script or hanzi-writer-data at runtime.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DECKS_DIR = resolve(REPO_ROOT, 'public/decks');
const OUT_DIR = resolve(REPO_ROOT, 'public/strokes');
const DATA_PKG_DIR = resolve(REPO_ROOT, 'node_modules/hanzi-writer-data');

const HSK_LEVELS = ['1', '2', '3', '4', '5', '6'];

function collectNeededCharacters() {
  const chars = new Set();
  for (const level of HSK_LEVELS) {
    const deck = JSON.parse(readFileSync(resolve(DECKS_DIR, `hsk-${level}.json`), 'utf-8'));
    for (const card of deck.cards) {
      for (const ch of card.headword) {
        chars.add(ch);
      }
    }
  }
  return chars;
}

function main() {
  if (!existsSync(DATA_PKG_DIR)) {
    console.error(
      'hanzi-writer-data not found in node_modules. Install it first:\n' +
        '  npm install hanzi-writer-data@<pinned version> --no-save\n' +
        '(see data/source/hanzi-writer-data/SOURCE.md for the pinned version)',
    );
    process.exit(1);
  }

  const needed = collectNeededCharacters();
  mkdirSync(OUT_DIR, { recursive: true });

  let extracted = 0;
  const missing = [];
  for (const ch of needed) {
    const srcPath = resolve(DATA_PKG_DIR, `${ch}.json`);
    if (!existsSync(srcPath)) {
      missing.push(ch);
      continue;
    }
    // Copied verbatim, not parsed/re-serialised — this is pinned upstream
    // data (data-pipeline.md's own convention for source material), not
    // something this project transforms.
    writeFileSync(resolve(OUT_DIR, `${ch}.json`), readFileSync(srcPath));
    extracted++;
  }

  console.log(`Extracted ${extracted}/${needed.size} needed characters into public/strokes/.`);
  if (missing.length > 0) {
    console.warn(
      `${missing.length} character(s) have no stroke data in hanzi-writer-data: ${missing.join(', ')}`,
    );
  }
}

main();
