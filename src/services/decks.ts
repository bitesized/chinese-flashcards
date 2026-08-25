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
 * never downloads HSK 6. Caching behind a service worker is M6; this is
 * the plain fetch this project's cache-first strategy will later wrap.
 */

import type { Deck, HskLevel } from '../domain/card.js';

export async function loadDeck(level: HskLevel): Promise<Deck> {
  const response = await fetch(`/decks/hsk-${level}.json`);
  if (!response.ok) {
    throw new Error(`failed to load HSK ${level} deck: ${response.status}`);
  }
  return (await response.json()) as Deck;
}
