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
 * Deck editor (DEC-036, WO-019): rename/describe a deck, and add, edit, or
 * delete its cards. Every mutation is persisted immediately through
 * services/customDecks.ts (same "save as you go" pattern as Settings, not a
 * separate draft/save step) so there is never unsaved state to lose on
 * navigating away.
 *
 * DEC-037/WO-019 follow-up: the "Add a card" form gained a CC-CEDICT lookup
 * — type Hanzi or Pinyin, pick a candidate, and its headword/reading/senses
 * pre-fill the same fields below, still as ordinary editable text. Removing
 * a definition is just deleting its line from the senses textarea; nothing
 * about the manual-entry path changed. A card populated this way carries
 * `source: 'cc-cedict'` (services/customDecks.ts's `CardInput`), which is
 * what makes the CC BY-SA 4.0 attribution notice below appear.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import styles from './CustomDeckEditor.module.css';
import {
  addCard,
  deckNeedsAttribution,
  removeCard,
  updateCard,
  updateDeckMeta,
} from '../../services/customDecks.js';
import {
  getLookupDetail,
  loadLookupIndex,
  searchLookupIndex,
} from '../../services/cedictLookup.js';
import type { LookupSearchResult } from '../../services/cedictLookup.js';
import type { CustomCard, CustomDeck } from '../../domain/customDeck.js';

export interface CustomDeckEditorProps {
  deck: CustomDeck;
  onBack: () => void;
}

interface CardFormState {
  headword: string;
  reading: string;
  senses: string;
  notes: string;
}

const EMPTY_FORM: CardFormState = { headword: '', reading: '', senses: '', notes: '' };

function toFormState(card: CustomCard): CardFormState {
  return {
    headword: card.headword,
    reading: card.reading ?? '',
    senses: card.senses.join('\n'),
    notes: card.notes ?? '',
  };
}

export function CustomDeckEditor({ deck: initialDeck, onBack }: CustomDeckEditorProps) {
  const [deck, setDeck] = useState<CustomDeck>(initialDeck);
  const [name, setName] = useState(initialDeck.name);
  const [description, setDescription] = useState(initialDeck.description ?? '');
  const [metaError, setMetaError] = useState<string | null>(null);
  const [newCard, setNewCard] = useState<CardFormState>(EMPTY_FORM);
  const [newCardSource, setNewCardSource] = useState<'cc-cedict' | undefined>(undefined);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CardFormState>(EMPTY_FORM);
  const [editSource, setEditSource] = useState<'cc-cedict' | undefined>(undefined);
  const [editError, setEditError] = useState<string | null>(null);

  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<LookupSearchResult[]>([]);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'searching' | 'error'>('idle');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  async function handleLookup() {
    const query = lookupQuery.trim();
    if (!query) return;
    setLookupStatus('searching');
    setLookupError(null);
    try {
      const index = await loadLookupIndex();
      setLookupResults(searchLookupIndex(index, query));
      setSearchedQuery(query);
      setLookupStatus('idle');
    } catch {
      setLookupStatus('error');
      setLookupError('Could not load the dictionary — check your connection and try again.');
    }
  }

  async function handleSelectResult(id: string) {
    setSelectingId(id);
    setLookupError(null);
    try {
      const detail = await getLookupDetail(id);
      if (!detail) {
        setLookupError('Could not load that entry — try again.');
        return;
      }
      setNewCard({
        headword: detail.headword,
        reading: detail.reading,
        senses: detail.senses.join('\n'),
        notes: newCard.notes,
      });
      setNewCardSource('cc-cedict');
      setLookupResults([]);
      setSearchedQuery(null);
      setLookupQuery('');
    } catch {
      setLookupError('Could not load that entry — try again.');
    } finally {
      setSelectingId(null);
    }
  }

  function saveMeta() {
    const result = updateDeckMeta(deck, { name, description });
    if (!result.ok) {
      setMetaError(result.error ?? 'Could not save.');
      return;
    }
    setMetaError(null);
    if (result.deck) setDeck(result.deck);
  }

  function handleAddCard(event: FormEvent) {
    event.preventDefault();
    const result = addCard(deck, {
      headword: newCard.headword,
      reading: newCard.reading,
      senses: newCard.senses.split('\n'),
      notes: newCard.notes,
      ...(newCardSource ? { source: newCardSource } : {}),
    });
    if (!result.ok) {
      setAddError(result.error ?? 'Could not add the card.');
      return;
    }
    setAddError(null);
    setNewCard(EMPTY_FORM);
    setNewCardSource(undefined);
    if (result.deck) setDeck(result.deck);
  }

  function startEdit(card: CustomCard) {
    setEditingId(card.id);
    setEditForm(toFormState(card));
    setEditSource(card.source);
    setEditError(null);
  }

  function handleSaveEdit(cardId: string) {
    const result = updateCard(deck, cardId, {
      headword: editForm.headword,
      reading: editForm.reading,
      senses: editForm.senses.split('\n'),
      notes: editForm.notes,
      // Preserved from the card being edited (DEC-036/customDeck.ts's
      // CustomCard.source docstring: editing senses doesn't clear it) —
      // there is no UI to set or clear this by hand, since editing here
      // never re-runs a lookup.
      ...(editSource ? { source: editSource } : {}),
    });
    if (!result.ok) {
      setEditError(result.error ?? 'Could not save the card.');
      return;
    }
    setEditError(null);
    setEditingId(null);
    if (result.deck) setDeck(result.deck);
  }

  function handleRemoveCard(cardId: string) {
    const result = removeCard(deck, cardId);
    if (result.deck) setDeck(result.deck);
    if (editingId === cardId) setEditingId(null);
  }

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          ← My Decks
        </button>
        <h1 className={styles.heading}>Edit deck</h1>
      </div>

      {deckNeedsAttribution(deck) && (
        <p className={styles.attributionNotice}>
          This deck includes definitions from CC-CEDICT (cc-cedict.org), licensed CC BY-SA 4.0.
          Sharing this deck must preserve that attribution — the exported file includes it
          automatically.
        </p>
      )}

      <div className={styles.metaForm}>
        <label className={styles.fieldLabel} htmlFor="deck-name">
          Name
        </label>
        <input
          id="deck-name"
          type="text"
          className={styles.textInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveMeta}
        />
        <label className={styles.fieldLabel} htmlFor="deck-description">
          Description (optional)
        </label>
        <textarea
          id="deck-description"
          className={styles.textArea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveMeta}
          rows={2}
        />
        {metaError && (
          <p className={styles.errorMessage} role="alert">
            {metaError}
          </p>
        )}
      </div>

      <div className={styles.lookupBox}>
        <h2 className={styles.sectionHeading}>Look up a word</h2>
        <p className={styles.lookupHint}>
          Type Hanzi or Pinyin to pull in CC-CEDICT&rsquo;s own reading and definitions below — you
          can remove any definition you don&rsquo;t want and add your own notes before saving.
        </p>
        <div className={styles.lookupRow}>
          <label className={styles.srOnly} htmlFor="lookup-query">
            Hanzi or Pinyin
          </label>
          <input
            id="lookup-query"
            type="text"
            className={styles.textInput}
            placeholder="e.g. 你好 or nihao"
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleLookup();
              }
            }}
          />
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void handleLookup()}
            disabled={lookupStatus === 'searching' || lookupQuery.trim().length === 0}
          >
            {lookupStatus === 'searching' ? 'Looking up…' : 'Look up'}
          </button>
        </div>
        {lookupError && (
          <p className={styles.errorMessage} role="alert">
            {lookupError}
          </p>
        )}
        {lookupStatus === 'idle' && searchedQuery !== null && lookupResults.length === 0 && (
          <p className={styles.emptyState}>
            No match for &ldquo;{searchedQuery}&rdquo; — you can still enter the card manually
            below.
          </p>
        )}
        {lookupResults.length > 0 && (
          <ul className={styles.lookupResults}>
            {lookupResults.map(({ entry }) => {
              const [id, simplified, traditional, readingNumeric] = entry;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={styles.lookupResultButton}
                    disabled={selectingId === id}
                    onClick={() => void handleSelectResult(id)}
                  >
                    <span className={styles.lookupResultHeadword} lang="zh-Hans">
                      {simplified}
                      {traditional ? ` (${traditional})` : ''}
                    </span>
                    <span className={styles.lookupResultReading}>{readingNumeric}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form className={styles.cardForm} onSubmit={handleAddCard}>
        <h2 className={styles.sectionHeading}>Add a card</h2>
        {newCardSource === 'cc-cedict' && (
          <p className={styles.sourceHint}>
            Filled in from CC-CEDICT — edit freely, or delete a line under Meanings to remove it.
          </p>
        )}
        <label className={styles.fieldLabel} htmlFor="new-headword">
          Headword
        </label>
        <input
          id="new-headword"
          type="text"
          className={styles.textInput}
          value={newCard.headword}
          onChange={(e) => setNewCard({ ...newCard, headword: e.target.value })}
          required
        />
        <label className={styles.fieldLabel} htmlFor="new-reading">
          Reading (optional)
        </label>
        <input
          id="new-reading"
          type="text"
          className={styles.textInput}
          value={newCard.reading}
          onChange={(e) => setNewCard({ ...newCard, reading: e.target.value })}
        />
        <label className={styles.fieldLabel} htmlFor="new-senses">
          Meanings (one per line)
        </label>
        <textarea
          id="new-senses"
          className={styles.textArea}
          value={newCard.senses}
          onChange={(e) => setNewCard({ ...newCard, senses: e.target.value })}
          rows={3}
          required
        />
        <label className={styles.fieldLabel} htmlFor="new-notes">
          Notes (optional)
        </label>
        <textarea
          id="new-notes"
          className={styles.textArea}
          value={newCard.notes}
          onChange={(e) => setNewCard({ ...newCard, notes: e.target.value })}
          rows={2}
        />
        {addError && (
          <p className={styles.errorMessage} role="alert">
            {addError}
          </p>
        )}
        <button type="submit" className={styles.primaryButton}>
          Add card
        </button>
      </form>

      <h2 className={styles.sectionHeading}>Cards ({deck.cards.length})</h2>
      {deck.cards.length === 0 ? (
        <p className={styles.emptyState}>No cards yet — add one above.</p>
      ) : (
        <ul className={styles.cardList}>
          {deck.cards.map((card) =>
            editingId === card.id ? (
              <li key={card.id} className={styles.cardRow}>
                <label className={styles.fieldLabel} htmlFor={`edit-headword-${card.id}`}>
                  Headword
                </label>
                <input
                  id={`edit-headword-${card.id}`}
                  type="text"
                  className={styles.textInput}
                  value={editForm.headword}
                  onChange={(e) => setEditForm({ ...editForm, headword: e.target.value })}
                />
                <label className={styles.fieldLabel} htmlFor={`edit-reading-${card.id}`}>
                  Reading
                </label>
                <input
                  id={`edit-reading-${card.id}`}
                  type="text"
                  className={styles.textInput}
                  value={editForm.reading}
                  onChange={(e) => setEditForm({ ...editForm, reading: e.target.value })}
                />
                <label className={styles.fieldLabel} htmlFor={`edit-senses-${card.id}`}>
                  Meanings (one per line)
                </label>
                <textarea
                  id={`edit-senses-${card.id}`}
                  className={styles.textArea}
                  value={editForm.senses}
                  onChange={(e) => setEditForm({ ...editForm, senses: e.target.value })}
                  rows={3}
                />
                <label className={styles.fieldLabel} htmlFor={`edit-notes-${card.id}`}>
                  Notes
                </label>
                <textarea
                  id={`edit-notes-${card.id}`}
                  className={styles.textArea}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                />
                {editError && (
                  <p className={styles.errorMessage} role="alert">
                    {editError}
                  </p>
                )}
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => handleSaveEdit(card.id)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li key={card.id} className={styles.cardRow}>
                <div className={styles.cardSummary}>
                  <span className={styles.cardHeadword} lang="zh-Hans">
                    {card.headword}
                  </span>
                  {card.reading && (
                    <span className={styles.cardReading} lang="zh-Latn-pinyin">
                      {card.reading}
                    </span>
                  )}
                  <span className={styles.cardSenses}>{card.senses.join('; ')}</span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => startEdit(card)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => handleRemoveCard(card.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
