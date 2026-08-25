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

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PinyinFormatError,
  diacriticToNumbered,
  numberedToDiacritic,
  pinyinRoundTripsCleanly,
} from './pinyin';

// Table-driven fixtures owned by this work order (WO-005), covering every
// rule in data-pipeline.md §3 and every worked example named there. Each
// case is expected to round-trip exactly unless noted otherwise.
const OWN_CASES: ReadonlyArray<{
  readonly rule: string;
  readonly numbered: string;
  readonly diacritic: string;
  readonly roundTrips?: boolean;
}> = [
  // Rule 1: u: -> ü, before tone placement. Order matters — getting it
  // backwards would try to place a tone mark on a colon or leave "u:"
  // untouched, producing visibly wrong output.
  { rule: '1 (u: -> ü)', numbered: 'lu:4', diacritic: 'lǜ' },
  { rule: '1 (u: -> ü)', numbered: 'nu:3', diacritic: 'nǚ' },
  { rule: '1 (u: -> ü, tone 1)', numbered: 'lu:1', diacritic: 'lǖ' },
  { rule: '1 (u: -> ü, tone 2)', numbered: 'lu:2', diacritic: 'lǘ' },
  // jqxy + bare u: no colon in the source, so no ü substitution applies —
  // confirmed to need no special-case code (WO-005 notes), the plain-u
  // tone table is used because there is nothing to substitute.
  { rule: '1 (jqxy+u, no colon -> plain u)', numbered: 'qu1', diacritic: 'qū' },
  { rule: '1 (jqxy+u, no colon -> plain u)', numbered: 'ju2', diacritic: 'jú' },
  { rule: '1 (jqxy+u, no colon -> plain u)', numbered: 'xu3', diacritic: 'xǔ' },
  { rule: '1 (jqxy+u, no colon -> plain u)', numbered: 'yu4', diacritic: 'yù' },

  // Rule 2: neutral tone / no digit produces no mark.
  { rule: '2 (explicit tone 5)', numbered: 'ma5', diacritic: 'ma' },
  { rule: '2 (explicit tone 5)', numbered: 'ba5', diacritic: 'ba' },
  // Bare, digit-less input is a defensive case only (does not occur in
  // CC-CEDICT's own data) and intentionally does not round-trip back to
  // itself — the reverse direction always emits an explicit digit. See the
  // dedicated round-trip-asymmetry test below.
  { rule: '2 (no digit at all)', numbered: 'ma', diacritic: 'ma', roundTrips: false },

  // Rule 3: `a` takes priority over every other vowel, wherever it sits.
  { rule: '3 (a-priority)', numbered: 'hao3', diacritic: 'hǎo' },
  { rule: '3 (a not first letter)', numbered: 'tian1', diacritic: 'tiān' },
  { rule: '3 (a in the middle)', numbered: 'kuai4', diacritic: 'kuài' },

  // Rule 4: o or e, when no a is present.
  { rule: '4 (o-priority)', numbered: 'shuo1', diacritic: 'shuō' },
  { rule: '4 (e-priority)', numbered: 'gei3', diacritic: 'gěi' },
  { rule: '4 (o beats a later u)', numbered: 'ou1', diacritic: 'ōu' },

  // Rule 5: last vowel, when none of a/o/e is present.
  { rule: '5 (last vowel, iu -> u)', numbered: 'liu4', diacritic: 'liù' },
  { rule: '5 (last vowel, ui -> i)', numbered: 'dui4', diacritic: 'duì' },

  // Rule 6: capitalisation preserved, including on a single-syllable
  // surname and inside a multi-syllable proper noun.
  { rule: '6 (capitalised proper noun)', numbered: 'Zhong1 guo2', diacritic: 'Zhōng guó' },
  { rule: '6 (single-syllable surname)', numbered: 'Wang2', diacritic: 'Wáng' },
  // A capitalised syllable whose tone-marked vowel IS the first letter —
  // not present in any real CC-CEDICT headword in the corpus checked, but
  // rule 6 makes no exception for it, so it is pinned here defensively.
  { rule: '6 (capitalised first-letter vowel)', numbered: 'Ai4', diacritic: 'Ài' },
  { rule: '6 (capitalised first-letter ü)', numbered: 'U:3', diacritic: 'Ǚ' },

  // Rule 7: single-space join across syllables.
  { rule: '7 (two-syllable join)', numbered: 'ni3 hao3', diacritic: 'nǐ hǎo' },
  { rule: '7 (three-syllable join)', numbered: 'tu2 shu1 guan3', diacritic: 'tú shū guǎn' },

  // Rule 8: erhua fuses with no space and no mark of its own, distinct from
  // the standalone 儿 syllable which is an ordinary tone-bearing syllable.
  { rule: '8 (erhua fusion)', numbered: 'yi1 hui4 r5', diacritic: 'yī huìr' },
  { rule: '8 (erhua, contrast with standalone 儿)', numbered: 'er2', diacritic: 'ér' },
];

