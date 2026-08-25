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
 * Animated stroke order for one character (FR-81), via `hanzi-writer`.
 * `charDataLoader` is overridden to fetch our own self-hosted
 * `public/strokes/{char}.json` (`src/services/strokes.ts`) — never
 * hanzi-writer's default jsdelivr CDN loader (DEC-035: this app has no
 * live third-party dependency for this feature, matching the rest of the
 * app's offline-first design).
 *
 * `hanzi-writer` is an imperative DOM library (it mounts an SVG directly
 * into a container element, outside React's own render), so this wraps it
 * in the standard React "escape hatch" pattern: a ref to a plain div,
 * created/destroyed in an effect keyed on `character`.
 */

import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { loadStrokeData } from '../../services/strokes.js';
import styles from './HanziAnimation.module.css';

export interface HanziAnimationProps {
  character: string;
  /** Square size in CSS px. */
  size?: number;
}

export function HanziAnimation({ character, size = 280 }: HanziAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setStatus('loading');
    container.innerHTML = '';

    // Read the app's own ink/accent colours once at creation time, so the
    // stroke drawing matches the active visual direction (DEC-018) rather
    // than hanzi-writer's own hex defaults — hanzi-writer parses these as
    // plain colour values, not living CSS custom properties, so this does
    // not react to a theme change while the animation is already mounted.
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
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 300,
      charDataLoader: (char, onLoad, onError) => {
        loadStrokeData(char).then(onLoad).catch(onError);
      },
      onLoadCharDataSuccess: () => setStatus('ready'),
      onLoadCharDataError: () => setStatus('error'),
    });
    writerRef.current = writer;

    return () => {
      writerRef.current = null;
      container.innerHTML = '';
    };
  }, [character, size]);

  function replay() {
    void writerRef.current?.animateCharacter();
  }

  return (
    <div className={styles.wrapper}>
      <div
        ref={containerRef}
        className={styles.canvas}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      {status === 'error' && <p className={styles.message}>Stroke order unavailable.</p>}
      {status === 'ready' && (
        <button type="button" className={styles.replayButton} onClick={replay}>
          Play stroke order
        </button>
      )}
      {/* Announced once per load, not per replay click — a screen reader
          doesn't get anything from watching strokes draw, but should know
          what character this is. */}
      <span className={styles.srOnly} lang="zh-Hans">
        {character}
      </span>
    </div>
  );
}
