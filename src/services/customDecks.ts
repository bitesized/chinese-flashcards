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
 * CRUD, JSON export/import, and validation for custom decks (DEC-036,
 * domain-model.md §10). `validateImportedDeck` is the untrusted-input
 * boundary: a shared `.json` file is, by construction, a payload of unknown
 * origin, so every field is type- and length-checked before it reaches
 * storage.ts or the UI, and nothing from it is ever passed to `innerHTML` or
 * any HTML-parsing sink — the study UI (Card.tsx) renders it exactly like
 * HSK content, as plain text nodes.
 */

import { loadCustomDecks, saveCustomDecks } from './storage.js';
import { CUSTOM_DECK_LIMITS, CUSTOM_DECK_SCHEMA_VERSION } from '../domain/customDeck.js';
import type { CustomCard, CustomDeck } from '../domain/customDeck.js';
import type { StudyableCard } from '../domain/card.js';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without Web Crypto (not expected in any
  // supported browser, kept only so this never throws).
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function listDecks(): CustomDeck[] {
  return loadCustomDecks();
}

export function getDeck(id: string): CustomDeck | undefined {
  return loadCustomDecks().find((deck) => deck.id === id);
}

export interface SaveResult {
  ok: boolean;
  decks: CustomDeck[];
}

/** Upserts one deck into the persisted list and writes it back. */
function persistDeck(deck: CustomDeck): SaveResult {
  const decks = loadCustomDecks();
  const index = decks.findIndex((d) => d.id === deck.id);
  const next = index === -1 ? [...decks, deck] : decks.map((d, i) => (i === index ? deck : d));
  const ok = saveCustomDecks(next);
  return { ok, decks: ok ? next : decks };
}

export interface CreateDeckResult {
  ok: boolean;
  deck?: CustomDeck;
  error?: string;
}

export function createDeck(name: string): CreateDeckResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: 'Deck name is required.' };
  if (trimmed.length > CUSTOM_DECK_LIMITS.maxNameLength) {
    return {
      ok: false,
      error: `Deck name must be ${CUSTOM_DECK_LIMITS.maxNameLength} characters or fewer.`,
    };
  }
  if (loadCustomDecks().length >= CUSTOM_DECK_LIMITS.maxDecks) {
    return {
      ok: false,
      error: `You can have at most ${CUSTOM_DECK_LIMITS.maxDecks} custom decks.`,
    };
  }
  const timestamp = nowIso();
  const deck: CustomDeck = {
    schemaVersion: CUSTOM_DECK_SCHEMA_VERSION,
    id: generateId(),
    name: trimmed,
    cards: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const result = persistDeck(deck);
  return result.ok
    ? { ok: true, deck }
    : { ok: false, error: 'Could not save the new deck — device storage may be full.' };
}

export function updateDeckMeta(
  deck: CustomDeck,
  meta: { name: string; description?: string },
): CreateDeckResult {
  const trimmedName = meta.name.trim();
  if (trimmedName.length === 0) return { ok: false, error: 'Deck name is required.' };
  if (trimmedName.length > CUSTOM_DECK_LIMITS.maxNameLength) {
    return {
      ok: false,
      error: `Deck name must be ${CUSTOM_DECK_LIMITS.maxNameLength} characters or fewer.`,
    };
  }
  const trimmedDescription = meta.description?.trim();
  if (trimmedDescription && trimmedDescription.length > CUSTOM_DECK_LIMITS.maxDescriptionLength) {
    return {
      ok: false,
      error: `Description must be ${CUSTOM_DECK_LIMITS.maxDescriptionLength} characters or fewer.`,
    };
  }
  const next: CustomDeck = { ...deck, name: trimmedName, updatedAt: nowIso() };
  // Not folded into the object literal above: an emptied description must
  // actually disappear from `next`, not be overwritten with the same
  // falsy-but-present key `exactOptionalPropertyTypes` would otherwise let
  // `undefined` mean.
  if (trimmedDescription) next.description = trimmedDescription;
  else delete next.description;
  const result = persistDeck(next);
  return result.ok ? { ok: true, deck: next } : { ok: false, error: 'Could not save changes.' };
}

