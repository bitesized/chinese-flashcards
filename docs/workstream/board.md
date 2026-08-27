# Work Board

Owner: **Claude Code**. This is the authoritative status of all work
([communication-protocol](../team/communication-protocol.md) §3).

**Current milestone:** M8 — Hanzi practice (owner-instructed 2026-08-25,
priority ahead of M5 — [DEC-035](../project/decision-log.md)). All planned
slices are done, plus one owner-driven follow-up round: WO-015 (character
lookup + stroke order viewing), WO-016 (guided stroke-drawing practice with
mistake feedback), WO-017 (free-drawing handwriting practice grid), and
WO-018 (pan/zoom on the grid, real handwritten-form pinned references at
true scale, and configurable filled/traceable/stroke-order practice rows).
**Blocked on:** nothing shipped. Real device/stylus/pinch testing (roadmap
M8 gate #2) needs the owner's own hardware — this environment has none;
mouse-simulated drawing and wheel-zoom have been verified in a real
browser instead, at multiple viewport widths including 360px. This is now
the **only** open item for M8's gate. Two escalations from WO-013/LR-004
also await the owner's decision before HSK 4–6 review (M7) — see below —
neither blocks anything already built.

**Priority feature, owner-instructed 2026-08-28, complete** ([DEC-036](../project/decision-log.md),
refined mid-build by [DEC-037](../project/decision-log.md)): custom, editable,
JSON-shareable flashcard decks, requested for immediate public release, out of
band from the M5–M7 sequence. WO-019 raised and dispatched directly. Scope
grew mid-flight: cards can now also be created by looking up a word by Hanzi
or Pinyin against the full pinned CC-CEDICT release (116,509 entries shipped
after real-corpus skips, not just the ~5,259 words in the compiled HSK
decks), which required a new, independent pipeline stage
(`pipeline/build-lookup.ts`, `public/cedict-lookup/`) and a CC BY-SA 4.0
attribution surface. See [WO-019](work-orders/WO-019-custom-shareable-decks.md).

**M3 — Level selection: complete** 2026-08-25 (gate met: HSK 1/2/3 all
`unreviewed: 0, flagged: 0`, all selectable, a real multi-level session
verified end to end).

**Escalations from WO-013/LR-004, awaiting owner decision** (not urgent —
recorded so they aren't silently forgotten before HSK 4–6's review):
1. **Content-sourcing policy**: 打篮球 ("to play basketball", HSK-2) has no
   CC-CEDICT entry at all — unlike every other adjudication this review or
   WO-009's made, resolving it means writing English content not sourced
   from any single CC-CEDICT line, composed from its two constituent
   CC-CEDICT entries (打 + 篮球) instead. This touches
   [DEC-017](../project/decision-log.md)'s "every shipped word comes from
   CC-CEDICT" principle closely enough that Red left it waived pending a
   ruling rather than deciding alone. If approved, the fix is a one-line
   override Red is ready to write.
2. **DEC-029's vulgar-content filter has a real, demonstrated coverage
   gap**: it only matches the literal `(vulgar)` marker; this review found
   two cards phrased as "euphemistic variant of X" carrying the same
   category of content, which the filter structurally cannot catch. Red
   corrected both by hand. Not recommending the filter be expanded (real
   risk of false-positiving on legitimate content, e.g. `庸俗` → "vulgar"
   as a real gloss) — flagging that every future level's review needs to
   budget the same manual scan, since "the filter already handles this" is
   not fully true.

**Finding, 2026-08-25** ([DEC-032](../project/decision-log.md)): roadmap M4
gate #3 as originally worded ("the two homograph cards must be spoken
differently") is unachievable — every homograph pair shares one identical
headword string by construction, and architecture.md §5 mandates speaking
the headword, never the Pinyin. Amended to verify correct headword/`zh-CN`
dispatch per card instead. Real product limitation, not a bug: HSK-1's three
homograph pairs (哪, 东西, 多少) will sound identical to a learner regardless
of which reading the card represents.

**Sequencing change, owner-instructed 2026-08-25** ([DEC-031](../project/decision-log.md)):
computer voice prioritised — M4 is built next, before M3. Milestone content
and gates are unchanged, only the order. M3 remains blocked on Red's HSK 2–3
review regardless.

**Process change, owner-instructed 2026-08-25**: Claude Code now performs
Black's and White's implementation work directly rather than dispatching
subagent sessions for it (WO-008 and the WO-009 mechanism follow-up were both
done this way). Red continues to be dispatched as a subagent, kept alive and
resumed for further Red work rather than spun up and down per work order.

**Scope change, owner-instructed 2026-08-24** ([DEC-025](../project/decision-log.md)):
M1's gate required only HSK 1's review, not HSK 1–3. HSK 2–6 are compiled but
review is resequenced — HSK 2–3 before M3, HSK 4–6 before M7, unchanged
coverage targets. A work order for HSK 2–3's review will be raised ahead of
M3, not now.

---

## In progress

| WO | Title | Agent | Status | Requirements |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

## Ready to dispatch

| WO | Title | Agent | Requirements |
| --- | --- | --- | --- |
| — | — | — | — |

## Blocked

| WO | Title | Agent | Blocked on |
| --- | --- | --- | --- |
| — | — | — | — |

**Resolved, owner-instructed 2026-08-25** ([DEC-029](../project/decision-log.md)):
Red's vulgar/NSFW content-policy question (LR-002's escalation) is answered —
a standing, mechanical, project-wide filter, not a per-card call repeated at
every level. Implemented directly: `pipeline/content-filter.ts`, applied to
all six levels regardless of review status. Verified against the full pinned
corpus: 33 cards had a vulgar sense removed (incl. 日 and 干, the two real HSK
words affected), zero false positives against legitimate content (e.g.
`庸俗` "vulgar/tacky" correctly untouched — no `(vulgar)` marker present).

