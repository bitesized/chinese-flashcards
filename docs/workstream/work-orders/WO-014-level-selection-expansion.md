---
id: WO-014
title: M3 — Level Select expansion, multi-level sessions, last-level memory
owner: White
status: Ready
priority: SHOULD
milestone: M3
requirements: [FR-23, FR-24, FR-25, FR-35]
depends_on: [WO-011]
spec_refs:
  - product/requirements.md#c-vocabulary-and-levels
  - product/ux-specification.md#41-level-select--entry-screen
  - product/ux-specification.md#6-empty-loading-and-error-states
  - engineering/architecture.md#4-storage-model
  - engineering/domain-model.md#8-runtime-only-types
  - project/decision-log.md#dec-025--ship-hsk-1-first-build-the-app-against-it-add-remaining-levels-incrementally
  - project/roadmap.md#m3--level-selection
touches:
  - src/features/levels/LevelSelect.tsx, LevelSelect.module.css
  - src/features/study/StudySession.tsx, StudySession.module.css
  - src/app/App.tsx
  - src/services/decks.ts
  - src/domain/runtime.ts (DEFAULT_SETTINGS.lastLevels)
review_required: [White]
---

# WO-014 — M3: Level Select expansion, multi-level sessions, last-level memory

## Context

This is M3's UI half — the linguistic half (Red's 100% review of HSK 2–3)
is [WO-013](WO-013-hsk2-3-linguistic-review.md), running independently;
neither blocks the other starting, but M3's gate needs both. This work
order is scoped to what's achievable **without** the scheduler (M5) or the
service worker (M6), same discipline WO-011 applied to M2:

- No due counts, no "Review N cards" primary action — [UX spec](../../product/ux-specification.md)
  §4.1 describes those (FR-24/FR-64), but they need the scheduler to know
  what's due, which doesn't exist until M5. Sessions built here remain
  free-review-shaped, same as M2, just spanning more than one level.
- No persistent, offline-capable deck cache — that's `vite-plugin-pwa`/Workbox
  territory (M6, [architecture](../../engineering/architecture.md) §4). What
  this work order builds is a page-session-lifetime cache only (an in-memory
  map that avoids re-fetching a deck already loaded this visit) — real, but
  much smaller in scope than M6's.
- `roadmap.md`'s M3 deliverable list previously said "Level Select screen
  with counts and A/B grouping" — stale wording from before
  [DEC-015](../../project/decision-log.md) removed the A/B split; UX spec
  §4.1 has never described level grouping. Corrected in the same change as
  this work order (CLAUDE.md §07's own rule: a decision and the document
  describing it are corrected together).

`src/domain/runtime.ts`'s `Settings.lastLevels: HskLevel[]` and
`Session.deckIds: HskLevel[]` (domain-model.md §8) were already written
array-shaped in WO-011 specifically so this work order wouldn't need a
type change — use them as they are.

## Task

### 1. Level Select — multi-select

`src/features/levels/LevelSelect.tsx`, extending WO-011's version:

- Tapping an available level **toggles its selection** rather than
  immediately starting a session (FR-23) — visually distinguish
  selected/unselected (a pattern already established for segmented
  controls in `SettingsScreen.tsx`; reuse that visual language rather than
  inventing a new one).
- A primary action ("Start Studying" or similar copy — your call) starts a
  session with every currently-selected, available level. Disabled when
  nothing is selected.
- Pre-select whatever `settings.lastLevels` contains on mount, filtered to
  only currently-available levels (a remembered level that's since become
  unavailable — shouldn't happen given levels only ever gain review status,
  never lose it, but defend against it anyway rather than assuming).
  `DEFAULT_SETTINGS.lastLevels` changes from `[]` to `['1']` — HSK 1 is the
  only reviewed level at first launch, so a first-time visitor gets a
  sensible zero-config pre-selection rather than an empty one requiring an
  extra tap.
- Starting a session persists the exact selection to `settings.lastLevels`
  (via the existing `onChange`/storage round-trip).
- Unavailable levels remain exactly as WO-011 left them: visibly
  not-yet-available, not selectable, not silently clickable.

### 2. Deck loading — page-session cache

