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
 * The card (ux-specification.md §4.2). A `button`-role control, not a bare
 * `div` with a click handler — flipping updates a polite live region so
 * screen-reader users receive the revealed side. Content for BOTH faces is
 * always in the DOM (never rendered late), so the flip animation never
 * delays content.
 *
 * `face` is controlled by the parent (the study session owns which card is
 * showing and its face, since that state must survive a Pinyin-toggle
 * re-render without flipping — FR-15).
 */

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { StudyableCard } from '../../domain/card.js';
import styles from './Card.module.css';

const MAX_SENSES_SHOWN = 4;
const MAX_SENSES_BEFORE_TRUNCATION = 6;

export interface CardProps {
  /** HSK `Card` and a custom card's display projection both satisfy this —
   *  see domain/card.ts's `StudyableCard` docstring (DEC-036). */
  card: StudyableCard;
  face: 'front' | 'back';
  pinyinFront: boolean;
  pinyinBack: boolean;
  onFlip: () => void;
  /** FR-43: whether a Mandarin voice is available on this device. When
   *  false, the speak control renders disabled with a plain explanation
   *  rather than being hidden or silently inert. */
  speechAvailable: boolean;
  onSpeak: () => void;
}

export function Card({
  card,
  face,
  pinyinFront,
  pinyinBack,
  onFlip,
  speechAvailable,
  onSpeak,
}: CardProps) {
  const [showAllSenses, setShowAllSenses] = useState(false);
  const isBack = face === 'back';

  const senses =
    card.senses.length > MAX_SENSES_BEFORE_TRUNCATION && !showAllSenses
      ? card.senses.slice(0, MAX_SENSES_SHOWN)
      : card.senses;
  const hasMore = card.senses.length > MAX_SENSES_BEFORE_TRUNCATION && !showAllSenses;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onFlip();
    }
  }

  // Buttons nested inside the flip target (this component's own "more"
  // button, and the speak button below) must stop a Space/Enter keydown
  // from bubbling to the outer flipper's own onKeyDown — otherwise
  // activating a nested button via keyboard also flips the card, since a
  // native button's keydown bubbles even though its resulting click does
  // not travel back up through the same handler.
  function stopKeyPropagation(event: KeyboardEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  function speakButton() {
    return (
      <button
        type="button"
        className={styles.speakButton}
        disabled={!speechAvailable}
        aria-label={
          speechAvailable
            ? `Play pronunciation of ${card.headword}`
            : 'Speech unavailable: no Mandarin voice found on this device'
        }
        onClick={(event) => {
          event.stopPropagation();
          onSpeak();
        }}
        onKeyDown={stopKeyPropagation}
      >
        {speechAvailable ? 'Listen' : 'No voice available'}
      </button>
    );
  }

  return (
    <div className={styles.scene}>
      <div
        className={`${styles.flipper} ${isBack ? styles.isBack : ''}`}
        role="button"
        tabIndex={0}
        aria-pressed={isBack}
        aria-label={
          isBack
            ? `${card.headword}, showing meaning. Press to flip back.`
            : `${card.headword}, showing character. Press to reveal meaning.`
        }
        onClick={onFlip}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.face}>
          <p className={`${styles.hanzi} ${styles.front}`} lang="zh-Hans">
            {card.headword}
          </p>
          {pinyinFront && card.reading && (
            <p className={styles.pinyin} lang="zh-Latn-pinyin">
              {card.reading}
            </p>
          )}
          {speakButton()}
          <span className={styles.revealAffordance}>Tap to reveal</span>
        </div>

        <div className={`${styles.face} ${styles.faceBack}`}>
          <p className={`${styles.hanzi} ${styles.back}`} lang="zh-Hans">
            {card.headword}
          </p>
          {pinyinBack && card.reading && (
            <p className={styles.pinyin} lang="zh-Latn-pinyin">
              {card.reading}
            </p>
          )}
          {speakButton()}
          <ol className={styles.senseList}>
            {senses.map((sense) => (
              <li key={sense}>{sense}</li>
            ))}
          </ol>
          {hasMore && (
            <button
              type="button"
              className={styles.moreButton}
              onClick={(event) => {
                event.stopPropagation();
                setShowAllSenses(true);
              }}
              onKeyDown={stopKeyPropagation}
            >
              Show {card.senses.length - MAX_SENSES_SHOWN} more
            </button>
          )}
          {card.classifiers && card.classifiers.length > 0 && (
            <p className={styles.classifier} lang="zh-Hans">
              CL: {card.classifiers.map((c) => `${c.simplified} (${c.reading})`).join(', ')}
            </p>
          )}
        </div>
      </div>

      <div aria-live="polite" className={styles.srOnly}>
        {isBack ? `Meaning revealed: ${senses.join('; ')}` : `Showing character ${card.headword}`}
      </div>
    </div>
  );
}
