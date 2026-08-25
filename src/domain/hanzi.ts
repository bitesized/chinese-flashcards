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
 * The Hanzi section's per-character domain shape (DEC-035, M8) —
 * deliberately separate from `card.ts`'s `Card`/`Deck` (word-level, HSK
 * deck-studyable). Mirrors `pipeline/hanzi-dictionary.ts`'s output exactly;
 * see that module for how these are compiled.
 */

export interface HanziReading {
  reading: string;
  readingNumeric: string;
  senses: string[];
}

export interface HanziEntry {
  character: string;
  readings: HanziReading[];
}

/** One row of `public/hanzi/index.json` — enough to render and search the
 *  full browsable list (FR-85) without fetching all ~2,600 per-character
 *  files up front. */
export interface HanziIndexEntry {
  character: string;
  readings: string[];
}