`src/services/decks.ts`: cache each level's fetched `Deck` in a module-level
map, keyed by level, for the lifetime of the page (cleared on a hard
reload, which is fine — this is not the persistent cache). A second
`loadDeck('1')` call within the same visit returns the cached value instead
of re-fetching. Keep the function's signature and behaviour otherwise
identical (still `Promise<Deck>`, still throws on a failed fetch) so
existing callers don't need to change how they call it.

### 3. Multi-level study session

`src/features/study/StudySession.tsx`, extending WO-011's version to accept
multiple levels:

- Fetch every selected level's deck (in parallel), merge their cards into
  one queue. A card appearing in more than one selected level's file
  (`card.levels.length > 1`) must not appear twice in the combined
  session — de-duplicate by card id, same principle `build-data.ts` already
  applies when merging per-level arrays into a unique set.
- Shuffled/sequential ordering (existing `cardOrder` setting) applies to
  the combined set, not per-level — a shuffled multi-level session
  interleaves levels, it doesn't study them one after another.
- Loading/error/end-state copy needs to read sensibly for more than one
  level (e.g. "Loading HSK 1, 2, 3…", "HSK 1, 2, 3 complete") — a small
  formatting helper, not a redesign of these states.
- A failure loading **any** selected level's deck shows the existing error
  state with retry (FR-35's "does not silently loop" spirit extends
  naturally here: a partial multi-level session that silently drops a
  failed level would be a worse failure mode than showing the error
  plainly).

### 4. Wiring

`src/app/App.tsx`: the view-state transition from Level Select to Study
now carries an array of levels, not one. Keep the existing
level-select/study/settings view-state shape — this is a payload change,
not a new view state.

## Acceptance criteria

1. Selecting two or more available levels and starting a session studies
   the combined, de-duplicated card set from all of them.
2. A card present in more than one selected level appears exactly once in
   the combined session, not once per level.
3. Shuffled order interleaves cards across levels; sequential order is
   stable and repeatable.
4. Last-level memory: the exact level selection used to start a session is
   remembered and pre-selected next visit (verified across a reload, not
   just in-memory).
5. A first-time visitor (no stored settings) sees HSK 1 pre-selected, not
   an empty selection requiring an extra tap.
6. Re-loading a level already fetched this page session does not issue a
   second network request (verified by observing fetch calls, not assumed).
7. A deck-load failure for any selected level shows the existing error
   state with a working retry, not a partial or silently-degraded session.
8. Cold load to first card is achievable in three interactions or fewer
   with a remembered selection (G1) — verified by counting the actual taps
   in a real-browser walkthrough, not asserted from the design alone.
9. HSK 2 and HSK 3 become selectable in Level Select once WO-013's review
   lands and the corpus is rebuilt with zero `unreviewed` cards at those
   levels (this work order's UI change plus WO-013's content change
   together satisfy roadmap M3 gate #1 — verify the actual combination
   once both are done, don't assume it from either alone).
10. `npm run typecheck`, `npm run lint`, and `npm test` all remain green;
    new/changed behaviour has unit/component test coverage (multi-level
    merge and de-duplication, last-level memory persistence, the
    page-session deck cache).
11. Verified in a real browser per this project's standing practice,
    including a multi-level session end to end and the G1 tap-count check.

## Out of scope

- Due counts, "Review N cards" primary action, anything scheduler-shaped
  (FR-24's due-count half, FR-64, M5).
- Persistent/offline deck caching via service worker (M6).
- HSK 4–6 becoming selectable — they remain compiled-but-unreviewed until
  M7's sampled review, regardless of this work order (DEC-025).
- Any change to `pipeline/*.ts` or deck content — this work order only
  reads compiled deck data (aside from the standalone DEC-033 pipeline fix
  already landed separately, unrelated to this work order's scope).
- A "review everything up to level N" cumulative option (FR-26, MAY
  priority, not requested).

## Notes

- Per the owner's 2026-08-25 process change, this work order is executed
  directly by Claude Code rather than dispatched to a White session —
  recorded under `owner: White` since White remains the accountable owner
  of this area per charter.md §3.
- Verify in a real browser before marking any UI acceptance criterion met.
