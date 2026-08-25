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
 * Numbered-Pinyin <-> tone-diacritic conversion (data-pipeline.md §3, stage 7).
 *
 * Pure, side-effect-free, no I/O. This is the highest-value unit in the
 * pipeline to get exhaustively right (WO-005 notes) — every rule below maps
 * directly to a numbered rule in data-pipeline.md §3 and is exercised by
 * pipeline/pinyin.test.ts, including reconciliation against Red's test table
 * (data/test-fixtures/pinyin-conversion.json, WO-006).
 *
 * Rules implemented, in the order data-pipeline.md §3 states them:
 *   1. `u:` -> `ü`, applied before any tone-mark placement.
 *   2. Tone 5, or no digit at all, produces no mark.
 *   3. If the syllable contains `a`, the mark goes on the `a`.
 *   4. Otherwise, if it contains `o` or `e`, the mark goes there (the two
 *      never co-occur in a standard syllable, so checking either order is
 *      equivalent).
 *   5. Otherwise the mark goes on the LAST vowel in the syllable.
 *   6. Capitalisation of the syllable's first letter is preserved.
 *   7. Multi-syllable input joins with a single space.
 *   8. Erhua's `r5` fuses onto the end of the preceding syllable's
 *      diacritic form with no space and no mark of its own (DEC-021 —
 *      data-pipeline.md §3 rule 8 was clarified during WO-006 to state this
 *      fusion is a direct join, not space-separated). A standalone `儿`
 *      word (`er2`/`ér` etc.) is an ordinary syllable, not erhua, and is
 *      handled by the normal per-syllable path.
 */

export class PinyinFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PinyinFormatError';
  }
}

type VowelBase = 'a' | 'e' | 'i' | 'o' | 'u' | 'ü';

// Tone 1-4 diacritic forms per vowel, index 0 = tone 1 (macron) ... index 3 =
// tone 4 (grave). Tone 5 (neutral) and "no digit" both produce no mark and
// never consult this table.
const TONE_MARKS: Record<VowelBase, readonly [string, string, string, string]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

const VOWELS: ReadonlySet<string> = new Set(['a', 'e', 'i', 'o', 'u', 'ü']);

/** Reverse lookup: a tone-marked character -> its plain base vowel and tone. */
const REVERSE_TONE_MAP: ReadonlyMap<string, { base: VowelBase; tone: 1 | 2 | 3 | 4 }> = (() => {
  const map = new Map<string, { base: VowelBase; tone: 1 | 2 | 3 | 4 }>();
  for (const base of Object.keys(TONE_MARKS) as VowelBase[]) {
    const marks = TONE_MARKS[base];
    marks.forEach((mark, i) => {
      const tone = (i + 1) as 1 | 2 | 3 | 4;
      map.set(mark, { base, tone });
    });
  }
  return map;
})();

function toneMarkedChar(base: VowelBase, tone: 1 | 2 | 3 | 4): string {
  const marks = TONE_MARKS[base];
  const mark = marks[tone - 1];
  if (mark === undefined) {
    // Unreachable given the `1 | 2 | 3 | 4` type, but keeps this function
    // honest under noUncheckedIndexedAccess rather than asserting past it.
    throw new PinyinFormatError(`no tone-${tone} mark defined for "${base}"`);
  }
  return mark;
}

/** Rules 3-5: find the index of the vowel that takes the tone mark. */
function findTonePosition(base: string): number {
  const aIndex = base.indexOf('a');
  if (aIndex !== -1) return aIndex;

  const oIndex = base.indexOf('o');
  if (oIndex !== -1) return oIndex;

  const eIndex = base.indexOf('e');
  if (eIndex !== -1) return eIndex;

  for (let i = base.length - 1; i >= 0; i -= 1) {
    if (VOWELS.has(base[i] ?? '')) return i;
  }
  return -1;
}

function isUpperCaseLetter(char: string): boolean {
  return char.length > 0 && char !== char.toLowerCase() && char === char.toUpperCase();
}

