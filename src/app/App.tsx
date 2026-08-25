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
 * App shell — minimal state-based view switching (architecture.md §3: "a
 * full router is optional; revisit only if deep-linking to a level is
 * wanted" — not wanted yet at M2). Three views: Level Select, Study,
 * Settings.
 */

import { useEffect, useState } from 'react';
import { LevelSelect } from '../features/levels/LevelSelect.js';
import { StudySession } from '../features/study/StudySession.js';
import { SettingsScreen } from '../features/settings/SettingsScreen.js';
import { loadSettings, saveSettings } from '../services/storage.js';
import type { Settings } from '../domain/runtime.js';
import type { HskLevel } from '../domain/card.js';

type View = { name: 'level-select' } | { name: 'study'; level: HskLevel } | { name: 'settings' };

export function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [view, setView] = useState<View>({ name: 'level-select' });

  // FR-54: theme applied as a data attribute; 'system' removes the
  // attribute entirely so the CSS files' `prefers-color-scheme` block
  // governs (DEC-008: light/dark are token sets, not duplicated
  // rulesets — src/styles/theme-*.css already define both).
  useEffect(() => {
    if (settings.theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
  }, [settings.theme]);

  function updateSettings(next: Settings) {
    setSettings(next);
    saveSettings(next);
  }

  function togglePinyin(side: 'front' | 'back') {
    updateSettings(
      side === 'front'
        ? { ...settings, pinyinFront: !settings.pinyinFront }
        : { ...settings, pinyinBack: !settings.pinyinBack },
    );
  }

  if (view.name === 'settings') {
    return (
      <SettingsScreen
        settings={settings}
        onChange={updateSettings}
        onBack={() => setView({ name: 'level-select' })}
      />
    );
  }

  if (view.name === 'study') {
    return (
      <StudySession
        level={view.level}
        settings={settings}
        onTogglePinyin={togglePinyin}
        onExit={() => setView({ name: 'level-select' })}
      />
    );
  }

  return (
    <LevelSelect
      onSelectLevel={(level) => setView({ name: 'study', level })}
      onOpenSettings={() => setView({ name: 'settings' })}
    />
  );
}
