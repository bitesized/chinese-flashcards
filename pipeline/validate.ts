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
 * Stage 8 (data-pipeline.md §8): every automated content-correctness gate
 * from testing-strategy.md §3, run against the fully-built, sense-transformed
 * `Card[]`. Any failure fails the build — this module reports every
 * violation it finds rather than stopping at the first, so one run surfaces
 * the whole picture.
 *
 * Determinism (testing-strategy.md §3 gate 9) is deliberately NOT checked
 * here — it is a property of running the whole pipeline twice and diffing
 * output, not of one run's data, so it belongs to the orchestration script
 * (`pipeline/build-data.ts`) and its own test, not this module.
 */

import { pinyinRoundTripsCleanly } from './pinyin.js';
import { loadAllHskMappings } from './hsk.js';
import type {
  ConflictingCedictEntries,
  UnmatchedHskWord,
  UnresolvedCrossReference,
} from './match.js';
import { isWaivedAtLevel } from './waivers.js';
import type { WaiversFile } from './waivers.js';
import type { Card, HskLevel } from '../src/domain/card.js';

const HSK_LEVELS: readonly HskLevel[] = ['1', '2', '3', '4', '5', '6'];

// domain-model.md §9's approximate new-words-per-level figures. A sanity
// check against gross truncation/mis-parsing only (data-pipeline.md §8) —
// deliberately generous, since actual pinned counts (data/source/hsk/SOURCE.md)
// differ from these round figures by design (WO-003's report).
const EXPECTED_APPROX_COUNTS: Record<HskLevel, number> = {
  '1': 150,
  '2': 150,
  '3': 300,
  '4': 600,
  '5': 1300,
  '6': 2500,
};
const COUNT_TOLERANCE_FRACTION = 0.2;

export interface ValidationIssue {
  gate: string;
  message: string;
}

export interface ValidateInput {
  cardsByLevel: Record<HskLevel, Card[]>;
  unmatchedWords: readonly UnmatchedHskWord[];
  unresolvedCrossReferences: readonly UnresolvedCrossReference[];
  conflictingEntries: readonly ConflictingCedictEntries[];
  waivers: WaiversFile;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  /** For the build report: every (headword, level) gap that passed only
   *  because a waiver covers it — visible even when the build is green. */
  waivedGaps: { headword: string; level: HskLevel; reason: string }[];
}

function uniqueCards(cardsByLevel: Record<HskLevel, Card[]>): Card[] {
  const byId = new Map<string, Card>();
  for (const level of HSK_LEVELS) {
    for (const card of cardsByLevel[level]) {
      byId.set(card.id, card);
    }
  }
  return [...byId.values()];
}

const LATIN_LETTER = /[A-Za-z]/;
const HAN_SCRIPT = /\p{Script=Han}/u;
const LEAKED_SYNTAX = /CL:|\[|\]|\|/;

function checkRoundTripPinyin(cards: readonly Card[], issues: ValidationIssue[]): void {
  for (const card of cards) {
    if (!pinyinRoundTripsCleanly(card.readingNumeric)) {
      issues.push({
        gate: 'round-trip-pinyin',
        message: `card ${card.id}: readingNumeric "${card.readingNumeric}" does not round-trip cleanly`,
      });
    }
  }
}

function checkUniqueness(cardsByLevel: Record<HskLevel, Card[]>, issues: ValidationIssue[]): void {
  // A card legitimately appears in more than one level's array (levels.length
  // > 1) as the SAME object — not a duplicate. A true duplicate is the same
  // id resolving to two DIFFERENT card objects (different content).
  const seen = new Map<string, Card>();
  for (const level of HSK_LEVELS) {
    for (const card of cardsByLevel[level]) {
      const existing = seen.get(card.id);
      if (existing === undefined) {
        seen.set(card.id, card);
      } else if (existing !== card && JSON.stringify(existing) !== JSON.stringify(card)) {
        issues.push({
          gate: 'uniqueness',
          message: `duplicate id "${card.id}" resolves to two different cards`,
        });
      }
    }
  }
}

function checkNonEmptySenses(cards: readonly Card[], issues: ValidationIssue[]): void {
  for (const card of cards) {
    if (card.senses.length === 0) {
      issues.push({ gate: 'non-empty-senses', message: `card ${card.id} has zero senses` });
    }
  }
}

function checkNoLeakedSyntax(cards: readonly Card[], issues: ValidationIssue[]): void {
  for (const card of cards) {
    for (const sense of card.senses) {
      if (LEAKED_SYNTAX.test(sense)) {
        issues.push({
          gate: 'no-leaked-syntax',
          message: `card ${card.id}: sense "${sense}" contains raw CC-CEDICT syntax`,
        });
      }
    }
  }
}

