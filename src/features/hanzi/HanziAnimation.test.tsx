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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HanziWriter from 'hanzi-writer';
import { HanziAnimation } from './HanziAnimation.js';
import { loadStrokeData } from '../../services/strokes.js';

vi.mock('../../services/strokes.js', () => ({
  loadStrokeData: vi.fn(),
}));

vi.mock('hanzi-writer', () => ({
  default: { create: vi.fn() },
}));

const loadStrokeDataMock = vi.mocked(loadStrokeData);
// HanziWriter is mocked to a plain object literal ({ default: { create:
// vi.fn() } }), so there is no `this` binding to lose; the rule can't see
// through the mock.
// eslint-disable-next-line @typescript-eslint/unbound-method
const createMock = vi.mocked(HanziWriter.create);

function makeFakeWriter() {
  return {
    animateCharacter: vi.fn().mockResolvedValue(undefined),
    quiz: vi.fn(),
    cancelQuiz: vi.fn(),
  };
}

describe('HanziAnimation', () => {
  beforeEach(() => {
    createMock.mockReset();
    loadStrokeDataMock.mockReset();
    loadStrokeDataMock.mockResolvedValue({ strokes: ['M0 0'], medians: [[[0, 0]]] });
  });

  it('creates a HanziWriter for the given character with a charDataLoader that uses the strokes service', () => {
    const fakeWriter = makeFakeWriter();
    createMock.mockReturnValue(fakeWriter as unknown as HanziWriter);
    render(<HanziAnimation character="你" size={200} />);

    expect(createMock).toHaveBeenCalledTimes(1);
    const [, character, options] = createMock.mock.calls[0]!;
    expect(character).toBe('你');
    expect(options?.width).toBe(200);

    const onLoad = vi.fn();
    const onError = vi.fn();
    void options?.charDataLoader?.('你', onLoad, onError);
    expect(loadStrokeDataMock).toHaveBeenCalledWith('你');
  });

  it('shows a replay button once character data has loaded successfully', async () => {
    let capturedOptions: Parameters<typeof HanziWriter.create>[2];
    createMock.mockImplementation((_el, _char, options) => {
      capturedOptions = options;
      return makeFakeWriter() as unknown as HanziWriter;
    });
    render(<HanziAnimation character="你" />);

    expect(screen.queryByRole('button', { name: /play stroke order/i })).not.toBeInTheDocument();
    capturedOptions?.onLoadCharDataSuccess?.({ strokes: [], medians: [] });
    expect(await screen.findByRole('button', { name: /play stroke order/i })).toBeInTheDocument();
  });

  it('clicking replay calls animateCharacter on the writer instance', async () => {
    const fakeWriter = makeFakeWriter();
    let capturedOptions: Parameters<typeof HanziWriter.create>[2];
    createMock.mockImplementation((_el, _char, options) => {
      capturedOptions = options;
      return fakeWriter as unknown as HanziWriter;
    });
    const user = userEvent.setup();
    render(<HanziAnimation character="你" />);
    capturedOptions?.onLoadCharDataSuccess?.({ strokes: [], medians: [] });

    const replay = await screen.findByRole('button', { name: /play stroke order/i });
    await user.click(replay);
    expect(fakeWriter.animateCharacter).toHaveBeenCalledTimes(1);
  });

  it('shows an error message when character data fails to load', async () => {
    let capturedOptions: Parameters<typeof HanziWriter.create>[2];
    createMock.mockImplementation((_el, _char, options) => {
      capturedOptions = options;
      return makeFakeWriter() as unknown as HanziWriter;
    });
    render(<HanziAnimation character="你" />);
    capturedOptions?.onLoadCharDataError?.(new Error('nope'));
    expect(await screen.findByText(/stroke order unavailable/i)).toBeInTheDocument();
  });

  it('creates a new writer when the character prop changes', () => {
    createMock.mockReturnValue(makeFakeWriter() as unknown as HanziWriter);
    const { rerender } = render(<HanziAnimation character="你" />);
    rerender(<HanziAnimation character="好" />);
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock.mock.calls[1]?.[1]).toBe('好');
  });

  it('tags the sr-only character label with lang="zh-Hans" (NFR-8)', () => {
    createMock.mockReturnValue(makeFakeWriter() as unknown as HanziWriter);
    render(<HanziAnimation character="你" />);
    expect(screen.getByText('你')).toHaveAttribute('lang', 'zh-Hans');
  });
});
