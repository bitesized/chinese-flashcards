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

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadSettings, saveSettings } from './storage.js';
import { DEFAULT_SETTINGS } from '../domain/runtime.js';

describe('loadSettings / saveSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips a saved settings object', () => {
    const settings = { ...DEFAULT_SETTINGS, pinyinFront: false, theme: 'dark' as const };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });

  it('survives a reload (a fresh loadSettings call after save)', () => {
    saveSettings({ ...DEFAULT_SETTINGS, cardOrder: 'sequential' });
    // Simulate "reload": nothing but the storage itself persists between calls.
    expect(loadSettings().cardOrder).toBe('sequential');
  });

  it('falls back to defaults on malformed JSON rather than throwing', () => {
    window.localStorage.setItem('chinese-flashcards:settings', 'not json{{{');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults on a schemaVersion mismatch', () => {
    window.localStorage.setItem(
      'chinese-flashcards:settings',
      JSON.stringify({ ...DEFAULT_SETTINGS, schemaVersion: 999 }),
    );
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults when the stored value is not an object', () => {
    window.localStorage.setItem('chinese-flashcards:settings', JSON.stringify('a string'));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
