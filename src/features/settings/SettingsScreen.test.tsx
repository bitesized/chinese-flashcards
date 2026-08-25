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
import { SettingsScreen } from './SettingsScreen.js';
import { DEFAULT_SETTINGS } from '../../domain/runtime.js';
import type { Settings } from '../../domain/runtime.js';

describe('SettingsScreen (FR-11; each axis independent of the others)', () => {
  it('toggling Front Pinyin off leaves every other setting untouched', async () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, pinyinFront: true, pinyinBack: true };
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SettingsScreen settings={settings} onChange={onChange} onBack={() => {}} />);

    await user.click(
      screen.getByRole('group', { name: 'Front Pinyin' }).querySelector('button:last-child')!,
    );
    expect(onChange).toHaveBeenCalledWith({ ...settings, pinyinFront: false });
  });

  it('changing card order calls onChange with only that field updated', async () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, cardOrder: 'shuffled' };
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SettingsScreen settings={settings} onChange={onChange} onBack={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Sequential' }));
    expect(onChange).toHaveBeenCalledWith({ ...settings, cardOrder: 'sequential' });
  });

  it('reflects the current theme via aria-pressed on the matching segment', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, theme: 'dark' };
    render(<SettingsScreen settings={settings} onChange={() => {}} onBack={() => {}} />);
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('Reset to defaults restores defaults but preserves lastLevels', async () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      pinyinFront: false,
      theme: 'dark',
      lastLevels: ['3'],
    };
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SettingsScreen settings={settings} onChange={onChange} onBack={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, lastLevels: ['3'] });
  });

  it('calls onBack when the back control is activated (keyboard-reachable, native button)', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<SettingsScreen settings={DEFAULT_SETTINGS} onChange={() => {}} onBack={onBack} />);
    screen.getByRole('button', { name: /Back/ }).focus();
    await user.keyboard('{Enter}');
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