## Done

| WO | Title | Agent | Completed |
| --- | --- | --- | --- |
| [WO-001](work-orders/WO-001-scaffold-repository.md) | Scaffold the repository ([report](reports/WO-001-report.md)) | Black | 2026-08-24 |
| [WO-002](work-orders/WO-002-acquire-pin-cc-cedict.md) | Acquire and pin CC-CEDICT; `data/LICENSE` ([SOURCE.md](../../data/source/cedict/SOURCE.md), [report](reports/WO-002-report.md)) | Black | 2026-08-24 |
| [WO-003](work-orders/WO-003-hsk-word-list.md) | Select and pin the HSK 2.0 word list ([SOURCE.md](../../data/source/hsk/SOURCE.md), [report](reports/WO-003-report.md)) | Red | 2026-08-24 |
| [WO-004](work-orders/WO-004-cc-cedict-parser.md) | CC-CEDICT parser with full fixture coverage ([report](reports/WO-004-report.md)) | Black | 2026-08-24 |
| [WO-005](work-orders/WO-005-pinyin-converter.md) | Pinyin numbered→diacritic converter ([report](reports/WO-005-report.md)) | Black | 2026-08-24 |
| [WO-006](work-orders/WO-006-pinyin-test-table.md) | Pinyin conversion test table ([fixtures](../../data/test-fixtures/pinyin-conversion.json), [report](reports/WO-006-report.md)) | Red | 2026-08-24 |
| — | Documentation set established; agents defined | Claude Code | 2026-08-24 |
| — | Owner rulings absorbed: six levels, SRS in scope, GPL-3.0, stack ratified | Claude Code | 2026-08-24 |
| — | All remaining questions decided under delegation; escalation narrowed; WO-003 written | Claude Code | 2026-08-24 |
| — | DEC-021 (erhua fusion) and DEC-022 (homograph review status) recorded from Red's WO-003/WO-006 findings; data-pipeline.md §3 and §5.2 updated | Claude Code | 2026-08-24 |
| — | WO-001/002/003/005/006 independently verified (typecheck, lint, 114 tests, licence check, all green) and merged into `main` via branch-per-WO with merge commits | Claude Code | 2026-08-24 |
| [WO-008](work-orders/WO-008-validation-gates-build-report.md) | Validation gates, deck emission, build report ([report](reports/WO-008-report.md)) | Claude Code (directly, per process change) | 2026-08-25 |
| — | `npm run build:data` green end to end: 261 tests, six decks compiled and committed (5,259 unique cards), CI's data-build slot filled and a drift-check step added; DEC-026 (embedded classifier extraction) and DEC-027 (waiver mechanism) recorded | Claude Code | 2026-08-25 |
| — | WO-004 independently verified (149 tests, exact reconciliation of 124,859 kept + 44 excluded = 124,903 header count, spot-checked normalisation) and merged into `main`; DEC-023 recorded, WO-010 raised for the one open content decision Black correctly declined to make unilaterally | Claude Code | 2026-08-24 |
| [WO-010](work-orders/WO-010-pronunciation-annotation-brackets.md) | Pronunciation-annotation bracket ruling ([LR-001](reviews/LR-001-pronunciation-annotation-brackets.md), [report](reports/WO-010-report.md)) | Red | 2026-08-24 |
| — | WO-010 independently verified — reproduced the exact 818-instance classification (2 Jyutping, 66 Tai-lo, 2 punctuation, 1 cross-ref leak, 747 Mandarin) and ran the stated algorithm against all 757 bracket groups with zero errors; one worked-example transcription error found and fixed (似地: `si4de5` mechanically converts to `sì de`, not `shì de` — the raw corpus literally cites the Taiwan-Mandarin sh→s merger). Merged into `main`. WO-008 written | Claude Code | 2026-08-24 |
| [WO-007](work-orders/WO-007-hsk-matching-resolution.md) | HSK matching, homograph resolution, overrides ([report](reports/WO-007-report.md)) | Black | 2026-08-24 |
| — | WO-007 independently verified (typecheck/lint/209 tests green) and merged. Found a real id collision on live HSK 1 data (都/Du1 vs 都/du1); fixed directly as DEC-024 rather than dispatching a fresh agent for a one-line, well-understood correction — `pipeline/identifiers.ts` updated, regression test added, re-verified against just the affected test files (not the full corpus) | Claude Code | 2026-08-24 |
| [WO-009](work-orders/WO-009-hsk1-linguistic-review.md) | Linguistic review: HSK 1 at 100% ([LR-002](reviews/LR-002-hsk1-review.md), [report](reports/WO-009-report.md)) | Red | 2026-08-25 |
| — | WO-009's two pipeline mechanism gaps (card synthesis, card exclusion) implemented directly as DEC-028; found and fixed a real bug surfaced by the integration (`loadOverrides` was scanning `waived-words.json`/`excluded-cards.json` as if they were card-override files, colliding on id). Rebuilt: HSK-1 closes at 154 cards, 0 unreviewed, 0 flagged. **M1's gate is met.** 274 tests, all green | Claude Code | 2026-08-25 |
| — | Owner decided LR-002's vulgar-content escalation: project-wide mechanical filter (DEC-029). `pipeline/content-filter.ts` added and wired into all six levels; 33 cards affected corpus-wide, zero false positives. 286 tests, all green | Claude Code | 2026-08-25 |
| [WO-011](work-orders/WO-011-core-card-experience.md) | M2: app shell, design tokens, card component, session flow, settings ([report](reports/WO-011-report.md)) | Claude Code (directly, per process change) | 2026-08-25 |
| — | First `src/` code: two swappable visual directions (Ink & Paper selected as active, DEC-030), card flip/Pinyin/session/settings/storage, HSK-1-only Level Select. 320 tests (34 new component tests), verified in a real browser incl. the CJK glyph-divergence set. `eslint-plugin-react-hooks` installed (WO-001's open item partially closed — `eslint-plugin-react` itself still has no ESLint-10-compatible release) and immediately caught two real hook bugs in `StudySession.tsx`, both fixed. **Real bug caught by the owner in a live check** (not by this work's own initial browser pass): the back face's Hanzi was rendering mirrored — a CSS Modules class-name collision (`styles.back` reused for two unrelated selectors) applied one `rotateY(180deg)` too many to that one element. Fixed (`Card.module.css`/`Card.tsx`), re-verified. **M2's gate is met** — all 14 of WO-011's acceptance criteria met, see the report | Claude Code | 2026-08-25 |
| [WO-012](work-orders/WO-012-audio-computer-voice.md) | M4: speech service, audio controls, speech-rate and autoplay settings ([LR-003](reviews/LR-003-wo012-speech-dispatch-review.md), [report](reports/WO-012-report.md)) | Claude Code (directly, per process change) | 2026-08-25 |
| — | Speech service (Web Speech API), speak controls on both card faces, `S` key, autoplay-on-reveal, and a speech-speed slider. 344 tests (20 new). **Two rounds of real owner live-testing feedback**, both acted on directly: the naively-first-matched `zh-CN` voice ("Eddy", an Apple generic persona voice) sounded "too fast and unclear" — fixed by deprioritising persona-named voices in favour of a standard one (now selects "Tingting") and lowering the default rate to a user-adjustable slider (0.5–1.5×, default 0.7×, replacing the originally-planned fixed normal/slow pair). **Real, permanent product limitation found and recorded, not silently accepted**: roadmap M4 gate #3 ("homograph pair must be spoken differently") is architecturally unachievable, since every homograph pair shares one identical headword string and the architecture mandates speaking the headword, never the Pinyin — amended via DEC-032 to verify correct per-card dispatch instead. Red's review (LR-003) approved with no blocking findings. **M4's gate is met** — all 10 of WO-012's acceptance criteria met | Claude Code | 2026-08-25 |
| — | Fixed a real pipeline bug found while preparing WO-013: DEC-028's vacuous-`homographGroup` cleanup only ran after card exclusion, not after the content filter's own drops (DEC-029) — a separate, later stage. 草:cao4 (fully vulgar, HSK 3) was dropped, leaving 草:cao3 tagged with a group of one. Extracted a shared `clearVacuousHomographGroups`, applied after both stages (DEC-033). 347 tests, all green | Claude Code | 2026-08-25 |
| [WO-014](work-orders/WO-014-level-selection-expansion.md) | M3: Level Select expansion, multi-level sessions, last-level memory ([report](reports/WO-014-report.md)) | Claude Code (directly, per process change) | 2026-08-25 |
| — | Level Select multi-select with an accent-bordered selected state, last-level memory (`DEFAULT_SETTINGS.lastLevels` now `['1']`), multi-level session merge/de-dup in `StudySession.tsx`, and a page-session deck cache in `decks.ts`. 362 tests (18 new). Verified end to end in real Chromium, including a manifest-route-intercepted simulation of HSK 2 becoming reviewed (the real review, WO-013, is still in progress) — a combined HSK 1+2 session produced a correct "1 / 341" queue. Also fixed a stale roadmap reference to "A/B grouping," a UX pattern DEC-015 removed before this document was last touched. WO-014's own acceptance criteria are individually met; **M3's overall gate stays open** pending WO-013 | Claude Code | 2026-08-25 |
| — | Fixed a real UI bug the owner caught live: the card's back face could overflow its box on a multi-sense word, since both faces were absolutely positioned into a fixed-height container that couldn't grow. Switched to CSS Grid stacking (`grid-area: 1/1` on both faces) so the card auto-sizes to whichever face's content is tallest, with a `max-height`+`overflow-y:auto` safety net for extreme cases. Verified live on `一:yi1` (7 senses, the largest in HSK-1): card grows to fit, zero page overflow. 368 tests, all green | Claude Code | 2026-08-25 |
| [WO-013](work-orders/WO-013-hsk2-3-linguistic-review.md) | Linguistic review — HSK 2 and HSK 3 at 100% ([LR-004](reviews/LR-004-hsk2-3-review.md), [report](reports/WO-013-report.md)) | Red | 2026-08-25 |
| — | Full 100% review of all 524 HSK-2/3 cards: 443 approved as generated, 7 corrected, 74 excluded, 15 gap-word manual cards added (9 of the 10 named + a further 6 masked gaps found via a full-deck scan, one beyond what the work order named), 1 word (打篮球) escalated rather than resolved. Two escalations raised for the owner (see board header) rather than decided unilaterally. Integration found and fixed the same "approved" mechanical-override gap WO-009 hit (generated `lr-004-hsk2-3-approved.json`, count matched Red's own figure of 443 exactly) and a real homograph-linking gap Red's own Findings identified (`homographGroup` now recomputed from scratch over the final card set, DEC-034, so a newly-synthesized card sharing a headword with an existing one links automatically). Rebuilt and verified: HSK 1/2/3 close at `unreviewed: 0, flagged: 0`; a real (not simulated) combined HSK 1+2+3 session produced a correct 619-card queue. **M3's gate is met.** 368 tests, all green | Claude Code | 2026-08-25 |
| [WO-015](work-orders/WO-015-hanzi-lookup-stroke-order.md) | M8: Hanzi lookup, stroke-order animation, character dictionary pipeline ([report](reports/WO-015-report.md)) | Claude Code (directly, per process change) | 2026-08-25 |
| — | New v1 capability, owner-instructed ([DEC-035](../project/decision-log.md)): a Hanzi section independent of the HSK word decks. Pinned `hanzi-writer-data@2.0.1` as a one-time extraction source (never a runtime dependency) under the Arphic Public License, extracted exactly the 2,619 characters HSK 1–6 actually use into `public/strokes/`. New pipeline stage (`pipeline/hanzi-dictionary.ts`/`build-hanzi.ts`) compiles a per-character Pinyin+English dictionary from CC-CEDICT's own single-character entries, independent of the word-deck pipeline. Searchable character list + per-character page (stroke animation, readings, speak control) shipped and browser-verified end to end. A real edge case surfaced immediately and was handled, not papered over: 儿's own CC-CEDICT entry for the bare erhua suffix has no convertible reading — skipped with a warning, not a crash. **Explicitly scoped to lookup/viewing only** (FR-80, FR-81, FR-85) — guided drawing practice with stroke feedback and stylus support (FR-82/83) and the free-drawing practice grid (FR-84) are separate follow-on work, not partially built here. 376 tests, all green | Claude Code | 2026-08-25 |
| [WO-016](work-orders/WO-016-guided-stroke-practice.md) | M8: Guided stroke-drawing practice with mistake feedback ([report](reports/WO-016-report.md)) | Claude Code (directly, per process change) | 2026-08-25 |
| — | Second M8 slice (FR-82, FR-83), built directly on WO-015. `HanziPractice` wraps `hanzi-writer`'s `quiz()` mode (self-hosted `charDataLoader`, same as `HanziAnimation`) with live mistake counting, a clean-run-vs-mistake-count completion message, and a "Try again" retry control. `HanziDetail` gained a Watch/Practice toggle that resets to Watch on every character change. The practice canvas is marked `role="application"` (not `role="img"`) with a documented, deliberate NFR-7 exception — there is no keyboard equivalent to "draw this stroke's shape." **Proactively found and fixed a real gap in WO-015's own sign-off**: its UI components (`HanziList`, `HanziAnimation`, `HanziDetail`) had zero component tests despite that work order's acceptance criteria claiming coverage was adequate; wrote all three retroactively (20 tests) alongside 8 new tests for `HanziPractice` itself. Verified in a real Chromium browser against a production build: a mouse-drawn stroke on the practice canvas produced a live "1 mistake so far." update, round-tripping through `hanzi-writer`'s real stroke recognition, not a mocked path. 404 tests, all green. **Real touch/stylus hardware verification (roadmap M8 gate #2) remains open** — this environment has none | Claude Code | 2026-08-25 |
| [WO-017](work-orders/WO-017-free-drawing-practice-grid.md) | M8: Free-drawing handwriting practice grid ([report](reports/WO-017-report.md)) | Claude Code (directly, per process change) | 2026-08-25 |
| — | Third and final planned M8 slice (FR-84), independent of WO-015/WO-016. `PracticeGrid` renders a tiled 田字格-style guide sheet (solid cell borders, dashed cross and diagonals) as an SVG pattern sized via `ResizeObserver`, with a transparent `<canvas>` layered on top that "Clear" alone ever touches. Unlike `hanzi-writer`'s classic mousedown/touchstart listeners used elsewhere in the Hanzi section, this canvas is this app's own code, so it uses the modern Pointer Events API directly — one path for mouse/touch/stylus, with a pen's real `event.pressure` giving a visibly thicker line than a default mouse stroke. Reachable straight from `HanziList`'s own top bar, no character selection required (M8 gate #3). Verified in a real Chromium browser against a production build at three viewports (420px, 360px, 1280px): grid tiles correctly at every width, a mouse-drawn stroke renders and Clear removes it without touching the guide lines, zero console errors throughout. 413 tests, all green (8 new for `PracticeGrid`, 1 for `HanziList`'s new control) | Claude Code | 2026-08-25 |
| [WO-018](work-orders/WO-018-practice-grid-pan-zoom-pinned-rows.md) | M8: Practice grid pan/zoom, real-handwriting pinned references, configurable practice rows ([report](reports/WO-018-report.md)) | Claude Code (directly, per process change) | 2026-08-25 |
| — | Direct owner follow-up on WO-017, delivered as a sequence of live feedback rather than one work order. Added two-finger pinch (scale+pan) and mouse-wheel zoom (around the cursor) to the sheet, plus a "Reset view" control. New `HanziGlyph` component shows a character in its real `hanzi-writer` handwritten stroke form (not the CJK web font) — used for pinned reference tiles, now sized to the exact same `CELL_SIZE` the main sheet's cells use so the reference is a true scale comparison, with the unpin control hover/focus-revealed on pointer devices and always visible on touch (`@media (hover: none)`, NFR-5). A new options bar (Filled/Traceable/Stroke order counts) drives a practice row per pinned character, entirely by **reusing** the already-shipped `HanziGlyph` (model), `HanziPractice` (WO-016's trace-with-feedback), and `HanziAnimation` (WO-015's stroke order) as repeatable row cells — no new practice mechanic was built. `HanziDetail` gained a "Copy on grid" control that pre-pins the current character. **A real bug caught only by live browser testing, not unit tests**: the wheel-zoom handler's `event.preventDefault()` silently failed because React attaches `onWheel` as a passive listener by default (since React 17) — jsdom's `fireEvent.wheel` never surfaces this. Fixed by attaching a native, non-passive `addEventListener('wheel', ...)` instead. 429 tests, all green (5 new for `HanziGlyph`, plus new/updated tests in `PracticeGrid` and `HanziDetail`). **All planned M8 deliverables are now shipped; real touch/stylus/pinch hardware verification (roadmap M8 gate #2) is the only item left open**, and needs the owner's own device | Claude Code | 2026-08-25 |
| [WO-019](work-orders/WO-019-custom-shareable-decks.md) | Custom, editable, JSON-shareable flashcard decks, with full CC-CEDICT lookup ([report](reports/WO-019-report.md)) | Claude Code (directly, per process change) | 2026-08-28 |
| — | Owner-instructed priority feature ([DEC-036](../project/decision-log.md)), scope refined mid-build to add CC-CEDICT lookup ([DEC-037](../project/decision-log.md)) after live owner feedback. New parallel domain entity (`CustomDeck`/`CustomCard`, domain-model.md §10) reusing the existing study UI via a new `StudyableCard` shape rather than forking it; `StudySession` generalised from an HSK-levels-only prop to a `source` union with zero change to its flip/Pinyin/speech mechanics. Import is treated as untrusted input from the start (`validateImportedDeck`: type/length checks, size limits, always a fresh id) — a real, deliberate departure from architecture.md §8's now-corrected "no user-generated content" line. **New, independent pipeline stage** (`pipeline/build-lookup.ts`, `npm run build:lookup`) compiles the full pinned CC-CEDICT release (not just the ~5,259 HSK-matched words) into a fetch-once search index plus a 64-shard lazy detail store, reusing `match.ts`/`content-filter.ts`/`sense-annotations.ts`'s formatting logic rather than reimplementing it. **Two real corpus edge cases found and handled, never exercised by the HSK-scoped pipeline**: entries with a literal-digit "reading" (`11区[11 Qu1]`, `双11[Shuang1 11]`) and CC-CEDICT's own two entries glossing square-bracket punctuation itself (`"square brackets [ ]"`) — both skipped and counted, not crashed on. Verified for real: `npm run build:lookup` against the pinned source shipped 116,509 entries (6,191 cross-reference-only, 318 conflicting, 22 left-with-no-senses, 585 invalid-reading skipped); a live Playwright pass against the dev server confirmed create → look up "nihao" → prefill (`nǐ hǎo` / "hello; hi", CC-CEDICT's exact wording) → trim a sense → add a note → save → study front/back → export → delete → re-import, zero console errors throughout. No Red review dispatched for either half — DEC-036/DEC-037 each record why. 482 tests, all green (30 files) | Claude Code | 2026-08-28 |

**Findings carried forward from WO-004's report** (both now spec'd): the
`trad|simp` cross-reference normalisation covers three real corpus shapes, not
just the spec's one worked example (DEC-023). A second, unrelated bracket
family — pronunciation-variant annotations with no adjacent word, 818 senses —
was a genuine open content decision; now ruled on in
[LR-001](reviews/LR-001-pronunciation-annotation-brackets.md), ready for WO-008
to implement.

