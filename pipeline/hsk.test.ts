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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAllHskMappings, loadHskMapping, parseHskMapping } from './hsk.js';

// Real entries copied verbatim (via a script, not by hand) from the pinned
// source files: 都 from hsk-1.json (3 forms — the DEC-022/都 worked
// example), 绿 from hsk-3.json (the ü-numeric-transcription case,
// SOURCE.md §5.1), 纽扣儿 from hsk-6.json (the one known trailing-bare-`er`
// inconsistency, SOURCE.md §5.2, and — separately — a word genuinely
// absent from CC-CEDICT, used by pipeline/match.test.ts's unmatched-word
// case).
const FIXTURE_PATH = resolve(import.meta.dirname, '../data/test-fixtures/hsk-sample.json');
const fixtureRaw = readFileSync(FIXTURE_PATH, 'utf-8');

describe('parseHskMapping — flattening forms[] into one row per (headword, level, reading)', () => {
  const rows = parseHskMapping(fixtureRaw, '1');

  it('produces one row per form, not one row per headword (criterion 1, SOURCE.md §6)', () => {
    // 都 (3 forms) + 绿 (1 form) + 纽扣儿 (1 form) = 5 rows from 3 entries.
    expect(rows).toHaveLength(5);
  });

  it('flattens a polyphonic headword (都) into three rows sharing the same headword and level', () => {
    const duRows = rows.filter((row) => row.headword === '都');
    expect(duRows).toHaveLength(3);
    expect(duRows.every((row) => row.level === '1')).toBe(true);
    expect(duRows.map((row) => row.readingNumeric).sort()).toEqual(['Du1', 'dou1', 'du1'].sort());
  });

  it('stamps every row with the level supplied by the caller, not read from the JSON', () => {
    const rows4 = parseHskMapping(fixtureRaw, '4');
    expect(rows4.every((row) => row.level === '4')).toBe(true);
  });
});

describe('parseHskMapping — ü transcription convention (criterion 1, SOURCE.md §5.1)', () => {
  it("leaves 绿's source-supplied numeric reading as the literal ü form (folding is a matching-key concern, not extraction)", () => {
    const rows = parseHskMapping(fixtureRaw, '3');
    const lu = rows.find((row) => row.headword === '绿');
    expect(lu?.readingNumeric).toBe('lü4');
  });
});

describe('parseHskMapping — erhua er/r5 equivalence (criterion 1, SOURCE.md §5.2)', () => {
  it('rewrites a trailing bare "er" to "r5" on extraction (the one known inconsistent entry, 纽扣儿)', () => {
    const rows = parseHskMapping(fixtureRaw, '6');
    const niukour = rows.find((row) => row.headword === '纽扣儿');
    expect(niukour?.readingNumeric).toBe('niu3 kou4 r5');
  });
});

describe('parseHskMapping — malformed source fails loudly', () => {
  it('throws on non-array JSON', () => {
    expect(() => parseHskMapping('{}', '1')).toThrow(/not a JSON array/);
  });

  it('throws when an entry is missing "simplified"', () => {
    expect(() => parseHskMapping('[{"forms":[]}]', '1')).toThrow(/missing "simplified"/);
  });

  it('throws when an entry has no forms', () => {
    expect(() => parseHskMapping('[{"simplified":"你"}]', '1')).toThrow(/missing "forms"/);
  });

  it('throws when a form is missing transcriptions.numeric', () => {
    const raw = JSON.stringify([{ simplified: '你', forms: [{ transcriptions: {} }] }]);
    expect(() => parseHskMapping(raw, '1')).toThrow(/missing "transcriptions.numeric"/);
  });
});

describe('loadHskMapping / loadAllHskMappings — the pinned real files (thin I/O shell)', () => {
  it('loads the real hsk-1.json and finds 都 with three forms', () => {
    const rows = loadHskMapping('1');
    const duRows = rows.filter((row) => row.headword === '都');
    expect(duRows).toHaveLength(3);
  });

  it('loads all six pinned levels and every row carries a matching level', () => {
    const rows = loadAllHskMappings();
    // SOURCE.md §2: 4,991 unique headwords, one row per (headword,
    // reading) pair, so total rows is >= total headwords (>= since some
    // headwords have multiple forms).
    expect(rows.length).toBeGreaterThanOrEqual(4991);
    for (const row of rows) {
      expect(['1', '2', '3', '4', '5', '6']).toContain(row.level);
    }
  });

  it('accepts an explicit source directory parameter, honoured rather than ignored', () => {
    // The fixture directory has no hsk-1.json (only hsk-sample.json), so
    // pointing loadHskMapping at it must fail exactly as reading a missing
    // file does — proving the parameter actually changes where it reads
    // from, rather than silently falling back to the pinned default.
    expect(() =>
      loadHskMapping('1', resolve(import.meta.dirname, '../data/test-fixtures')),
    ).toThrow();
    // And the real default path still works when the parameter is omitted.
    expect(() => loadHskMapping('1')).not.toThrow();
  });
});
