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
 * Fetches stroke-order data (DEC-035) for one character from
 * `public/strokes/{char}.json` — self-hosted, never hanzi-writer's default
 * jsdelivr CDN loader, specifically so the Hanzi section has no live
 * third-party dependency and can be cached offline like everything else
 * (see the conversation that produced DEC-035: this was a real, corrected
 * misunderstanding, not an assumption). Cached in memory for the page
 * session, same pattern as `decks.ts`.
 */

const cache = new Map<string, Promise<HanziWriterCharacterJson>>();

/** Matches hanzi-writer's own `CharacterJson` shape — duplicated here
 *  rather than imported so this module has no dependency on the
 *  `hanzi-writer` package itself; only the UI layer that renders with it
 *  needs that import. */
export interface HanziWriterCharacterJson {
  strokes: string[];
  medians: number[][][];
}

export async function loadStrokeData(character: string): Promise<HanziWriterCharacterJson> {
  const cached = cache.get(character);
  if (cached) return cached;

  const promise = fetch(
    `${import.meta.env.BASE_URL}strokes/${encodeURIComponent(character)}.json`,
  ).then((response) => {
    if (!response.ok) {
      throw new Error(`failed to load stroke data for ${character}: ${response.status}`);
    }
    return response.json() as Promise<HanziWriterCharacterJson>;
  });
  cache.set(character, promise);
  promise.catch(() => cache.delete(character));
  return promise;
}
