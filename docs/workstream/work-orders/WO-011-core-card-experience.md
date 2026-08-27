---
id: WO-011
title: M2 — app shell, design tokens, card component, session flow, settings
owner: White
status: Ready
priority: MUST
milestone: M2
requirements: [FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-30, FR-31, FR-32, FR-33, FR-34, FR-35, FR-50, FR-51, FR-52, FR-53, NFR-2, NFR-5, NFR-6, NFR-7, NFR-8, NFR-9, NFR-10, NFR-12]
depends_on: []
spec_refs:
  - product/ux-specification.md#1-design-principles
  - product/ux-specification.md#2-visual-direction
  - product/ux-specification.md#3-typography
  - product/ux-specification.md#42-study--the-card
  - product/ux-specification.md#43-session-end
  - product/ux-specification.md#44-settings
  - product/ux-specification.md#5-responsive-behaviour
  - product/ux-specification.md#6-empty-loading-and-error-states
  - product/ux-specification.md#7-content-rendering-rules
  - engineering/architecture.md#3-recommended-stack
  - engineering/architecture.md#4-storage-model
  - engineering/domain-model.md#8-runtime-only-types
  - project/decision-log.md#dec-007--pinyin-defaults-to-visible-on-both-faces
  - project/decision-log.md#dec-008--css-modules-with-design-tokens-no-utility-framework-no-component-library
  - project/decision-log.md#dec-018--visual-direction-is-chosen-by-claude-code-from-whites-options-and-stays-swappable
  - project/roadmap.md#m2--core-card-experience
touches:
  - index.html, vite.config.ts (entry point, PWA plugin NOT added yet — M4+)
  - src/app/, src/features/study/, src/features/levels/, src/features/settings/, src/services/, src/styles/
  - public/decks/hsk-1.json (read, not written)
review_required: [White, Red (Chinese typography)]
---

# WO-011 — M2: app shell, design tokens, card component, session flow, settings

## Context

M1 closed with a fully reviewed HSK-1 deck (154 cards, zero unreviewed,
zero flagged) and five other levels compiled but not yet exposed to a
learner ([DEC-025](../../project/decision-log.md)). M2 is the interaction
CLAUDE.md §02 describes, actually working, built and gated against **HSK 1
only** — the one level currently trustworthy. This is the first work order
to write any `src/` code; the directory tree exists (WO-001) but is empty.

Per [roadmap](../../project/roadmap.md) M2, ordering is provisional: the
scheduler (FSRS) doesn't exist until M5, so this work order builds
navigation as free-review-style previous/next (per
[UX spec](../../product/ux-specification.md) §4.2's free-review mode — plain
navigation, no grading), traversing HSK-1 in list order. M5 replaces the
queue source with the scheduler and adds the actual grading controls;
nothing else about the session interface should need to change when it
does. **Do not build grading controls, intervals, or anything scheduler-shaped
in this work order** — FR-61 and the scheduler-dependent settings
(new-cards-per-day, day-start-hour, export/import) are explicitly M5.

## Task

### 1. App shell and design tokens

Per [DEC-008](../../project/decision-log.md): CSS Modules plus custom-property
design tokens, no utility framework, no component library. Set up
`index.html`, a React entry point (`src/app/`), and `src/styles/tokens.css`.

Per [DEC-018](../../project/decision-log.md), produce **two genuinely distinct
visual directions** — different type, palette, and card treatment, not one
design in two colourways — as two token sets. Both must honour
[UX spec](../../product/ux-specification.md) §1's principles (character is
the interface; reveal-then-grade; legibility over decoration; phone-first;
silence by default) and §2's explicit avoid-list (no violet/indigo
gradients, no glassmorphism, no uniform large radii, no default drop
shadows, no emoji-as-icons, no everything-centred sameness, no
neon-on-black). Claude Code selects one as active; the other is committed
as a complete, swappable token set (a second `.css` file or a data
attribute toggle — your call on mechanism), not deleted.