/**
 * Converts one numbered-Pinyin syllable (no erhua suffix, no surrounding
 * whitespace) to its diacritic form. Rules 1-6.
 */
function convertSyllable(rawToken: string): string {
  if (rawToken.length === 0) {
    throw new PinyinFormatError('empty syllable');
  }

  const isCapitalized = isUpperCaseLetter(rawToken[0] ?? '');
  const lower = rawToken.toLowerCase();

  const toneDigitMatch = /^(.*?)([0-9])$/.exec(lower);
  let tone = 5;
  let rawBase = lower;
  if (toneDigitMatch) {
    const digit = Number(toneDigitMatch[2]);
    if (digit < 1 || digit > 5) {
      throw new PinyinFormatError(`invalid tone digit in "${rawToken}": must be 1-5`);
    }
    tone = digit;
    rawBase = toneDigitMatch[1] ?? '';
  }

  if (rawBase.length === 0) {
    throw new PinyinFormatError(`"${rawToken}" has no letters to place a tone on`);
  }

  // Rule 1: u: -> ü, before any placement logic.
  if (!/^[a-z]*(u:[a-z]*)*$/.test(rawBase) && rawBase.includes(':')) {
    throw new PinyinFormatError(`"${rawToken}" has a colon not in the "u:" position`);
  }
  const base = rawBase.replace(/u:/g, 'ü');

  if (base.includes(':')) {
    throw new PinyinFormatError(`"${rawToken}" has a colon not in the "u:" position`);
  }
  if (!/^[a-zü]+$/.test(base)) {
    throw new PinyinFormatError(`"${rawToken}" contains characters outside a-z and ü`);
  }

  let result = base;
  if (tone !== 5) {
    const pos = findTonePosition(base);
    if (pos === -1) {
      throw new PinyinFormatError(`"${rawToken}" has no vowel to carry a tone mark`);
    }
    const vowelChar = base[pos];
    if (!vowelChar || !VOWELS.has(vowelChar)) {
      throw new PinyinFormatError(`"${rawToken}" has no vowel to carry a tone mark`);
    }
    const marked = toneMarkedChar(vowelChar as VowelBase, tone as 1 | 2 | 3 | 4);
    result = base.slice(0, pos) + marked + base.slice(pos + 1);
  }

  if (isCapitalized) {
    result = (result[0] ?? '').toUpperCase() + result.slice(1);
  }

  return result;
}

/**
 * Converts numbered Pinyin — one syllable, or a space-separated sequence as
 * it appears inside CC-CEDICT's `[...]` block, erhua's trailing `r5`
 * included — to its diacritic form.
 *
 * @throws {PinyinFormatError} on malformed input: empty input, an erhua
 *   suffix with no preceding syllable, an out-of-range tone digit, a
 *   syllable with no vowel, or a character outside a-z/u:/digits.
 */
export function numberedToDiacritic(input: string): string {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new PinyinFormatError('input must be a non-empty string');
  }

  const tokens = input.trim().split(/\s+/);
  const outputs: string[] = [];

  for (const token of tokens) {
    if (token === 'r5') {
      // Rule 8: erhua fuses onto the previous syllable, no space, no mark.
      if (outputs.length === 0) {
        throw new PinyinFormatError('erhua suffix "r5" has no preceding syllable');
      }
      outputs[outputs.length - 1] += 'r';
      continue;
    }
    outputs.push(convertSyllable(token));
  }

  return outputs.join(' ');
}

/**
 * Reconstructs a syllable's numbered form from its diacritic form. Always
 * emits an explicit tone digit, including `5` for neutral tone — this
 * matches CC-CEDICT's own convention (data-pipeline.md §3: the corpus never
 * omits the digit), which is what makes the round-trip check in
 * {@link pinyinRoundTripsCleanly} meaningful against real data. A
 * numbered-form input that itself omits the digit (the defensive "bare
 * syllable" case in rule 2) will therefore not round-trip byte-for-byte —
 * this is a known, intentional asymmetry, not a bug; see pinyin.test.ts.
 */
