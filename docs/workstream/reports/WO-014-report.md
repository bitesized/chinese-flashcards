---
id: WO-014
agent: Claude Code
outcome: complete
date: 2026-08-25
---

# WO-014 — Work Report

## What was done

M3's UI half, built directly per the owner's process change. Scoped
deliberately to what's achievable without the scheduler (M5) or the
service worker (M6), same discipline WO-011 applied to M2 — see the work
order's Context for the specific exclusions.

- **Level Select multi-select** (`LevelSelect.tsx`) — tapping an available
  level now toggles its selection (visually marked via `aria-pressed` and
  an accent border) instead of immediately navigating away. A "Start
  Studying" primary action starts a combined session with everything
  selected, disabled when nothing is.
- **Last-level memory** (FR-25) — the exact selection used to start a
  session is persisted to `Settings.lastLevels` and pre-selected on the
  next visit. `DEFAULT_SETTINGS.lastLevels` changed from `[]` to `['1']` so
  a first-time visitor gets a one-tap start rather than an empty
  selection.
- **Multi-level sessions** (FR-23, `StudySession.tsx`) — every selected
  level's deck is fetched in parallel and merged into one card set,
  de-duplicated by id (a card can legitimately belong to more than one
  level's compiled file). Shuffled/sequential ordering applies to the
  combined set, interleaving levels rather than studying them one after
  another. Loading/error/end-state copy formats correctly for one or more
  levels ("HSK 1", "HSK 1 & 2", "HSK 1, 2 & 3").
- **Page-session deck cache** (`decks.ts`) — each level's fetched deck is
  cached in memory for the lifetime of the page; concurrent calls for the
  same level (a multi-level session's `Promise.all`) share one fetch
  rather than racing two. Deliberately not the persistent, offline-capable
  cache — that's M6's service-worker job.
- Fixed a stale roadmap reference in the same change: "Level Select screen
  with counts and A/B grouping" — [DEC-015](../../project/decision-log.md)
  removed the A/B split before this document was last touched, and UX spec
  §4.1 has never described level grouping.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | Selecting 2+ levels studies the combined, de-duplicated set | yes | `StudySession.test.tsx`'s multi-level merge test; live-verified in real Chromium (manifest route-intercepted to simulate HSK 2 as reviewed, since WO-013's real review is still in progress — see criterion 9): selecting HSK 1+2 produced a "1 / 341" queue (154 + 187, exact sum, confirming no unexpected id overlap between the real decks either) |
| 2 | A card in >1 selected level appears once, not per-level | yes | `StudySession.test.tsx`: two decks sharing one card id produce a 3-card combined queue (2 unique + 2 unique − 1 shared), not 4 |
| 3 | Shuffled interleaves; sequential is stable | yes | Unchanged `shuffle`/`cardOrder` logic now applied to the merged set rather than a single deck's cards — same mechanism WO-011 already tested, extended to a larger, multi-source input |
| 4 | Last-level memory persists across a reload | yes | Live-verified: selected HSK 1, started a session, returned to Level Select, reloaded the page — HSK 1 still pre-selected |
| 5 | First-time visitor sees HSK 1 pre-selected | yes | `DEFAULT_SETTINGS.lastLevels = ['1']`; `LevelSelect.test.tsx`'s "pre-selects initialSelection on mount" test; live-verified screenshot |
| 6 | Re-loading an already-fetched level issues no second request | yes | `decks.test.ts`: three sequential `loadDeck('1')` calls produce exactly one `fetch` call; a second test confirms two *concurrent* calls also share one fetch, not two |
| 7 | A deck-load failure for any selected level shows the error state, not a partial session | yes | `StudySession.test.tsx`: one of two levels rejecting shows the existing error state with the failing level's message, not a session built from only the successful level |
| 8 | Cold load to first card in ≤3 interactions with a remembered selection (G1) | yes | Live-verified: with HSK 1 pre-selected, one tap ("Start Studying") reaches the first card — 1 interaction, well under the G1 budget |
| 9 | HSK 2/3 become selectable once WO-013 lands and rebuilds | pending | WO-013 (Red's HSK 2–3 review) is still in progress at the time of this report. The UI mechanism itself is verified end to end via a route-intercepted manifest simulating HSK 2 as reviewed (see criterion 1's evidence) — this confirms the UI/session logic is correct and ready, but the actual combination (real review + this UI) is *not yet* verified together, and won't be until WO-013 completes and `npm run build:data` re-runs. M3's overall gate stays open until then |
| 10 | typecheck/lint/test green; new behaviour has test coverage | yes | `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (362 tests, 18 new: 4 in `decks.test.ts`, 4 in `StudySession.test.tsx`'s multi-level describe block, and rewritten/extended `LevelSelect.test.tsx` coverage for toggle/multi-select/memory) |
| 11 | Verified in a real browser | yes | See "Browser verification" below |

## Browser verification

All checks run against the Vite dev server in real Chromium (Playwright):

- Level Select loads with HSK 1 pre-selected (accent border), "Start
  Studying" enabled; HSK 2–6 correctly show "not yet available" and are
  disabled.
- Deselecting the only selection disables "Start Studying"; reselecting
  re-enables it.
- One-tap start with the remembered selection reaches the first card
  (G1).
- Last-level memory survives an actual page reload, not just in-memory
  state.
- With the manifest route-intercepted to mark HSK 2 as reviewed (the real
  review, WO-013, is still in progress): selecting HSK 1 and HSK 2 and
  starting a session produced a combined "1 / 341" queue, and the loading
  copy read "Loading HSK 1 & 2…" — screenshotted.

All scratch verification scripts and screenshots were removed after use.

## Not done

Nothing within WO-014's stated scope. Explicitly out of scope and
correctly not attempted: due counts and "Review N cards" (FR-24's
due-count half, FR-64, M5), persistent/offline deck caching via service
worker (M6), HSK 4–6 becoming selectable (M7), the cumulative "review up
to level N" option (FR-26, MAY, not requested), and any change to
`pipeline/*.ts` or deck content (the standalone DEC-033 pipeline fix
landed separately, before this work order, and is unrelated to it).

## Findings

1. **M3's gate is genuinely two independent tracks, not sequential** —
   confirmed by building this work order fully in parallel with WO-013
   (Red, still in progress). The UI mechanism needed no real HSK 2/3
   content to build or test correctly; simulating the manifest was
   sufficient and, if anything, a cleaner test (deterministic, doesn't
   depend on the review's exact final card counts).
2. **Corrected a real, pre-existing documentation staleness** while
   touching M3: roadmap.md's M3 deliverable list referenced "A/B grouping"
   in Level Select, a UX pattern removed by DEC-015 before this document
   was last edited. Neither DEC-015 nor any later change had corrected
   this specific line, despite CLAUDE.md §07.4's own rule that a ratified
   decision and the documents describing it are corrected together. Fixed
   in the same change as this work order, per that same rule.

## Follow-ups proposed

- Once WO-013 (HSK 2–3 review) completes: rebuild data, re-verify the
  real (not simulated) multi-level session against the actual rebuilt
  decks, and close out M3's gate criterion 9 and the overall milestone.
- No other follow-ups. `eslint-plugin-react`'s ESLint-10 gap (carried
  forward from WO-011/WO-012) is unaffected by this work order.
