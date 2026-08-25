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
 * Card `id` derivation (domain-model.md §5, DEC-005 as amended by
 * [DEC-024](../docs/project/decision-log.md)): `<headword>:<readingNumeric
 * normalised>`, normalisation = spaces removed, `u:`/`ü` folded to `v`,
 * **case preserved**.
 *
 * DEC-024 corrected the originally-ratified DEC-005 text ("lowercase, spaces
 * removed, `u:` folded to `v`") after this module's case-insensitive fold
 * was found to collide real HSK 1 data: `都` has both `Du1` (surname) and
 * `du1` (capital city) as distinct, substantive CC-CEDICT entries — the
 * exact pair DEC-022 already names — and both lowercased to the identical
 * id `都:du1`. CC-CEDICT's capitalisation of a proper-noun/surname reading
 * (data-pipeline.md §3) is the only signal distinguishing such pairs, so
 * folding it away for id purposes destroyed real information for no
 * benefit — ids are opaque to the UI (domain-model.md §5), so nothing
 * depended on them being lowercase.
 *
 * This fold is now identical in shape to `pipeline/match.ts`'s
 * `foldForMatching` (both case-sensitive, both fold `u:`/`ü`→`v`), which was
 * already implemented this way for the same reason before DEC-024 brought
 * the id scheme into line with it.
 */

/**
 * Folds a numbered-Pinyin reading to the id key domain-model.md §5
 * specifies: all whitespace removed, `ü` and `u:` both folded to `v`, case
 * preserved ([DEC-024](../docs/project/decision-log.md)). Used ONLY for
 * `computeCardId`. Never used for anything shipped — shipped
 * `reading`/`readingNumeric` always derive from CC-CEDICT verbatim, per
 * DEC-017.
 */
export function normalizeReadingKey(readingNumeric: string): string {
  return readingNumeric.replace(/\s+/g, '').replace(/u:/g, 'v').replace(/ü/g, 'v');
}

/**
 * Computes `Card.id` per domain-model.md §5: `<headword>:<readingNumeric
 * normalised>`, e.g. `行:hang2`, `你好:ni3hao3`. `headword` is used as-is
 * (already Simplified CJK, no normalisation specified for it); only the
 * reading side is normalised.
 */
export function computeCardId(headword: string, readingNumeric: string): string {
  return `${headword}:${normalizeReadingKey(readingNumeric)}`;
}
