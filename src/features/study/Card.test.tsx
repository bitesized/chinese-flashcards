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

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from './Card.js';
import type { Card as CardData } from '../../domain/card.js';

function makeCard(overrides: Partial<CardData> = {}): CardData {
  return {
    id: '你好:ni3hao3',
    headword: '你好',
    reading: 'nǐ hǎo',
    readingNumeric: 'ni3 hao3',
    senses: ['hello; hi'],
    levels: ['1'],
    source: 'cc-cedict',
    review: 'approved',
    ...overrides,
  };
}

describe('Card — flip (FR-2, FR-4; ux-specification.md §4.2)', () => {
  it('calls onFlip when clicked', async () => {
    const onFlip = vi.fn();
    const user = userEvent.setup();
    render(<Card card={makeCard()} face="front" pinyinFront pinyinBack onFlip={onFlip} />);
    await user.click(screen.getByRole('button'));
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it('calls onFlip on Enter and on Space', async () => {
    const onFlip = vi.fn();
    const user = userEvent.setup();
    render(<Card card={makeCard()} face="front" pinyinFront pinyinBack onFlip={onFlip} />);
    const button = screen.getByRole('button');
    button.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onFlip).toHaveBeenCalledTimes(2);
  });

  it('is a real button-role control with an accurate accessible name on each face', () => {
    const { rerender } = render(
      <Card card={makeCard()} face="front" pinyinFront pinyinBack onFlip={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /showing character/i })).toBeInTheDocument();

    rerender(<Card card={makeCard()} face="back" pinyinFront pinyinBack onFlip={() => {}} />);
    expect(screen.getByRole('button', { name: /showing meaning/i })).toBeInTheDocument();
  });

  it('both faces are present in the DOM regardless of which is showing (never delays content)', () => {
    render(
      <Card
        card={makeCard({ senses: ['hello'] })}
        face="front"
        pinyinFront
        pinyinBack
        onFlip={() => {}}
      />,
    );
    // Headword renders twice: once per face.
    expect(screen.getAllByText('你好')).toHaveLength(2);
    // Back-face content (the sense) is already in the DOM even though front is showing.
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});

describe('Card — Pinyin toggle independence (FR-11)', () => {
  it.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ])('pinyinFront=%s, pinyinBack=%s renders the expected combination', (front, back) => {
    render(
      <Card
        card={makeCard()}
        face="front"
        pinyinFront={front}
        pinyinBack={back}
        onFlip={() => {}}
      />,
    );
    const pinyinNodes = screen.queryAllByText('nǐ hǎo');
    // One pinyin node per face where that face's toggle is on.
    const expectedCount = (front ? 1 : 0) + (back ? 1 : 0);
    expect(pinyinNodes).toHaveLength(expectedCount);
  });

  it('tags Pinyin with lang="zh-Latn-pinyin" (NFR-8)', () => {
    render(<Card card={makeCard()} face="front" pinyinFront pinyinBack onFlip={() => {}} />);
    const [pinyin] = screen.getAllByText('nǐ hǎo');
    expect(pinyin).toHaveAttribute('lang', 'zh-Latn-pinyin');
  });

  it('tags the Hanzi headword with lang="zh-Hans" (NFR-8)', () => {
    render(<Card card={makeCard()} face="front" pinyinFront pinyinBack onFlip={() => {}} />);
    const [hanzi] = screen.getAllByText('你好');
    expect(hanzi).toHaveAttribute('lang', 'zh-Hans');
  });
});

describe('Card — senses (ux-specification.md §7.2)', () => {
  it('shows all senses when there are six or fewer', () => {
    const senses = ['a', 'b', 'c', 'd', 'e', 'f'];
    render(
      <Card card={makeCard({ senses })} face="back" pinyinFront pinyinBack onFlip={() => {}} />,
    );
    for (const sense of senses) expect(screen.getByText(sense)).toBeInTheDocument();
    expect(screen.queryByText(/more/i)).not.toBeInTheDocument();
  });

  it('truncates to the first four and shows a "more" control beyond six senses', async () => {
    const senses = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const user = userEvent.setup();
    render(
      <Card card={makeCard({ senses })} face="back" pinyinFront pinyinBack onFlip={() => {}} />,
    );
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('d')).toBeInTheDocument();
    expect(screen.queryByText('e')).not.toBeInTheDocument();

    const moreButton = screen.getByRole('button', { name: /more/i });
    await user.click(moreButton);
    expect(screen.getByText('g')).toBeInTheDocument();
  });

  it('shows the classifier separately when present (FR-6)', () => {
    render(
      <Card
        card={makeCard({
          classifiers: [
            { simplified: '本', traditional: '本', reading: 'běn', readingNumeric: 'ben3' },
          ],
        })}
        face="back"
        pinyinFront
        pinyinBack
        onFlip={() => {}}
      />,
    );
    expect(screen.getByText(/本/)).toBeInTheDocument();
  });

  it('does not render a classifier line when there is none', () => {
    render(<Card card={makeCard()} face="back" pinyinFront pinyinBack onFlip={() => {}} />);
    expect(screen.queryByText(/^CL:/)).not.toBeInTheDocument();
  });
});
