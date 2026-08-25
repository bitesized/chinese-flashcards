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
import { buildHanziDictionary } from './hanzi-dictionary.js';
import type { CedictEntry } from './cedict.js';

function makeEntry(overrides: Partial<CedictEntry> = {}): CedictEntry {
  return {
    traditional: '你',
    simplified: '你',
    readingNumeric: 'ni3',
    senses: ['you'],
    sourceLine: 1,
    ...overrides,
  };
}

describe('buildHanziDictionary', () => {
  it('includes a single-character entry that is in the needed set', () => {
    const result = buildHanziDictionary(new Set(['你']), [makeEntry()]);
    expect(result.get('你')).toEqual({
      character: '你',
      readings: [{ reading: 'nǐ', readingNumeric: 'ni3', senses: ['you'] }],
    });
  });

  it('excludes a character not in the needed set', () => {
    const result = buildHanziDictionary(new Set(['好']), [makeEntry()]);
    expect(result.has('你')).toBe(false);
  });

  it('excludes a multi-character headword even if a substring is needed', () => {
    const entry = makeEntry({ simplified: '你好', traditional: '你好' });
    const result = buildHanziDictionary(new Set(['你']), [entry]);
    expect(result.has('你')).toBe(false);
  });

  it('collects multiple distinct readings for a polyphonic character', () => {
    const entries = [
      makeEntry({ simplified: '都', traditional: '都', readingNumeric: 'dou1', senses: ['all'] }),
      makeEntry({
        simplified: '都',
        traditional: '都',
        readingNumeric: 'du1',
        senses: ['capital city'],
      }),
    ];
    const result = buildHanziDictionary(new Set(['都']), entries);
    expect(result.get('都')?.readings).toHaveLength(2);
    expect(result.get('都')?.readings.map((r) => r.readingNumeric)).toEqual(['dou1', 'du1']);
  });

  it('applies the vulgar-content filter (DEC-029) to character-level senses too', () => {
    const entry = makeEntry({ senses: ['(vulgar) crude sense', 'ordinary sense'] });
    const result = buildHanziDictionary(new Set(['你']), [entry]);
    expect(result.get('你')?.readings[0]?.senses).toEqual(['ordinary sense']);
  });

  it('drops a reading entirely if every sense is filtered out, but keeps the character if another reading survives', () => {
    const entries = [
      makeEntry({ readingNumeric: 'ni3', senses: ['(vulgar) only sense here'] }),
      makeEntry({ readingNumeric: 'ni2', senses: ['a fine, ordinary sense'] }),
    ];
    const result = buildHanziDictionary(new Set(['你']), entries);
    expect(result.get('你')?.readings).toHaveLength(1);
    expect(result.get('你')?.readings[0]?.readingNumeric).toBe('ni2');
  });

  it("skips a reading that cannot be converted to diacritic form (e.g. 儿 as the bare erhua suffix marker) without throwing, keeping the character's other readings", () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entries = [
      makeEntry({ simplified: '儿', traditional: '兒', readingNumeric: 'er2', senses: ['child'] }),
      makeEntry({
        simplified: '儿',
        traditional: '兒',
        readingNumeric: 'r5',
        senses: ['non-syllabic diminutive suffix'],
      }),
    ];
    expect(() => buildHanziDictionary(new Set(['儿']), entries)).not.toThrow();
    const result = buildHanziDictionary(new Set(['儿']), entries);
    expect(result.get('儿')?.readings).toHaveLength(1);
    expect(result.get('儿')?.readings[0]?.readingNumeric).toBe('er2');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('returns an empty map when nothing in the needed set matches any entry', () => {
    const result = buildHanziDictionary(new Set(['甲']), [makeEntry()]);
    expect(result.size).toBe(0);
  });
});
