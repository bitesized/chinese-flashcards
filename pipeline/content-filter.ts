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
 * Project-wide vulgar/NSFW content filter — [DEC-029](../docs/project/decision-log.md),
 * an owner decision following Red's escalation in
 * [LR-002](../docs/workstream/reviews/LR-002-hsk1-review.md): CC-CEDICT
 * carries a small number of vulgar senses on otherwise ordinary headwords
 * (Red's example: 日 "day/sun" also glosses "(vulgar) to fuck; to have sex
 * with"). The owner chose a standing, mechanical filter over a per-card
 * judgement call repeated at every level.
 *
 * CC-CEDICT marks this register explicitly and consistently — every
 * instance surveyed in the pinned corpus (35 senses, `grep -c
 * "([Vv]ulgar" data/source/cedict/...`) uses the literal parenthetical
 * `(vulgar)` or `(vulgar, offensive)`, either leading the sense
 * (`"(vulgar) dumbass"`) or trailing it (`"cunt (vulgar)"`, `"to fuck
 * (vulgar)"`) — never as a standalone qualifier detachable from the rest of
 * the sense. Unlike the ordinary register markers data-pipeline.md §3
 * preserves verbatim ("(coll.)", "(lit.)", "(fig.)", "(dialect)" — meaning,
 * not noise), a `(vulgar)`-marked sense is dropped **in its entirety**, not
 * just the marker text, matching Red's own precedent for 日.
 *
 * Stage 7 (transform), run before `pipeline/sense-annotations.ts` — a
 * dropped vulgar sense might otherwise have contained a bracket annotation
 * that module would spend effort converting for no reason, since the whole
 * sense is about to be discarded anyway.
 */

import type { Card } from '../src/domain/card.js';

const VULGAR_MARKER = /\(vulgar\b[^)]*\)/i;

/** Drops every sense containing a `(vulgar...)` marker, wherever the
 *  marker sits within the sense — leading, trailing, or (checked against
 *  the pinned corpus) anywhere else it might occur. */
export function filterVulgarSenses(senses: readonly string[]): string[] {
  return senses.filter((sense) => !VULGAR_MARKER.test(sense));
}

export interface ApplyContentFilterResult {
  cards: Card[];
  /** Card ids that had at least one vulgar sense removed but still have
   *  senses left to ship. */
  filteredIds: string[];
  /** Card ids where every sense was vulgar — the whole card is dropped
   *  (domain-model.md §3 invariant 2: no card ships with zero senses).
   *  Not observed in the pinned corpus for any HSK-matched word as of
   *  DEC-029 (only 日/ri4 and 干/gan4 intersect, and both keep senses after
   *  filtering), but handled correctly regardless — see the module's
   *  associated test for a synthetic case. */
  droppedIds: string[];
}

/**
 * Applies the vulgar-content filter to every card. Pure. Cards reduced to
 * zero senses are dropped entirely rather than shipped empty or left to
 * fail validation's non-empty-senses gate as an unexplained surprise.
 */
export function applyContentFilter(cards: readonly Card[]): ApplyContentFilterResult {
  const filteredIds: string[] = [];
  const droppedIds: string[] = [];
  const cardsOut: Card[] = [];

  for (const card of cards) {
    const senses = filterVulgarSenses(card.senses);
    if (senses.length === card.senses.length) {
      cardsOut.push(card);
      continue;
    }
    if (senses.length === 0) {
      droppedIds.push(card.id);
      continue;
    }
    filteredIds.push(card.id);
    cardsOut.push({ ...card, senses });
  }

  return { cards: cardsOut, filteredIds, droppedIds };
}
