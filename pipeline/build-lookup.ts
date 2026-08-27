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
 * `npm run build:lookup` — compiles the FULL pinned CC-CEDICT release
 * (~124,900 entries) into a search index + sharded detail store
 * (DEC-037), so custom decks (DEC-036) can be built by looking up any
 * CC-CEDICT word, not just the ~5,259 already compiled into the HSK decks.
 *
 * A parallel, independent pipeline to `build-data.ts`'s (same shape as
 * `build-hanzi.ts` — its own docstring), NOT a stage bolted onto it: this
 * reads the same pinned `loadCedict()` source but applies no HSK matching at
 * all (`pipeline/match.ts`'s `matchAndResolve`/`buildHeadwordIndex` are
 * unused here). It reuses match.ts's `foldForMatching`, `isCrossReferenceOnly`,
 * and `convertClassifier` — the same "is this a real definition, and how do
 * I format a classifier" logic, not a second implementation of it — plus
 * `content-filter.ts`'s vulgar-sense filter and `sense-annotations.ts`'s
 * bracket-annotation cleanup, so a looked-up word's senses are formatted
 * byte-for-byte the same way an HSK deck's are (WO-019/DEC-037's "appear
 * exactly as they do in the preexisting decks").
 *
 * Deliberately simpler than `matchAndResolve` in two ways, both because
 * there is no HSK row here to arbitrate ambiguity for the pipeline:
 *
 * 1. **Cross-reference-only entries are dropped, not resolved.** Following
 *    a "variant of X" pointer to X's real senses (matchAndResolve's
 *    `resolveCrossReferenceSenses`) is itself HSK-row-triggered logic tied
 *    to the small set of entries an HSK list actually references. Over the
 *    full dictionary, most cross-reference-only entries are exactly that —
 *    a redirect — and the target headword is independently searchable and
 *    will itself appear in this index. Not following the pointer costs a
 *    small number of purely-alternate-form headwords not being directly
 *    searchable; documented as a real, deliberate limitation (Notes below),
 *    not silently absorbed.
 * 2. **Conflicting entries (>=2 substantive CC-CEDICT entries sharing one
 *    (headword, reading) — domain-model.md §4/`ConflictingCedictEntries`'s
 *    own docstring) are dropped, not adjudicated.** There is no Red review
 *    loop for this dataset to route the ambiguity to (see this module's own
 *    Notes on why), and `Card.id`'s scheme genuinely cannot represent two
 *    entries under one id regardless. Rare in the full corpus (WO-007's
 *    report found only a handful across the whole dictionary).
 *
 * Output is two artefact classes, both committed (data-pipeline.md §9's
 * "a content change shows up as a reviewable diff" precedent) but neither
 * pretty-printed, unlike `public/decks/*.json` — at ~120,000 entries the
 * 2-space-indent overhead roughly doubles the payload for a dataset that is
 * never hand-read the way a ~150-word HSK deck's diff is, so minifying is a
 * deliberate, real size saving, not an inconsistency:
 *
 *   - `public/cedict-lookup/index.json` — one compact array of
 *     `LookupIndexEntry` tuples (src/domain/cedictLookup.ts), fetched in
 *     full exactly once per session (services/cedictLookup.ts) so an
 *     in-memory search can match against every headword/reading without a
 *     server. This is the artefact DEC-037's "new pipeline work, larger
 *     payload" cost actually is.
 *   - `public/cedict-lookup/detail-{n}.json` (`shardCount` files) — full
 *     entries (`LookupDetail`), bucketed by `shardForId` so a chosen
 *     candidate's senses/classifiers are one small fetch, not the whole
 *     dictionary's.
 *   - `public/cedict-lookup/meta.json` — `shardCount`, `dictionaryVersion`,
 *     `entryCount`, `builtAt`, so the runtime never has to guess how many
 *     shard files exist.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCedict } from './cedict.js';
