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
 * Fetches the Hanzi section's data (DEC-035, M8), compiled by
 * `pipeline/build-hanzi.ts`: the full browsable index
 * (`public/hanzi/index.json`, fetched once) and individual character
 * entries (`public/hanzi/{char}.json`, fetched on demand). Same
 * page-session caching pattern as `decks.ts`/`strokes.ts`.
 */

import type { HanziEntry, HanziIndexEntry } from '../domain/hanzi.js';

let indexCache: Promise<HanziIndexEntry[]> | null = null;

export async function loadHanziIndex(): Promise<HanziIndexEntry[]> {
  if (indexCache) return indexCache;
  const promise = fetch('/hanzi/index.json').then((response) => {
    if (!response.ok) {
      throw new Error(`failed to load Hanzi index: ${response.status}`);
    }
    return response.json() as Promise<HanziIndexEntry[]>;
  });
  indexCache = promise;
  promise.catch(() => {
    indexCache = null;
  });
  return promise;
}

const entryCache = new Map<string, Promise<HanziEntry>>();

export async function loadHanziEntry(character: string): Promise<HanziEntry> {
  const cached = entryCache.get(character);
  if (cached) return cached;

  const promise = fetch(`/hanzi/${encodeURIComponent(character)}.json`).then((response) => {
    if (!response.ok) {
      throw new Error(`failed to load Hanzi entry for ${character}: ${response.status}`);
    }
    return response.json() as Promise<HanziEntry>;
  });
  entryCache.set(character, promise);
  promise.catch(() => entryCache.delete(character));
  return promise;
}
