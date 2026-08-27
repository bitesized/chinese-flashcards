---
id: WO-012
title: M4 — speech service, audio controls, speech-rate and autoplay settings
owner: Black
status: Ready
priority: MUST
milestone: M4
requirements: [FR-40, FR-41, FR-42, FR-43, FR-44, FR-45, FR-46]
depends_on: [WO-011]
spec_refs:
  - product/requirements.md#f-audio
  - product/ux-specification.md#42-study--the-card
  - product/ux-specification.md#44-settings
  - engineering/architecture.md#5-text-to-speech-constraints
  - engineering/domain-model.md#8-runtime-only-types
  - engineering/testing-strategy.md#4-end-to-end-journeys
  - project/decision-log.md#dec-009--web-speech-api-with-visible-degradation
  - project/decision-log.md#dec-031--m4-audio-pulled-forward-executed-before-m3-level-selection
  - project/roadmap.md#m4--audio
touches:
  - src/services/speech.ts (new)
  - src/features/study/Card.tsx, Card.module.css
  - src/features/study/StudySession.tsx
  - src/features/settings/SettingsScreen.tsx
  - src/domain/runtime.ts (Settings: add speechRate, autoplayOnReveal)
review_required: [Red (pronunciation correctness)]
---

# WO-012 — M4: speech service, audio controls, speech-rate and autoplay settings

## Context

Per [DEC-031](../../project/decision-log.md), M4 is built before M3 — the
owner asked that computer voice (CLAUDE.md §02) be prioritised now. This
work order covers M4's full deliverable list against **HSK 1 only**, the one
level Level Select currently exposes (DEC-025) — audio does not need
multi-level Level Select to be useful, built, or tested.

This is the first work order to touch the Web Speech API. There is no
existing scaffolding in `src/` for it (confirmed by search — clean slate).
Per [DEC-009](../../project/decision-log.md), pre-generated audio files are
explicitly out of scope for v1; this work order is `SpeechSynthesis` only.

**Read [architecture.md](../../engineering/architecture.md) §5 in full
before starting** — it documents several non-obvious platform constraints
that are correctness-critical, not stylistic preferences:

1. `speechSynthesis.getVoices()` is asynchronous and returns an empty array
   on first call on most browsers; the real list arrives via the
   `voiceschanged` event. A one-shot call at module load or component mount
   will see zero voices on a device that actually has one. Resolve voices
   via the event, with a timeout fallback for browsers that never fire it.
2. Voice availability is platform-dependent: iOS generally has a Mandarin
   voice; desktop Chrome/Edge generally do; Firefox depends on the OS
   (Linux `speech-dispatcher` often has none); Android depends on whether a
   Chinese language pack is installed for the OS TTS engine. **Do not
   assume a voice exists** — FR-43's disabled-and-explained state is a
   MUST, not a fallback for a rare case.
3. Voice matching: prefer an exact `zh-CN` voice; if none, accept any
   `zh-Hans`. **Reject `zh-TW`/`zh-HK`** — different regional pronunciation,
   wrong for Mandarin-as-taught-in-v1. (Live-tested addendum: when multiple
   `zh-CN` candidates exist, a naive first-match can land on a
   lower-quality voice — see `speech.ts`'s persona-voice deprioritisation,
   added after owner feedback on the running app.)
4. **iOS requires `speechSynthesis.speak()` to be called synchronously
   inside the user-gesture event handler.** If autoplay-on-reveal (FR-46) is
   wired to fire after any `await` (even a voice-list resolution promise
   already settled), iOS silently drops it. Structure the reveal handler so
   the `speak()` call itself is synchronous within the gesture.