export interface CardInput {
  headword: string;
  reading?: string;
  senses: string[];
  notes?: string;
  /** Set when the caller pre-filled this card from a CC-CEDICT lookup
   *  (DEC-037) rather than hand-typing it — carried through to `CustomCard`
   *  unchanged, including if the learner has since edited the senses. */
  source?: 'cc-cedict';
}

function validateCardInput(input: CardInput): string | undefined {
  const headword = input.headword.trim();
  if (headword.length === 0) return 'Headword is required.';
  if (headword.length > CUSTOM_DECK_LIMITS.maxHeadwordLength) {
    return `Headword must be ${CUSTOM_DECK_LIMITS.maxHeadwordLength} characters or fewer.`;
  }
  if (input.reading && input.reading.length > CUSTOM_DECK_LIMITS.maxReadingLength) {
    return `Reading must be ${CUSTOM_DECK_LIMITS.maxReadingLength} characters or fewer.`;
  }
  const senses = input.senses.map((s) => s.trim()).filter((s) => s.length > 0);
  if (senses.length === 0) return 'At least one meaning is required.';
  if (senses.length > CUSTOM_DECK_LIMITS.maxSensesPerCard) {
    return `A card can have at most ${CUSTOM_DECK_LIMITS.maxSensesPerCard} meanings.`;
  }
  if (senses.some((s) => s.length > CUSTOM_DECK_LIMITS.maxSenseLength)) {
    return `Each meaning must be ${CUSTOM_DECK_LIMITS.maxSenseLength} characters or fewer.`;
  }
  if (input.notes && input.notes.length > CUSTOM_DECK_LIMITS.maxNotesLength) {
    return `Notes must be ${CUSTOM_DECK_LIMITS.maxNotesLength} characters or fewer.`;
  }
  return undefined;
}

function toCard(input: CardInput, id: string): CustomCard {
  const reading = input.reading?.trim();
  const notes = input.notes?.trim();
  return {
    id,
    headword: input.headword.trim(),
    senses: input.senses.map((s) => s.trim()).filter((s) => s.length > 0),
    ...(reading ? { reading } : {}),
    ...(notes ? { notes } : {}),
    ...(input.source === 'cc-cedict' ? { source: input.source } : {}),
  };
}

/** True when at least one card in the deck carries CC-CEDICT-derived
 *  content (DEC-037) — drives the CC BY-SA 4.0 attribution notice
 *  (CustomDeckList/CustomDeckEditor) and the export attribution line
 *  (`exportDeckToJson` below). Required, not decorative: CLAUDE.md §04's
 *  ShareAlike obligation on CC-CEDICT-derived content is inherited, not
 *  optional, and this is the one place that determines whether it applies
 *  to a given deck. */
export function deckNeedsAttribution(deck: CustomDeck): boolean {
  return deck.cards.some((card) => card.source === 'cc-cedict');
}

export interface CardMutationResult {
  ok: boolean;
  deck?: CustomDeck;
  error?: string;
}

export function addCard(deck: CustomDeck, input: CardInput): CardMutationResult {
  const error = validateCardInput(input);
  if (error) return { ok: false, error };
  if (deck.cards.length >= CUSTOM_DECK_LIMITS.maxCardsPerDeck) {
    return {
      ok: false,
      error: `A deck can have at most ${CUSTOM_DECK_LIMITS.maxCardsPerDeck} cards.`,
    };
  }
  const next: CustomDeck = {
    ...deck,
    cards: [...deck.cards, toCard(input, generateId())],
    updatedAt: nowIso(),
  };
  const result = persistDeck(next);
  return result.ok
    ? { ok: true, deck: next }
    : { ok: false, error: 'Could not save the new card.' };
}

export function updateCard(deck: CustomDeck, cardId: string, input: CardInput): CardMutationResult {
  const error = validateCardInput(input);
  if (error) return { ok: false, error };
  const next: CustomDeck = {
    ...deck,
    cards: deck.cards.map((card) => (card.id === cardId ? toCard(input, cardId) : card)),
    updatedAt: nowIso(),
  };
  const result = persistDeck(next);
  return result.ok ? { ok: true, deck: next } : { ok: false, error: 'Could not save changes.' };
}

