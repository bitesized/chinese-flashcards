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
 * HSK<->CC-CEDICT matching and resolution — data-pipeline.md §5, stages
 * 3-5 of the nine-stage pipeline. Pure: `CedictEntry[]` + `HskMappingRow[]`
 * in, `Card[]` (plus structured problem reports) out. No I/O.
 *
 * Stage 3 — index: `buildHeadwordIndex` groups parsed CC-CEDICT entries by
 * simplified headword, the shape every later step needs (a headword may
 * have zero, one, or several readings).
 *
 * Stage 4 — match, and stage 5 — resolve, are one function
 * (`matchAndResolve`) because homograph resolution and unmatched-word
 * detection share the same per-row lookup (data-pipeline.md §5.2 rule 1 vs
 * rule 2 is a branch inside the same lookup, not a separate pass):
 *
 *   - A row with a reading matches headword AND reading (§5.2 rule 1). If
 *     no CC-CEDICT entry under that headword carries that reading, the row
 *     is unmatched (§5.3), not "ambiguous" — the source's own belief about
 *     the reading is simply wrong or the word genuinely doesn't have that
 *     reading in this CC-CEDICT release.
 *   - A row with NO reading (§5.2 rule 2) emits every CC-CEDICT reading
 *     under that headword as its own card. The pinned HSK source
 *     (SOURCE.md §2) always supplies a reading per form, so this branch is
 *     never reached via `loadAllHskMappings`'s real output today — it
 *     exists because data-pipeline.md §5.2 states the rule generally (a
 *     future source list might not disambiguate), and is exercised
 *     directly by a unit test constructing a reading-less row, per the
 *     WO-007 report.
 *   - Per DEC-022, EVERY card this function produces gets
 *     `review: 'unreviewed'` — there is no code path here that sets
 *     anything else. A source-supplied-reading match is a matching-key
 *     resolution only; it is never treated as pre-approved.
 *
 * Cross-reference resolution (§5.1) runs after matching, over the
 * deduplicated set of CC-CEDICT entries the HSK mapping actually
 * references (not the whole dictionary): an entry whose every sense is a
 * "variant of X" / "old variant of X" / "abbr. for X" / "also written X" /
 * "see X" pointer has its senses replaced with the target's, found via the
 * same headword index (never by re-parsing the sense string — WO-004's
 * report: the parser strips the reading from a cross-reference sense, so
 * it cannot be recovered from the text). A target that is itself
 * cross-reference-only is followed up to a small hop limit (cycle-safe);
 * a target that doesn't exist, or is itself ambiguous (more than one
 * CC-CEDICT entry under that headword, so the stripped reading can't be
 * recovered), is recorded unresolved rather than guessed at.
 *
 * Homograph grouping: after all rows are matched, any headword whose
 * resolved CC-CEDICT entries have two or more distinct readings gets every
 * one of those cards tagged with the same `homographGroup` (the headword
 * itself — deterministic, and satisfies domain-model.md §3 invariant 6 by
 * construction, since a group is only ever created when ≥2 members exist
 * with differing readings).
 *
 * **Reading comparison here is case-SENSITIVE** (`foldForMatching` below),
 * unlike `pipeline/identifiers.ts`'s `normalizeReadingKey` (used only for
 * `Card.id`, per the literal DEC-005 text). This is a deliberate
 * divergence from `data/source/hsk/SOURCE.md` §5.1's suggestion to
 * lowercase the matching key "in addition to" the ü/u: fold: CC-CEDICT
 * capitalises a headword's proper-noun reading, and that capitalisation is
 * the ONLY thing distinguishing some real homograph pairs — 都 `Du1`
 * (surname) vs `du1` (capital city) is the exact pair DEC-022 already
 * names. Folding case for matching would make an HSK row supplying either
 * reading match both candidates at once, and folding case for the internal
 * "is this the same resolved entry" dedup key would silently merge two
 * genuinely different cards into one (dropping one's senses entirely).
 * Both would be real, silent content bugs. Case-sensitive comparison here
 * correctly resolves 都's three rows to three distinct entries; see
 * `pipeline/match.test.ts`'s `都` tests. The resulting `Card.id` collision
 * this still leaves (both `都:Du1` and `都:du1` normalise via
 * `computeCardId` to `都:du1`) is a real, unresolved defect in the ratified
 * id scheme — flagged prominently in the WO-007 report, not silently
 * patched here, since amending DEC-005 is not this module's call.
 */

import type { CedictClassifier, CedictEntry } from './cedict.js';
import { computeCardId } from './identifiers.js';
import { numberedToDiacritic } from './pinyin.js';
import type { HskMappingRow } from './hsk.js';
import type { Card, Classifier, ContentSource, HskLevel } from '../src/domain/card.js';

/**
 * Folds a reading for MATCHING and internal card identity: `ü`/`u:` -> `v`,
 * whitespace removed — deliberately case-preserving. See the module
 * docstring for why (case is content-bearing: it distinguishes 都's `Du1`
 * surname reading from its `du1` capital-city reading). NOT the same
 * function as `pipeline/identifiers.ts`'s `normalizeReadingKey`, which
 * lowercases per the literal `Card.id` spec (DEC-005) and must not be used
 * here.
 */
export function foldForMatching(readingNumeric: string): string {
  return readingNumeric.replace(/\s+/g, '').replace(/u:/g, 'v').replace(/ü/g, 'v');
}

/** A mapping row for which no CC-CEDICT entry could be found — either the
 *  headword itself is absent, or the headword exists but not with the
 *  reading the row supplied. data-pipeline.md §5.3: never silently
 *  dropped, always recorded for the build report / Red's manual gloss. */
export interface UnmatchedHskWord {
  headword: string;
  level: HskLevel;
  readingNumeric: string | undefined;
}

/** A CC-CEDICT entry the HSK mapping references whose senses are entirely
 *  cross-reference pointers and whose target could not be resolved
 *  (missing, ambiguous, or a broken/cyclic chain). data-pipeline.md §5.1
 *  rule 2: routed to Red for a manual gloss, never shipped with raw
 *  pointer text as its "meaning". */
export interface UnresolvedCrossReference {
  headword: string;
  readingNumeric: string;
  levels: HskLevel[];
  /** The (first) cross-reference sense that could not be followed, for a
   *  human reading the build report. */
  senseText: string;
}

/**
 * Two or more distinct, substantive CC-CEDICT entries share the exact same
 * (headword, reading) — not a domain-model.md §4 homograph (that's
 * *different* readings of one headword), but simplification collapsing
 * more than one Traditional character onto the same Simplified spelling
 * with the same pronunciation. Real example: 裡 ("lining; interior") and
 * 里 ("li, a unit of distance") both simplify to 里/li3, as two separate
 * CC-CEDICT entries with unrelated meanings. `Card.id` (domain-model.md
 * §5) has no way to give these different ids, so this can never be
 * auto-resolved by picking one — that would be exactly the "guess by
 * taking the first match" data-pipeline.md §5.2 forbids. Routed for Red's
 * attention; neither candidate ships. See the WO-007 report's Findings.
 */
export interface ConflictingCedictEntries {
  headword: string;
  readingNumeric: string;
  levels: HskLevel[];
  candidates: { traditional: string; senses: string[] }[];
}

export interface MatchAndResolveResult {
  cards: Card[];
  unmatchedWords: UnmatchedHskWord[];
  unresolvedCrossReferences: UnresolvedCrossReference[];
  conflictingEntries: ConflictingCedictEntries[];
}

/** Stage 3: headword -> every CC-CEDICT entry sharing that simplified
 *  headword (zero, one, or several readings). */
export function buildHeadwordIndex(entries: readonly CedictEntry[]): Map<string, CedictEntry[]> {
  const index = new Map<string, CedictEntry[]>();
  for (const entry of entries) {
    const existing = index.get(entry.simplified);
    if (existing) {
      existing.push(entry);
    } else {
      index.set(entry.simplified, [entry]);
    }
  }
  return index;
}

// Zero-width and BOM characters (U+200B ZWSP .. U+200D ZWJ, U+FEFF BOM)
// that could silently break an exact-string headword match despite being
// visually identical. Stripped only as a retry, never on the first
// attempt, so a genuine mismatch is never masked. Written as explicit
// escapes, not literal characters, so the source stays legible.
const INVISIBLE_CHARACTERS = /[\u200B-\u200D\uFEFF]/g;

/** data-pipeline.md §5.3: "retry after normalisation (whitespace, variant
 *  characters, punctuation)". Tried in order after an exact match fails;
 *  the first index hit wins. No real row in the pinned corpus needed this
 *  (WO-007 report), but §5.3 requires the retry to exist regardless. */
function headwordRetryVariants(headword: string): string[] {
  const variants: string[] = [];
  const trimmed = headword.trim();
  const nfc = trimmed.normalize('NFC');
  const stripped = nfc.replace(INVISIBLE_CHARACTERS, '');
  for (const candidate of [trimmed, nfc, stripped]) {
    if (candidate !== headword && !variants.includes(candidate)) {
      variants.push(candidate);
    }
  }
  return variants;
}

function candidatesForHeadword(
  index: ReadonlyMap<string, CedictEntry[]>,
  headword: string,
): CedictEntry[] | undefined {
  const direct = index.get(headword);
  if (direct) return direct;
  for (const variant of headwordRetryVariants(headword)) {
    const found = index.get(variant);
    if (found) return found;
  }
  return undefined;
}

interface ResolvedEntryRecord {
  entry: CedictEntry;
  levels: Set<HskLevel>;
}

/**
 * Identity of one individual parsed CC-CEDICT entry, used to deduplicate
 * "the same entry referenced by more than one HSK row" WITHOUT conflating
 * genuinely different entries that happen to share a (headword, reading)
 * pair. `sourceLine` (WO-004's `CedictEntry.sourceLine`) is unique within
 * one `parseCedict` call, which is exactly the scope every caller in this
 * codebase uses it at (`loadAndBuildCards` parses the pinned file exactly
 * once; every test in `pipeline/match.test.ts` builds its index from
 * exactly one `parseCedict`/`loadFixture` call).
 *
 * Why this matters: `(headword, reading)` is NOT always a unique key into
 * CC-CEDICT. Simplification sometimes collapses more than one Traditional
 * character onto one Simplified spelling with the same reading — e.g. 裡
 * ("lining; interior") and 里 ("li, a unit of distance") both simplify to
 * 里/li3, as two separate, both-substantive CC-CEDICT entries, alongside a
 * third pointer entry (裏, "variant of 裡"). An earlier version of this
 * function keyed its per-entry map by `(headword, reading)` directly and
 * silently discarded all but the first entry it encountered for a
 * collision like this — a real, silent content-loss bug, found via the
 * real corpus while building WO-007 (see the WO-007 report's Findings for
 * the full account, including 里 and 和). `groupKey` below handles the
 * (headword, reading) level; this function exists so entries are never
 * dropped before that grouping even happens.
 */
function entryIdentity(entry: CedictEntry): string {
  return String(entry.sourceLine);
}

/** The (headword, reading) identity that determines `Card.id` — i.e. every
 *  CC-CEDICT entry that would converge on ONE card. See `entryIdentity`
 *  above for why this is a separate, later grouping rather than the
 *  per-entry dedup key. */
function groupKey(simplified: string, readingNumeric: string): string {
  return `${simplified} ${foldForMatching(readingNumeric)}`;
}

// data-pipeline.md §3 "Cross-references" row's five lead-in phrases, as
// they survive WO-004's normalisation (bracket + reading stripped, plain
// simplified target word left directly after the phrase).
const CROSS_REFERENCE_PATTERN =
  /^(?:variant of|old variant of|abbr\. for|also written|see)\s+(\S+)/i;

function isCrossReferenceOnly(entry: CedictEntry): boolean {
  return (
    entry.senses.length > 0 && entry.senses.every((sense) => CROSS_REFERENCE_PATTERN.test(sense))
  );
}

function firstCrossReferenceTarget(entry: CedictEntry): string | undefined {
  for (const sense of entry.senses) {
    const match = CROSS_REFERENCE_PATTERN.exec(sense);
    if (match) return match[1];
  }
  return undefined;
}

const MAX_CROSS_REFERENCE_HOPS = 5;

/**
 * Follows a cross-reference-only entry's pointer(s) to a non-pointer
 * entry's senses. Re-derives the target via the headword index (never by
 * re-parsing the sense text — WO-004's report). Returns `undefined` when
 * the target doesn't exist, is itself ambiguous (more than one CC-CEDICT
 * entry under that headword — the reading needed to pick one was stripped
 * by the parser and cannot be recovered), or the chain doesn't terminate
 * within `MAX_CROSS_REFERENCE_HOPS` (including a cycle).
 *
 * Only follows the FIRST cross-reference sense when an entry has more than
 * one (data-pipeline.md's own worked example and the common real-corpus
 * shape are both single-sense; a small number of real entries — see the
 * WO-007 report — have two, e.g. "variant of X/variant of Y", and this
 * takes only X). Flagged in the report as a known simplification, not
 * silently decided.
 */
function resolveCrossReferenceSenses(
  entry: CedictEntry,
  index: ReadonlyMap<string, CedictEntry[]>,
): string[] | undefined {
  let current = entry;
  const visited = new Set<string>([`${current.simplified}:${current.readingNumeric}`]);

  for (let hop = 0; hop < MAX_CROSS_REFERENCE_HOPS; hop += 1) {
    const target = firstCrossReferenceTarget(current);
    if (target === undefined) return undefined;

    const candidates = index.get(target);
    if (!candidates || candidates.length !== 1) return undefined;
    const next = candidates[0] as CedictEntry;

    const visitKey = `${next.simplified}:${next.readingNumeric}`;
    if (visited.has(visitKey)) return undefined; // cycle
    visited.add(visitKey);

    if (!isCrossReferenceOnly(next)) return next.senses;
    current = next;
  }
  return undefined;
}

function convertClassifier(classifier: CedictClassifier): Classifier {
  return {
    simplified: classifier.simplified,
    traditional: classifier.traditional,
    readingNumeric: classifier.readingNumeric,
    reading: numberedToDiacritic(classifier.readingNumeric),
  };
}

/** Stages 4-5: match every HSK mapping row against the index, resolve
 *  homographs and cross-references, and report (never throw for) unmatched
 *  words and unresolvable references. See the module docstring for the
 *  full rule set. */
export function matchAndResolve(
  rows: readonly HskMappingRow[],
  index: ReadonlyMap<string, CedictEntry[]>,
): MatchAndResolveResult {
  const unmatchedWords: UnmatchedHskWord[] = [];
  // Keyed by entryIdentity (per parsed entry, NOT per headword+reading —
  // see entryIdentity's docstring for why conflating the two is a real
  // silent-content-loss bug this deliberately avoids).
  const resolved = new Map<string, ResolvedEntryRecord>();

  for (const row of rows) {
    const candidates = candidatesForHeadword(index, row.headword);
    if (!candidates || candidates.length === 0) {
      unmatchedWords.push({
        headword: row.headword,
        level: row.level,
        readingNumeric: row.readingNumeric,
      });
      continue;
    }

    let matches: CedictEntry[];
    if (row.readingNumeric !== undefined) {
      // Rule 1: source supplies a reading — match headword AND reading.
      const key = foldForMatching(row.readingNumeric);
      matches = candidates.filter((candidate) => foldForMatching(candidate.readingNumeric) === key);
      if (matches.length === 0) {
        // The headword exists, but not with this specific reading: the
        // row itself is unmatched, not merely ambiguous (§5.3, not §5.2
        // rule 2 — the source did disambiguate, it was just wrong).
        unmatchedWords.push({
          headword: row.headword,
          level: row.level,
          readingNumeric: row.readingNumeric,
        });
        continue;
      }
    } else {
      // Rule 2: source does not disambiguate — every CC-CEDICT reading
      // under this headword becomes its own card.
      matches = candidates;
    }

    for (const entry of matches) {
      const key = entryIdentity(entry);
      const existing = resolved.get(key);
      if (existing) {
        existing.levels.add(row.level);
      } else {
        resolved.set(key, { entry, levels: new Set([row.level]) });
      }
    }
  }

  // Homograph grouping: any headword with >=2 distinct resolved readings
  // (domain-model.md §4 — different pronunciations of one written form).
  const byHeadword = new Map<string, ResolvedEntryRecord[]>();
  for (const record of resolved.values()) {
    const list = byHeadword.get(record.entry.simplified);
    if (list) {
      list.push(record);
    } else {
      byHeadword.set(record.entry.simplified, [record]);
    }
  }
  const homographGroupOf = new Map<ResolvedEntryRecord, string>();
  for (const [headword, records] of byHeadword) {
    const distinctReadings = new Set(records.map((r) => foldForMatching(r.entry.readingNumeric)));
    if (distinctReadings.size >= 2) {
      for (const record of records) {
        homographGroupOf.set(record, headword);
      }
    }
  }

  // Group by (headword, reading) — everything that would become ONE card.
  // Usually one entry per group; occasionally more (see entryIdentity's
  // docstring). groupOrder preserves first-seen order for determinism.
  const groups = new Map<string, ResolvedEntryRecord[]>();
  const groupOrder: string[] = [];
  for (const record of resolved.values()) {
    const key = groupKey(record.entry.simplified, record.entry.readingNumeric);
    const existing = groups.get(key);
    if (existing) {
      existing.push(record);
    } else {
      groups.set(key, [record]);
      groupOrder.push(key);
    }
  }

  const cards: Card[] = [];
  const unresolvedCrossReferences: UnresolvedCrossReference[] = [];
  const conflictingEntries: ConflictingCedictEntries[] = [];

  for (const key of groupOrder) {
    const records = groups.get(key) as ResolvedEntryRecord[];
    const levels = [...new Set(records.flatMap((r) => [...r.levels]))].sort(
      (a, b) => Number(a) - Number(b),
    );
    const representative = records[0] as ResolvedEntryRecord;
    const homographGroup = homographGroupOf.get(representative);

    const substantive = records.filter((r) => !isCrossReferenceOnly(r.entry));

    let chosen: ResolvedEntryRecord;
    let senses: string[];
    let source: ContentSource = 'cc-cedict';

    if (substantive.length === 1) {
      // The common case, including "one real entry plus a redundant
      // variant-form pointer entry under the same (headword, reading)":
      // ship the real one, drop the pointer(s) silently — their content
      // (if resolvable at all) would only duplicate what's already here.
      chosen = substantive[0] as ResolvedEntryRecord;
      senses = chosen.entry.senses;
    } else if (substantive.length === 0) {
      // Every entry in the group is cross-reference-only. Try resolving
      // each; ship if they agree, else record as unresolved.
      const resolutions = records
        .map((record) => ({ record, senses: resolveCrossReferenceSenses(record.entry, index) }))
        .filter(
          (r): r is { record: ResolvedEntryRecord; senses: string[] } => r.senses !== undefined,
        );
      const distinctSenseSets = new Set(resolutions.map((r) => r.senses.join('')));

      if (resolutions.length >= 1 && distinctSenseSets.size === 1) {
        const first = resolutions[0] as { record: ResolvedEntryRecord; senses: string[] };
        chosen = first.record;
        senses = first.senses;
        source = 'cc-cedict+override';
      } else {
        unresolvedCrossReferences.push({
          headword: representative.entry.simplified,
          readingNumeric: representative.entry.readingNumeric,
          levels,
          senseText: representative.entry.senses[0] ?? '',
        });
        continue; // never ship raw cross-reference text as a definition
      }
    } else {
      // >=2 distinct, substantive entries under the identical (headword,
      // reading) — a real content-modelling gap the id scheme cannot
      // represent (ConflictingCedictEntries's docstring). Ship neither.
      conflictingEntries.push({
        headword: representative.entry.simplified,
        readingNumeric: representative.entry.readingNumeric,
        levels,
        candidates: substantive.map((r) => ({
          traditional: r.entry.traditional,
          senses: r.entry.senses,
        })),
      });
      continue;
    }

    const { entry } = chosen;
    cards.push({
      id: computeCardId(entry.simplified, entry.readingNumeric),
      headword: entry.simplified,
      ...(entry.traditional !== entry.simplified ? { headwordTraditional: entry.traditional } : {}),
      reading: numberedToDiacritic(entry.readingNumeric),
      readingNumeric: entry.readingNumeric,
      senses,
      ...(entry.classifiers ? { classifiers: entry.classifiers.map(convertClassifier) } : {}),
      levels,
      ...(homographGroup !== undefined ? { homographGroup } : {}),
      source,
      // DEC-022: every homograph-derived card starts unreviewed regardless
      // of resolution path. There is no other assignment to `review` in
      // this function.
      review: 'unreviewed',
    });
  }

  return { cards, unmatchedWords, unresolvedCrossReferences, conflictingEntries };
}
