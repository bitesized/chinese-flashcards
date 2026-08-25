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
import { applyOverrides, loadOverrides } from './overrides.js';
import type { CardOverride, OverridesFile } from './overrides.js';
import type { Card } from '../src/domain/card.js';

// Synthetic fixture only — no real Red-authored content (WO-007's explicit
// scope: prove the mechanism, author nothing real).
function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: '行:hang2',
    headword: '行',
    reading: 'háng',
    readingNumeric: 'hang2',
    senses: ['row', 'line', 'profession', 'professional'],
    levels: ['4'],
    source: 'cc-cedict',
    review: 'unreviewed',
    ...overrides,
  };
}

describe('applyOverrides (criterion 8: mechanism proven with a synthetic fixture)', () => {
  it("a synthetic override visibly changes a matched card's senses", () => {
    const card = makeCard();
    const overrides: OverridesFile = {
      '行:hang2': {
        senses: ['row', 'line', 'profession', 'trade', 'firm'],
        note: "Dropped duplicate gloss; 'professional' is adjectival and misleading here.",
        reviewedBy: 'Red',
        reviewedAt: '2026-09-01',
      },
    };

    const { cards, orphanedOverrideIds } = applyOverrides([card], overrides);

    expect(orphanedOverrideIds).toEqual([]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.senses).toEqual(['row', 'line', 'profession', 'trade', 'firm']);
    expect(cards[0]?.id).toBe('行:hang2'); // id is never itself overridable-away from the card it targets
  });

  it('does not touch a card with no matching override', () => {
    const card = makeCard();
    const { cards } = applyOverrides([card], {});
    expect(cards).toEqual([card]);
  });

  it('override-only metadata (note/reviewedBy/reviewedAt) never leaks onto the shipped Card', () => {
    const card = makeCard();
    const overrides: OverridesFile = {
      '行:hang2': { senses: ['row'], note: 'x', reviewedBy: 'Red', reviewedAt: '2026-09-01' },
    };
    const { cards } = applyOverrides([card], overrides);
    expect(cards[0]).not.toHaveProperty('note');
    expect(cards[0]).not.toHaveProperty('reviewedBy');
    expect(cards[0]).not.toHaveProperty('reviewedAt');
  });

  it('a content-changing override defaults source to cc-cedict+override and review to corrected', () => {
    const card = makeCard({ source: 'cc-cedict', review: 'unreviewed' });
    const overrides: OverridesFile = {
      '行:hang2': { senses: ['row'], note: 'x', reviewedBy: 'Red', reviewedAt: '2026-09-01' },
    };
    const { cards } = applyOverrides([card], overrides);
    expect(cards[0]?.source).toBe('cc-cedict+override');
    expect(cards[0]?.review).toBe('corrected');
  });

  it('an override may set source/review explicitly, which wins over the default', () => {
    const card = makeCard();
    const overrides: OverridesFile = {
      '行:hang2': {
        senses: ['row'],
        review: 'approved',
        note: 'x',
        reviewedBy: 'Red',
        reviewedAt: '2026-09-01',
      },
    };
    const { cards } = applyOverrides([card], overrides);
    expect(cards[0]?.review).toBe('approved');
  });

  it('an override matching no card is reported as orphaned, not thrown or silently dropped', () => {
    const card = makeCard();
    const overrides: OverridesFile = {
      '不存在:xx1': { senses: ['ghost'], note: 'x', reviewedBy: 'Red', reviewedAt: '2026-09-01' },
    };
    const { cards, orphanedOverrideIds } = applyOverrides([card], overrides);
    expect(cards).toEqual([card]);
    expect(orphanedOverrideIds).toEqual(['不存在:xx1']);
  });

  it('an override may correct any subset of fields, e.g. levels alone', () => {
    const card = makeCard({ levels: ['4'] });
    const overrides: OverridesFile = {
      '行:hang2': { levels: ['4', '5'], note: 'x', reviewedBy: 'Red', reviewedAt: '2026-09-01' },
    };
    const { cards } = applyOverrides([card], overrides);
    expect(cards[0]?.levels).toEqual(['4', '5']);
  });
});