import type { CedictEntry } from './cedict.js';
import { convertClassifier, foldForMatching, isCrossReferenceOnly } from './match.js';
import { computeCardId } from './identifiers.js';
import { numberedToDiacritic } from './pinyin.js';
import { filterVulgarSenses } from './content-filter.js';
import { transformSenseAnnotations } from './sense-annotations.js';
import {
  shardForId,
  LOOKUP_SCHEMA_VERSION,
  LOOKUP_SHARD_COUNT,
} from '../src/domain/cedictLookup.js';
import type { LookupDetail, LookupIndexEntry, LookupMeta } from '../src/domain/cedictLookup.js';

export const SHARD_COUNT = LOOKUP_SHARD_COUNT;

function groupKey(simplified: string, readingNumeric: string): string {
  return `${simplified} ${foldForMatching(readingNumeric)}`;
}

export interface BuildLookupResult {
  index: LookupIndexEntry[];
  /** Keyed by id — `main()` below distributes these into `SHARD_COUNT`
   *  files via `shardForId`; kept as one map here so
   *  `pipeline/build-lookup.test.ts` can assert on content without also
   *  asserting on shard layout. */
  details: Map<string, LookupDetail>;
  skippedCrossReferenceOnly: number;
  skippedConflicting: number;
  /** An entry that ended up with zero usable senses — every sense was
   *  either `(vulgar)`-marked (content-filter.ts) or an unrecognised
   *  bracket annotation (`skippedUnannotatableSenses` below) that
   *  `sense-annotations.ts` refused to convert. The whole entry is dropped,
   *  same rule as an HSK card losing every sense (domain-model.md §3
   *  invariant 2). */
  skippedNoSenses: number;
  /** Individual senses dropped (not the whole entry — counted only when
   *  every other sense also fails, above) because `transformSenseAnnotations`
   *  rejected their bracket content as neither a Mandarin pronunciation
   *  variant nor a recognised Jyutping/Tai-lo shape. Real corpus regression:
   *  CC-CEDICT's own two entries whose gloss is literally about square-
   *  bracket punctuation ("square brackets [ ]") — cedict.ts's docstring
   *  already names these as deliberately untouched by the earlier
   *  cross-reference normalisation; `matchAndResolve` never meets them
   *  because no HSK row references them, so this is the first stage that
   *  has to cope with the shape at all. Dropping the one unconvertible
   *  sense (not the whole entry, unless it was the only sense) is the same
   *  "skip the bad row, keep going" posture as `skippedInvalidReading`. */
  skippedUnannotatableSenses: number;
  /** An entry whose `readingNumeric` isn't valid Pinyin at all — e.g. the
   *  real corpus's `11区[11 Qu1]` and `双11[Shuang1 11]`, where CC-CEDICT
   *  cites a literal digit token as part of the "reading" for a name that is
   *  read as a number, not spoken syllables. `matchAndResolve` never meets
   *  these because no HSK row references them; a full-dictionary pass does.
   *  Skipped rather than crashing the whole build, same as this project's
   *  precedent elsewhere for a single bad corpus row (e.g. 儿's bare-erhua
   *  entry in WO-015). */
  skippedInvalidReading: number;
}

/**
 * Pure: the full pinned CC-CEDICT entry list in, a search index and a
 * detail map out. No I/O, no sharding (that's `main()`'s job, since it's a
 * pure function of `SHARD_COUNT` and the id, not something this function's
 * own logic needs to know about).
 */
