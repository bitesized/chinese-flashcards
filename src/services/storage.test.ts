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

  it('does not reset a pre-WO-012 settings object missing speechRate/autoplayOnReveal (WO-012 AC7)', () => {
    // Same schemaVersion (1) as today, shaped exactly like a settings object
    // saved before WO-012 added these two fields — schemaVersion was not
    // bumped for this addition (see runtime.ts), so a stored object like
    // this must merge with defaults, not be discarded wholesale.
    const preWo012Stored = {
      schemaVersion: DEFAULT_SETTINGS.schemaVersion,
      pinyinFront: false,
      pinyinBack: true,
      cardOrder: 'sequential',
      theme: 'dark',
      lastLevels: ['2'],
    };
    window.localStorage.setItem('chinese-flashcards:settings', JSON.stringify(preWo012Stored));
    const loaded = loadSettings();
    // The pre-existing fields survive exactly as stored...
    expect(loaded.pinyinFront).toBe(false);
    expect(loaded.pinyinBack).toBe(true);
    expect(loaded.cardOrder).toBe('sequential');
    expect(loaded.theme).toBe('dark');
    expect(loaded.lastLevels).toEqual(['2']);
    // ...and the two new fields are filled in from defaults, not left
    // undefined or crashing anything that reads them.
    expect(loaded.speechRate).toBe(DEFAULT_SETTINGS.speechRate);
    expect(loaded.autoplayOnReveal).toBe(DEFAULT_SETTINGS.autoplayOnReveal);
  });
});
