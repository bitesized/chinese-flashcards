# Product Requirements

Elaborates on [CLAUDE.md](../../CLAUDE.md) §02. Status: **Draft, awaiting owner ratification.**

Requirement IDs are permanent. If a requirement is dropped, mark it `Withdrawn` —
do not delete it and do not reuse the number. Work orders cite these IDs.

**Priority:** `MUST` = v1 cannot ship without it. `SHOULD` = v1 is materially worse
without it, but it can ship. `MAY` = optional, take it if it is cheap.

---

## A. Card presentation

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-1 | MUST | The front of a card displays the Hanzi word or character, as the dominant visual element. |
| FR-2 | MUST | The user can flip the card to reveal the English translation. Flipping is available by click, tap, and keyboard. |
| FR-3 | MUST | The back of the card displays the English translation(s) drawn from the card's CC-CEDICT entry. |
| FR-4 | MUST | The card can be flipped back to the front. Flipping is reversible without penalty or state loss. |
| FR-5 | SHOULD | Where a CC-CEDICT entry has several English senses, all are shown on the back, in source order, visually enumerated. |
| FR-6 | SHOULD | Where a word has a measure word (classifier), it is shown on the back, distinct from the definitions. |
| FR-7 | MAY | The back displays the word's HSK level. |

## B. Pinyin

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-10 | MUST | Pinyin display is user-toggleable. |
| FR-11 | MUST | Front-side Pinyin and back-side Pinyin are **independent** settings. All four combinations are valid: neither, front only, back only, both. |
| FR-12 | MUST | Pinyin is rendered with tone diacritics (nǐ hǎo), not tone numbers (ni3 hao3). |
| FR-13 | MUST | Pinyin toggles persist across sessions on the same device. |
| FR-14 | SHOULD | Pinyin can be toggled from within the study screen without navigating away. |
| FR-15 | SHOULD | Toggling front Pinyin while a card is face-up does not flip the card or advance the deck. |
| FR-16 | MAY | Tone-colouring of Pinyin (a colour per tone) is offered as a further, separate, default-off setting. |

## C. Vocabulary and levels

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-20 | MUST | Vocabulary is divided into the HSK levels **1, 2, 3, 4, 5, 6**. These six labels are exactly the levels offered. |
| FR-21 | MUST | The user selects which level to study before a session begins. |
| FR-22 | MUST | Every card's Hanzi, Pinyin, and English derive from CC-CEDICT. |
| FR-23 | SHOULD | The user can select more than one level at once for a combined session. |
| FR-24 | SHOULD | Each level displays its card count before selection. |
| FR-25 | SHOULD | The last-selected level is remembered and offered as the default next visit. |
| FR-26 | MAY | A "review everything up to level N" cumulative option. |

## D. Study session

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-30 | MUST | The user can advance to the next card. |
| FR-31 | MUST | The user can return to the previous card. |
| FR-32 | MUST | Card order is determined by the scheduler (§G). Shuffling applies *within* a due group, so the same order is not repeated daily. |
| FR-33 | SHOULD | In free review (FR-66), which does not affect scheduling, the user can choose shuffled or sequential order. |
| FR-34 | SHOULD | Session progress is shown (position within the deck). |
| FR-35 | SHOULD | Reaching the end of a deck presents an explicit end state offering restart, reshuffle, or level change — it does not silently loop. |
| FR-36 | SHOULD | If the user leaves and returns within the same browser session, the session resumes at the same card. |
| FR-37 | ~~MAY~~ | **Withdrawn.** Session-only "known" marking was the v1 memory model before spaced repetition entered scope; it is superseded by FR-60 to FR-69. |

| FR-38 | MUST | Session composition follows [scheduling](../engineering/scheduling.md) §5: due reviews, then learning cards, then new cards up to the daily limit. |
| FR-39 | SHOULD | The user can end a session at any point without losing the grades already given. |

## E. Spaced repetition