export function buildLookupData(entries: readonly CedictEntry[]): BuildLookupResult {
  const groups = new Map<string, CedictEntry[]>();
  const groupOrder: string[] = [];
  for (const entry of entries) {
    const key = groupKey(entry.simplified, entry.readingNumeric);
    const existing = groups.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(key, [entry]);
      groupOrder.push(key);
    }
  }

  const index: LookupIndexEntry[] = [];
  const details = new Map<string, LookupDetail>();
  let skippedCrossReferenceOnly = 0;
  let skippedConflicting = 0;
  let skippedNoSenses = 0;
  let skippedUnannotatableSenses = 0;
  let skippedInvalidReading = 0;

  for (const key of groupOrder) {
    const group = groups.get(key) as CedictEntry[];
    const substantive = group.filter((entry) => !isCrossReferenceOnly(entry));

    if (substantive.length === 0) {
      skippedCrossReferenceOnly += 1;
      continue;
    }
    if (substantive.length > 1) {
      skippedConflicting += 1;
      continue;
    }
    const entry = substantive[0] as CedictEntry;

    const vulgarFiltered = filterVulgarSenses(entry.senses);
    const senses: string[] = [];
    for (const sense of vulgarFiltered) {
      try {
        senses.push(...transformSenseAnnotations([sense]));
      } catch {
        // See skippedUnannotatableSenses's docstring — a single sense
        // sense-annotations.ts can't convert (e.g. "square brackets [ ]")
        // is dropped, not the whole entry, unless it was the only one.
        skippedUnannotatableSenses += 1;
      }
    }
    if (senses.length === 0) {
      skippedNoSenses += 1;
      continue;
    }

    let reading: string;
    try {
      reading = numberedToDiacritic(entry.readingNumeric);
    } catch {
      skippedInvalidReading += 1;
      continue;
    }

    const id = computeCardId(entry.simplified, entry.readingNumeric);
    index.push([
      id,
      entry.simplified,
      entry.traditional !== entry.simplified ? entry.traditional : null,
      entry.readingNumeric,
    ]);
    details.set(id, {
      headword: entry.simplified,
      ...(entry.traditional !== entry.simplified ? { headwordTraditional: entry.traditional } : {}),
      reading,
      readingNumeric: entry.readingNumeric,
      senses,
      ...(entry.classifiers ? { classifiers: entry.classifiers.map(convertClassifier) } : {}),
    });
  }

  index.sort((a, b) => a[0].localeCompare(b[0]));

  return {
    index,
    details,
    skippedCrossReferenceOnly,
    skippedConflicting,
    skippedNoSenses,
    skippedUnannotatableSenses,
    skippedInvalidReading,
  };
}

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function main(): void {
  const { entries, dictionaryVersion } = loadCedict();
  const result = buildLookupData(entries);

  const shards: Record<string, LookupDetail>[] = Array.from({ length: SHARD_COUNT }, () => ({}));
  for (const [id, detail] of result.details) {
    const shard = shards[shardForId(id, SHARD_COUNT)] as Record<string, LookupDetail>;
    shard[id] = detail;
  }

  const outDir = resolve(REPO_ROOT, 'public/cedict-lookup');
  mkdirSync(outDir, { recursive: true });

  writeFileSync(resolve(outDir, 'index.json'), JSON.stringify(result.index));
  shards.forEach((shard, i) => {
    writeFileSync(resolve(outDir, `detail-${i}.json`), JSON.stringify(shard));
  });

  const meta: LookupMeta = {
    schemaVersion: LOOKUP_SCHEMA_VERSION,
    shardCount: SHARD_COUNT,
    dictionaryVersion: dictionaryVersion ?? '',
    entryCount: result.index.length,
    builtAt: new Date().toISOString(),
  };
  writeFileSync(resolve(outDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');

  console.log(
    `Lookup build OK: ${result.index.length} entries across ${SHARD_COUNT} shards ` +
      `(${result.skippedCrossReferenceOnly} cross-reference-only, ` +
      `${result.skippedConflicting} conflicting, ` +
      `${result.skippedNoSenses} left with no usable senses, ` +
      `${result.skippedUnannotatableSenses} individual senses dropped, ` +
      `${result.skippedInvalidReading} invalid-reading entries skipped).`,
  );
}

// Only run when executed directly, never on import — build-lookup.test.ts
// imports buildLookupData and must not trigger real filesystem writes as a
// side effect of that import (build-data.ts's identical convention).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
