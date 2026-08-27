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
import { CustomDeckEditor } from './CustomDeckEditor.js';
import { createDeck } from '../../services/customDecks.js';
import type { CustomDeck } from '../../domain/customDeck.js';
import type { LookupIndexEntry } from '../../domain/cedictLookup.js';

function freshDeck(name = 'Test deck'): CustomDeck {
  const result = createDeck(name);
  if (!result.deck) throw new Error('setup failed: createDeck did not return a deck');
  return result.deck;
}

describe('CustomDeckEditor — manual card entry', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('adds a card with headword, reading, and multiple meanings', async () => {
    const user = userEvent.setup();
    render(<CustomDeckEditor deck={freshDeck()} onBack={() => {}} />);

    await user.type(screen.getByLabelText('Headword'), '谢谢');
    await user.type(screen.getByLabelText('Reading (optional)'), 'xièxie');
    await user.type(screen.getByLabelText('Meanings (one per line)'), 'thank you{enter}thanks');
    await user.click(screen.getByRole('button', { name: 'Add card' }));

    expect(screen.getByText('谢谢')).toBeInTheDocument();
    expect(screen.getByText('thank you; thanks')).toBeInTheDocument();
    expect(screen.getByText('Cards (1)')).toBeInTheDocument();
  });

  it('rejects a card with no headword (native `required` blocks the submit)', async () => {
    const user = userEvent.setup();
    render(<CustomDeckEditor deck={freshDeck()} onBack={() => {}} />);

    await user.type(screen.getByLabelText('Meanings (one per line)'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Add card' }));

    expect(screen.getByText('No cards yet — add one above.')).toBeInTheDocument();
  });

  it('edits an existing card in place', async () => {
    const deck = freshDeck();
    const user = userEvent.setup();
    render(<CustomDeckEditor deck={deck} onBack={() => {}} />);

    await user.type(screen.getByLabelText('Headword'), '再见');
    await user.type(screen.getByLabelText('Meanings (one per line)'), 'goodbye');
    await user.click(screen.getByRole('button', { name: 'Add card' }));

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const editHeadword = screen.getByDisplayValue('再见');
    await user.clear(editHeadword);
    await user.type(editHeadword, '再會');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('再會')).toBeInTheDocument();
    expect(screen.queryByText('再见')).not.toBeInTheDocument();
  });

  it('deletes a card', async () => {
    const deck = freshDeck();
    const user = userEvent.setup();
    render(<CustomDeckEditor deck={deck} onBack={() => {}} />);

    await user.type(screen.getByLabelText('Headword'), '苹果');
    await user.type(screen.getByLabelText('Meanings (one per line)'), 'apple');
    await user.click(screen.getByRole('button', { name: 'Add card' }));
    expect(screen.getByText('苹果')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.queryByText('苹果')).not.toBeInTheDocument();
    expect(screen.getByText('No cards yet — add one above.')).toBeInTheDocument();
  });

  it('renaming the deck persists via updateDeckMeta on blur', async () => {
    const user = userEvent.setup();
    render(<CustomDeckEditor deck={freshDeck('Old name')} onBack={() => {}} />);

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'New name');
    await user.tab(); // triggers onBlur

    // No error rendered, and the field keeps the new value.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(nameInput).toHaveValue('New name');
  });
});

describe('CustomDeckEditor — CC-CEDICT lookup (DEC-037)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const INDEX: LookupIndexEntry[] = [['你好:ni3hao3', '你好', null, 'ni3 hao3']];
  const DETAIL = {
    headword: '你好',
    reading: 'nǐ hǎo',
    readingNumeric: 'ni3 hao3',
    senses: ['hello', 'hi'],
  };

  // cedictLookup.ts caches its fetches at module scope (by design — one
  // fetch per page session, decks.ts's precedent). Each test here needs its
  // own fresh cache, or a later test would silently reuse an earlier test's
  // fetchMock response — vi.resetModules() plus a dynamic re-import of
  // CustomDeckEditor (which statically imports cedictLookup.ts) is what
  // actually gets a clean cache, not just a reassigned fetchMock.
  let Editor: typeof CustomDeckEditor;

  beforeEach(async () => {
    window.localStorage.clear();
    vi.resetModules();
    fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('index.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(INDEX) });
      }
      if (url.includes('detail-')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ '你好:ni3hao3': DETAIL }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    ({ CustomDeckEditor: Editor } = await import('./CustomDeckEditor.js'));
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('looks up a word, shows a candidate, and pre-fills the add-card form on selection', async () => {
    const user = userEvent.setup();
    render(<Editor deck={freshDeck()} onBack={() => {}} />);

    await user.type(screen.getByLabelText('Hanzi or Pinyin'), 'nihao');
    await user.click(screen.getByRole('button', { name: 'Look up' }));

    const candidate = await screen.findByRole('button', { name: /你好/ });
    await user.click(candidate);

    await waitFor(() => expect(screen.getByLabelText('Headword')).toHaveValue('你好'));
    expect(screen.getByLabelText('Reading (optional)')).toHaveValue('nǐ hǎo');
    expect(screen.getByLabelText('Meanings (one per line)')).toHaveValue('hello\nhi');
    expect(screen.getByText(/Filled in from CC-CEDICT/)).toBeInTheDocument();
  });

  it('removing a pre-filled sense line before saving keeps only what remains', async () => {
    const user = userEvent.setup();
    render(<Editor deck={freshDeck()} onBack={() => {}} />);

    await user.type(screen.getByLabelText('Hanzi or Pinyin'), 'nihao');
    await user.click(screen.getByRole('button', { name: 'Look up' }));
    await user.click(await screen.findByRole('button', { name: /你好/ }));
    await waitFor(() => expect(screen.getByLabelText('Headword')).toHaveValue('你好'));

    const sensesField = screen.getByLabelText('Meanings (one per line)');
    await user.clear(sensesField);
    await user.type(sensesField, 'hello');
    await user.click(screen.getByRole('button', { name: 'Add card' }));

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.queryByText('hello; hi')).not.toBeInTheDocument();
  });

  it('shows the CC BY-SA attribution notice once a looked-up card is added, not before', async () => {
    const user = userEvent.setup();
    render(<Editor deck={freshDeck()} onBack={() => {}} />);
    expect(screen.queryByText(/CC BY-SA 4.0/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Hanzi or Pinyin'), 'nihao');
    await user.click(screen.getByRole('button', { name: 'Look up' }));
    await user.click(await screen.findByRole('button', { name: /你好/ }));
    await waitFor(() => expect(screen.getByLabelText('Headword')).toHaveValue('你好'));
    await user.click(screen.getByRole('button', { name: 'Add card' }));

    expect(screen.getByText(/CC BY-SA 4.0/)).toBeInTheDocument();
  });

  it('shows a "no match" hint for a query the index has nothing for', async () => {
    const user = userEvent.setup();
    render(<Editor deck={freshDeck()} onBack={() => {}} />);

    await user.type(screen.getByLabelText('Hanzi or Pinyin'), 'zzz-not-a-word');
    await user.click(screen.getByRole('button', { name: 'Look up' }));

    expect(await screen.findByText(/No match for/)).toBeInTheDocument();
  });

  it('shows an error if the index fetch fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const user = userEvent.setup();
    render(<Editor deck={freshDeck()} onBack={() => {}} />);

    await user.type(screen.getByLabelText('Hanzi or Pinyin'), 'nihao');
    await user.click(screen.getByRole('button', { name: 'Look up' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load the dictionary/);
  });
});
