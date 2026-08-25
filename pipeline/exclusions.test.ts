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

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyExclusions,
  clearVacuousHomographGroups,
  loadExclusions,
  recomputeHomographGroups,
} from './exclusions.js';
import type { ExclusionsFile } from './exclusions.js';
import type { Card } from '../src/domain/card.js';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: '三:San1',
    headword: '三',
    reading: 'Sān',
    readingNumeric: 'San1',
    senses: ['surname San'],
    levels: ['1'],
    source: 'cc-cedict',
    review: 'flagged',
    ...overrides,
  };
}

describe('applyExclusions', () => {
  it('drops a card whose id is in the exclusions file', () => {
    const card = makeCard();
    const exclusions: ExclusionsFile = {
      '三:San1': {
        reason: 'surname reading, not HSK-1',
        excludedBy: 'Red',
        excludedAt: '2026-08-25',
      },
    };
    const { cards, excludedIds } = applyExclusions([card], exclusions);
    expect(cards).toEqual([]);
    expect(excludedIds).toEqual(['三:San1']);
  });

  it('leaves a card not named in the exclusions file untouched', () => {
    const card = makeCard({ id: '三:san1', review: 'approved' });
    const { cards, excludedIds } = applyExclusions([card], {});
    expect(cards).toEqual([card]);
    expect(excludedIds).toEqual([]);
  });

  it('reports an exclusion id matching no card as orphaned, not thrown for', () => {
    const exclusions: ExclusionsFile = {
      '不存在:xx1': { reason: 'x', excludedBy: 'Red', excludedAt: '2026-08-25' },
    };
    const { cards, orphanedExclusionIds } = applyExclusions([], exclusions);
    expect(cards).toEqual([]);
    expect(orphanedExclusionIds).toEqual(['不存在:xx1']);
  });

  it('clears homographGroup from a lone survivor once its sibling is excluded (WO-009 finding 5)', () => {
    const surname = makeCard({ id: '三:San1', homographGroup: '三' });
    const survivor = makeCard({
      id: '三:san1',
      reading: 'sān',
      readingNumeric: 'san1',
      senses: ['three'],
      review: 'approved',
      homographGroup: '三',
    });
    const exclusions: ExclusionsFile = {
      '三:San1': {
        reason: 'surname reading, not HSK-1',
        excludedBy: 'Red',
        excludedAt: '2026-08-25',
      },
    };
    const { cards } = applyExclusions([surname, survivor], exclusions);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.id).toBe('三:san1');
    expect(cards[0]?.homographGroup).toBeUndefined();
  });

  it('keeps homographGroup intact when 2+ members still remain after exclusion', () => {
    const a = makeCard({ id: 'A', homographGroup: 'g' });
    const b = makeCard({ id: 'B', homographGroup: 'g' });
    const c = makeCard({ id: 'C', homographGroup: 'g' });
    const exclusions: ExclusionsFile = {
      A: { reason: 'x', excludedBy: 'Red', excludedAt: '2026-08-25' },
    };
    const { cards } = applyExclusions([a, b, c], exclusions);
    expect(cards.map((card) => card.id)).toEqual(['B', 'C']);
    expect(cards.every((card) => card.homographGroup === 'g')).toBe(true);
  });

  it('does not touch a card with no homographGroup at all', () => {
    const card = makeCard();
    const { cards } = applyExclusions([card], {});
    expect(cards[0]?.homographGroup).toBeUndefined();
  });
});

describe('clearVacuousHomographGroups (used by applyExclusions, and by build-data.ts after the content filter — a card can also disappear there, e.g. 草:cao4, HSK 2, DEC-029)', () => {
  it('clears the tag from a lone survivor when its sibling is already absent from the input', () => {
    // Models the content-filter case: the sibling never even reaches this
    // function (it was dropped by applyContentFilter upstream), unlike
    // applyExclusions's own tests, where the sibling is present in the
    // input and filtered out internally.
    const survivor = makeCard({ id: '草:cao3', senses: ['grass'], homographGroup: '草' });
    const [result] = clearVacuousHomographGroups([survivor]);
    expect(result?.homographGroup).toBeUndefined();
  });

  it('leaves the tag intact when 2+ members are present in the input', () => {
    const a = makeCard({ id: 'A', homographGroup: 'g' });
    const b = makeCard({ id: 'B', homographGroup: 'g' });
    const result = clearVacuousHomographGroups([a, b]);
    expect(result.every((card) => card.homographGroup === 'g')).toBe(true);
  });

  it('is a no-op for cards with no homographGroup', () => {
    const card = makeCard();
    const [result] = clearVacuousHomographGroups([card]);
    expect(result).toEqual(card);
  });
});

