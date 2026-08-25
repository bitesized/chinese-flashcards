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
import HanziWriter from 'hanzi-writer';
import { HanziDetail } from './HanziDetail.js';
import { speak } from '../../services/speech.js';

vi.mock('../../services/speech.js', () => ({
  isSpeechAvailable: vi.fn().mockReturnValue(true),
  subscribeSpeechAvailability: vi.fn().mockImplementation(() => () => {}),
  speak: vi.fn(),
}));

vi.mock('hanzi-writer', () => ({
  default: { create: vi.fn() },
}));

// HanziWriter is mocked to a plain object literal ({ default: { create:
// vi.fn() } }), so there is no `this` binding to lose; the rule can't see
// through the mock.
// eslint-disable-next-line @typescript-eslint/unbound-method
const createMock = vi.mocked(HanziWriter.create);
const speakMock = vi.mocked(speak);

function mockEntryResponse() {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        character: '你',
        readings: [{ reading: 'nǐ', readingNumeric: 'ni3', senses: ['you'] }],
      }),
  } as Response;
}

describe('HanziDetail (FR-80, FR-81, FR-82)', () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockReturnValue({
      animateCharacter: vi.fn().mockResolvedValue(undefined),
      quiz: vi.fn(),
      cancelQuiz: vi.fn(),
    } as unknown as HanziWriter);
    speakMock.mockReset();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockEntryResponse()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the character heading immediately and readings once loaded', async () => {
    render(<HanziDetail character="你" speechRate={0.7} onBack={() => {}} />);
    expect(screen.getByRole('heading', { name: '你' })).toBeInTheDocument();
    expect(await screen.findByText('you')).toBeInTheDocument();
    expect(screen.getByText('nǐ')).toBeInTheDocument();
  });

  it('defaults to Watch mode, showing the animation view', async () => {
    render(<HanziDetail character="你" speechRate={0.7} onBack={() => {}} />);
    await screen.findByText('you');
    expect(screen.getByRole('button', { name: 'Watch' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Practice' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('switches to Practice mode and back via the toggle', async () => {
    const user = userEvent.setup();
    render(<HanziDetail character="你" speechRate={0.7} onBack={() => {}} />);
    await screen.findByText('you');

    await user.click(screen.getByRole('button', { name: 'Practice' }));
    expect(screen.getByRole('button', { name: 'Practice' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('application', { name: /practice writing/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Watch' }));
    expect(screen.getByRole('button', { name: 'Watch' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('resets to Watch mode when the character changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<HanziDetail character="你" speechRate={0.7} onBack={() => {}} />);
    await screen.findByText('you');
    await user.click(screen.getByRole('button', { name: 'Practice' }));
    expect(screen.getByRole('button', { name: 'Practice' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    rerender(<HanziDetail character="好" speechRate={0.7} onBack={() => {}} />);
    expect(screen.getByRole('button', { name: 'Watch' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('speaks the character (not its reading) when Listen is clicked', async () => {
    const user = userEvent.setup();
    render(<HanziDetail character="你" speechRate={0.7} onBack={() => {}} />);
    await screen.findByText('you');
    await user.click(screen.getByRole('button', { name: 'Listen' }));
    expect(speakMock).toHaveBeenCalledWith('你', 0.7);
  });

  it('calls onBack when the back control is activated', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<HanziDetail character="你" speechRate={0.7} onBack={onBack} />);
    await user.click(screen.getByRole('button', { name: /Hanzi/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows an error state when the character entry fails to load', async () => {
    // src/services/hanzi.ts caches loadHanziEntry's promise per character
    // (a real, deliberate page-session cache — see decks.ts/strokes.ts for
    // the same pattern). Using a character no other test in this file
    // fetches avoids that cache masking this specific failure case.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    render(<HanziDetail character="错" speechRate={0.7} onBack={() => {}} />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