describe('applyOverrides — card synthesis (WO-009/LR-002 finding, DEC-028)', () => {
  it('synthesises a full card from an override supplying the complete required field set', () => {
    const overrides: OverridesFile = {
      '和:he2': {
        headword: '和',
        reading: 'hé',
        readingNumeric: 'he2',
        senses: ['and', '(math.) sum'],
        levels: ['1'],
        source: 'manual',
        review: 'approved',
        note: 'Synthetic test, same shape as LR-002s real 和 resolution.',
        reviewedBy: 'Red',
        reviewedAt: '2026-08-25',
      },
    };
    const { cards, orphanedOverrideIds } = applyOverrides([], overrides);
    expect(orphanedOverrideIds).toEqual([]);
    expect(cards).toEqual([
      {
        id: '和:he2',
        headword: '和',
        reading: 'hé',
        readingNumeric: 'he2',
        senses: ['and', '(math.) sum'],
        levels: ['1'],
        source: 'manual',
        review: 'approved',
      },
    ]);
  });

  it('defaults source to manual and review to unreviewed when a synthesising override omits them', () => {
    const overrides: OverridesFile = {
      '测试:ce4shi4': {
        headword: '测试',
        reading: 'cèshì',
        readingNumeric: 'ce4 shi4',
        senses: ['test'],
        levels: ['1'],
        note: 'x',
        reviewedBy: 'Red',
        reviewedAt: '2026-08-25',
      },
    };
    const { cards } = applyOverrides([], overrides);
    expect(cards[0]?.source).toBe('manual');
    expect(cards[0]?.review).toBe('unreviewed');
  });

  it('does not synthesise from an override missing part of the required field set — stays orphaned', () => {
    const overrides: OverridesFile = {
      '不完整:bu4wan2zheng3': {
        headword: '不完整',
        // reading/readingNumeric/senses/levels all missing
        note: 'x',
        reviewedBy: 'Red',
        reviewedAt: '2026-08-25',
      },
    };
    const { cards, orphanedOverrideIds } = applyOverrides([], overrides);
    expect(cards).toEqual([]);
    expect(orphanedOverrideIds).toEqual(['不完整:bu4wan2zheng3']);
  });

  it('a synthesising override does not shadow or duplicate an id that already has a real card', () => {
    const card = makeCard(); // id 行:hang2
    const overrides: OverridesFile = {
      '行:hang2': {
        senses: ['row (corrected)'],
        note: 'x',
        reviewedBy: 'Red',
        reviewedAt: '2026-08-25',
      },
    };
    const { cards } = applyOverrides([card], overrides);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.senses).toEqual(['row (corrected)']);
  });
});

describe('loadOverrides (thin I/O shell)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'wo007-overrides-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns an empty object for a directory with no override files', () => {
    expect(loadOverrides(dir)).toEqual({});
  });

  it('returns an empty object when the directory does not exist (mirrors the real repo before any override is authored)', () => {
    expect(loadOverrides(join(dir, 'does-not-exist'))).toEqual({});
  });

  it('merges multiple committed override files, keyed by card id', () => {
    const a: OverridesFile = {
      '行:hang2': { senses: ['row'], note: 'x', reviewedBy: 'Red', reviewedAt: '2026-09-01' },
    };
    const b: OverridesFile = {
      '行:xing2': { senses: ['to walk'], note: 'y', reviewedBy: 'Red', reviewedAt: '2026-09-02' },
    };
    writeFileSync(join(dir, 'a.json'), JSON.stringify(a));
    writeFileSync(join(dir, 'b.json'), JSON.stringify(b));

    const merged = loadOverrides(dir);
    expect(Object.keys(merged).sort()).toEqual(['行:hang2', '行:xing2']);
  });

  it('throws if the same card id is defined in more than one file', () => {
    const dup: CardOverride = {
      senses: ['x'],
      note: 'x',
      reviewedBy: 'Red',
      reviewedAt: '2026-09-01',
    };
    writeFileSync(join(dir, 'a.json'), JSON.stringify({ '行:hang2': dup }));
    writeFileSync(join(dir, 'b.json'), JSON.stringify({ '行:hang2': dup }));

    expect(() => loadOverrides(dir)).toThrow(/more than one file/);
  });

  it('ignores non-.json files in the overrides directory', () => {
    writeFileSync(join(dir, 'README.md'), '# not an override file');
    expect(loadOverrides(dir)).toEqual({});
  });
});
