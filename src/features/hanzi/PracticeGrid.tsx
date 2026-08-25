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
 *
 * The sheet can be panned and scaled: a single pointer draws, exactly as
 * before; a second simultaneous pointer switches to a pinch (scale + pan)
 * gesture, matching the convention every touch drawing app uses so the two
 * interactions never fight each other. A mouse wheel / trackpad pinch
 * zooms around the cursor for desktop use, where there's no second finger.
 * The pan/zoom is a pure CSS transform on the layer holding the guides and
 * canvas together — screen-to-drawing coordinates are recovered from
 * `canvas.getBoundingClientRect()`, which already reflects that transform,
 * so drawing stays accurate at any zoom level without tracking the
 * transform twice.
 *
 * A left-hand column holds "pinned" reference characters the learner can
 * copy from while drawing — typed in directly, or carried over from a
 * character's own page via `initialPinned`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ChangeEvent,
  CSSProperties,
  FormEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { HanziGlyph } from './HanziGlyph.js';
import { HanziAnimation } from './HanziAnimation.js';
import styles from './PracticeGrid.module.css';

export interface PracticeGridProps {
  onBack: () => void;
  initialPinned?: string[];
}

interface CellCounts {
  filled: number;
  trace: number;
  strokeOrder: number;
}

const DEFAULT_COUNTS: CellCounts = { filled: 1, trace: 3, strokeOrder: 1 };
const MAX_CELLS_PER_ROW_TYPE = 12;

const CELL_SIZE = 96;
const MIN_SCALE = 0.5;
const MAX_SCALE = 5;

/** The classic 田字格 cross-and-diagonals guide lines, at whatever square
 * size the caller draws them at — shared between the main sheet's tiled
 * pattern and the (single-cell) pinned reference tiles so the two never
 * drift out of sync. */
function GuideLines({ size }: { size: number }) {
  return (
    <>
      <rect
        x="0"
        y="0"
        width={size}
        height={size}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="1"
      />
      <line
        x1={size / 2}
        y1="0"
        x2={size / 2}
        y2={size}
        stroke="var(--color-border)"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <line
        x1="0"
        y1={size / 2}
        x2={size}
        y2={size / 2}
        stroke="var(--color-border)"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <line
        x1="0"
        y1="0"
        x2={size}
        y2={size}
        stroke="var(--color-border)"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <line
        x1={size}
        y1="0"
        x2="0"
        y2={size}
        stroke="var(--color-border)"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
    </>
  );
}

interface Point {
  x: number;
  y: number;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Individual CJK Unified Ideographs — good enough to filter pasted or typed
 * text down to characters actually worth pinning as a copy reference. */
function extractHanCharacters(input: string): string[] {
  return [...input].filter((char) => /\p{Script=Han}/u.test(char));
}

export function PracticeGrid({ onBack, initialPinned = [] }: PracticeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pinned, setPinned] = useState<string[]>(() => Array.from(new Set(initialPinned)));
  const [pinInput, setPinInput] = useState('');
  const [counts, setCounts] = useState<CellCounts>(DEFAULT_COUNTS);

  const scaleRef = useRef(1);
  const translateRef = useRef<Point>({ x: 0, y: 0 });
  const activePointersRef = useRef(new Map<number, Point>());
  const pinchStartRef = useRef<{
    dist: number;
    scale: number;
    translate: Point;
    midpoint: Point;
  } | null>(null);

  const applyTransform = useCallback(() => {
    const node = transformRef.current;
    if (!node) return;
    node.style.transform = `translate(${translateRef.current.x}px, ${translateRef.current.y}px) scale(${scaleRef.current})`;
  }, []);

  const resetView = useCallback(() => {
    scaleRef.current = 1;
    translateRef.current = { x: 0, y: 0 };
    applyTransform();
  }, [applyTransform]);

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

