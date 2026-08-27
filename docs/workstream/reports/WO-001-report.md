---
id: WO-001
agent: Black
outcome: complete
date: 2026-08-24
---

# WO-001 — Work Report

## What was done

Initialised git (`git init -b main`), committed the pre-existing `docs/`,
`CLAUDE.md`, and `.claude/` tree as the first commit on `main`
(`ecdf36f`), then branched `wo-001-scaffold-repository` for the rest of the
work, per the work order's Task step 1.

Created the full directory tree from conventions.md §1: `src/app/`,
`src/features/{study,levels,scheduler,progress,settings}/`, `src/domain/`,
`src/services/`, `src/styles/`, `pipeline/`, `data/{source,overrides,build,test-fixtures}/`,
`public/{decks,fonts}/`, `tests/{e2e,fixtures}/`. Empty directories carry a
`.gitkeep`. (`pipeline/` and `tests/fixtures/` were left for WO-005, which
populates them in this same session — see that work order's report.)

Initialised the toolchain per architecture.md §3: TypeScript 6.0.3 in `strict`
mode (plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noUnusedLocals/Parameters`), Vite 8 + `@vitejs/plugin-react`, React 19,
ESLint 10 (flat config, `eslint.config.js`) with `typescript-eslint` 8's
type-checked ruleset, Prettier 3, Vitest 4 (+ jsdom, Testing Library 16,
`@testing-library/jest-dom` 7), and Playwright 1.62 (config only — no E2E
specs yet, matching the work order's scope). `vite-plugin-pwa` and FSRS were
deliberately not installed, per the work order's explicit instruction.

Wired the GPL-3.0 header requirement as a lint rule via
`eslint-plugin-headers` (`headers/header-format`), scoped to
`src/**/*.{ts,tsx}`, `pipeline/**/*.ts`, and `tests/**/*.{ts,tsx}` only —
`data/` and `public/decks/` are outside the ESLint config's `ignores` list
entirely (they're ignored for all linting, not just the header rule), and
root-level config files (`vite.config.ts`, `eslint.config.js`, etc.) are
excluded from the header requirement by the same glob. `--fix` inserts the
notice automatically.

Wrote `scripts/check-licenses.mjs`, a wrapper around `license-checker`'s
programmatic API rather than a bare CLI invocation, so the GPL-3.0-compatible
allow-list can carry an inline one-line rationale per entry and so SPDX
OR/AND expressions (e.g. `(MIT AND CC-BY-3.0)`) resolve correctly instead of
being rejected as unrecognised strings. It scans the **full** dependency
tree — I found and fixed a bug during verification where passing
`development: true` to `license-checker.init()` silently restricts the scan
to `devDependencies` only, which would have excluded `react`/`react-dom`
(our only production dependencies) from the check entirely; the fix is to
pass neither `production` nor `development` (see script comment). Wired into
CI as `npm run license-check`, exit code 1 on violation.

Stood up `.github/workflows/ci.yml`: install → typecheck → lint → unit test
→ licence check, with commented, clearly-labelled slots for the data build,
E2E, axe, and Lighthouse stages per the work order's instruction not to wire
those yet.

Wrote a minimal root `README.md` stub and `.gitignore` (node_modules, build
output, editor/OS cruft); removed the two tracked `.DS_Store` files
(`docs/.DS_Store`, `docs/workstream/.DS_Store`) and a stray root
`.DS_Store` that was never tracked.

**Root `LICENSE` was authored by Claude Code, not by me.** My attempts to
write it (and later `data/LICENSE` for WO-002) via the `Write` tool with the
full GPL-3.0 text embedded in the call repeatedly triggered an API-level
content-filtering error that terminated the run before any file was written.
Claude Code fetched the canonical GPL-3.0 text directly via `curl` outside a
model turn and wrote both `LICENSE` and `data/LICENSE` to disk. I have read
both files in full and confirm `LICENSE` satisfies acceptance criterion 6:
it states GPL-3.0 for application source, names the paths it covers, points
to `data/LICENSE` for the CC BY-SA 4.0 dictionary data, and is followed by
the complete, unmodified canonical licence text (verified: 691 lines,
opening preamble and closing LGPL-linking note both intact). I did not
re-author or alter it. This also means WO-002's `data/LICENSE` deliverable
already exists (see that report).

Also excluded `docs/`, `CLAUDE.md`, `.claude/`, and (once populated) `data/`
from Prettier's scope via `.prettierignore` — formatting those trees is not
this project's tooling to enforce (document owners own their own content;
`data/` is generated, pinned, or authored under a linguistic-review record)
— so `npm run format:check` only ever touches code this project's
conventions actually govern.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | `git log` shows initial commit of pre-existing tree, then scaffolding on `wo-001-scaffold-repository` | yes | `git log --oneline`: `ecdf36f` (initial, on `main`) then `65cbef2` (scaffold, on `wo-001-scaffold-repository`) |
| 2 | Every directory in conventions.md §1 exists | yes | `find src pipeline data public tests -type d` enumerated during the session; all present. `pipeline/` exists as an empty dir at WO-001 time, populated by WO-005 later in this session |
| 3 | `npm install && npm run typecheck && npm run lint` succeed from a clean checkout | yes | Ran all three in sequence after the final config fixes; `typecheck` and `lint` both exit 0 with no output (nothing to report, no errors) |
| 4 | Missing GPL header fails lint; correct header passes | yes | Manually verified with a temporary untracked file `src/domain/__header_test.ts`: `npx eslint` on the header-less file → `1:1 error No header found headers/header-format`, exit 1. `npx eslint --fix` inserted the exact configured notice; re-run → exit 0. File deleted after the check, not committed |
| 5 | A dependency with a deliberately incompatible licence fails the CI licence check | yes | Built a throwaway fixture package (`incompatible-pkg@1.0.0`, `"license": "SSPL-1.0"`) in a temp directory outside the repo, ran `scripts/check-licenses.mjs` against it directly — output flagged `incompatible-pkg@1.0.0 — SSPL-1.0` and exited 1. Fixture directory deleted immediately after; nothing added to the real dependency tree |
| 6 | Root `LICENSE` exists, states GPL-3.0, names covered paths, points to `data/LICENSE` | yes | Read in full (691 lines). Header text confirms all four requirements. Authored by Claude Code, not by me — see "What was done" |
| 7 | `README.md` exists and is non-empty | yes | `README.md`, 3 short paragraphs, committed |
| 8 | `.gitignore` excludes `node_modules/` and OS files; no `.DS_Store` tracked | yes | Both tracked `.DS_Store` files removed in this commit (`git show 65cbef2 --stat` lists both as deletions); `.gitignore` covers `.DS_Store` and variants; `find . -name .DS_Store -not -path './node_modules/*'` returns nothing after cleanup |
| 9 | CI runs on a pushed branch; typecheck/lint/licence-check stages green | partial | Workflow file is written and every stage it runs (`typecheck`, `lint`, `test`, `license-check`) was verified locally and is green (see "What was done" and criteria 3/5). I have no way to push to a remote or trigger an actual GitHub Actions run from this environment — the repository has no configured remote. Cannot independently confirm the workflow executes identically on `ubuntu-latest` runners; the steps are standard (`actions/checkout`, `actions/setup-node` with npm cache) and mirror what I ran locally |

## Not done

- Criterion 9 is only locally verified, not confirmed on an actual GitHub
  Actions run — no remote is configured for this repository in this
  environment. Recommend Claude Code (or whoever has push access) confirms
  the first real CI run before treating this as fully closed.
- `pipeline/` was left empty at the point WO-001's own acceptance criteria
  were checked; it is populated later in this session by WO-005. This is
  expected — WO-001 explicitly says not to add pipeline logic.

## Findings

- **Ecosystem versions at "today" (2026-08-24) forced two deviations from
  naive "install latest":**
  - `typescript@latest` is now `7.0.2`, a new architecture, and
    `@typescript-eslint` (8.67.0) declares a peer range of
    `>=4.8.4 <6.1.0` — it does not yet support TS 7. Pinned `typescript` to
    the exact `6.0.3` (the newest release inside that peer range) instead.
    Revisit when `@typescript-eslint` ships TS 7 support.
  - `eslint@latest` is `10.9.0`, but `eslint-plugin-react` and
    `eslint-plugin-react-hooks`'s stable line had not caught up (npm showed
    `eslint@9.39.5` still carrying the `maintenance` dist-tag, itself now
    marked deprecated). Rather than pin to a deprecated ESLint 9, I deferred
    installing any React-specific lint plugin (JSX rules, hooks rules)
    entirely — there is no JSX/hooks code in the repository yet for it to
    check, and WO-001 explicitly says to keep the toolchain minimal and add
    things when a later work order needs them. **This is a real gap someone
    needs to close before or during M2**, whenever White's first React
    components land: either wait for `eslint-plugin-react-hooks` (already
    supports ESLint 10 per its peerDependencies) plus a JSX-lint plugin that
    supports ESLint 10 (e.g. `@eslint-react/eslint-plugin`, MIT, peer
    `eslint: '*'`, confirmed on the registry — not yet evaluated further),
    or reassess when `eslint-plugin-react` itself catches up.
- **License-checker footgun, fixed but worth flagging generally:** its
  `production`/`development` options are independent positive filters, not
  a pair that defaults to "everything unless narrowed." Passing
  `development: true` alone (which I did on the first pass, intending
  "include dev dependencies too") silently *excludes* `dependencies`
  (`react`, `react-dom` disappeared from the scan entirely). Anyone touching
  `scripts/check-licenses.mjs` should keep the comment there and not
  "helpfully" add either flag back.
- **Root LICENSE / data/LICENSE could not be authored through this agent
  session** — the model turn is filtered when a large verbatim licence text
  (GPL-3.0 in my case) is embedded in a tool call argument. Both this run
  and a prior retry failed identically before any file was written. Claude
  Code's workaround (fetch via `curl` outside the model turn) worked and is
  now the established pattern; worth remembering for any future large
  verbatim legal/generated text (WO-002's `data/LICENSE` hit the same issue
  and used the same fix).
- **Concurrent work from WO-003 (Red, HSK word list) and WO-006 (Red, Pinyin
  test table) landed in the shared working tree while I was mid-session**:
  `data/source/hsk/*`, `data/test-fixtures/pinyin-conversion.json`,
  `docs/workstream/reports/WO-003-report.md`,
  `docs/workstream/reports/WO-006-report.md`, and working-tree modifications
  to `docs/engineering/data-pipeline.md`, `docs/project/decision-log.md`
  (new `DEC-021`, `DEC-022`), and `docs/workstream/board.md`. I did not
  stage or commit any of it — it's outside WO-001/002/005 scope and belongs
  to Red's/Claude Code's own commits. Flagging in case it needs to be
  committed on its own branch(es) before it's lost; it's currently only
  sitting uncommitted in the working directory. I *did* read the updated
  `data-pipeline.md` diff (DEC-021: erhua `r5` fuses onto the preceding
  syllable with **no space**, not space-separated as the original rule 8
  wording left ambiguous) and used it directly in WO-005's implementation —
  see that report.
- The GPL header notice text I chose (see `eslint.config.js`, the
  `gplHeader` constant) is my own reasonable rendering of the standard GNU
  "how to apply" notice with the project name substituted in; it was not
  separately reviewed by anyone. Worth a sanity check from whoever finalises
  the README's attribution section (M7), since the two should probably use
  consistent project-identity wording.

## Follow-ups proposed

- A work order (or a note added to WO-002/M2 scope) to select and configure
  a React-hooks/JSX ESLint ruleset once ESLint-10-compatible options are
  evaluated — currently there is none active, only `@typescript-eslint`'s
  rules and the GPL header rule.
- Confirm the first real GitHub Actions run once a remote exists (criterion
  9 above).
- Someone (Claude Code or Red) should commit the currently-uncommitted
  WO-003/WO-006 artefacts sitting in the working tree on their own
  branch(es) before they risk being lost or accidentally swept into an
  unrelated commit.
