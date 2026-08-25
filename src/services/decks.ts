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
 * Fetches a compiled deck (`public/decks/hsk-{level}.json`) at runtime.
 * Per-level, fetched on demand — architecture.md §3/§6: a beginner at HSK 1
 * never downloads HSK 6.
 *
 * Cached in memory for the lifetime of the page (WO-014/M3): a level
 * re-selected later in the same visit, or fetched twice at once by a
 * multi-level session, is served from this cache rather than re-fetched.
 * This is deliberately not the persistent, offline-capable cache — that is
 * `vite-plugin-pwa`/Workbox's job (M6, architecture.md §4); this cache is
 * gone on a hard reload, same as any other module-level state.
 */

import type { Deck, HskLevel } from '../domain/card.js';

const cache = new Map<HskLevel, Promise<Deck>>();

export async function loadDeck(level: HskLevel): Promise<Deck> {
  const cached = cache.get(level);
  if (cached) return cached;

  const promise = fetch(`/decks/hsk-${level}.json`).then((response) => {
    if (!response.ok) {
      throw new Error(`failed to load HSK ${level} deck: ${response.status}`);
    }
    return response.json() as Promise<Deck>;
  });
  // Cache the promise itself, not its resolved value, so two concurrent
  // callers (e.g. a multi-level session's Promise.all) share one fetch
  // rather than racing two. A failed fetch is evicted so a later retry
  // (StudySession's "Retry" button) issues a fresh request instead of
  // replaying the same rejection forever.
  cache.set(level, promise);
  promise.catch(() => cache.delete(level));
  return promise;
}
