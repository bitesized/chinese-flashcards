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
import { applyContentFilter, filterVulgarSenses } from './content-filter.js';
import type { Card } from '../src/domain/card.js';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: '日:ri4',
    headword: '日',
    reading: 'rì',
    readingNumeric: 'ri4',
    senses: ['(bound form) sun', 'day', '(vulgar) to fuck; to have sex with'],
    levels: ['1'],
    source: 'cc-cedict',
    review: 'unreviewed',
    ...overrides,
  };
}

describe('filterVulgarSenses', () => {
  it('drops a leading-marker vulgar sense (real corpus shape: "(vulgar) dumbass")', () => {
    expect(filterVulgarSenses(['(vulgar) dumbass', 'a fine word'])).toEqual(['a fine word']);
  });

  it('drops a trailing-marker vulgar sense (real corpus shape: "cunt (vulgar)")', () => {
    expect(filterVulgarSenses(['cunt (vulgar)', 'a fine word'])).toEqual(['a fine word']);
  });

  it('drops a "(vulgar, offensive)" sense (real corpus shape, one instance)', () => {
    expect(filterVulgarSenses(['a person’s repulsive appearance (vulgar, offensive)'])).toEqual([]);
  });

  it('is case-insensitive', () => {
    expect(filterVulgarSenses(['(VULGAR) shouting'])).toEqual([]);
  });

  it('leaves ordinary register markers untouched — vulgar is filtered, others are meaning', () => {
    expect(filterVulgarSenses(['(coll.) casual', '(lit.) literary', '(dialect) regional'])).toEqual(
      ['(coll.) casual', '(lit.) literary', '(dialect) regional'],
    );
  });

  it('leaves a sense with no marker at all untouched', () => {
    expect(filterVulgarSenses(['an ordinary gloss'])).toEqual(['an ordinary gloss']);
  });

  it('real corpus regression: 日 (day/sun) keeps its ordinary senses, drops only the vulgar one', () => {
    const input = [
      '(bound form) sun',
      'day',
      'day of the month',
      '(bound form) Japan (abbr. for 日本[Ri4 ben3])',
      '(vulgar) to fuck; to have sex with',
    ];
    expect(filterVulgarSenses(input)).toEqual([
      '(bound form) sun',
      'day',
      'day of the month',
      '(bound form) Japan (abbr. for 日本[Ri4 ben3])',
    ]);
  });

  it('real corpus regression: 幹/gan4 (10 senses, 1 vulgar) keeps the other 9', () => {
    const input = [
      'tree trunk',
      'main part of sth',
      'to manage',
      'to work',
      'to do',
      'capable',
      'cadre',
      'to kill (slang)',
      'to fuck (vulgar)',
      '(coll.) pissed off; annoyed',
    ];
    const result = filterVulgarSenses(input);
    expect(result).toHaveLength(9);
    expect(result).not.toContain('to fuck (vulgar)');
  });
});

describe('applyContentFilter', () => {
  it('removes the vulgar sense from a card and reports it as filtered', () => {
    const card = makeCard();
    const { cards, filteredIds, droppedIds } = applyContentFilter([card]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.senses).toEqual(['(bound form) sun', 'day']);
    expect(filteredIds).toEqual(['日:ri4']);
    expect(droppedIds).toEqual([]);
  });

  it('leaves a card with no vulgar senses completely untouched', () => {
    const card = makeCard({ senses: ['hello'] });
    const { cards, filteredIds, droppedIds } = applyContentFilter([card]);
    expect(cards).toEqual([card]);
    expect(filteredIds).toEqual([]);
    expect(droppedIds).toEqual([]);
  });

  it('drops a card entirely when every sense is vulgar (domain-model.md §3 invariant 2)', () => {
    const card = makeCard({ id: '屄:bi1', headword: '屄', senses: ['cunt (vulgar)'] });
    const { cards, filteredIds, droppedIds } = applyContentFilter([card]);
    expect(cards).toEqual([]);
    expect(filteredIds).toEqual([]);
    expect(droppedIds).toEqual(['屄:bi1']);
  });

  it('processes multiple cards independently', () => {
    const clean = makeCard({ id: 'A', senses: ['fine'] });
    const partial = makeCard({ id: 'B', senses: ['fine', '(vulgar) bad'] });
    const wholly = makeCard({ id: 'C', senses: ['(vulgar) only'] });
    const { cards, filteredIds, droppedIds } = applyContentFilter([clean, partial, wholly]);
    expect(cards.map((c) => c.id)).toEqual(['A', 'B']);
    expect(filteredIds).toEqual(['B']);
    expect(droppedIds).toEqual(['C']);
  });
});
