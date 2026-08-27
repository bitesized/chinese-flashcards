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
 * "My Decks" (DEC-036, WO-019): list, create, import, export, delete, and
 * launch study/edit for custom decks. All persistence goes through
 * services/customDecks.ts — this component owns no storage logic itself.
 */

import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import styles from './CustomDeckList.module.css';
import {
  createDeck,
  deckNeedsAttribution,
  deleteDeck,
  exportDeckToJson,
  importDeckFromText,
  listDecks,
} from '../../services/customDecks.js';
import type { CustomDeck } from '../../domain/customDeck.js';

export interface CustomDeckListProps {
  onBack: () => void;
  onStudy: (deck: CustomDeck) => void;
  onEdit: (deck: CustomDeck) => void;
}

function formatUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function CustomDeckList({ onBack, onStudy, onEdit }: CustomDeckListProps) {
  const [decks, setDecks] = useState<CustomDeck[]>(() => listDecks());
  const [newDeckName, setNewDeckName] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCreate() {
    const result = createDeck(newDeckName);
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error ?? 'Could not create the deck.' });
      return;
    }
    setDecks(listDecks());
    setNewDeckName('');
    setCreating(false);
    setMessage(null);
    if (result.deck) onEdit(result.deck);
  }

  function handleDelete(id: string) {
    deleteDeck(id);
    setDecks(listDecks());
    setConfirmDeleteId(null);
  }

  function handleExport(deck: CustomDeck) {
    const json = exportDeckToJson(deck);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeName =
      deck.name
        .trim()
        .replace(/[^\w-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'deck';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const text = await file.text();
    const result = importDeckFromText(text);
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error ?? 'Could not import this file.' });
      return;
    }
    setDecks(listDecks());
    setMessage({ kind: 'success', text: `Imported "${result.deck?.name}".` });
  }

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          ← Level Select
        </button>
        <h1 className={styles.heading}>My Decks</h1>
      </div>

      {message && (
        <p
          className={message.kind === 'error' ? styles.errorMessage : styles.successMessage}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}

      <div className={styles.actionsRow}>
        {creating ? (
          <div className={styles.createForm}>
            <label className={styles.srOnly} htmlFor="new-deck-name">
              Deck name
            </label>
            <input
              id="new-deck-name"
              type="text"
              className={styles.textInput}
              placeholder="Deck name"
              value={newDeckName}
              autoFocus
              onChange={(e) => setNewDeckName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setCreating(false);
                  setNewDeckName('');
                }
              }}
            />
            <button type="button" className={styles.primaryButton} onClick={handleCreate}>
              Create
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                setCreating(false);
                setNewDeckName('');
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className={styles.primaryButton} onClick={() => setCreating(true)}>
            + New deck
          </button>
        )}
        <button type="button" className={styles.secondaryButton} onClick={handleImportClick}>
          Import from JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className={styles.srOnly}
          onChange={(e) => void handleFileSelected(e)}
          aria-label="Import deck from JSON file"
        />
      </div>

      {decks.length === 0 ? (
        <p className={styles.emptyState}>
          No custom decks yet. Create one, or import a deck someone shared with you as a{' '}
          <code>.json</code> file.
        </p>
      ) : (
        <ul className={styles.deckList}>
          {decks.map((deck) => (
            <li key={deck.id} className={styles.deckRow}>
              <div className={styles.deckInfo}>
                <span className={styles.deckName}>{deck.name}</span>
                <span className={styles.deckMeta}>
                  {deck.cards.length} card{deck.cards.length === 1 ? '' : 's'} · updated{' '}
                  {formatUpdated(deck.updatedAt)}
                  {deckNeedsAttribution(deck)
                    ? ' · includes CC-CEDICT definitions (CC BY-SA 4.0)'
                    : ''}
                </span>
              </div>
              <div className={styles.deckActions}>
                <button
                  type="button"
                  className={styles.actionButton}
                  disabled={deck.cards.length === 0}
                  onClick={() => onStudy(deck)}
                >
                  Study
                </button>
                <button type="button" className={styles.actionButton} onClick={() => onEdit(deck)}>
                  Edit
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => handleExport(deck)}
                >
                  Export
                </button>
                {confirmDeleteId === deck.id ? (
                  <>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => handleDelete(deck.id)}
                    >
                      Confirm delete
                    </button>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => setConfirmDeleteId(deck.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
