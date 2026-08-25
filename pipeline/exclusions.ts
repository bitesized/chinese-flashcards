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
import { foldForMatching } from './match.js';
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
 * Repairs `homographGroup` membership across a card list: domain-model.md
 * §3 invariant 6 requires at least two cards to share a group, and any
 * mechanism that can remove one member of a pair — exclusion (below), or
 * the content filter (`pipeline/content-filter.ts`, DEC-029, a separate,
 * later pipeline stage this function's caller must also apply it after —
 * see `build-data.ts`) — can leave a lone survivor carrying a now-vacuous
 * tag (Red's WO-009 report, finding 5). `CardOverride` has no
 * `homographGroup` field to clear this by hand, so it is recomputed here
 * structurally instead, independent of *why* a sibling disappeared. Pure:
 * no I/O.
 */
export function clearVacuousHomographGroups(cards: readonly Card[]): Card[] {
  const groupSizes = new Map<string, number>();
  for (const card of cards) {
    if (card.homographGroup !== undefined) {
      groupSizes.set(card.homographGroup, (groupSizes.get(card.homographGroup) ?? 0) + 1);
    }
  }

  return cards.map((card) => {
    if (card.homographGroup === undefined || (groupSizes.get(card.homographGroup) ?? 0) >= 2) {
      return card;
    }
    const next: Partial<Card> = { ...card };
    delete next.homographGroup;
    return next as Card;
  });
}

/**
 * [DEC-034](../docs/project/decision-log.md). Recomputes `homographGroup`
 * from scratch across the *final* card set —
 * every headword with 2+ cards carrying distinct readings gets tagged,
 * every other card is untagged — rather than patching whatever tag it
 * happened to carry from initial match time
 * (`pipeline/match.ts`'s own grouping, run before overrides/synthesis/
 * exclusion/content-filter ever touch the card set).
 *
 * `clearVacuousHomographGroups` above only ever removes a tag; it has no
 * way to notice that a *newly synthesized* card (`pipeline/overrides.ts`'s
 * `synthesizeCardFromOverride`, DEC-028) shares a headword with an
 * existing, previously-ungrouped card — CardOverride has no
 * `homographGroup` field, so there was never a way to link them (Red's
 * WO-013/LR-004 finding 1, a real case: an existing 只:zhi3 card and a
 * manually-added 只:zhi1 card are genuinely the same kind of pair
 * `homographGroup` exists to link, but neither the initial match nor the
 * synthesis mechanism ever connected them). A full recomputation over the
 * final set closes this gap and also subsumes vacuous-clearing (a group
 * reduced to one member by exclusion or the content filter is simply not
 * regenerated), so this should be called once, last, after every stage
 * that can add or remove a card — see `build-data.ts`. Pure: no I/O.
 */
export function recomputeHomographGroups(cards: readonly Card[]): Card[] {
  const byHeadword = new Map<string, Card[]>();
  for (const card of cards) {
    const list = byHeadword.get(card.headword);
    if (list) {
      list.push(card);
    } else {
      byHeadword.set(card.headword, [card]);
    }
  }

  return cards.map((card) => {
    const siblings = byHeadword.get(card.headword) as Card[];
    const distinctReadings = new Set(siblings.map((c) => foldForMatching(c.readingNumeric)));
    if (distinctReadings.size >= 2) {
      return card.homographGroup === card.headword
        ? card
        : { ...card, homographGroup: card.headword };
    }
    if (card.homographGroup === undefined) return card;
    const next: Partial<Card> = { ...card };
    delete next.homographGroup;
    return next as Card;
  });
}

/** Drops every card whose id is in `exclusions`, then clears any
 *  now-vacuous `homographGroup` tags among what remains. */
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

  const cleaned = clearVacuousHomographGroups(remaining);

  const excludedIds = Object.keys(exclusions).filter((id) => matchedIds.has(id));
  const orphanedExclusionIds = Object.keys(exclusions).filter((id) => !matchedIds.has(id));

  return { cards: cleaned, excludedIds, orphanedExclusionIds };
}
