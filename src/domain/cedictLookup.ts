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
 * The CC-CEDICT lookup dataset's shared shape (DEC-037): a full-dictionary
 * search index and its sharded detail store, so custom decks (DEC-036) can
 * be built by looking up any CC-CEDICT word by Hanzi or Pinyin, not just the
 * ~5,259 already compiled into the HSK decks. Lives in `src/domain/` — not
 * `pipeline/` — for the same reason `card.ts` does (its own docstring): it
 * is the contract BETWEEN `pipeline/build-lookup.ts` (which writes it) and
 * `src/services/cedictLookup.ts` (which reads it), so both import one
 * definition instead of two that can drift.
 *
 * `shardForId` is here rather than duplicated in both places for the same
 * reason: the build and the runtime must compute the identical shard number
 * for a given id, or a lookup would fetch the wrong (or a nonexistent)
 * shard file.
 */

/** A compact search-index row: [id, simplified, traditional-or-null,
 *  readingNumeric]. An array tuple, not an object, deliberately — this file
 *  is fetched in full and kept in memory for the session (unlike the sharded
 *  detail store), so its per-entry overhead matters at ~120,000 rows;
 *  dropping repeated object keys is a meaningful size reduction. */
export type LookupIndexEntry = readonly [
  id: string,
  simplified: string,
  traditional: string | null,
  readingNumeric: string,
];

/** One entry's full content — the same fields `Card` carries for display,
 *  minus everything that exists only to serve HSK provenance/review
 *  (`levels`, `source`, `review`, `homographGroup` — domain-model.md §10).
 *  Fetched lazily, one shard at a time, only once a candidate is chosen. */
export interface LookupDetail {
  headword: string;
  headwordTraditional?: string;
  reading: string;
  readingNumeric: string;
  senses: string[];
  classifiers?: {
    simplified: string;
    traditional: string;
    reading: string;
    readingNumeric: string;
  }[];
}

export interface LookupMeta {
  schemaVersion: number;
  shardCount: number;
  dictionaryVersion: string;
  entryCount: number;
  builtAt: string;
}

export const LOOKUP_SCHEMA_VERSION = 1;

/** Number of `detail-{n}.json` shard files `pipeline/build-lookup.ts`
 *  writes and `src/services/cedictLookup.ts` fetches from — one constant,
 *  not duplicated, since the two sides must agree exactly or a lookup
 *  fetches a shard number that was never written. */
export const LOOKUP_SHARD_COUNT = 64;

/**
 * Deterministic FNV-1a 32-bit hash, folded into `[0, shardCount)`. Chosen
 * over a simpler sum-of-char-codes fold for better distribution across
 * shards (a sum fold collides heavily on short CJK-heavy strings sharing
 * character subsets) — this is a dictionary lookup key, not anything
 * security-sensitive, so a small non-cryptographic hash is the right tool.
 */
export function shardForId(id: string, shardCount: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // >>> 0 forces the int32 result unsigned before the modulo, so the result
  // is always a valid non-negative array/file index.
  return (hash >>> 0) % shardCount;
}
