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
 * CC-CEDICT parser (data-pipeline.md §3, stage 2 of the nine-stage pipeline).
 *
 * Turns the raw CC-CEDICT text format into an intermediate `CedictEntry[]` —
 * NOT yet a `Card` (domain-model.md §3). Homograph resolution, HSK matching,
 * cross-reference resolution, and numbered-Pinyin -> diacritic conversion are
 * all later stages (WO-007, WO-008) and are deliberately out of scope here.
 *
 * `parseCedict` is a pure function (raw text in, structured result out), the
 * same shape as `pipeline/pinyin.ts` (WO-005) and for the same reason: it
 * must be usable and testable in complete isolation from the real source
 * file, HSK matching, and everything downstream. `loadCedict` is a thin I/O
 * shell around it for the real build.
 *
 * Grammar handled, per line:
 *   Traditional Simplified [reading] /sense one/sense two/.../
 *
 * Rules implemented, in the order data-pipeline.md §3's table states them:
 *   - Comments (`#`, including `#!` metadata lines) are skipped. The `#!
 *     date=...` line is captured as `dictionaryVersion`; `#! entries=...` is
 *     captured as `sourceEntryCount` for a later sanity check against the
 *     parsed entry count (WO-002's report explains the expected delta).
 *   - Traditional-then-Simplified field order preserved.
 *   - The `[...]` reading block is captured verbatim as `readingNumeric` —
 *     erhua's `r5`, `u:`, and proper-noun capitalisation untouched. This is
 *     exactly the shape `pipeline/pinyin.ts`'s `numberedToDiacritic` expects
 *     as input (WO-005's report), even though this module never calls it.
 *   - Senses split on top-level `/` only.
 *   - `CL:` senses are extracted to `classifiers` and removed from `senses`;
 *     each classifier item may be `simp[reading]` or `trad|simp[reading]`.
 *   - A `trad|simp[reading]` or bare `word[reading]` cross-reference inside
 *     an ordinary sense is normalised to just the simplified/plain word — no
 *     raw `|`, `[`, or `]` survives from this pattern. See the extended note
 *     below on why this also covers the un-bracketed `trad|simp` form.
 *   - Register markers (`(coll.)`, `(lit.)`, `(fig.)`, `(dialect)`, etc.) are
 *     left untouched — they are meaning, not noise.
 *   - Cross-reference-shaped senses (`see ...`, `variant of ...`, etc.) parse
 *     as ordinary sense strings, subject to the same normalisation above.
 *     Resolving what they point to is stage 5 (WO-007), not this module.
 *   - Surname entries (`/surname Wang/`) need no special-casing.
 *   - A headword with no CJK ideograph is excluded from `entries` and
 *     recorded in `excluded` instead — a first line of defence, not full
 *     invariant enforcement (that is WO-008's job, domain-model.md §3
 *     invariant 5).
 *   - CRLF line endings are stripped when splitting lines; no field carries
 *     a trailing `\r`.
 *
 * Extended beyond the letter of data-pipeline.md §3's "trad|simp notation"
 * row: real corpus data (verified against the full pinned file while
 * building this parser) contains the same cross-reference mechanism in two
 * further shapes the spec's single worked example doesn't show:
 *   1. `trad|simp` with NO trailing `[reading]` at all — e.g. "abbr. for
 *      三項全能|三项全能" (no bracket, because no reading is being cited).
 *      751 senses in the pinned corpus use this shape.
 *   2. A bare `word[reading]` with no pipe at all, when traditional and
 *      simplified happen to be identical for that word — e.g. "erhua form
 *      of 一下[yi1 xia4]".
 * Both leak the same raw `|`/`[`/`]` syntax the spec's rule exists to keep
 * out of shipped senses, and both are the same "point at another headword,
 * optionally with a reading" mechanism, just with one optional part missing.
 * Both are covered by `SENSE_REFERENCE_PATTERN` below. This is a mechanical,
 * non-linguistic normalisation (always prefer the already-standard
 * simplified form) — not a translation call — so it does not need Red's
 * sign-off. See the WO-004 work report's Findings for the corpus counts and
 * for the one bracket shape that is deliberately NOT touched (below).
 *
 * Deliberately NOT touched: CC-CEDICT also uses `[...]` for alternate- or
 * non-standard-pronunciation annotations with no preceding word attached,
 * e.g. "also pr. [tou4]", "pronounced [a4 pu5 zhu3]", "Jyutping [bo1]" (818
 * senses in the pinned corpus), and, separately, two entries whose gloss is
 * literally about square brackets as punctuation ("square brackets [ ]").
 * `SENSE_REFERENCE_PATTERN` requires a word immediately adjacent to `[` (no
 * space) to match, so none of these are touched — correctly, since they are
 * not `trad|simp` references and normalising them would be a content
 * decision, not a syntax cleanup. They therefore still contain `[`/`]` in
 * this module's output; see the work report for why this is flagged rather
 * than silently patched.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export class CedictParseError extends Error {
  readonly lineNumber: number;
  readonly line: string;

  constructor(message: string, lineNumber: number, line: string) {
    super(`CC-CEDICT parse error at line ${lineNumber}: ${message}\n  ${line}`);
    this.name = 'CedictParseError';
    this.lineNumber = lineNumber;
    this.line = line;
  }
}

/** A measure word / classifier extracted from a `CL:` sense. Numbered
 *  reading only — diacritic conversion is stage 7 (pipeline/pinyin.ts),
 *  out of scope here (see module docstring). */
export interface CedictClassifier {
  traditional: string;
  simplified: string;
  readingNumeric: string;
}

/**
 * One parsed CC-CEDICT entry. Intermediate shape, NOT a `Card` —
 * domain-model.md deliberately does not define this, since it is internal to
 * the pipeline (WO-004 work order). Carries what a later stage needs to
 * build a `Card`: both headword forms, the raw numbered reading, ordered
 * senses, any classifiers, and the source line for debugging a parse
 * failure or an unexpected downstream result.
 */
export interface CedictEntry {
  traditional: string;
  simplified: string;
  /** Verbatim numbered reading from the `[...]` block — e.g. "ni3 hao3",
   *  "lu:4", "yi1 hui4 r5", "Zhong1 guo2". Unconverted; shaped exactly as
   *  `numberedToDiacritic` (pipeline/pinyin.ts) expects it. */
  readingNumeric: string;
  /** Ordered English glosses, `CL:` senses removed, dictionary
   *  cross-reference syntax normalised per the module docstring. Never
   *  empty for an entry that reaches this array (an entry with zero senses
   *  after CL: extraction would be a real content problem, not silently
   *  possible here — see `parseCedict`'s handling below). */
  senses: string[];
  /** Present only when the entry had at least one `CL:` sense. */
  classifiers?: CedictClassifier[];
  /** 1-based line number in the input this entry was parsed from. */
  sourceLine: number;
}

export type CedictExclusionReason = 'non-han-headword';

/** An entry excluded from `CedictEntry[]` output — recorded, not silently
 *  dropped (data-pipeline.md §3, "Non-Han headwords" row). */
export interface CedictExcludedEntry {
  traditional: string;
  simplified: string;
  readingNumeric: string;
  reason: CedictExclusionReason;
  sourceLine: number;
}

export interface CedictParseResult {
  entries: CedictEntry[];
  excluded: CedictExcludedEntry[];
  /** Release date captured from the header's `#! date=...` line, for
   *  `DeckMeta.dictionaryVersion` (domain-model.md §6). `undefined` if the
   *  input had no such header line — callers should treat that as a build
   *  problem, not silently substitute a value. */
  dictionaryVersion: string | undefined;
  /** Entry count as stated by the header's `#! entries=...` line, for a
   *  later sanity check against `entries.length + excluded.length`.
   *  `undefined` if the input had no such header line. */
  sourceEntryCount: number | undefined;
}

// One data line: `Traditional Simplified [reading] /sense1/sense2/.../`.
// Traditional and Simplified are taken as single whitespace-free tokens —
// verified against the full pinned corpus (124,903 of 124,903 non-comment
// lines match; see the WO-004 work report) rather than assumed.
const ENTRY_PATTERN = /^(\S+)\s+(\S+)\s+\[([^\]]*)]\s+\/(.*)\/\s*$/;

// `#! key=value` header metadata lines. Plain `#` comment lines (the
// licence banner etc.) simply don't match and are skipped without capturing
// anything.
const HEADER_META_PATTERN = /^#!\s*([a-zA-Z]+)=(.*)$/;

// One item inside a `CL:` sense's classifier list: `simp[reading]` or
// `trad|simp[reading]`.
const CLASSIFIER_PATTERN = /^(?:([^|[\]]+)\|)?([^|[\]]+)\[([^\]]+)]$/;

