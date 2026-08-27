# Testing and Quality Strategy

Owner: **Black** (technical testing), **Red** (linguistic validation),
**White** (visual and interaction review). Status: **Draft.**

This project has **two** classes of silent failure, and both get a first-class gate
rather than a spot check.

**Wrong content.** A learner shown a wrong translation memorises it and will not
find out for months — by definition they cannot yet tell. Gated by §3 and §5.

**Wrong scheduling.** An interval of 40 days where 4 was correct produces no error
and no complaint, just material quietly forgotten. Gated by §8.

Ordinary code bugs, by contrast, announce themselves. They are the easy part.

---

## 1. Layers

| Layer | Tool | Scope |
| --- | --- | --- |
| Unit | Vitest | Pipeline parsing, Pinyin conversion, matching, shuffle, storage, speech-voice selection |
| Schema / invariant | Vitest, run inside the data build | Every invariant in [domain-model](domain-model.md) §3 |
| Component | Vitest + Testing Library | Card faces, toggles, level select, settings |
| End-to-end | Playwright | The journeys in §4, on desktop and emulated mobile |
| Accessibility | axe-core in Playwright, plus manual | NFR-6 to NFR-10 |
| Performance | Lighthouse CI | NFR-1 to NFR-4, run per build with budgets |
| Linguistic | Red, structured review | §5 |
| Scheduling | Vitest, property and simulation tests | §8 |
| Device | Manual matrix | §6 |

## 2. The rule for the pipeline

Pipeline code is tested against **committed fixture files**, never against the live
dictionary download. A test that depends on a remote file is not a test.

Fixtures live in `data/test-fixtures/` and include, at minimum, a line for each
awkward case named in [data-pipeline](data-pipeline.md) §3: a plain entry, a
multi-sense entry, an entry with `CL:` classifiers, an entry with multiple
classifiers, a `u:` entry, an erhua entry, a capitalised proper noun, a
cross-reference-only entry, a homograph pair, a surname entry, and a
non-Han-headword entry that must be rejected.

## 3. Content correctness gates — automated

Run inside `npm run build:data`. Any failure fails the build.

1. **Round-trip Pinyin.** Convert every `readingNumeric` to diacritics and back.
   Mismatch fails. This catches whole classes of vowel and `ü` errors across the
   full corpus rather than in the sample someone happened to look at.
2. **Uniqueness.** No duplicate card `id` anywhere in the corpus.
3. **Non-empty senses.** No card ships with zero glosses.
4. **No leaked dictionary syntax.** No shipped sense contains `CL:`, `[`, `]`, or
   `|`. These indicate a parsing failure; the UI must never see raw CC-CEDICT
   notation ([UX spec](../product/ux-specification.md) §7.1).
5. **Headword sanity.** Every headword contains CJK ideographs and no Latin letters.
6. **Level coverage.** Every word in the source HSK list resolves to a card, or is
   explicitly waived.
7. **Count tolerance.** Per-level card counts sit within tolerance of expected
   ([domain-model](domain-model.md) §9) — catches a truncated source file.
8. **Nothing flagged.** No card with `review: 'flagged'` ships.
9. **Determinism.** Building twice from the same inputs produces identical output,
   excluding `DeckMeta.builtAt` ([domain-model](domain-model.md) §6), which is
   wall-clock time by definition and cannot be byte-identical between two
   separate runs without lying about when the build ran.

## 4. End-to-end journeys

Each maps to requirements and must pass on desktop **and** emulated mobile before a
milestone is signed off.

| # | Journey | Covers |
| --- | --- | --- |
| E2E-1 | Cold load → select HSK 1 → first card visible | G1, FR-21, NFR-1 |
| E2E-2 | Flip to English and back | FR-2, FR-3, FR-4 |
| E2E-3 | All four Pinyin toggle combinations render correctly | FR-10, FR-11 |
| E2E-4 | Pinyin settings survive a reload | FR-13, FR-50 |
| E2E-5 | Advance and retreat through a deck | FR-30, FR-31 |
| E2E-6 | Reach the end of a deck; end state offers restart | FR-35 |
| E2E-7 | Trigger speech; assert a `zh-CN` utterance is dispatched | FR-40, FR-42 |
| E2E-8 | With no Mandarin voice available, control is disabled and explained | FR-43 |
| E2E-9 | Go offline after first load; full session still works | FR-51, NFR-5 |
| E2E-10 | Select multiple levels; combined count is correct | FR-23, FR-24 |
| E2E-11 | Complete a session using only the keyboard | NFR-7 |
| E2E-12 | Swipe navigation on touch; vertical scroll unaffected | UX §4.2 |
| E2E-13 | A homograph pair appears as two cards with different readings | domain-model §4 |
| E2E-14 | Grade a card; it leaves the session and its due date moves | FR-61, FR-62 |
| E2E-15 | Progress survives a reload and a browser restart | FR-60, NFR-15 |
| E2E-16 | Export, clear storage, import; state is identical | FR-69 |
| E2E-17 | With nothing due, the end state says so and offers new cards | FR-67 |
| E2E-18 | The daily new-card limit is respected | FR-65 |
| E2E-19 | Free review does not alter any due date | FR-66 |