export function removeCard(deck: CustomDeck, cardId: string): CardMutationResult {
  const next: CustomDeck = {
    ...deck,
    cards: deck.cards.filter((card) => card.id !== cardId),
    updatedAt: nowIso(),
  };
  const result = persistDeck(next);
  return result.ok ? { ok: true, deck: next } : { ok: false, error: 'Could not save changes.' };
}

export function deleteDeck(id: string): boolean {
  const decks = loadCustomDecks().filter((deck) => deck.id !== id);
  return saveCustomDecks(decks);
}

/** Projects a `CustomCard` onto the same minimal shape the study UI reads
 *  from an HSK `Card` (domain/card.ts's `StudyableCard`, DEC-036). */
export function toStudyableCard(card: CustomCard): StudyableCard {
  return {
    id: card.id,
    headword: card.headword,
    reading: card.reading ?? '',
    senses: card.senses,
  };
}

/** CC-CEDICT's own licence, cited exactly as `data/LICENSE` cites it for
 *  the compiled HSK decks — the same obligation applies here, since a
 *  deck's export is exactly the kind of redistribution CC BY-SA 4.0's
 *  ShareAlike term covers (DEC-037). */
const CC_CEDICT_ATTRIBUTION =
  'This deck includes definitions from CC-CEDICT (https://cc-cedict.org/), ' +
  'licensed CC BY-SA 4.0. Redistributing this file must preserve this notice.';

/** Serialises a deck for export/sharing. Adds a top-level `attribution`
 *  field — informational only, not part of `CustomDeck` itself
 *  (`validateImportedDeck` ignores it on the way back in) — whenever the
 *  deck carries any CC-CEDICT-derived card, so a recipient who only ever
 *  sees the `.json` file still receives the required attribution. */
export function exportDeckToJson(deck: CustomDeck): string {
  const payload = deckNeedsAttribution(deck)
    ? { ...deck, attribution: CC_CEDICT_ATTRIBUTION }
    : deck;
  return JSON.stringify(payload, null, 2);
}

export interface ValidationSuccess {
  ok: true;
  deck: CustomDeck;
}
export interface ValidationFailure {
  ok: false;
  error: string;
}
export type ValidationResult = ValidationSuccess | ValidationFailure;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * The untrusted-input boundary (DEC-036). Accepts `unknown` — the result of
 * `JSON.parse`-ing a file the browser cannot trust — and either returns a
 * clean, size-bounded `CustomDeck` ready to persist, or a human-readable
 * rejection reason. Never throws; never assumes a field exists or has the
 * expected type before checking.
 */
