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
 * The single seam between the UI and `localStorage` (architecture.md §4) —
 * nothing else in this project should call `localStorage` directly. That
 * separation is what lets sync be added post-v1 without a rewrite, and
 * it's where FR-69's export/import lands at M5.
 *
 * Settings is read synchronously at boot (architecture.md §4: "avoids a
 * flash of wrong state") and is the one runtime type that IS persisted,
 * with its own `schemaVersion` (NFR-15) from the first release.
 */

import { DEFAULT_SETTINGS, SETTINGS_SCHEMA_VERSION } from '../domain/runtime.js';
import type { Settings } from '../domain/runtime.js';
import type { CustomDeck } from '../domain/customDeck.js';

const SETTINGS_KEY = 'chinese-flashcards:settings';
const CUSTOM_DECKS_KEY = 'chinese-flashcards:custom-decks';

/**
 * Reads persisted settings, falling back to defaults if nothing is stored,
 * the stored value is malformed, or its schemaVersion doesn't match what
 * this build understands. A schema-mismatch fallback is a placeholder
 * until a real migration path exists (NFR-15, M5) — for now, an
 * unreadable or outdated record is treated as "no settings yet" rather
 * than crashing the app.
 */
export function loadSettings(): Settings {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(SETTINGS_KEY);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (raw === null) return DEFAULT_SETTINGS;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as { schemaVersion?: unknown }).schemaVersion !== SETTINGS_SCHEMA_VERSION
    ) {
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...(parsed as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Persists settings verbatim. Throws are swallowed (e.g. private-browsing
 *  storage quota) rather than crashing the UI — a setting that fails to
 *  save is a degraded experience, not a fatal one. */
export function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Intentionally swallowed — see docstring.
  }
}

/**
 * Reads the learner's custom decks (DEC-036). Unlike Settings, a malformed
 * or unreadable record is *not* silently replaced with an empty list only
 * on the happy path being assumed — this is user-authored content with no
 * source of truth to regenerate from, so a parse failure here is treated
 * the same as "no decks yet" only because there is genuinely nothing safer
 * to do; validity of each deck's own shape is customDecks.ts's job, not
 * this seam's.
 */
export function loadCustomDecks(): CustomDeck[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(CUSTOM_DECKS_KEY);
  } catch {
    return [];
  }
  if (raw === null) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomDeck[]) : [];
  } catch {
    return [];
  }
}

/**
 * Persists the full custom-deck list verbatim. Unlike `saveSettings`,
 * failure is reported to the caller rather than swallowed: losing a
 * learner's own hand-authored deck (e.g. to a full `localStorage` quota) is
 * a real data-loss event the UI must surface, not a degraded-but-safe
 * default like a settings write failing.
 */
export function saveCustomDecks(decks: CustomDeck[]): boolean {
  try {
    window.localStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(decks));
    return true;
  } catch {
    return false;
  }
}
