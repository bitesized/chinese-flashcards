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

/**
 * Runtime side of the CC-CEDICT lookup dataset (DEC-037): fetches and
 * searches `public/cedict-lookup/*.json` (`pipeline/build-lookup.ts`'s
 * output) so a custom deck's "Add a card" flow (WO-019) can look up any
 * CC-CEDICT word by Hanzi or Pinyin, not just the ~5,259 words already
 * compiled into the HSK decks.
 *
 * Two fetches, same "fetch on demand, cache in memory for the page's life"
 * pattern `services/decks.ts` already established for HSK decks:
 *
 *   1. The full search index (~116,500 rows, ~6-7MB uncompressed) — fetched
 *      once, the first time a lookup is attempted, never on app boot. Kept
 *      in memory so every subsequent search in the same session is
 *      instant, matching decks.ts's per-level cache.
 *   2. A candidate's detail shard (services/cedictLookup.ts's own
 *      `getLookupDetail`) — fetched only once a specific candidate is
 *      chosen, one small (~300KB) shard file, cached per shard so picking
 *      two candidates that happen to hash to the same shard is one fetch,
 *      not two.
 */

import { shardForId, LOOKUP_SHARD_COUNT } from '../domain/cedictLookup.js';
import type { LookupDetail, LookupIndexEntry } from '../domain/cedictLookup.js';

const indexCache = new Map<string, Promise<LookupIndexEntry[]>>();
const INDEX_CACHE_KEY = 'index';

/** Fetches and caches the full search index. Safe to call repeatedly — the
 *  underlying fetch happens at most once per page load, same reasoning as
 *  `services/decks.ts`'s per-level cache (a failed fetch is evicted so a
 *  retry issues a fresh request rather than replaying the same rejection). */
export function loadLookupIndex(): Promise<LookupIndexEntry[]> {
  const cached = indexCache.get(INDEX_CACHE_KEY);
  if (cached) return cached;

  const promise = fetch(`${import.meta.env.BASE_URL}cedict-lookup/index.json`).then((response) => {
    if (!response.ok) {
      throw new Error(`failed to load the CC-CEDICT lookup index: ${response.status}`);
    }
    return response.json() as Promise<LookupIndexEntry[]>;
  });
  indexCache.set(INDEX_CACHE_KEY, promise);
  promise.catch(() => indexCache.delete(INDEX_CACHE_KEY));
  return promise;
}

const shardCache = new Map<number, Promise<Record<string, LookupDetail>>>();

function loadDetailShard(shard: number): Promise<Record<string, LookupDetail>> {
  const cached = shardCache.get(shard);
  if (cached) return cached;

  const promise = fetch(`${import.meta.env.BASE_URL}cedict-lookup/detail-${shard}.json`).then(
    (response) => {
      if (!response.ok) {
        throw new Error(
          `failed to load CC-CEDICT lookup detail shard ${shard}: ${response.status}`,
        );
      }
      return response.json() as Promise<Record<string, LookupDetail>>;
    },
  );
  shardCache.set(shard, promise);
  promise.catch(() => shardCache.delete(shard));
  return promise;
}

/** Fetches one candidate's full detail (senses, classifiers) once it has
 *  been chosen from a search result. `undefined` only if `id` isn't
 *  actually in the shard it hashes to — meaning it didn't come from a real
 *  `loadLookupIndex()` result, since every id in the index has a matching
 *  detail entry by construction (`build-lookup.ts` writes both from the
 *  same source row). */
export async function getLookupDetail(id: string): Promise<LookupDetail | undefined> {
  const shard = shardForId(id, LOOKUP_SHARD_COUNT);
  const shardData = await loadDetailShard(shard);
  return shardData[id];
}

// The five precomposed ü-with-tone characters CC-CEDICT's diacritic Pinyin
// can contain, folded to 'v' — the same convention pipeline/match.ts's
// foldForMatching uses for 'u:' in numbered Pinyin. Must run BEFORE the NFD
// combining-mark strip below: decomposing ǚ first would throw away the
// diaeresis along with the tone mark, leaving a bare 'u' instead of 'v'.
const U_UMLAUT_VARIANTS = /[üǖǘǚǜ]/g;

/**
 * Folds a user-typed query — Hanzi, diacritic Pinyin ("nǐ hǎo"), toneless
 * Pinyin ("nihao"), or numbered Pinyin ("ni3 hao3") — to one comparable,
 * toneless, lowercase, space-free key. Applied to BOTH the query and each
 * index row's `readingNumeric` (via `foldReadingForSearch` below), so
 * "nihao", "ni3hao3", and "nǐhǎo" all match the same entries. Deliberately
 * approximate, not a full Pinyin transliteration engine (see
 * services/cedictLookup.ts's module docstring / WO-019's Notes): it does
 * not distinguish tones, which is the point — a toneless search is the
 * overwhelmingly common way people actually type Pinyin into a search box.
 */
function foldPinyinQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(U_UMLAUT_VARIANTS, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[0-9]/g, '')
    .replace(/[\s'-]+/g, '');
}

function foldReadingForSearch(readingNumeric: string): string {
  return readingNumeric
    .toLowerCase()
    .replace(/u:/g, 'v')
    .replace(/[0-9]/g, '')
    .replace(/[\s'-]+/g, '');
}

export interface LookupSearchResult {
  entry: LookupIndexEntry;
  /** Ranking signal for the UI, not a claim of correctness — an exact
   *  Hanzi match is shown before a Pinyin prefix match. */
  matchKind: 'hanzi-exact' | 'pinyin-exact' | 'hanzi-prefix' | 'pinyin-prefix';
}

const DEFAULT_SEARCH_LIMIT = 20;

/**
 * Searches the full in-memory index for a Hanzi or Pinyin query, ranked
 * exact match first, then prefix match, Hanzi before Pinyin at each tier.
 * A blank query returns no results rather than the whole dictionary.
 */
export function searchLookupIndex(
  index: readonly LookupIndexEntry[],
  rawQuery: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
): LookupSearchResult[] {
  const query = rawQuery.trim();
  if (query.length === 0) return [];

  const pinyinQuery = foldPinyinQuery(query);
  const seen = new Set<string>();
  const tiers: LookupSearchResult[][] = [[], [], [], []]; // hanzi-exact, pinyin-exact, hanzi-prefix, pinyin-prefix

  for (const entry of index) {
    const [id, simplified, traditional] = entry;
    if (seen.has(id)) continue;

    const hanziExact = simplified === query || traditional === query;
    const hanziPrefix =
      !hanziExact && (simplified.startsWith(query) || traditional?.startsWith(query));

    const readingFolded = pinyinQuery.length > 0 ? foldReadingForSearch(entry[3]) : '';
    const pinyinExact = pinyinQuery.length > 0 && readingFolded === pinyinQuery;
    const pinyinPrefix =
      !pinyinExact && pinyinQuery.length > 0 && readingFolded.startsWith(pinyinQuery);

    let tierIndex = -1;
    if (hanziExact) tierIndex = 0;
    else if (pinyinExact) tierIndex = 1;
    else if (hanziPrefix) tierIndex = 2;
    else if (pinyinPrefix) tierIndex = 3;

    if (tierIndex === -1) continue;
    seen.add(id);
    tiers[tierIndex]?.push({
      entry,
      matchKind: (['hanzi-exact', 'pinyin-exact', 'hanzi-prefix', 'pinyin-prefix'] as const)[
        tierIndex
      ] as LookupSearchResult['matchKind'],
    });
  }

  return tiers.flat().slice(0, limit);
}
