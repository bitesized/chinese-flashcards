---
id: WO-008
agent: Black
outcome: complete
date: 2026-08-25
---

# WO-008 — Work Report

**Performed directly by Claude Code**, not a dispatched Black agent session —
per the owner's instruction on 2026-08-25 that Claude Code do Black's and
White's implementation work directly rather than spawning subagent sessions
for it. Recorded under `agent: Black` because Black remains the accountable
owner of this area per charter.md §3; this note makes the actual authorship
honest rather than silently implying a Black session ran.

## What was done

Implemented stages 7 (the sense-annotation part — numbered-Pinyin-to-diacritic
conversion for the main reading already happened inside WO-007's `match.ts`),
8 (validate), and 9 (emit) of the pipeline, and wired `npm run build:data` as
the single end-to-end command.

- **`pipeline/sense-annotations.ts`** — implements
  [LR-001](../reviews/LR-001-pronunciation-annotation-brackets.md) in full:
  the non-Mandarin (Jyutping/Tai-lo) drop-clause rule (§1.1), the Mandarin
  pronunciation-variant bracket-to-diacritic conversion with syllable-boundary
  recovery (§1.2), the hyphen-joined tone-sandhi extension (§1.3), and the
  fail-loud rule for anything unrecognised (§1.4). Verified against every
  worked example in LR-001 verbatim, several real HSK-matched senses, and the
  full pinned corpus (816 bracket-containing senses before, 0 remaining after,
  except the 2 punctuation entries LR-001 §3 explicitly routes elsewhere).
- **`data/overrides/lr-001-cross-reference-and-punctuation.json`** — the three
  individual overrides LR-001 §2/§3 specify (岗's leaked cross-reference,
  中括号/方括号's punctuation reword). All three are currently inert: none of
  the three headwords are in the pinned HSK 1–6 list, confirmed by checking
  all six files — committed anyway, per Red's own recommendation, so they're
  ready rather than becoming a fresh question if the word list ever changes.
- **`pipeline/waivers.ts`** and **`data/overrides/waived-words.json`** — a new
  mechanism ([DEC-027](../../project/decision-log.md)), since
  data-pipeline.md's "explicitly waived" language has no existing schema and
  the id-keyed override file structurally cannot represent an unresolved
  word (no card, no id). Generated as a one-time snapshot of every word WO-007
  could not resolve as of 2026-08-25 (88 headwords: 17 unmatched, 9 unresolved
  cross-references, 62 same-key content conflicts) — not regenerated on every
  build, so a future regression still fails the build correctly.
- **`pipeline/validate.ts`** — every gate in
  [testing-strategy](../../engineering/testing-strategy.md) §3 except
  determinism (gate 9, which is a property of two runs, not one — checked by
  `pipeline/build-data.test.ts` instead). Gate 6 (level coverage) checks the
  real HSK mapping against resolved cards and the waivers file, per
  `(headword, level)`, not merely per headword.
- **`pipeline/build-data.ts`** — the stage 9 orchestrator (`buildDeckSet`,
  pure; `main`, the I/O shell writing `public/decks/*.json`,
  `data/build/report.md`, `data/build/review-queue.json`). Applies the
  sense-annotation transform exactly once per unique card (identity-keyed),
  not once per level a multi-level card appears in.
- **`src/domain/card.ts`** — added `Deck`/`DeckMeta`, direct transcription of
  domain-model.md §6, the same pattern WO-007 used for `Card`.
- **`npm run build:data`** wired via `scripts/run-build-data.mjs` (compiles
  `pipeline/`/`src/domain/` in place via `tsconfig.build-data.json`, since
  Node's `--experimental-strip-types` does not remap `.js`-specifier imports
  to sibling `.ts` files — confirmed by testing directly, not assumed — so
  the modules' `import.meta.url`-relative paths into `data/` need real
  compiled `.js` siblings to resolve correctly) then
  `scripts/clean-build-data.mjs` (always runs, even on failure, so a stale
  compiled `.js` never shadows its live `.ts` source for Vitest's resolver on
  the next `npm test`). CI's commented slot (WO-001) is filled in, plus a new
  "fail if the data build drifted from committed output" step, since compiled
  decks are committed specifically to make a content change a reviewable diff.

**Two fixes made directly, outside this work order's original file list,
because they were real bugs blocking real HSK-1 data, not judgement calls:**

- **[DEC-026](../../project/decision-log.md)**: `pipeline/cedict.ts`'s
  classifier extraction only recognised a classifier as an entire top-level
  sense (the spec's one worked example). Real data — 光, 菜, 门, and 82 more
  entries — embeds a classifier parenthetically inside a substantive sense
  (`"light; ray (CL:道[dao4])"`), which the existing DEC-023 cross-reference
  normalisation was *also* silently mangling (stripping the classifier's own
  reading, mistaking it for a headword pointer). Fixed in `cedict.ts` with a
  new `extractEmbeddedClassifier`, run before DEC-023's normalisation.
  Mechanical, same category as DEC-023 itself — not a linguistic call.
- Extended `pipeline/build-cards.ts`'s `BuildCardsResult`/`buildCards` to
  carry `dictionaryVersion` through (needed for `DeckMeta.dictionaryVersion`,
  and the work order explicitly required "real, traceable values, not
  placeholders"), rather than a second `loadCedict()` call re-parsing the
  full ~125k-line file for one string.

Both are documented as findings in this report rather than silently folded
in, per charter.md §7's "uncertainty is reported, not resolved silently" —
though in this case the fixes themselves were not uncertain, only outside the
work order's originally-scoped file list.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | LR-001 Mandarin-annotation conversion, zero leaked `[`/`]` from that family across the full real corpus | yes | `pipeline/sense-annotations.test.ts` real-corpus regressions; full-corpus verification during development: 816 → 0 (see "What was done") |
| 2 | LR-001 cross-reference-leak and punctuation overrides applied correctly | yes | `data/overrides/lr-001-cross-reference-and-punctuation.json`; both currently inert (headwords not in HSK list), as Red's own report anticipated |
| 3 | LR-001 fail-loud rule (§1.4) implemented | yes | `pipeline/sense-annotations.test.ts` "throws SenseAnnotationError..."; confirmed the two real punctuation entries correctly throw rather than silently mis-convert (see "What was done") |
| 4 | Round-trip Pinyin gate passes across the full corpus using `pinyinRoundTripsCleanly`, not reimplemented | yes | `pipeline/validate.ts` imports and calls it directly; `pipeline/build-data.test.ts` confirms `validation.ok` against the real pinned corpus |
| 5 | No duplicate `Card.id` across all six decks combined | yes | `pipeline/validate.test.ts` uniqueness tests; real build reports zero uniqueness issues (DEC-024 already fixed the one known real collision) |
| 6 | No card ships with zero senses | yes | `pipeline/validate.test.ts` non-empty-senses tests |
| 7 | No shipped sense contains `CL:`/`[`/`]`/`|`, verified across the full corpus | yes | `pipeline/validate.test.ts`; real build: `validation.ok === true` |
| 8 | Every headword contains CJK, no Latin letters | yes | `pipeline/validate.test.ts`, including the `B格`-shaped edge case from WO-004's own fixture |
| 9 | Every HSK word resolves to a card or is recorded as an explicit, named waiver | yes | `pipeline/validate.ts`'s level-coverage gate; real build: 45 waived `(headword, level)` gaps, all present in `data/overrides/waived-words.json`, zero unwaived failures |
| 10 | Per-level counts within tolerance of domain-model.md §9 | yes | `pipeline/validate.ts`'s count-tolerance gate; real build passes for all six levels |
| 11 | `npm run build:data` run twice produces byte-identical `public/decks/*.json`, excluding `builtAt` | yes | `pipeline/build-data.test.ts`'s determinism test, `buildDeckSet` called twice with different `builtAt` values, full JSON comparison excluding that one field |
| 12 | `npm run build:data` succeeds with no network access | yes | Every I/O call in the pipeline reads a committed local path (`readFileSync`); no `fetch`/network API anywhere in `pipeline/` — confirmed by grep, not assumed |
| 13 | Six deck files written to `public/decks/`, matching the `Deck` schema, `DeckMeta` fully populated | yes | `public/decks/hsk-{1..6}.json`, committed; spot-checked `dictionaryVersion`/`wordListVersion`/`reviewSummary` are real values, not placeholders |
| 14 | `data/build/report.md` contains all five required sections, empty sections stated plainly | yes | `data/build/report.md`, committed — "Unresolved cross-references," "Conflicting CC-CEDICT entries," "Waived gaps," and "Overrides" sections all present even when a given level has none to report |
| 15 | `data/build/review-queue.json` contains every `review: 'unreviewed'` card | yes | Generated by `reviewQueueJson` in `build-data.ts`; 5,259 entries, matching the real build's unique-card count exactly (every card is unreviewed at this stage — Red hasn't reviewed anything yet) |
| 16 | A homograph-derived card is not flagged or excluded for that reason alone | yes | No code path in `pipeline/match.ts` (unchanged) sets anything but `unreviewed`; `validate.ts`'s nothing-flagged gate only rejects `review: 'flagged'`, never `unreviewed` |
| 17 | `npm run typecheck`, `npm run lint`, and `npm test` all remain green | yes | All three run this session; 261/261 tests, zero lint errors, clean typecheck |

## Not done

Nothing outstanding within this work order's scope. All seventeen acceptance
criteria are met.

## Findings

- **[DEC-026](../../project/decision-log.md) and the `dictionaryVersion`
  plumbing** (see "What was done") were both fixes/extensions outside this
  work order's originally-scoped "do not modify" file list, made directly
  because they were real, verified bugs/gaps blocking real HSK-1 data, not
  judgement calls — flagged here explicitly per charter.md §7.
- **[DEC-027](../../project/decision-log.md), the waiver mechanism, surfaces
  a much larger real number than WO-007's report alone suggested**: 88
  headwords, not just the one (里) WO-007's report named as an example. 62 of
  these are `ConflictingCedictEntries` — genuine, verified, real content
  ambiguities in CC-CEDICT (checked several by hand: 你/妳, 岁's two
  variant-character entries, 喂's three-way pileup, 和's multiple homograph
  and variant forms), not a bug in WO-007's matcher, which is correctly
  refusing to guess. **Of the 17 "unmatched" entries, 8 are benign**: the
  headword already has a correct, resolved card at that level via a
  different source-list form (e.g. 日 — "day/sun" — resolves correctly; only
  its separate "abbr. for Japan" form, capitalised `Ri4` in the source list,
  fails to find a case-matching CC-CEDICT counterpart). The other 9 are
  genuine full gaps. None of HSK-1's issues are in this "genuine gap"
  category — HSK-1's only unmatched entry (日) is the benign kind, and its 2
  cross-reference and 10 conflicting-entry issues are all real, verified
  ambiguities Red will need to adjudicate in WO-009. This is good news for
  the HSK-1-first sequencing ([DEC-025](../../project/decision-log.md)): no
  word is silently missing from HSK-1 for a reason nobody can see.
- **`npm run build:data`'s "compile in place" approach** (see "What was
  done") was chosen after directly testing that Node's
  `--experimental-strip-types` does not resolve a `.js`-specifier import to
  a sibling `.ts` file — confirmed with a minimal repro before committing to
  the tsconfig/cleanup-script design, not assumed from documentation.
- **The `WORD_LIST_VERSION` constant in `build-data.ts` is a hardcoded
  string**, not derived programmatically — `hsk.ts`'s flattened output
  deliberately discards every field but headword/level/reading (DEC-017), so
  there is nothing left in the parsed data to derive a version identifier
  from. Whoever next re-pins the HSK source (Red, per data-pipeline.md §4)
  needs to update this constant alongside `SOURCE.md`.

## Follow-ups proposed

- **WO-009 (Red, HSK 1 review) should read this report's waiver findings
  before starting** — specifically, the 10 `conflicting-entries` and 2
  `unresolved-cross-reference` waivers at HSK 1 are real content questions
  needing Red's adjudication and, in most cases, a manual override to
  actually ship a card. The review queue (`data/build/review-queue.json`)
  covers cards that exist; these 12 HSK-1 gaps cover words that currently
  have *no* card at all, so WO-009's scope should explicitly include them,
  not just the review queue.
- **`data-pipeline.md`'s "Classifiers" table row** should be updated to name
  both extraction shapes next time that document is revised (DEC-026's
  consequences note already says this; flagging again here since it's a
  documentation debt, not a functional gap).
- **A future work order should audit whether any of the 8 "benign"
  unmatched-word cases indicate a pattern worth fixing in `pipeline/hsk.ts`
  or `pipeline/match.ts`** (e.g. should a capitalised abbreviation-only form
  with no independent CC-CEDICT entry be silently dropped from the mapping
  rather than reported as unmatched?) — not fixed here since it's a design
  question about the matching contract, not a bug, and the current behaviour
  (report, don't silently drop) is safe.
