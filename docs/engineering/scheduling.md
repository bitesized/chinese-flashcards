# Spaced Repetition Scheduling

Owner: **Black**, with **White** owning the grading interaction and **Red**
consulted on what constitutes a correct recall for a Chinese card.
Status: **Draft, awaiting owner ratification.**

Satisfies CLAUDE.md §02: *"The app must use spaced repetition to schedule which
cards a learner sees and when."*

---

## 1. What spaced repetition is for

Reviewing a word you already know is wasted effort; reviewing one you are about to
forget is where the learning happens. A scheduler's job is to predict, per card,
the moment just before recall fails, and to put the card in front of the learner
then. Done well it converts a fixed daily budget into far more retained vocabulary
than repetition at fixed intervals.

Two consequences shape everything below:

- **Card order stops being a display concern and becomes the product.** Shuffle
  (FR-32) now applies *within* the due set, not to the deck.
- **Progress data becomes the most valuable thing the app holds.** Months of review
  history cannot be regenerated. This drives §6.

## 2. Algorithm: FSRS

**Decision: FSRS** — the Free Spaced Repetition Scheduler, built on the DSR
(Difficulty, Stability, Retrievability) memory model. Recorded as
[DEC-013](../project/decision-log.md).

Why, against the alternatives:

| Option | Assessment |
| --- | --- |
| **Leitner boxes** | Trivially simple and easy to test, but coarse. Fixed box intervals ignore how hard a given card is for a given learner, so it over-reviews easy cards and under-reviews hard ones. |
| **SM-2** | The classic SuperMemo-2 algorithm, long used by Anki. Well documented, easy to implement correctly, decades of practical use. A sound and defensible choice. |
| **FSRS** | Models memory explicitly, with per-card difficulty and stability fitted to real review behaviour. Achieves materially better retention for the same review volume than SM-2, and is now the default scheduler in Anki. |

FSRS is chosen because the extra state it requires — a few numbers per card — costs
almost nothing here, while the scheduling quality difference is the whole point of
having a scheduler at all.

**Implementation:** an existing open-source TypeScript implementation
(`ts-fsrs`) rather than a hand-port. Scheduling algorithms fail silently when
mis-implemented: cards get intervals that are wrong but plausible, and nobody
notices for months. Black must confirm at M1 that the chosen library's licence is
GPL-3.0 compatible ([conventions](conventions.md) §4) and pin the version.

**Fallback:** if no suitable library is available, implement **SM-2**, which is
short enough to write and test exhaustively. Do not hand-implement FSRS.

## 3. Grading

After revealing the back of a card, the learner grades their recall. FSRS takes
four ratings:

| Grade | Meaning for a Chinese card |
| --- | --- |
| **Again** | Could not recall the meaning, or recalled it wrongly |
| **Hard** | Recalled, but slowly or with effort |
| **Good** | Recalled correctly, without struggle |
| **Easy** | Recalled instantly; the interval was too short |

**Red's ruling on what counts as recall** (see FR-61): for a front-to-back card,
correctness means the **meaning** was recalled. Tone errors do not by themselves
constitute failure, because the card as designed does not test production. This
must be stated in the UI's first-run guidance, or learners will grade
inconsistently and the schedule will be built on noise. If a tone-accuracy mode is
wanted later it is a separate card type, not a stricter grading rule.

The four grades are always visible on the back face; there is no hidden or implicit
grading. Grading advances to the next card, so the grade *is* the "next" action —
one interaction, not two ([UX spec](../product/ux-specification.md) §4.2).

## 4. Per-card state

```ts
type CardState = 'new' | 'learning' | 'review' | 'relearning';
type Grade = 1 | 2 | 3 | 4;   // Again, Hard, Good, Easy

interface CardProgress {
  cardId: string;              // Card.id — see domain-model.md §5
  state: CardState;
  due: string;                 // ISO 8601
  stability: number;           // FSRS: days until recall probability hits target
  difficulty: number;          // FSRS: intrinsic difficulty of this card
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  lastReview?: string;         // ISO 8601
}

interface ReviewLogEntry {
  cardId: string;
  grade: Grade;
  reviewedAt: string;          // ISO 8601
  stateBefore: CardState;
  scheduledDays: number;
  elapsedDays: number;
}
```

