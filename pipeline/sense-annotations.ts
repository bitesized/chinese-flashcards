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
 * Implements LR-001 (docs/workstream/reviews/LR-001-pronunciation-annotation-brackets.md),
 * Red's ruling on CC-CEDICT's pronunciation-annotation bracket family — the
 * one bracket shape `pipeline/cedict.ts`'s DEC-023 normalisation
 * (`SENSE_REFERENCE_PATTERN`) deliberately does not touch, because it is not
 * a cross-reference to another headword: a bracketed romanised pronunciation
 * with no word directly adjacent to the bracket, e.g. `"also pr. [tou4]"`,
 * `"Taiwan pr. [xing4]"`, `"Jyutping [bo1]"`.
 *
 * This is stage 7 (transform) work, per data-pipeline.md §2 — run after
 * `pipeline/build-cards.ts` (stages 3-6) produces `Card[]`, before validation
 * (stage 8). Pure: `string[]` senses in, `string[]` senses out.
 *
 * Two families, told apart by an explicit label (LR-001's "core
 * distinction" — shape alone cannot tell them apart, since a Jyutping token
 * like `bo1` is letter-plus-digit-shaped exactly like Pinyin):
 *
 * 1. **Non-Mandarin romanisation** (Jyutping, Tai-lo) cited for etymology,
 *    always comma-introduced inside a parenthetical aside (LR-001 §1.1).
 *    The whole labelled clause — label, "pr." if present, bracket(s) — is
 *    dropped. Converting it through `numberedToDiacritic` would silently
 *    produce a plausible-looking but false Mandarin reading.
 * 2. **A genuine Mandarin pronunciation variant** ("also pr.", "Taiwan pr.",
 *    etc. — LR-001 §1.2/§1.3). The bracket content is treated as numbered
 *    Mandarin Pinyin and converted to diacritics via `numberedToDiacritic`
 *    (`pipeline/pinyin.ts`, WO-005), after two corpus-specific
 *    normalisations LR-001 found necessary: recovering syllable boundaries
 *    CC-CEDICT sometimes omits (`[si4de5]` -> `si4 de5`), and — for the
 *    three real hyphen-joined tone-sandhi-pair instances — splitting on `-`
 *    and converting each side independently before rejoining.
 *
 * **Not handled here, by design** (LR-001 §2): the one real
 * DEC-023-cross-reference that leaked past `SENSE_REFERENCE_PATTERN` because
 * CC-CEDICT wrote a space before the bracket (`variant of 冈 [gang1]`, not
 * `冈[gang1]`) is fixed via a card override
 * (`data/overrides/lr-001-cross-reference-and-punctuation.json`), not by
 * this module — the override runs in stage 6, before this stage 7 transform
 * ever sees the sense, so by the time it would reach this module the
 * bracket is already gone. This module does not special-case that shape:
 * feeding it "gang1" would convert successfully (not fail loud), which is
 * exactly why LR-001 routed it to an override instead of the general rule.
 *
 * **Fail-loud rule (LR-001 §1.4)**: a bracket not caught by the
 * non-Mandarin label check that `numberedToDiacritic` cannot parse throws
 * `SenseAnnotationError` rather than silently passing the raw bracket
 * through or guessing. This is the pipeline's standing "fail the build
 * rather than warn" posture (data-pipeline.md §8) applied to a future
 * CC-CEDICT update introducing a bracket shape no current rule recognises.
 */

import { numberedToDiacritic } from './pinyin.js';

export class SenseAnnotationError extends Error {
  readonly sense: string;

  constructor(message: string, sense: string) {
    super(`sense annotation error: ${message}\n  sense: "${sense}"`);
    this.name = 'SenseAnnotationError';
    this.sense = sense;
  }
}

// LR-001 §1.1: a Tai-lo or Jyutping labelled clause, comma-introduced, with
// one or more comma/or-chained bracket groups. The whole match (including
// the leading comma) is removed.
const NON_MANDARIN_CLAUSE = /,\s*(?:Tai-lo pr\.|Jyutping)\s*\[[^\]]*](?:\s*(?:or|,)\s*\[[^\]]*])*/g;

// A run of one or more bracket groups, possibly chained with "or"/",",
// remaining after non-Mandarin clauses have been stripped. Matched as one
// chain so multi-bracket senses (LR-001 §1.2, e.g. "Taiwan pr. [pang2],
// [bang1], [bang4]") are converted and rejoined together, not independently.
const BRACKET_CHAIN = /\[[^\]]*](?:\s*(?:or|,)\s*\[[^\]]*])*/g;
const SINGLE_BRACKET = /\[([^\]]*)]/g;
const BRACKET_SEPARATOR = /\](\s*(?:or|,)\s*)\[/g;

/** LR-001 §1.2 step 1: unlike the primary `[...]` reading field (always
 *  space-separated), roughly 15% of these annotation brackets concatenate
 *  syllables with no space at all (`[si4de5]`, `[zhong1pei4]`). Insert a
 *  space after every tone digit immediately followed by a letter. Pure
 *  syllable-boundary recovery — never changes a digit or letter. */
function recoverSyllableSpaces(content: string): string {
  return content.replace(/([1-5])(?=[A-Za-z])/g, '$1 ');
}

/** LR-001 §1.3: three real instances are hyphen-joined tone-sandhi pairs
 *  (`[yi1mo2-yi1yang4]`). Split on `-`, convert each side independently,
 *  rejoin with `-` — `numberedToDiacritic` rejects a bare hyphen, so it
 *  cannot see the whole string at once. A bracket with no hyphen is the
 *  single-segment case of the same code path. */
function convertBracketContent(content: string): string {
  const segments = content.includes('-') ? content.split('-') : [content];
  return segments.map((segment) => numberedToDiacritic(recoverSyllableSpaces(segment))).join('-');
}

function convertBracketChain(chain: string, sense: string): string {
  const brackets = [...chain.matchAll(SINGLE_BRACKET)].map((m) => m[1] ?? '');
  const separators = [...chain.matchAll(BRACKET_SEPARATOR)].map((m) => m[1] ?? ', ');

  const converted = brackets.map((content) => {
    try {
      return convertBracketContent(content);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new SenseAnnotationError(
        `unrecognised bracket annotation "[${content}]" — not a known Mandarin ` +
          `pronunciation-variant shape, and not caught by the Tai-lo/Jyutping label ` +
          `check (LR-001 §1.4). Underlying error: ${reason}`,
        sense,
      );
    }
  });

  let result = converted[0] ?? '';
  for (let i = 1; i < converted.length; i += 1) {
    result += (separators[i - 1] ?? ', ') + converted[i];
  }
  return result;
}

function transformSense(sense: string): string {
  const withoutNonMandarin = sense.replace(NON_MANDARIN_CLAUSE, '');
  return withoutNonMandarin.replace(BRACKET_CHAIN, (chain) => convertBracketChain(chain, sense));
}

/**
 * Applies LR-001's transformation to every sense of a card (or any sense
 * list). Senses with no bracket at all pass through unchanged. Throws
 * `SenseAnnotationError` per LR-001 §1.4 on a bracket shape not recognised
 * by either family — never silently drops or mis-converts one.
 */
export function transformSenseAnnotations(senses: readonly string[]): string[] {
  return senses.map(transformSense);
}
