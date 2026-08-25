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
 * One character's page (FR-80, FR-81, M8): every reading with its English
 * meanings, stroke order animation, and a speak control (reusing the same
 * speech service the study session uses — a character is just a shorter
 * piece of text to the Web Speech API).
 */

import { useEffect, useState } from 'react';
import { HanziAnimation } from './HanziAnimation.js';
import styles from './HanziDetail.module.css';
import { loadHanziEntry } from '../../services/hanzi.js';
import { speak } from '../../services/speech.js';
import { useSpeechAvailable } from '../../services/useSpeechAvailable.js';
import type { HanziEntry } from '../../domain/hanzi.js';

export interface HanziDetailProps {
  character: string;
  speechRate: number;
  onBack: () => void;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entry: HanziEntry };

export function HanziDetail({ character, speechRate, onBack }: HanziDetailProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const speechAvailable = useSpeechAvailable();

  // Reset to loading synchronously during render when `character` changes
  // (react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-
  // when-a-prop-changes), same pattern as StudySession.tsx, rather than a
  // setState call inside the effect body below.
  const [loadedCharacter, setLoadedCharacter] = useState<string | null>(null);
  if (loadedCharacter !== character) {
    setLoadedCharacter(character);
    setLoadState({ status: 'loading' });
  }

  useEffect(() => {
    let cancelled = false;
    loadHanziEntry(character)
      .then((entry) => {
        if (!cancelled) setLoadState({ status: 'ready', entry });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Unknown error';
        setLoadState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, [character]);

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <button type="button" className={styles.iconButton} onClick={onBack}>
          ← Hanzi
        </button>
      </div>

      <h1 className={styles.character} lang="zh-Hans">
        {character}
      </h1>

      <HanziAnimation character={character} />

      <button
        type="button"
        className={styles.speakButton}
        disabled={!speechAvailable}
        onClick={() => speak(character, speechRate)}
      >
        {speechAvailable ? 'Listen' : 'No voice available'}
      </button>

      {loadState.status === 'loading' && <p className={styles.message}>Loading…</p>}

      {loadState.status === 'error' && (
        <p className={styles.message} role="alert">
          Couldn&rsquo;t load this character. {loadState.message}
        </p>
      )}

      {loadState.status === 'ready' && (
        <ul className={styles.readingList}>
          {loadState.entry.readings.map((reading) => (
            <li key={reading.readingNumeric} className={styles.readingItem}>
              <p className={styles.reading} lang="zh-Latn-pinyin">
                {reading.reading}
              </p>
              <ol className={styles.senseList}>
                {reading.senses.map((sense) => (
                  <li key={sense}>{sense}</li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
