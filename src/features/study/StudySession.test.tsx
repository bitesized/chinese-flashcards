/**
 * Chinese Flashcards — a spaced-repetition Hanzi flashcard app.
 * Copyright (C) 2026 the Chinese Flashcards contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudySession } from './StudySession.js';
import { loadDeck } from '../../services/decks.js';
import { speak } from '../../services/speech.js';
import { DEFAULT_SETTINGS } from '../../domain/runtime.js';
import type { Settings } from '../../domain/runtime.js';
import type { Card, Deck } from '../../domain/card.js';

vi.mock('../../services/decks.js', () => ({
  loadDeck: vi.fn(),
}));

vi.mock('../../services/speech.js', () => ({
  isSpeechAvailable: vi.fn().mockReturnValue(true),
  subscribeSpeechAvailability: vi.fn().mockImplementation(() => () => {}),
  speak: vi.fn(),
}));

const loadDeckMock = vi.mocked(loadDeck);
const speakMock = vi.mocked(speak);

// DEFAULT_SETTINGS.cardOrder is 'shuffled' (FR-32) — these tests assert
// exact card identity and order, so they pin 'sequential' explicitly rather
// than depending on shuffle output.
const SEQUENTIAL_SETTINGS: Settings = { ...DEFAULT_SETTINGS, cardOrder: 'sequential' };

function makeDeck(cardCount = 2, idPrefix = 'word'): Deck {
  const cards: Card[] = Array.from({ length: cardCount }, (_, i) => ({
    id: `${idPrefix}${i}:reading${i}`,
    headword: `字${i}`,
    reading: `zì${i}`,
    readingNumeric: `zi${i}`,
    senses: [`meaning ${i}`],
    levels: ['1'],
    source: 'cc-cedict',
    review: 'approved',
  }));
  return wrapDeck(cards);
}

function wrapDeck(cards: Card[]): Deck {
  return {
    schemaVersion: 1,
    language: 'zh-Hans',
    level: '1',
    title: 'HSK 1',
    cards,
    meta: {
      cardCount: cards.length,
      dictionaryVersion: 'test',
      wordListVersion: 'test',
      builtAt: new Date().toISOString(),
      reviewSummary: { unreviewed: 0, approved: cards.length, flagged: 0, corrected: 0 },
    },
  };
}

describe('StudySession', () => {
  beforeEach(() => {
    loadDeckMock.mockReset();
    speakMock.mockReset();
  });

  it('shows a loading state, then the first card once the deck resolves', async () => {
    loadDeckMock.mockResolvedValue(makeDeck(3));
    render(
      <StudySession
        source={{ kind: 'hsk', levels: ['1'] }}
        settings={SEQUENTIAL_SETTINGS}
        onTogglePinyin={() => {}}
        onExit={() => {}}
      />,
    );
    expect(screen.getByText(/Loading HSK 1/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('字0').length).toBeGreaterThan(0));
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('shows an error state with a working retry on load failure (ux-specification.md §6)', async () => {
    loadDeckMock.mockRejectedValueOnce(new Error('network down'));
    loadDeckMock.mockResolvedValueOnce(makeDeck(1));
    const user = userEvent.setup();
    render(
      <StudySession
        source={{ kind: 'hsk', levels: ['1'] }}
        settings={SEQUENTIAL_SETTINGS}
        onTogglePinyin={() => {}}
        onExit={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/network down/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getAllByText('字0').length).toBeGreaterThan(0));
  });

  it('ArrowRight/ArrowLeft navigate the deck and reset to the front face (keyboard operability)', async () => {
    loadDeckMock.mockResolvedValue(makeDeck(2));
    const user = userEvent.setup();
    render(
      <StudySession
        source={{ kind: 'hsk', levels: ['1'] }}
        settings={SEQUENTIAL_SETTINGS}
        onTogglePinyin={() => {}}
        onExit={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByText('1 / 2')).toBeInTheDocument());

    const card = screen.getByRole('button', { name: /showing character/i });
    card.focus();
    await user.keyboard('{Enter}'); // flip to back
    expect(screen.getByRole('button', { name: /showing meaning/i })).toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getAllByText('字1').length).toBeGreaterThan(0);
    // Advancing resets to the front face even though the previous card was flipped.
    const nextCard = screen.getByRole('button', { name: /showing character/i });
    expect(nextCard).toBeInTheDocument();

    // Navigating swaps in a new Card instance (keyed by card id), which drops
    // DOM focus back to the document body — refocus before the next keypress,
    // same as a real user would need to (Tab back to the card, or click it).
    nextCard.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getAllByText('字0').length).toBeGreaterThan(0);
  });

  it('F and B keys toggle Pinyin without stealing focus from the card (keyboard operability)', async () => {
    loadDeckMock.mockResolvedValue(makeDeck(1));
    const onTogglePinyin = vi.fn();
    const user = userEvent.setup();
    render(
      <StudySession
        source={{ kind: 'hsk', levels: ['1'] }}
        settings={SEQUENTIAL_SETTINGS}
        onTogglePinyin={onTogglePinyin}
        onExit={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('字0').length).toBeGreaterThan(0));
    screen.getByRole('button', { name: /showing character/i }).focus();
    await user.keyboard('f');
    await user.keyboard('B');
    expect(onTogglePinyin).toHaveBeenNthCalledWith(1, 'front');
    expect(onTogglePinyin).toHaveBeenNthCalledWith(2, 'back');
  });

  it('reaching the end of the deck offers restart, and "Previous" is disabled on the first card', async () => {
    loadDeckMock.mockResolvedValue(makeDeck(1));
    const user = userEvent.setup();
    render(
      <StudySession
        source={{ kind: 'hsk', levels: ['1'] }}
        settings={SEQUENTIAL_SETTINGS}
        onTogglePinyin={() => {}}
        onExit={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('字0').length).toBeGreaterThan(0));
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(await screen.findByText(/HSK 1 complete/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Restart$/ }));
    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
  });

  it('the S key speaks the current card (FR-40, keyboard operability)', async () => {
    loadDeckMock.mockResolvedValue(makeDeck(1));
    const user = userEvent.setup();
    render(
      <StudySession
        source={{ kind: 'hsk', levels: ['1'] }}
        settings={SEQUENTIAL_SETTINGS}
        onTogglePinyin={() => {}}
        onExit={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('字0').length).toBeGreaterThan(0));
    screen.getByRole('button', { name: /showing character/i }).focus();
    await user.keyboard('s');
    expect(speakMock).toHaveBeenCalledWith('字0', SEQUENTIAL_SETTINGS.speechRate);
  });

  it('autoplay-on-reveal speaks on flip-to-back but never on navigation (FR-41, FR-46)', async () => {
    loadDeckMock.mockResolvedValue(makeDeck(2));
    const autoplaySettings: Settings = { ...SEQUENTIAL_SETTINGS, autoplayOnReveal: true };
    const user = userEvent.setup();
    render(
      <StudySession
        source={{ kind: 'hsk', levels: ['1'] }}
        settings={autoplaySettings}
        onTogglePinyin={() => {}}
        onExit={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('字0').length).toBeGreaterThan(0));

    // Advancing to a new card (still on its front face) must never autoplay.
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(speakMock).not.toHaveBeenCalled();

    // Flipping to reveal the meaning does autoplay.
    await user.click(screen.getByRole('button', { name: /showing character/i }));
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(speakMock).toHaveBeenCalledWith('字1', autoplaySettings.speechRate);

    // Flipping back to the front is not a "reveal" and must not autoplay again.
    await user.click(screen.getByRole('button', { name: /showing meaning/i }));
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it('does not autoplay on flip when autoplayOnReveal is off (the default)', async () => {
    loadDeckMock.mockResolvedValue(makeDeck(1));
    const user = userEvent.setup();
    render(
      <StudySession
        source={{ kind: 'hsk', levels: ['1'] }}
        settings={SEQUENTIAL_SETTINGS}
        onTogglePinyin={() => {}}
        onExit={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('字0').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /showing character/i }));
    expect(speakMock).not.toHaveBeenCalled();
  });
});

describe('StudySession — multi-level sessions (WO-014, FR-23)', () => {
  beforeEach(() => {
    loadDeckMock.mockReset();
    speakMock.mockReset();
  });

  it('merges cards from every selected level into one combined session', async () => {
    loadDeckMock.mockImplementation((level: string) =>
      Promise.resolve(
        makeDeck(2, level === '1' ? 'a' : 'b'), // distinct id prefixes per level
      ),
    );
    render(
      <StudySession
        source={{ kind: 'hsk', levels: ['1', '2'] }}
        settings={SEQUENTIAL_SETTINGS}
        onTogglePinyin={() => {}}
        onExit={() => {}}
      />,
    );
    // 2 cards from level 1 + 2 cards from level 2 = 4, none overlapping.
    await waitFor(() => expect(screen.getByText('1 / 4')).toBeInTheDocument());
    expect(loadDeckMock).toHaveBeenCalledWith('1');
    expect(loadDeckMock).toHaveBeenCalledWith('2');
  });

  it('de-duplicates a card that appears in more than one selected level', async () => {
    const only1 = makeDeck(1, 'only1').cards[0]!;
    const only2 = makeDeck(1, 'only2').cards[0]!;
    const shared = makeDeck(1, 'shared').cards[0]!;
    const deck1 = wrapDeck([only1, shared]);
    const deck2 = wrapDeck([shared, only2]);
    loadDeckMock.mockImplementation((level: string) =>
      Promise.resolve(level === '1' ? deck1 : deck2),
    );

    render(
      <StudySession
        source={{ kind: 'hsk', levels: ['1', '2'] }}
        settings={SEQUENTIAL_SETTINGS}
        onTogglePinyin={() => {}}
        onExit={() => {}}
      />,
    );
    // 2 unique from deck1 + 2 unique from deck2, but "shared" counted once: 3.
    await waitFor(() => expect(screen.getByText('1 / 3')).toBeInTheDocument());
  });

  it('formats the loading/complete copy for more than one level', async () => {
    loadDeckMock.mockResolvedValue(makeDeck(1));
    const user = userEvent.setup();
    render(
      <StudySession
        source={{ kind: 'hsk', levels: ['1', '2', '3'] }}
        settings={SEQUENTIAL_SETTINGS}
        onTogglePinyin={() => {}}
        onExit={() => {}}
      />,
    );
    expect(screen.getByText(/Loading HSK 1, 2 & 3/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('字0').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(await screen.findByText(/HSK 1, 2 & 3 complete/)).toBeInTheDocument();
  });

  it('a load failure for any selected level shows the error state, not a partial session', async () => {
    loadDeckMock.mockImplementation((level: string) =>
      level === '2' ? Promise.reject(new Error('HSK 2 down')) : Promise.resolve(makeDeck(2)),
    );
    render(
      <StudySession
        source={{ kind: 'hsk', levels: ['1', '2'] }}
        settings={SEQUENTIAL_SETTINGS}
        onTogglePinyin={() => {}}
        onExit={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/HSK 2 down/)).toBeInTheDocument();
  });
});