The **review log is append-only and is retained**. It is what makes an interval
explicable after the fact, what allows the algorithm's parameters to be re-fitted
to the learner later, and what makes a scheduling bug diagnosable rather than
merely reported. It is small: one entry is well under 100 bytes, and a heavy year
of study is a few megabytes.

Progress is keyed on `Card.id`, which is deterministic
([DEC-005](../project/decision-log.md)), so progress survives a deck rebuild and a
CC-CEDICT update.

## 5. Session composition

A study session is assembled, not shuffled from a list:

1. **Due review cards**, in ascending due date, shuffled within the same date so
   the same order is not repeated daily.
2. **Learning and relearning cards** whose short interval has elapsed, interleaved.
3. **New cards**, up to the daily new-card limit (FR-65), drawn from the selected
   level in list order — new vocabulary is best met in syllabus order, not at
   random.

If nothing is due and the new-card limit is exhausted, the session end state says
so plainly and offers free review (FR-66), which does **not** affect scheduling.
Telling a learner they are finished for the day is a feature; manufacturing busywork
is not.

**Daily new-card limit** defaults to 10 and is user-adjustable. The default is
deliberately conservative: introducing new cards without limit produces a review
backlog days later that the learner did not choose and cannot see coming, which is
the single most common way people abandon spaced repetition.

**Timezone and day boundary.** A "day" is local, with a configurable start hour
defaulting to 04:00 rather than midnight, so a late-night session counts toward the
day it feels like. Due comparisons use absolute timestamps; only the daily *limit*
uses the day boundary.

## 6. Durability — the serious constraint

CLAUDE.md §03 defers synchronisation. With spaced repetition in scope, that has a
consequence worth stating bluntly: **a learner's progress lives in one browser on
one device, and browsers evict storage.**

Losing months of review history is not a degraded experience, it is the loss of the
thing the app was for. Three mitigations, all required for v1:

1. **Request persistent storage.** Call `navigator.storage.persist()` on first
   meaningful use. This asks the browser not to evict under storage pressure.
   It can be refused, and it is not available everywhere, so it is necessary but
   not sufficient.
2. **Export and import** (FR-69). The learner can export all progress and settings
   as a single JSON file, and import it on another device or after a reset. This is
   not synchronisation — it is manual, explicit, and one-directional — but it is
   what makes the data recoverable at all. This is why FR-69 is a MUST.
3. **Warn before destruction.** Any action clearing progress requires explicit
   confirmation naming what will be lost.

Automatic sync remains out of scope ([roadmap](../project/roadmap.md), post-v1),
and is the natural first feature after v1 precisely because of this section.

## 7. Testing

Scheduling bugs are the second class of silent failure in this project, after
content errors: a wrong interval looks entirely plausible and its cost appears
months later. ([testing-strategy](testing-strategy.md) §8.)

1. **Deterministic clock.** The scheduler never reads the wall clock directly; time
   is injected. Every test controls it.
2. **Library conformance.** If a library is used, its published test vectors run in
   our suite, so a version bump that changes behaviour fails the build.
3. **Invariants**, property-tested over random review sequences:
   - a card graded `Again` always gets a shorter next interval than the same card
     graded `Good`;
   - grades are strictly ordered — `Again` ≤ `Hard` ≤ `Good` ≤ `Easy` in resulting
     interval;
   - intervals are positive, finite, and bounded by a configured maximum;
   - `lapses` increments only on `Again`;
   - no state transition produces `NaN` — the classic failure mode when an elapsed
     time is computed across a clock change.
4. **Simulation.** Replay a synthetic year of study for several learner profiles
   and assert review volume stays within sane bounds. This catches runaway backlog
   from a bad limit interaction, which unit tests will not.
5. **Migration.** Progress written by schema version *n* must load under *n+1*.
   Tested against committed fixtures from every prior version.
6. **Round-trip.** Export then import reproduces identical state, including the
   review log.
