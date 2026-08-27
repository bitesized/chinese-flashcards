---
id: WO-001
title: Scaffold the repository
owner: Black
status: Ready
priority: MUST
milestone: M1
requirements: [NFR-3]
depends_on: []
spec_refs:
  - engineering/conventions.md#1-proposed-repository-layout
  - engineering/conventions.md#2-language-and-style
  - engineering/conventions.md#4-dependencies
  - engineering/conventions.md#5-git
  - engineering/architecture.md#3-recommended-stack
  - project/decision-log.md#dec-016--gpl-30-for-application-code-cc-by-sa-40-for-dictionary-data
touches:
  - / (repository root: package.json, tsconfig, build config, LICENSE, .gitignore, README.md stub)
  - src/, pipeline/, data/, public/, tests/ (directory scaffolding only — no feature code)
  - .github/ (or equivalent CI config)
review_required: [Black]
---

# WO-001 — Scaffold the repository

## Context

The repository currently holds only documentation (`docs/`), `CLAUDE.md`, and the
agent definitions in `.claude/agents/`. It is not yet a git repository and has no
application code, build tooling, or CI. Everything else in M1 and beyond writes
into a tree that does not exist yet. This work order creates it, ratified stack per
[architecture](../../engineering/architecture.md) §3 and layout per
[conventions](../../engineering/conventions.md) §1.

**This is also the first work order in the project's history**, so it includes
initialising git itself, which no later work order will need to do.

## Task

**1. Initialise git.** `git init`, default branch `main`. Commit the existing
`docs/`, `CLAUDE.md`, and `.claude/` tree as-is, as the first commit — this
captures M0's output before any code lands. Only after that commit exists, branch
per [conventions](../../engineering/conventions.md) §5 (`wo-001-scaffold-repository`)
for the rest of this work order's changes.

**2. Create the directory tree** exactly as specified in
[conventions](../../engineering/conventions.md) §1: `src/app/`,
`src/features/{study,levels,scheduler,progress,settings}/`, `src/domain/`,
`src/services/`, `src/styles/`, `pipeline/`, `data/{source,overrides,build,test-fixtures}/`,
`public/{decks,fonts}/`, `tests/{e2e,fixtures}/`. Empty directories that git will
not track need a `.gitkeep` or a placeholder README.

**3. Initialise the toolchain** per the ratified stack
([architecture](../../engineering/architecture.md) §3): `package.json`,
TypeScript in `strict` mode, Vite, React, ESLint + Prettier, Vitest, Testing
Library, Playwright. Do not install `vite-plugin-pwa`, FSRS, or any feature-specific
dependency yet — those belong to the work orders that use them (M4–M6). Every
dependency you do add must be recorded with its licence per
[conventions](../../engineering/conventions.md) §4, and must be GPL-3.0 compatible
([DEC-016](../../project/decision-log.md)).

**4. Wire an automated licence-compatibility check into CI** for every runtime and
build dependency, per conventions §4. It must fail the build on an incompatible
licence, not merely warn.

**5. Apply the GPL-3.0 header via a lint rule**, not by hand, to every source file
under `src/`, `pipeline/`, and `tests/` (conventions §4). Files under `data/` and
`public/decks/` are excluded — they carry a different licence (WO-002).

**6. Write the root `LICENSE`** stating GPL-3.0 for application source, naming the
paths it covers, and pointing to `data/LICENSE` for the CC BY-SA 4.0 dictionary
data ([DEC-016](../../project/decision-log.md)). `data/LICENSE` itself is written by
WO-002; if WO-002 has not landed yet when you commit, still write the pointer text
correctly — it does not require the target file to exist first.

**7. Stand up CI** running, at minimum, install → typecheck → lint → unit test
(placeholder, since no code exists yet) → licence check. Do not attempt to wire the
data build, E2E, axe, or Lighthouse stages yet ([testing-strategy](../../engineering/testing-strategy.md)
§7 describes the full pipeline; those stages land with the work that makes them
meaningful) — but leave clearly-named empty slots or a comment so the next work
order that adds them knows where.

**8. Write a minimal root `README.md`** stub: project name, one-line description,
"under construction." The full README with attribution and build instructions is
an M7 deliverable (roadmap §M7) — do not attempt it here.

**9. `.gitignore`** covering `node_modules/`, build output, and editor/OS cruft
(the repo already has stray `.DS_Store` files — remove them from disk and ignore
the pattern).

## Acceptance criteria

1. `git log` shows an initial commit containing the pre-existing `docs/`,
   `CLAUDE.md`, `.claude/` tree, followed by the scaffolding work on a
   `wo-001-scaffold-repository` branch.
2. Every directory in [conventions](../../engineering/conventions.md) §1 exists.
3. `npm install && npm run typecheck && npm run lint` succeed from a clean
   checkout.
4. A source file with a deliberately missing GPL-3.0 header fails lint; a correct
   header passes.
5. A dependency with a deliberately incompatible licence (e.g. a test entry with
   GPL-incompatible metadata) fails the CI licence check.
6. Root `LICENSE` exists, states GPL-3.0, names the paths it covers, and points to
   `data/LICENSE`.
7. `README.md` exists and is non-empty.
8. `.gitignore` excludes `node_modules/` and stray OS files; no `.DS_Store` is
   tracked.
9. CI runs on a pushed branch and its typecheck/lint/licence-check stages are
   green.

## Out of scope

- Any feature code, component, or pipeline logic.
- `data/LICENSE` content and CC-CEDICT acquisition (WO-002).
- The data build, E2E, accessibility, and performance CI stages (added by the work
  orders that make them meaningful — WO-004 onward, and M2+).
- The full README with attribution (M7).
- Anything under `docs/` other than fixing a broken link created by moving a file
  (do not otherwise edit documentation content — that is Claude Code's and each
  document owner's).

## Notes

- This is the only work order expected to touch git initialisation itself. Every
  later work order assumes `main` and the branch convention already exist.
- Keep the toolchain minimal. Every dependency added here is a dependency every
  later work order inherits; err toward adding things when they are needed by a
  specific later work order rather than speculatively now.
