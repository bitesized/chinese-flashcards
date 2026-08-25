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
 * Guided drawing practice for one character (FR-82), via `hanzi-writer`'s
 * `quiz()` mode: the user draws each stroke, gets per-stroke correct/
 * incorrect feedback, and a hint is highlighted after a few misses on the
 * same stroke rather than leaving them stuck.
 *
 * `hanzi-writer` binds classic `mousedown`/`touchstart` listeners on the
 * SVG element it renders, not the newer unified Pointer Events API — see
 * WO-015's report Findings for why this is very likely fine for stylus
 * input (browsers fire compatibility touch/mouse events for pen input
 * unless a page explicitly opts into Pointer Events, which this library
 * never does) but is explicitly NOT verified on real touch/stylus
 * hardware, which this environment has no way to test. Roadmap M8 gate #2
 * stays open until the owner verifies on their own device.
 */

import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { loadStrokeData } from '../../services/strokes.js';
import styles from './HanziPractice.module.css';

export interface HanziPracticeProps {
  character: string;
  size?: number;
}

type Status = 'loading' | 'active' | 'complete' | 'error';

export function HanziPractice({ character, size = 280 }: HanziPracticeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [mistakes, setMistakes] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setStatus('loading');
    setMistakes(0);
    container.innerHTML = '';

    const rootStyle = getComputedStyle(document.documentElement);
    const inkColor = rootStyle.getPropertyValue('--color-ink').trim() || '#333';
    const accentColor = rootStyle.getPropertyValue('--color-accent').trim() || '#AAF';
    const borderColor = rootStyle.getPropertyValue('--color-border').trim() || '#DDD';

    const writer = HanziWriter.create(container, character, {
      width: size,
      height: size,
      padding: 16,
      showCharacter: false,
      showOutline: true,
      strokeColor: inkColor,
      outlineColor: borderColor,
      highlightColor: accentColor,
      drawingColor: inkColor,
      charDataLoader: (char, onLoad, onError) => {
        loadStrokeData(char).then(onLoad).catch(onError);
      },
      onLoadCharDataError: () => setStatus('error'),
    });
    writerRef.current = writer;

    void writer.quiz({
      showHintAfterMisses: 3,
      onMistake: () => setMistakes((m) => m + 1),
      onComplete: () => setStatus('complete'),
    });
    setStatus('active');

    return () => {
      writerRef.current?.cancelQuiz();
      writerRef.current = null;
      container.innerHTML = '';
    };
    // `attempt` is a deliberate re-run trigger only (the "Try again"
    // button below bumps it) — the effect body never reads its value.
  }, [character, size, attempt]);

  return (
    <div className={styles.wrapper}>
      {/* Pointer/touch-drawn only — there is no meaningful keyboard
          equivalent to "draw this stroke's shape", so this one control is
          a deliberate, acknowledged exception to NFR-7's "keyboard
          operable end to end" (see WO-016's report). role="application"
          signals to assistive tech that normal document navigation
          semantics don't apply inside this region, which is honest about
          the limitation rather than mislabelling it as static content. */}
      <div
        ref={containerRef}
        className={styles.canvas}
        style={{ width: size, height: size }}
        aria-label={`Practice writing ${character} by drawing each stroke with a mouse, finger, or stylus`}
        role="application"
      />
      {status === 'error' && <p className={styles.message}>Stroke order unavailable.</p>}
      {status === 'active' && (
        <p className={styles.status} aria-live="polite">
          {mistakes === 0
            ? 'Draw the character, one stroke at a time.'
            : `${mistakes} mistake${mistakes === 1 ? '' : 's'} so far.`}
        </p>
      )}
      {status === 'complete' && (
        <div className={styles.completeRow}>
          <p className={styles.statusComplete} aria-live="polite">
            Done —{' '}
            {mistakes === 0 ? 'no mistakes!' : `${mistakes} mistake${mistakes === 1 ? '' : 's'}.`}
          </p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => setAttempt((a) => a + 1)}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
