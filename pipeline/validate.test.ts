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

import { describe, expect, it, vi } from 'vitest';
import { validate } from './validate.js';
import type { ValidateInput } from './validate.js';
import type { Card, HskLevel } from '../src/domain/card.js';

vi.mock('./hsk.js', () => ({
  loadAllHskMappings: () => [
    { headword: '你好', level: '1', readingNumeric: 'ni3 hao3' },
    { headword: '一', level: '1', readingNumeric: 'yi1' },
  ],
}));

function emptyCardsByLevel(
  overrides: Partial<Record<HskLevel, Card[]>> = {},
): Record<HskLevel, Card[]> {
  const base = {} as Record<HskLevel, Card[]>;
  for (const level of ['1', '2', '3', '4', '5', '6'] as const) base[level] = overrides[level] ?? [];
  return base;
}

function makeCard(overrides: Partial<Card>): Card {
  return {
    id: '你好:ni3hao3',
    headword: '你好',
    reading: 'nǐ hǎo',
    readingNumeric: 'ni3 hao3',
    senses: ['hello'],
    levels: ['1'],
    source: 'cc-cedict',
    review: 'unreviewed',
    ...overrides,
  };
}

function baseInput(overrides: Partial<ValidateInput> = {}): ValidateInput {
  return {
    cardsByLevel: emptyCardsByLevel(),
    unmatchedWords: [],
    unresolvedCrossReferences: [],
    conflictingEntries: [],
    waivers: {},
    ...overrides,
  };
}

describe('validate — gate 1, round-trip Pinyin', () => {
  it('passes a card whose reading round-trips cleanly', () => {
    const cards = [makeCard({})];
    const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel({ '1': cards }) }));
    expect(result.issues.filter((i) => i.gate === 'round-trip-pinyin')).toEqual([]);
  });

  it('fails a card whose readingNumeric does not round-trip', () => {
    const cards = [makeCard({ readingNumeric: 'not-valid-pinyin-zzz' })];
    const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel({ '1': cards }) }));
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.gate === 'round-trip-pinyin')).toBe(true);
  });
});

describe('validate — gate 2, uniqueness', () => {
  it('does not flag the same card object appearing in two levels (levels.length > 1)', () => {
    const card = makeCard({ levels: ['1', '2'] });
    const result = validate(
      baseInput({ cardsByLevel: emptyCardsByLevel({ '1': [card], '2': [card] }) }),
    );
    expect(result.issues.filter((i) => i.gate === 'uniqueness')).toEqual([]);
  });

  it('flags two different card objects sharing the same id', () => {
    const cardA = makeCard({ senses: ['hello'] });
    const cardB = makeCard({ senses: ['different content entirely'] });
    const result = validate(
      baseInput({ cardsByLevel: emptyCardsByLevel({ '1': [cardA], '2': [cardB] }) }),
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.gate === 'uniqueness')).toBe(true);
  });
});

describe('validate — gate 3, non-empty senses', () => {
  it('fails a card with zero senses', () => {
    const cards = [makeCard({ senses: [] })];
    const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel({ '1': cards }) }));
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.gate === 'non-empty-senses')).toBe(true);
  });
});

describe('validate — gate 4, no leaked dictionary syntax', () => {
  it.each(['a sense with CL:棵 embedded', 'a sense with a [bracket]', 'a sense with a | pipe'])(
    'fails on %s',
    (sense) => {
      const cards = [makeCard({ senses: [sense] })];
      const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel({ '1': cards }) }));
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.gate === 'no-leaked-syntax')).toBe(true);
    },
  );

  it('passes a clean sense', () => {
    const cards = [makeCard({ senses: ['a perfectly clean gloss'] })];
    const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel({ '1': cards }) }));
    expect(result.issues.filter((i) => i.gate === 'no-leaked-syntax')).toEqual([]);
  });
});

describe('validate — gate 5, headword sanity', () => {
  it('fails a headword with no CJK ideograph', () => {
    const cards = [makeCard({ headword: 'abc' })];
    const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel({ '1': cards }) }));
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.gate === 'headword-sanity')).toBe(true);
  });

  it('fails a headword containing a Latin letter mixed with CJK', () => {
    const cards = [makeCard({ headword: 'B格' })];
    const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel({ '1': cards }) }));
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.gate === 'headword-sanity')).toBe(true);
  });

  it('passes a plain CJK headword', () => {
    const cards = [makeCard({ headword: '你好' })];
    const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel({ '1': cards }) }));
    expect(result.issues.filter((i) => i.gate === 'headword-sanity')).toEqual([]);
  });
});

describe('validate — gate 8, nothing flagged', () => {
  it('fails a card with review: flagged', () => {
    const cards = [makeCard({ review: 'flagged' })];
    const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel({ '1': cards }) }));
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.gate === 'nothing-flagged')).toBe(true);
  });
});

