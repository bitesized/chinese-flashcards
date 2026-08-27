---
id: WO-011
agent: Claude Code
outcome: complete
date: 2026-08-25
---

# WO-011 — Work Report

## What was done

Per the owner's 2026-08-25 process change, this work order was executed
directly rather than dispatched to White. Built the first `src/` code in the
project: app shell, both visual directions, the card component, the study
session, level select, settings, and the storage service.

- **App shell and tokens** (`src/app/`, `src/styles/tokens.css`) — structural
  tokens (spacing, type scale, breakpoints, motion timing) shared by both
  directions; the CJK font stack (`--font-zh`) lives here as a fixed,
  never-overridden value per UX spec §3.
- **Two visual directions** (DEC-018): `theme-ink-paper.css` (warm paper,
  seal-red accent, serif English prose, hairline-bordered card) and
  `theme-slate-brass.css` (cool grey, brass accent, sans-serif throughout,
  no card border, larger radii) — genuinely distinct in type, palette, and
  card treatment, not one design in two colourways. "Ink & Paper" selected
  as active ([DEC-030](../../project/decision-log.md)); "Slate & Brass"
  committed and swappable.
- **Card component** (`src/features/study/Card.tsx`) — both faces always in
  the DOM, `role="button"` with an accurate accessible name per face, a
  polite live region on flip, Space/Enter keyboard support, 3D Y-axis flip
  at 220ms ease-out (1ms under `prefers-reduced-motion`, opacity-only
  transition), sense truncation (first four shown, "Show N more" beyond
  six), classifier rendered separately below a hairline.
- **Study session** (`StudySession.tsx`) — free-review-style previous/next
  navigation over HSK-1 in list order (shuffled or sequential per setting),
  loading skeleton, error state with retry, explicit end-of-deck state
  (restart / restart-reshuffled / back to Level Select), keyboard
  ArrowRight/ArrowLeft/F/B. Built against `src/domain/runtime.ts`'s `Session`
  shape so M5 can later swap in the scheduler's queue without changing this
  component's navigation logic.
- **Level Select** (`src/features/levels/LevelSelect.tsx`) — all six levels
  shown with real compiled counts from `public/decks/manifest.json`
  (`buildDeckSet` in `pipeline/build-data.ts` extended to emit this); only a
  `reviewed` level (HSK 1, per DEC-025) is selectable, others show
  "not yet available" rather than a broken or silently-clickable control.
- **Settings + storage** (`SettingsScreen.tsx`, `src/services/storage.ts`) —
  front/back Pinyin, card order, theme, reset-to-defaults; all reads/writes
  go through the one storage module, schema-versioned from day one.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | Two genuinely distinct visual directions, complete and swappable | yes | `theme-ink-paper.css`/`theme-slate-brass.css` — different palette, type (serif vs. all-sans), radii, and card treatment (bordered+shadow vs. borderless+heavier shadow); [DEC-030](../../project/decision-log.md) records the selection |
