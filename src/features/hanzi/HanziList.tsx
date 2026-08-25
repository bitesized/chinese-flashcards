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
 * The Hanzi section's entry screen (FR-80, FR-85, M8): a searchable,
 * browsable list of every individual character used across HSK 1-6,
 * independent of the word decks and reachable without starting a study
 * session. Filters by the character itself or by a Pinyin substring
 * (diacritic-insensitive is out of scope for this first pass — matches
 * against the exact diacritic form shown, e.g. "ni" will not match "nǐ";
 * this is a known, acceptable limitation, not an oversight).
 */

import { useEffect, useMemo, useState } from 'react';
import { loadHanziIndex } from '../../services/hanzi.js';
import styles from './HanziList.module.css';
import type { HanziIndexEntry } from '../../domain/hanzi.js';

export interface HanziListProps {
  onSelectCharacter: (character: string) => void;
  onOpenPracticeGrid: () => void;
  onBack: () => void;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: HanziIndexEntry[] };

export function HanziList({ onSelectCharacter, onOpenPracticeGrid, onBack }: HanziListProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadHanziIndex()
      .then((entries) => {
        if (!cancelled) setLoadState({ status: 'ready', entries });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Unknown error';
        setLoadState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (loadState.status !== 'ready') return [];
    const q = query.trim().toLowerCase();
    if (q === '') return loadState.entries;
    return loadState.entries.filter(
      (entry) =>
        entry.character.includes(q) || entry.readings.some((r) => r.toLowerCase().includes(q)),
    );
  }, [loadState, query]);

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <button type="button" className={styles.iconButton} onClick={onBack}>
          ← Level Select
        </button>
        <h1 className={styles.heading}>Hanzi</h1>
        <button type="button" className={styles.iconButton} onClick={onOpenPracticeGrid}>
          Practice grid
        </button>
      </div>

      <input
        type="search"
        className={styles.searchInput}
        placeholder="Search by character or pinyin…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search characters"
      />

      {loadState.status === 'loading' && <p className={styles.message}>Loading…</p>}

      {loadState.status === 'error' && (
        <p className={styles.message} role="alert">
          Couldn&rsquo;t load the character list. {loadState.message}
        </p>
      )}

      {loadState.status === 'ready' && (
        <>
          <p className={styles.count}>
            {filtered.length} of {loadState.entries.length} characters
          </p>
          <ul className={styles.grid}>
            {filtered.map((entry) => (
              <li key={entry.character}>
                <button
                  type="button"
                  className={styles.charButton}
                  onClick={() => onSelectCharacter(entry.character)}
                >
                  <span lang="zh-Hans" className={styles.char}>
                    {entry.character}
                  </span>
                  <span lang="zh-Latn-pinyin" className={styles.reading}>
                    {entry.readings[0]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {filtered.length === 0 && <p className={styles.message}>No characters match.</p>}
        </>
      )}
    </div>
  );
}
