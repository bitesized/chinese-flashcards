---
id: LR-002
reviewer: Red
scope: HSK 1, full — 184 cards, plus 12 named gap words with no card at all
sampling: full — no sampling was used anywhere in this review, for any part of the task
seed: n/a (no sampling)
deck_build: dictionaryVersion 2026-08-23T06:21:07Z; wordListVersion drkameleon/complete-hsk-vocabulary@7ac65bf1a6387d35f1ade478906172a19311c7f9
date: 2026-08-25
verdict: approved with corrections
---

# LR-002 — HSK 1, full review (184 cards + 12 gap words)

## Method

Every one of the 184 cards in `public/decks/hsk-1.json` was read against every
check in [testing-strategy.md](../../engineering/testing-strategy.md) §5:
headword well-formedness, reading/tone correctness for the specific sense
shipped, gloss correspondence and learner-sensible ordering, defensibility of
any sense merge/split, correctness of homograph splits, genuine HSK-1
membership, and classifier correctness.

For unambiguous, single-reading, everyday vocabulary I verified against my own
fluency directly from the shipped JSON. For every homograph group, every
classifier, and every cross-reference-shaped sense, I additionally grepped the
pinned CC-CEDICT source (`data/source/cedict/cedict_1_0_ts_utf-8_mdbg.txt`) and
the pinned HSK source rows (`data/source/hsk/hsk-1.json`) directly, rather than
relying on the compiled output alone — this is where an error would actually
hide, per [domain-model.md](../../engineering/domain-model.md) §4 and
[DEC-022](../../project/decision-log.md). No full re-parse of the ~125k-line
CC-CEDICT file was performed; every lookup was a targeted `grep` for the
specific headword in question, kept to the minimum needed to adjudicate.

**No sampling was used anywhere in this review** — coverage is 100% of the 184
cards and 100% (12 of 12) of the named gap words, as the work order requires.
No seeded RNG was needed and none was used.

