# Roadmap and Milestones

Owner: **Claude Code**. Status: **Draft, awaiting owner ratification.**

No calendar dates. Milestones are gated on evidence, and each gate is a checkable
list. A milestone is not complete because the work feels finished.

---

## M0 — Documentation and ratification  *(complete)*

Establish the paperwork and settle the decisions that block everything else.

**Deliverables**
- [x] Full documentation set under `docs/`
- [x] CLAUDE.md re-established as the source of truth and index
- [x] Agent definitions authored in `.claude/agents/`
- [x] Work-order system defined and templates in place
- [x] Owner ratified the stack ([OQ-1](open-questions.md))
- [x] Owner ruled on level structure — six levels, no A/B split ([OQ-3](open-questions.md))
- [x] Owner ruled SRS **in scope** ([OQ-4](open-questions.md)) — added as M5
- [x] Owner chose GPL-3.0 for code ([OQ-5](open-questions.md))
- [x] Documents updated to reflect all four rulings
- [x] Owner delegated all remaining decisions; escalation criteria narrowed
      ([charter](../team/charter.md) §4)
- [x] Every open question closed; every ADR `Accepted`
      ([open-questions](open-questions.md), [decision-log](decision-log.md))
- [x] HSK word list approach decided and ownership assigned to Red
      ([DEC-017](decision-log.md), WO-003)

**Gate: met.** Zero open questions, zero `Proposed` ADRs, and M1 is unblocked.

## M1 — Data foundation  *(next)*

The pipeline, and trustworthy content. Deliberately first: everything downstream
is built against this data, and UI built against guessed data is UI built twice.

Per [DEC-025](decision-log.md), this gate now requires only **HSK 1** to be
linguistically reviewed — not HSK 1–3. All six decks are still compiled (that
part is fully automated and cheap); HSK 2–6 exist after M1 as
compiled-but-unreviewed and are not yet exposed to a learner. Their review is
resequenced to before M3 (HSK 2–3, 100%) and before M7 (HSK 4–6, sampled),
so app development starts against a small, complete, trustworthy slice
instead of waiting on review of the full ~5,000-word corpus.

**Deliverables**
- Repository scaffolded per [conventions](../engineering/conventions.md) §1
- CC-CEDICT pinned in `data/source/` with `SOURCE.md`
- HSK word list selected, verified, and pinned by Red (WO-003), reduced to the
  level mapping per [DEC-017](decision-log.md)
- Parser, with fixture coverage for every awkward case in
  [data-pipeline](../engineering/data-pipeline.md) §3
- Pinyin numbered → diacritic conversion, with Red's test table
- Matching, homograph resolution, override mechanism
- All six deck files compiled and committed (compilation, not review — see above)
- Build report and review queue committed
- Validation gates enforced in the build ([testing-strategy](../engineering/testing-strategy.md) §3)
- Red's review of **HSK 1 at 100 %** ([DEC-025](decision-log.md))

**Gate**
1. `npm run build:data` succeeds from a clean checkout with no network access.
2. Building twice produces identical output.
3. Every gate in [testing-strategy](../engineering/testing-strategy.md) §3 passes,
   across the full compiled corpus regardless of review status — a `flagged`
   card blocks the build at any level, reviewed or not.
4. Zero unmatched HSK words that are not explicitly waived.
5. Red has signed off **HSK 1** with an LR record; zero cards `flagged` anywhere
   in the compiled corpus.
6. Per-level counts are within tolerance of [domain-model](../engineering/domain-model.md) §9.

## M2 — Core card experience

The interaction CLAUDE.md §02 describes, working. Developed and gated against
**HSK 1 only** ([DEC-025](decision-log.md)) — the one level reviewed at this
point. Other levels' compiled-but-unreviewed decks exist but are not the
target of this milestone's UI or content correctness work.

**Deliverables**
- App shell, design tokens, CJK font stack verified on all target platforms
- Card component: front, back, flip (FR-1 to FR-5)
- Navigation, progress, end state (FR-30 to FR-35). Ordering is provisional until
  the scheduler lands at M5; M2 traverses a level in list order behind the same
  session interface, so M5 replaces the queue source and nothing else
- Pinyin toggles, independent per side, persisted (FR-10 to FR-15)
- Settings screen and storage layer with schema versioning (FR-50 to FR-53)
- Responsive layout across all three breakpoints ([UX spec](../product/ux-specification.md) §5)
- E2E-1 to E2E-6, E2E-10 to E2E-13 passing

**Gate**
1. A full HSK 1 pass is completable on a 360 px viewport and on desktop.
2. All four Pinyin combinations render correctly on both faces.
3. Settings survive a reload.
4. Keyboard-only completion of a session (NFR-7).
5. axe reports no violations on any screen.
6. Font rendering verified against the Chinese/Japanese glyph-divergence set
   ([testing-strategy](../engineering/testing-strategy.md) §6).
7. Two distinct visual directions produced by White, one selected, the other kept
   as a token set so it stays swappable ([DEC-018](decision-log.md)).

