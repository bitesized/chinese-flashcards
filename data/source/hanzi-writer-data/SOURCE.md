# Stroke-order data — source record

Owner: **Black**. Pinned per [DEC-035](../../../docs/project/decision-log.md).
Used to compile `public/strokes/*.json` — one file per individual Hanzi
character actually used across the compiled HSK 1–6 decks, extracted by
[`scripts/extract-strokes.mjs`](../../../scripts/extract-strokes.mjs).

## Provenance

| Field | Value |
| --- | --- |
| Package | `hanzi-writer-data` |
| Pinned version | `2.0.1` |
| Upstream project | [Make Me A Hanzi](https://github.com/skishore/makemeahanzi), which extracted stroke outlines from two fonts by Arphic Technology Co., Ltd. |
| Repository | `github.com/chanind/hanzi-writer-data` |
| Retrieved | 2026-08-25 |

## Licence

The stroke-path data itself (not the `hanzi-writer` rendering library,
which is MIT-licensed application code) is licensed under the **Arphic
Public License** — a share-alike font licence, distinct from CC-CEDICT's
CC BY-SA 4.0. See [`public/strokes/LICENSE`](../../../public/strokes/LICENSE)
for the full text, which covers `public/strokes/` only.

## Coverage

2,619 of 2,619 individual characters used across `public/decks/hsk-{1..6}.json`
headwords have stroke data available — no gaps.

## Reproducing

`hanzi-writer-data` is **not** a project dependency — it is a one-time
extraction source, the same pattern as the pinned HSK word list
(`data/source/hsk/SOURCE.md`). To regenerate `public/strokes/` (e.g. after
a vocabulary change):

```sh
npm install hanzi-writer-data@2.0.1 --no-save
node scripts/extract-strokes.mjs
rm -rf node_modules/hanzi-writer-data
```
