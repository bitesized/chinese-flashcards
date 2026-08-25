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
 * `npm run build:hanzi` (DEC-035, M8) — emits `public/hanzi/{char}.json`
 * (one per individual character used across the compiled HSK decks) and
 * `public/hanzi/index.json` (every such character plus its reading(s), for
 * the Hanzi section's browsable/searchable lookup, FR-85, without fetching
 * all 2,619 per-character files up front). Run after `npm run build:data`
 * — it reads the compiled decks to know which characters are needed.
 *
 * Separate from `npm run build:data` deliberately: this reprocesses the
 * full ~125,000-entry CC-CEDICT file independently (buildHanziDictionary
 * needs every single-character entry, not just HSK-matched ones), which is
 * its own cost, and the Hanzi section has no dependency on the word-deck
 * pipeline's overrides/exclusions/review-status machinery.
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCedict } from './cedict.js';
import { buildHanziDictionary } from './hanzi-dictionary.js';
import type { HskLevel } from '../src/domain/card.js';

const HSK_LEVELS: readonly HskLevel[] = ['1', '2', '3', '4', '5', '6'];
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function collectNeededCharacters(): Set<string> {
  const chars = new Set<string>();
  for (const level of HSK_LEVELS) {
    const deckPath = resolve(REPO_ROOT, `public/decks/hsk-${level}.json`);
    const deck = JSON.parse(readFileSync(deckPath, 'utf-8')) as {
      cards: { headword: string }[];
    };
    for (const card of deck.cards) {
      for (const ch of card.headword) chars.add(ch);
    }
  }
  return chars;
}

function main(): void {
  const characters = collectNeededCharacters();
  const { entries } = loadCedict();
  const dictionary = buildHanziDictionary(characters, entries);

  const outDir = resolve(REPO_ROOT, 'public/hanzi');
  mkdirSync(outDir, { recursive: true });

  const index: { character: string; readings: string[] }[] = [];
  let missing = 0;
  for (const character of characters) {
    const entry = dictionary.get(character);
    if (!entry) {
      missing++;
      continue;
    }
    writeFileSync(resolve(outDir, `${character}.json`), JSON.stringify(entry, null, 2) + '\n');
    index.push({ character, readings: entry.readings.map((r) => r.reading) });
  }

  index.sort((a, b) => a.character.localeCompare(b.character));
  writeFileSync(resolve(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');

  console.log(`Hanzi dictionary: ${index.length}/${characters.size} characters written.`);
  if (missing > 0) {
    console.warn(
      `${missing} character(s) used in a headword have no CC-CEDICT entry of their own.`,
    );
  }
}

main();
