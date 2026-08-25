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
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeGrid } from './PracticeGrid.js';

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
});
