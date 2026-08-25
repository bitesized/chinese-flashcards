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
 * A single character rendered from its real `hanzi-writer` stroke data —
 * the same handwritten-form outline `HanziAnimation`/`HanziPractice` draw
 * from, not the installed CJK web font's own (often quite different,
 * print-style) glyph shape. Used anywhere a character is shown as a
 * *model to copy*, where the exact stroke shapes are the point: the
 * practice grid's pinned reference tiles and its "filled" model cells.
 *
 * `hanzi-writer` shows the full character immediately once its stroke
 * data loads (`showCharacter` defaults to `true`) — no `.animateCharacter()`
 * or `.quiz()` call needed, unlike `HanziAnimation`/`HanziPractice`.
 *
 * `outline` swaps the filled model for a faint outline only — a plain,
 * non-interactive trace guide with no mistake-tracking or feedback of any
 * kind, for contexts that want just a square to look at, not a quiz.
 */

import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { loadStrokeData } from '../../services/strokes.js';
import styles from './HanziGlyph.module.css';

export interface HanziGlyphProps {
  character: string;
  /** Square size in CSS px. */
  size?: number;
  /** Show a faint outline instead of the filled-in character. */
  outline?: boolean;
}

export function HanziGlyph({ character, size = 96, outline = false }: HanziGlyphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setStatus('loading');
    container.innerHTML = '';

    const rootStyle = getComputedStyle(document.documentElement);
    const inkColor = rootStyle.getPropertyValue('--color-ink').trim() || '#333';
    const borderColor = rootStyle.getPropertyValue('--color-border').trim() || '#DDD';

    HanziWriter.create(container, character, {
      width: size,
      height: size,
      padding: size * 0.08,
      strokeColor: inkColor,
      showCharacter: !outline,
      showOutline: outline,
      outlineColor: borderColor,
      charDataLoader: (char, onLoad, onError) => {
        loadStrokeData(char).then(onLoad).catch(onError);
      },
      onLoadCharDataSuccess: () => setStatus('ready'),
      onLoadCharDataError: () => setStatus('error'),
    });

    return () => {
      container.innerHTML = '';
    };
  }, [character, size, outline]);

  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <div ref={containerRef} className={styles.canvas} aria-hidden="true" />
      {status === 'error' && (
        // A web-font fallback beats showing nothing at all if the stroke
        // data fails to load — not a faithful handwritten form, but a
        // usable one.
        <span lang="zh-Hans" className={styles.fallback} style={{ fontSize: size * 0.7 }}>
          {character}
        </span>
      )}
      <span className={styles.srOnly} lang="zh-Hans">
        {character}
      </span>
    </div>
  );
}
