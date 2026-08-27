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
import { buildLookupData, SHARD_COUNT } from './build-lookup.js';
import type { CedictEntry } from './cedict.js';
import { shardForId } from '../src/domain/cedictLookup.js';

function makeEntry(overrides: Partial<CedictEntry> = {}): CedictEntry {
  return {
    traditional: '你好',
    simplified: '你好',
    readingNumeric: 'ni3 hao3',
    senses: ['hello', 'hi'],
    sourceLine: 1,
    ...overrides,
  };
}

describe('buildLookupData', () => {
  it('builds an index row and a detail entry for an ordinary substantive entry', () => {
    const { index, details } = buildLookupData([makeEntry()]);
    expect(index).toEqual([['你好:ni3hao3', '你好', null, 'ni3 hao3']]);
    expect(details.get('你好:ni3hao3')).toEqual({
      headword: '你好',
      reading: 'nǐ hǎo',
      readingNumeric: 'ni3 hao3',
      senses: ['hello', 'hi'],
    });
  });

  it('records a traditional form only when it differs from simplified', () => {
    const { index, details } = buildLookupData([
      makeEntry({ traditional: '個', simplified: '个', readingNumeric: 'ge4' }),
    ]);
    expect(index[0]?.[2]).toBe('個');
    expect(details.get('个:ge4')?.headwordTraditional).toBe('個');
  });

  it('converts classifiers the same way match.ts does', () => {
    const { details } = buildLookupData([
      makeEntry({
        classifiers: [{ traditional: '個', simplified: '个', readingNumeric: 'ge4' }],
      }),
    ]);
    expect(details.get('你好:ni3hao3')?.classifiers).toEqual([
      { traditional: '個', simplified: '个', readingNumeric: 'ge4', reading: 'gè' },
    ]);
  });

  it('drops a cross-reference-only entry with no substantive sibling', () => {
    const { index, details, skippedCrossReferenceOnly } = buildLookupData([
      makeEntry({ senses: ['variant of 你好[ni3 hao3]'] }),
    ]);
    expect(index).toEqual([]);
    expect(details.size).toBe(0);
    expect(skippedCrossReferenceOnly).toBe(1);
  });

  it('keeps the substantive entry when a group has both a pointer and a real entry', () => {
    const { index, skippedCrossReferenceOnly } = buildLookupData([
      makeEntry({ senses: ['variant of 你好[ni3 hao3]'], sourceLine: 1 }),
      makeEntry({ senses: ['hello'], sourceLine: 2 }),
    ]);
    expect(index).toHaveLength(1);
    expect(skippedCrossReferenceOnly).toBe(0);
  });

  it('drops a group with two conflicting substantive entries under the same headword+reading', () => {
    const { index, skippedConflicting } = buildLookupData([
      makeEntry({ senses: ['lining; interior'], sourceLine: 1 }),
      makeEntry({ senses: ['a unit of distance'], sourceLine: 2 }),
    ]);
    expect(index).toEqual([]);
    expect(skippedConflicting).toBe(1);
  });

  it('filters a vulgar sense but keeps the entry when other senses remain', () => {
    const { details } = buildLookupData([makeEntry({ senses: ['day', '(vulgar) to fuck'] })]);
    expect(details.get('你好:ni3hao3')?.senses).toEqual(['day']);
  });

  it('skips an entry whose reading is not valid Pinyin (real corpus regression: 11区[11 Qu1])', () => {
    const { index, details, skippedInvalidReading } = buildLookupData([
      makeEntry({
        simplified: '11区',
        traditional: '11區',
        readingNumeric: '11 Qu1',
        senses: ['slang for Japan'],
      }),
    ]);
    expect(index).toEqual([]);
    expect(details.size).toBe(0);
    expect(skippedInvalidReading).toBe(1);
  });

  it('drops an entry entirely when every sense is vulgar', () => {
    const { index, details, skippedNoSenses } = buildLookupData([
      makeEntry({ senses: ['(vulgar) only'] }),
    ]);
    expect(index).toEqual([]);
    expect(details.size).toBe(0);
    expect(skippedNoSenses).toBe(1);
  });

  it('drops one unconvertible sense but keeps the entry’s other senses (real corpus regression: "square brackets [ ]")', () => {
    const { details, skippedUnannotatableSenses } = buildLookupData([
      makeEntry({ senses: ['square brackets [ ]', 'a fine word'] }),
    ]);
    expect(details.get('你好:ni3hao3')?.senses).toEqual(['a fine word']);
    expect(skippedUnannotatableSenses).toBe(1);
  });

  it('drops the whole entry when its only sense is unconvertible', () => {
    const { index, details, skippedNoSenses, skippedUnannotatableSenses } = buildLookupData([
      makeEntry({ senses: ['square brackets [ ]'] }),
    ]);
    expect(index).toEqual([]);
    expect(details.size).toBe(0);
    expect(skippedNoSenses).toBe(1);
    expect(skippedUnannotatableSenses).toBe(1);
  });

  it('two distinct readings of one headword each get their own row (homographs stay separate)', () => {
    const { index } = buildLookupData([
      makeEntry({
        readingNumeric: 'xing2',
        senses: ['to walk'],
        simplified: '行',
        traditional: '行',
      }),
      makeEntry({
        readingNumeric: 'hang2',
        senses: ['a row; a firm'],
        simplified: '行',
        traditional: '行',
      }),
    ]);
    expect(index).toHaveLength(2);
    expect(index.map((row) => row[0]).sort()).toEqual(['行:hang2', '行:xing2']);
  });

  it('output is sorted by id, independent of input order', () => {
    const { index } = buildLookupData([
      makeEntry({
        simplified: '再见',
        traditional: '再見',
        readingNumeric: 'zai4 jian4',
        senses: ['bye'],
      }),
      makeEntry({ simplified: '你好', readingNumeric: 'ni3 hao3', senses: ['hello'] }),
    ]);
    expect(index.map((row) => row[0])).toEqual(['你好:ni3hao3', '再见:zai4jian4']);
  });

  it('is deterministic across two runs over the same input', () => {
    const entries = [
      makeEntry({ sourceLine: 1 }),
      makeEntry({
        simplified: '再见',
        readingNumeric: 'zai4 jian4',
        senses: ['bye'],
        sourceLine: 2,
      }),
    ];
    const first = buildLookupData(entries);
    const second = buildLookupData(entries);
    expect(first.index).toEqual(second.index);
    expect([...first.details]).toEqual([...second.details]);
  });
});

describe('shardForId', () => {
  it('is deterministic for the same id and shard count', () => {
    expect(shardForId('你好:ni3hao3', SHARD_COUNT)).toBe(shardForId('你好:ni3hao3', SHARD_COUNT));
  });

  it('always returns a value within [0, shardCount)', () => {
    const ids = ['你好:ni3hao3', '行:xing2', '行:hang2', '再见:zai4jian4', 'a', ''];
    for (const id of ids) {
      const shard = shardForId(id, SHARD_COUNT);
      expect(shard).toBeGreaterThanOrEqual(0);
      expect(shard).toBeLessThan(SHARD_COUNT);
    }
  });

  it('distributes a real spread of ids across more than one shard', () => {
    const ids = Array.from({ length: 200 }, (_, i) => `word${i}:reading${i}`);
    const shards = new Set(ids.map((id) => shardForId(id, SHARD_COUNT)));
    expect(shards.size).toBeGreaterThan(1);
  });
});
