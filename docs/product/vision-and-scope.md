# Vision and Scope

Elaborates on [CLAUDE.md](../../CLAUDE.md) §01 and §03. Status: **Draft, awaiting owner ratification.**

## 1. Problem

Learning Mandarin vocabulary requires repeated exposure to three linked things at
once: the written character, its pronunciation, and its meaning. Most learners
work from HSK vocabulary lists, but the tools available either bury the card in
features, require an account before showing a single word, or treat the phone as
an afterthought when the phone is where the studying actually happens.

## 2. Vision

A flashcard application that does one thing precisely: shows you the Hanzi word
you are closest to forgetting, and reveals its meaning when you ask. Pinyin appears only when the learner wants it,
on whichever side they want it. Audio is one tap away. The word list is the HSK
syllabus, and the definitions come from CC-CEDICT rather than being invented.

It should open instantly, work on a phone on a train with no signal, tell you when
you are done for the day, and never ask who you are.

## 3. Goals

| # | Goal | How we know we met it |
| --- | --- | --- |
| G1 | A learner can study any HSK level without configuration | From cold load to first card in under three interactions |
| G2 | Pinyin is genuinely optional and independently controlled per side | Front and back Pinyin are separate settings, both persisted |
| G3 | Content is trustworthy | Every shipped card traces to a CC-CEDICT entry and has passed linguistic review — see [testing-strategy](../engineering/testing-strategy.md) |
| G4 | Mobile is not a reduced experience | Every v1 feature is reachable on a phone; no feature is desktop-only |
| G5 | The app is fast | See NFR-1..NFR-3 in [requirements](requirements.md) |
| G6 | Future languages are not designed out | The domain model is language-parameterised even though only Mandarin ships |
| G7 | Study time goes where it is needed | Cards are scheduled by a spaced-repetition algorithm, not traversed in list order — see [scheduling](../engineering/scheduling.md) |
| G8 | A learner's history is never lost | Progress is exportable and importable (FR-69), and persistent storage is requested |

## 4. Non-goals for v1

These are deliberately excluded. They are not rejected forever — several appear in
the [roadmap](../project/roadmap.md) as post-v1 candidates. They are excluded now
because CLAUDE.md does not ask for them, and adding them would delay the core.

| Non-goal | Rationale |
| --- | --- |
| Cross-device synchronisation | CLAUDE.md §03 explicitly defers this. Note that spaced repetition raises the cost of its absence — mitigated, not solved, by export/import (FR-69) |
| User accounts, login, any server-side identity | Not required; no sync means no account is needed |
| Handwriting input or stroke-order animation | Distinct product; large effort |
| User-authored decks and card editing | Content is the HSK syllabus in v1 |
| Languages other than Mandarin | CLAUDE.md §01 defers to future |
| Traditional-character study mode | CC-CEDICT supplies traditional forms, so this is cheap to add later. See [OQ-2](../project/open-questions.md) |
| Sentence or grammar cards | v1 is vocabulary only |

## 5. Audience

- **Primary:** the project owner, studying Mandarin against the HSK syllabus.
- **Secondary:** other self-directed learners, mixed devices, mixed levels, no
  onboarding and no support channel. The app must be self-evident.

There is no assumption that a secondary user has ever seen Pinyin before, which is
why Pinyin defaults to visible. See [DEC-007](../project/decision-log.md).

## 6. Scope discipline

Any proposed feature must answer yes to at least one:

1. Does CLAUDE.md ask for it?
2. Is it required to make something CLAUDE.md asks for actually usable?
3. Has the owner asked for it since?

If none apply, it is logged in [open-questions.md](../project/open-questions.md)
and not built.

## 7. Definition of success for v1

All six HSK levels are studiable end to end, on a phone and on a desktop browser,
with audio, with Pinyin toggles working on both sides, offline after first load,
scheduled by spaced repetition with progress that survives a browser restart and
can be exported, and with the HSK 1–3 vocabulary fully linguistically reviewed by
Red.