Added on the owner's instruction; CLAUDE.md §02 now requires it. Full design in
[scheduling](../engineering/scheduling.md).

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-60 | MUST | The app records per-card knowledge state and persists it on-device across sessions. |
| FR-61 | MUST | After revealing the back, the user grades their recall on a four-point scale: Again, Hard, Good, Easy. |
| FR-62 | MUST | The grade determines when the card is next due, via the scheduler. |
| FR-63 | MUST | A session presents cards the scheduler says are due, not an arbitrary traversal of the deck. |
| FR-64 | MUST | The user can see how many cards are due, per level and in total, before starting. |
| FR-65 | MUST | New cards are introduced at a user-adjustable daily limit, defaulting to 10. |
| FR-66 | SHOULD | The user can free-review a level outside the schedule. Free review does not alter scheduling state. |
| FR-67 | SHOULD | When nothing is due and the new-card limit is spent, the app says so plainly rather than manufacturing review. |
| FR-68 | SHOULD | The user can reset progress for one level or for everything, with explicit confirmation naming what will be lost. |
| FR-69 | MUST | The user can export all progress and settings to a file, and import it. See [scheduling](../engineering/scheduling.md) §6 — without this, a cleared browser cache destroys months of history irrecoverably. |
| FR-70 | SHOULD | The user can see basic progress per level: new, learning, and known counts. |
| FR-71 | MAY | The user can see a forecast of upcoming review volume. |

> **On FR-69.** This is a MUST rather than a SHOULD because CLAUDE.md §03 defers
> synchronisation, so a single browser profile is the only copy of the learner's
> history. Browsers evict storage. Export is not a convenience here; it is the
> difference between recoverable and lost.

## F. Audio

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-40 | MUST | The user can hear the current word spoken aloud in Mandarin, on request. |
| FR-41 | MUST | Audio is triggered by an explicit user action. It never autoplays on card change by default. |
| FR-42 | MUST | Speech uses a Mandarin voice (`zh-CN`). It must not fall back to reading Hanzi with an English voice. |
| FR-43 | MUST | Where no Mandarin voice is available on the device, the audio control is disabled with a plain explanation, not silently broken. See [RISK-4](../project/risk-register.md). |
| FR-44 | SHOULD | Audio is available from both the front and the back of the card. |
| FR-45 | SHOULD | Playback rate is adjustable, at minimum a normal and a slow setting. |
| FR-46 | MAY | An "autoplay on reveal" setting, default off. |

## G. Settings and persistence

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-50 | MUST | Settings persist on-device without an account. |
| FR-51 | MUST | The app is fully usable with no network connection after first load. |
| FR-52 | SHOULD | Settings are reachable in one interaction from the study screen. |
| FR-53 | SHOULD | A reset-to-defaults control exists. |
| FR-54 | MAY | Light/dark theme selection, defaulting to the system preference. |

## H. Hanzi lookup and handwriting practice

Added on the owner's instruction ([DEC-035](../project/decision-log.md));
CLAUDE.md §02 now requires it. Independent of the HSK word decks — this
section is a per-*character* reference and practice tool, reachable
without starting a study session.

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-80 | MUST | The user can look up any individual Hanzi character (not just whole HSK words) and see its stroke order, Pinyin reading(s), and English meaning(s). |
| FR-81 | MUST | The character's stroke order can be watched as an animation, on request. |
| FR-82 | MUST | The user can practise drawing the character themselves, with feedback on whether each stroke is correct. |
| FR-83 | MUST | Drawing practice works with touch input, including a stylus (e.g. Apple Pencil), not just mouse. |
| FR-84 | SHOULD | A separate, dedicated page presents a blank handwriting-practice grid (田字格-style guide lines) the user can freely draw on, independent of any specific character's guided practice. |
| FR-85 | SHOULD | The character lookup is searchable/browsable — the user does not need to already know where to find a specific character. |
| FR-86 | MAY | A character's page links to the HSK word(s) that use it, where one exists in the app's vocabulary. |

## I. Custom decks

