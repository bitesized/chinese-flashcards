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
 * Runtime-only types (domain-model.md §8) — never persisted except
 * `Settings`, which is the one exception (its own schema-versioned
 * localStorage record, architecture.md §4). Introduced in WO-011 (M2);
 * `mode`/`queue` are shaped so M5 can swap in the scheduler's due-card
 * queue as the source of `queue` without changing anything else about this
 * type or how the UI consumes it — see WO-011's Context section.
 */

import type { HskLevel } from './card.js';

export interface Session {
  deckIds: HskLevel[];
  /** Card ids in traversal order. At M2 this is the deck in list order
   *  (optionally shuffled — `Settings.cardOrder`); from M5 it is the
   *  scheduler's due-card queue (scheduling.md §5). */
  queue: string[];
  position: number;
  face: 'front' | 'back';
  /** Free review does not write scheduling state (FR-66). M2 has no
   *  scheduler yet, so every M2 session is effectively free-review-shaped
   *  navigation; the mode field exists now so M5 has something to switch
   *  on rather than introducing it retroactively. */
  mode: 'scheduled' | 'free-review';
  gradedThisSession: number;
}

export interface Settings {
  schemaVersion: number;
  pinyinFront: boolean; // default true — DEC-007
  pinyinBack: boolean; // default true — DEC-007
  cardOrder: 'shuffled' | 'sequential'; // default 'shuffled' — FR-32
  /** Web Speech API rate multiplier, continuous rather than a fixed
   *  normal/slow pair (FR-45's stated minimum; a slider exceeds it) — range
   *  and default chosen by ear against a real voice, not derived from a
   *  spec (see speech.ts). */
  speechRate: number; // default 0.7 — FR-45, added WO-012
  autoplayOnReveal: boolean; // default false — FR-41/FR-46, added WO-012
  theme: 'system' | 'light' | 'dark'; // default 'system'
  lastLevels: HskLevel[]; // FR-25 — not yet acted on until M3
}

export const SETTINGS_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  pinyinFront: true,
  pinyinBack: true,
  cardOrder: 'shuffled',
  speechRate: 0.7,
  autoplayOnReveal: false,
  theme: 'system',
  lastLevels: [],
};