**Note on concurrent dispatch.** Running Black and Red at the same time without
isolated worktrees let them share one `git HEAD`; a branch switch from one
agent left the other's in-progress checkout stranded, catchable only because
Claude Code inspected `git status`/reflog before either agent committed. Per
the owner's instruction (2026-08-24): batch multiple work orders into one
agent session rather than spinning up a fresh agent per work order, and use
isolated worktrees for any dispatch that must run concurrently with other git
activity.

**Open item from WO-001, partially resolved in WO-011**: `eslint-plugin-react-hooks`
(now ESLint-10-compatible) is installed and scoped to `src/**/*.{ts,tsx}`.
`eslint-plugin-react` itself (JSX style/best-practice rules) still has no
stable release supporting ESLint 10 — remains open, worth another look next
time a work order touches `src/`.

---

## Milestone progress

| Milestone | Status |
| --- | --- |
| M0 Documentation and ratification | **Complete** |
| M1 Data foundation | **Complete** (gate met 2026-08-25, per DEC-025's narrowed scope) |
| M2 Core card experience | **Complete** (gate met 2026-08-25) |
| M3 Level selection | **Complete** (gate met 2026-08-25) |
| M4 Audio | **Complete** (gate met 2026-08-25, as amended by [DEC-032](../project/decision-log.md)) |
| M5 Spaced repetition | Not started (M8 prioritised first — [DEC-035](../project/decision-log.md)) |
| M6 Offline, performance, polish | Not started |
| M7 Release candidate | Not started |
| M8 Hanzi practice | All deliverables shipped (WO-015, WO-016, WO-017: lookup, stroke viewing, guided practice, free-draw grid; WO-018: pan/zoom, scaled real-handwriting pinned references, configurable practice rows). Gate open only on owner's real touch/stylus/pinch hardware verification |
