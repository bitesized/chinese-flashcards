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

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HanziList as HanziListComponent } from './HanziList.js';

function mockIndexResponse() {
  return {
    ok: true,
    json: () =>
      Promise.resolve([
        { character: '你', readings: ['nǐ'] },
        { character: '好', readings: ['hǎo', 'hào'] },
        { character: '们', readings: ['men'] },
      ]),
  } as Response;
}

describe('HanziList (FR-80, FR-85)', () => {
  let HanziList: typeof HanziListComponent;

  beforeEach(async () => {
    // src/services/hanzi.ts caches the index fetch's *promise* at module
    // scope (by design, for real app usage — a page-session cache, same
    // as decks.ts). Reset the module registry per test so each test's
    // fetch stub is actually the one exercised, not a previous test's
    // already-resolved cache.
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockIndexResponse()));
    ({ HanziList } = await import('./HanziList.js'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads and shows every character from the index', async () => {
    render(
      <HanziList onSelectCharacter={() => {}} onOpenPracticeGrid={() => {}} onBack={() => {}} />,
    );
    expect(await screen.findByText('3 of 3 characters')).toBeInTheDocument();
    expect(screen.getByText('你')).toBeInTheDocument();
    expect(screen.getByText('好')).toBeInTheDocument();
    expect(screen.getByText('们')).toBeInTheDocument();
  });

  it('filters by character', async () => {
    const user = userEvent.setup();
    render(
      <HanziList onSelectCharacter={() => {}} onOpenPracticeGrid={() => {}} onBack={() => {}} />,
    );
    await screen.findByText('3 of 3 characters');
    await user.type(screen.getByRole('searchbox', { name: 'Search characters' }), '你');
    expect(await screen.findByText('1 of 3 characters')).toBeInTheDocument();
    expect(screen.getByText('你')).toBeInTheDocument();
    expect(screen.queryByText('好')).not.toBeInTheDocument();
  });

  it("filters by a Pinyin substring, matching any of a polyphonic character's readings", async () => {
    const user = userEvent.setup();
    render(
      <HanziList onSelectCharacter={() => {}} onOpenPracticeGrid={() => {}} onBack={() => {}} />,
    );
    await screen.findByText('3 of 3 characters');
    await user.type(screen.getByRole('searchbox', { name: 'Search characters' }), 'hào');
    expect(await screen.findByText('1 of 3 characters')).toBeInTheDocument();
    expect(screen.getByText('好')).toBeInTheDocument();
  });

  it('shows a no-match message when nothing filters through', async () => {
    const user = userEvent.setup();
    render(
      <HanziList onSelectCharacter={() => {}} onOpenPracticeGrid={() => {}} onBack={() => {}} />,
    );
    await screen.findByText('3 of 3 characters');
    await user.type(screen.getByRole('searchbox', { name: 'Search characters' }), 'zzz');
    expect(await screen.findByText(/no characters match/i)).toBeInTheDocument();
  });

  it('calls onSelectCharacter when a character button is clicked', async () => {
    const onSelectCharacter = vi.fn();
    const user = userEvent.setup();
    render(
      <HanziList
        onSelectCharacter={onSelectCharacter}
        onOpenPracticeGrid={() => {}}
        onBack={() => {}}
      />,
    );
    const button = await screen.findByRole('button', { name: /你/ });
    await user.click(button);
    expect(onSelectCharacter).toHaveBeenCalledWith('你');
  });

  it('calls onBack when the back control is activated', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <HanziList onSelectCharacter={() => {}} onOpenPracticeGrid={() => {}} onBack={onBack} />,
    );
    await user.click(screen.getByRole('button', { name: /Level Select/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenPracticeGrid when the practice grid control is activated', async () => {
    const onOpenPracticeGrid = vi.fn();
    const user = userEvent.setup();
    render(
      <HanziList
        onSelectCharacter={() => {}}
        onOpenPracticeGrid={onOpenPracticeGrid}
        onBack={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Practice grid/ }));
    expect(onOpenPracticeGrid).toHaveBeenCalledTimes(1);
  });

  it('shows an error state when the index fails to load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(
      <HanziList onSelectCharacter={() => {}} onOpenPracticeGrid={() => {}} onBack={() => {}} />,
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
