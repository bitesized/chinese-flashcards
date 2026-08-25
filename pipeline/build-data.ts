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
 * `npm run build:data` — the single command running the full pipeline
 * end to end (data-pipeline.md §2, stages 1-9). Stages 1-2 (acquire, parse)
 * are WO-002/WO-004; 3-6 (index, match, resolve, override) are WO-007's
 * `pipeline/build-cards.ts`; 7 (transform — the sense-annotation part;
 * numbered-Pinyin-to-diacritic conversion already happened inside stage 4/5)
 * is `pipeline/sense-annotations.ts`; 8 (validate) is `pipeline/validate.ts`;
 * 9 (emit) is this file.
 *
 * Determinism (testing-strategy.md §3 gate 9) is verified by
 * `pipeline/build-data.test.ts`, which runs this module's pure
 * `buildDeckSet` twice and diffs the output — excluding `DeckMeta.builtAt`,
 * which is wall-clock time by definition (domain-model.md §6) and cannot be
 * byte-identical between two runs without lying about when the build ran.
 * "The same inputs produce byte-identical output" is understood to mean
 * every field except that one; see this file's `buildDeckSet` docstring.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndBuildCards } from './build-cards.js';
import type { BuildCardsResult } from './build-cards.js';
import { applyContentFilter } from './content-filter.js';
import { transformSenseAnnotations } from './sense-annotations.js';
import { validate } from './validate.js';
import type { ValidationResult } from './validate.js';
import { loadWaivers } from './waivers.js';
import type { Card, Deck, HskLevel, ReviewStatus } from '../src/domain/card.js';

const HSK_LEVELS: readonly HskLevel[] = ['1', '2', '3', '4', '5', '6'];
const LEVEL_TITLES: Record<HskLevel, string> = {
  '1': 'HSK 1',
  '2': 'HSK 2',
  '3': 'HSK 3',
  '4': 'HSK 4',
  '5': 'HSK 5',
  '6': 'HSK 6',
};
const DECK_SCHEMA_VERSION = 1;
const LANGUAGE_TAG = 'zh-Hans';

// The pinned HSK 2.0 word-list source (data/source/hsk/SOURCE.md §2).
// Recorded here as a constant, not derived programmatically, because
// hsk.ts's flattened output (per SOURCE.md §6) deliberately discards every
// field but headword/level/reading (DEC-017) -- there is nothing left in
// the parsed data to derive a version string from. Update this alongside
// SOURCE.md whenever the pinned commit changes (WO-003 is the owner of
// that decision, per data-pipeline.md §4).
const WORD_LIST_VERSION =
  'drkameleon/complete-hsk-vocabulary@7ac65bf1a6387d35f1ade478906172a19311c7f9';

function reviewSummary(cards: readonly Card[]): Record<ReviewStatus, number> {
  const summary: Record<ReviewStatus, number> = {
    unreviewed: 0,
    approved: 0,
    flagged: 0,
    corrected: 0,
  };
  for (const card of cards) summary[card.review] += 1;
  return summary;
}

function emptyCardsByLevel(): Record<HskLevel, Card[]> {
  const result = {} as Record<HskLevel, Card[]>;
  for (const level of HSK_LEVELS) result[level] = [];
  return result;
}

export interface DeckSet {
  decks: Record<HskLevel, Deck>;
  validation: ValidationResult;
  buildInput: BuildCardsResult;
  /** DEC-029: cards with at least one vulgar sense removed, still shipped. */
  contentFilteredIds: string[];
  /** DEC-029: cards dropped entirely — every sense was vulgar. */
  contentDroppedIds: string[];
}

/**
 * Pure: builds every deck object and runs validation, but touches no
 * filesystem beyond what `loadAndBuildCards`/`loadWaivers` already read.
 * Separated from `main()` below so `pipeline/build-data.test.ts` can call it
 * twice and diff the result for the determinism gate without writing files
 * twice.
 *
 * Applies the sense-annotation transform (stage 7) exactly once per unique
 * card, not once per level a card appears in — `buildCards` pushes the same
 * `Card` object into more than one level's array when `card.levels` has
 * more than one entry, and re-running a text transform over an
 * already-transformed string a second time is not guaranteed to be a
 * no-op for every possible input shape, so identity-based de-duplication
 * is the safe rule, not an optimisation.
 */
