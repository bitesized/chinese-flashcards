# Technical Architecture

Elaborates on [CLAUDE.md](../../CLAUDE.md) §03. Owner: **Black**, with **White** owning
everything inside the view layer. Status: **Proposed — not ratified.** The stack in
§3 is a recommendation; see [OQ-1](../project/open-questions.md) and
[DEC-001](../project/decision-log.md).

---

## 1. Shape of the system

CLAUDE.md requires a web application, desktop and mobile, with **no synchronisation
in v1**. No sync means no user data leaves the device, which means **v1 needs no
server at all** beyond static file hosting.

```
  Build time (developer machine / CI)          Run time (user's browser)
  ─────────────────────────────────────        ──────────────────────────────
  CC-CEDICT source file                        Static host (CDN)
  HSK level word lists                              │
  Manual override files                             ▼
          │                                   App shell (HTML/CSS/JS)
          ▼                                         │
  Data pipeline (Node/TS)                           ├── Service worker (cache)
          │                                         │
          ▼                                         ├── Deck JSON, per level
  Compiled deck JSON  ──────────────────────►       │      (fetched on demand)
  Font subset                                       │
  Build report                                      └── Web Speech API (TTS)
                                                          │
                                                    IndexedDB / localStorage
                                                      (settings, session)
```

The consequence worth stating plainly: **all dictionary processing happens at build
time.** The browser never parses CC-CEDICT. It fetches a small, clean, pre-validated
JSON file per level. This is what makes NFR-1 and NFR-4 achievable.

## 2. Architectural decisions and why

| Decision | Rationale |
| --- | --- |
| **No backend in v1** | Nothing in CLAUDE.md requires one. No accounts, no sync, no server-side state. Adding a backend would add cost, latency, an attack surface, and an operational burden for zero user-visible benefit. |
| **Static hosting** | The entire app is cacheable at the edge. Directly serves NFR-1. |
| **Offline-first PWA** | NFR-5 and FR-51. "Usable on a phone" in practice means usable on a train. |
| **Per-level deck bundles** | HSK 6 is ~2,500 words. Shipping all ~5,000 as one payload would violate NFR-4. Levels are fetched individually and cached after first use. |
| **Build-time data compilation** | Correctness is checked once, in CI, by tooling and by Red — not on every device on every load. |
| **Client-side storage only** | No account (FR-50), no privacy surface, no GDPR question. |

## 3. Recommended stack

**Proposed. Awaiting ratification — see [OQ-1](../project/open-questions.md).**

| Layer | Choice | Reasoning |
| --- | --- | --- |
| Scheduler | **FSRS**, via a pinned open-source TypeScript implementation | See [scheduling](scheduling.md) §2. Not hand-implemented — a mis-implemented scheduler fails silently |
| Language | **TypeScript**, strict | The data model has sharp edges — homographs, optional fields, six level labels. Types catch these in the pipeline before they reach a card. |
| Build tool | **Vite** | Fast, minimal config, first-class TS, good PWA plugin support. |
| UI | **React** | The UI is small; the reason to choose a framework at all is component structure and ecosystem, not complexity. Preact is a legitimate lighter alternative if NFR-3 proves tight. |
| Styling | **CSS Modules + custom properties for design tokens** | Deliberately *not* a utility-class framework. CLAUDE.md asks White for a distinctive design; utility frameworks bias strongly toward the exact house style §2 of the [UX spec](../product/ux-specification.md) rules out. Custom properties also make theming (FR-54) trivial. |
| State | React state + context, persisted through a thin storage module | The state is: current deck, index, face, and settings. A state-management library would be ceremony. |
| Routing | Minimal — three views | A full router is optional; revisit only if deep-linking to a level is wanted. |
| PWA | `vite-plugin-pwa` (Workbox) | App shell precached; deck JSON cached at runtime, cache-first. |
| Speech | **Web Speech API** (`speechSynthesis`) | Built in, free, offline on most platforms. Constraints in §5. |
| Testing | **Vitest** + **Testing Library** + **Playwright** | See [testing-strategy](testing-strategy.md). |
| Pipeline | **Node + TypeScript**, run as an npm script and in CI | Same language as the app; the deck schema type is shared between pipeline and runtime. |
| Hosting | Any static host (Cloudflare Pages, Netlify, GitHub Pages) | No server requirement. Decide at M5. |

**Explicitly rejected for v1:** Next.js or any SSR/meta-framework (there is nothing
to render on a server); a *server-side* database; an ORM; a component library (fights the design
brief); a CSS-in-JS runtime (costs NFR-2 for no benefit here).

## 4. Storage model

| Data | Store | Reason |
| --- | --- | --- |
| Settings — Pinyin toggles, order, speech rate, theme | `localStorage`, one namespaced JSON key | Tiny, synchronous read at boot avoids a flash of wrong state |
| Current session position | `sessionStorage` | FR-36 scopes resume to the browser session |
| **Card progress and review log** | **IndexedDB** | Thousands of records, written on every grade, queried by due date. Too large and too write-heavy for `localStorage`, which is synchronous and would block the main thread on every card |
| Deck JSON | Cache Storage, via service worker | Managed by Workbox alongside the app shell |
| **Custom decks** ([DEC-036](../project/decision-log.md)) | `localStorage`, one namespaced JSON key | Same tier as Settings — expected small (tens to low hundreds of cards per learner), not the thousands `CardProgress` deals with, so IndexedDB's extra complexity isn't earned |
| CC-CEDICT lookup index/detail shards ([DEC-037](../project/decision-log.md)) | Fetched via `fetch`, cached in memory for the page's life (`services/cedictLookup.ts`) | Read-only reference data, not learner state — same per-session, in-memory cache pattern `services/decks.ts` already uses for HSK decks, not a new storage tier |

