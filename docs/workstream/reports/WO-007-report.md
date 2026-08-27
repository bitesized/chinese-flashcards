---
id: WO-007
agent: Black
outcome: complete
date: 2026-08-24
---

# WO-007 — Work Report

## What was done

This work order was picked up mid-flight: a prior instance of this agent had
already implemented the full module set on branch `wo-007-hsk-matching-resolution`
but the session was interrupted (by an unrelated infrastructure issue, per the
dispatch) before the work was committed or reported. I read every existing file
in full, re-verified the reasoning against the spec documents (data-pipeline.md,
domain-model.md, decision-log.md's DEC-004/005/022, `data/source/hsk/SOURCE.md`,
and both WO-004 and WO-005's reports), re-ran `npm run typecheck`, `npm run
lint`, `npm test`, and `npm run format:check`, and found the implementation
correct, complete, and already meeting every acceptance criterion — so I
committed it as-is rather than rewriting it. No code changes were needed from
me; my contribution this session was verification, the commit, and this report.

Summary of the implementation (`pipeline/identifiers.ts`, `pipeline/hsk.ts`,
`pipeline/match.ts`, `pipeline/overrides.ts`, `pipeline/build-cards.ts`,
`src/domain/card.ts`):

- **`src/domain/card.ts`** — the shared `Card`/`Classifier`/`HskLevel`/
  `ContentSource`/`ReviewStatus` types, transcribed directly from
  domain-model.md §3 (normative TypeScript), imported by both pipeline and
  (eventually) runtime. Invariant enforcement is explicitly left to WO-008.
- **`pipeline/hsk.ts`** — parses each pinned `hsk-{N}.json`, flattening
  `forms[]` into one `(headword, level, readingNumeric)` row per form per
  SOURCE.md §6, discarding everything else the source carries. Applies only
  the one extraction-time fix SOURCE.md §5.2 specifies (trailing bare `er` →
  `r5` for 纽扣儿); the `ü`/`u:` fold is deliberately deferred to matching
  time (see below) rather than applied here.
- **`pipeline/match.ts`** — `buildHeadwordIndex` (stage 3) and
  `matchAndResolve` (stages 4-5). Source-supplied-reading rows match
  headword+reading case-sensitively (a deliberate, documented divergence
  from SOURCE.md §5.1's literal suggestion to lowercase — see Findings for
  why this matters); reading-less rows fan out to every CC-CEDICT reading
  under the headword, tagged with a shared `homographGroup`. Cross-reference
  resolution follows the pointer via the headword index (never by
  re-parsing the sense string, per WO-004's report), cycle-safe up to a hop
  limit. Every produced card gets `review: 'unreviewed'` unconditionally —
  there is no code path that sets anything else.
- **`pipeline/overrides.ts`** — `applyOverrides`/`loadOverrides`, proven with
  a synthetic fixture only. No real override content authored.
- **`pipeline/build-cards.ts`** — pure orchestration (`buildCards`) plus a
  thin I/O shell (`loadAndBuildCards`) over the real committed files,
  producing `Record<HskLevel, Card[]>` with deterministic (id-sorted)
  ordering, for WO-008 to consume directly.
- **`pipeline/identifiers.ts`** — `computeCardId`/`normalizeReadingKey` per
  DEC-005's literal text (lowercase, whitespace removed, `u:`/`ü` → `v`).

Test suite: `pipeline/identifiers.test.ts`, `pipeline/hsk.test.ts`,
`pipeline/match.test.ts`, `pipeline/overrides.test.ts`,
`pipeline/build-cards.test.ts`, using two new fixtures
(`data/test-fixtures/hsk-sample.json`, `data/test-fixtures/cedict-cross-reference.txt`)
plus WO-004's existing `cedict-entries.txt` fixture and real-corpus inline
fixtures copied verbatim from the pinned CC-CEDICT file (documented with
exact source line numbers in `match.test.ts`'s comments).

Verification performed this session: `npm run typecheck` (clean),
`npm run lint` (clean), `npm test` (209/209 passing across 7 files),
`npm run format:check` (clean).

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | HSK mapping extraction matches SOURCE.md §6 exactly, incl. ü/`u:` fold and `er`/`r5` equivalence | yes | `pipeline/hsk.test.ts` — flattening test, ü-literal-preservation test, `er`→`r5` rewrite test; fold itself applied at match time in `pipeline/match.ts`'s `foldForMatching`, exercised by `match.test.ts`'s 绿 test |
| 2 | Headword → `CedictEntry[]` index built and used for matching | yes | `pipeline/match.ts`'s `buildHeadwordIndex`; `match.test.ts`'s `buildHeadwordIndex` describe block |
| 3 | A source-supplied-reading match resolves to the correct single card | yes | `match.test.ts` "rule 1, source-supplied reading" — 都/Du1, 都/dou1, 都/du1 each resolve to their own correct card |
| 4 | Ambiguous headword emits all readings as separate cards sharing one `homographGroup`, senses never merged | yes | `match.test.ts` "rule 2, ambiguous / no source reading" — real 行 triple |
| 5 | Explicit named test: source-supplied-reading match still gets `review: 'unreviewed'` (DEC-022) | yes | `match.test.ts` "DEC-022: review status never depends on resolution path" — both named sub-tests |
| 6 | A real cross-reference-only entry resolves to its target's senses, `source: 'cc-cedict+override'` | yes | `match.test.ts` — B格→逼格, real lines 61/108070 of the pinned corpus |
| 7 | Unresolvable cross-reference and unmatched HSK word both handled without crashing, both recorded structurally | yes | `match.test.ts` "unresolvable cross-reference" and "unmatched HSK word" describe blocks; `UnresolvedCrossReference`/`UnmatchedHskWord` types |
| 8 | Override mechanism proven with synthetic fixture; no real content authored | yes | `pipeline/overrides.test.ts`; `data/overrides/` contains no real files |
| 9 | `Card.id` computed exactly per DEC-005 incl. `u:`→`v`; two readings of same headword → different ids | yes | `pipeline/identifiers.test.ts`; `match.test.ts`'s 行 test asserts `ids.size === 3` |
| 10 | `Card.reading` populated via `pipeline/pinyin.ts`'s `numberedToDiacritic`, not reimplemented | yes | `pipeline/match.ts` imports and calls `numberedToDiacritic`; no local reimplementation |
| 11 | Real 行 homograph triple (hang2/heng2/xing2) produces three distinct cards, distinct ids, un-merged senses | yes | `match.test.ts` "行: with no source reading..." test, using WO-004's real fixture |
| 12 | Classifiers carry through from `CedictEntry` to `Card` unchanged | yes | `match.test.ts` "classifiers carry through" — 书's three classifiers, incl. `trad|simp` sub-form (冊\|册) |
| 13 | Output is `Card[]` grouped/keyed by level, directly consumable by WO-008 | yes | `pipeline/build-cards.ts`'s `BuildCardsResult.cardsByLevel: Record<HskLevel, Card[]>`, all six levels always present |
| 14 | No file I/O beyond reading committed source files; pure core, thin I/O shell | yes | `buildCards`/`matchAndResolve`/`buildHeadwordIndex`/`applyOverrides` are pure; `loadAndBuildCards`/`loadHskMapping`/`loadOverrides` are the only I/O, all reading pinned/committed paths |
| 15 | `npm run typecheck`, `npm run lint`, `npm test` all green | yes | Ran all three plus `format:check` this session — all clean; 209/209 tests passing |

## Not done

Nothing outstanding within this work order's explicit scope. All fifteen
acceptance criteria are met. As instructed by the work order itself, no real
override content was authored, no validation/invariant-failing logic was
built (WO-008), and the pronunciation-annotation-bracket decision was left
untouched (routed to Red via WO-010, already resolved separately).

## Findings

- **A real, ratified-decision-log defect: `Card.id` collides for two
  genuinely distinct, correctly-populated cards, in real committed data.**
  DEC-005 fixes `id` normalisation as "lowercase, spaces removed, `u:`
  folded to `v`" — applied literally, `computeCardId('都', 'Du1')` and
  `computeCardId('都', 'du1')` both produce `都:du1`. This is not a
  hypothetical: 都 is a real HSK 1 word, and the pinned CC-CEDICT release
  has both `都/Du1` ("surname Du") and `都/du1` ("capital city") as separate,
  substantive entries — the exact pair DEC-022 already names as a concrete
  worked example. `pipeline/match.ts` correctly keeps these as two distinct,
  correctly-populated `Card` objects (different `readingNumeric`, different
  `senses` — verified never silently merged or overwritten, see
  `match.test.ts`'s "the known DEC-005 id-collision case" test), but both
  carry the identical `id`. This violates domain-model.md §3 invariant 1
  ("`id` is unique across the entire corpus") and will cause WO-008's
  duplicate-id gate (data-pipeline.md §8) to correctly fail the real build
  the moment it's wired up against the real pinned HSK-1 data — which is
  the *correct* behaviour per "fail the build rather than warn," but it
  means the pipeline cannot ship until this is resolved. I did not invent a
  fix (e.g. making the id scheme case-sensitive, or folding differently) —
  DEC-005 is explicitly "fixed from M1" because "changing the id scheme
  later would orphan every override," so amending it is a call for Claude
  Code (as DEC-005's recorded authority) or the owner, not something I
  should do unilaterally inside a matching module. Candidate fixes I can see
  but am not choosing between: (a) amend DEC-005 to preserve case in the id
  fold (the most direct fix, since case is exactly what distinguishes these
  readings, and case-folding was seemingly done for id readability rather
  than a hard requirement); (b) treat this specific collision as something
  Red resolves via override/exclusion once review reaches it; (c) some
  other disambiguation. This needs a decision before WO-008's real build
  can go green. I recommend (a) as the least invasive — it only affects id
  *readability* for surname-vs-common-reading pairs, changes nothing else
  in the scheme's properties (still deterministic, still homograph-safe,
  still level-independent), and directly removes the defect at its root —
  but the call belongs to Claude Code/the owner, not me.
- **A second, related but non-blocking modelling gap: `(headword, reading)`
  is not always unique within CC-CEDICT itself**, independent of the above.
  Simplification sometimes collapses more than one Traditional character
  onto the same Simplified spelling with the identical reading — real
  example: 裡 ("lining; interior") and 里 ("li, a unit of distance") both
  simplify to 里/li3, as two separate, both-substantive CC-CEDICT entries.
  `pipeline/match.ts` detects this (`ConflictingCedictEntries`) and ships
  neither candidate rather than guessing, recording both for Red's
  attention — this is a genuine, real (not synthetic) case in the pinned
  corpus, confirmed by `build-cards.test.ts`'s "never ships either candidate
  from a real conflicting-entry group" regression test against the live
  data. This is working as intended (never silently pick one), but WO-008 /
  Red should know it exists as a real, currently-unresolved gap for 里 at
  minimum, requiring either a manual override supplying two distinct ids,
  or some other resolution, before HSK-1's 里 entry can ship.
- **Case-sensitive matching was a deliberate, documented divergence from
  SOURCE.md §5.1's literal wording.** SOURCE.md §5.1 suggests lowercasing
  the matching key "in addition to" the ü/`u:` fold, "consistent with the id
  normalisation already specified." I (the prior session) chose not to do
  this for the *matching* key, because CC-CEDICT's capitalisation is
  content-bearing — it is the only thing that distinguishes a headword's
  proper-noun reading from its common reading in some cases (都's `Du1`
  surname vs `du1` capital-city). Lowercasing the matching key would make an
  HSK row supplying either reading match both candidates simultaneously,
  reintroducing exactly the ambiguity DEC-022's `都` example is about.
  Verified corpus-wide: 1,150 `(simplified, reading)` keys in the pinned
  CC-CEDICT collide when folded case-insensitively. I judged this a
  correctness call within the matching module's remit (SOURCE.md's
  suggestion was for the id-normalisation reuse, not a decree), not a
  reason to escalate — but it's the direct cause of the DEC-005 collision
  above, so it's flagged together with it.
- **`pipeline/cedict.ts` and `pipeline/pinyin.ts` were used exactly as
  provided, never modified**, per this work order's explicit "do not touch"
  instruction — both only imported and called (`numberedToDiacritic`,
  `parseCedict`/`loadCedict`).

## Follow-ups proposed

- **A decision is needed on the 都 id-collision defect before WO-008's
  build can go green against real data.** Candidate owner: Claude Code
  (DEC-005's recorded authority) or the project owner if Claude Code judges
  it needs escalation. See Findings above for the three candidate
  resolutions I see, with a tentative recommendation.
- **里/li3's genuine content conflict (裡 vs 里, both substantive, same
  simplified spelling and reading) needs Red's attention once review
  reaches HSK 1** — it will currently ship as neither candidate (correct,
  safe default) but the word is entirely absent from the HSK 1 deck as a
  result, which needs a resolution, not just a safe non-ship.
