# Chinese Flashcards Application

**This document is the source of truth for the project.** Every other document in
`docs/` elaborates on what is written here. Where a detailed document appears to
contradict this file, this file wins and the other document is defective and must
be corrected.

---

## 01. Purpose

This project exists to help the project owner and others learn languages through a
flashcard interface. The initial and primary focus is Hanzi (Mandarin Chinese).
The design must leave room for other languages to be supported in future, but no
other language is to be built in the first version.

→ Elaborated in [`docs/product/vision-and-scope.md`](docs/product/vision-and-scope.md)

## 02. Basic Functionality

The core interaction is: the user is shown a Hanzi character or word, and can
interact to "flip" the card to reveal the English translation.

Pinyin is optional and user-controlled. The user can toggle Pinyin on either side
of the card — front, back, both, or neither — to assist with pronunciation and
learning.

The app must support the **CC-CEDICT** dictionary, and derive the Hanzi, Pinyin,
and English for each word from it.

The app must support the division of words into **HSK vocabulary levels**. The
levels are: **1, 2, 3, 4, 5, 6**.

The app must support computer voice, so the user can hear the word spoken if they
choose.

The app must use **spaced repetition** to schedule which cards a learner sees and
when.

The app must include a **Hanzi section**: a per-character lookup (stroke order,
Pinyin, English) independent of the HSK word decks, with the ability to watch a
character's stroke order animated, practise drawing it with stroke-by-stroke
feedback, and open a free-drawing practice grid (the traditional 田字格-style
handwriting sheet) for general handwriting practice. This must work on a touch
device with a stylus (e.g. Apple Pencil), not just mouse/keyboard.

The app must let a learner build their own **custom decks**, independent of the
HSK/CC-CEDICT decks: creating, editing, and deleting cards by hand, or by
looking up a word by Hanzi or Pinyin so its CC-CEDICT reading and definitions
fill in automatically, editable and removable per card. A custom deck must be
exportable to a JSON file and importable from one, so learners can share decks
with each other outside the app.

→ Elaborated in [`docs/product/requirements.md`](docs/product/requirements.md) and
  [`docs/product/ux-specification.md`](docs/product/ux-specification.md)

## 03. Technical Specifications

This is a **web-based application**. It must support desktop browsers, and it is
equally important that it is usable on mobile devices in a seamless manner.

Synchronisation between devices is **not** required in the first version. However,
the mobile experience must not feel like a cut-down version of the application.
Mobile is a first-class target, not a fallback.

→ Elaborated in [`docs/engineering/architecture.md`](docs/engineering/architecture.md)

## 04. Licensing

Application source code is licensed **GPL-3.0** wherever possible.

Dictionary-derived data is a derivative of CC-CEDICT and must be distributed under
**CC BY-SA 4.0**; this is an obligation inherited from the source, not a choice.
Stroke-order data is a derivative of the Arphic Public License-covered font data
underlying the `hanzi-writer` ecosystem and must be distributed under those terms.
The repository states which terms cover which paths.

→ Elaborated in [`docs/engineering/data-pipeline.md`](docs/engineering/data-pipeline.md) §7

## 05. Agent Creation and Maintenance Policy

This application requires the intersection of coding, Mandarin Chinese, and
English. As such, there is a robust team of agents working together to develop it.

Claude Code creates these subagents and expands their instructions and purview as
required. **Claude Code must prompt the project owner before expanding the purview
or skillset of any agent.** When agents are first created, Claude Code explains
them all to the project owner.

### The roster

| Agent | Role |
| --- | --- |
| **Black** | Expert back-end web developer and code maintainer. |
| **White** | Expert front-end web developer. Keen eye for unique, fast, and responsive web design without falling into AI-generated webapp tropes. |
| **Red** | Mandarin Chinese and Pinyin expert; fully fluent in English. Responsible for testing and ensuring Chinese characters and words are correct, valid, and mapped to their correct English translations. |
| **Purple** | Responsible for creating any further subagents the project requires. An expert in writing concise and powerful skill documents. Created by Claude Code, then permitted to create the rest of the team. |
| **Claude Code** | The project manager. Receives instructions from the project owner, decides who to delegate to, and manages the completed results from the subagents. Requests the owner's input only on critical issues; otherwise responsible for the project running smoothly and correctly. |

Agents interact via an efficient system. Claude Code, as project manager, is
responsible for enacting and maintaining that communication system.

→ Elaborated in [`docs/team/charter.md`](docs/team/charter.md) and
  [`docs/team/communication-protocol.md`](docs/team/communication-protocol.md)

---

## 06. Document Map

Read this file first. Then the document you need:

**Product**
- [`docs/product/vision-and-scope.md`](docs/product/vision-and-scope.md) — goals, non-goals, what v1 is and is not
- [`docs/product/requirements.md`](docs/product/requirements.md) — numbered functional and non-functional requirements
- [`docs/product/ux-specification.md`](docs/product/ux-specification.md) — screens, states, interactions, visual direction

**Engineering**
- [`docs/engineering/architecture.md`](docs/engineering/architecture.md) — stack, runtime shape, storage, offline
- [`docs/engineering/domain-model.md`](docs/engineering/domain-model.md) — entities, schemas, identifiers
- [`docs/engineering/data-pipeline.md`](docs/engineering/data-pipeline.md) — CC-CEDICT and HSK ingestion, parsing, compilation
- [`docs/engineering/scheduling.md`](docs/engineering/scheduling.md) — the spaced-repetition algorithm and its data
- [`docs/engineering/testing-strategy.md`](docs/engineering/testing-strategy.md) — quality gates, including linguistic review
- [`docs/engineering/conventions.md`](docs/engineering/conventions.md) — repository layout, coding and commit standards

**Team**
- [`docs/team/charter.md`](docs/team/charter.md) — agent roles, ownership, escalation
- [`docs/team/communication-protocol.md`](docs/team/communication-protocol.md) — how work is routed and handed back

**Project**
- [`docs/project/roadmap.md`](docs/project/roadmap.md) — milestones, definitions of ready and done
- [`docs/project/decision-log.md`](docs/project/decision-log.md) — architecture decision records
- [`docs/project/risk-register.md`](docs/project/risk-register.md) — known risks and mitigations
- [`docs/project/open-questions.md`](docs/project/open-questions.md) — questions awaiting the owner's answer

**Reference**
- [`docs/reference/glossary.md`](docs/reference/glossary.md) — Chinese-language and project terminology

**Live workstream**
- [`docs/workstream/board.md`](docs/workstream/board.md) — current work orders and their status

---

## 07. Change Control

1. This file changes only on the project owner's instruction, or when Claude Code
   proposes a change and the owner approves it.
2. Any decision that contradicts this file must be escalated to the owner before it
   is acted upon.
3. Decisions that are *consistent* with this file but not stated in it are recorded
   as ADRs in [`docs/project/decision-log.md`](docs/project/decision-log.md). Claude
   Code may make those calls without escalation.
4. When a decision is ratified, the ADR is updated and any affected document is
   corrected in the same change.
5. Documents in `docs/` are versioned alongside the code. A change to behaviour and
   a change to the document describing it belong in the same commit.
