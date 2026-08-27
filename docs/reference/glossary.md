# Glossary

Owner: **Red** (linguistic terms), **Claude Code** (project terms).

Written for a competent engineer who does not read Chinese, and a competent
Chinese speaker who does not build web applications. Both need to read the same
documents.

---

## Chinese language

**Hanzi (汉字)** — Chinese characters. The written units of the language. One
character is roughly one syllable and one morpheme, but a *word* may be one, two,
or more characters: 我 (I) is one; 中国 (China) is two; 图书馆 (library) is three.

**Simplified Chinese (简体字)** — the character set standardised in mainland China
from the 1950s. Used by HSK and by this application ([DEC-010](../project/decision-log.md)).

**Traditional Chinese (繁體字)** — the older character set, current in Taiwan, Hong
Kong, and Macau. CC-CEDICT supplies both forms for every entry.

**Pinyin (拼音)** — the standard romanisation of Mandarin, written in Latin letters
with tone marks. `nǐ hǎo`. A pronunciation aid, not a writing system: fluent
material is not written in Pinyin.

**Tone** — Mandarin distinguishes meaning by pitch contour. Four tones plus a
neutral tone. `mā` (mother), `má` (hemp), `mǎ` (horse), `mà` (to scold), `ma`
(question particle) differ only in tone and are entirely different words. **Tones
are not optional detail** — dropping a tone mark changes the word, which is why
FR-12 requires diacritics rather than bare letters.

**Numbered Pinyin** — an ASCII encoding of tones as trailing digits: `ni3 hao3` for
`nǐ hǎo`. Tone 5 (or no digit) is neutral. `ü` is written `u:`. CC-CEDICT stores
Pinyin this way; the pipeline converts it for display
([data-pipeline](../engineering/data-pipeline.md) §3).

**Homograph / 多音字** — one written form with two or more distinct readings and
meanings. 行 is *xíng* (to walk) or *háng* (a row, a profession). The central
modelling problem of this project; see
[domain-model](../engineering/domain-model.md) §4 and
[DEC-004](../project/decision-log.md).

**Measure word / classifier (量词)** — a word required between a number and a noun,
comparable to "two *sheets* of paper". 一**本**书 — "one *volume* book". Which
classifier a noun takes must be learned with the noun, which is why FR-6 shows it
on the card. CC-CEDICT marks these with a `CL:` annotation.

**Erhua (儿化)** — a rhotic suffix on some syllables, especially in northern
speech. CC-CEDICT writes it `r5`, as in `yi1 hui4 r5` for 一会儿.

**Tone sandhi** — tones change in connected speech; two third tones in sequence
shift the first to a second tone, so 你好 is written `ni3 hao3` but spoken
`ní hǎo`. Dictionaries record the **citation form**, and so does this application.

**Chengyu (成语)** — a four-character idiom, usually with a classical allusion.
Common at HSK 5–6. Their dictionary entries often carry both a literal and a
figurative gloss, which is one source of [RISK-6](../project/risk-register.md).

**CJK** — Chinese, Japanese, Korean. In typography, the set of East Asian scripts
that share Unicode codepoints for Han characters. Because they share codepoints but
differ in preferred glyph shape, a font stack must be told which language it is
rendering; see [RISK-5](../project/risk-register.md).

---

## Data sources

**CC-CEDICT** — a community-maintained Chinese–English dictionary, successor to
Paul Denisowski's CEDICT. Around 120,000 entries, distributed as a plain UTF-8 text
file under **CC BY-SA 4.0**. The source of all Hanzi, Pinyin, and English in this
application, per CLAUDE.md §02.

**HSK (汉语水平考试)** — *Hànyǔ Shuǐpíng Kǎoshì*, the standardised Chinese
proficiency test for non-native speakers. Its published vocabulary lists are the
de facto syllabus for learners.

**HSK 2.0** — the 2010 six-level standard, roughly 5,000 words across levels 1–6.
This project uses it, one deck per level ([DEC-015](../project/decision-log.md)).

**HSK 3.0** — the 2021 nine-band standard. Larger and differently organised.
**Not** what this project uses; the distinction matters when sourcing a word list
([OQ-3](../project/open-questions.md)).

**CC BY-SA 4.0** — Creative Commons Attribution-ShareAlike 4.0. Permits reuse
including commercially, and requires attribution, an indication of changes, and
that derivative works carry the same licence. Binding on the compiled decks; see
[RISK-1](../project/risk-register.md).

---

## Project terms

**Card** — one studiable item: one written form, one reading, one set of meanings.

**Deck** — the cards of exactly one HSK level. Six decks.

**Level** — one of `1, 2, 3, 4, 5, 6`. Fixed by CLAUDE.md §02.

**Face** — front (Hanzi) or back (English) of a card.

**Spaced repetition** — scheduling each card to be reviewed shortly before it would
be forgotten, so effort goes to the material that needs it. Required by CLAUDE.md
§02; designed in [scheduling](../engineering/scheduling.md).

**FSRS** — Free Spaced Repetition Scheduler. The algorithm this project uses, built
on a model of memory in terms of **difficulty** (how hard a card is for this
learner), **stability** (how long the memory lasts), and **retrievability** (the
chance of recall right now). Chosen over SM-2 in
[DEC-013](../project/decision-log.md).

**SM-2** — the SuperMemo-2 algorithm, long used by Anki. Simpler than FSRS and the
project's fallback if FSRS cannot be used.

**Grade** — the learner's rating of their own recall after the card is revealed:
Again, Hard, Good, or Easy. The input the scheduler runs on.

**Due** — a card whose scheduled review date has arrived. The due count is the
number that matters day to day.

**Lapse** — a card graded `Again` after having been learned. Lapses feed back into
the card's difficulty.

**Review log** — the append-only record of every grading, retained so intervals
stay explicable, scheduling bugs stay diagnosable, and the algorithm can later be
re-fitted to the individual learner.

**Override** — a committed human correction to compiled content, keyed by card id,
applied at build time so it survives regeneration
([DEC-006](../project/decision-log.md)).

**Work Order (WO)** — a self-contained brief assigned to exactly one agent
([communication-protocol](../team/communication-protocol.md) §6).

**Work Report (WR)** — an agent's committed reply to a work order.

**Linguistic Review (LR)** — Red's committed verdict on a set of cards. Required
before any content ships.

**ADR** — Architecture Decision Record. An entry in
[decision-log](../project/decision-log.md).

**The board** — `workstream/board.md`. The authoritative status of all work.

**PWA** — Progressive Web App. A web application that is installable and works
offline via a service worker. How FR-51 and NFR-5 are met.

**Web Speech API** — the browser interface used for FR-40. See
[architecture](../engineering/architecture.md) §5.
