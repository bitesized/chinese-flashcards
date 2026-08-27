---
id: LR-004
reviewer: Red
scope: HSK 2 and HSK 3, full — 524 cards (187 + 337), plus 10 named gap words, 5 named verification words, and 1 additional masked gap found during review
sampling: full — no sampling was used anywhere in this review, for any part of the task
seed: n/a (no sampling)
deck_build: dictionaryVersion 2026-08-23T06:21:07Z; wordListVersion drkameleon/complete-hsk-vocabulary@7ac65bf1a6387d35f1ade478906172a19311c7f9
date: 2026-08-25
verdict: approved with corrections
---

# LR-004 — HSK 2 and HSK 3, full review (524 cards + gap-word adjudications)

## Method

Every one of the 524 cards in `public/decks/hsk-2.json` (187) and `public/decks/hsk-3.json`
(337) was read against every check in
[testing-strategy.md](../../engineering/testing-strategy.md) §5: headword
well-formedness, reading/tone correctness for the specific sense shipped, gloss
correspondence and learner-sensible ordering, defensibility of any sense
merge/split, correctness of homograph splits, genuine HSK-level membership, and
classifier correctness.

For unambiguous, single-reading, everyday vocabulary I verified against my own
fluency directly from the shipped JSON (dumped programmatically as headword /
reading / classifiers / senses for both decks and read in full, in two passes:
homograph-group cards first, then every remaining ordinary card). For **every
homograph group** (72 across the two decks — 36 in HSK-2, 36 in HSK-3), **every
classifier**, and every card whose only sense looked like a proper-noun/surname
artifact even without a `homographGroup` tag, I additionally grepped the pinned
CC-CEDICT source (`data/source/cedict/cedict_1_0_ts_utf-8_mdbg.txt`) and the
pinned HSK source rows (`data/source/hsk/hsk-2.json`, `hsk-3.json`) directly,
per LR-002's precedent — this is where an error would actually hide
(domain-model.md §4, DEC-022). No full re-parse of the ~125k-line CC-CEDICT
file was performed; every lookup was a targeted `grep` for the specific
headword in question.

**No sampling was used anywhere in this review** — coverage is 100% of the 524
cards, 100% (10 of 10) of the named gap words, and 100% (5 of 5) of the named
verification words, as the work order requires. No seeded RNG was needed and
none was used.

I also ran a project-wide, mechanical cross-check that LR-002's method did not
have occasion to run at HSK-1 scale: for every non-homograph-tagged card whose
entire sense list looked like a bare surname/proper-noun ("surname X", "abbr.
for X"), I checked whether it was in fact the *only* card shipped under that
headword — this is how I found the 向 masked gap (§ Gap-word adjudications)
that WO-013 did not name. I also ran a regex sweep for
`slang|euphemis|vulgar|penis|breast|cheat on|lesbian|gay\b|lust|porn` across
every shipped sense in both decks, and read every hit by hand, to check
whether DEC-029's mechanical vulgar-content filter (which matches only the
literal `(vulgar)` marker) was catching everything it should — see
Observations.

## Summary

| Verdict | Count |
| --- | --- |
| Approved as generated | 443 |
| Corrected via override | 7 |
| Excluded — must not ship | 74 |
| Gap words resolved via manual override | 15 |
| Gap words left explicitly unresolved (escalated) | 1 |
| Escalated to owner | 2 (content-sourcing policy question; vulgar-content filter coverage gap — see Escalations) |

443 + 7 + 74 = 524, the full two-deck corpus. Of the 16 total words touched by
gap-word adjudication (10 named + 5 named + 1 discovered), 15 were resolved
and 1 (打篮球) was left explicitly, reasonedly unresolved.