The twelve currently-unresolved HSK-1 words named in
[WO-009](../work-orders/WO-009-hsk1-linguistic-review.md) and
[WO-008's report](../reports/WO-008-report.md) were each individually
adjudicated (§ "Gap-word adjudications" below) by inspecting every candidate
CC-CEDICT entry sharing the conflicting (headword, reading) key, or, for the
two cross-reference cases, following the reference chain by hand.

## Summary

| Verdict | Count |
| --- | --- |
| Approved as generated | 142 |
| Corrected via override | 4 |
| Flagged — must not ship | 38 |
| Gap words resolved via manual override | 8 |
| Gap words left explicitly unresolved | 4 |
| Escalated to owner | 1 (policy question; see Escalations) |

142 + 4 + 38 = 184, the full deck. 8 + 4 = 12, the full gap-word list.

### Approved as generated (142)

No content or review-status change. Verified correct on every check.

```
一:yi1, 七:qi1, 三:san1, 上:shang4, 上午:shang4wu3, 下:xia4, 下午:xia4wu3, 下雨:xia4yu3, 不:bu4, 不客气:bu4ke4qi5,
东西:dong1xi1, 东西:dong1xi5, 个:ge4, 中午:zhong1wu3, 中国:Zhong1guo2, 九:jiu3, 书:shu1, 买:mai3, 了:le5, 二:er4,
五:wu3, 些:xie1, 人:ren2, 什么:shen2me5, 今天:jin1tian1, 他:ta1, 会:hui4, 住:zhu4, 做:zuo4, 儿子:er2zi5, 八:ba1,
六:liu4, 再见:zai4jian4, 写:xie3, 冷:leng3, 几:ji3, 出租车:chu1zu1che1, 分钟:fen1zhong1, 前面:qian2mian4,
北京:Bei3jing1, 医生:yi1sheng1, 医院:yi1yuan4, 十:shi2, 去:qu4, 叫:jiao4, 吃:chi1, 同学:tong2xue2, 名字:ming2zi5,
后面:hou4mian5, 吗:ma5, 听:ting1, 呢:ne5, 哪:na3, 商店:shang1dian4, 喂:wei2, 喜欢:xi3huan5, 喝:he1, 四:si4,
在:zai4, 坐:zuo4, 块:kuai4, 多:duo1, 多少:duo1shao3, 多少:duo1shao5, 大:da4, 天气:tian1qi4, 太:tai4, 女儿:nv3er2,
她:ta1, 好:hao3, 妈妈:ma1ma5, 字:zi4, 学习:xue2xi2, 学校:xue2xiao4, 学生:xue2sheng5, 对不起:dui4bu5qi3, 小:xiao3,
小姐:xiao3jie5, 少:shao3, 工作:gong1zuo4, 开:kai1, 很:hen3, 怎么:zen3me5, 怎么样:zen3me5yang4, 想:xiang3, 我:wo3,
我们:wo3men5, 打电话:da3dian4hua4, 时候:shi2hou5, 明天:ming2tian1, 昨天:zuo2tian1, 是:shi4, 月:yue4, 有:you3,
朋友:peng2you5, 本:ben3, 来:lai2, 杯子:bei1zi5, 桌子:zhuo1zi5, 椅子:yi3zi5, 水:shui3, 水果:shui3guo3, 汉语:Han4yu3,
没:mei2, 没关系:mei2guan1xi5, 漂亮:piao4liang5, 火车站:huo3che1zhan4, 点:dian3, 热:re4, 爱:ai4, 爸爸:ba4ba5,
狗:gou3, 猫:mao1, 现在:xian4zai4, 电影:dian4ying3, 电脑:dian4nao3, 电视:dian4shi4, 的:de5, 看:kan4,
看见:kan4jian4, 睡觉:shui4jiao4, 米饭:mi3fan4, 老师:lao3shi1, 能:neng2, 苹果:ping2guo3, 茶:cha2, 菜:cai4,
衣服:yi1fu5, 认识:ren4shi5, 说话:shuo1hua4, 请:qing3, 读:du2, 谁:shei2, 谢谢:xie4xie5, 这:zhe4, 那:na4, 都:dou1,
钱:qian2, 零:ling2, 飞机:fei1ji1, 饭馆:fan4guan3, 高兴:gao1xing4
```

## Corrections

Committed to `data/overrides/lr-002-hsk1-corrections.json`. These are content
edits to already-shipped, otherwise-correct cards — none change the headword or
reading, only sense wording/ordering.

| Card id | Field | Generated | Corrected to | Rationale |
| --- | --- | --- | --- | --- |
| 先生:xian1sheng5 | senses | ["teacher","gentleman; sir; mister (Mr.)","husband","(dialect) doctor"] | ["gentleman; sir; mister (Mr.)","husband","teacher","(dialect) doctor"] | Reordered only. Leading with "teacher" is misleading for a beginner: in modern Mandarin this is a comparatively rare/regional sense, while "Mr./sir" (X先生) and "husband" are the dominant HSK-1-relevant uses. 老师 (already HSK-1) is the standard word for teacher. Check 3. |
| 日:ri4 | senses | [...,"(bound form) Japan (abbr. for 日本)","(vulgar) to fuck; to have sex with"] | [...,"(bound form) Japan (abbr. for 日本)"] | Dropped the vulgar sense. Accurate CC-CEDICT content, but 日 (sun/day/date) is one of the first characters an absolute beginner learns; surfacing an unrelated vulgar slang sense unprompted, with no context, serves no HSK-1 purpose. See Escalations for the broader policy question. |
| 星期:xing1qi1 | senses | ["week","day of the week","Sunday"] | ["week","day of the week","(used alone, colloquially) Sunday"] | Added a qualifier. CC-CEDICT's bare "Sunday" is genuine (星期 alone can colloquially mean Sunday, paralleling 礼拜), but unqualified it risks a beginner concluding 星期 generally means "Sunday" rather than "week". Check 3. |
| 哪:nei3 | senses | ["which? (interrogative, followed by classifier or numeral-classifier)"] | ["which? (colloquial pronunciation of 哪, used before a classifier or numeral-classifier)"] | Clarified the connection to 哪:na3. Without it, a beginner seeing two 哪 cards with near-identical meaning but different readings could reasonably think they're unrelated words rather than a genuine, common pronunciation variant (哪个 → něige) of the word already taught as 哪:na3. Kept as its own approved card (něi is real and frequent), not flagged. |

## Flagged

Committed to `data/overrides/lr-002-hsk1-flags.json` — 38 cards. **These
currently ship (all 184 cards are physically written to `public/decks/hsk-1.json`
regardless of validation result — `pipeline/build-data.ts`'s `main()` writes
decks before checking `validation.ok`), but per
[testing-strategy.md](../../engineering/testing-strategy.md) §3 gate 8 / §8 of
data-pipeline.md, any card with `review: 'flagged'` fails `npm run build:data`.
Applying this override file will turn the build red until the mechanism gap
below is closed** — this is intentional and expected, not a mistake; see
Findings.

**What's wrong, in every case:** each of these 38 cards is linguistically
*correct* CC-CEDICT content — I found no mistranslation or wrong tone among
them — but each is a reading of a headword that is **not part of the official
~150-word HSK-1 syllabus**. All 38 exist only because the pinned HSK source
list nests every CC-CEDICT-known reading of a headword under one entry
(documented and anticipated in advance in
[`data/source/hsk/SOURCE.md`](../../../data/source/hsk/SOURCE.md) §5.3, using
都/还 as the worked example, and in
[DEC-022](../../project/decision-log.md)). Four sub-patterns recur:

- **Surname readings** (12): 三:San1, 和:He2, 冷:Leng3, 水:Shui3, 能:Neng2,
  坐:Zuo4, 年:Nian2, 里:Li3, 钱:Qian2, 那:Na1, 那:Nuo2, 都:Du1.
- **Bound forms with no independent meaning** ("used in X" only) (4):
  个:ge3, 上:shang3, 吗:ma3, 哪:ne2.
- **Archaic / literary / register-specific readings** (11): 书:Shu1, 了:liao4,
  听:yin3, 呢:ni2, 那:nuo2, 和:he4, 和:hu2, 和:huo2, 和:huo4, 哪:na5, 没:mo4.
- **Real, valid, but not-tested-at-HSK-1 secondary readings** (11): 会:kuai4,
  喝:he4, 好:hao4, 少:shao4, 看:kan1, 读:dou4, 的:di1, 的:di2, 的:di4, 都:du1.

(That totals 38.) Full per-card rationale, citing the specific gloss and its
correct sibling card, is in the `note` field of each entry in
`data/overrides/lr-002-hsk1-flags.json`.

**What needs to happen next** (acceptance criterion 4): none of these cards can
be fixed by better content — there is no correction that makes a surname
reading appropriate HSK-1 vocabulary. The current override schema
(`pipeline/overrides.ts`) can only *modify* an existing card's fields; it has
no way to *remove* a card from a deck. `review: 'flagged'` is the only lever
available to say "must not ship," but per data-pipeline.md §8 it fails the
whole `npm run build:data` run (all six decks), not just HSK-1, and leaves the
card sitting in `public/decks/hsk-1.json` with `review: 'flagged'` forever
until something removes it — there is no way to "un-flag by shipping." **Black
needs to add a card-exclusion mechanism** — see Findings for the recommended
shape. This is not a dead end: it is a scoped, well-precedented piece of work
(structurally similar to `waived-words.json`), and I already have all 38
cards' correct dispositions on record here.

## Homograph adjudications

Every homograph group in the deck, with which reading(s) I judged genuinely
HSK-1-intended (✓ = approved/corrected, ✗ = flagged, must not ship):

| Group | Readings found (this build) | Readings kept | Rationale |
| --- | --- | --- | --- |
| 三 | san1 ✓, San1 ✗ | san1 | San1 is "surname San" — source-list artifact. |
| 上 | shang3 ✗, shang4 ✓ | shang4 | shang3 is bound-form ("used in 上声"). |
| 个 | ge3 ✗, ge4 ✓ | ge4 | ge3 is bound-form ("used in 自个儿"). |
| 书 | shu1 ✓, Shu1 ✗ | shu1 | Shu1 is the archaic Confucian-classic proper noun. |
| 了 | le5 ✓, liao3 (gap — declined), liao4 ✗ | le5 | liao4 is an orthographic-variant note; liao3 declined (see gap adjudications). |
| 冷 | leng3 ✓, Leng3 ✗ | leng3 | Leng3 is "surname Leng". |
| 会 | hui4 ✓, kuai4 ✗ | hui4 | kuai4 is bound-form ("to reckon accounts"). |
| 吗 | ma2 ✗, ma3 ✗, ma5 ✓ | ma5 | ma2/ma3 are rare colloquial/bound readings. |
| 听 | ting1 ✓, yin3 ✗ | ting1 | yin3 is archaic ("smile"). |
| 呢 | ne5 ✓, ni2 ✗ | ne5 | ni2 is a specialised textile noun. |
| 和 | He2 ✗, he2 (gap — resolved), he4 ✗, hu2 ✗, huo2 ✗, huo4 ✗ | he2 (via manual override) | he2 "and" was the one missing entirely; all five shipped readings are surname/literary/game/technical and not HSK-1. |
| 哪 | na3 ✓, na5 ✗, ne2 ✗, nei3 ✓ (corrected) | na3, nei3 | na5/ne2 are a phonological particle and a bound proper-noun form respectively; nei3 is a genuine common pronunciation variant, gloss clarified. |
| 喝 | he1 ✓, he4 ✗ | he1 | he4 "to shout" is much rarer than "to drink". |
| 坐 | zuo4 ✓, Zuo4 ✗ | zuo4 | Zuo4 is "surname Zuo". |
| 好 | hao3 ✓, hao4 ✗ | hao3 | hao4 (爱好/好奇-type usage) is not HSK-1. |
| 少 | shao3 ✓, shao4 ✗ | shao3 | shao4 (少年/少女-type usage) is not HSK-1. |
| 年 | Nian2 ✗, nian2 (gap — resolved) | nian2 (via manual override) | Nian2 is "surname Nian"; the real word 年 was the one missing. |
| 水 | shui3 ✓, Shui3 ✗ | shui3 | Shui3 is "surname Shui / Shui ethnic group". |
| 能 | neng2 ✓, Neng2 ✗ | neng2 | Neng2 is "surname Neng". |
| 钱 | qian2 ✓, Qian2 ✗ | qian2 | Qian2 is "surname Qian". |
| 看 | kan1 ✗, kan4 ✓ | kan4 | kan1 (看守/看护-type usage) is not HSK-1. |
| 读 | dou4 ✗, du2 ✓ | du2 | dou4 is a rare grammatical-terminology reading ("comma"). |
| 没 | mei2 ✓, mo4 ✗ | mei2 | mo4 is a literary reading ("drowned; to die"). |
| 的 | de5 ✓, di1 ✗, di2 ✗, di4 ✗ | de5 | di1/di2/di4 are an abbreviation, a literary adverb, and a bound form, none HSK-1. |
| 都 | dou1 ✓, du1 ✗, Du1 ✗ | dou1 | The exact case pre-flagged in SOURCE.md §5.3 and DEC-022; du1 "capital city" and Du1 "surname Du" are not HSK-1. |
| 那 | Na1 ✗, na3 (gap — declined), na4 ✓, nuo2 ✗, Nuo2 ✗ | na4 | Na1/Nuo2 are surnames, nuo2 is archaic; na3 declined (see gap adjudications). |
| 里 | Li3 ✗, li3 (gap — resolved) | li3 (via manual override) | Li3 is "surname Li"; the real locative word 里 was the one missing. |
| 几 | ji1 (gap — declined), ji3 ✓ | ji3 | ji3 "how many" already ships correctly; ji1's two candidates are both non-HSK-1 (see gap adjudications). |
| 东西 | dong1xi1 ✓, dong1xi5 ✓ | both | Two genuinely distinct, both HSK-1-plausible words ("east and west" / "thing"), correctly split. |
| 多少 | duo1shao3 ✓, duo1shao5 ✓ | both | Two genuinely distinct, both HSK-1 words ("amount" / "how much?"), correctly split. |

## Gap-word adjudications

All twelve words named in WO-009 are adjudicated below. None left silently
un-adjudicated (acceptance criterion 3).

### Resolved via manual override (8) — `data/overrides/lr-002-hsk1-manual-cards.json`

| Word | Conflict | Chosen candidate | Rationale |
| --- | --- | --- | --- |
| 你 (ni3) | 你 ("you, informal") vs 妳 ("you", Taiwan female-only) | 你 | Standard, gender-neutral, actually-used form; 妳 is CC-CEDICT's own "not commonly used [in mainland]" variant. |
| 和 (he2) | 和 ("and/with/sum/...") vs 龢 ("(literary) harmonious, variant of 和") | 和 | The single most essential HSK-1 sense of this headword; 龢 is an archaic character variant misclassified as substantive because its "variant of X" phrase is mid-sentence, not leading. |
| 回 (hui2) | 回 ("to return", classifier) vs 迴 ("to curve/revolve", literary) | 回 | Everyday word (回家, 回来); 迴 is classical register. |
| 家 (jia1) | 家 ("home/family") vs 傢 ("used in 傢伙/傢俱" only) | 家 | 家 is core vocabulary; 傢 has no independent meaning. |
| 里 (li3) | 裡 ("interior/inside/internal") vs 里 ("li, unit of distance ~500m; neighborhood") | 裡's content | The ubiquitous locative suffix (这里, 家里) every beginner needs; the distance unit is specialised/historical. |
| 年 (nian2) | 年 ("year") vs 秊 ("grain/harvest (old)", variant of 年) | 年 | Core vocabulary; 秊 is archaic. |
| 岁 (sui4) | 嵗 ("variant of 歲, year; years old") vs 歲 ("classifier for years of age; year") | 歲's content | The standard age-classifier usage (五岁); 嵗 is an archaic variant character. |
| 喂 (wei4) | 喂 ("hey/to feed") vs 餵 ("to feed" only) vs 餧 (cross-reference, auto-excluded) | 喂 | Complete candidate (has both "hey" and "to feed"); already Simplified=Traditional. |

Every one of these overrides is currently **inert under the pipeline as it
stands** — see Findings. The content and rationale are ready; a pipeline
change is needed before they ship.

### Explicitly left unresolved (4) — no override authored

| Word | Reason |
| --- | --- |
| 几 (ji1) | Two candidates — 几 ("small table") and 幾 ("(literary) almost") — neither is HSK-1-appropriate. This is moot for level coverage: 几:ji3 ("how many; several") already ships correctly and is the genuine HSK-1 item under this headword. Leaving ji1 unresolved costs nothing. |
| 了 (liao3) | Two candidates — 了 ("to finish; (im)possibility marker, as in 忘不了") and 瞭 ("clear in one's mind; to understand", bound form as in 了解/明了) — both are real words, but I judge neither is part of the official HSK-1 150-word list as a *separate* tested item from 了(le), which already ships correctly. Consistent with the already-shipped (but here flagged) 了:liao4 sibling, this looks like the same source-list over-nesting pattern rather than a second genuine HSK-1 vocabulary item. Declined; a future reviewer revisiting HSK-3 (where 了解 belongs) may find this needs revisiting for that level, not HSK-1. |
| 大 (dai4) | Cross-reference "see 大夫" — 大夫 itself has two CC-CEDICT entries, 大夫(dà fū, "senior official") and 大夫(dài fu, "doctor"); the pipeline's automatic cross-reference resolver correctly bails on the ambiguity. The tone dai4 unambiguously disambiguates to the "doctor" reading (dà fū is pronounced da4, not dai4) — if resolved, the target is not in question. But I judge this bound reading (which only ever appears inside the compound 大夫) is not independently HSK-1-taught vocabulary — the same "used in X" pattern as 个:ge3/上:shang3/吗:ma3/哪:ne2, which I flag elsewhere in this same review. Declined for consistency, with the disambiguation on record for whoever revisits it. |
| 那 (na3) | Cross-reference "variant of 哪" — an unambiguous target (哪 as "which/how" is already correctly taught as 哪:na3). But 那(na3) is a rare orthographic-variant-character usage, not a second independently-taught HSK-1 item; shipping a duplicate card under a different, rarer headword for a meaning already correctly taught under 哪 would not serve a beginner. Declined. |

## Escalations

**One policy question for the project owner**, arising from the 日:ri4
correction above: CC-CEDICT contains a number of vulgar/NSFW senses attached
to otherwise entirely ordinary headwords (日 is one; there may be others
elsewhere in the corpus, not yet surveyed since only HSK-1 has been reviewed).
I removed 日's vulgar sense as a one-off, per-card call under check 3
("glosses... not misleading out of context"), but this is really a
project-wide content-policy question I'm not positioned to settle unilaterally:
**should the pipeline filter vulgar/NSFW CC-CEDICT senses everywhere, given the
app may be used in educational settings with younger learners, or is a
per-card review call (mine) the intended mechanism at every level?** If the
former, this is a mechanical filter Black could implement once (e.g. a
register-marker denylist) rather than something I re-catch by hand at HSK
2 through 6.

## Observations

1. **The homograph-artifact pattern is large and systemic, not a few
   one-offs.** 38 of 184 shipped HSK-1 cards (~21%) are readings that do not
   belong in a beginner deck — overwhelmingly surname readings, bound forms
   with no independent meaning, and archaic/literary registers. This
   confirms, at scale, exactly the risk `data/source/hsk/SOURCE.md` §5.3 and
   [DEC-022](../../project/decision-log.md) anticipated from the pinned word
   list's form-bundling behaviour. I expect a comparable *proportion* (not
   necessarily the same raw count) to recur at HSK 2–6, so the follow-on
   HSK-2/3 review (due before M3 per DEC-025) should budget real time for
   this, not treat it as a surprise.
