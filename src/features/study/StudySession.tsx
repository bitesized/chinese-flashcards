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
 * The study session (ux-specification.md §4.2, §4.3). WO-011/M2 scope only:
 * free-review-style previous/next navigation traversing the deck in list
 * order (optionally shuffled) — no grading, no scheduler. `Session`
 * (domain-model.md §8) is the runtime shape this is built around
 * specifically so M5 can swap the scheduler's due-card queue in as
 * `queue`'s source without changing this component's navigation logic.
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';
import { Card } from './Card.js';
import styles from './StudySession.module.css';
import { loadDeck } from '../../services/decks.js';
import { shuffle } from '../../services/shuffle.js';
import { isSpeechAvailable, speak, subscribeSpeechAvailability } from '../../services/speech.js';
import type { Card as CardData, Deck, HskLevel } from '../../domain/card.js';
import type { Settings } from '../../domain/runtime.js';

function useSpeechAvailable(): boolean {
  return useSyncExternalStore(subscribeSpeechAvailability, isSpeechAvailable);
}

export interface StudySessionProps {
  level: HskLevel;
  settings: Settings;
  onTogglePinyin: (side: 'front' | 'back') => void;
  onExit: () => void;
}

type LoadState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; deck: Deck };

export function StudySession({ level, settings, onTogglePinyin, onExit }: StudySessionProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [queue, setQueue] = useState<string[]>([]);
  const [position, setPosition] = useState(0);
  const [face, setFace] = useState<'front' | 'back'>('front');
  const [reloadToken, setReloadToken] = useState(0);

  // settings.cardOrder is read via a ref, not a dependency: changing the
  // order setting mid-session should not reshuffle a session already in
  // progress, only a fresh load should pick up whatever the order is at
  // that moment.
  const cardOrderRef = useRef(settings.cardOrder);
  useEffect(() => {
    cardOrderRef.current = settings.cardOrder;
  }, [settings.cardOrder]);

  // Reset to loading whenever the load key changes, adjusted synchronously
  // during render (react.dev/learn/you-might-not-need-an-effect#adjusting-
  // some-state-when-a-prop-changes) rather than as a setState call inside
  // the effect body, which the effect below then only uses for the async
  // load's own eventual result.
  const loadKey = `${level}:${reloadToken}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  if (loadedKey !== loadKey) {
    setLoadedKey(loadKey);
    setLoadState({ status: 'loading' });
  }

  useEffect(() => {
    let cancelled = false;
    loadDeck(level)
      .then((deck) => {
        if (cancelled) return;
        const ids = deck.cards.map((c) => c.id);
        setQueue(cardOrderRef.current === 'shuffled' ? shuffle(ids) : ids);
        setPosition(0);
        setFace('front');
        setLoadState({ status: 'ready', deck });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Unknown error';
        setLoadState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, [level, reloadToken]);

  const cardsById = useMemo((): Map<string, CardData> => {
    if (loadState.status !== 'ready') return new Map<string, CardData>();
    return new Map(loadState.deck.cards.map((c) => [c.id, c] as const));
  }, [loadState]);

  // Computed before the handlers below so handleFlip/handleSpeak can read
  // it directly; undefined while loading/erroring/at the end state, where
  // nothing that reads it can actually be triggered by the user anyway.
  const currentCard = cardsById.get(queue[position] ?? '');

  const speechAvailable = useSpeechAvailable();

  function handleSpeak() {
    if (currentCard) speak(currentCard.headword, settings.speechRate);
  }

  function handleFlip() {
    // Not the setFace((f) => ...) updater form: an updater function is
    // expected to be pure (React may invoke it more than once), and this
    // one needs to trigger a real side effect (speaking) exactly once, for
    // the one specific transition that reveals the meaning.
    const next = face === 'front' ? 'back' : 'front';
    setFace(next);
    if (next === 'back' && settings.autoplayOnReveal) {
      handleSpeak();
    }
  }

  function handleNext() {
    if (position < queue.length - 1) {
      setPosition((p) => p + 1);
      setFace('front');
    } else {
      setPosition(queue.length); // past the end -> end state
    }
  }

  function handlePrevious() {
    if (position > 0) {
      setPosition((p) => p - 1);
      setFace('front');
    }
  }

  function handleRestart(reshuffle: boolean) {
    const ids = [...cardsById.keys()];
    setQueue(reshuffle ? shuffle(ids) : ids);
    setPosition(0);
    setFace('front');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case 'ArrowRight':
        handleNext();
        break;
      case 'ArrowLeft':
        handlePrevious();
        break;
      case 'f':
      case 'F':
        onTogglePinyin('front');
        break;
      case 'b':
      case 'B':
        onTogglePinyin('back');
        break;
      case 's':
      case 'S':
        handleSpeak();
        break;
      default:
        break;
    }
  }

  if (loadState.status === 'loading') {
    return (
      <div className={styles.centeredMessage}>
        <div className={styles.skeleton} aria-hidden="true" />
        <p>Loading HSK {level}…</p>
      </div>
    );
  }

  if (loadState.status === 'error') {
    return (
      <div className={styles.centeredMessage} role="alert">
        <p>
          Couldn&rsquo;t load HSK {level}. {loadState.message}
        </p>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => setReloadToken((t) => t + 1)}
        >
          Retry
        </button>
        <button type="button" className={styles.iconButton} onClick={onExit}>
          Back to Level Select
        </button>
      </div>
    );
  }

  if (queue.length === 0) {
    // ux-specification.md §6: "should be impossible; if it occurs, say so
    // plainly and return to Level Select."
    return (
      <div className={styles.centeredMessage} role="alert">
        <p>HSK {level} has no cards yet.</p>
        <button type="button" className={styles.primaryButton} onClick={onExit}>
          Back to Level Select
        </button>
      </div>
    );
  }

  if (position >= queue.length) {
    return (
      <div className={styles.centeredMessage}>
        <h2>HSK {level} complete</h2>
        <p>You reviewed all {queue.length} cards.</p>
        <div className={styles.navRow}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => handleRestart(true)}
          >
            Restart (reshuffled)
          </button>
          <button type="button" className={styles.navButton} onClick={() => handleRestart(false)}>
            Restart
          </button>
        </div>
        <button type="button" className={styles.iconButton} onClick={onExit}>
          Back to Level Select
        </button>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className={styles.centeredMessage} role="alert">
        <p>Something went wrong loading this card.</p>
        <button type="button" className={styles.primaryButton} onClick={onExit}>
          Back to Level Select
        </button>
      </div>
    );
  }

  return (
    <div className={styles.screen} onKeyDown={handleKeyDown}>
      <div className={styles.topBar}>
        <button type="button" className={styles.iconButton} onClick={onExit}>
          ← Level Select
        </button>
        <span>
          {position + 1} / {queue.length}
        </span>
        <div className={styles.pinyinToggles}>
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={settings.pinyinFront}
            onClick={() => onTogglePinyin('front')}
          >
            Front Pinyin
          </button>
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={settings.pinyinBack}
            onClick={() => onTogglePinyin('back')}
          >
            Back Pinyin
          </button>
        </div>
      </div>

      <div className={styles.cardArea}>
        <Card
          key={currentCard.id}
          card={currentCard}
          face={face}
          pinyinFront={settings.pinyinFront}
          pinyinBack={settings.pinyinBack}
          onFlip={handleFlip}
          speechAvailable={speechAvailable}
          onSpeak={handleSpeak}
        />
      </div>

      <div className={styles.navRow}>
        <button
          type="button"
          className={styles.navButton}
          onClick={handlePrevious}
          disabled={position === 0}
        >
          ← Previous
        </button>
        <button type="button" className={styles.navButton} onClick={handleNext}>
          Next →
        </button>
      </div>
    </div>
  );
}