export function buildDeckSet(builtAt: string): DeckSet {
  const buildInput = loadAndBuildCards();
  const waivers = loadWaivers();

  // Unique cards first (a card in >1 level is the same object in more than
  // one of buildInput.cardsByLevel's arrays) — both the content filter
  // (DEC-029) and the sense-annotation transform must run exactly once per
  // card, not once per level it appears in: the content filter can drop a
  // card outright, and re-deriving cardsByLevel afterwards from each
  // surviving card's own `levels` field is simpler and safer than trying to
  // remove it from N per-level arrays independently.
  const uniqueCards = new Map<string, Card>();
  for (const level of HSK_LEVELS) {
    for (const card of buildInput.cardsByLevel[level]) {
      uniqueCards.set(card.id, card);
    }
  }

  const {
    cards: contentFiltered,
    filteredIds,
    droppedIds,
  } = applyContentFilter([...uniqueCards.values()]);

  const cardsByLevel = emptyCardsByLevel();
  for (const card of contentFiltered) {
    const next: Card = { ...card, senses: transformSenseAnnotations(card.senses) };
    for (const level of next.levels) {
      cardsByLevel[level].push(next);
    }
  }
  for (const level of HSK_LEVELS) {
    cardsByLevel[level].sort((a, b) => a.id.localeCompare(b.id));
  }

  const validation = validate({
    cardsByLevel,
    unmatchedWords: buildInput.unmatchedWords,
    unresolvedCrossReferences: buildInput.unresolvedCrossReferences,
    conflictingEntries: buildInput.conflictingEntries,
    waivers,
  });

  const decks = {} as Record<HskLevel, Deck>;
  for (const level of HSK_LEVELS) {
    const cards = cardsByLevel[level];
    decks[level] = {
      schemaVersion: DECK_SCHEMA_VERSION,
      language: LANGUAGE_TAG,
      level,
      title: LEVEL_TITLES[level],
      cards,
      meta: {
        cardCount: cards.length,
        dictionaryVersion: buildInput.dictionaryVersion ?? '',
        wordListVersion: WORD_LIST_VERSION,
        builtAt,
        reviewSummary: reviewSummary(cards),
      },
    };
  }

  return {
    decks,
    validation,
    buildInput: { ...buildInput, cardsByLevel },
    contentFilteredIds: filteredIds,
    contentDroppedIds: droppedIds,
  };
}

function buildReportMarkdown(deckSet: DeckSet): string {
  const { decks, validation, buildInput } = deckSet;
  const lines: string[] = [];
  lines.push('# Data build report');
  lines.push('');
  lines.push(`Built: ${decks['1'].meta.builtAt}`);
  lines.push(
    `CC-CEDICT release: ${decks['1'].meta.dictionaryVersion || '(unknown — see Findings)'}`,
  );
  lines.push(`HSK word list: ${decks['1'].meta.wordListVersion}`);
  lines.push('');
  lines.push('## Per-level counts');
  lines.push('');
  lines.push('| Level | Cards | Unreviewed | Approved | Corrected | Flagged |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const level of HSK_LEVELS) {
    const meta = decks[level].meta;
    const rs = meta.reviewSummary;
    lines.push(
      `| ${level} | ${meta.cardCount} | ${rs.unreviewed} | ${rs.approved} | ${rs.corrected} | ${rs.flagged} |`,
    );
  }
  lines.push('');

  lines.push('## Unmatched HSK words');
  lines.push('');
  if (buildInput.unmatchedWords.length === 0) {
    lines.push('None.');
  } else {
    for (const w of buildInput.unmatchedWords) {
      lines.push(
        `- HSK ${w.level}: **${w.headword}** (reading: ${w.readingNumeric ?? '(none supplied)'})`,
      );
    }
  }
  lines.push('');

  lines.push('## Unresolved cross-references');
  lines.push('');
  if (buildInput.unresolvedCrossReferences.length === 0) {
    lines.push('None.');
  } else {
    for (const c of buildInput.unresolvedCrossReferences) {
      lines.push(
        `- HSK ${c.levels.join(', ')}: **${c.headword}** (${c.readingNumeric}) — "${c.senseText}"`,
      );
    }
  }
  lines.push('');

  lines.push(
    '## Conflicting CC-CEDICT entries (same headword+reading, distinct substantive entries)',
  );
  lines.push('');
  if (buildInput.conflictingEntries.length === 0) {
    lines.push('None.');
  } else {
    for (const c of buildInput.conflictingEntries) {
      const candidateList = c.candidates.map((cand) => cand.traditional).join(', ');
      lines.push(
        `- HSK ${c.levels.join(', ')}: **${c.headword}** (${c.readingNumeric}) — candidates: ${candidateList}`,
      );
    }
  }
  lines.push('');

  lines.push(
    '## Waived gaps (build allowed to pass despite an unresolved word — see data/overrides/waived-words.json)',
  );
  lines.push('');
  if (validation.waivedGaps.length === 0) {
    lines.push('None.');
  } else {
    for (const g of validation.waivedGaps) {
      lines.push(`- HSK ${g.level}: **${g.headword}** (${g.reason})`);
    }
  }
  lines.push('');

  lines.push('## Overrides');
  lines.push('');
  lines.push(
    buildInput.orphanedOverrideIds.length === 0
      ? 'No orphaned overrides.'
      : `Orphaned override ids (matched no card): ${buildInput.orphanedOverrideIds.join(', ')}`,
  );
  lines.push('');

  lines.push('## Exclusions (DEC-028 — Red’s final "must not ship" verdicts)');
  lines.push('');
  lines.push(
    buildInput.excludedIds.length === 0
      ? 'No cards excluded.'
      : `${buildInput.excludedIds.length} card(s) excluded: ${buildInput.excludedIds.join(', ')}`,
  );
  if (buildInput.orphanedExclusionIds.length > 0) {
    lines.push(
      `Orphaned exclusion ids (matched no card): ${buildInput.orphanedExclusionIds.join(', ')}`,
    );
  }
  lines.push('');

  lines.push('## Content filter (DEC-029 — vulgar/NSFW senses, project-wide)');
  lines.push('');
  lines.push(
    deckSet.contentFilteredIds.length === 0
      ? 'No cards had a vulgar sense removed.'
      : `${deckSet.contentFilteredIds.length} card(s) had at least one vulgar sense removed, ` +
          `otherwise shipped: ${deckSet.contentFilteredIds.join(', ')}`,
  );
  if (deckSet.contentDroppedIds.length > 0) {
    lines.push(
      `${deckSet.contentDroppedIds.length} card(s) dropped entirely (every sense was vulgar): ` +
        deckSet.contentDroppedIds.join(', '),
    );
  }
  lines.push('');

  lines.push('## Validation');
  lines.push('');
  lines.push(validation.ok ? 'All gates passed.' : `${validation.issues.length} issue(s) found:`);
  for (const issue of validation.issues) {
    lines.push(`- [${issue.gate}] ${issue.message}`);
  }
  lines.push('');

  return lines.join('\n');
}