2. **The most consequential specific finding**: 和 (hé, "and") — one of the
   single most common words in the language — was entirely missing from the
   HSK-1 deck, while five much rarer readings of the same headword (a
   surname and four literary/technical readings) shipped as unreviewed
   cards. This is the clearest illustration of why check 6 (level
   membership) matters as much as tone/gloss accuracy: an HSK-1 deck that is
   *missing* 和 but *has* 和(hú) "to win at mahjong" would have been a real,
   invisible defect if this review hadn't caught it.
3. **`CardOverride` cannot represent `homographGroup`.** Once the 38 flagged
   cards are actually excluded (see Findings), several surviving sibling
   cards (三:san1, 上:shang4, 个:ge4, 书:shu1, 冷:leng3, 会:hui4, 吗:ma5,
   听:ting1, 呢:ne5, 喝:he1, 坐:zuo4, 好:hao3, 少:shao3, 看:kan4, 读:du2,
   没:mei2, 的:de5, 都:dou1, 那:na4, and 大:da4 once its dai4 sibling is
   permanently absent) will be the sole member of a `homographGroup` that no
   longer has two members — a vacuous tag, not itself build-breaking (no
   gate checks this — see Findings) but a genuine data-quality loose end.
   `pipeline/overrides.ts`'s `CardOverride` interface has no
   `homographGroup` field, so I cannot clean this up via override even if I
   wanted to; it should be handled by whatever mechanism implements card
   exclusion (recompute homograph membership after exclusion, or provide a
   way to clear the field).

