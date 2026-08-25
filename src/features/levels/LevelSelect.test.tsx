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
        2: { title: 'HSK 2', cardCount: 187, reviewed: true },
        3: { title: 'HSK 3', cardCount: 0, reviewed: false },
      }),
  } as Response;
}

describe('LevelSelect — availability (DEC-025: only reviewed levels are selectable)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockManifestResponse()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a reviewed level as enabled with its real card count', async () => {
    render(
      <LevelSelect
        initialSelection={[]}
        onStartSession={() => {}}
        onOpenSettings={() => {}}
        onOpenHanzi={() => {}}
      />,
    );
    const hsk1 = await screen.findByRole('button', { name: /HSK 1/ });
    expect(hsk1).toBeEnabled();
    expect(hsk1).toHaveTextContent('154 cards');
  });

  it('disables an unreviewed level and it cannot be toggled into the selection', async () => {
    const onStartSession = vi.fn();
    const user = userEvent.setup();
    render(
      <LevelSelect
        initialSelection={[]}
        onStartSession={onStartSession}
        onOpenSettings={() => {}}
        onOpenHanzi={() => {}}
      />,
    );
    const hsk3 = await screen.findByRole('button', { name: /HSK 3/ });
    expect(hsk3).toBeDisabled();
    expect(hsk3).toHaveTextContent('not yet available');
    await user.click(hsk3);
    expect(hsk3).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows a placeholder for a level absent from the manifest without crashing, and it stays disabled', async () => {
    render(
      <LevelSelect
        initialSelection={[]}
        onStartSession={() => {}}
        onOpenSettings={() => {}}
        onOpenHanzi={() => {}}
      />,
    );
    const hsk6 = await screen.findByRole('button', { name: /HSK 6/ });
    expect(hsk6).toBeDisabled();
  });

  it('opens Settings when the Settings link is activated', async () => {
    const onOpenSettings = vi.fn();
    const user = userEvent.setup();
    render(
      <LevelSelect
        initialSelection={[]}
        onStartSession={() => {}}
        onOpenSettings={onOpenSettings}
        onOpenHanzi={() => {}}
      />,
    );
    await waitFor(() => screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});

describe('LevelSelect — multi-select and last-level memory (FR-23, FR-25)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockManifestResponse()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('the Start button is disabled with nothing selected', async () => {
    render(
      <LevelSelect
        initialSelection={[]}
        onStartSession={() => {}}
        onOpenSettings={() => {}}
        onOpenHanzi={() => {}}
      />,
    );
    await screen.findByRole('button', { name: /HSK 1/ });
    expect(screen.getByRole('button', { name: /Start Studying/i })).toBeDisabled();
  });

  it('toggling a level selects it, and Start calls onStartSession with just that level', async () => {
    const onStartSession = vi.fn();
    const user = userEvent.setup();
    render(
      <LevelSelect
        initialSelection={[]}
        onStartSession={onStartSession}
        onOpenSettings={() => {}}
        onOpenHanzi={() => {}}
      />,
    );
    const hsk1 = await screen.findByRole('button', { name: /HSK 1/ });
    await user.click(hsk1);
    expect(hsk1).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /Start Studying/i }));
    expect(onStartSession).toHaveBeenCalledWith(['1']);
  });

  it('selecting two levels starts a combined session with both, sorted', async () => {
    const onStartSession = vi.fn();
    const user = userEvent.setup();
    render(
      <LevelSelect
        initialSelection={[]}
        onStartSession={onStartSession}
        onOpenSettings={() => {}}
        onOpenHanzi={() => {}}
      />,
    );
    const hsk2 = await screen.findByRole('button', { name: /HSK 2/ });
    const hsk1 = screen.getByRole('button', { name: /HSK 1/ });
    // Select out of order — the result should still come out sorted.
    await user.click(hsk2);
    await user.click(hsk1);
    await user.click(screen.getByRole('button', { name: /Start Studying/i }));
    expect(onStartSession).toHaveBeenCalledWith(['1', '2']);
  });

  it('clicking a selected level again deselects it', async () => {
    const user = userEvent.setup();
    render(
      <LevelSelect
        initialSelection={[]}
        onStartSession={() => {}}
        onOpenSettings={() => {}}
        onOpenHanzi={() => {}}
      />,
    );
    const hsk1 = await screen.findByRole('button', { name: /HSK 1/ });
    await user.click(hsk1);
    expect(hsk1).toHaveAttribute('aria-pressed', 'true');
    await user.click(hsk1);
    expect(hsk1).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Start Studying/i })).toBeDisabled();
  });

  it('pre-selects initialSelection on mount (last-level memory)', async () => {
    render(
      <LevelSelect
        initialSelection={['1']}
        onStartSession={() => {}}
        onOpenSettings={() => {}}
        onOpenHanzi={() => {}}
      />,
    );
    const hsk1 = await screen.findByRole('button', { name: /HSK 1/ });
    expect(hsk1).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Start Studying/i })).toBeEnabled();
  });

  it('drops a remembered level from the selection if it is not actually available (defensive)', async () => {
    render(
      <LevelSelect
        initialSelection={['3']}
        onStartSession={() => {}}
        onOpenSettings={() => {}}
        onOpenHanzi={() => {}}
      />,
    );
    const hsk3 = await screen.findByRole('button', { name: /HSK 3/ });
    await waitFor(() => expect(hsk3).toHaveAttribute('aria-pressed', 'false'));
    expect(screen.getByRole('button', { name: /Start Studying/i })).toBeDisabled();
  });

  it('a one-tap start is possible with a remembered, available level (G1)', async () => {
    const onStartSession = vi.fn();
    const user = userEvent.setup();
    render(
      <LevelSelect
        initialSelection={['1']}
        onStartSession={onStartSession}
        onOpenSettings={() => {}}
        onOpenHanzi={() => {}}
      />,
    );
    await screen.findByRole('button', { name: /HSK 1/ });
    await user.click(screen.getByRole('button', { name: /Start Studying/i }));
    expect(onStartSession).toHaveBeenCalledWith(['1']);
  });
});
