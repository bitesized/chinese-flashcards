---
id: LR-003
reviewer: Red
date: 2026-08-25
scope: WO-012 speech dispatch (src/services/speech.ts, Card.tsx, StudySession.tsx)
sampling: none — full static review of all dispatch code paths, plus HSK-1's
  three homograph pairs and a six-card ordinary-word sample
verdict: approved, no blocking findings
---

# LR-003 — WO-012 speech dispatch review (text-only, no audio)

**Method:** static reading of dispatch code paths and inspection of
`public/decks/hsk-1.json`; no audio output available to this review,
consistent with [DEC-032](../../project/decision-log.md)'s and WO-012
acceptance criterion 9's own acknowledged limit — this reviews *what text
and language are dispatched*, not how it actually sounds.

## 1. Dispatch correctness for the three homograph pairs

Confirmed against `public/decks/hsk-1.json`:

| Group | Cards | `headword` | `reading` |
| --- | --- | --- | --- |
| 哪 | `哪:na3` / `哪:nei3` | `哪` / `哪` (identical, as expected) | `nǎ` / `něi` |
| 东西 | `东西:dong1xi1` / `东西:dong1xi5` | `东西` / `东西` | `dōng xī` / `dōng xi` |
| 多少 | `多少:duo1shao3` / `多少:duo1shao5` | `多少` / `多少` | `duō shǎo` / `duō shao` |

This matches DEC-032's premise exactly: each pair is one written form
dispatched identically, distinguished only in `reading`, which `speak()`
never receives.

No dispatch bug found. In `StudySession.tsx`, `currentCard` is recomputed
every render from `cardsById.get(queue[position])`; `handleSpeak` and
`handleFlip`'s autoplay branch are plain function declarations re-created
each render, not memoized against a stale `currentCard` — there is no
closure that could hand card A's identity to card B's speak call.
`Card.tsx` is keyed by `key={currentCard.id}`, forcing a remount on card
change rather than reusing internal state across cards. `speak()` itself
takes `text`/`rate` as plain arguments with no reference back to any card
object, so there is no path by which the wrong headword string could reach
`SpeechSynthesisUtterance`. This satisfies the amended gate: each of the
six cards independently produces a correctly-formed `zh-CN` utterance of
its own headword text.

I cannot verify (and DEC-032 correctly does not ask me to) that a listener
would ever hear the two readings of a pair as different — that is
architecturally impossible under Hanzi-only input, not a WO-012 defect.

## 2. `utterance.lang = 'zh-CN'` sanity check

Correct and unconditional, set regardless of which fallback voice matched
— this is deliberate and right: the *utterance's* declared language should
reflect the standard being taught, not whichever real device voice
happened to answer.

Checked all three homograph pairs above plus a random sample of six
ordinary HSK-1 cards (你, 下午, 大, 四, 商店, 写) — every headword is
Simplified, every reading is standard Hanyu Pinyin citation form. HSK
content is Simplified-only ([DEC-010](../../project/decision-log.md)) and
sourced from CC-CEDICT's mainland-standard readings, so `zh-CN` is the
linguistically correct tag for every card in this deck, with no
exceptions. There is no Traditional-form path, no dialectal-reading path,
and no HSK-1 word requiring `zh-TW`/`zh-HK`/`yue`. (If a future level ever
carried a card whose *only* correct reading is a regional/topolect form,
that would need revisiting — out of scope for this review.)

## 3. Persona-voice deprioritisation heuristic

No objection to shipping it, but one caveat worth recording. The heuristic
is a **name-shape** pattern, not a quality signal: it identifies "ends in a
nested `(Language (Region))` parenthetical" and treats that as "generic
multi-language persona, therefore lower fidelity." For the one confirmed
real case (macOS Chromium: Eddy et al. vs. Tingting, owner-tested) this is
correct and the fix is a real improvement.

The theoretical failure mode: a voice engine could legitimately use that
same nested-parenthetical shape to annotate a *non-persona*, high-quality
voice for reasons unrelated to Apple's persona system. On such a
hypothetical platform, this heuristic would wrongly deprioritise the
better voice in favour of a plain-named lesser one. No evidence this
actually occurs on any platform in this project's target matrix (iOS
Safari, Android Chrome, desktop Chrome/Edge/Firefox —
testing-strategy.md §6); the code's own docstring already correctly scopes
this as "a heuristic, not a spec" that no-ops harmlessly elsewhere. Worth
keeping an eye on during the manual device-matrix pass (M4 gate 1), not a
reason to hold up this work order.

## 4. Other observations

- No linguistic content was changed by this work order — correctly, per
  WO-012's out-of-scope list excluding `pipeline/*` and
  `public/decks/*.json`.
- `Card.tsx` marks the displayed Hanzi `lang="zh-Hans"` separately from the
  TTS utterance's `zh-CN`. Pre-existing pattern from WO-011, not introduced
  here — the two tags serve different purposes (script vs. spoken-locale),
  no objection.

## Escalations

None. Nothing here rises to an owner-level question —
[DEC-032](../../project/decision-log.md) already correctly routed the one
genuine architectural limitation (homograph pairs being indistinguishable
by ear) to the decision log with an honest, permanent caveat, which is the
right disposition.