## Findings

*(For Claude Code and Black; not itself part of the LR verdict, but required
reading before integrating this review — see the Work Report for the same
material framed as acceptance-criterion evidence.)*

1. **The override mechanism cannot create a new card.**
   `pipeline/overrides.ts`'s `applyOverrides` only ever mutates a `Card`
   already produced by `pipeline/match.ts`'s `matchAndResolve` — for every
   `conflictingEntries` and `unresolvedCrossReferences` case,
   `matchAndResolve` explicitly `continue`s without pushing anything into
   `cards`, so there is no base object for an override to attach to. This is
   already flagged in `overrides.ts`'s own docstring as unimplemented
   ("NOT implemented here... Building an unspecified schema now risks
   guessing wrong"). My 8 resolved gap-word overrides in
   `data/overrides/lr-002-hsk1-manual-cards.json` use the existing
   `CardOverride` field set in full (`headword`, `reading`, `readingNumeric`,
   `senses`, `classifiers`, `levels`, `source: 'manual'`, `review`) — every
   field a full `Card` needs except `id` (implied by the object key) — on the
   theory that this is the natural, minimal extension: **recommend
   `applyOverrides` (or a new function alongside it) synthesize a full `Card`
   from an override whose id matches no existing card, when the override
   supplies the complete required field set (`headword`, `reading`,
   `readingNumeric`, `senses`, `levels`)**, rather than reporting it as
   merely orphaned. Until this exists, my 8 resolutions are correct and
   ready but inert — they will show up as "orphaned" in the build report
   and silently fail to ship, which is exactly the kind of silent gap this
   project's design principles (data-pipeline.md §6) exist to prevent. I am
   flagging this loudly rather than letting Claude Code discover it as an
   unexplained orphaned-override warning.
2. **The override mechanism cannot exclude a card.** Symmetric problem: for
   the 38 flagged cards, there is no way to make them not ship other than
   `review: 'flagged'`, which fails the whole six-level build per
   data-pipeline.md §8, and does not remove the card from
   `public/decks/hsk-1.json` (`pipeline/build-data.ts`'s `main()` writes
   every deck file before checking `validation.ok`) — so a flagged card sits
   in the output forever with a build permanently red, not merely "excluded
   this run." **Recommend**: a new mechanism, structurally parallel to
   `data/overrides/waived-words.json`/`pipeline/waivers.ts`
   ([DEC-027](../../project/decision-log.md)) — e.g.
   `data/overrides/excluded-cards.json`, a committed, keyed-by-id list with
   reason/reviewer/date, checked by `pipeline/build-cards.ts` (or a new
   `pipeline/exclusions.ts`) to drop the card from `cardsByLevel` entirely
   after matching/override and before validation. This would let `review:
   'flagged'` keep its original meaning (a live, in-corpus card with an
   unresolved problem still under discussion) distinct from "Red has already
   made a final, considered call that this must never ship" (exclusion) —
   two different states this project currently conflates into one lever.
   Applying `data/overrides/lr-002-hsk1-flags.json` as authored will fail
   `npm run build:data` until one of these is built; that is expected, not a
   mistake on my part (see Flagged section above and this LR's Escalations
   for how I'd like this handled if the timeline is a concern).
3. **`data/overrides/waived-words.json` must stay untouched until finding 1
   is resolved.** I deliberately did NOT remove the 你/和/回/家/里/年/岁/喂
   waiver entries, even though DEC-027 says a waiver should be removed once
   a real override resolves the word — because my overrides do not yet
   resolve them (finding 1). Removing the waivers now, before the mechanism
   exists, would make `npm run build:data` fail *harder* (an unresolved,
   un-waived level-coverage gap) rather than merely warn (an orphaned
   override). Once finding 1 is fixed and these 8 words genuinely produce
   cards, their waiver entries should be removed in the same change, per
   DEC-027.
4. **Minor, non-blocking**: `了:liao3`'s conflicting-entries case
   (了 "to finish" vs 瞭 "to understand clearly") is a closer call than most
   of the other gap words — both candidates are real, moderately common
   words, unlike the surname/archaic pairs. I declined it for HSK-1
   consistency reasons stated above, but flag it explicitly as the one gap
   adjudication where a different, reasonable reviewer might disagree with
   me; it is not in the same "obviously an artifact" category as, say, 几's
   "small table" vs "(literary) almost" pairing.
