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
import userEvent from '@testing-library/user-event';
import HanziWriter from 'hanzi-writer';
import type { QuizOptions } from 'hanzi-writer';
import { HanziPractice } from './HanziPractice.js';

vi.mock('../../services/strokes.js', () => ({
  loadStrokeData: vi.fn().mockResolvedValue({ strokes: [], medians: [] }),
}));

vi.mock('hanzi-writer', () => ({
  default: { create: vi.fn() },
}));

// HanziWriter is mocked to a plain object literal ({ default: { create:
// vi.fn() } }), so there is no `this` binding to lose; the rule can't see
// through the mock.
// eslint-disable-next-line @typescript-eslint/unbound-method
const createMock = vi.mocked(HanziWriter.create);

function makeFakeWriter() {
  return {
    quiz: vi.fn(),
    cancelQuiz: vi.fn(),
    animateCharacter: vi.fn(),
  };
}

describe('HanziPractice (FR-82)', () => {
  let capturedQuizOptions: Partial<QuizOptions> | undefined;

  beforeEach(() => {
    createMock.mockReset();
    capturedQuizOptions = undefined;
  });

  function setupFakeQuiz() {
    const fakeWriter = makeFakeWriter();
    fakeWriter.quiz.mockImplementation((options?: Partial<QuizOptions>) => {
      capturedQuizOptions = options;
      return Promise.resolve(undefined);
    });
    createMock.mockReturnValue(fakeWriter as unknown as HanziWriter);
    return fakeWriter;
  }

  it('starts a quiz on the writer instance for the given character', () => {
    setupFakeQuiz();
    render(<HanziPractice character="你" />);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0]?.[1]).toBe('你');
    expect(capturedQuizOptions).toBeDefined();
  });

  it('shows an initial prompt before any mistake', () => {
    setupFakeQuiz();
    render(<HanziPractice character="你" />);
    expect(screen.getByText(/draw the character/i)).toBeInTheDocument();
  });

  it('counts mistakes as they are reported via onMistake', () => {
    setupFakeQuiz();
    render(<HanziPractice character="你" />);
    act(() => capturedQuizOptions?.onMistake?.({} as never));
    expect(screen.getByText(/1 mistake so far/i)).toBeInTheDocument();
    act(() => capturedQuizOptions?.onMistake?.({} as never));
    expect(screen.getByText(/2 mistakes so far/i)).toBeInTheDocument();
  });

  it('shows a completion message with a "no mistakes" note when finished cleanly', () => {
    setupFakeQuiz();
    render(<HanziPractice character="你" />);
    act(() => capturedQuizOptions?.onComplete?.({ character: '你', totalMistakes: 0 }));
    expect(screen.getByText(/no mistakes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows the mistake count on completion when there were mistakes', () => {
    setupFakeQuiz();
    render(<HanziPractice character="你" />);
    act(() => capturedQuizOptions?.onMistake?.({} as never));
    act(() => capturedQuizOptions?.onComplete?.({ character: '你', totalMistakes: 1 }));
    expect(screen.getByText(/1 mistake\.$/i)).toBeInTheDocument();
  });

  it('clicking "Try again" restarts the quiz (a new writer is created)', async () => {
    setupFakeQuiz();
    const user = userEvent.setup();
    render(<HanziPractice character="你" />);
    act(() => capturedQuizOptions?.onComplete?.({ character: '你', totalMistakes: 0 }));

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(createMock).toHaveBeenCalledTimes(2);
    // Back to the initial, not-yet-mistaken prompt.
    expect(screen.getByText(/draw the character/i)).toBeInTheDocument();
  });

  it('cancels the quiz on unmount', () => {
    const fakeWriter = setupFakeQuiz();
    const { unmount } = render(<HanziPractice character="你" />);
    unmount();
    expect(fakeWriter.cancelQuiz).toHaveBeenCalledTimes(1);
  });

  it('marks the drawing surface with role="application" and a descriptive label, not role="img" (it is interactive, not static)', () => {
    setupFakeQuiz();
    render(<HanziPractice character="你" />);
    expect(screen.getByRole('application', { name: /practice writing 你/i })).toBeInTheDocument();
  });
});
