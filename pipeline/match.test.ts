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
import { parseCedict } from './cedict.js';
import { buildHeadwordIndex, matchAndResolve } from './match.js';
import { computeCardId } from './identifiers.js';
import type { HskMappingRow } from './hsk.js';

const WO004_FIXTURE_PATH = resolve(import.meta.dirname, '../data/test-fixtures/cedict-entries.txt');
const CROSS_REFERENCE_FIXTURE_PATH = resolve(
  import.meta.dirname,
  '../data/test-fixtures/cedict-cross-reference.txt',
);

function loadFixture(path: string) {
  return parseCedict(readFileSync(path, 'utf-8'));
}

// Real CC-CEDICT lines, copied verbatim (source line numbers recorded
// below), covering the DEC-022 worked example (都: Du1 surname / dou1 "all"
// / du1 "capital"), the ü-vs-u:-vs-plain-u disambiguation case (绿:
// lu4 "used in names" / lu:4 "green"), and the real 里/li3 four-entry case
// (a cross-reference pointer, PLUS two unrelated substantive meanings that
// happen to share the identical simplified spelling AND reading because
// simplification collapsed 裡 and 里 onto one form, PLUS a distinct
// surname reading Li3). All real lines this project's pinned CC-CEDICT
// release actually contains.
const MATCHING_FIXTURE_RAW = `#! date=2026-08-23T06:21:07Z
都 都 [Du1] /surname Du/
都 都 [dou1] /all; both; entirely/(used for emphasis) even/already/(not) at all/
都 都 [du1] /capital city/metropolis/
綠 绿 [lu4] /used in names/
綠 绿 [lu:4] /green/(slang) (derived from 綠帽子|绿帽子[lu:4 mao4 zi5]) to cheat on (one's spouse or boyfriend or girlfriend)/
你好 你好 [ni3 hao3] /hello; hi/
裏 里 [li3] /variant of 裡|里[li3]/
裡 里 [li3] /lining/interior/inside/internal/also written 裏|里[li3]/
里 里 [Li3] /surname Li/
里 里 [li3] /li, ancient measure of length, approx. 500 m/neighborhood/ancient administrative unit of 25 families/
`;
// data/source/cedict/cedict_1_0_ts_utf-8_mdbg.txt line numbers: 都 triple
// at 109594-109596; 綠/绿 pair at 85915-85916; 你好 elsewhere in the file
// (also present, unmodified, in WO-004's own committed fixture); 里's four
// entries at 98509 (裏), 98700 (裡), 110438 (里 surname), 110439 (里 measure).

function matchingFixtureIndex() {
  const { entries } = parseCedict(MATCHING_FIXTURE_RAW);
  return { entries, index: buildHeadwordIndex(entries) };
}

describe('buildHeadwordIndex (stage 3)', () => {
  it('groups every CC-CEDICT entry under its simplified headword', () => {
    const { entries } = loadFixture(WO004_FIXTURE_PATH);
    const index = buildHeadwordIndex(entries);
    expect(index.get('行')).toHaveLength(3); // the real 行 triple, hang2/heng2/xing2
    expect(index.get('你好')).toHaveLength(1);
    expect(index.has('不存在的词')).toBe(false);
  });
});

