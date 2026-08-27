---
id: WO-012
agent: Claude Code
outcome: complete
date: 2026-08-25
---

# WO-012 — Work Report

## What was done

Per [DEC-031](../../project/decision-log.md), M4 (Audio) was pulled forward
ahead of M3 at the owner's request. Implemented the full M4 deliverable
list against HSK 1 only (DEC-025):

- **Speech service** (`src/services/speech.ts`) — the single seam to the
  Web Speech API. Resolves a Mandarin voice asynchronously (`getVoices()`
  eagerly, the `voiceschanged` event, and three delayed re-checks for
  engines that never fire it), matching an exact `zh-CN` voice first, an
  exact `zh-Hans` voice second, and never `zh-TW`/`zh-HK`. `speak()` is
  fully synchronous (no `await` in its call path, satisfying iOS's
  gesture-synchronous requirement) and always calls `cancel()` first.
- **Audio controls** (`Card.tsx`) — a speak control on both faces, disabled
  with a plain explanation ("No voice available") when no Mandarin voice
  exists, meeting the 44px touch-target floor. Keyboard `S` triggers speech
  (`StudySession.tsx`), alongside the existing ArrowRight/ArrowLeft/F/B.
- **Settings** (`SettingsScreen.tsx`, `runtime.ts`) — `speechRate: number`
  (a continuous slider, not the originally-planned fixed normal/slow pair —
  see Findings #1) and `autoplayOnReveal: boolean` (default off), both
  round-tripping through the existing storage module unchanged.
- Autoplay-on-reveal speaks on the specific front→back flip transition
  only, never on navigation to a new card, satisfying FR-41's "never
  autoplays on card change" alongside FR-46.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | Speech produces a `zh-CN` utterance of the headword, not Pinyin | yes | `speech.ts`'s `speak()`; live-verified in real Chromium by patching `speechSynthesis.speak` to record the dispatched utterance: `{text: '茶', lang: 'zh-CN', rate: 0.7, voice: 'Tingting'}` |
| 2 | Speak control present and independently triggerable on both faces | yes | `Card.tsx`'s `speakButton()` rendered in both face divs; `Card.test.tsx` asserts 2 controls exist and both are independently clickable |
| 3 | Disabled with a plain explanation when no Mandarin voice available | yes | `Card.tsx`; live-verified in real Chromium by filtering `zh-*` out of `getVoices()`'s return and confirming the rendered control is disabled with the text "No voice available" |
| 4 | Rapid advancing/re-triggering never queues or overlaps utterances | yes | `speech.ts`'s `speak()` calls `synth.cancel()` before `synth.speak()` unconditionally; `speech.test.ts` asserts call order via `mock.invocationCallOrder` |
| 5 | Speech-rate slider changes the utterance's rate and survives reload | yes | Live-verified: set slider to 1.2×, reloaded, Settings still read "Speech speed (1.20×)"; `speak()`'s `rate` argument passed straight through to `utterance.rate` |
| 6 | Autoplay-on-reveal fires only on flip-to-reveal, never on navigation; off by default | yes | `StudySession.tsx`'s `handleFlip` (only calls `handleSpeak` when transitioning to `'back'`); `handleNext`/`handlePrevious` never call it; `StudySession.test.tsx` asserts exactly this (click Next → no speak call; then flip → exactly one) |
| 7 | Adding the two new fields doesn't reset a pre-existing stored settings object | yes | `storage.ts`'s `loadSettings` already merges `{...DEFAULT_SETTINGS, ...parsed}` rather than requiring every field present — confirmed correct as-is, not a bug needing a fix; `storage.test.ts`'s new test loads a pre-WO-012-shaped object and asserts every original field survives and the two new fields fill in from defaults |
| 8 | typecheck/lint/test all green; speech.ts has unit tests for matching and cancel-ordering | yes | `npm run typecheck`, `npm run lint`, `npm test` (see Verification below); `speech.test.ts` — 12 tests covering zh-CN/zh-Hans/zh-TW/zh-HK matching, case-insensitivity, the persona-voice heuristic (3 tests, see Findings #2), availability reactivity, cancel-before-speak ordering, rate/lang/text on the dispatched utterance, and the no-voice no-op case |
| 9 | Verified in a real browser | yes, more fully than expected | This machine's Chromium (via Playwright) surfaces the host macOS's real voice list, unlike typical headless CI — so both the disabled-path (criterion 3) and the voice-available path (criterion 1) were verified directly against real dispatched utterances, not just the disabled state as originally scoped. See "Browser verification" below |
| 10 | Red confirms correct headword/`zh-CN` dispatch per card on a sample incl. a homograph pair (amended, DEC-032) | yes | [LR-003](../reviews/LR-003-wo012-speech-dispatch-review.md) — approved, no blocking findings. Confirmed all three HSK-1 homograph pairs dispatch their own correct (identical, as expected) headword text with no cross-card confusion in `StudySession.tsx`'s render/keying logic; confirmed `zh-CN` is linguistically correct for every HSK-1 card sampled (Simplified-only, mainland-standard readings, DEC-010); raised one non-blocking caveat on the persona-voice heuristic (Findings #5) |

## Browser verification

All checks run against the Vite dev server in real Chromium (Playwright),
patching `speechSynthesis.speak` to record dispatched utterances rather
than relying on audible confirmation (this environment cannot judge audio
quality by ear — see Findings #4 on how the rate/voice tuning was actually
validated):

- Clicking "Listen" on a real card dispatches exactly one utterance with
  the correct headword text, `lang: 'zh-CN'`, the resolved voice, and the
  current rate setting.
- The `S` key dispatches exactly one utterance for the focused card.
- The speech-rate slider's value round-trips through a page reload.
- Filtering all `zh-*` voices out of `getVoices()`'s return renders the
  speak control disabled with "No voice available", screenshotted.
- Screenshots taken of the Settings screen (slider + autoplay toggle,
  "Ink & Paper" direction) and the study screen (Listen button placement)
  — visually consistent with the existing WO-011 design language, no new
  colours or treatments introduced outside the token set.

## Not done

Nothing within WO-012's stated scope. Explicitly out of scope and correctly
not attempted: pre-generated audio files (DEC-009), grading controls (M5),
Level Select changes (M3, unaffected per DEC-031), scheduler-dependent
settings (M5), offline audio caching (M6), and any change to
`pipeline/*.ts` or deck content.

## Findings

1. **`speechRate` shipped as a continuous slider, not the originally
   planned fixed `'normal' | 'slow'` pair.** Live-testing the running app
   during this work order surfaced two rounds of real feedback from the
   owner: first, that the Web Speech API's own default rate (1) sounded
   "too fast and unclear" for a learner (addressed by lowering the default
   and, separately, by Finding #2 below); second, an explicit request for a
   continuous speed slider defaulting to ~0.7 rather than a binary choice.
   FR-45's "at minimum a normal and a slow setting" is satisfied a
   fortiori — a slider is strictly more capability, not a substitute that
   falls short of it. `SPEECH_RATE_MIN`/`MAX`/`STEP` are exported from
   `speech.ts` so the Settings UI and the service can't drift out of sync
   on bounds.
2. **Real bug/UX defect caught by owner live-testing, not by this work's
   own initial implementation: the naive first-`zh-CN`-match voice
   selection picked a low-quality voice.** This machine's (and very likely
   any macOS user's) Chromium reports nine `zh-CN` voices: eight are
   Apple's generic multi-language "persona" voices (Eddy, Flo, Grandma,
   Grandpa, Reed, Rocko, Sandy, Shelley — the identical names exist under
   every language Apple ships a persona for), plus "Tingting", macOS's
   long-standing standard Mandarin voice. `Array.find()` on `lang ===
   'zh-cn'` picked "Eddy" (alphabetically first) — confirmed by the owner
   to sound "too fast and unclear" compared to the standard voice. Fixed by
   deprioritising voices whose name carries a trailing "(Language
   (Region))" tag (the persona pattern) in favour of a plain-named voice
   when both exist for the same language — verified this correctly selects
   "Tingting" regardless of array order, real Chromium re-verification
   dispatched an utterance with `voice: 'Tingting'` after the fix. The
   heuristic is documented as exactly that — a heuristic, not a spec — and
   degrades to the previous first-match behaviour on platforms without this
   naming convention.
3. **Roadmap M4 gate #3 was unachievable as originally worded — amended,
   not silently skipped.** See [DEC-032](../../project/decision-log.md) in
   full. Because every homograph pair shares one identical `headword`
   string by construction (that is the definition of a homograph), and
   architecture.md §5 mandates speaking the headword rather than the
   Pinyin ("passing Pinyin to a `zh-CN` voice produces nonsense"), no
   implementation of this feature — this one or any other — can make two
   homograph cards produce audibly different speech from Hanzi text alone.
   HSK-1's three pairs (哪, 东西, 多少) will sound identical regardless of
   which reading a given card represents. The gate is amended to what is
   actually achievable and meaningful to verify: correct headword text and
   `zh-CN` language dispatched per card. This is a real, permanent product
   limitation the owner should be aware of, not a defect in this work
   order's implementation.
4. **This environment cannot judge audio quality by ear — all rate/voice
   tuning in this work order was validated by the owner listening to the
   actual running app, not by any check this report can perform itself.**
   Every verification claim above about "correct" dispatch is at the level
   of utterance text/lang/rate/voice-name, confirmed programmatically; the
   judgement that 0.7× and "Tingting" actually sound better was made by a
   human ear, live, against the running dev server — exactly the kind of
   verification no amount of automated testing substitutes for.

5. **Red's caveat on the persona-voice heuristic (LR-003 §3), not blocking.**
   The deprioritisation rule is a name-shape pattern ("ends in a nested
   `(Language (Region))` parenthetical"), not a true quality signal. On a
   hypothetical platform where a legitimate high-quality voice happens to
   use that same naming shape for unrelated reasons, the heuristic would
   wrongly deprioritise it. No evidence this occurs on any platform in this
   project's target matrix; flagged for attention during the manual
   device-matrix pass (roadmap M4 gate #1), not a reason to hold up this
   work order.

## Follow-ups proposed

- None blocking M4's closure — all 10 acceptance criteria are met.
- Watch for the persona-voice heuristic's theoretical failure mode
  (Findings #5) during the manual device-matrix pass (roadmap M4 gate #1:
  iOS Safari, Android Chrome, desktop Chrome/Edge/Firefox).
- `eslint-plugin-react` (JSX-specific rules) still has no ESLint-10
  stable release — carried forward from WO-011's same note, unaffected by
  this work order.
- Consider, for a future milestone and only if it becomes a real learner
  complaint: some Chinese TTS engines can be steered toward a specific
  reading via a differently-encoded input (e.g. supplying a full sentence
  for context rather than an isolated character, which sometimes shifts an
  engine's internal polyphone disambiguation). This is speculative,
  platform-inconsistent, and not attempted here — recorded only so it
  isn't silently forgotten as a possible future mitigation for DEC-032's
  limitation, not because it's expected to fully solve it.