All storage access goes through a single `storage` module with a schema version
field. Nothing in the UI touches `localStorage` or IndexedDB directly — that seam
is what lets sync be added post-v1 without a rewrite, and it is where the
export/import of FR-69 is implemented. (The CC-CEDICT lookup dataset is the one
deliberate exception — it is not learner state, has no schema version of its
own to migrate, and is refetched fresh, from a build-pinned source, on every
page load that needs it.)

**Durability is a first-class concern**, not an afterthought, because spaced
repetition means the app holds months of irreplaceable history and CLAUDE.md §03
defers sync. `navigator.storage.persist()` is requested on first meaningful use
(NFR-16), and export/import is a MUST (FR-69). Reasoning in
[scheduling](scheduling.md) §6.

## 5. Text-to-speech: constraints

FR-40 to FR-43 depend on `window.speechSynthesis`, whose behaviour varies by
platform in ways that will otherwise produce bugs late. Black must design for these
from the start:

1. **`getVoices()` is asynchronous and initially empty.** It populates after the
   `voiceschanged` event. Querying once at module load will find nothing on most
   browsers. Resolve voices through a promise that waits for the event, with a
   timeout fallback.
2. **Mandarin voice availability is not guaranteed.** iOS ships a `zh-CN` voice.
   Desktop Chrome and Edge generally do. Firefox depends entirely on the OS
   (`speech-dispatcher` on Linux frequently has none). Android depends on the
   installed Google TTS language pack. FR-43 exists because of this: detect, and
   degrade visibly.
3. **Voice selection must match `zh-CN` / `zh-Hans`, not merely `zh`.** A `zh-TW`
   or `zh-HK` voice will read with Taiwanese or Cantonese pronunciation. Prefer an
   exact `zh-CN` match, then any `zh-Hans`, then reject.
4. **iOS requires speech to begin inside a user-gesture handler.** This is a
   further reason FR-41 makes playback explicit. If autoplay-on-reveal (FR-46) is
   implemented, the reveal tap is itself the gesture — the call must happen
   synchronously within that handler, not after an await.
5. **Cancel before speaking.** Rapid card advancing otherwise queues utterances.
   Call `speechSynthesis.cancel()` before each `speak()`.
6. **Speak the Hanzi, not the Pinyin.** Passing Pinyin to a `zh-CN` voice produces
   nonsense. Set `utterance.lang = 'zh-CN'` explicitly regardless of document
   language.

A fallback of pre-generated audio files is **out of scope for v1** — it would add
several hundred megabytes of assets and a licensing question. Logged as
[RISK-4](../project/risk-register.md).

## 6. Performance approach

Mapping to NFR-1 through NFR-4:

- App shell precached by the service worker; repeat loads are network-independent.
- Deck JSON fetched on demand, one level at a time, cached after first fetch.
- CJK font subset generated by the pipeline from the actual character inventory of
  the decks — the single largest available saving. An unsubsetted CJK face is
  megabytes; the subset is tens of kilobytes.
- No external requests at runtime (NFR-12), so no third-party DNS, TLS, or
  render-blocking.
- Flip animation runs on `transform` and `opacity` only, so it stays on the
  compositor and holds NFR-2.
- Deck arrays are held in memory for the session; no re-fetch on navigation.

## 7. Extensibility seams

CLAUDE.md §01 anticipates other languages. v1 builds none, but three seams cost
nothing now and would be expensive to retrofit:

1. Deck files carry an explicit `language` field, and the loader keys on it.
2. The card model separates *written form*, *phonetic aid*, and *meaning* rather
   than naming its fields Hanzi/Pinyin/English. See
   [domain-model](domain-model.md) §2.
3. The speech module takes a BCP-47 language tag as a parameter rather than
   hard-coding `zh-CN`.

No further generalisation is to be built speculatively.

## 8. Security and privacy

Small surface, but it should be stated:

- No user data is transmitted anywhere. No analytics (NFR-12).
- **Custom decks** ([DEC-036](../project/decision-log.md)) are a real,
  corrected exception to this section's original "no user-generated content
  in v1" line: a learner-authored deck, and especially an imported `.json`
  file from another learner, is untrusted input. `services/customDecks.ts`'s
  `validateImportedDeck` is the boundary — every field type- and
  length-checked before it reaches storage or the UI (domain-model.md §10's
  limits), and a successful import always mints a fresh local id rather than
  overwriting an existing deck.
- Dictionary glosses, and now custom-card content (hand-typed or CC-CEDICT
  lookup-sourced, [DEC-037](../project/decision-log.md)) alike, are **data**,
  not markup: rendered as text nodes, never via `innerHTML` — the same
  discipline extended to the new surface, not a separate rule for it.
- A strict Content-Security-Policy is served; `default-src 'self'` is achievable
  because there are no external hosts.
- Dependencies are kept minimal and audited in CI. Every added runtime dependency
  requires Black's justification in the work order.
