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
 * HSK word-list extraction (data-pipeline.md §4, stage 1/4 of the
 * nine-stage pipeline), per `data/source/hsk/SOURCE.md` §6's spec.
 *
 * The pinned source (`drkameleon/complete-hsk-vocabulary`, `exclusive/old`
 * variant, one file per level) nests every reading ("form") of a
 * polyphonic headword under one JSON entry. Per SOURCE.md §6 this module
 * flattens `forms[]` into one `(headword, level, readingNumeric)` row per
 * form, discarding everything else the source carries (`radical`,
 * `frequency`, `pos`, `traditional`, non-numeric transcriptions,
 * `meanings`, `classifiers`) — per DEC-017, this source is a **level tag
 * only**; no content is taken from it.
 *
 * `readingNumeric` on the emitted row is the source's own `numeric` field,
 * with ONE source-specific data-quality fix applied (SOURCE.md §5.2): a
 * trailing bare `er` (the one inconsistently-marked entry, 纽扣儿) is
 * rewritten to `r5` so it is equivalent to CC-CEDICT's erhua convention.
 * The row's reading is otherwise left as the source wrote it (`ü` intact,
 * e.g. `lü4`, not folded to CC-CEDICT's `u:` convention) — it is still a
 * faithful, human-readable value at this point, useful in an unmatched-word
 * report. The `ü`/`u:` fold SOURCE.md §5.1 requires before comparing against
 * CC-CEDICT is applied at comparison time by
 * `pipeline/identifiers.ts`'s `normalizeReadingKey`, which `pipeline/match.ts`
 * calls on both sides — folding is a matching-key concern, not an
 * extraction concern, and applying it here would make every mismatch report
 * to a human read a reading CC-CEDICT itself never writes.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HskLevel } from '../src/domain/card.js';

/** One `(headword, level, readingNumeric)` row, per SOURCE.md §6. */
export interface HskMappingRow {
  headword: string;
  level: HskLevel;
  /**
   * The matching key only — never shipped (DEC-017). Optional because the
   * general matching rule this feeds (data-pipeline.md §5.2 rule 2) must
   * handle a source that does not disambiguate a headword's reading at
   * all; the currently pinned source (SOURCE.md §2) always supplies one
   * per form, so `parseHskMapping` below always populates it, but the type
   * stays honest about what the matcher must actually support. See the
   * WO-007 report for how this branch is exercised without a real source
   * row that needs it.
   */
  readingNumeric?: string;
}

interface HskSourceForm {
  transcriptions?: {
    numeric?: string;
  };
}

interface HskSourceEntry {
  simplified?: string;
  forms?: HskSourceForm[];
}

/**
 * SOURCE.md §5.2: the one known inconsistency in the pinned source — a
 * trailing bare `er` (no tone digit) on the final syllable, where every
 * other erhua-suffixed entry correctly writes `r5`. Rewriting it here
 * means the matcher only ever has to reason about one erhua convention.
 */
function normalizeTrailingBareEr(readingNumeric: string): string {
  const tokens = readingNumeric.trim().split(/\s+/);
  const last = tokens[tokens.length - 1];
  if (last === 'er') {
    tokens[tokens.length - 1] = 'r5';
    return tokens.join(' ');
  }
  return readingNumeric;
}

/**
 * Parses one HSK level file's raw JSON text into mapping rows. Pure: no
 * I/O. `level` is supplied by the caller because the source encodes it only
 * in the filename (`hsk-{N}.json`), not in the file's own content.
 *
 * @throws {SyntaxError} on invalid JSON (propagated from `JSON.parse`).
 * @throws {Error} if an entry is missing `simplified`, a form is missing
 *   `transcriptions.numeric`, or the parsed JSON isn't an array — all
 *   indicate the pinned source has changed shape underneath us, which
 *   should fail the build loudly rather than silently produce a wrong or
 *   partial mapping.
 */
export function parseHskMapping(raw: string, level: HskLevel): HskMappingRow[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`HSK level ${level} source is not a JSON array`);
  }

  const rows: HskMappingRow[] = [];

  (parsed as HskSourceEntry[]).forEach((entry, entryIndex) => {
    const headword = entry.simplified;
    if (typeof headword !== 'string' || headword.length === 0) {
      throw new Error(`HSK level ${level}, entry ${entryIndex}: missing "simplified" headword`);
    }
    const forms = entry.forms;
    if (!Array.isArray(forms) || forms.length === 0) {
      throw new Error(`HSK level ${level}, entry ${entryIndex} (${headword}): missing "forms"`);
    }

    forms.forEach((form, formIndex) => {
      const numeric = form.transcriptions?.numeric;
      if (typeof numeric !== 'string' || numeric.length === 0) {
        throw new Error(
          `HSK level ${level}, entry ${entryIndex} (${headword}), form ${formIndex}: ` +
            'missing "transcriptions.numeric"',
        );
      }
      rows.push({
        headword,
        level,
        readingNumeric: normalizeTrailingBareEr(numeric),
      });
    });
  });

  return rows;
}

const HSK_LEVELS: readonly HskLevel[] = ['1', '2', '3', '4', '5', '6'];

const DEFAULT_HSK_SOURCE_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../data/source/hsk',
);

/** Thin I/O shell around `parseHskMapping` for one level's pinned file. */
export function loadHskMapping(
  level: HskLevel,
  sourceDir: string = DEFAULT_HSK_SOURCE_DIR,
): HskMappingRow[] {
  const filePath = resolve(sourceDir, `hsk-${level}.json`);
  const raw = readFileSync(filePath, 'utf-8');
  return parseHskMapping(raw, level);
}

/** Thin I/O shell: loads and flattens all six pinned level files. */
export function loadAllHskMappings(sourceDir: string = DEFAULT_HSK_SOURCE_DIR): HskMappingRow[] {
  return HSK_LEVELS.flatMap((level) => loadHskMapping(level, sourceDir));
}
