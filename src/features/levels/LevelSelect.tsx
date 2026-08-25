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
 * Level Select (ux-specification.md §4.1), scoped to WO-011/M2: shows all
 * six levels with their real compiled counts (from `public/decks/manifest.json`,
 * so a beginner never fetches all six decks just to see counts), but only a
 * `reviewed` level is selectable — currently HSK 1 only, per
 * [DEC-025](../../../docs/project/decision-log.md). Due counts (FR-24, FR-64),
 * multi-select (FR-23), and last-level memory (FR-25) are M3/M5 scope, not
 * this work order's.
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
  onSelectLevel: (level: HskLevel) => void;
  onOpenSettings: () => void;
}

export function LevelSelect({ onSelectLevel, onOpenSettings }: LevelSelectProps) {
  const [manifest, setManifest] = useState<Manifest | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/decks/manifest.json')
      .then((r) => r.json() as Promise<Manifest>)
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch(() => {
        // Left as an exercise for later polish (M2 out of scope): a failed
        // manifest fetch currently just leaves counts blank rather than
        // blocking the screen — the level buttons themselves still work.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <h1 className={styles.heading}>Chinese Flashcards</h1>
        <button type="button" className={styles.settingsLink} onClick={onOpenSettings}>
          Settings
        </button>
      </div>

      <ul className={styles.levelList}>
        {LEVELS.map((level) => {
          const entry = manifest?.[level];
          const available = entry?.reviewed ?? false;
          return (
            <li key={level}>
              <button
                type="button"
                className={styles.levelButton}
                disabled={!available}
                onClick={() => available && onSelectLevel(level)}
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
    </div>
  );
}
