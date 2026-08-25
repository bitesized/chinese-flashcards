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

import { describe, expect, it } from 'vitest';
import { parseCedict } from './cedict.js';
import { buildCards, loadAndBuildCards } from './build-cards.js';
import type { HskMappingRow } from './hsk.js';
import type { OverridesFile } from './overrides.js';

const RAW = `#! date=2026-08-23T06:21:07Z
都 都 [Du1] /surname Du/
都 都 [dou1] /all; both; entirely/(used for emphasis) even/already/(not) at all/
都 都 [du1] /capital city/metropolis/
你好 你好 [ni3 hao3] /hello; hi/
`;

describe('buildCards — stages 3-6 end to end (criterion 13: output shape)', () => {
  it('groups cards by every level in Record<HskLevel, Card[]>, including empty levels', () => {
    const { entries } = parseCedict(RAW);
    const hskMappingRows: HskMappingRow[] = [
      { headword: '你好', level: '1', readingNumeric: 'ni3 hao3' },
      { headword: '都', level: '1', readingNumeric: 'dou1' },
    ];

    const result = buildCards({
      cedictEntries: entries,
      hskMappingRows,
      overrides: {},
      exclusions: {},
    });

    expect(Object.keys(result.cardsByLevel).sort()).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(result.cardsByLevel['1']).toHaveLength(2);
    expect(result.cardsByLevel['2']).toEqual([]);
  });

  it('sorts cards within a level by id, deterministically', () => {
    const { entries } = parseCedict(RAW);
    const hskMappingRows: HskMappingRow[] = [
      { headword: '你好', level: '1', readingNumeric: 'ni3 hao3' },
      { headword: '都', level: '1', readingNumeric: 'dou1' },
      { headword: '都', level: '1', readingNumeric: 'Du1' },
    ];

    const result1 = buildCards({
      cedictEntries: entries,
      hskMappingRows,
      overrides: {},
      exclusions: {},
    });
    const result2 = buildCards({
      cedictEntries: entries,
      hskMappingRows: [...hskMappingRows].reverse(),
      overrides: {},
      exclusions: {},
    });

    const ids1 = result1.cardsByLevel['1'].map((c) => c.id);
    const ids2 = result2.cardsByLevel['1'].map((c) => c.id);
    expect(ids1).toEqual([...ids1].sort((a, b) => a.localeCompare(b)));
    expect(ids1).toEqual(ids2); // same output regardless of input row order (determinism)
  });

  it('applies overrides after matching, and reports unmatched words and orphaned overrides through', () => {
    const { entries } = parseCedict(RAW);
    const hskMappingRows: HskMappingRow[] = [
      { headword: '你好', level: '1', readingNumeric: 'ni3 hao3' },
      { headword: '纽扣儿', level: '6', readingNumeric: 'niu3 kou4 r5' }, // genuinely absent
    ];
    const overrides: OverridesFile = {
      '你好:ni3hao3': {
        senses: ['hello (corrected)'],
        note: 'synthetic test override',
        reviewedBy: 'Red',
        reviewedAt: '2026-09-01',
      },
      '不存在:xx1': {
        senses: ['ghost'],
        note: 'orphan',
        reviewedBy: 'Red',
        reviewedAt: '2026-09-01',
      },
    };

    const result = buildCards({
      cedictEntries: entries,
      hskMappingRows,
      overrides,
      exclusions: {},
    });

    expect(result.cardsByLevel['1']?.[0]?.senses).toEqual(['hello (corrected)']);
    expect(result.unmatchedWords).toEqual([
      { headword: '纽扣儿', level: '6', readingNumeric: 'niu3 kou4 r5' },
    ]);
    expect(result.orphanedOverrideIds).toEqual(['不存在:xx1']);
  });
});

describe('loadAndBuildCards — thin I/O shell over the real pinned files', () => {
  it('runs end to end against the real committed CC-CEDICT and HSK sources without throwing', () => {
    const result = loadAndBuildCards();
    const totalCards = Object.values(result.cardsByLevel).reduce(
      (sum, cards) => sum + cards.length,
      0,
    );
    expect(totalCards).toBeGreaterThan(0);
    expect(Array.isArray(result.unmatchedWords)).toBe(true);
    expect(Array.isArray(result.unresolvedCrossReferences)).toBe(true);
    expect(Array.isArray(result.conflictingEntries)).toBe(true);
  });

  it('matchAndResolve still reports the raw 里/li3 conflict even though a resolved card now ships', () => {
    // Real corpus regression guard for the WO-007 report's Findings: 里/li3
    // has two genuinely different substantive CC-CEDICT entries (裡
    // "interior" vs 里 "measure of distance"), and matchAndResolve (stages
    // 3-5, unchanged since WO-007) must never silently reduce that to one
    // arbitrary pick — both are still reported in conflictingEntries
    // unconditionally, regardless of what happens downstream. What changed
    // in WO-009/DEC-028 is that a REAL, committed override
    // (data/overrides/lr-002-hsk1-manual-cards.json, Red's LR-002) now
    // synthesises a resolved 里 card from this exact conflict (see the
    // "card synthesis" tests below) — the conflict detection and its
    // resolution are two different pipeline stages, and this test is only
    // about the detection stage still firing correctly.
    const result = loadAndBuildCards();
    expect(
      result.conflictingEntries.some((c) => c.headword === '里' && c.readingNumeric === 'li3'),
    ).toBe(true);
  });

  it('a real, committed manual-card override (LR-002s 里 resolution) produces a shipped card', () => {
    const result = loadAndBuildCards();
    const allCards = Object.values(result.cardsByLevel).flat();
    const li = allCards.find((c) => c.id === '里:li3');
    expect(li).toBeDefined();
    expect(li?.source).toBe('manual');
    expect(li?.review).toBe('approved');
  });

  it('every produced card is either unreviewed (default) or carries a real override status', () => {
    // Before WO-009, every card was unreviewed — Red had not reviewed
    // anything yet. Now that real HSK-1 overrides exist
    // (lr-002-hsk1-corrections.json, lr-002-hsk1-manual-cards.json), some
    // cards are legitimately 'approved' or 'corrected'. This test asserts
    // the review field is always one of the four valid values, not that
    // it's uniformly 'unreviewed' any more.
    const result = loadAndBuildCards();
    const allCards = Object.values(result.cardsByLevel).flat();
    const validStatuses = new Set(['unreviewed', 'approved', 'flagged', 'corrected']);
    expect(allCards.every((c) => validStatuses.has(c.review))).toBe(true);
  });
});