function convertSyllableBack(token: string): string {
  if (token.length === 0) {
    throw new PinyinFormatError('empty syllable');
  }

  const isCapitalized = isUpperCaseLetter(token[0] ?? '');
  const lower = token.toLowerCase();

  let tone = 5;
  let base = lower;
  for (let i = 0; i < lower.length; i += 1) {
    const found = REVERSE_TONE_MAP.get(lower[i] ?? '');
    if (found) {
      tone = found.tone;
      base = lower.slice(0, i) + found.base + lower.slice(i + 1);
      break;
    }
  }

  if (!/^[a-zü]+$/.test(base)) {
    throw new PinyinFormatError(`could not reconstruct a valid syllable from "${token}"`);
  }

  let numberedBase = base.replace(/ü/g, 'u:');
  if (isCapitalized) {
    numberedBase = (numberedBase[0] ?? '').toUpperCase() + numberedBase.slice(1);
  }

  return `${numberedBase}${tone}`;
}

/**
 * The inverse of {@link numberedToDiacritic}: converts a diacritic Pinyin
 * string back to numbered form. Exported per data-pipeline.md §3 for the
 * build-time round-trip gate (testing-strategy.md §3, gate 1) that the
 * future validation stage (WO-008) runs across the whole corpus.
 *
 * Erhua disambiguation: a token ending in `r` is either (a) the fused
 * erhua suffix on a preceding syllable, or (b) the standalone syllable
 * `er`/`ér`/`ěr`/`èr` (the one syllable in standard Mandarin that
 * legitimately ends in a bare `r`). Distinguished structurally: if
 * everything before the final `r` reduces to a single `e`-family character
 * (`e`, or a tone-marked `e`), it is case (b) and the whole token —
 * including the `r` — is one ordinary syllable. Otherwise it is case (a):
 * the `r` is split off as its own `r5` token. This is sound for the real
 * corpus (erhua only ever fuses onto a genuine multi-letter syllable) but
 * is not a fully general reverse-parser for arbitrary invented strings.
 *
 * @throws {PinyinFormatError} on input that cannot be reconstructed into a
 *   valid syllable.
 */
export function diacriticToNumbered(input: string): string {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new PinyinFormatError('input must be a non-empty string');
  }

  const tokens = input.trim().split(/\s+/);
  const outputs: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower.length >= 2 && lower.endsWith('r')) {
      const beforeR = token.slice(0, -1);
      const beforeRLower = beforeR.toLowerCase();
      const beforeRIsBareOrMarkedE =
        beforeRLower.length === 1 &&
        (beforeRLower === 'e' || REVERSE_TONE_MAP.get(beforeRLower)?.base === 'e');

      if (beforeRIsBareOrMarkedE) {
        outputs.push(convertSyllableBack(token));
      } else {
        outputs.push(convertSyllableBack(beforeR));
        outputs.push('r5');
      }
      continue;
    }
    outputs.push(convertSyllableBack(token));
  }

  return outputs.join(' ');
}

/**
 * Runs `numbered -> diacritic -> numbered` and reports whether the result
 * matches the input exactly. This is the corpus-wide gate from
 * testing-strategy.md §3 ("Round-trip Pinyin ... Mismatch fails"), exported
 * as a single boolean check for the future validation stage (WO-008) to
 * call per card. Never throws for malformed input — a thrown
 * {@link PinyinFormatError} is treated as a failed round-trip, since a
 * `readingNumeric` value the converter cannot even parse is exactly the
 * kind of corpus error this gate exists to catch.
 */
export function pinyinRoundTripsCleanly(numbered: string): boolean {
  try {
    const diacritic = numberedToDiacritic(numbered);
    const roundTripped = diacriticToNumbered(diacritic);
    return roundTripped === numbered;
  } catch {
    return false;
  }
}