**On the "approved as generated" list**: given this review's size (524 vs.
WO-009's 184), I am not enumerating all 443 ids inline as LR-002 did for its
142 — the definition is precise and mechanically checkable without
transcription risk: **every card id in `public/decks/hsk-2.json` and
`hsk-3.json` that does not appear in the Corrections table below or in
`data/overrides/excluded-cards.json`'s new (`excludedBy: "Red"`) entries is
approved as generated.** This is a stricter, more auditable definition than an
inline list would be (Claude Code can verify it with a three-way diff), and I
confirmed it holds by construction: every id in every override file I
authored was cross-checked to exist in the real deck files before this record
was written (see the validation performed while authoring the overrides).

## Corrections

Committed to `data/overrides/lr-004-hsk2-3-corrections.json`. These are content
edits to already-shipped, otherwise-correct cards — none change the headword or
reading, only sense wording/content, in every case dropping one sense that is
genuine CC-CEDICT content but inappropriate or misleading out of context on a
beginner/intermediate flashcard (check 3).

| Card id | Field | Dropped sense | Rationale |
| --- | --- | --- | --- |
| 阴:yin1 | senses | "genitalia" | Clinical/euphemistic anatomical sense, unqualified among weather/Yin-Yang senses on an HSK-2 "overcast weather" card — confusing, no pedagogical value. Rest of the list (including the ordinary "feminine"/"implicit"/"hidden" senses) unchanged. |
| 鸟:niao3 | senses | "(dialect) to pay attention to"; "(intensifier) damned; goddamn" | The second is a coarse expletive derived from 鸟's vulgar near-homophone 屌; the first is obscure dialectal trivia. "Bird" and the radical-name note kept. |
| 春:chun1 | senses | "gay"; "joyful"; "youthful"; "love"; "lust"; "life" (whole archaic-poetic cluster) | "Gay" specifically will read to a modern English-speaking learner as "homosexual", a meaning it does not have here — actively teaches a wrong association, not merely an omitted nuance. Removed as one cluster rather than picking through it, parallel to LR-002's 日:ri4 precedent. Only "spring (season)" remains. |
| 奶奶:nai3nai5 | senses | "(coll.) boobies; breasts" | Crude slang, no relevance to an HSK-3 "grandma" card. |
| 绿:lv4 | senses | "(slang) (derived from 绿帽子) to cheat on (one's spouse or boyfriend or girlfriend)" | Infidelity euphemism has no place on a beginner color-word card. |
| 机场:ji1chang3 | senses | "(slang) service provider for Shadowsocks or similar software for circumventing Internet censorship" | Bizarre, actively confusing internet slang on a beginner "airport" card. |
| 踢:ti1 | senses | "(slang) butch (in a lesbian relationship)" | No place on a beginner "to kick" card. |

## Excluded — must not ship

Committed to `data/overrides/excluded-cards.json` (74 new entries, added to
the 38 already there from LR-002; `excludedBy: "Red"` distinguishes mine from
the earlier batch). Unlike LR-002 — where the exclusion mechanism did not yet
exist and Red had to flag-and-wait — DEC-028's mechanism is live, so these are
authored directly as exclusions with no interim `flagged` step needed.

**What's wrong, in every case:** each of these 74 cards is linguistically
*correct* CC-CEDICT content — I found no mistranslation or wrong tone among
them — but each is a reading of a headword that is not part of the actual
HSK-2/HSK-3 syllabus. The same four sub-patterns LR-002 found systemic at
HSK-1 recur here, plus two new ones this scale surfaced for the first time:

- **Surname readings** (43): e.g. 也:Ye3, 从:Cong2, 张:Zhang1, 新:Xin1,
  白:Bai2, 百:Bai3, 离:Li2, 红:Hong2, 路:Lu4, 还:Huan2, 错:Cuo4, 门:Men2,
  阴:Yin1, 雪:Xue3, 题:Ti2, 高:Gao1, 鱼:Yu2, 万:Wan4, 东:Dong1, 关:Guan1,
  包:Bao1, 南:Nan2, 双:Shuang1, 教:Jiao4, 楼:Lou2, 段:Duan4, 班:Ban1, 祝:Zhu4,
  米:Mi3, 蓝:Lan2, 角:Jue2, 马:Ma3(¹), 黄:Huang2, 冬:Dong1, 花:Hua1, 秋:Qiu1,
  春:Chun1, 别:Bie2, 号:hao2(²) — full list and per-card rationale in the
  override file.
