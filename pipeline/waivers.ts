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
 * "Explicitly waived", per data-pipeline.md §5.3 and §8, and
 * testing-strategy.md §3 gate 6: a word the pipeline could not resolve to a
 * card (unmatched, an unresolved cross-reference, or a same-key content
 * conflict — `pipeline/match.ts`), recorded as a deliberate, visible,
 * committed exception rather than silently failing the build forever.
 *
 * This is a NEW mechanism, not one the spec defines a schema for — the
 * existing override file (`pipeline/overrides.ts`) is keyed by `Card.id`
 * and corrects an EXISTING card; it structurally cannot represent "this
 * word has no card yet, and that is known and tracked," since there is no
 * id to key against. See [DEC-026](../docs/project/decision-log.md) for why
 * a separate file is the right shape.
 *
 * **This is not a resolution.** A waiver records that a gap is known and
 * tracked; it does not supply content, and it does not require (or permit)
 * inventing a linguistic judgement — that is Red's, via a real override
 * once WO-009's review reaches the word. `data/overrides/waived-words.json`
 * is a one-time, committed snapshot of every word this pipeline could not
 * resolve as of the date recorded — NOT regenerated on every build. If a
 * future build finds a word neither resolved nor present in this file, the
 * build correctly fails (gate 6) — that is what catches a regression a
 * silently-regenerated file never could.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HskLevel } from '../src/domain/card.js';

export type WaiverReason = 'unmatched' | 'unresolved-cross-reference' | 'conflicting-entries';

export interface WaivedWord {
  reason: WaiverReason;
  levels: HskLevel[];
  detail: string;
  waivedBy: string;
  waivedAt: string;
  /** Where resolution is tracked — a work order id, e.g. "WO-009". */
  trackedIn: string;
}

export type WaiversFile = Record<string, WaivedWord>;

const DEFAULT_WAIVERS_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../data/overrides/waived-words.json',
);

/** Thin I/O shell. Returns `{}` if the file doesn't exist — a project with
 *  no waivers yet is a valid, if temporary, state. */
export function loadWaivers(filePath: string = DEFAULT_WAIVERS_PATH): WaiversFile {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    return {};
  }
  return JSON.parse(raw) as WaiversFile;
}

/** Whether `headword` is waived at `level` specifically — a waiver for one
 *  level does not silently cover a different level the same headword might
 *  also appear at. */
export function isWaivedAtLevel(waivers: WaiversFile, headword: string, level: HskLevel): boolean {
  const waiver = waivers[headword];
  return waiver !== undefined && waiver.levels.includes(level);
}