5. Call `speechSynthesis.cancel()` immediately before every `speak()` —
   without it, rapid card advancing queues utterances instead of
   interrupting them (roadmap M4 gate #4).
6. Always speak `card.headword` (the Hanzi), never the Pinyin string, and
   always set `utterance.lang = 'zh-CN'` explicitly — never inherit
   `document.documentElement.lang` or leave it unset.

## Task

### 1. Speech service (`src/services/speech.ts`)

A single module every speech interaction goes through — nothing in the UI
calls `window.speechSynthesis` directly, same pattern as `storage.ts`
(WO-011) for `localStorage`. Responsibilities:

- Resolve the Mandarin voice per the matching rule above, asynchronously,
  cached after first resolution (voices don't change mid-session in
  practice, and re-querying on every speak call is wasted work).
- Expose a synchronous-safe `speak(text: string, rate: number)` that:
  cancels any in-flight utterance, sets `lang = 'zh-CN'`, applies `rate`
  directly as `SpeechSynthesisUtterance.rate` (architecture.md §5 does not
  pin an exact value or range; chosen by ear against a real voice — see
  Context's live-testing note — and exported as named constants so the
  Settings UI's slider and this module agree on bounds), and speaks. Must
  be callable synchronously from within a click/keydown
  handler with no intervening `await` (constraint 4 above) — if voice
  resolution isn't finished yet, degrade to `available: false` rather than
  awaiting it inside `speak()`.
- Expose a way for the UI to know, without polling every render, whether a
  usable voice exists (`available: boolean`), reactive to the
  `voiceschanged` event and the resolution timeout.
- No dependency on React — this is a plain service module, consumed via a
  small hook or direct calls from components, your call on the exact seam,
  consistent with how `storage.ts`/`decks.ts` are consumed today.

### 2. Audio controls on the card

`src/features/study/Card.tsx` (extends WO-011's component, does not
replace it):

- A speak control on **both faces** (FR-44), not inside the card's own
  click-to-flip target — tapping it must not flip the card
  (`event.stopPropagation()`, same pattern already used for the "Show N
  more" senses button).
- Disabled with a plain, visible explanation when no Mandarin voice is
  available (FR-43) — not hidden, not silently inert. Reuse the existing
  visual language for disabled controls rather than inventing a new one.
- Keyboard `S` triggers speech for the current card
  ([UX spec](../../product/ux-specification.md) interaction table), wired
  in `StudySession.tsx` alongside the existing ArrowRight/ArrowLeft/F/B
  handling.
- Meets the 44×44 CSS px touch target minimum (NFR-6), same as every other
  interactive control WO-011 built.

### 3. Settings

`src/domain/runtime.ts`: add `speechRate: number` and `autoplayOnReveal:
boolean` (default `false`, FR-41/FR-46) to `Settings`. domain-model.md §8's
originally-planned shape had `speechRate` as a fixed `'normal' | 'slow'`
pair; live-tested against a real voice during this work order (owner
feedback: the Web Speech API's own default rate, 1, is "too fast and
unclear" for a learner), a continuous slider replaced it instead — FR-45's
"at minimum a normal and a slow setting" is a floor, not a ceiling, and a
slider satisfies it with more granularity, not less. Range/default (0.5–1.5,
default 0.7) are chosen by ear in `speech.ts`, exported as constants so the
Settings UI and the service agree on bounds without duplicating them. Do not
add `newCardsPerDay`/`dayStartHour` (still M5 scope).

`src/features/settings/SettingsScreen.tsx`: add a speech-rate slider
(labelled with its current value, e.g. "0.70×") and an autoplay-on-reveal
toggle (segmented-button pattern, consistent with the existing controls),
default off. Both go through the existing
`onChange`/storage round-trip WO-011 already built — no new persistence
mechanism needed, `SETTINGS_SCHEMA_VERSION` handling already covers
additive fields safely (verify this rather than assuming it; if the current
`loadSettings` does a strict-equality schema check that would reset a
previously-saved settings object wholesale on seeing new fields, treat that
as a bug to fix in this work order, not a pre-existing acceptable behavior —
users should not lose their Pinyin/theme/card-order preferences just
because two new fields were added).

If autoplay-on-reveal is on, flipping a card to reveal its meaning speaks
the Hanzi automatically (constraint 4 above governs how this must be
wired). This only ever happens on an explicit user action (the flip itself
is user-initiated) — FR-41's "never autoplays on card change" refers to
advancing to a *new* card, which must never auto-speak regardless of this
setting; only the reveal-flip does.

## Acceptance criteria

1. Triggering speech (click or `S` key) on a device/browser with a Mandarin
   voice available produces an utterance with `lang === 'zh-CN'` speaking
   the current card's Hanzi headword, not its Pinyin.
2. The speak control is present and independently triggerable from both the
   front and back face.
3. On a browser/device with no Mandarin voice, the control is visibly
   disabled with a plain explanation — never present-but-silently-broken,
   never simply hidden.
4. Rapid card advancing (or repeated speak triggers) never queues or
   overlaps utterances — verified by triggering speech, then advancing or
   re-triggering before the first utterance would finish, and confirming
   `speechSynthesis.cancel()` runs first each time.
5. The speech-rate slider changes the produced utterance's rate, and the
   setting survives a page reload.
6. Autoplay-on-reveal, when enabled, speaks automatically on flip-to-reveal
   and does not fire on session navigation (advancing/returning to a card
   without flipping); when disabled (the default), flipping never
   autoplays. Default-off is verified against a fresh `Settings` object.
7. Adding `speechRate`/`autoplayOnReveal` to `Settings` does not reset a
   previously-saved settings object's other fields (Pinyin toggles, card
   order, theme, lastLevels) on load — verified with a unit test loading a
   pre-WO-012-shaped stored object.
8. `npm run typecheck`, `npm run lint`, and `npm test` all remain green;
   `src/services/speech.ts` has unit tests for voice matching (exact
   `zh-CN` preferred, `zh-Hans` accepted, `zh-TW`/`zh-HK` rejected, empty
   list → unavailable) and for the cancel-before-speak sequencing, using a
   mocked `speechSynthesis`/`SpeechSynthesisUtterance` (jsdom does not
   implement the Web Speech API — this must be mocked, not skipped).
9. Verified in an actual browser per this project's standing practice: at
   minimum, confirm in real Chromium that the disabled-and-explained state
   (criterion 3) renders correctly. Headless Chromium typically reports
   zero voices on CI, but this development machine's Chromium install
   actually surfaces the host macOS's real voice list — if that holds here,
   verify criterion 1's "voice available" path directly too (by patching
   `speechSynthesis.speak` to record the dispatched utterance rather than
   relying on audible confirmation, since this environment cannot judge
   audio quality either way); if not, fall back to the disabled-path-only
   check and say so plainly rather than claim device coverage that wasn't
   demonstrated.
10. Per [DEC-032](../../project/decision-log.md) (recorded during this work
    order — the original wording was unachievable under architecture.md
    §5's Hanzi-only speech constraint, since a homograph pair shares one
    identical headword string by construction): Red confirms the correct
    headword text and `zh-CN` language are dispatched per card on a sample
    including at least one homograph pair, not that the pair sounds
    different.

## Out of scope

- Pre-generated audio files (DEC-009).
- Grading controls or anything scheduler-shaped (M5) — the back face gains
  a speak control only, nothing else changes about its layout or
  interaction from WO-011.
- Multi-level sessions, Level Select changes (M3 — unaffected by this work
  order per DEC-031's rationale).
- `new-cards-per-day`/`day-start-hour`/export/import/reset-progress settings
  (M5).
- Service worker / offline audio caching (M6).
- Any change to `pipeline/*.ts` or `public/decks/*.json` content.

## Notes

- Per the owner's 2026-08-25 process change, this work order is executed
  directly by Claude Code rather than dispatched to a Black session —
  recorded under `owner: Black` since Black remains the accountable owner
  of this area per charter.md §3.
- Verify in a real browser before marking any criterion met beyond what
  criterion 9 already scopes honestly — type-checking and mocked unit tests
  confirm the service's internal logic, not that speech audibly works.
