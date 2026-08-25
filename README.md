# Chinese Flashcards

A spaced-repetition flashcard app for learning Mandarin Chinese, built on
the [CC-CEDICT](https://cc-cedict.org/) dictionary and the official HSK
vocabulary levels (1 through 6).

## Capabilities

- **Flip cards** between a Chinese character (or word) and its English
  meaning, with a Pinyin pronunciation guide you can show or hide
  independently on either side.
- **Listen** to any word spoken aloud in Mandarin, with an adjustable
  playback speed.
- **Study one level or several together** — select any combination of HSK
  levels for a combined session, and your last selection is remembered
  automatically.
- **Light and dark appearance**, following your system setting or set
  manually.
- Built mobile-first: comfortable to use one-handed on a phone, not just a
  shrunken desktop layout.

## Vocabulary coverage

Vocabulary is compiled from CC-CEDICT and organised into the six official
HSK levels. HSK 1 has been fully reviewed for accuracy by a fluent
Mandarin speaker; the remaining levels are compiled and functional, with
review of the next levels in progress. Only reviewed levels are shown as
available to study.

## Roadmap

- [x] Vocabulary pipeline covering all six HSK levels
- [x] Core flashcard study experience
- [x] Spoken pronunciation
- [x] Multi-level study sessions
- [ ] Full linguistic review of every HSK level
- [ ] Spaced repetition — the app decides what you're due to review, and
      when, instead of you paging through a whole level
- [ ] Offline support / installable app
- [ ] Public deployment

## Running it locally

Requires [Node.js](https://nodejs.org/) 20.19 or later.

```bash
npm install
npm run build:data   # compiles the vocabulary decks from source data
npm run dev          # starts a local dev server
```

Run the test suite with `npm test`.

## Deployment

The app is a static site — no backend or server required — and hasn't
been deployed publicly yet. It's designed to run on any static host.

## License

Application source code is licensed under **GPL-3.0**. Vocabulary data
derived from CC-CEDICT (everything under `data/` and `public/decks/`) is
distributed under **CC BY-SA 4.0**, as required by CC-CEDICT's own
license — see [`data/LICENSE`](data/LICENSE) for the full terms and
attribution.
