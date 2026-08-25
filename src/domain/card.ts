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
 * The `Card` domain model (domain-model.md §3) — the contract between the
 * build-time data pipeline (`pipeline/`) and the runtime (`src/`). One
 * definition, imported by both, so the two can never drift
 * (conventions.md §1).
 *
 * This file did not exist before WO-007: WO-004/WO-005 deliberately kept
 * their intermediate types (`CedictEntry` etc.) local to `pipeline/`
 * because they are not `Card` (see `pipeline/cedict.ts`'s module
 * docstring). WO-007 is the first work order that needs to construct real
 * `Card` values, so this is where the shared type is introduced. Nothing
 * here encodes a WO-007 judgement call — it is a direct transcription of
 * domain-model.md §3's TypeScript definition, which is stated to be
 * normative.
 *
 * Invariant enforcement (domain-model.md §3 "Invariants") is explicitly
 * WO-008's job, not this module's — this file defines shape only.
 */

/** BCP-47 tag. 'zh-Hans' for v1. */
export type LanguageTag = string;

export type HskLevel = '1' | '2' | '3' | '4' | '5' | '6';

/** Provenance of a card's content, for audit and for review triage. */
export type ContentSource = 'cc-cedict' | 'cc-cedict+override' | 'manual';

/** Result of Red's linguistic review. See testing-strategy.md §5. */
export type ReviewStatus = 'unreviewed' | 'approved' | 'flagged' | 'corrected';

export interface Classifier {
  simplified: string;
  traditional: string;
  reading: string; // diacritics
  readingNumeric: string; // numbered
}

export interface Card {
  /** Stable, deterministic. Format and derivation in domain-model.md §5. Never reused. */
  id: string;

  /** The written form shown on the front. Simplified Chinese in v1. */
  headword: string;

  /** Traditional-character form. Present when it differs from headword. */
  headwordTraditional?: string;

  /** Pronunciation, display-ready, with tone diacritics. e.g. 'nǐ hǎo' */
  reading: string;

  /** Pronunciation as CC-CEDICT supplies it, numbered tones. e.g. 'ni3 hao3'.
   *  Retained for sorting, search, diffing, and regression tests. */
  readingNumeric: string;

  /** English meanings, in CC-CEDICT source order. Never empty. */
  senses: string[];

  /** Measure words / classifiers, extracted from CC-CEDICT CL: annotations.
   *  Rendered separately per UX spec §4.2. */
  classifiers?: Classifier[];

  /** Every level this card belongs to. Normally one; an array because a word
   *  can legitimately appear in more than one published list. */
  levels: HskLevel[];

  /** Set when this headword has multiple readings — see domain-model.md §4.
   *  Cards sharing a homographGroup are distinct cards for the same written
   *  form. */
  homographGroup?: string;

  source: ContentSource;
  review: ReviewStatus;
}

/**
 * Deck schema (domain-model.md §6), added in WO-008 — the first work order
 * that emits `public/decks/*.json`. Direct transcription of that section's
 * normative TypeScript, same as `Card` above.
 */
export interface Deck {
  schemaVersion: number;
  language: LanguageTag;
  level: HskLevel;
  /** Display name, e.g. 'HSK 4'. */
  title: string;
  cards: Card[];
  meta: DeckMeta;
}

export interface DeckMeta {
  cardCount: number;
  /** Publication date of the CC-CEDICT release used. */
  dictionaryVersion: string;
  /** Identifier of the HSK word list source. See data-pipeline.md §4. */
  wordListVersion: string;
  builtAt: string; // ISO 8601
  reviewSummary: Record<ReviewStatus, number>;
}