// A dictionary cross-reference inside an ordinary sense, in either of two
// shapes (see the module docstring's "Extended beyond..." note):
//   1. `trad|simp` optionally followed by `[reading]`
//   2. a bare `word[reading]` (no pipe) — used when trad === simp
// Requires the word to sit directly against `[`/`|` with no space, which is
// exactly what keeps this from matching space-separated annotations like
// "also pr. [tou4]" (see "Deliberately NOT touched" in the module
// docstring) — there, nothing whitespace-free precedes the `[`.
const SENSE_REFERENCE_PATTERN =
  /([^\s|[\]/]+)\|([^\s|[\]/]+)(?:\[[^\]]*])?|([^\s|[\]/]+)\[[^\]]*]/g;

// A classifier annotation embedded parenthetically INSIDE an otherwise
// substantive sense, distinct from the top-level `CL:...` sense the
// "Classifiers" row's own worked example shows — e.g.
// "light; ray (CL:道[dao4])" (real line 10577), where the whole string
// "light; ray (CL:道[dao4])" is one `/`-delimited sense, not two. Found
// while wiring WO-008's no-leaked-syntax gate against real HSK data: 85
// entries in the pinned corpus use this shape, several of them common HSK
// words (光, 菜, 门, 画, 刀, 墙, ...). No nested parentheses occur inside a
// classifier list, so a non-greedy same-line match is safe.
const EMBEDDED_CLASSIFIER_PATTERN = /\s*\(CL:([^()]+)\)/;

