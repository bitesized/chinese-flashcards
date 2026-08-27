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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomDeckList } from './CustomDeckList.js';
import { addCard, createDeck } from '../../services/customDecks.js';

describe('CustomDeckList', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    createObjectURL = vi.fn().mockReturnValue('blob:mock');
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows the empty state when there are no custom decks', () => {
    render(<CustomDeckList onBack={() => {}} onStudy={() => {}} onEdit={() => {}} />);
    expect(screen.getByText(/No custom decks yet/)).toBeInTheDocument();
  });

  it('creates a new deck and hands it to onEdit', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<CustomDeckList onBack={() => {}} onStudy={() => {}} onEdit={onEdit} />);

    await user.click(screen.getByRole('button', { name: '+ New deck' }));
    await user.type(screen.getByLabelText('Deck name'), 'My Travel Words');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit.mock.calls[0]?.[0]).toMatchObject({ name: 'My Travel Words', cards: [] });
  });

  it('lists an existing deck with its card count, and disables Study with zero cards', () => {
    createDeck('Empty deck');
    render(<CustomDeckList onBack={() => {}} onStudy={() => {}} onEdit={() => {}} />);
    expect(screen.getByText('Empty deck')).toBeInTheDocument();
    expect(screen.getByText(/0 cards/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study' })).toBeDisabled();
  });

  it('enables Study once the deck has a card, and calls onStudy with it', async () => {
    const created = createDeck('Has cards');
    if (created.deck) addCard(created.deck, { headword: '你好', senses: ['hello'] });
    const onStudy = vi.fn();
    const user = userEvent.setup();
    render(<CustomDeckList onBack={() => {}} onStudy={onStudy} onEdit={() => {}} />);

    const studyButton = screen.getByRole('button', { name: 'Study' });
    expect(studyButton).toBeEnabled();
    await user.click(studyButton);
    expect(onStudy).toHaveBeenCalledTimes(1);
    expect(onStudy.mock.calls[0]?.[0]).toMatchObject({ name: 'Has cards' });
  });

  it('deleting a deck requires a confirm click, then removes it from the list', async () => {
    createDeck('Delete me');
    const user = userEvent.setup();
    render(<CustomDeckList onBack={() => {}} onStudy={() => {}} onEdit={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete me')).toBeInTheDocument(); // not deleted yet
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(screen.queryByText('Delete me')).not.toBeInTheDocument();
  });

  it('importing a valid deck file shows a success message and lists the deck', async () => {
    const payload = {
      schemaVersion: 1,
      id: 'shared-1',
      name: 'Shared deck',
      cards: [{ id: 'c1', headword: '谢谢', senses: ['thank you'] }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const file = new File([JSON.stringify(payload)], 'shared.json', { type: 'application/json' });
    const user = userEvent.setup();
    render(<CustomDeckList onBack={() => {}} onStudy={() => {}} onEdit={() => {}} />);

    const input = screen.getByLabelText('Import deck from JSON file');
    await user.upload(input, file);

    await waitFor(() => expect(screen.getByText(/Imported "Shared deck"/)).toBeInTheDocument());
    expect(screen.getByText('Shared deck')).toBeInTheDocument();
  });

  it('importing an invalid file shows an error and adds no deck', async () => {
    const file = new File(['not json'], 'bad.json', { type: 'application/json' });
    const user = userEvent.setup();
    render(<CustomDeckList onBack={() => {}} onStudy={() => {}} onEdit={() => {}} />);

    const input = screen.getByLabelText('Import deck from JSON file');
    await user.upload(input, file);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/not valid JSON/));
    expect(screen.getByText(/No custom decks yet/)).toBeInTheDocument();
  });

  it('exporting a deck triggers a download of its JSON', async () => {
    // jsdom has no real Blob-URL navigation target; stubbed so the
    // anchor's real .click() (exercised deliberately, not mocked away, to
    // prove the download wiring itself works) doesn't log a benign but
    // noisy "navigation to another Document" warning.
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    createDeck('Export me');
    const user = userEvent.setup();
    render(<CustomDeckList onBack={() => {}} onStudy={() => {}} onEdit={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });
});