Added on the owner's instruction ([DEC-036](../project/decision-log.md),
refined by [DEC-037](../project/decision-log.md)); CLAUDE.md §02 now requires
it. Decks a learner builds themselves, independent of the HSK/CC-CEDICT
pipeline (domain-model.md §10) — a parallel entity to the HSK `Deck`/`Card`
model, not a variant of it.

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-90 | MUST | The user can create a custom deck with a name, and add, edit, and delete cards within it (headword required; reading and notes optional; at least one meaning required). |
| FR-91 | MUST | A custom deck can be exported to a single JSON file, and that exact file can be re-imported — on the same device or a different one — to recreate a working, studyable deck. |
| FR-92 | MUST | Importing a deck file validates its contents before writing anything, and rejects a malformed, incomplete, or oversized file with a visible, specific error. |
| FR-93 | SHOULD | The user can add free-text notes to any custom card, independent of its definitions. |
| FR-94 | SHOULD | The user can remove any individual definition from a card — whether hand-typed or filled in via lookup (FR-95) — without affecting the card's other definitions. |
| FR-95 | MUST | A custom card can be created by looking up a word by Hanzi or by Pinyin, pre-filling its CC-CEDICT reading and definitions into the same editable fields manual entry uses, so it appears exactly as an HSK deck's card would. |
| FR-96 | SHOULD | Looking up a headword with more than one reading (a homograph, e.g. 行 xíng/háng) offers each reading as a separate, distinguishable candidate. |
| FR-97 | MUST | A custom deck studies through the same card-flip, Pinyin-toggle, and speech experience as the HSK decks. |
| FR-98 | SHOULD | Deleting a custom deck requires an explicit confirmation step. |
| FR-99 | MUST | A deck containing any CC-CEDICT-sourced card displays the required CC BY-SA 4.0 attribution, both in the app and carried in the exported file, per CLAUDE.md §04's inherited obligation. |
| FR-100 | MAY | Pinyin lookup accepts toneless and numbered-tone input, not only fully diacritic input (e.g. "nihao" and "ni3hao3" both find 你好). |
| FR-101 | SHOULD | The number of custom decks, cards per deck, and the length of any free-text field are bounded, with a clear error shown when a limit is reached — enforced identically for manual entry and for import. |

---

## Non-functional requirements

| ID | Priority | Requirement | Target |
| --- | --- | --- | --- |
| NFR-1 | MUST | First contentful paint on a mid-range phone over 4G | < 1.5 s |
| NFR-2 | MUST | Card flip and card advance feel immediate | interaction to visual response < 100 ms |
| NFR-3 | SHOULD | Initial JS + CSS payload, compressed | < 150 KB |
| NFR-4 | SHOULD | A single level's vocabulary bundle, compressed | < 100 KB for levels 1–4; < 250 KB for levels 5 and 6, which are much larger ([domain-model](../engineering/domain-model.md) §9) |
| NFR-5 | MUST | Mobile parity: every v1 feature is reachable and comfortable on a 360 px-wide viewport | no feature is desktop-only |
| NFR-6 | MUST | Interactive targets meet WCAG 2.2 AA target size, and the primary study controls are at least 44 × 44 CSS px | — |
| NFR-7 | MUST | Keyboard operable end to end; visible focus indicators throughout | — |
| NFR-8 | MUST | Chinese text is marked `lang="zh-Hans"` and Pinyin `lang="zh-Latn-pinyin"` so screen readers and font fallback behave correctly | — |
| NFR-9 | MUST | Colour contrast meets WCAG 2.2 AA (4.5:1 body, 3:1 large text and UI) | — |
| NFR-10 | MUST | Animations respect `prefers-reduced-motion` | — |
| NFR-11 | MUST | CC-CEDICT attribution and licence terms are honoured in-app and in the repository | see [data-pipeline](../engineering/data-pipeline.md) §7 |
| NFR-12 | SHOULD | No third-party analytics, tracking, or fonts loaded from external hosts in v1 | — |
| NFR-13 | SHOULD | Supported browsers: last two major versions of Chrome, Edge, Firefox, and Safari, on desktop, iOS, and Android | — |
| NFR-15 | MUST | Scheduling state survives app updates: a stored progress schema version *n* loads under version *n+1* | migration tested against committed fixtures |
| NFR-16 | MUST | The app requests persistent storage so progress is not evicted under storage pressure | `navigator.storage.persist()` |
| NFR-17 | SHOULD | Session assembly stays responsive at full corpus scale | < 100 ms to compose a session over ~5,000 cards of progress |
| NFR-14 | SHOULD | Content correctness: zero known mistranslations in HSK 1–3 at ship; higher levels sampled | see [testing-strategy](../engineering/testing-strategy.md) |

---

## Traceability

Every requirement above must, before v1 ships, be either:
- covered by at least one accepted work order in [`workstream/board.md`](../workstream/board.md), or
- explicitly marked `Withdrawn` or `Deferred` here with a one-line reason.

Claude Code audits this table at each milestone gate.
