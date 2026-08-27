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
 * `CustomDeck`/`CustomCard` (domain-model.md §10) — learner-authored decks,
 * added by DEC-036. Deliberately a parallel entity to `Deck`/`Card`
 * (card.ts), not a variant of it: `levels`, `source`, `review`, and
 * `homographGroup` exist to serve CC-CEDICT provenance and Red's review
 * workflow, neither of which applies to content nobody sourced from a
 * dictionary.
 *
 * The limits below are enforced at every entry point (manual add/edit and
 * JSON import alike, in customDecks.ts) — DEC-036 treats a shared JSON file
 * as untrusted input, so nothing here is a client-side-only nicety.
 */

export interface CustomCard {
  /** Stable within the deck. Generated client-side, never parsed. */
  id: string;
  headword: string;
  /** Optional — a learner may not know or need Pinyin for their own words. */
  reading?: string;
  /** Non-empty. English (or any) meanings, learner's own wording — or, when
   *  `source` is set, CC-CEDICT's own wording, editable/removable per card. */
  senses: string[];
  notes?: string;
  /** Set only when this card's headword/reading/senses were populated via
   *  the CC-CEDICT lookup (DEC-037), not hand-typed. Absent (not `false`)
   *  for ordinary manual entries, matching this file's existing
   *  absent-means-default convention. Drives the CC BY-SA 4.0 attribution
   *  notice (services/customDecks.ts's `deckNeedsAttribution`) — required
   *  because a card sourced this way carries CC-CEDICT's own content, which
   *  CLAUDE.md §04 requires to travel with an attribution, including through
   *  a JSON export to another learner. Editing the senses afterwards does
   *  not clear this flag: the card is still substantially CC-CEDICT-derived
   *  even once a sense or two has been trimmed. */
  source?: 'cc-cedict';
}

export interface CustomDeck {
  schemaVersion: number;
  /** Stable, generated on creation. Regenerated on import (see customDecks.ts)
   *  so importing a file never silently overwrites an existing local deck. */
  id: string;
  name: string;
  description?: string;
  cards: CustomCard[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export const CUSTOM_DECK_SCHEMA_VERSION = 1;

/** Enforced by customDecks.ts on every create/edit/import path. */
export const CUSTOM_DECK_LIMITS = {
  maxDecks: 50,
  maxCardsPerDeck: 1000,
  maxNameLength: 120,
  maxDescriptionLength: 500,
  maxHeadwordLength: 100,
  maxReadingLength: 200,
  maxSensesPerCard: 20,
  maxSenseLength: 500,
  maxNotesLength: 1000,
} as const;