CJK font stack exactly as specified
([UX spec](../../product/ux-specification.md) §3): `PingFang SC`,
`Hiragino Sans GB`, `Noto Sans SC`, `Source Han Sans SC`, `Microsoft YaHei`,
generic fallback — no web font subsetting yet (that's the data pipeline's
job at M6). Hanzi elements get `lang="zh-Hans"`; Pinyin elements get
`lang="zh-Latn-pinyin"` (NFR-8).

### 2. Card component

`src/features/study/` — the front and back faces
([UX spec](../../product/ux-specification.md) §4.2):

- **Front**: Hanzi headword dominant (minimum 72px on mobile — a hard
  floor, not a preference), Pinyin if front-Pinyin is on, progress
  indicator, reveal affordance.
- **Back**: Hanzi still visible, Pinyin if back-Pinyin is on, English
  senses enumerated (first four shown, "more" control beyond six per §7.2),
  classifier shown separately where present (FR-6), free-review-style
  previous/next navigation (no grading controls — see Context).
- **Flip**: tap/click anywhere on the card, `Space`/`Enter` on keyboard. 3D
  Y-axis flip, 180–250ms ease-out; under `prefers-reduced-motion`, an
  instant swap with opacity cross-fade (NFR-10). Content must be in the DOM
  before the animation completes — never delay text. The card is a
  `button`-role control with an accurate accessible name; flipping updates
  a polite live region announcing the revealed side.
- Content rendering rules (§7): no dictionary syntax parsing in the UI —
  the pipeline already stripped `CL:`/`[`/`]`/`|` — display senses/classifiers
  as supplied.

### 3. Session flow

`src/features/study/` and `src/features/levels/`:

- A minimal Level Select screen (FR-21) showing all six levels with their
  compiled card counts, but only HSK 1 is selectable/studyable — HSK 2–6
  show a plain "not yet available" state per
  [DEC-025](../../project/decision-log.md), not a broken or misleading
  active control.