describe('recomputeHomographGroups (WO-013/LR-004 finding 1)', () => {
  it('links a newly-synthesized card to an existing untagged card sharing its headword', () => {
    // The exact real case: 只:zhi3 ("only") already shipped, untagged
    // (matching never saw a sibling for it); a manual card 只:zhi1
    // (classifier) is added later via override synthesis, which has no
    // way to set homographGroup itself.
    const existing = makeCard({
      id: '只:zhi3',
      headword: '只',
      reading: 'zhǐ',
      readingNumeric: 'zhi3',
      senses: ['only'],
      review: 'approved',
    });
    const synthesized = makeCard({
      id: '只:zhi1',
      headword: '只',
      reading: 'zhī',
      readingNumeric: 'zhi1',
      senses: ['classifier for birds'],
      source: 'manual',
      review: 'unreviewed',
    });
    const result = recomputeHomographGroups([existing, synthesized]);
    expect(result.find((c) => c.id === '只:zhi3')?.homographGroup).toBe('只');
    expect(result.find((c) => c.id === '只:zhi1')?.homographGroup).toBe('只');
  });

  it('clears a tag left over from a group reduced to one member', () => {
    const survivor = makeCard({ id: '草:cao3', headword: '草', homographGroup: '草' });
    const result = recomputeHomographGroups([survivor]);
    expect(result[0]?.homographGroup).toBeUndefined();
  });

  it('leaves an already-correct group tag unchanged (same object identity)', () => {
    const a = makeCard({ id: 'A', headword: '甲', readingNumeric: 'a1', homographGroup: '甲' });
    const b = makeCard({ id: 'B', headword: '甲', readingNumeric: 'a2', homographGroup: '甲' });
    const result = recomputeHomographGroups([a, b]);
    expect(result[0]).toBe(a);
    expect(result[1]).toBe(b);
  });

  it('does not group two cards with the same headword and the same reading (not a homograph)', () => {
    const a = makeCard({ id: 'A', headword: '甲', readingNumeric: 'a1' });
    const b = makeCard({ id: 'B', headword: '甲', readingNumeric: 'a1' });
    const result = recomputeHomographGroups([a, b]);
    expect(result.every((c) => c.homographGroup === undefined)).toBe(true);
  });

  it('is case-sensitive on readings, matching foldForMatching (surname vs. common reading)', () => {
    const surname = makeCard({ id: '三:San1', readingNumeric: 'San1' });
    const common = makeCard({ id: '三:san1', readingNumeric: 'san1', review: 'approved' });
    const result = recomputeHomographGroups([surname, common]);
    expect(result.every((c) => c.homographGroup === '三')).toBe(true);
  });

  it('is a no-op for a headword with only one card', () => {
    const card = makeCard();
    const result = recomputeHomographGroups([card]);
    expect(result[0]).toEqual(card);
  });
});

describe('loadExclusions (thin I/O shell)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'exclusions-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns {} when the file does not exist', () => {
    expect(loadExclusions(join(dir, 'nonexistent.json'))).toEqual({});
  });

  it('reads and parses a real committed exclusions file', () => {
    const filePath = join(dir, 'excluded-cards.json');
    const content: ExclusionsFile = {
      '三:San1': { reason: 'surname reading', excludedBy: 'Red', excludedAt: '2026-08-25' },
    };
    writeFileSync(filePath, JSON.stringify(content));
    expect(loadExclusions(filePath)).toEqual(content);
  });
});