- **Bound forms with no independent meaning** ("used in X" only) (6): 万:mo4
  (万俟), 差:ci1 (参差), 给:ji3, 要:yao1, 号:hao2, 脚:jue2 (a variant pointer,
  see below).
- **Archaic / literary / register-specific readings** (11): 离:chi1, 累:lei2,
  远:yuan4, 故事:gu4shi4, 胖:pan2, 那 (from LR-002, unaffected here).
- **Real, valid, but not-tested-at-this-level secondary readings** (13):
  别:bie4, 吧:ba1, 好吃:hao4chi1, 着:zhao1/zhuo2, 累:lei3, 刷:shua4, 差:chai1,
  把:ba4, 更:geng1, 角:jue2, 难:nan4 (flagged in the override file as a closer
  call than most), 骑:ji4.
- **NEW — proper-noun / country- or place-name abbreviations bundled under an
  ordinary word** (9): 元:Yuan2 ("Yuan dynasty"), 比:Bi3 ("Belgium"),
  黑:Hei1 ("Heilongjiang"), 夏:Xia4 ("the Xia dynasty"), 西:Xi1 ("the
  West/Spain"), 越:Yue4 ("Vietnam"), 马:Ma3(¹) (also "abbr. for Malaysia"),
  新:Xin1 (also "abbr. Xinjiang/Singapore"). This sub-pattern did not appear
  at HSK-1 and is worth naming going forward.
- **NEW — vulgar/crude content CC-CEDICT does not mark `(vulgar)`** (2):
  比:bi1 ("euphemistic variant of 屄"), 鸟:diao3 ("variant of 屌, penis"). See
  Observations — this is DEC-029's filter gap, found on manual review, not
  caught mechanically.
- **NEW — non-substantive variant-character pointer with its own homograph
  card slot** (1): 脚:jue2 ("role, variant of 角") — carries no meaning of its
  own distinct from 角:jue2 (itself excluded as untested-at-level).
- **NEW — masked gaps: the excluded card was the *only* one shipped under
  that headword** (6, no `homographGroup` tag existed because no sibling ever
  resolved): 向:Xiang4, 冬:Dong1, 花:Hua1, 秋:Qiu1, 云:Yun2. (¹马:Ma3 is a
  genuine homograph-group sibling, not masked — 马:ma3 already shipped
  correctly.) Each of these five has its real HSK-word sibling newly added via
  manual override in this same review — see Gap-word adjudications.

(¹, ² footnote markers above indicate a headword appearing in two
sub-categories; not double-counted in the total.)

**What needs to happen next**: nothing — DEC-028's exclusion mechanism handles
these correctly and does not require a build-breaking `flagged` state. Full
per-card rationale, citing the specific gloss and its correct sibling card, is
in the `reason` field of each new entry in `data/overrides/excluded-cards.json`.

## Homograph adjudications

Every homograph group in both decks, with which reading(s) I judged genuinely
intended at that level (✓ = approved/corrected, ✗ = excluded, must not ship).
Full per-card rationale is in `excluded-cards.json`; this table is the
at-a-glance summary.

### HSK-2 (36 groups)

| Group | Readings found | Kept | Excluded |
| --- | --- | --- | --- |
| 为 | wei2, wei4 | both | — |
| 也 | ye3, Ye3 | ye3 | Ye3 (surname) |
| 从 | cong2, Cong2 | cong2 | Cong2 (surname) |
| 便宜 | bian4yi2, pian2yi5 | both | — |
| 元 | yuan2, Yuan2 | yuan2 | Yuan2 (surname/dynasty) |
| 别 | bie2, Bie2, bie4 | bie2 | Bie2 (surname), bie4 (untested) |
| 号 | hao2, hao4 | hao4 | hao2 (bound form) |
| 吧 | ba1, ba5, bia1 | ba5 | ba1 (compound-bound), bia1 (onom.) |
| 告诉 | gao4su4, gao4su5 | gao4su5 | gao4su4 (legal register) |
| 女人 | nv3ren2, nv3ren5 | both | — |
| 好吃 | hao3chi1, hao4chi1 | hao3chi1 | hao4chi1 (untested) |
| 妻子 | qi1zi3, qi1zi5 | both | — |
| 张 | zhang1, Zhang1 | zhang1 | Zhang1 (surname) |
| 得 | de2, de5, dei3 | all three | — |
| 新 | xin1, Xin1 | xin1 | Xin1 (abbr./surname) |
| 比 | bi1, bi3, Bi3 | bi3 | bi1 (vulgar), Bi3 (country abbr.) |
| 白 | bai2, Bai2 | bai2 | Bai2 (surname) |
| 百 | bai3, Bai3 | bai3 | Bai3 (surname) |
| 着 | zhao1, zhao2, zhe5, zhuo2 | zhao2, zhe5 | zhao1 (chess/dialect), zhuo2 (untested) |
| 离 | chi1, li2, Li2 | li2 | chi1 (archaic), Li2 (surname) |
| 红 | hong2, Hong2 | hong2 | Hong2 (surname) |
| 累 | lei2, lei3, lei4 | lei4 | lei2 (archaic), lei3 (untested) |
| 给 | gei3, ji3 | gei3 | ji3 (bound form) |
| 要 | yao1, yao4 | yao4 | yao1 (bound form) |
| 路 | lu4, Lu4 | lu4 | Lu4 (surname) |
| 还 | hai2, huan2, Huan2 | hai2, huan2 | Huan2 (surname) |
| 远 | yuan3, yuan4 | yuan3 | yuan4 (classical) |
| 错 | cuo4, Cuo4 | cuo4 | Cuo4 (surname) |
| 长 | chang2, zhang3 | both | — |
| 门 | men2, Men2 | men2 | Men2 (surname) |
| 阴 | yin1, Yin1 | yin1 (corrected) | Yin1 (surname) |
| 雪 | xue3, Xue3 | xue3 | Xue3 (surname) |
| 题 | ti2, Ti2 | ti2 | Ti2 (surname) |
| 高 | gao1, Gao1 | gao1 | Gao1 (surname) |
| 鱼 | yu2, Yu2 | yu2 | Yu2 (surname) |
| 黑 | hei1, Hei1 | hei1 | Hei1 (place abbr.) |

### HSK-3 (36 groups)

| Group | Readings found | Kept | Excluded |
| --- | --- | --- | --- |
| 万 | mo4, wan4, Wan4 | wan4 | mo4 (bound form), Wan4 (surname) |
| 东 | dong1, Dong1 | dong1 | Dong1 (surname) |
| 关 | guan1, Guan1 | guan1 | Guan1 (surname) |
| 分 | fen1, fen4 | both | — |
| 刷 | shua1, shua4 | shua1 | shua4 (untested/rare) |
| 包 | bao1, Bao1 | bao1 | Bao1 (surname) |
| 南 | nan2, Nan2 | nan2 | Nan2 (surname) |
| 双 | shuang1, Shuang1 | shuang1 | Shuang1 (surname) |
| 啊 | a1, a2, a3, a4, a5 | all five | — (genuine tone-conditioned interjection set, not an artifact) |
| 地 | de5, di4 | both | — |
| 地方 | di4fang1, di4fang5 | both | — |
| 夏 | xia4, Xia4 | xia4 | Xia4 (dynasty/surname) |
| 差 | cha1, cha4, chai1, ci1 | cha1, cha4 | chai1 (compound-bound), ci1 (bound form) |
| 把 | ba3, ba4 | ba3 | ba4 (narrow bound noun) |
| 故事 | gu4shi4, gu4shi5 | gu4shi5 | gu4shi4 (archaic) |
| 教 | jiao1, jiao4, Jiao4 | jiao1, jiao4 | Jiao4 (surname) |
| 春 | chun1, Chun1 | chun1 (corrected) | Chun1 (surname) |
| 更 | geng1, geng4 | geng4 | geng1 (compound-bound) |
| 楼 | lou2, Lou2 | lou2 | Lou2 (surname) |
| 段 | duan4, Duan4 | duan4 | Duan4 (surname) |
| 班 | ban1, Ban1 | ban1 | Ban1 (surname) |
| 祝 | zhu4, Zhu4 | zhu4 | Zhu4 (surname) |
| 种 | zhong3, zhong4 | both | — |
| 米 | mi3, Mi3 | mi3 | Mi3 (surname) |
| 胖 | pan2, pang4 | pang4 | pan2 (archaic idiom) |
| 脚 | jiao3, jue2 | jiao3 | jue2 (non-substantive variant) |
| 蓝 | lan2, Lan2 | lan2 | Lan2 (surname) |
| 西 | xi1, Xi1 | xi1 | Xi1 (proper-noun/abbr.) |
| 角 | jiao3, jue2, Jue2 | jiao3 | jue2 (untested), Jue2 (surname) |
| 越 | yue4, Yue4 | yue4 | Yue4 (historical/proper noun) |
| 过去 | guo4qu4, guo4qu5 | both | — |
| 难 | nan2, nan4 | nan2 | nan4 (untested — closer call, flagged as such) |
| 马 | ma3, Ma3 | ma3 | Ma3 (surname/country abbr.) |
| 骑 | ji4, qi2 | qi2 | ji4 (Taiwan/archaic) |
| 鸟 | diao3, niao3 | niao3 (corrected) | diao3 (vulgar) |
| 黄 | huang2, Huang2 | huang2 (kept as-is, incl. "pornographic" — see Observations) | Huang2 (surname) |

No group was left with zero surviving members after exclusion; this was
verified programmatically before this record was written.

## Gap-word adjudications

Sixteen words total: the ten WO-013 named as having no card at all, the five
WO-013 asked me to verify were genuinely *not* gapped, and one I found myself
during the full-deck scan. **A correction to WO-013's premise first**: the
work order states the five verification words (冬, 花, 秋, 云, 只) are "not in
the waived list." I checked `data/overrides/waived-words.json` as it stood at
the start of this review and found all five (plus a sixth, 向, not named in
the work order) **were** already present there, correctly recorded as
`conflicting-entries` waivers. The work order's premise was simply out of
date relative to the current file — this does not change what task 3 asked me
to do (confirm genuine coverage or find a real gap), and as it turned out, all
five (plus 向) were genuine gaps, not false alarms — see below.

### The ten named gap words (WO-013 task 2) — resolved: 9, unresolved: 1

| Word | Level | Conflict | Resolution |
| --- | --- | --- | --- |
| 千 (qian1) | 2 | 千 ("thousand") vs 韆 ("used in 秋千", bound form) | Resolved — 千's content |
| 它 (ta1) | 2 | 它 ("it") vs 牠 ("it", animal pronoun, Traditional/Taiwan-only) | Resolved — 它's content, the correct mainland form |
| 玩 (wan2) | 2 | 玩 ("to play") vs 翫 (pure variant character) | Resolved — 玩's content |
| 药 (yao4) | 2 | 葯 ("variant of 藥", narrow) vs 藥 ("medicine", substantive, with classifiers) | Resolved — 藥's content and classifiers |
| 打篮球 (da3lan2qiu2) | 2 | Unmatched — no CC-CEDICT entry at all | **Left unresolved, escalated** — see Escalations |
| 才 (cai2) | 3 | 才 (full content incl. essential adverbial senses) vs 纔 (pure variant character for a subset) | Resolved — 才's own content |
| 刚才 (gang1cai2) | 3 | 剛才 ("just now") vs 剛纔 (pure variant spelling) | Resolved — 剛才's content |
| 刮 (gua1) | 3 | 刮 (full content, already includes "to blow") vs 颳 ("to blow" only, a subset) | Resolved — 刮's own content, reordered for the 刮风 collocation |
| 伞 (san3) | 3 | 傘 ("umbrella", with classifier) vs 繖 (archaic, unrelated primary sense) | Resolved — 傘's content and classifier |
| 腿 (tui3) | 3 | 腿 (own content, with classifier) vs 骽 (archaic variant) | Resolved — 腿's own content and classifier |

**打篮球** is the one word left genuinely unresolved. Unlike every other case
in this review (a choice between two CC-CEDICT candidates, or a masked-gap
surname artifact), CC-CEDICT has **no entry at all** for 打篮球 — verified
directly (`grep -F "打篮球"` and the Traditional form both return nothing).
打 and 篮球 both exist as separate CC-CEDICT entries (打电话, by contrast, IS
its own lexicalised CC-CEDICT entry, which is why it shipped correctly at
HSK-1), but 打篮球 itself is not. Authoring a manual card here would mean
writing English prose ("to play basketball") that is not itself sourced from
any single CC-CEDICT line — a different kind of call than every other
adjudication in this review, which all select between existing CC-CEDICT
content. This touches DEC-017's content-sourcing principle directly enough
that I am escalating rather than deciding it myself — see Escalations.

### The five named verification words + one discovered (WO-013 task 3)

All six turned out to be genuine masked gaps: the *only* card that shipped
under the headword was a surname/place-abbreviation artifact, while the real,
common word was the one that hit `conflicting-entries` and never got a card —
exactly the "one reading ships, a different one doesn't" pattern WO-009 warned
would recur. None of these had a `homographGroup` tag, because at build time
only one candidate (the artifact) ever resolved to a card.

| Word | Level | What shipped (wrong) | What was missing (now resolved) | Conflict |
| --- | --- | --- | --- | --- |
| 冬 (dong1) | 3 | 冬:Dong1 ("surname Dong") | 冬:dong1 ("winter") | 冬 ("winter") vs 鼕/冬[dong1] ("(onom.) beating a drum", unrelated) |
| 花 (hua1) | 3 | 花:Hua1 ("surname Hua") | 花:hua1 ("flower; blossom", + 6 classifiers) | 花 (substantive) vs 芲 (non-substantive variant) vs 蘤 (largely duplicate variant) |
| 秋 (qiu1) | 3 | 秋:Qiu1 ("surname Qiu") | 秋:qiu1 ("autumn; fall; harvest time") | 秋 (substantive) vs 鞦 ("used in 秋千", bound form) |
| 云 (yun2) | 3 | 云:Yun2 ("surname Yun; short name for Yunnan") | 云:yun2 ("cloud", + classifier) | 云 ("(classical) to say", literary) vs 雲 ("cloud", the everyday word) |
| 只 (zhi1, classifier) | 3 | *(nothing — 只:zhi3 "only" already shipped correctly and is unaffected)* | 只:zhi1 (classifier for birds/animals/pairs/utensils) | 秖 ("grain that has begun to ripen", archaic) vs 隻 (the real, extremely common classifier) |
| 向 (xiang4) | 2 | 向:Xiang4 ("surname Xiang") — **found during this review's own full-deck scan, not named by WO-013** | 向:xiang4 ("towards; direction", core grammar) | 向 (substantive) vs 嚮 ("to tend toward"/variant) vs 曏 (largely duplicate variant) |

只 is the one case among these six that is not a "wrong card ships, real word
missing" masked gap — it's a **second, additional, genuinely distinct**
homograph reading (只 as a classifier, zhī) that had no card at all
alongside an already-correct 只:zhi3 ("only"). See Findings for a mechanism
gap this creates.

All six resolutions are in `data/overrides/lr-004-hsk2-3-manual-cards.json`
and are, unlike LR-002's original eight, **immediately functional** — DEC-028
already implemented card synthesis, so no further pipeline change is needed
for these to ship on the next build.

## Escalations

**1. Content-sourcing policy question (才篮球 / 打篮球, HSK-2).** CC-CEDICT
has no entry for 打篮球 ("to play basketball") at all — it is fully
compositional from 打 (a semantically light verb, "to play/do [an activity]")
and 篮球 ("basketball"), both independently in CC-CEDICT, but the specific
combination is not itself lexicalised there (unlike 打电话, 打球). Every other
adjudication in this review, and in LR-002, involved choosing between
candidate CC-CEDICT entries or CC-CEDICT-sourced content — this is the first
case where the only way to produce a card is to write English prose that is
not itself drawn from any single CC-CEDICT line. DEC-017 is explicit that
*every* piece of shipped content — Hanzi, Pinyin, English — comes from
CC-CEDICT, for licensing-cleanliness reasons, not merely a translation
convenience. I do not think this is a call I should make unilaterally:
**should the pipeline (or a reviewer, per-word) ever be allowed to author a
compositional manual card for a common HSK phrase CC-CEDICT simply never
lexicalised, sourcing the gloss from the constituent CC-CEDICT entries rather
than a single verbatim line?** If yes, "to play basketball" is the obviously
correct content and I am ready to write the override the moment this is
decided. If no, 打篮球 stays waived indefinitely (harmless: it is one word,
and the waiver already records why). Left waived, not guessed at, pending an
answer — `data/overrides/waived-words.json`'s entry for 打篮球 is updated to
note this escalation.

**2. DEC-029's vulgar-content filter has a real, demonstrated coverage gap.**
The mechanical filter added in response to LR-002's 日:ri4 finding matches
only the literal parenthetical `(vulgar)`/`(vulgar, offensive)` string. This
review found two cards — 比:bi1 ("euphemistic variant of 屄") and 鸟:diao3
("variant of 屌, penis") — that are unambiguously the same category of content
DEC-029 exists to catch, but which CC-CEDICT phrases as "euphemistic variant
of X" / "variant of X" rather than using the literal marker, so the filter
does not (and structurally cannot, as currently written) catch them. I also
found several more cases of coarse-but-not-explicit content the filter
correctly does *not* touch, because it isn't meant to (奶奶's "boobies",
绿's "to cheat on", 机场's Internet-slang sense, 踢's lesbian-slang sense,
鸟:niao3's "goddamn" intensifier) — these I corrected individually via
override, per-card, exactly as DEC-029's own rationale anticipated would keep
being necessary for content the marker-based filter can't reach. **This is
not a recommendation to expand the filter** — I don't think a keyword-based
filter can safely generalize to "any coarse register" without false-positiving
on legitimate content (DEC-029's own verification already showed
`庸俗:yong1su2` → "vulgar" as a real gloss that must NOT be filtered) — but the
owner should know that "the mechanical filter handles this" is not fully true
in practice, and every future level's review needs to budget the same
per-card manual scanning this review did (a regex sweep on
`slang|euphemis|vulgar|penis|breast|cheat on|lesbian|gay\b|lust|porn`, read by
hand) rather than assume DEC-029 already closed this out.

## Observations

1. **The masked-gap pattern (surname/artifact card ships, real word doesn't)
   is not limited to the words WO-013 already knew to ask about.** I found a
   sixth instance (向, HSK-2) purely from a full-deck scan for cards whose
   only sense looked like a bare proper noun. I recommend this scan — cheap,
   mechanical, and high-yield — become a standing step in every future
   level's review, not something re-discovered by chance each time.
2. **A new sub-pattern at this scale: country/place-name abbreviations bundled
   under an ordinary word**, distinct from surnames (元→Yuan dynasty,
   比→Belgium, 黑→Heilongjiang, 夏→Xia dynasty, 西→the West/Spain, 越→Vietnam,
   马→Malaysia, 新→Xinjiang/Singapore). Not seen at HSK-1's scale; worth
   watching for at HSK-4–6.
3. **同一 homograph pair can require excluding one sibling for two unrelated
   reasons simultaneously.** E.g. 只:zhi1 (角/脚's shared "role, variant of
   角" reading, 脚:jue2) is both non-substantive *and* would be untested at
   this level even if it were substantive — I recorded the operative reason
   only, to keep the override file's rationale focused, but a future reviewer
   should not read "excluded for reason A" as "reason B doesn't also apply."
4. **啊's five tonal readings (a1–a5) are a genuine, defensible homograph
   split, not an artifact** — the one five-way group in this review I kept
   entirely intact. Unlike every surname/bound-form pattern, these reflect
   real, systematic tone-meaning correlation in spoken Mandarin that some
   teaching materials present as a set. Worth the next reviewer knowing this
   was a deliberate keep, not an oversight.
5. **黄:huang2's "pornographic" sense was deliberately kept**, unlike the
   vulgar/crude senses this review corrected out elsewhere. 黄色 (húangsè)
   as slang for "porn/dirty" is extremely common, non-explicit register
   (comparable to English "blue" movies) — genuinely useful vocabulary, not
   gratuitous content. I want this distinction on record so a future reviewer
   doesn't "fix" it inconsistently with the corrections in this same review.
6. **This review is proportionally similar to HSK-1's, not worse.** 81 of 524
   cards (~15%) needed exclusion, vs. HSK-1's 38 of 184 (~21%) — roughly the
   same order of magnitude WO-009 predicted, slightly lower proportionally.
   The masked-gap pattern (word entirely missing, wrong card ships instead)
   recurred at a similar rate (6 instances here vs. 1 dominant instance,
   和, at HSK-1, though 都/还 were pre-anticipated there too).

## Findings

*(For Claude Code and Black; not itself part of the LR verdict, but worth
acting on.)*

1. **`CardOverride`/card synthesis has no way to set `homographGroup` on a
   newly-synthesized card, and this is now a real (not just theoretical) gap.**
   LR-002's Finding 3 was about *clearing* a now-vacuous tag after exclusion;
   this review hits the opposite, previously-unencountered case: 只:zhi3
   ("only", already shipped, untagged) and the new manual card 只:zhi1
   (classifier, this review) are genuinely two distinct readings of the same
   headword — exactly what `homographGroup` exists to link (DEC-004) — but
   neither `pipeline/match.ts` (which only assigns groups at initial
   resolution, before overrides run) nor the synthesis mechanism has any way
   to link them after the fact. They will ship as two seemingly-unrelated
   cards. Recommend: either let `CardOverride` carry an optional
   `homographGroup` field (simplest), or have `pipeline/build-cards.ts`
   recompute group membership by headword across the *final* card set
   (post-synthesis, post-exclusion) rather than only at initial match time —
   the latter would also make LR-002's Finding 3 no longer need a special
   case, since vacuous-clearing and fresh-grouping become the same
   recomputation. Not build-blocking (no gate checks this), but a real,
   now-concrete data-quality gap.
2. **Confirmed still true at this scale**: `pipeline/build-cards.ts`/
   `pipeline/exclusions.ts` correctly drop excluded cards before validation,
   so applying `data/overrides/excluded-cards.json` as authored here should
   keep `npm run build:data` green (unlike LR-002's original submission,
   which was expected to fail until DEC-028 landed). I have not run the build
   myself (out of scope) but the mechanism is the same one already verified
   working for LR-002's 38 entries.
3. **`data/overrides/waived-words.json` updated in the same change**, per
   DEC-027: the 15 words this review resolves (千, 它, 玩, 药, 才, 刚才, 刮,
   伞, 腿, 冬, 花, 秋, 云, 只, 向) are removed. 打篮球's entry is kept and its
   `detail` field updated to record this review's finding and escalation
   (Escalations §1). 累's entry (HSK-2, an extraneous "surname Lei" reading,
   harmless — the real word already ships correctly via 累:lei4) is left
   untouched, noted in Observations rather than resolved, since it is not one
   of the ten/five/one words this review was scoped to adjudicate and costs
   nothing left as-is.