describe('matchAndResolve — rule 1, source-supplied reading (criterion 3)', () => {
  it('都: each of the three source-supplied readings resolves to its own correct single card', () => {
    const { index } = matchingFixtureIndex();
    const rows: HskMappingRow[] = [
      { headword: '都', level: '1', readingNumeric: 'Du1' },
      { headword: '都', level: '1', readingNumeric: 'dou1' },
      { headword: '都', level: '1', readingNumeric: 'du1' },
    ];

    const { cards, unmatchedWords } = matchAndResolve(rows, index);

    expect(unmatchedWords).toEqual([]);
    expect(cards).toHaveLength(3);

    const surname = cards.find((c) => c.senses.includes('surname Du'));
    const all = cards.find((c) => c.senses.includes('all; both; entirely'));
    const capital = cards.find((c) => c.senses.includes('capital city'));

    expect(surname).toBeDefined();
    expect(all).toBeDefined();
    expect(capital).toBeDefined();
    // Case-sensitive matching (see pipeline/match.ts's module docstring)
    // must NOT merge Du1 (surname) into du1 (capital city) or vice versa —
    // each keeps its own, un-merged senses.
    expect(surname?.senses).toEqual(['surname Du']);
    expect(capital?.senses).toEqual(['capital city', 'metropolis']);
    expect(surname?.readingNumeric).toBe('Du1');
    expect(capital?.readingNumeric).toBe('du1');
  });

  it('绿: the ü-fold correctly matches only the green entry (lu:4), not the unrelated lu4 entry', () => {
    const { index } = matchingFixtureIndex();
    // HSK source writes ü literally, per SOURCE.md §5.1.
    const rows: HskMappingRow[] = [{ headword: '绿', level: '3', readingNumeric: 'lü4' }];

    const { cards, unmatchedWords } = matchAndResolve(rows, index);

    expect(unmatchedWords).toEqual([]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.senses).toEqual([
      'green',
      "(slang) (derived from 绿帽子) to cheat on (one's spouse or boyfriend or girlfriend)",
    ]);
    expect(cards[0]?.readingNumeric).toBe('lu:4'); // shipped value is CC-CEDICT's own, never the HSK source's
  });

  it('a row whose supplied reading matches no candidate is unmatched, not merged into an unrelated reading', () => {
    const { index } = matchingFixtureIndex();
    const rows: HskMappingRow[] = [{ headword: '都', level: '1', readingNumeric: 'tu1' }];

    const { cards, unmatchedWords } = matchAndResolve(rows, index);

    expect(cards).toEqual([]);
    expect(unmatchedWords).toEqual([{ headword: '都', level: '1', readingNumeric: 'tu1' }]);
  });
});

describe('matchAndResolve — DEC-022: review status never depends on resolution path (criterion 5)', () => {
  it('a source-supplied-reading match still gets review: "unreviewed", not pre-approved', () => {
    const { index } = matchingFixtureIndex();
    const rows: HskMappingRow[] = [{ headword: '都', level: '1', readingNumeric: 'dou1' }];

    const { cards } = matchAndResolve(rows, index);

    expect(cards).toHaveLength(1);
    expect(cards[0]?.review).toBe('unreviewed');
  });

  it('an ambiguous (no-source-reading) match also gets review: "unreviewed"', () => {
    const { index } = matchingFixtureIndex();
    const rows: HskMappingRow[] = [{ headword: '都', level: '1' }];

    const { cards } = matchAndResolve(rows, index);

    expect(cards).toHaveLength(3);
    expect(cards.every((c) => c.review === 'unreviewed')).toBe(true);
  });
});

describe('matchAndResolve — rule 2, ambiguous / no source reading (criteria 4, 11)', () => {
  it('行: with no source reading, all three real CC-CEDICT readings become separate cards sharing one homographGroup', () => {
    const { entries } = loadFixture(WO004_FIXTURE_PATH);
    const index = buildHeadwordIndex(entries);
    const rows: HskMappingRow[] = [{ headword: '行', level: '4' }];

    const { cards, unmatchedWords } = matchAndResolve(rows, index);

    expect(unmatchedWords).toEqual([]);
    expect(cards).toHaveLength(3);

    const readings = cards.map((c) => c.readingNumeric).sort();
    expect(readings).toEqual(['hang2', 'heng2', 'xing2']);

    const ids = new Set(cards.map((c) => c.id));
    expect(ids.size).toBe(3); // distinct ids (criterion 9)

    const groups = new Set(cards.map((c) => c.homographGroup));
    expect(groups.size).toBe(1);
    expect([...groups][0]).toBe('行');

    // Senses never merged across readings (data-pipeline.md §5.2 rule 3).
    const hang2 = cards.find((c) => c.readingNumeric === 'hang2');
    const xing2 = cards.find((c) => c.readingNumeric === 'xing2');
    const heng2 = cards.find((c) => c.readingNumeric === 'heng2');
    expect(hang2?.senses.some((s) => s.includes('row'))).toBe(true);
    expect(xing2?.senses.some((s) => s.includes('to walk'))).toBe(true);
    expect(heng2?.senses).toEqual(['used in 道行']);
    expect(hang2?.senses).not.toEqual(xing2?.senses);
  });
});

