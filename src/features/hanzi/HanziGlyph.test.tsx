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
import { act, render, screen } from '@testing-library/react';
import HanziWriter from 'hanzi-writer';
import { HanziGlyph } from './HanziGlyph.js';
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
  return { animateCharacter: vi.fn(), quiz: vi.fn(), cancelQuiz: vi.fn() };
}

describe('HanziGlyph', () => {
  beforeEach(() => {
    createMock.mockReset();
    loadStrokeDataMock.mockReset();
    loadStrokeDataMock.mockResolvedValue({ strokes: ['M0 0'], medians: [[[0, 0]]] });
  });

  it('creates a HanziWriter instance for the given character, without quiz or animate controls', () => {
    createMock.mockReturnValue(makeFakeWriter() as unknown as HanziWriter);
    render(<HanziGlyph character="你" size={100} />);
    expect(createMock).toHaveBeenCalledTimes(1);
    const [, character, options] = createMock.mock.calls[0]!;
    expect(character).toBe('你');
    expect(options?.width).toBe(100);
    expect(options?.showCharacter).not.toBe(false);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses the self-hosted stroke data loader, never a third-party default', () => {
    let capturedOptions: Parameters<typeof HanziWriter.create>[2];
    createMock.mockImplementation((_el, _char, options) => {
      capturedOptions = options;
      return makeFakeWriter() as unknown as HanziWriter;
    });
    render(<HanziGlyph character="你" />);
    const onLoad = vi.fn();
    const onError = vi.fn();
    void capturedOptions?.charDataLoader?.('你', onLoad, onError);
    expect(loadStrokeDataMock).toHaveBeenCalledWith('你');
  });

  it('falls back to a plain-text glyph if stroke data fails to load', () => {
    let capturedOptions: Parameters<typeof HanziWriter.create>[2];
    createMock.mockImplementation((_el, _char, options) => {
      capturedOptions = options;
      return makeFakeWriter() as unknown as HanziWriter;
    });
    render(<HanziGlyph character="你" />);
    expect(screen.getAllByText('你')).toHaveLength(1); // sr-only only, so far
    act(() => capturedOptions?.onLoadCharDataError?.(new Error('nope')));
    expect(screen.getAllByText('你')).toHaveLength(2); // fallback + sr-only
  });

  it('announces the character to screen readers with lang="zh-Hans"', () => {
    createMock.mockReturnValue(makeFakeWriter() as unknown as HanziWriter);
    render(<HanziGlyph character="你" />);
    const labels = screen.getAllByText('你');
    expect(labels.some((el) => el.getAttribute('lang') === 'zh-Hans')).toBe(true);
  });

  it('creates a new writer when the character changes', () => {
    createMock.mockReturnValue(makeFakeWriter() as unknown as HanziWriter);
    const { rerender } = render(<HanziGlyph character="你" />);
    rerender(<HanziGlyph character="好" />);
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock.mock.calls[1]?.[1]).toBe('好');
  });

  it('shows a filled character by default, with no outline requested', () => {
    createMock.mockReturnValue(makeFakeWriter() as unknown as HanziWriter);
    render(<HanziGlyph character="你" />);
    const options = createMock.mock.calls[0]?.[2];
    expect(options?.showCharacter).not.toBe(false);
    expect(options?.showOutline).not.toBe(true);
  });

  it('shows only the outline, not the filled character, when outline is requested', () => {
    createMock.mockReturnValue(makeFakeWriter() as unknown as HanziWriter);
    render(<HanziGlyph character="你" outline />);
    const options = createMock.mock.calls[0]?.[2];
    expect(options?.showOutline).toBe(true);
    expect(options?.showCharacter).toBe(false);
  });
});