function reviewQueueJson(deckSet: DeckSet): string {
  const queue: { id: string; headword: string; reading: string; levels: HskLevel[] }[] = [];
  const seen = new Set<string>();
  for (const level of HSK_LEVELS) {
    for (const card of deckSet.decks[level].cards) {
      if (card.review !== 'unreviewed' || seen.has(card.id)) continue;
      seen.add(card.id);
      queue.push({
        id: card.id,
        headword: card.headword,
        reading: card.reading,
        levels: card.levels,
      });
    }
  }
  queue.sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(queue, null, 2) + '\n';
}

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function main(): void {
  const deckSet = buildDeckSet(new Date().toISOString());

  const decksDir = resolve(REPO_ROOT, 'public/decks');
  const buildDir = resolve(REPO_ROOT, 'data/build');
  mkdirSync(decksDir, { recursive: true });
  mkdirSync(buildDir, { recursive: true });

  for (const level of HSK_LEVELS) {
    writeFileSync(
      resolve(decksDir, `hsk-${level}.json`),
      JSON.stringify(deckSet.decks[level], null, 2) + '\n',
    );
  }
  writeFileSync(resolve(buildDir, 'report.md'), buildReportMarkdown(deckSet));
  writeFileSync(resolve(buildDir, 'review-queue.json'), reviewQueueJson(deckSet));

  if (!deckSet.validation.ok) {
    console.error(`Data build FAILED: ${deckSet.validation.issues.length} validation issue(s).`);
    for (const issue of deckSet.validation.issues) {
      console.error(`  [${issue.gate}] ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const totalCards = new Set(HSK_LEVELS.flatMap((l) => deckSet.decks[l].cards.map((c) => c.id)))
    .size;
  console.log(`Data build OK: ${totalCards} unique cards across 6 levels.`);
  if (deckSet.validation.waivedGaps.length > 0) {
    console.log(
      `${deckSet.validation.waivedGaps.length} waived gap(s) — see data/build/report.md.`,
    );
  }
}

// Only run when executed directly (`node pipeline/build-data.js`), never on
// import — `pipeline/build-data.test.ts` imports `buildDeckSet` from this
// module and must not trigger real filesystem writes as a side effect of
// that import.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
