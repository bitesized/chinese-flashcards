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
 * Per-character dictionary (DEC-035, M8) — FR-80's "look up any individual
 * Hanzi character and see its Pinyin reading(s) and English meaning(s)".
 * Deliberately separate from the word-level `Card`/deck pipeline
 * (`pipeline/build-cards.ts`): this is CC-CEDICT filtered to
 * exactly-one-character entries, grouped by that one character, with no
 * HSK level tagging, no homograph-group linking, and no override/exclusion
 * mechanism — the Hanzi section is a reference tool for individual
 * characters, not a studyable deck, so the correctness bar and mechanisms
 * `testing-strategy.md` §5 requires for shipped *word* cards do not apply
 * here the same way. Still runs the same vulgar-content filter (DEC-029)
 * and bracket-annotation cleanup (LR-001) for consistency.
 */

import { numberedToDiacritic } from './pinyin.js';
import { filterVulgarSenses } from './content-filter.js';
import { transformSenseAnnotations } from './sense-annotations.js';
import type { CedictEntry } from './cedict.js';

export interface HanziReading {
  reading: string;
  readingNumeric: string;
  senses: string[];
}

export interface HanziEntry {
  character: string;
  readings: HanziReading[];
}

/**
 * Builds one `HanziEntry` per character in `characters`, from every
 * CC-CEDICT entry whose `simplified` field is exactly that one character.
 * A character with no CC-CEDICT entry at all (should not happen for a
 * character drawn from a shipped headword, but not assumed) is simply
 * omitted, not synthesised or guessed at. Pure: no I/O (console.warn
 * aside, for the one skip case below, which is deliberately visible during
 * `npm run build:hanzi` rather than silent).
 */
export function buildHanziDictionary(
  characters: ReadonlySet<string>,
  entries: readonly CedictEntry[],
): Map<string, HanziEntry> {
  const byCharacter = new Map<string, HanziEntry>();

  for (const entry of entries) {
    if ([...entry.simplified].length !== 1) continue;
    if (!characters.has(entry.simplified)) continue;

    const senses = transformSenseAnnotations(filterVulgarSenses(entry.senses));
    if (senses.length === 0) continue;

    // A small number of single-character CC-CEDICT entries describe a
    // *role* rather than a standalone syllable — e.g. 儿's own entry for
    // "r5" ("non-syllabic diminutive suffix"), which has no preceding
    // syllable for `numberedToDiacritic` to attach the erhua suffix to
    // (correctly an error there: every *word*-level reading always has
    // one). Skipped, not crashed on — the character still gets its other,
    // displayable reading(s) (儿 also has "er2", "child/son").
    let reading: string;
    try {
      reading = numberedToDiacritic(entry.readingNumeric);
    } catch (error) {
      console.warn(
        `build:hanzi: skipping ${entry.simplified} [${entry.readingNumeric}] — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      continue;
    }

    const next: HanziReading = { reading, readingNumeric: entry.readingNumeric, senses };

    const existing = byCharacter.get(entry.simplified);
    if (existing) {
      existing.readings.push(next);
    } else {
      byCharacter.set(entry.simplified, { character: entry.simplified, readings: [next] });
    }
  }

  return byCharacter;
}
