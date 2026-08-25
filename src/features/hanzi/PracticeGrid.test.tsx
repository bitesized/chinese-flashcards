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
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HanziWriter from 'hanzi-writer';
import { PracticeGrid } from './PracticeGrid.js';

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
const createHanziWriterMock = vi.mocked(HanziWriter.create);

// HanziAnimation (stroke order) also sets showOutline: true (the outline
// is the backdrop strokes animate over), so "showOutline" alone doesn't
// uniquely identify a traceable cell — it must also lack the
// animation-specific options only HanziAnimation passes.
function isTraceableCall(call: Parameters<typeof HanziWriter.create>) {
  const options = call[2];
  return options?.showOutline === true && options.strokeAnimationSpeed === undefined;
}

function makeFakeCtx() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    scale: vi.fn(),
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    strokeStyle: '',
  };
}

let fakeCtx: ReturnType<typeof makeFakeCtx>;
let resizeCallback: ResizeObserverCallback | null;

class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function triggerResize(width: number, height: number) {
  act(() => {
    resizeCallback?.(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      {} as ResizeObserver,
    );
  });
}

describe('PracticeGrid (FR-84)', () => {
  beforeEach(() => {
    fakeCtx = makeFakeCtx();
    resizeCallback = null;
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      fakeCtx as unknown as CanvasRenderingContext2D,
    );
    createHanziWriterMock.mockReset();
    createHanziWriterMock.mockReturnValue({
      animateCharacter: vi.fn(),
      quiz: vi.fn(),
      cancelQuiz: vi.fn(),
    } as unknown as HanziWriter);
  });

  it('renders a drawable canvas marked role="application" with a descriptive label, not role="img"', () => {
    render(<PracticeGrid onBack={() => {}} />);
    expect(
      screen.getByRole('application', { name: /freehand handwriting practice grid/i }),
    ).toBeInTheDocument();
  });

  it('draws guide lines once the sheet has a measured size', () => {
    const { container } = render(<PracticeGrid onBack={() => {}} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
    triggerResize(400, 600);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '400');
    expect(svg).toHaveAttribute('height', '600');
  });

  it('draws a stroke on the canvas as the pointer moves', () => {
    render(<PracticeGrid onBack={() => {}} />);
    const canvas = screen.getByRole('application');
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 15, clientY: 25, pointerId: 1 });
    expect(fakeCtx.beginPath).toHaveBeenCalledTimes(1);
    expect(fakeCtx.moveTo).toHaveBeenCalledWith(10, 20);
    expect(fakeCtx.lineTo).toHaveBeenCalledWith(15, 25);
    expect(fakeCtx.stroke).toHaveBeenCalledTimes(1);
  });

  it('does not draw while the pointer is up', () => {
    render(<PracticeGrid onBack={() => {}} />);
    const canvas = screen.getByRole('application');
    fireEvent.pointerMove(canvas, { clientX: 15, clientY: 25, pointerId: 1 });
    expect(fakeCtx.lineTo).not.toHaveBeenCalled();
  });

  it('stops drawing after pointer up, even if the pointer keeps moving', () => {
    render(<PracticeGrid onBack={() => {}} />);
    const canvas = screen.getByRole('application');
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 20, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 99, clientY: 99, pointerId: 1 });
    expect(fakeCtx.lineTo).not.toHaveBeenCalled();
  });

  it('gives a pressure-sensitive stylus a thicker line than a default mouse stroke', () => {
    render(<PracticeGrid onBack={() => {}} />);
    const canvas = screen.getByRole('application');
    fireEvent.pointerDown(canvas, {
      clientX: 0,
      clientY: 0,
      pointerId: 1,
      pointerType: 'pen',
      pressure: 1,
    });
    const penWidth = fakeCtx.lineWidth;
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    fireEvent.pointerDown(canvas, {
      clientX: 0,
      clientY: 0,
      pointerId: 2,
      pointerType: 'mouse',
    });
    expect(fakeCtx.lineWidth).toBeLessThan(penWidth);
  });

  it('clears the canvas when Clear is clicked, without touching the guide lines', async () => {
    const user = userEvent.setup();
    const { container } = render(<PracticeGrid onBack={() => {}} />);
    triggerResize(400, 600);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(fakeCtx.clearRect).toHaveBeenCalledWith(0, 0, 400, 600);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onBack when the back control is activated', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<PracticeGrid onBack={onBack} />);
    await user.click(screen.getByRole('button', { name: /Hanzi/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows characters passed in via initialPinned', () => {
    render(<PracticeGrid onBack={() => {}} initialPinned={['你', '好']} />);
    const pinnedColumn = screen.getByRole('complementary', { name: /pinned reference/i });
    expect(within(pinnedColumn).getByRole('button', { name: 'Unpin 你' })).toBeInTheDocument();
    expect(within(pinnedColumn).getByRole('button', { name: 'Unpin 好' })).toBeInTheDocument();
  });

  it('pins a typed character and ignores non-Hanzi input', async () => {
    const user = userEvent.setup();
    render(<PracticeGrid onBack={() => {}} />);
    await user.type(screen.getByRole('textbox', { name: /add a character/i }), 'abc你123');
    await user.click(screen.getByRole('button', { name: 'Pin' }));
    const pinnedColumn = screen.getByRole('complementary', { name: /pinned reference/i });
    expect(within(pinnedColumn).getByRole('button', { name: 'Unpin 你' })).toBeInTheDocument();
    expect(
      within(pinnedColumn).queryByRole('button', { name: /^Unpin a/ }),
    ).not.toBeInTheDocument();
  });

  it('does not duplicate an already-pinned character', async () => {
    const user = userEvent.setup();
    render(<PracticeGrid onBack={() => {}} initialPinned={['你']} />);
    await user.type(screen.getByRole('textbox', { name: /add a character/i }), '你');
    await user.click(screen.getByRole('button', { name: 'Pin' }));
    const pinnedColumn = screen.getByRole('complementary', { name: /pinned reference/i });
    expect(within(pinnedColumn).getAllByRole('button', { name: /^Unpin / })).toHaveLength(1);
  });

  it('removes a pinned character when its unpin control is activated', async () => {
    const user = userEvent.setup();
    render(<PracticeGrid onBack={() => {}} initialPinned={['你']} />);
    const pinnedColumn = screen.getByRole('complementary', { name: /pinned reference/i });
    await user.click(within(pinnedColumn).getByRole('button', { name: 'Unpin 你' }));
    expect(
      within(pinnedColumn).queryByRole('button', { name: 'Unpin 你' }),
    ).not.toBeInTheDocument();
  });

  it('switches to a pinch gesture on a second simultaneous pointer, scaling and panning the sheet', () => {
    render(<PracticeGrid onBack={() => {}} />);
    const canvas = screen.getByRole('application');
    const transformLayer = canvas.parentElement as HTMLElement;

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerDown(canvas, { clientX: 200, clientY: 100, pointerId: 2 });
    // Pinch outward: the two pointers move twice as far apart.
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 250, clientY: 100, pointerId: 2 });

    expect(transformLayer.style.transform).toContain('scale(2)');
    // The in-progress single-pointer stroke from before the second finger
    // arrived must have been abandoned, not continued mid-pinch.
    expect(fakeCtx.lineTo).not.toHaveBeenCalled();
  });

  it('zooms around the cursor on wheel, without needing a second pointer', () => {
    render(<PracticeGrid onBack={() => {}} />);
    const canvas = screen.getByRole('application');
    const transformLayer = canvas.parentElement as HTMLElement;

    fireEvent.wheel(canvas, { clientX: 50, clientY: 50, deltaY: -500 });
    expect(transformLayer.style.transform).not.toBe('');
    expect(transformLayer.style.transform).not.toContain('scale(1)');
  });

  it('hides the practice-row options and rows when nothing is pinned', () => {
    render(<PracticeGrid onBack={() => {}} />);
    expect(screen.queryByRole('group', { name: /practice row options/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('application', { name: /^Practice writing/ }),
    ).not.toBeInTheDocument();
  });

  it('builds a practice row per pinned character using the default filled/traceable/stroke-order counts', () => {
    render(<PracticeGrid onBack={() => {}} initialPinned={['你']} />);
    // 1 pinned-column reference tile + the default row (1 stroke-order + 1
    // filled + 3 traceable) = 6 separate HanziWriter instances for 你.
    const callsForCharacter = createHanziWriterMock.mock.calls.filter((call) => call[1] === '你');
    expect(callsForCharacter).toHaveLength(6);
    // Traceable cells are the only ones rendered with showOutline — the
    // most direct way to confirm the count landed correctly at this level
    // of mocking (outline cells no longer have their own distinct role).
    const traceableCalls = callsForCharacter.filter(isTraceableCall);
    expect(traceableCalls).toHaveLength(3);
  });

  it('does not track mistakes or show quiz feedback on row cells — they are plain reference squares', () => {
    render(<PracticeGrid onBack={() => {}} initialPinned={['你']} />);
    // No HanziPractice quiz instance anywhere in the grid: no mistake
    // count, no completion message, no interactive canvas role.
    expect(
      screen.queryByRole('application', { name: /^Practice writing/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/mistake/i)).not.toBeInTheDocument();
  });

  it("orders each pinned character's row as stroke order, then filled, then traceable", () => {
    render(<PracticeGrid onBack={() => {}} initialPinned={['你']} />);
    const callsForCharacter = createHanziWriterMock.mock.calls.filter((call) => call[1] === '你');
    // The first call is the pinned-column tile itself; the row follows.
    const rowOptions = callsForCharacter.slice(1).map((call) => call[2]);
    // HanziAnimation (stroke order) is the only cell type passing
    // strokeAnimationSpeed — it must come first in the row.
    expect(rowOptions[0]).toHaveProperty('strokeAnimationSpeed');
    expect(rowOptions[1]?.showOutline).not.toBe(true); // filled next
    expect(rowOptions[2]?.showOutline).toBe(true); // then traceable
  });

  it('changing the Traceable count changes the number of traceable cells rendered', async () => {
    const user = userEvent.setup();
    render(<PracticeGrid onBack={() => {}} initialPinned={['你']} />);
    const traceInput = screen.getByLabelText('Traceable');
    // mock.calls accumulates every creation ever made, including cells
    // torn down along the way (e.g. the clear-then-retype below briefly
    // renders zero traceable cells) — clear it so only what's on screen
    // in the final state is counted, not the full history.
    createHanziWriterMock.mockClear();
    await user.clear(traceInput);
    await user.type(traceInput, '5');
    const traceableCalls = createHanziWriterMock.mock.calls
      .filter((call) => call[1] === '你')
      .filter(isTraceableCall);
    expect(traceableCalls).toHaveLength(5);
  });

  it('"Reset view" returns the sheet to its default scale and position', () => {
    render(<PracticeGrid onBack={() => {}} />);
    const canvas = screen.getByRole('application');
    const transformLayer = canvas.parentElement as HTMLElement;
    fireEvent.wheel(canvas, { clientX: 50, clientY: 50, deltaY: -500 });

    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(transformLayer.style.transform).toBe('translate(0px, 0px) scale(1)');
  });
});
