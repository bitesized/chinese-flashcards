# Repository and Working Conventions

Owner: **Black**. Status: **Draft.**

---

## 1. Proposed repository layout

```
chinese-flashcards/
├── CLAUDE.md                 → canonical source of truth and document index
│                                (DEC-011); not a pointer — the full document
│                                lives here
├── README.md                 → what this is, how to run it, attribution
├── LICENSE                   → GPL-3.0; names the paths it covers, and points
│                                at data/LICENSE for the rest
├── docs/                     → all project documentation, indexed from
│                                CLAUDE.md §06
├── data/
│   ├── source/               → pinned CC-CEDICT and HSK inputs + SOURCE.md
│   ├── overrides/            → human corrections, keyed by card id
│   ├── build/                → build report, review queue (committed)
│   ├── test-fixtures/        → parser fixtures
│   └── LICENSE               → CC BY-SA 4.0, covers derived dictionary data
├── pipeline/                 → build-time data tooling (Black)
├── public/
│   ├── decks/                → compiled hsk-*.json (committed)
│   └── fonts/                → subset CJK font
├── src/
│   ├── app/                  → shell, routing, providers
│   ├── features/
│   │   ├── study/            → card, flip, grading
│   │   ├── levels/           → level select, due counts
│   │   ├── scheduler/        → FSRS integration, session composition
│   │   ├── progress/         → progress view, export/import
│   │   └── settings/
│   ├── domain/               → shared types; imported by pipeline and app
│   ├── services/             → storage, speech, deck loading
│   └── styles/               → design tokens, global CSS
└── tests/
    ├── e2e/
    └── fixtures/
```

`src/domain/` is imported by **both** the pipeline and the runtime. One definition
of `Card`, so the two can never drift.

## 2. Language and style

- TypeScript, `strict: true`. No `any` in committed code; `unknown` plus narrowing
  at boundaries.
- ESLint + Prettier, enforced in CI. Formatting is never a review topic.
- Named exports. Default exports only where a tool demands one.
- Files named for what they export. Components `PascalCase.tsx`, everything else
  `kebab-case.ts`.
- Comments explain *why*. The code already says what.
- No dictionary-derived string is ever rendered as HTML
  ([architecture](architecture.md) §8).

## 3. CSS

- CSS Modules, one file per component.
- Design tokens as custom properties on `:root` in `src/styles/tokens.css`. Colour,
  spacing, type scale, and radii come from tokens; no literal values in component
  CSS without a written reason.
- Light and dark are token sets, not duplicated rulesets (FR-54).
- No utility-class framework and no component library
  ([architecture](architecture.md) §3).
- Animation on `transform` and `opacity` only (NFR-2); every animation honours
  `prefers-reduced-motion` (NFR-10).

## 4. Dependencies

Each new runtime dependency requires, in the work order: what it does, why it
cannot reasonably be written, its size, its maintenance state, and **its licence**.

**Every dependency must be GPL-3.0 compatible** ([DEC-016](../project/decision-log.md)).
MIT, BSD, ISC and Apache-2.0 all are, which covers most of the ecosystem — but the
check happens *before* adoption, not at release, because unwinding an integrated
dependency is expensive ([RISK-12](../project/risk-register.md)). An automated
licence check runs in CI.

Build-time dependencies are held to a lower but non-zero bar. `npm audit` runs in
CI. Lockfile committed.

Every source file carries the GPL-3.0 header the licence expects, applied by a
lint rule rather than by hand.

## 5. Git

- Branch per work order: `wo-<id>-<slug>`, e.g. `wo-014-pinyin-toggle`.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `data:`, `test:`, `chore:`,
  `refactor:`. `data:` is reserved for changes to compiled decks or overrides, so
  content changes are greppable in history.
- A commit changing scheduler behaviour or the stored progress schema says so in
  its subject. Both affect data already on users' devices, and both need a
  migration story before merge.
- Commit body references the work order and the requirement IDs.
- A behaviour change and the documentation change describing it go in the **same
  commit** (CLAUDE.md §06.5).
- No force-push to the default branch. No commits to the default branch that have
  not passed CI.

## 6. Documentation rules

- CLAUDE.md is the source of truth. No other document may contradict it.
- Requirement IDs are permanent; withdraw, never delete or reuse
  ([requirements](../product/requirements.md)).
- Decisions go in [decision-log](../project/decision-log.md) as ADRs. A decision
  that only exists in a chat transcript does not exist.
- Every document has an owner and a status in its header.
- Documents state what is true now. Superseded content is removed and the ADR
  records the change; documents are not written as a changelog of their own past.

## 7. Data changes

Because compiled decks are committed, a content change appears as a diff.
Therefore:

- Never hand-edit a file under `public/decks/` — it is generated and will be
  overwritten. Corrections go in `data/overrides/`.
- A commit touching `data/` or `public/decks/` must reference the Linguistic Review
  record that authorised it.
- Updating the pinned CC-CEDICT release is its own work order, with its own review
  of the resulting diff. A dictionary update can silently change thousands of
  cards, and the diff is the only place that becomes visible.