describe('validate — gate 6, level coverage (mocked HSK mapping: 你好 + 一 at HSK 1)', () => {
  it('fails when a mapped word has no card, no recorded reason, and no waiver', () => {
    const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel() }));
    expect(result.ok).toBe(false);
    const messages = result.issues.filter((i) => i.gate === 'level-coverage').map((i) => i.message);
    expect(messages.some((m) => m.includes('你好'))).toBe(true);
    expect(messages.some((m) => m.includes('一'))).toBe(true);
  });

  it('passes when every mapped word has a card', () => {
    const cards = [
      makeCard({ id: '你好:ni3hao3', headword: '你好' }),
      makeCard({ id: '一:yi1', headword: '一', readingNumeric: 'yi1', reading: 'yī' }),
    ];
    const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel({ '1': cards }) }));
    expect(result.issues.filter((i) => i.gate === 'level-coverage')).toEqual([]);
  });

  it('passes an unresolved word when a waiver covers it at that level, and records it as a waived gap', () => {
    const cards = [makeCard({ id: '一:yi1', headword: '一' })]; // 你好 left unresolved
    const result = validate(
      baseInput({
        cardsByLevel: emptyCardsByLevel({ '1': cards }),
        unmatchedWords: [{ headword: '你好', level: '1', readingNumeric: 'ni3 hao3' }],
        waivers: {
          你好: {
            reason: 'unmatched',
            levels: ['1'],
            detail: 'test waiver',
            waivedBy: 'test',
            waivedAt: '2026-01-01',
            trackedIn: 'WO-000',
          },
        },
      }),
    );
    expect(result.issues.filter((i) => i.gate === 'level-coverage')).toEqual([]);
    expect(result.waivedGaps).toEqual([{ headword: '你好', level: '1', reason: 'unmatched' }]);
  });

  it('still fails when a waiver exists for a DIFFERENT level than the actual gap', () => {
    const result = validate(
      baseInput({
        cardsByLevel: emptyCardsByLevel({ '1': [makeCard({ id: '一:yi1', headword: '一' })] }),
        unmatchedWords: [{ headword: '你好', level: '1', readingNumeric: 'ni3 hao3' }],
        waivers: {
          你好: {
            reason: 'unmatched',
            levels: ['2'], // wrong level — must not silently cover level 1
            detail: 'test waiver',
            waivedBy: 'test',
            waivedAt: '2026-01-01',
            trackedIn: 'WO-000',
          },
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((i) => i.gate === 'level-coverage' && i.message.includes('你好')),
    ).toBe(true);
  });
});

describe('validate — gate 7, count tolerance', () => {
  // The mocked HSK mapping at the top of this file supplies only 2 words
  // for level 1 and none for levels 2-6 -- nowhere near the real corpus's
  // ~150/150/300/600/1300/2500, so gate 7 is EXPECTED to fire on every test
  // in this file (a real build's full six-level mapping wouldn't trigger
  // it, per pipeline/build-data.ts's full-corpus run). Asserted explicitly
  // here rather than treated as unwanted noise elsewhere in this file --
  // every other describe block filters to its own gate for exactly this
  // reason.
  it('fires when the mapped word count for a level is far outside tolerance of the expected figure', () => {
    const cards = [
      makeCard({ id: '你好:ni3hao3', headword: '你好' }),
      makeCard({ id: '一:yi1', headword: '一', readingNumeric: 'yi1', reading: 'yī' }),
    ];
    const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel({ '1': cards }) }));
    // Both level 1 (2 mocked words vs an expected ~150) and level 2 (0 vs
    // ~150) are far outside tolerance -- neither this mock nor a real
    // 2-word deck would ever pass gate 7, which is the point of the gate.
    expect(
      result.issues.some((i) => i.gate === 'count-tolerance' && i.message.includes('HSK 1')),
    ).toBe(true);
    expect(
      result.issues.some((i) => i.gate === 'count-tolerance' && i.message.includes('HSK 2')),
    ).toBe(true);
  });
});

describe('validate — every non-count-tolerance gate is clean on a fully correct level-1 input', () => {
  it('no issues from any gate except count-tolerance (an artefact of this test file only mocking 2 words)', () => {
    const cards = [
      makeCard({ id: '你好:ni3hao3', headword: '你好' }),
      makeCard({ id: '一:yi1', headword: '一', readingNumeric: 'yi1', reading: 'yī' }),
    ];
    const result = validate(baseInput({ cardsByLevel: emptyCardsByLevel({ '1': cards }) }));
    const realIssues = result.issues.filter((i) => i.gate !== 'count-tolerance');
    expect(realIssues).toEqual([]);
    expect(result.waivedGaps).toEqual([]);
  });
});