- Traverse HSK-1's 154 cards in list order behind a session interface
  shaped so M5 can later swap in the scheduler's queue without changing
  anything else (`src/domain`'s `Session` runtime type,
  [domain-model](../../engineering/domain-model.md) §8, is the contract —
  use it, don't invent a parallel shape).
- Advance/return (FR-30, FR-31), progress shown as position within the
  deck (FR-34), end-of-deck state offering restart/reshuffle/level-change,
  never looping silently (FR-35). Shuffled/sequential order is a setting
  (FR-33).
- Loading/empty/error states per
  [UX spec](../../product/ux-specification.md) §6: skeleton while the deck
  fetches (no spinner-on-blank-page), plain message + retry + route back on
  a failed fetch.

### 4. Pinyin toggles and settings + storage

- Front-Pinyin and back-Pinyin are independent (FR-11), default **on**
  ([DEC-007](../../project/decision-log.md)), toggleable from within Study
  without navigating away (FR-14) and without flipping the card or
  advancing the deck when toggled (FR-15). Keyboard `F`/`B` per the
  interaction table.
- A Settings screen (FR-52: one interaction from Study) with, for this work
  order's scope only: front/back Pinyin toggles, card order
  (shuffled/sequential), theme (system/light/dark, FR-54 — wire the
  control now even though full theme token support can follow), and
  reset-to-defaults (FR-53). **Do not build**: new-cards-per-day,
  day-start-hour, export/import, speech rate, autoplay-on-reveal — all
  scheduler- or audio-dependent, out of scope until M4/M5.
- `src/services/` storage module: a single module every settings read/write
  goes through (nothing in the UI touches `localStorage` directly —
  [architecture](../../engineering/architecture.md) §4), with a
  `schemaVersion` field on the persisted `Settings` object from day one
  (domain-model.md §8's `Settings` shape is normative — implement it as
  specified, minus the fields explicitly out of scope above, which can be
  added when their owning milestone needs them rather than stubbed now).
  Settings persist across a reload (FR-50, testable right away).

### 5. Responsive layout and accessibility

Three breakpoints exactly as specified
([UX spec](../../product/ux-specification.md) §5): < 480px, 480–1024px,
> 1024px. Mobile carries no reduced feature set (NFR-5) — a control that
doesn't fit is relocated, not removed. `100dvh`, `env(safe-area-inset-*)`,
no double-tap-zoom delay on the flip target. Keyboard-operable end to end
with visible focus indicators (NFR-7); interactive targets meet the 44×44
CSS px minimum (NFR-6); colour contrast meets WCAG 2.2 AA (NFR-9).

## Acceptance criteria

1. Two genuinely distinct visual directions exist as complete, swappable
   token sets (different type, palette, card treatment) — not one design in
   two colourways.
2. `npm run dev` serves a working app; a full HSK-1 pass (all 154 cards) is
   completable end to end on both a 360px viewport and desktop.
3. All four Pinyin toggle combinations (front/back, on/off independently)
   render correctly on both card faces.
4. Toggling front Pinyin while the card is face-up does not flip the card
   or advance the deck.
5. Settings (Pinyin toggles, card order, theme) survive a page reload.
6. A full session is completable using only the keyboard (Tab, Enter/Space,
   arrow keys per the interaction table).
7. The Hanzi CJK font stack resolves to a Simplified Chinese face and never
   falls back to a Japanese one — verified against at least the
   glyph-divergence set named in
   [testing-strategy](../../engineering/testing-strategy.md) §6 (直, 骨, 今,
   令, 起) on at least one real browser, not assumed from the CSS alone.
8. Flip animation is 180–250ms, ease-out, and reduces to an instant
   swap+cross-fade under `prefers-reduced-motion`; content is in the DOM
   before the animation completes (checkable by disabling CSS and
   confirming text is present).
9. The card is a `button`-role element with an accurate accessible name;
   flipping announces the revealed content via a polite live region.
10. Reaching the end of the HSK-1 deck shows an explicit end state
    (restart / reshuffle / change level) — it does not loop silently.
11. HSK 2–6 appear in Level Select with their real compiled counts but are
    visibly not-yet-available, not broken or silently clickable into empty
    content.
12. No sense list is truncated below what §7.2 specifies (first four shown,
    "more" control beyond six) — verify against at least one real HSK-1
    card with multiple senses.
13. `npm run typecheck`, `npm run lint`, and `npm test` all remain green
    with this work included; new components have unit/component tests
    (Vitest + Testing Library) covering flip, both Pinyin toggle axes, and
    keyboard operability.
14. Verified running in an actual browser (not just tests) per this
    project's own standing practice for UI work — screenshot or described
    manual check recorded in the work report.

## Out of scope

- Grading controls, intervals, anything scheduler-shaped (FR-61, M5).
- Audio (FR-40 to FR-46, M4).
- Multi-level sessions, due counts, last-level memory (FR-23 to FR-25, M3 —
  Level Select here shows all six levels' counts but only HSK-1 is
  selectable, per DEC-025).
- Export/import, reset progress, new-cards-per-day, day-start-hour (all
  M5/scheduler-dependent).
- Service worker / offline caching, PWA manifest (M6).
- Font subsetting (M6 — the data pipeline's job, not this work order's).
- Any change to `pipeline/*.ts`, `src/domain/card.ts`, or `public/decks/*.json`
  — this work order only reads compiled deck data.

## Notes

- `src/domain/card.ts` already defines `Card`/`Deck`/`DeckMeta` — import,
  don't redefine. `Session`/`Settings` runtime types from
  domain-model.md §8 don't exist in code yet; add them to `src/domain/`
  alongside `Card` (same file or a sibling — your call), since both
  pipeline and runtime may eventually reference `HskLevel`/`ReviewStatus`
  from the same place.
- Per the owner's 2026-08-25 process change, this work order is executed
  directly by Claude Code rather than dispatched to a White session —
  recorded under `owner: White` since White remains the accountable owner
  of this area per charter.md §3.
- Verify in a real browser before marking any UI acceptance criterion met
  — type-checking and passing tests confirm correctness, not that the
  feature actually works for a user.