const CJK_IDEOGRAPH = /\p{Script=Han}/u;

function hasCjkIdeograph(text: string): boolean {
  return CJK_IDEOGRAPH.test(text);
}

function normalizeSense(
  match: string,
  tradWithSimp: string | undefined,
  simp: string | undefined,
  word: string | undefined,
): string {
  if (simp !== undefined) return simp;
  if (word !== undefined) return word;
  // Unreachable: SENSE_REFERENCE_PATTERN's two alternatives always populate
  // either (simp) or (word). Falling back to the raw match rather than
  // throwing keeps a hypothetical future regex edit from turning into a
  // build-breaking crash on unrelated content — worth revisiting if this
  // path is ever actually hit.
  return tradWithSimp ?? match;
}

function normalizeSenseText(raw: string): string {
  return raw.replace(SENSE_REFERENCE_PATTERN, normalizeSense).trim();
}

function parseClassifierItem(item: string, lineNumber: number, line: string): CedictClassifier {
  const match = CLASSIFIER_PATTERN.exec(item);
  if (!match) {
    throw new CedictParseError(`malformed CL: classifier item "${item}"`, lineNumber, line);
  }
  const [, traditional, simplified, readingNumeric] = match;
  // simplified (group 2) is always present when CLASSIFIER_PATTERN matches;
  // traditional (group 1) falls back to it when the trad|simp form wasn't
  // used (trad === simp, so CC-CEDICT wrote it once).
  const simp = simplified as string;
  return {
    traditional: traditional ?? simp,
    simplified: simp,
    readingNumeric: (readingNumeric as string).trim(),
  };
}

/** Extracts an embedded `(CL:...)` parenthetical from a sense that is not
 *  itself a top-level `CL:` sense, if present. Runs BEFORE
 *  `normalizeSenseText` on the remainder, since the classifier items carry
 *  their own `[reading]` that `SENSE_REFERENCE_PATTERN` would otherwise
 *  strip (it cannot tell a classifier's reading from a cross-reference's). */
function extractEmbeddedClassifier(
  rawSense: string,
  lineNumber: number,
  line: string,
): { text: string; classifiers: CedictClassifier[] } {
  const match = EMBEDDED_CLASSIFIER_PATTERN.exec(rawSense);
  if (!match) return { text: rawSense, classifiers: [] };

  const items = (match[1] as string).split(',');
  const classifiers = items.map((item) => parseClassifierItem(item, lineNumber, line));
  const text = (
    rawSense.slice(0, match.index) + rawSense.slice(match.index + match[0].length)
  ).trim();

  return { text, classifiers };
}

