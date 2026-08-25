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
import { computeCardId, normalizeReadingKey } from './identifiers.js';

describe('normalizeReadingKey', () => {
  it.each([
    ['ni3 hao3', 'ni3hao3'],
    ['Zhong1 guo2', 'Zhong1guo2'],
    ['lu:4', 'lv4'],
    ['lü4', 'lv4'],
    ['Du1', 'Du1'],
    ['yi1 hui4 r5', 'yi1hui4r5'],
  ])('normalizes "%s" -> "%s" (case preserved, DEC-024)', (input, expected) => {
    expect(normalizeReadingKey(input)).toBe(expected);
  });

  it('folds u: and ü to the same key, so HSK and CC-CEDICT conventions compare equal', () => {
    expect(normalizeReadingKey('lu:4')).toBe(normalizeReadingKey('lü4'));
  });
});

describe('computeCardId (domain-model.md §5, DEC-005 as amended by DEC-024)', () => {
  it.each([
    ['行', 'hang2', '行:hang2'],
    ['行', 'xing2', '行:xing2'],
    ['你好', 'ni3 hao3', '你好:ni3hao3'],
    ['都', 'Du1', '都:Du1'],
  ])('computeCardId(%s, %s) -> %s', (headword, readingNumeric, expected) => {
    expect(computeCardId(headword, readingNumeric)).toBe(expected);
  });

  it('two different readings of the same headword produce two different ids (criterion 9)', () => {
    const id1 = computeCardId('行', 'hang2');
    const id2 = computeCardId('行', 'xing2');
    expect(id1).not.toBe(id2);
  });

  it('DEC-024 regression: 都/Du1 (surname) and 都/du1 (capital city) no longer collide', () => {
    const surname = computeCardId('都', 'Du1');
    const capital = computeCardId('都', 'du1');
    expect(surname).not.toBe(capital);
    expect(surname).toBe('都:Du1');
    expect(capital).toBe('都:du1');
  });
});