describe('matchAndResolve — 都 Du1/du1, DEC-024 regression', () => {
  it('都 Du1 (surname) and du1 (capital city) are two distinct, un-merged cards with distinct ids', () => {
    const { index } = matchingFixtureIndex();
    const rows: HskMappingRow[] = [
      { headword: '都', level: '1', readingNumeric: 'Du1' },
      { headword: '都', level: '1', readingNumeric: 'du1' },
    ];

    const { cards } = matchAndResolve(rows, index);

    expect(cards).toHaveLength(2);
    // Before DEC-024, domain-model.md §5's id scheme lowercased the reading
    // for id purposes, so both normalised to the same id — a real defect
    // surfaced by this exact case (WO-007 report Findings). DEC-024
    // corrected the scheme to preserve case, since it's the only signal
    // distinguishing a proper-noun/surname reading from a common one. This
    // test now guards both properties: distinct ids, AND that the two were
    // always two distinct, correctly-populated cards (different senses,
    // different readingNumeric) rather than one silently overwriting the
    // other.
    expect(computeCardId('都', 'Du1')).not.toBe(computeCardId('都', 'du1'));
    expect(cards[0]?.id).not.toBe(cards[1]?.id);
    expect(new Set(cards.map((c) => c.id)).size).toBe(2);
    expect(new Set(cards.map((c) => c.senses.join('|'))).size).toBe(2);
    expect(new Set(cards.map((c) => c.readingNumeric))).toEqual(new Set(['Du1', 'du1']));
  });
});

describe('matchAndResolve — cross-reference resolution (criteria 6, 7)', () => {
  it('a resolvable cross-reference (B格 -> 逼格) adopts the target senses, source cc-cedict+override', () => {
    const { entries } = loadFixture(CROSS_REFERENCE_FIXTURE_PATH);
    const index = buildHeadwordIndex(entries);
    const rows: HskMappingRow[] = [{ headword: 'B格', level: '6', readingNumeric: 'bi1 ge2' }];

    const { cards, unresolvedCrossReferences } = matchAndResolve(rows, index);

    expect(unresolvedCrossReferences).toEqual([]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.senses).toEqual(['(slang) pretentious style']);
    expect(cards[0]?.source).toBe('cc-cedict+override');
    expect(cards[0]?.headword).toBe('B格'); // adopts the target's SENSES only, not its headword/reading
    expect(cards[0]?.readingNumeric).toBe('bi1 ge2');
  });

  it('an unresolvable cross-reference (B格 with no 逼格 in the index) is recorded, never shipped as a raw pointer', () => {
    const { entries } = loadFixture(WO004_FIXTURE_PATH); // WO-004's own fixture omits the target
    const index = buildHeadwordIndex(entries);
    const rows: HskMappingRow[] = [{ headword: 'B格', level: '6', readingNumeric: 'bi1 ge2' }];

    const { cards, unresolvedCrossReferences } = matchAndResolve(rows, index);

    expect(cards).toEqual([]); // never shipped
    expect(unresolvedCrossReferences).toHaveLength(1);
    expect(unresolvedCrossReferences[0]).toMatchObject({
      headword: 'B格',
      readingNumeric: 'bi1 ge2',
      levels: ['6'],
      senseText: 'variant of 逼格',
    });
  });
});

describe('matchAndResolve — unmatched HSK word (criterion 7)', () => {
  it('a headword absent from CC-CEDICT entirely is recorded, does not crash the run', () => {
    const { index } = matchingFixtureIndex(); // no 纽扣儿 or 纽扣 in this fixture
    const rows: HskMappingRow[] = [
      { headword: '纽扣儿', level: '6', readingNumeric: 'niu3 kou4 r5' },
    ];

    const { cards, unmatchedWords } = matchAndResolve(rows, index);

    expect(cards).toEqual([]);
    expect(unmatchedWords).toEqual([
      { headword: '纽扣儿', level: '6', readingNumeric: 'niu3 kou4 r5' },
    ]);
  });

  it('one unmatched row does not abort matching of the other rows in the same run', () => {
    const { index } = matchingFixtureIndex();
    const rows: HskMappingRow[] = [
      { headword: '纽扣儿', level: '6', readingNumeric: 'niu3 kou4 r5' },
      { headword: '你好', level: '1', readingNumeric: 'ni3 hao3' },
    ];

    const { cards, unmatchedWords } = matchAndResolve(rows, index);

    expect(unmatchedWords).toHaveLength(1);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.headword).toBe('你好');
  });
});