function parseSenseBlock(
  senseBlock: string,
  lineNumber: number,
  line: string,
): { senses: string[]; classifiers: CedictClassifier[] } {
  const senses: string[] = [];
  const classifiers: CedictClassifier[] = [];

  for (const rawSense of senseBlock.split('/')) {
    if (rawSense.startsWith('CL:')) {
      const items = rawSense.slice('CL:'.length).split(',');
      for (const item of items) {
        classifiers.push(parseClassifierItem(item, lineNumber, line));
      }
      continue;
    }
    const { text, classifiers: embedded } = extractEmbeddedClassifier(rawSense, lineNumber, line);
    classifiers.push(...embedded);
    senses.push(normalizeSenseText(text));
  }

  return { senses, classifiers };
}

function parseHeaderLine(
  line: string,
  state: { dictionaryVersion: string | undefined; sourceEntryCount: number | undefined },
): void {
  const match = HEADER_META_PATTERN.exec(line);
  if (!match) return;
  const [, key, value] = match;
  if (key === 'date') {
    state.dictionaryVersion = value;
  } else if (key === 'entries') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      state.sourceEntryCount = parsed;
    }
  }
}

/**
 * Parses CC-CEDICT's text format into structured entries. Pure: no I/O, no
 * network, no reliance on platform default encoding — the caller is
 * responsible for reading the source file as UTF-8 (see `loadCedict`).
 *
 * @throws {CedictParseError} on a non-comment, non-blank line that doesn't
 *   match the `Traditional Simplified [reading] /senses/` grammar, or a
 *   malformed `CL:` classifier item. Both indicate real corpus damage or a
 *   parser bug, not something to silently skip — "fail the build rather
 *   than warn" (CLAUDE.md's charter for this agent).
 */
export function parseCedict(raw: string): CedictParseResult {
  // CRLF-pinned source (WO-002's report), but tolerate bare \n or \r too —
  // whatever the input uses, no field is left carrying a trailing \r.
  const lines = raw.split(/\r\n|\r|\n/);

  const entries: CedictEntry[] = [];
  const excluded: CedictExcludedEntry[] = [];
  const header: { dictionaryVersion: string | undefined; sourceEntryCount: number | undefined } = {
    dictionaryVersion: undefined,
    sourceEntryCount: undefined,
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.length === 0) return;

    if (line.startsWith('#')) {
      parseHeaderLine(line, header);
      return;
    }

    const match = ENTRY_PATTERN.exec(line);
    if (!match) {
      throw new CedictParseError(
        'line does not match the "Traditional Simplified [reading] /senses/" grammar',
        lineNumber,
        line,
      );
    }
    const [, traditional, simplified, readingBlock, senseBlock] = match;
    const trad = traditional as string;
    const simp = simplified as string;
    const readingNumeric = (readingBlock as string).trim().replace(/\s+/g, ' ');

    if (!hasCjkIdeograph(simp)) {
      excluded.push({
        traditional: trad,
        simplified: simp,
        readingNumeric,
        reason: 'non-han-headword',
        sourceLine: lineNumber,
      });
      return;
    }

    const { senses, classifiers } = parseSenseBlock(senseBlock as string, lineNumber, line);

    entries.push({
      traditional: trad,
      simplified: simp,
      readingNumeric,
      senses,
      ...(classifiers.length > 0 ? { classifiers } : {}),
      sourceLine: lineNumber,
    });
  });

  return {
    entries,
    excluded,
    dictionaryVersion: header.dictionaryVersion,
    sourceEntryCount: header.sourceEntryCount,
  };
}

const DEFAULT_CEDICT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../data/source/cedict/cedict_1_0_ts_utf-8_mdbg.txt',
);

/**
 * Thin I/O shell around `parseCedict`: reads the pinned CC-CEDICT file
 * (UTF-8, explicit — never the platform default) and parses it. This is the
 * function later pipeline stages (WO-007 onward) should import; `parseCedict`
 * itself stays pure and is what the fixture-driven test suite exercises
 * directly, the same split `pipeline/pinyin.ts` (WO-005) uses.
 */
export function loadCedict(filePath: string = DEFAULT_CEDICT_PATH): CedictParseResult {
  const raw = readFileSync(filePath, 'utf-8');
  return parseCedict(raw);
}
