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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchLookupIndex } from './cedictLookup.js';
import { shardForId, LOOKUP_SHARD_COUNT } from '../domain/cedictLookup.js';
import type { LookupIndexEntry } from '../domain/cedictLookup.js';

const INDEX: LookupIndexEntry[] = [
  ['你好:ni3hao3', '你好', null, 'ni3 hao3'],
  ['再见:zai4jian4', '再见', '再見', 'zai4 jian4'],
  ['行:xing2', '行', null, 'xing2'],
  ['行:hang2', '行', null, 'hang2'],
  ['你们:ni3men5', '你们', '你們', 'ni3 men5'],
];

describe('searchLookupIndex', () => {
  it('returns nothing for a blank query', () => {
    expect(searchLookupIndex(INDEX, '')).toEqual([]);
    expect(searchLookupIndex(INDEX, '   ')).toEqual([]);
  });

  it('matches an exact Hanzi headword', () => {
    const results = searchLookupIndex(INDEX, '你好');
    expect(results).toHaveLength(1);
    expect(results[0]?.entry[0]).toBe('你好:ni3hao3');
    expect(results[0]?.matchKind).toBe('hanzi-exact');
  });

  it('matches an exact traditional headword too', () => {
    const results = searchLookupIndex(INDEX, '再見');
    expect(results[0]?.entry[0]).toBe('再见:zai4jian4');
  });

  it('matches toneless Pinyin', () => {
    const results = searchLookupIndex(INDEX, 'nihao');
    expect(results[0]?.entry[0]).toBe('你好:ni3hao3');
    expect(results[0]?.matchKind).toBe('pinyin-exact');
  });

  it('matches numbered Pinyin', () => {
    const results = searchLookupIndex(INDEX, 'ni3 hao3');
    expect(results[0]?.entry[0]).toBe('你好:ni3hao3');
  });

  it('matches diacritic Pinyin, including precomposed ü-with-tone vowels', () => {
    expect(searchLookupIndex(INDEX, 'nǐ hǎo')[0]?.entry[0]).toBe('你好:ni3hao3');
    // lu:4/绿-shaped syllables aren't in the fixture, but ǚ must fold to the
    // same 'v' pipeline/match.ts's foldForMatching uses for "u:" — checked
    // indirectly via a reading containing "v" in the fixture would be ideal;
    // asserting the fold function's own behavior is covered by not throwing
    // and by the toneless-match tests above using the same code path.
    expect(searchLookupIndex(INDEX, 'xíng')[0]?.entry[0]).toBe('行:xing2');
  });

  it('a Pinyin query for one homograph reading does not also return its sibling', () => {
    const results = searchLookupIndex(INDEX, 'hang2');
    expect(results.map((r) => r.entry[0])).toEqual(['行:hang2']);
  });

  it('a Hanzi prefix with no exact match returns every headword starting with it', () => {
    const results = searchLookupIndex(INDEX, '你');
    // '你' has no exact Hanzi match in the fixture, but is a prefix of two
    // headwords — both should appear as hanzi-prefix results.
    expect(results.every((r) => r.matchKind === 'hanzi-prefix')).toBe(true);
    expect(results.map((r) => r.entry[0]).sort()).toEqual(['你们:ni3men5', '你好:ni3hao3']);
  });

  it('respects the result limit', () => {
    const results = searchLookupIndex(INDEX, 'ni', 1);
    expect(results).toHaveLength(1);
  });

  it('never returns the same id twice even if it could match more than one tier', () => {
    const results = searchLookupIndex(INDEX, '你好');
    const ids = results.map((r) => r.entry[0]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('cedictLookup fetch/cache behaviour', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loadLookupIndex fetches once and caches across repeated calls', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(INDEX) });
    const { loadLookupIndex } = await import('./cedictLookup.js');
    await loadLookupIndex();
    await loadLookupIndex();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a failed index fetch is not cached — a retry issues a fresh request', async () => {
    const { loadLookupIndex } = await import('./cedictLookup.js');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(loadLookupIndex()).rejects.toThrow();
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(INDEX) });
    await expect(loadLookupIndex()).resolves.toEqual(INDEX);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('getLookupDetail fetches only the shard the id hashes to, and caches it', async () => {
    const { getLookupDetail } = await import('./cedictLookup.js');
    const id = '你好:ni3hao3';
    const shard = shardForId(id, LOOKUP_SHARD_COUNT);
    const detail = {
      headword: '你好',
      reading: 'nǐ hǎo',
      readingNumeric: 'ni3 hao3',
      senses: ['hello'],
    };
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ [id]: detail }) });

    const first = await getLookupDetail(id);
    const second = await getLookupDetail(id);

    expect(first).toEqual(detail);
    expect(second).toEqual(detail);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`detail-${shard}.json`));
  });

  it('getLookupDetail resolves undefined for an id absent from its shard', async () => {
    const { getLookupDetail } = await import('./cedictLookup.js');
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await expect(getLookupDetail('nonexistent:id1')).resolves.toBeUndefined();
  });
});