export function validateImportedDeck(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'This file is not a custom deck (expected a JSON object).' };
  }
  const data = raw as Record<string, unknown>;

  if (data.schemaVersion !== CUSTOM_DECK_SCHEMA_VERSION) {
    return { ok: false, error: 'This file is from an unsupported deck format version.' };
  }
  if (!isNonEmptyString(data.name)) {
    return { ok: false, error: 'This deck file is missing a name.' };
  }
  if (data.name.length > CUSTOM_DECK_LIMITS.maxNameLength) {
    return {
      ok: false,
      error: `Deck name exceeds the ${CUSTOM_DECK_LIMITS.maxNameLength}-character limit.`,
    };
  }
  if (data.description !== undefined && typeof data.description !== 'string') {
    return { ok: false, error: 'This deck file has an invalid description.' };
  }
  if (
    typeof data.description === 'string' &&
    data.description.length > CUSTOM_DECK_LIMITS.maxDescriptionLength
  ) {
    return { ok: false, error: 'This deck file’s description is too long.' };
  }
  if (!Array.isArray(data.cards)) {
    return { ok: false, error: 'This deck file has no card list.' };
  }
  if (data.cards.length === 0) {
    return { ok: false, error: 'This deck file has no cards.' };
  }
  if (data.cards.length > CUSTOM_DECK_LIMITS.maxCardsPerDeck) {
    return {
      ok: false,
      error: `This deck file has more than the ${CUSTOM_DECK_LIMITS.maxCardsPerDeck}-card limit.`,
    };
  }

  const cards: CustomCard[] = [];
  for (const [i, rawCard] of data.cards.entries()) {
    if (typeof rawCard !== 'object' || rawCard === null || Array.isArray(rawCard)) {
      return { ok: false, error: `Card ${i + 1} is not a valid card.` };
    }
    const c = rawCard as Record<string, unknown>;
    if (!isNonEmptyString(c.headword)) {
      return { ok: false, error: `Card ${i + 1} is missing a headword.` };
    }
    if (c.headword.length > CUSTOM_DECK_LIMITS.maxHeadwordLength) {
      return { ok: false, error: `Card ${i + 1}'s headword is too long.` };
    }
    if (c.reading !== undefined && typeof c.reading !== 'string') {
      return { ok: false, error: `Card ${i + 1} has an invalid reading.` };
    }
    if (typeof c.reading === 'string' && c.reading.length > CUSTOM_DECK_LIMITS.maxReadingLength) {
      return { ok: false, error: `Card ${i + 1}'s reading is too long.` };
    }
    if (!Array.isArray(c.senses) || c.senses.length === 0) {
      return { ok: false, error: `Card ${i + 1} needs at least one meaning.` };
    }
    if (c.senses.length > CUSTOM_DECK_LIMITS.maxSensesPerCard) {
      return { ok: false, error: `Card ${i + 1} has too many meanings.` };
    }
    const senses: string[] = [];
    for (const sense of c.senses) {
      if (!isNonEmptyString(sense)) {
        return { ok: false, error: `Card ${i + 1} has an invalid meaning.` };
      }
      if (sense.length > CUSTOM_DECK_LIMITS.maxSenseLength) {
        return { ok: false, error: `Card ${i + 1} has a meaning that is too long.` };
      }
      senses.push(sense.trim());
    }
    if (c.notes !== undefined && typeof c.notes !== 'string') {
      return { ok: false, error: `Card ${i + 1} has invalid notes.` };
    }
    if (typeof c.notes === 'string' && c.notes.length > CUSTOM_DECK_LIMITS.maxNotesLength) {
      return { ok: false, error: `Card ${i + 1}'s notes are too long.` };
    }
    const importedReading = typeof c.reading === 'string' ? c.reading.trim() : '';
    const importedNotes = typeof c.notes === 'string' ? c.notes.trim() : '';
    // Any value other than the one recognised literal is normalised away
    // rather than rejecting the whole import — an untrusted field with a
    // garbage value should degrade to "not CC-CEDICT-sourced", not fail the
    // whole file (same posture as every other optional field here).
    const importedSource = c.source === 'cc-cedict' ? ('cc-cedict' as const) : undefined;
    cards.push({
      id: generateId(),
      headword: c.headword.trim(),
      senses,
      ...(importedReading ? { reading: importedReading } : {}),
      ...(importedNotes ? { notes: importedNotes } : {}),
      ...(importedSource ? { source: importedSource } : {}),
    });
  }

  const timestamp = nowIso();
  const importedDescription = typeof data.description === 'string' ? data.description.trim() : '';
  return {
    ok: true,
    deck: {
      schemaVersion: CUSTOM_DECK_SCHEMA_VERSION,
      // Always a fresh id — an import never silently overwrites an existing
      // local deck that happens to share one (DEC-036).
      id: generateId(),
      name: data.name.trim(),
      ...(importedDescription ? { description: importedDescription } : {}),
      cards,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

export interface ImportResult {
  ok: boolean;
  deck?: CustomDeck;
  error?: string;
}

/** Parses and validates a raw file's text content, then persists the result.
 *  The one function the UI calls for the whole import flow. */
export function importDeckFromText(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }

  const validated = validateImportedDeck(parsed);
  if (!validated.ok) return { ok: false, error: validated.error };

  if (loadCustomDecks().length >= CUSTOM_DECK_LIMITS.maxDecks) {
    return {
      ok: false,
      error: `You can have at most ${CUSTOM_DECK_LIMITS.maxDecks} custom decks.`,
    };
  }

  const result = persistDeck(validated.deck);
  return result.ok
    ? { ok: true, deck: validated.deck }
    : { ok: false, error: 'Could not save the imported deck — device storage may be full.' };
}