  function toCanvasCoords(event: { clientX: number; clientY: number }): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    // getBoundingClientRect() already reflects the pan/zoom transform, so
    // undoing just the scale recovers the canvas's own (untransformed)
    // drawing coordinate space regardless of how far it's been panned.
    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current;
    return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
  }

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointersRef.current.size >= 2) {
      // A second pointer has arrived: this is now a pinch/pan gesture, not
      // a stroke — abandon any draw in progress rather than leave a
      // stray partial line.
      drawingRef.current = false;
      const [a, b] = [...activePointersRef.current.values()];
      if (a && b) {
        pinchStartRef.current = {
          dist: distance(a, b),
          scale: scaleRef.current,
          translate: { ...translateRef.current },
          midpoint: midpoint(a, b),
        };
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = toCanvasCoords(event);
    ctx.lineWidth = strokeWidthFor(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!activePointersRef.current.has(event.pointerId)) return;
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (activePointersRef.current.size >= 2 && pinchStartRef.current) {
        const [a, b] = [...activePointersRef.current.values()];
        if (!a || !b) return;
        const start = pinchStartRef.current;
        const newDist = distance(a, b);
        const newMid = midpoint(a, b);
        scaleRef.current = clamp((start.scale * newDist) / start.dist, MIN_SCALE, MAX_SCALE);
        translateRef.current = {
          x: start.translate.x + (newMid.x - start.midpoint.x),
          y: start.translate.y + (newMid.y - start.midpoint.y),
        };
        applyTransform();
        return;
      }

      if (!drawingRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const { x, y } = toCanvasCoords(event);
      ctx.lineWidth = strokeWidthFor(event);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [applyTransform],
  );

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(event.pointerId);
    canvasRef.current?.releasePointerCapture?.(event.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    // Requires a fresh pointerdown to resume — lifting one finger of a
    // pinch should never silently resume drawing from a stale position.
    drawingRef.current = false;
  }, []);

  // React attaches `wheel` as a passive document-root listener by default
  // (a deliberate change since React 17, to match native scroll
  // performance) — a `preventDefault()` inside a JSX `onWheel` handler is
  // silently ignored, which would leave the *page* scrolling underneath
  // the zoom gesture instead of being stopped. Attaching the listener
  // directly, non-passive, is the documented way around this.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cursor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const zoomFactor = Math.exp(-event.deltaY * 0.001);
      const oldScale = scaleRef.current;
      const nextScale = clamp(oldScale * zoomFactor, MIN_SCALE, MAX_SCALE);
      const ratio = nextScale / oldScale;
      translateRef.current = {
        x: cursor.x - ratio * (cursor.x - translateRef.current.x),
        y: cursor.y - ratio * (cursor.y - translateRef.current.y),
      };
      scaleRef.current = nextScale;
      applyTransform();
    }

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [applyTransform]);

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, size.width, size.height);
  }

  function addPinned(event: FormEvent) {
    event.preventDefault();
    const chars = extractHanCharacters(pinInput);
    if (chars.length === 0) {
      setPinInput('');
      return;
    }
    setPinned((current) => Array.from(new Set([...current, ...chars])));
    setPinInput('');
  }

  function removePinned(character: string) {
    setPinned((current) => current.filter((c) => c !== character));
  }

  function updateCount(field: keyof CellCounts) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = clamp(Math.round(Number(event.target.value)) || 0, 0, MAX_CELLS_PER_ROW_TYPE);
      setCounts((current) => ({ ...current, [field]: value }));
    };
  }

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <button type="button" className={styles.iconButton} onClick={onBack}>
          ← Hanzi
        </button>
        <h1 className={styles.heading}>Handwriting practice</h1>
        <button type="button" className={styles.clearButton} onClick={resetView}>
          Reset view
        </button>
        <button type="button" className={styles.clearButton} onClick={clear}>
          Clear
        </button>
      </div>

      <div className={styles.workspace}>
        {/* The pinned column is sized directly from CELL_SIZE, the same
            constant the main sheet's guide cells use, so a pinned
            character sits inside a square at exactly the same scale as
            the cells the learner is copying it into — not an arbitrary,
            independently-sized decoration. */}
        <aside
          className={styles.pinnedColumn}
          aria-label="Pinned reference characters"
          style={{ '--cell-size': `${CELL_SIZE}px` } as CSSProperties}
        >
          <form className={styles.pinForm} onSubmit={addPinned}>
            <input
              type="text"
              className={styles.pinInput}
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value)}
              placeholder="Add 字…"
              aria-label="Add a character to copy"
            />
            <button type="submit" className={styles.pinButton}>
              Pin
            </button>
          </form>
          <ul className={styles.pinnedList}>
            {pinned.map((character) => (
              <li key={character} className={styles.pinnedTile}>
                {/* The same 田字格 guide lines as the main sheet, at the
                    scale of one cell — a reference character is only
                    useful as a copy target if the learner can see how it
                    should sit against the quadrants, exactly like the
                    model character printed in the first cell of a row in
                    a real practice book. */}
                <svg className={styles.pinnedGuide} viewBox="0 0 100 100" aria-hidden="true">
                  <GuideLines size={100} />
                </svg>
                <div className={styles.pinnedGlyph}>
                  <HanziGlyph character={character} size={CELL_SIZE} />
                </div>
                <button
                  type="button"
                  className={styles.pinnedRemove}
                  onClick={() => removePinned(character)}
                  aria-label={`Unpin ${character}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.mainArea}>
          {pinned.length > 0 && (
            <div className={styles.optionsBar} role="group" aria-label="Practice row options">
              <label className={styles.optionField}>
                Filled
                <input
                  type="number"
                  className={styles.optionInput}
                  min={0}
                  max={MAX_CELLS_PER_ROW_TYPE}
                  value={counts.filled}
                  onChange={updateCount('filled')}
                />
              </label>
              <label className={styles.optionField}>
                Traceable
                <input
                  type="number"
                  className={styles.optionInput}
                  min={0}
                  max={MAX_CELLS_PER_ROW_TYPE}
                  value={counts.trace}
                  onChange={updateCount('trace')}
                />
              </label>
              <label className={styles.optionField}>
                Stroke order
                <input
                  type="number"
                  className={styles.optionInput}
                  min={0}
                  max={MAX_CELLS_PER_ROW_TYPE}
                  value={counts.strokeOrder}
                  onChange={updateCount('strokeOrder')}
                />
              </label>
            </div>
          )}

          {pinned.length > 0 && (
            <div className={styles.characterRows}>
              {pinned.map((character) => (
                <div key={character} className={styles.charRow}>
                  <span className={styles.rowLabel} lang="zh-Hans">
                    {character}
                  </span>
                  <div className={styles.rowCells}>
                    {Array.from({ length: counts.strokeOrder }).map((_, index) => (
                      <div key={`stroke-${index}`} className={styles.rowCell}>
                        <HanziAnimation character={character} size={CELL_SIZE} />
                      </div>
                    ))}
                    {Array.from({ length: counts.filled }).map((_, index) => (
                      <div key={`filled-${index}`} className={styles.rowCell}>
                        <HanziGlyph character={character} size={CELL_SIZE} />
                      </div>
                    ))}
                    {Array.from({ length: counts.trace }).map((_, index) => (
                      <div key={`trace-${index}`} className={styles.rowCell}>
                        <HanziGlyph character={character} size={CELL_SIZE} outline />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div ref={containerRef} className={styles.sheet}>
            <div ref={transformRef} className={styles.transformLayer}>
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
                      <GuideLines size={CELL_SIZE} />
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
                aria-label="Freehand handwriting practice grid — draw with a mouse, finger, or stylus. Pinch or use the mouse wheel to zoom, drag with two fingers to pan."
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
          </div>
        </div>
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