describe('matchAndResolve — classifiers carry through (criterion 12)', () => {
  it('书 keeps its classifiers, with a diacritic reading added via numberedToDiacritic', () => {
    const { entries } = loadFixture(WO004_FIXTURE_PATH);
    const index = buildHeadwordIndex(entries);
    const rows: HskMappingRow[] = [{ headword: '书', level: '1', readingNumeric: 'shu1' }];

    const { cards } = matchAndResolve(rows, index);

    expect(cards).toHaveLength(1);
    expect(cards[0]?.classifiers).toEqual([
      { simplified: '本', traditional: '本', readingNumeric: 'ben3', reading: 'běn' },
      { simplified: '册', traditional: '冊', readingNumeric: 'ce4', reading: 'cè' },
      { simplified: '部', traditional: '部', readingNumeric: 'bu4', reading: 'bù' },
    ]);
  });
});

describe('matchAndResolve — levels array (multi-level word)', () => {
  it('the same resolved card accumulates every level it is referenced from', () => {
    const { index } = matchingFixtureIndex();
    const rows: HskMappingRow[] = [
      { headword: '你好', level: '1', readingNumeric: 'ni3 hao3' },
      { headword: '你好', level: '2', readingNumeric: 'ni3 hao3' },
    ];

    const { cards } = matchAndResolve(rows, index);

    expect(cards).toHaveLength(1);
    expect(cards[0]?.levels).toEqual(['1', '2']);
  });
});

describe('matchAndResolve — same (headword, reading), multiple distinct CC-CEDICT entries', () => {
  it('里/Li3: the surname reading is distinct (different case) and resolves cleanly on its own', () => {
    const { index } = matchingFixtureIndex();
    const rows: HskMappingRow[] = [{ headword: '里', level: '1', readingNumeric: 'Li3' }];

    const { cards, conflictingEntries } = matchAndResolve(rows, index);

    expect(conflictingEntries).toEqual([]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.senses).toEqual(['surname Li']);
  });

  it('里/li3 (lowercase): a cross-reference pointer entry (裏) coexisting with ONE substantive entry is resolved by dropping the redundant pointer', () => {
    // Using only 裏 (pointer, "variant of 裡|里") and 里-measure-word
    // (substantive) — no 裡 — isolates the "1 real entry + N pointers"
    // path from the "genuinely >1 real entries" conflict path below.
    const { entries } = parseCedict(`#! date=2026-08-23T06:21:07Z
裏 里 [li3] /variant of 裡|里[li3]/
里 里 [li3] /li, ancient measure of length, approx. 500 m/neighborhood/
`);
    const index = buildHeadwordIndex(entries);
    const rows: HskMappingRow[] = [{ headword: '里', level: '1', readingNumeric: 'li3' }];

    const { cards, conflictingEntries, unresolvedCrossReferences } = matchAndResolve(rows, index);

    expect(conflictingEntries).toEqual([]);
    expect(unresolvedCrossReferences).toEqual([]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.senses).toEqual([
      'li, ancient measure of length, approx. 500 m',
      'neighborhood',
    ]);
  });

  it('里/li3 (lowercase): two genuinely different substantive entries (裡 "interior" vs 里 "measure of distance") are a real conflict, never merged or guessed at', () => {
    const { index } = matchingFixtureIndex(); // has all four real 里 entries
    const rows: HskMappingRow[] = [{ headword: '里', level: '1', readingNumeric: 'li3' }];

    const { cards, conflictingEntries } = matchAndResolve(rows, index);

    expect(cards).toEqual([]); // neither candidate ships
    expect(conflictingEntries).toHaveLength(1);
    expect(conflictingEntries[0]).toMatchObject({
      headword: '里',
      readingNumeric: 'li3',
      levels: ['1'],
    });
    const sensesSets = conflictingEntries[0]?.candidates.map((c) => c.senses);
    expect(sensesSets).toContainEqual([
      'lining',
      'interior',
      'inside',
      'internal',
      'also written 里',
    ]);
    expect(sensesSets).toContainEqual([
      'li, ancient measure of length, approx. 500 m',
      'neighborhood',
      'ancient administrative unit of 25 families',
    ]);
  });

  it('multiple HSK rows all asking for the same (headword, reading) do not fragment into duplicate conflict reports', () => {
    const { index } = matchingFixtureIndex();
    const rows: HskMappingRow[] = [
      { headword: '里', level: '1', readingNumeric: 'li3' },
      { headword: '里', level: '1', readingNumeric: 'li3' }, // e.g. two forms in the source sharing a reading
    ];

    const { conflictingEntries } = matchAndResolve(rows, index);

    expect(conflictingEntries).toHaveLength(1); // one conflict record, not two
  });
});