describe('numberedToDiacritic', () => {
  it.each(OWN_CASES)('$rule: $numbered -> $diacritic', ({ numbered, diacritic }) => {
    expect(numberedToDiacritic(numbered)).toBe(diacritic);
  });

  it('rejects empty input', () => {
    expect(() => numberedToDiacritic('')).toThrow(PinyinFormatError);
    expect(() => numberedToDiacritic('   ')).toThrow(PinyinFormatError);
  });

  it('rejects an erhua suffix with no preceding syllable', () => {
    expect(() => numberedToDiacritic('r5')).toThrow(PinyinFormatError);
  });

  it('rejects an out-of-range tone digit', () => {
    expect(() => numberedToDiacritic('ma6')).toThrow(PinyinFormatError);
    expect(() => numberedToDiacritic('ma0')).toThrow(PinyinFormatError);
  });

  it('rejects a syllable with no vowel to carry a tone mark', () => {
    expect(() => numberedToDiacritic('ng2')).toThrow(PinyinFormatError);
  });

  it('rejects a colon that is not in the "u:" position', () => {
    expect(() => numberedToDiacritic('a:1')).toThrow(PinyinFormatError);
    expect(() => numberedToDiacritic(':u1')).toThrow(PinyinFormatError);
  });

  it('rejects characters outside a-z, u:, and tone digits', () => {
    expect(() => numberedToDiacritic('ma1!')).toThrow(PinyinFormatError);
    expect(() => numberedToDiacritic('妈1')).toThrow(PinyinFormatError);
  });
});

describe('diacriticToNumbered (round-trip inverse)', () => {
  const roundTrippingCases = OWN_CASES.filter((c) => c.roundTrips !== false);

  it.each(roundTrippingCases)('$rule: $diacritic -> $numbered', ({ numbered, diacritic }) => {
    expect(diacriticToNumbered(diacritic)).toBe(numbered);
  });

  it('reconstructs erhua as a separate, space-joined r5 token', () => {
    expect(diacriticToNumbered('yī huìr')).toBe('yi1 hui4 r5');
  });

  it('does not confuse the standalone 儿 syllable with erhua fusion', () => {
    expect(diacriticToNumbered('ér')).toBe('er2');
    expect(diacriticToNumbered('èr')).toBe('er4');
  });
});

describe('pinyinRoundTripsCleanly', () => {
  it('is true for every case where the numbered form round-trips exactly', () => {
    for (const { numbered, roundTrips } of OWN_CASES) {
      if (roundTrips === false) continue;
      expect(pinyinRoundTripsCleanly(numbered)).toBe(true);
    }
  });

  it('is false for the documented no-digit asymmetry (defensive fixture only)', () => {
    // "ma" (no digit) forward-converts to "ma", but the reverse direction
    // always emits an explicit tone digit ("ma5") per CC-CEDICT's own
    // convention — see convertSyllableBack's docstring in pinyin.ts. This
    // never occurs in real corpus data, which always carries an explicit
    // digit, so it costs the round-trip gate nothing in practice.
    expect(pinyinRoundTripsCleanly('ma')).toBe(false);
  });

  it('is false, not throwing, for input the converter cannot parse', () => {
    expect(pinyinRoundTripsCleanly('')).toBe(false);
    expect(pinyinRoundTripsCleanly('not pinyin!!!')).toBe(false);
  });
});

// --- Reconciliation against Red's test table (WO-006) --------------------
//
// WO-005's acceptance criterion 10: this implementation is not "Done" until
// every row of data/test-fixtures/pinyin-conversion.json passes unmodified.
// That file is WO-006's own deliverable and is not committed on this
// branch (it belongs to Red's/Claude Code's own commit) — read it from disk
// at test time instead of importing it, and skip gracefully rather than
// failing the whole suite if it is not present, so this branch stays
// independently buildable regardless of WO-006's landing order.
// Resolved relative to the repo root (process.cwd()), which is how both
// `npm test` locally and the CI workflow always invoke Vitest.
const FIXTURE_PATH = resolve(process.cwd(), 'data/test-fixtures/pinyin-conversion.json');
const fixtureAvailable = existsSync(FIXTURE_PATH);

interface RedFixtureCase {
  readonly input: string;
  readonly expected: string;
  readonly rule: string;
  readonly note: string;
}

interface RedFixtureFile {
  readonly cases: readonly RedFixtureCase[];
}

describe.skipIf(!fixtureAvailable)('reconciliation against Red’s test table (WO-006)', () => {
  const fixture = fixtureAvailable
    ? (JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as RedFixtureFile)
    : { cases: [] };

  it('loaded at least one case (guards against a silently empty fixture)', () => {
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  it.each(fixture.cases)('$rule: $input -> $expected ($note)', ({ input, expected }) => {
    expect(numberedToDiacritic(input)).toBe(expected);
  });
});

// If the block above was skipped, Vitest reports it as a skipped suite in
// the run output — that is the signal that reconciliation did not execute.
// See the WO-005 work report for whether that is expected (WO-006 not yet
// landed on this branch) or a regression.
