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
 * Override application — data-pipeline.md §6, stage 6 of the nine-stage
 * pipeline. Applied after matching/resolution (`pipeline/match.ts`) and
 * before validation (WO-008).
 *
 * Scope, per WO-007: build and prove the MECHANISM only. There is no real
 * override content yet — Red hasn't reviewed anything (that's WO-009,
 * downstream of WO-008) — so this module contains no authored corrections,
 * only the machinery and a synthetic test fixture.
 *
 * A `CardOverride` corrects an already-resolved card, keyed by `Card.id`
 * (data-pipeline.md §6's worked example: `{"行:hang2": {"senses": [...],
 * "note": ..., "reviewedBy": ..., "reviewedAt": ...}}`). Any subset of a
 * card's content fields may be overridden; `note`, `reviewedBy`, and
 * `reviewedAt` are override-only metadata, never copied onto the `Card`
 * itself.
 *
 * If the override doesn't say otherwise, applying it moves a
 * `'cc-cedict'`-sourced card to `source: 'cc-cedict+override'` (the
 * `ContentSource` value that means exactly "CC-CEDICT content, corrected by
 * a human") and moves `review` to `'corrected'` (the `ReviewStatus` value
 * that means exactly this). Both are explicit-override-wins: an override
 * that sets its own `source`/`review` is respected as-is.
 *
 * **Card synthesis** (data-pipeline.md §5.3 step 3): an override whose id
 * matches no resolved card is synthesised into a brand-new `Card` when it
 * supplies the complete required field set (`headword`, `reading`,
 * `readingNumeric`, `senses`, `levels`) — Red's exact recommendation in the
 * WO-009 report/LR-002, needed for words CC-CEDICT's own matching leaves
 * unresolved entirely (`ConflictingCedictEntries`, `UnresolvedCrossReference`
 * — `pipeline/match.ts` never produces a card for either, so there is
 * nothing for an ordinary field-level override to attach to). `source`
 * defaults to `'manual'` and `review` to `'unreviewed'` if the override
 * doesn't say otherwise — a synthesised card is not implicitly reviewed
 * just because someone supplied its content. An override supplying only
 * *some* of the required fields is left orphaned, same as before — partial
 * content is not enough to guess the rest.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Card,
  Classifier,
  ContentSource,
  HskLevel,
  ReviewStatus,
} from '../src/domain/card.js';

/** Fields of `Card` a reviewer may correct, plus the mandatory review
 *  metadata (never copied onto the `Card` itself). */
export interface CardOverride {
  headword?: string;
  headwordTraditional?: string;
  reading?: string;
  readingNumeric?: string;
  senses?: string[];
  classifiers?: Classifier[];
  levels?: HskLevel[];
  source?: ContentSource;
  review?: ReviewStatus;
  note: string;
  reviewedBy: string;
  reviewedAt: string;
}

export type OverridesFile = Record<string, CardOverride>;

export interface ApplyOverridesResult {
  cards: Card[];
  /** Override ids that matched no resolved card — data-pipeline.md §6: a
   *  build warning, not a failure; usually means an upstream entry
   *  changed and needs re-review. */
  orphanedOverrideIds: string[];
}

// Explicit field-by-field merge (rather than an object spread over
// `override`) so `note`/`reviewedBy`/`reviewedAt` — override-only metadata,
// not part of the Card schema — can never leak onto a shipped card, and so
// this stays type-checked without a cast.
function applyOverrideToCard(card: Card, override: CardOverride): Card {
  const next: Card = {
    ...card,
    ...(override.headword !== undefined ? { headword: override.headword } : {}),
    ...(override.headwordTraditional !== undefined
      ? { headwordTraditional: override.headwordTraditional }
      : {}),
    ...(override.reading !== undefined ? { reading: override.reading } : {}),
    ...(override.readingNumeric !== undefined ? { readingNumeric: override.readingNumeric } : {}),
    ...(override.senses !== undefined ? { senses: override.senses } : {}),
    ...(override.classifiers !== undefined ? { classifiers: override.classifiers } : {}),
    ...(override.levels !== undefined ? { levels: override.levels } : {}),
    ...(override.source !== undefined ? { source: override.source } : {}),
    ...(override.review !== undefined ? { review: override.review } : {}),
  };

  const contentChanged =
    override.headword !== undefined ||
    override.headwordTraditional !== undefined ||
    override.reading !== undefined ||
    override.readingNumeric !== undefined ||
    override.senses !== undefined ||
    override.classifiers !== undefined ||
    override.levels !== undefined;

  if (contentChanged) {
    if (override.source === undefined && card.source === 'cc-cedict') {
      next.source = 'cc-cedict+override';
    }
    if (override.review === undefined) {
      next.review = 'corrected';
    }
  }

  return next;
}

/** The field set a synthesised card cannot do without — see the module
 *  docstring's "Card synthesis" section. `classifiers`/`headwordTraditional`
 *  stay optional, same as on `Card` itself. */
function synthesizeCardFromOverride(id: string, override: CardOverride): Card | undefined {
  if (
    override.headword === undefined ||
    override.reading === undefined ||
    override.readingNumeric === undefined ||
    override.senses === undefined ||
    override.levels === undefined
  ) {
    return undefined;
  }
  return {
    id,
    headword: override.headword,
    ...(override.headwordTraditional !== undefined
      ? { headwordTraditional: override.headwordTraditional }
      : {}),
    reading: override.reading,
    readingNumeric: override.readingNumeric,
    senses: override.senses,
    ...(override.classifiers !== undefined ? { classifiers: override.classifiers } : {}),
    levels: override.levels,
    source: override.source ?? 'manual',
    review: override.review ?? 'unreviewed',
  };
}

/**
 * Applies committed overrides to already-resolved cards, keyed by
 * `Card.id`. Pure: no I/O. An override whose id matches no card either
 * synthesises a new one (see the module docstring's "Card synthesis"
 * section) or, if it doesn't supply the complete required field set, is
 * reported in `orphanedOverrideIds` — data-pipeline.md §6 treats an
 * unmatched override as a warning, not a build failure.
 */
export function applyOverrides(
  cards: readonly Card[],
  overrides: OverridesFile,
): ApplyOverridesResult {
  const matchedIds = new Set<string>();

  const nextCards = cards.map((card) => {
    const override = overrides[card.id];
    if (!override) return card;
    matchedIds.add(card.id);
    return applyOverrideToCard(card, override);
  });

  const synthesized: Card[] = [];
  for (const [id, override] of Object.entries(overrides)) {
    if (matchedIds.has(id)) continue;
    const card = synthesizeCardFromOverride(id, override);
    if (card) {
      synthesized.push(card);
      matchedIds.add(id);
    }
  }

  const orphanedOverrideIds = Object.keys(overrides).filter((id) => !matchedIds.has(id));

  return { cards: [...nextCards, ...synthesized], orphanedOverrideIds };
}

const DEFAULT_OVERRIDES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../data/overrides');

/**
 * `data/overrides/` also holds two sibling mechanisms with their own loaders
 * and their own, different-shaped schemas — `waived-words.json`
 * ([DEC-027](../docs/project/decision-log.md), `pipeline/waivers.ts`) and
 * `excluded-cards.json` ([DEC-028](../docs/project/decision-log.md),
 * `pipeline/exclusions.ts`). Both are keyed by headword or card id the same
 * way a `CardOverride` file is, so a naive "every `*.json` in this
 * directory is a `CardOverride` file" scan would misparse them and, worse,
 * silently collide on id with a real override sharing the same key (found
 * for real: `excluded-cards.json` and `lr-002-hsk1-flags.json` share all 38
 * ids by construction). Excluded here by name rather than by content
 * sniffing, since the set of sibling mechanisms is small and explicit.
 */
const NON_OVERRIDE_FILENAMES = new Set(['waived-words.json', 'excluded-cards.json']);

/**
 * Thin I/O shell: reads every `*.json` file in `data/overrides/`, except
 * the sibling-mechanism files named in `NON_OVERRIDE_FILENAMES`, and merges
 * them into one `OverridesFile`, keyed by card id. Files are read in sorted
 * filename order for determinism. Throws if the same card id is defined in
 * more than one file — a silent overwrite of a linguistic correction is
 * exactly the kind of error this pipeline must fail loudly on, not warn
 * about.
 */
export function loadOverrides(dir: string = DEFAULT_OVERRIDES_DIR): OverridesFile {
  let filenames: string[];
  try {
    filenames = readdirSync(dir).filter(
      (name) => name.endsWith('.json') && !NON_OVERRIDE_FILENAMES.has(name),
    );
  } catch {
    return {};
  }
  filenames.sort();

  const merged: OverridesFile = {};
  for (const filename of filenames) {
    const raw = readFileSync(resolve(dir, filename), 'utf-8');
    const parsed = JSON.parse(raw) as OverridesFile;
    for (const [id, override] of Object.entries(parsed)) {
      if (id in merged) {
        throw new Error(
          `override "${id}" is defined in more than one file (found again in ${filename})`,
        );
      }
      merged[id] = override;
    }
  }
  return merged;
}
