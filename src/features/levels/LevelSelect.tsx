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
 * Level Select (ux-specification.md §4.1). WO-011/M2 built single-level
 * selection with real compiled counts (from `public/decks/manifest.json`,
 * so a beginner never fetches all six decks just to see counts). WO-014/M3
 * adds multi-select (FR-23) and last-level memory (FR-25): a level button
 * toggles selection rather than immediately starting a session, and a
 * primary action starts a combined session with everything selected. Due
 * counts (FR-24's due-count half, FR-64) and a "Review N cards" primary
 * action remain M5 scope — the scheduler doesn't exist yet, so this stays
 * free-review-shaped, same as M2.
 */

import { useEffect, useState } from 'react';
import styles from './LevelSelect.module.css';
import type { HskLevel } from '../../domain/card.js';

interface ManifestEntry {
  title: string;
  cardCount: number;
  reviewed: boolean;
}

type Manifest = Record<HskLevel, ManifestEntry>;

const LEVELS: readonly HskLevel[] = ['1', '2', '3', '4', '5', '6'];

export interface LevelSelectProps {
  /** Pre-selection on mount (Settings.lastLevels, FR-25) — filtered to
   *  available levels once the manifest loads. */
  initialSelection: HskLevel[];
  onStartSession: (levels: HskLevel[]) => void;
  onOpenSettings: () => void;
  onOpenHanzi: () => void;
  /** DEC-036/WO-019: custom, editable, JSON-shareable decks. */
  onOpenCustomDecks: () => void;
}

export function LevelSelect({
  initialSelection,
  onStartSession,
  onOpenSettings,
  onOpenHanzi,
  onOpenCustomDecks,
}: LevelSelectProps) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [selected, setSelected] = useState<Set<HskLevel>>(() => new Set(initialSelection));

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}decks/manifest.json`)
      .then((r) => r.json() as Promise<Manifest>)
      .then((data) => {
        if (cancelled) return;
        setManifest(data);
        // Defensive per WO-014: a remembered level that's since become
        // unavailable (shouldn't happen — levels only gain review status,
        // never lose it — but not assumed) is dropped from the selection
        // rather than left selected-but-unstartable.
        setSelected((prev) => new Set([...prev].filter((level) => data[level]?.reviewed)));
      })
      .catch(() => {
        // Left as an exercise for later polish: a failed manifest fetch
        // currently just leaves counts blank rather than blocking the
        // screen — the level buttons themselves still work once available
        // is known some other way (it currently isn't, so all levels stay
        // disabled until the manifest loads — no partial-availability
        // guessing).
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleLevel(level: HskLevel, available: boolean) {
    if (!available) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <h1 className={styles.heading}>Chinese Flashcards</h1>
        <div className={styles.topBarLinks}>
          <button type="button" className={styles.settingsLink} onClick={onOpenHanzi}>
            Hanzi
          </button>
          <button type="button" className={styles.settingsLink} onClick={onOpenCustomDecks}>
            My Decks
          </button>
          <button type="button" className={styles.settingsLink} onClick={onOpenSettings}>
            Settings
          </button>
        </div>
      </div>

      <ul className={styles.levelList}>
        {LEVELS.map((level) => {
          const entry = manifest?.[level];
          const available = entry?.reviewed ?? false;
          const isSelected = selected.has(level);
          return (
            <li key={level}>
              <button
                type="button"
                className={styles.levelButton}
                disabled={!available}
                aria-pressed={isSelected}
                onClick={() => toggleLevel(level, available)}
              >
                <span className={styles.levelName}>HSK {level}</span>
                <span className={styles.levelMeta}>
                  {entry ? `${entry.cardCount} cards` : '…'}
                  {entry && !entry.reviewed ? ' · not yet available' : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className={styles.startButton}
        disabled={selected.size === 0}
        onClick={() => onStartSession([...selected].sort())}
      >
        Start Studying
      </button>
    </div>
  );
}