function checkHeadwordSanity(cards: readonly Card[], issues: ValidationIssue[]): void {
  for (const card of cards) {
    if (!HAN_SCRIPT.test(card.headword)) {
      issues.push({
        gate: 'headword-sanity',
        message: `card ${card.id}: headword "${card.headword}" contains no CJK ideograph`,
      });
    }
    if (LATIN_LETTER.test(card.headword)) {
      issues.push({
        gate: 'headword-sanity',
        message: `card ${card.id}: headword "${card.headword}" contains a Latin letter`,
      });
    }
  }
}

function checkNothingFlagged(cards: readonly Card[], issues: ValidationIssue[]): void {
  for (const card of cards) {
    if (card.review === 'flagged') {
      issues.push({ gate: 'nothing-flagged', message: `card ${card.id} is flagged` });
    }
  }
}

/** Gate 6 (level coverage) and gate 7 (count tolerance) share the same
 *  per-level headword census, so they run together. */
function checkLevelCoverageAndCounts(
  input: ValidateInput,
  issues: ValidationIssue[],
  waivedGaps: ValidationResult['waivedGaps'],
): void {
  const rows = loadAllHskMappings();
  const headwordsByLevel = new Map<HskLevel, Set<string>>();
  for (const level of HSK_LEVELS) headwordsByLevel.set(level, new Set());
  for (const row of rows) {
    headwordsByLevel.get(row.level)?.add(row.headword);
  }

  const problemLevelsFor = (headword: string): Set<HskLevel> => {
    const levels = new Set<HskLevel>();
    for (const w of input.unmatchedWords) if (w.headword === headword) levels.add(w.level);
    for (const c of input.unresolvedCrossReferences) {
      if (c.headword === headword) for (const l of c.levels) levels.add(l);
    }
    for (const c of input.conflictingEntries) {
      if (c.headword === headword) for (const l of c.levels) levels.add(l);
    }
    return levels;
  };

  const reasonFor = (headword: string): string => {
    if (input.unmatchedWords.some((w) => w.headword === headword)) return 'unmatched';
    if (input.unresolvedCrossReferences.some((c) => c.headword === headword)) {
      return 'unresolved-cross-reference';
    }
    return 'conflicting-entries';
  };

  for (const level of HSK_LEVELS) {
    const headwords = headwordsByLevel.get(level) ?? new Set();
    const cardHeadwords = new Set(input.cardsByLevel[level].map((c) => c.headword));

    for (const headword of headwords) {
      if (cardHeadwords.has(headword)) continue; // resolved

      const problemLevels = problemLevelsFor(headword);
      if (!problemLevels.has(level)) {
        // Not resolved, and not recorded as a known problem at this level
        // either -- a real gap distinct from anything match.ts reported.
        issues.push({
          gate: 'level-coverage',
          message: `HSK ${level}: "${headword}" has no card and no recorded reason why`,
        });
        continue;
      }

      if (isWaivedAtLevel(input.waivers, headword, level)) {
        waivedGaps.push({ headword, level, reason: reasonFor(headword) });
      } else {
        issues.push({
          gate: 'level-coverage',
          message: `HSK ${level}: "${headword}" is unresolved (${reasonFor(headword)}) and not waived`,
        });
      }
    }

    // Gate 7: gross truncation/mis-parse sanity check against domain-model's
    // approximate figures (WO-003's report explains the real pinned counts
    // differ from these round numbers by design, hence the generous
    // tolerance -- this catches a file that's off by an order of magnitude,
    // not a file that's merely not exactly ~150).
    const expected = EXPECTED_APPROX_COUNTS[level];
    const actual = headwords.size;
    const lowerBound = expected * (1 - COUNT_TOLERANCE_FRACTION);
    const upperBound = expected * (1 + COUNT_TOLERANCE_FRACTION);
    if (actual < lowerBound || actual > upperBound) {
      issues.push({
        gate: 'count-tolerance',
        message: `HSK ${level}: ${actual} words is outside tolerance of the expected ~${expected} (domain-model.md §9)`,
      });
    }
  }
}

export function validate(input: ValidateInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const waivedGaps: ValidationResult['waivedGaps'] = [];
  const cards = uniqueCards(input.cardsByLevel);

  checkRoundTripPinyin(cards, issues);
  checkUniqueness(input.cardsByLevel, issues);
  checkNonEmptySenses(cards, issues);
  checkNoLeakedSyntax(cards, issues);
  checkHeadwordSanity(cards, issues);
  checkNothingFlagged(cards, issues);
  checkLevelCoverageAndCounts(input, issues, waivedGaps);

  return { ok: issues.length === 0, issues, waivedGaps };
}