| 2 | `npm run dev` serves a working app; full HSK-1 pass completable on 360px and desktop | yes | Verified in real Chromium (Playwright) at 1280×800 and 360×740: level select loads, HSK 1 opens, cards flip, Next/Previous traverse, end state reached |
| 3 | All four Pinyin toggle combinations render correctly on both faces | yes | Browser check + `Card.test.tsx`'s `it.each` over all four `[pinyinFront, pinyinBack]` combinations, asserting exact rendered-pinyin count per combination |
| 4 | Toggling front Pinyin face-up does not flip the card or advance the deck | yes | Browser check (toggle count 2→1→2→1, card stayed on the same face/card throughout); `StudySession.tsx`'s toggle buttons are siblings of the card, not inside its click target |
| 5 | Settings survive a page reload | yes | Browser check: set card order to Sequential, reload, re-open Settings, `aria-pressed="true"` still on Sequential; `storage.test.ts` covers round-trip/reload/malformed-JSON/schema-mismatch at the unit level |
| 6 | A full session is completable using only the keyboard | yes | Browser check: Tab to card, Enter to flip, ArrowRight to advance, repeated to the end state; `StudySession.test.tsx` covers Enter (flip), ArrowRight/ArrowLeft (navigate, resetting to front face), and F/B (Pinyin toggle without stealing focus) |
| 7 | CJK font stack resolves to a Simplified Chinese face, verified on the glyph-divergence set (直, 骨, 今, 令, 起) on a real browser | yes | Rendered the exact stack in Chromium; all five characters render as proper glyphs (no tofu/fallback boxes); zoomed render of 骨 and 令 shows the Mainland/GB glyph forms (flat-top 骨, 卩-hook 令) rather than the Japanese Shinjitai variants — consistent with every stack entry being explicitly SC/GB-labeled (no bare `Hiragino Sans` or JP-ambiguous entry) and `PingFang SC` (Apple's own Simplified Chinese system font) being first and actually present on the verification machine |
| 8 | Flip is 180–250ms ease-out, reduces to instant swap+cross-fade under reduced-motion, content in DOM before animation completes | yes | `tokens.css`: `--flip-duration: 220ms`/`--flip-easing: ease-out`, overridden to `1ms` under `prefers-reduced-motion`; `Card.module.css`'s reduced-motion block switches the transitioned property to `opacity` only; `Card.test.tsx`'s "both faces are present in the DOM regardless of which is showing" test confirms back-face content exists while front is showing, independent of CSS |
| 9 | Card is a `button`-role element with an accurate accessible name; flip announces via a polite live region | yes | `Card.tsx`: `role="button"`, `aria-label` differs per face ("showing character…" / "showing meaning…"), `aria-live="polite"` sr-only div; `Card.test.tsx` asserts both accessible names and the click/keyboard-triggered `onFlip` calls |
| 10 | End of HSK-1 deck shows an explicit end state, never loops silently | yes | `StudySession.tsx`: `position >= queue.length` renders "HSK {level} complete" with Restart/Restart-reshuffled/Back to Level Select; `StudySession.test.tsx` drives a 1-card deck to the end and asserts the end state, then restart |
| 11 | HSK 2–6 show real compiled counts but are visibly not-yet-available | yes | `public/decks/manifest.json` (`buildManifest` in `pipeline/build-data.ts`) computes `reviewed` per level from `reviewSummary.unreviewed === 0 && cardCount > 0`; `LevelSelect.tsx` disables non-reviewed levels and labels them; `LevelSelect.test.tsx` covers both the enabled-HSK-1 and disabled-HSK-2 cases plus a level absent from the manifest entirely |
| 12 | No sense list truncated below §7.2's rule; verified against a real multi-sense HSK-1 card | yes | `一:yi1` (HSK-1) has 7 senses in the shipped deck — confirms real data exercises the truncation path (first 4 shown, "Show 3 more"); `Card.test.tsx` separately tests the exact boundary (6 senses: no truncation; 7 senses: truncate to 4, reveal all on click) |
| 13 | `typecheck`/`lint`/`test` all green; new components have unit/component tests covering flip, both Pinyin toggle axes, and keyboard operability | yes | `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (320 tests across 17 files), `npm run license-check` all pass. New test files: `Card.test.tsx` (14 tests: flip via click/keyboard, both accessible names, both-faces-in-DOM, all 4 Pinyin combinations, lang tags, sense truncation boundary, classifier presence/absence), `StudySession.test.tsx` (5 tests: loading→ready, error+retry, ArrowRight/ArrowLeft navigation with front-face reset, F/B Pinyin toggle without focus loss, end-state+restart), `LevelSelect.test.tsx` (4 tests), `SettingsScreen.test.tsx` (5 tests), `storage.test.ts` (6 tests, pre-existing from earlier in this work order) |
| 14 | Verified running in an actual browser, recorded in this report | yes | See "Browser verification" below |

All 14 acceptance criteria are met.

## Browser verification

Ran the built app against the Vite dev server in headless Chromium
(Playwright), not just against jsdom/Vitest:

- Level Select at 1280×800 and 360×740 — HSK 1 shows its real count
  (154 cards) and is enabled; HSK 2–6 show "not yet available" and are
  disabled.
- A full HSK-1 study pass: card renders, flip on click reveals Pinyin and
  senses, classifier (where present) renders separately below a hairline.
- All four Pinyin toggle combinations, exercised by toggling front and back
  independently mid-session and confirming the rendered Pinyin count changes
  exactly as expected (2→1→2→1), never flipping the card or resetting
  position.
- Keyboard-only path: Tab to the card, Enter to flip, ArrowRight to advance,
  through to the end-of-deck state.
- Settings persistence: changed card order, reloaded the page, confirmed the
  changed value survived.
- CJK glyph-divergence set (直, 骨, 今, 令, 起) rendered directly against the
  project's exact font stack; all five render as real glyphs, and a zoomed
  render of 骨/令 confirms Mainland/GB glyph forms.
- Flip-mirroring regression check, prompted by the owner catching this live:
  screenshot of a flipped card plus a direct read of the back-face Hanzi
  element's computed `transform` (`none`, not a rotation matrix) after the
  `.faceBack` rename — see Findings #1.

All scratch verification scripts used for the above were removed from the
repository after use (`git status` confirms no stray files).

## Not done

Nothing within WO-011's stated scope. Explicitly out of scope and correctly
not attempted: grading controls/intervals (M5), audio (M4), multi-level
sessions/due counts/last-level memory (M3), export/import and
scheduler-dependent settings (M5), service worker/offline/PWA manifest (M6),
font subsetting (M6), and any edit to `pipeline/*.ts`'s card-shape logic,
`src/domain/card.ts`, or `public/decks/*.json` content (the one pipeline
change made — `buildManifest`/`manifest.json` in `build-data.ts` — is
additive plumbing this work order's Level Select needed, not a change to
card content or shape).

## Findings

1. **Real bug: the back face's Hanzi was rendering mirrored, caught by the
   owner in a live check, not by this report's own earlier (incorrect)
   browser verification.** `Card.tsx` used `styles.back` for two unrelated
   purposes: the back face's container (`.back { transform: rotateY(180deg)
   }`, counter-rotating the parent flip so back-face content isn't
   mirrored) and the back-face Hanzi paragraph's font-size modifier
   (`.hanzi.back`). CSS Modules hashes a local class name once per
   identifier, not per selector, so both usages resolved to the identical
   generated class — meaning the Hanzi `<p>` inside the back face also
   picked up the container's `rotateY(180deg)`, applied a second time
   directly to that one element, mirroring only the Hanzi text while every
   sibling (Pinyin, senses, classifier) rendered correctly. This is exactly
   the artifact an initial pass of this work misread as a screenshot
   compression/blur issue and incorrectly cleared with a matrix-algebra
   argument that only modeled two of the three actual rotation
   applications in the real DOM. Fixed by renaming the container's class to
   `.faceBack` (`Card.module.css`, `Card.tsx`), leaving `.hanzi.back`
   unique; re-verified with a fresh screenshot (水果 renders upright) and by
   reading the computed `transform` on the back-face Hanzi element directly
   (now `none`, previously a mirrored `matrix3d`). No test in
   `Card.test.tsx` would have caught this — jsdom does not compute CSS
   transforms — so this class of bug is real-browser-only, consistent with
   this work order's own acceptance criterion 14.
2. **`@testing-library/react`'s auto-cleanup was silently not registered.**
   This project runs Vitest with `test.globals: false` (no implicit
   test globals), but `@testing-library/react`'s auto-cleanup registers
   itself against a global `afterEach` — which does not exist under
   `globals: false` — so registration was a silent no-op. Every component
   test's rendered DOM was leaking into the next test in the same file, only
   visible once a second component test file was written (WO-011's first
   test file, `storage.test.ts`, does not use `render()`, so this had no
   prior symptom). Fixed by adding an explicit `afterEach(() => cleanup())`
   to `tests/setup.ts`. Latent since whichever work order first configured
   `globals: false`, not introduced by this work order, but only surfaced
   and fixed here since this is the first work order to add component tests.
3. **`DEFAULT_SETTINGS.cardOrder` is `'shuffled'`** (FR-32's stated default),
   which makes tests asserting exact card identity/order non-deterministic
   if run against the real default — `StudySession.test.tsx` pins
   `cardOrder: 'sequential'` explicitly rather than depending on shuffle
   output. Not a defect, just a note for anyone adding further tests against
   this component.
4. **WO-001's open item (no React hooks ESLint plugin) partially closed.**
   `eslint-plugin-react-hooks@7.1.1` now supports ESLint 10 (its stable
   line caught up); `eslint-plugin-react` itself has not (latest stable
   still declares `eslint: ^9.7` max). Installed and wired the former,
   scoped to `src/**/*.{ts,tsx}`. It immediately caught two real issues in
   `StudySession.tsx`'s data-loading effect: a synchronous `setState` call
   in the effect body (`react-hooks/set-state-in-effect`) and a missing
   `settings.cardOrder` dependency masking an intentional exclusion
   (`react-hooks/exhaustive-deps`). Fixed by moving the loading-state reset
   to React's documented "adjust state during render" pattern (a `loadKey`
   comparison, not an effect) and reading `cardOrder` through a ref updated
   in its own effect, so the intentional "don't reshuffle mid-session"
   behaviour is now enforced by the rule rather than exempted from it.
   Re-verified in a real browser after the refactor: flip, keyboard
   navigation, and the error→retry path (which specifically exercises the
   `loadKey` reset logic) all still work. `eslint-plugin-react` (JSX
   style/best-practice rules) remains an open item until its stable line
   supports ESLint 10.
5. **New transitive dependency license**: installing
   `eslint-plugin-react-hooks` pulled in `caniuse-lite` (via
   `@babel/core` → `browserslist`), licensed CC-BY-4.0. Added to
   `scripts/check-licenses.mjs`'s allow-list with the same attribution-only
   reasoning already recorded there for CC-BY-3.0 — a pure data table, never
   bundled into the shipped application, lint-tooling-only.

## Follow-ups proposed

- None blocking. M2 is closed; the project can proceed to M3 (level
  selection expansion: due counts, multi-select, last-level memory) once the
  owner directs it, per the roadmap.
- `eslint-plugin-react` (JSX-specific rules, distinct from the now-installed
  `eslint-plugin-react-hooks`) still has no ESLint-10-compatible stable
  release — worth another look whenever a future work order touches
  `src/`, per WO-001's original note.
