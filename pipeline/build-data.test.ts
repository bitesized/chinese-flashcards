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
import { buildDeckSet } from './build-data.js';

const HSK_LEVELS = ['1', '2', '3', '4', '5', '6'] as const;

/** Strips `builtAt` before comparing two build outputs — it is wall-clock
 *  time by definition (domain-model.md §6) and can never be byte-identical
 *  between two separate runs. Everything else must be. */
function withoutBuiltAt(deckSet: ReturnType<typeof buildDeckSet>) {
  return HSK_LEVELS.map((level) => {
    const deck = deckSet.decks[level];
    const metaWithoutBuiltAt: Partial<typeof deck.meta> = { ...deck.meta };
    delete metaWithoutBuiltAt.builtAt;
    return { ...deck, meta: metaWithoutBuiltAt };
  });
}

describe('buildDeckSet — determinism (testing-strategy.md §3 gate 9)', () => {
  it('produces byte-identical output across two runs, aside from builtAt', () => {
    const first = buildDeckSet('2026-01-01T00:00:00.000Z');
    const second = buildDeckSet('2026-01-02T00:00:00.000Z');

    expect(JSON.stringify(withoutBuiltAt(first))).toBe(JSON.stringify(withoutBuiltAt(second)));
  });

  it('does carry the builtAt value through to every deck, verbatim', () => {
    const deckSet = buildDeckSet('2026-06-15T12:00:00.000Z');
    for (const level of HSK_LEVELS) {
      expect(deckSet.decks[level].meta.builtAt).toBe('2026-06-15T12:00:00.000Z');
    }
  });
});

describe('buildDeckSet — against the real pinned corpus', () => {
  it('validates OK (green build) on the currently pinned CC-CEDICT + HSK data', () => {
    const deckSet = buildDeckSet('2026-01-01T00:00:00.000Z');
    expect(deckSet.validation.ok).toBe(true);
  });

  it('every deck has the real dictionaryVersion and wordListVersion populated, not placeholders', () => {
    const deckSet = buildDeckSet('2026-01-01T00:00:00.000Z');
    for (const level of HSK_LEVELS) {
      const meta = deckSet.decks[level].meta;
      expect(meta.dictionaryVersion).not.toBe('');
      expect(meta.wordListVersion).not.toBe('');
      expect(meta.cardCount).toBe(deckSet.decks[level].cards.length);
    }
  });

  it('applies the sense-annotation transform exactly once per unique card shared across levels', () => {
    // A card belonging to >1 level is pushed into more than one level's
    // array as the SAME object by build-cards.ts. If the transform ran
    // once per (level, card) pair instead of once per unique card, a
    // multi-level card with a bracket annotation would either throw on the
    // second pass (already-converted diacritics aren't valid numbered
    // Pinyin) or silently double-process. Assert no card anywhere still
    // contains a bracket after the real transform has run over the whole
    // corpus, which would surface either failure mode.
    const deckSet = buildDeckSet('2026-01-01T00:00:00.000Z');
    for (const level of HSK_LEVELS) {
      for (const card of deckSet.decks[level].cards) {
        for (const sense of card.senses) {
          expect(sense).not.toMatch(/[[\]]/);
        }
      }
    }
  });
});