## M3 — Level selection

**Execution order note ([DEC-031](decision-log.md), 2026-08-25):** M4 (Audio)
is built before M3 — the owner asked for computer voice to be prioritised.
M3's deliverables and gate below are unchanged; only the order it's tackled
in relative to M4 has moved. M3 remains blocked on Red's HSK 2–3 review
([DEC-025](decision-log.md)) regardless of when the UI/loading work happens.

All six levels reachable, per CLAUDE.md §02. Per [DEC-025](decision-log.md), a
level is exposed in Level Select only once it has cleared its review bar —
this milestone is where HSK 2–6 catch up on content review, not just where the
UI to select them gets built.

**Deliverables**
- Red's review of **HSK 2 and HSK 3 at 100 %**, resequenced here from M1
  ([DEC-025](decision-log.md)) — a work order in its own right, run ahead of
  or alongside the UI work below
- Level Select screen with counts, extended for multi-select
  ([UX spec](../product/ux-specification.md) §4.1) — the "A/B grouping"
  wording this bullet previously carried was stale: [DEC-015](decision-log.md)
  removed the A/B split before this document was last touched, and §4.1
  itself has never described level grouping
- Per-level deck loading, cached for the lifetime of the page session (not
  the persistent, offline-capable service-worker cache — that's M6's
  `vite-plugin-pwa`/Workbox mechanism, [architecture](../engineering/architecture.md) §4)
- Multi-level sessions (FR-23)
- Last-level memory (FR-25)
- Loading, empty, and error states ([UX spec](../product/ux-specification.md) §6)

**Gate**
1. HSK 1, 2, and 3 load and are studiable, each backed by a completed LR
   record. HSK 4–6 load and are mechanically studiable (deck payload, UI) but
   are not yet content-reviewed — see M7 for their sampled review, unchanged
   from the original plan ([testing-strategy](../engineering/testing-strategy.md) §5).
2. Deck payloads within NFR-4.
3. A deck-load failure degrades gracefully with a route back.
4. G1 met: cold load to first card in under three interactions.

## M4 — Audio

**Next, pulled forward ahead of M3** ([DEC-031](decision-log.md),
2026-08-25) — the owner asked for computer voice to be prioritised.

CLAUDE.md §02: *"support computer voice."*

**Deliverables**
- Speech service handling every constraint in [architecture](../engineering/architecture.md) §5
- Audio control on both faces (FR-40, FR-44)
- Voice detection with graceful disablement (FR-43)
- Rate control (FR-45); optional autoplay, default off (FR-46)
- E2E-7 and E2E-8 passing

**Gate**
1. Speech works on iOS Safari, Android Chrome, and desktop Chrome.
2. On a device with no Mandarin voice, the control is disabled and explained —
   never silently inert.
3. Red confirms the correct headword text and `zh-CN` language are
   dispatched per card on a sample, including at least one homograph pair —
   each card independently producing a correctly-formed utterance of its
   own headword. Amended from the original wording, which required the two
   homograph cards to be audibly distinguishable; that is not achievable
   under the Hanzi-only speech constraint ([DEC-032](decision-log.md)) and
   is withdrawn as a gate criterion, not silently dropped.
4. Rapid card advancing does not queue or overlap utterances.

## M5 — Spaced repetition

CLAUDE.md §02: *"The app must use spaced repetition."* Placed after the core card
experience because the scheduler needs a working grading interaction to drive it,
and before offline/polish because it changes the session model that polish assumes.

**Deliverables**
- Scheduler integration per [scheduling](../engineering/scheduling.md), library
  pinned and its licence confirmed GPL-3.0 compatible
- `CardProgress` and append-only review log in IndexedDB, with schema versioning
- Grading interaction on the back face, with resulting intervals shown (FR-61)
- Session composition: due, then learning, then new to the daily limit (FR-38, FR-63, FR-65)
- Due counts on Level Select (FR-64); progress view (FR-70)
- Free review, not affecting scheduling (FR-66)
- Nothing-due end state (FR-67)
- Export and import of full learner state (FR-69)
- Reset progress with confirmation (FR-68)
- `navigator.storage.persist()` requested (NFR-16)
- Scheduler test suite per [testing-strategy](../engineering/testing-strategy.md) §8

**Gate**
1. All scheduler invariants and the year-long simulation pass.
2. Progress survives a browser restart, and a schema migration from version 1.
3. Export → wipe → import restores identical state, review log included.
4. Grading a card `Again` reliably brings it back sooner than `Good`, demonstrably.
5. Session assembly stays within NFR-17 at full corpus scale.
6. A mis-grade is hard to make on a phone: grade targets pass the NFR-6 check with
   margin, and their separation is deliberate.
7. Nothing-due is presented as completion, not as an empty state.

## M6 — Offline, performance, and polish

**Deliverables**
- Service worker: app shell precached, decks cached at runtime (FR-51)
- Offline grading: reviews recorded and scheduled with no network, since the
  scheduler is entirely local
