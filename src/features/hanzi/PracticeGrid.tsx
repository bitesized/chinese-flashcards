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

/**
 * A free-drawing handwriting practice grid (FR-84, M8): a tiled sheet of
 * 田字格-style guide cells the user can draw on directly, independent of
 * any specific character or its stroke data — reachable straight from the
 * Hanzi section's own screen, with nothing to select first.
 *
 * Unlike `HanziAnimation`/`HanziPractice` (which delegate all input
 * handling to `hanzi-writer`'s classic mousedown/touchstart listeners),
 * this canvas is ours to write, so it uses the modern, unified Pointer
 * Events API directly — one code path for mouse, touch, and stylus, with
 * real pressure data (`event.pressure`) read from a pen where the browser
 * reports it, rather than relying on touch/mouse compatibility events.
 *
 * The guide lines are drawn once as an SVG tiled pattern (vector, so they
 * stay crisp at any size); a transparent `<canvas>` layered on top is the
 * only thing "Clear" ever touches, so clearing never disturbs the grid.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import styles from './PracticeGrid.module.css';

export interface PracticeGridProps {
  onBack: () => void;
}

const CELL_SIZE = 96;

export function PracticeGrid({ onBack }: PracticeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resizing a canvas resets its pixel buffer (and any drawing on it) —
    // an acceptable, deliberate limitation for a scratch practice surface,
    // not something worth preserving across an orientation change.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-ink')
      .trim();
  }, [size]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    drawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = strokeWidthFor(event);
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = strokeWidthFor(event);
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.stroke();
  }, []);

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    canvasRef.current?.releasePointerCapture?.(event.pointerId);
  }, []);

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, size.width, size.height);
  }

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <button type="button" className={styles.iconButton} onClick={onBack}>
          ← Hanzi
        </button>
        <h1 className={styles.heading}>Handwriting practice</h1>
        <button type="button" className={styles.clearButton} onClick={clear}>
          Clear
        </button>
      </div>

      <div ref={containerRef} className={styles.sheet}>
        {size.width > 0 && size.height > 0 && (
          <svg
            className={styles.guides}
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="tianzige"
                width={CELL_SIZE}
                height={CELL_SIZE}
                patternUnits="userSpaceOnUse"
              >
                <rect
                  x="0"
                  y="0"
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="1"
                />
                <line
                  x1={CELL_SIZE / 2}
                  y1="0"
                  x2={CELL_SIZE / 2}
                  y2={CELL_SIZE}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
                <line
                  x1="0"
                  y1={CELL_SIZE / 2}
                  x2={CELL_SIZE}
                  y2={CELL_SIZE / 2}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
                <line
                  x1="0"
                  y1="0"
                  x2={CELL_SIZE}
                  y2={CELL_SIZE}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
                <line
                  x1={CELL_SIZE}
                  y1="0"
                  x2="0"
                  y2={CELL_SIZE}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tianzige)" />
          </svg>
        )}
        {/* Pointer/touch-drawn only — there is no meaningful keyboard
            equivalent to "draw a stroke," so this is the same deliberate,
            acknowledged NFR-7 exception as `HanziPractice`'s canvas.
            role="application" is honest about this being interactive
            content, not a static image. */}
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          role="application"
          aria-label="Freehand handwriting practice grid — draw with a mouse, finger, or stylus"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  );
}

function strokeWidthFor(event: ReactPointerEvent<HTMLCanvasElement>): number {
  if (event.pointerType === 'pen' && event.pressure > 0) {
    return 1.5 + event.pressure * 3.5;
  }
  return 3;
}