Speech is tested by stubbing `window.speechSynthesis` and asserting on the
utterance's `text`, `lang`, and `rate` — the platform voice itself is out of our
control and is covered by the manual matrix instead.

## 5. Linguistic validation — Red's gate

The gate CLAUDE.md's roster exists to provide.

### Scope

Final coverage required at v1 — unchanged by [DEC-025](../project/decision-log.md).
What DEC-025 resequenced is *when* each row's review happens: HSK 1 gates M1,
HSK 2–3 gate M3, HSK 4–6 gate M7 ([roadmap](../project/roadmap.md)) — reviewing
the whole corpus before any UI work starts is no longer required.

| Level | Coverage at v1 |
| --- | --- |
| HSK 1, 2, 3 | **100 % of cards reviewed.** ~600 cards. Beginners are least able to detect an error, so the foundation is verified exhaustively. |
| HSK 4 | 100 % of homograph groups and unmatched/overridden words; 20 % random sample otherwise |
| HSK 5, 6 | 100 % of homograph groups and unmatched/overridden words; 10 % random sample otherwise |

### What Red checks per card

1. The headword is a well-formed Simplified Chinese word, correctly written.
2. The reading is correct for that word **in that sense**, with correct tones —
   including tone-sandhi-independent citation form, which is what a dictionary
   reading should be.
3. The English glosses correspond to the headword, are not misleading out of
   context, and are ordered sensibly for a learner.
4. Where senses were merged, split, or dropped, the result is defensible.
5. The homograph split is right: correct number of readings, correct assignment of
   senses to readings.
6. The word genuinely belongs at that HSK level.
7. Any classifier is correct.

### Output

Every review produces a **Linguistic Review record** in
`docs/workstream/reviews/`, per
[communication-protocol](../team/communication-protocol.md) §5. Corrections become
committed overrides ([data-pipeline](data-pipeline.md) §6) — never ad-hoc edits to
generated files, which would be destroyed by the next build.

### Sampling honestly

Random samples are drawn with a seeded, recorded RNG so a review is reproducible
and cannot be unconsciously biased toward easy cards. The seed goes in the review
record.

## 6. Device matrix

Automation cannot cover font rendering or platform speech. This matrix is checked
manually before release.

| Platform | Checks |
| --- | --- |
| iOS Safari, recent iPhone | Hanzi glyph quality, `zh-CN` voice present, safe-area insets, swipe, `100dvh` behaviour with dynamic browser chrome |
| Android Chrome | Glyph fallback (Noto), voice availability with and without the Google TTS pack installed, swipe |
| macOS Safari + Chrome | Flip performance, keyboard |
| Windows Chrome + Edge | Font stack falls to a Simplified face and **not** a Japanese one; voice availability |
| Firefox, desktop | Speech synthesis frequently absent — confirm FR-43 degradation is graceful |
| A small viewport, 360 × 640 | Every v1 feature reachable (NFR-5) |

Font rendering is verified against a fixed set of characters whose Chinese and
Japanese glyph forms differ visibly — 直 骨 今 令 起 — to prove the CJK stack
resolved to a Simplified Chinese face ([UX spec](../product/ux-specification.md) §3).

## 7. CI

Every change runs: typecheck → lint → unit → component → data build with its
invariant gates → E2E → axe → Lighthouse budgets. A red pipeline blocks merge.

The data build runs in CI even when no data file changed, because a change to
pipeline code can silently alter thousands of cards. Compiled decks are committed,
so CI compares its build output against the committed decks and fails on drift —
this makes every content change appear in a reviewable diff.

## 8. Scheduling gates

Detail in [scheduling](scheduling.md) §7. Summarised here because these are quality
gates, not implementation notes:

1. **Injected clock.** The scheduler never reads the wall clock. Every test
   controls time, so scheduling is deterministic and a bug is reproducible.
2. **Library conformance.** The chosen implementation's published test vectors run
   in our suite. A version bump that changes behaviour fails the build rather than
   silently re-scheduling every card.
3. **Ordering invariants**, property-tested over random review sequences: `Again` ≤
   `Hard` ≤ `Good` ≤ `Easy` in resulting interval, always; intervals positive,
   finite, and bounded; `lapses` increments only on `Again`; no state transition
   yields `NaN`.
4. **Year-long simulation.** Replay synthetic study for several learner profiles
   and assert review volume stays in sane bounds. This is what catches runaway
   backlog from a bad limit interaction — unit tests will not.
5. **Migration.** Progress at schema version *n* loads under *n+1*, tested against
   committed fixtures from every prior version. This is the test that protects real
   users' history across an app update.
6. **Export round-trip.** Export then import reproduces identical state, review log
   included.

## 9. Definition of "tested" for a work order

A work order cannot move to `Done` until:

1. New logic has unit tests, including its failure cases.
2. Any touched E2E journey passes.
3. Anything touching Chinese content has a Red review record attached.
4. Anything touching the UI has White's confirmation against
   [UX spec](../product/ux-specification.md) §2 and the accessibility NFRs.
5. Anything touching scheduling satisfies §8.
6. Requirement IDs in the work order are demonstrably satisfied.