- Installable PWA: manifest, icons, splash
- Font subsetting wired into the data build
- Lighthouse budgets enforced in CI (NFR-1 to NFR-4)
- Full accessibility pass (NFR-6 to NFR-10)
- About screen with CC-CEDICT attribution and licence (NFR-11)
- Theme support (FR-54)
- E2E-9 passing

**Gate**
1. Offline session works end to end after first load.
2. All NFR-1 to NFR-4 budgets met on a throttled mid-range mobile profile.
3. Attribution present in-app and in the repository; `data/LICENSE` correct.
4. Manual device matrix complete ([testing-strategy](../engineering/testing-strategy.md) §6).

## M7 — Release candidate

**Deliverables**
- Red's sampled review of HSK 4–6 complete per
  [testing-strategy](../engineering/testing-strategy.md) §5
- Requirements traceability audit: every FR/NFR covered, deferred, or withdrawn
- Deployed to Cloudflare Pages ([DEC-019](decision-log.md))
- README with attribution, licence, and build instructions
- All documents moved from `Draft` to `Current`

**Gate**
1. Every `MUST` requirement met or explicitly waived by the owner.
2. Zero known content errors at any level.
3. Documentation matches the built application.

---

## M8 — Hanzi practice: character lookup, stroke order, and handwriting

**Execution order note ([DEC-035](decision-log.md), 2026-08-25):** built
before M5 (Spaced repetition) — the owner asked for this capability next.
M5/M6/M7's own content, gates, and numbers are unchanged; only the
execution order relative to this new milestone moves, mirroring
[DEC-031](decision-log.md)'s M4-before-M3 precedent.

A per-character reference and practice tool, independent of the HSK word
decks and reachable without starting a study session (FR-80 to FR-86).

**Deliverables**
- Stroke-order data pinned and documented per [DEC-035](decision-log.md) —
  only the characters actually used across the compiled HSK 1–6 decks are
  extracted and shipped, not the full upstream set
- A Hanzi section: searchable/browsable character lookup, reachable from
  the app's main navigation
- Per-character page: stroke order animation, all readings with English
  meanings, on-request
- Guided drawing practice with stroke-level feedback, working with mouse,
  touch, and stylus (Apple Pencil) input
- A separate free-drawing practice grid (田字格-style guide lines),
  independent of any specific character
- Loading, empty, and error states consistent with the rest of the app
  ([UX spec](../product/ux-specification.md) §6)

**Gate**
1. Any character used in the HSK 1–6 vocabulary can be looked up, with
   correct stroke order, Pinyin, and English shown.
2. Stroke order animation and guided drawing practice both verified
   working on a real touch device with stylus input, not assumed from
   desktop mouse testing.
3. The free-drawing practice grid works independently of the guided
   per-character practice — no character needs to be selected first.
4. Mobile parity (NFR-5): fully usable on a 360px viewport.
5. Shipped stroke-data payload stays reasonable per-character (lazy
   fetched on demand, not bundled for every character up front) —
   verified, not assumed.

---

## Post-v1 candidates

Not commitments. Recorded so they are not silently forgotten, and so the seams
that make them cheap are not designed away.

| Candidate | Notes |
| --- | --- |
| Cross-device sync | Deferred by CLAUDE.md §03, and now the clearest post-v1 priority: with spaced repetition in v1, progress is valuable and lives on one device. Export/import (FR-69) mitigates but does not solve this. First feature requiring a backend and an account |
| FSRS parameter optimisation | Re-fit the scheduler to the individual learner from their own review log, which v1 already retains for this purpose |
| Review heatmap and retention statistics | The review log supports this with no new data collection |
| Traditional-character mode | Cheap — CC-CEDICT already supplies the forms ([OQ-2](open-questions.md)) |
| English → Hanzi direction | Reverses the card; small change, real learning value |
| Additional languages | Anticipated by CLAUDE.md §01; seams in [architecture](../engineering/architecture.md) §7 |
| Tone-colouring | FR-16 |
| Example sentences | Needs a further licensed data source |

---

## 4. Definition of Ready

A work order may be marked `Ready` only when:

1. It cites at least one requirement ID.
2. Its acceptance criteria are numbered and independently checkable.
3. Its specification references resolve to real document sections.
4. Its dependencies are `Done`.
5. Its owning agent is the accountable one per [charter](../team/charter.md) §3.
6. It depends on no unanswered blocking open question.
7. Its out-of-scope section is filled in.

## 5. Definition of Done

A work order may be marked `Done` only when:

1. Every acceptance criterion is met and independently verified by Claude Code.
2. Tests exist per [testing-strategy](../engineering/testing-strategy.md) §8.
3. CI is green, including the data build.
4. Anything touching Chinese content carries an LR record from Red.
5. Anything touching the UI carries White's confirmation against the UX spec and
   the accessibility NFRs.
6. Affected documentation is updated in the same change.
7. A Work Report is committed.
8. The board is updated.
