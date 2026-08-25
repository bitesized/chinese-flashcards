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
 * Orchestrates stages 3-6 of the pipeline (data-pipeline.md §2): index
 * (`pipeline/match.ts`), match and resolve (`pipeline/match.ts`), and
 * override (`pipeline/overrides.ts`) — producing the in-memory `Card[]`,
 * grouped by level, that WO-008 (stages 7-9: validate, transform, emit)
 * consumes. `buildCards` is pure; `loadAndBuildCards` is the thin I/O
 * shell over the real committed files, matching the pattern
 * `pipeline/cedict.ts` and `pipeline/pinyin.ts` both established.
 *
 * Explicitly NOT this module's job (WO-007's "Out of scope"): validating
 * domain-model invariants, failing the build, writing `public/decks/*.json`
 * or the build report/review queue. Those are WO-008.
 */

import type { CedictEntry } from './cedict.js';
import { loadCedict } from './cedict.js';
import { buildHeadwordIndex, matchAndResolve } from './match.js';
import type {
  ConflictingCedictEntries,
  UnmatchedHskWord,
  UnresolvedCrossReference,
} from './match.js';
import { loadAllHskMappings } from './hsk.js';
import type { HskMappingRow } from './hsk.js';
import { applyOverrides, loadOverrides } from './overrides.js';
import type { OverridesFile } from './overrides.js';
import { applyExclusions, loadExclusions } from './exclusions.js';
import type { ExclusionsFile } from './exclusions.js';
import type { Card, HskLevel } from '../src/domain/card.js';

const HSK_LEVELS: readonly HskLevel[] = ['1', '2', '3', '4', '5', '6'];

export interface BuildCardsInput {
  cedictEntries: readonly CedictEntry[];
  hskMappingRows: readonly HskMappingRow[];
  overrides: OverridesFile;
  exclusions: ExclusionsFile;
}

export interface BuildCardsResult {
  /** Every level present, even one with zero resolved cards — so a
   *  truncated or empty level is visible in the shape, not silently
   *  absent (WO-008's count-tolerance gate needs this). */
  cardsByLevel: Record<HskLevel, Card[]>;
  unmatchedWords: UnmatchedHskWord[];
  unresolvedCrossReferences: UnresolvedCrossReference[];
  conflictingEntries: ConflictingCedictEntries[];
  orphanedOverrideIds: string[];
  /** Cards Red gave a final, considered "must never ship" verdict to —
   *  removed before this result's `cardsByLevel` ([DEC-028](../docs/project/decision-log.md)).
   *  Recorded here, not just silently dropped, so the build report can show
   *  them. */
  excludedIds: string[];
  orphanedExclusionIds: string[];
  /** The pinned CC-CEDICT release's own `#! date=...` header, for
   *  `DeckMeta.dictionaryVersion` (domain-model.md §6). `undefined` only if
   *  the source file had no such header — WO-008 treats that as a build
   *  problem, not a value to silently substitute. Added in WO-008 rather
   *  than plumbed through a second `loadCedict()` call, which would
   *  re-parse the full ~125k-line file for one string. */
  dictionaryVersion: string | undefined;
}

function emptyCardsByLevel(): Record<HskLevel, Card[]> {
  const result = {} as Record<HskLevel, Card[]>;
  for (const level of HSK_LEVELS) {
    result[level] = [];
  }
  return result;
}

/**
 * Pure orchestration of stages 3-6. Cards within each level are sorted by
 * `id` for deterministic output (CLAUDE.md §06/data-pipeline.md §2: the
 * same inputs must produce byte-identical output) — a card in more than
 * one level appears, unsorted-input-order notwithstanding, at the same
 * relative position in every level's array it belongs to.
 */
export function buildCards(input: BuildCardsInput, dictionaryVersion?: string): BuildCardsResult {
  const index = buildHeadwordIndex(input.cedictEntries);
  const { cards, unmatchedWords, unresolvedCrossReferences, conflictingEntries } = matchAndResolve(
    input.hskMappingRows,
    index,
  );
  const { cards: overriddenCards, orphanedOverrideIds } = applyOverrides(cards, input.overrides);
  const {
    cards: finalCards,
    excludedIds,
    orphanedExclusionIds,
  } = applyExclusions(overriddenCards, input.exclusions);

  const sorted = [...finalCards].sort((a, b) => a.id.localeCompare(b.id));

  const cardsByLevel = emptyCardsByLevel();
  for (const card of sorted) {
    for (const level of card.levels) {
      cardsByLevel[level].push(card);
    }
  }

  return {
    cardsByLevel,
    unmatchedWords,
    unresolvedCrossReferences,
    conflictingEntries,
    orphanedOverrideIds,
    excludedIds,
    orphanedExclusionIds,
    dictionaryVersion,
  };
}

/** Thin I/O shell: reads the pinned CC-CEDICT file, all six pinned HSK
 *  level files, and every committed override/exclusion file, then runs
 *  `buildCards` over them. */
export function loadAndBuildCards(): BuildCardsResult {
  const { entries, dictionaryVersion } = loadCedict();
  const hskMappingRows = loadAllHskMappings();
  const overrides = loadOverrides();
  const exclusions = loadExclusions();
  return buildCards(
    { cedictEntries: entries, hskMappingRows, overrides, exclusions },
    dictionaryVersion,
  );
}
