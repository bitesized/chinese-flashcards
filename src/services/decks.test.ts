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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Deck } from '../domain/card.js';

function makeDeckResponse(level: string): Response {
  const deck: Deck = {
    schemaVersion: 1,
    language: 'zh-Hans',
    level: level as Deck['level'],
    title: `HSK ${level}`,
    cards: [],
    meta: {
      cardCount: 0,
      dictionaryVersion: 'test',
      wordListVersion: 'test',
      builtAt: new Date().toISOString(),
      reviewSummary: { unreviewed: 0, approved: 0, flagged: 0, corrected: 0 },
    },
  };
  return { ok: true, json: () => Promise.resolve(deck) } as Response;
}

describe('loadDeck — page-session cache (WO-014)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn().mockImplementation((url: string) => {
      const level = /hsk-(\d)\.json/.exec(url)?.[1] ?? '1';
      return Promise.resolve(makeDeckResponse(level));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches a level only once across repeated calls in the same page session', async () => {
    const { loadDeck } = await import('./decks.js');
    await loadDeck('1');
    await loadDeck('1');
    await loadDeck('1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('two concurrent calls for the same level share one fetch, not two', async () => {
    const { loadDeck } = await import('./decks.js');
    const [a, b] = await Promise.all([loadDeck('2'), loadDeck('2')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('different levels are fetched independently', async () => {
    const { loadDeck } = await import('./decks.js');
    await loadDeck('1');
    await loadDeck('2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a failed fetch is not cached — a retry issues a fresh request', async () => {
    const { loadDeck } = await import('./decks.js');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(loadDeck('1')).rejects.toThrow();
    fetchMock.mockResolvedValueOnce(makeDeckResponse('1'));
    await expect(loadDeck('1')).resolves.toMatchObject({ level: '1' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
