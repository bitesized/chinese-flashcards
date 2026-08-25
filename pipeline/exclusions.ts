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
 * Card exclusion — a new mechanism, [DEC-028](../docs/project/decision-log.md),
 * recommended by Red in the WO-009/LR-002 review. `pipeline/overrides.ts`'s
 * `CardOverride` can only *modify* a card's fields, including
 * `review: 'flagged'` — but a flagged card still ships (`Card[]` is
 * unaffected; only the build's exit code changes) and fails the *entire*
 * six-level build until a human resolves it. WO-009 found 38 real HSK-1
 * cards — genuinely correct CC-CEDICT content, just not part of the actual
 * HSK-1 syllabus (surname readings, bound forms, archaic registers bundled
 * under a headword whose *other* reading is the real HSK-1 item) — where the
 * right call is not "revisit this," it is "this must never ship." Exclusion
 * is that final, considered removal: a card is dropped from `Card[]`
 * entirely, before validation ever sees it, so the build stays green.
 *
 * `review: 'flagged'` keeps its original meaning: a live, in-corpus card
 * with an unresolved problem still under discussion, which SHOULD keep
 * failing the build until someone looks at it. Exclusion is for the
 * opposite case — Red has already looked, and the answer is "never ship
 * this." The two are not interchangeable: excluding a card whose problem is
 * still open would hide it rather than surface it.
 *
 * Structurally parallel to `pipeline/waivers.ts`
 * ([DEC-027](../docs/project/decision-log.md)) — a separate, committed,
 * id-keyed file, checked by `pipeline/build-cards.ts` after
 * matching/override and before validation.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Card } from '../src/domain/card.js';

export interface ExcludedCard {
  reason: string;
  excludedBy: string;
  excludedAt: string;
}

export type ExclusionsFile = Record<string, ExcludedCard>;

export interface ApplyExclusionsResult {
  cards: Card[];
  excludedIds: string[];
  /** Exclusion ids that matched no card — a build warning, same spirit as
   *  `orphanedOverrideIds` (data-pipeline.md §6): usually means an upstream
   *  entry changed and the exclusion needs re-review, not that it's wrong. */
  orphanedExclusionIds: string[];
}

const DEFAULT_EXCLUSIONS_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../data/overrides/excluded-cards.json',
);

/** Thin I/O shell. Returns `{}` if the file doesn't exist. */
export function loadExclusions(filePath: string = DEFAULT_EXCLUSIONS_PATH): ExclusionsFile {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    return {};
  }
  return JSON.parse(raw) as ExclusionsFile;
}

/**
 * Drops every card whose id is in `exclusions`, then repairs
 * `homographGroup` membership among what remains: domain-model.md §3
 * invariant 6 requires at least two cards to share a group, and excluding
 * one member of a pair can leave a lone survivor carrying a now-vacuous tag
 * (Red's WO-009 report, finding 5) — `CardOverride` has no `homographGroup`
 * field to clear this by hand, so it is recomputed here structurally
 * instead. Pure: no I/O.
 */
export function applyExclusions(
  cards: readonly Card[],
  exclusions: ExclusionsFile,
): ApplyExclusionsResult {
  const matchedIds = new Set<string>();

  const remaining = cards.filter((card) => {
    if (!(card.id in exclusions)) return true;
    matchedIds.add(card.id);
    return false;
  });

  const groupSizes = new Map<string, number>();
  for (const card of remaining) {
    if (card.homographGroup !== undefined) {
      groupSizes.set(card.homographGroup, (groupSizes.get(card.homographGroup) ?? 0) + 1);
    }
  }

  const cleaned = remaining.map((card) => {
    if (card.homographGroup === undefined || (groupSizes.get(card.homographGroup) ?? 0) >= 2) {
      return card;
    }
    const next: Partial<Card> = { ...card };
    delete next.homographGroup;
    return next as Card;
  });

  const excludedIds = Object.keys(exclusions).filter((id) => matchedIds.has(id));
  const orphanedExclusionIds = Object.keys(exclusions).filter((id) => !matchedIds.has(id));

  return { cards: cleaned, excludedIds, orphanedExclusionIds };
}
