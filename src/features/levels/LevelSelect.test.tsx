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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LevelSelect } from './LevelSelect.js';

function mockManifestResponse() {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        1: { title: 'HSK 1', cardCount: 154, reviewed: true },
        2: { title: 'HSK 2', cardCount: 0, reviewed: false },
      }),
  } as Response;
}

describe('LevelSelect (DEC-025: only reviewed levels are selectable)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockManifestResponse()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('enables a reviewed level with its real card count and calls onSelectLevel when clicked', async () => {
    const onSelectLevel = vi.fn();
    const user = userEvent.setup();
    render(<LevelSelect onSelectLevel={onSelectLevel} onOpenSettings={() => {}} />);

    const hsk1 = await screen.findByRole('button', { name: /HSK 1/ });
    expect(hsk1).toBeEnabled();
    expect(hsk1).toHaveTextContent('154 cards');

    await user.click(hsk1);
    expect(onSelectLevel).toHaveBeenCalledWith('1');
  });

  it('disables an unreviewed level and never invokes onSelectLevel for it', async () => {
    const onSelectLevel = vi.fn();
    render(<LevelSelect onSelectLevel={onSelectLevel} onOpenSettings={() => {}} />);

    const hsk2 = await screen.findByRole('button', { name: /HSK 2/ });
    expect(hsk2).toBeDisabled();
    expect(hsk2).toHaveTextContent('not yet available');
  });

  it('shows a placeholder for levels absent from the manifest without crashing', async () => {
    render(<LevelSelect onSelectLevel={() => {}} onOpenSettings={() => {}} />);
    const hsk6 = await screen.findByRole('button', { name: /HSK 6/ });
    expect(hsk6).toBeDisabled();
  });

  it('opens Settings when the Settings link is activated', async () => {
    const onOpenSettings = vi.fn();
    const user = userEvent.setup();
    render(<LevelSelect onSelectLevel={() => {}} onOpenSettings={onOpenSettings} />);
    await waitFor(() => screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
