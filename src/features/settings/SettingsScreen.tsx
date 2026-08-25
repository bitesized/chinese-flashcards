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
 * Settings (ux-specification.md §4.4). WO-011/M2: front/back Pinyin, card
 * order, theme, reset-to-defaults. WO-012/M4 added speech rate and
 * autoplay-on-reveal. Everything scheduler-dependent (new-cards-per-day,
 * day-start-hour, export/import) remains out of scope until M5 — see
 * WO-012's Context.
 */

import styles from './SettingsScreen.module.css';
import { DEFAULT_SETTINGS } from '../../domain/runtime.js';
import { SPEECH_RATE_MAX, SPEECH_RATE_MIN, SPEECH_RATE_STEP } from '../../services/speech.js';
import type { Settings } from '../../domain/runtime.js';

export interface SettingsScreenProps {
  settings: Settings;
  onChange: (next: Settings) => void;
  onBack: () => void;
}

export function SettingsScreen({ settings, onChange, onBack }: SettingsScreenProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          ← Back
        </button>
        <h1 className={styles.heading}>Settings</h1>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Front Pinyin</span>
        <div className={styles.segmented} role="group" aria-label="Front Pinyin">
          <button
            type="button"
            className={styles.segmentButton}
            aria-pressed={settings.pinyinFront}
            onClick={() => onChange({ ...settings, pinyinFront: true })}
          >
            On
          </button>
          <button
            type="button"
            className={styles.segmentButton}
            aria-pressed={!settings.pinyinFront}
            onClick={() => onChange({ ...settings, pinyinFront: false })}
          >
            Off
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Back Pinyin</span>
        <div className={styles.segmented} role="group" aria-label="Back Pinyin">
          <button
            type="button"
            className={styles.segmentButton}
            aria-pressed={settings.pinyinBack}
            onClick={() => onChange({ ...settings, pinyinBack: true })}
          >
            On
          </button>
          <button
            type="button"
            className={styles.segmentButton}
            aria-pressed={!settings.pinyinBack}
            onClick={() => onChange({ ...settings, pinyinBack: false })}
          >
            Off
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Card order</span>
        <div className={styles.segmented} role="group" aria-label="Card order">
          <button
            type="button"
            className={styles.segmentButton}
            aria-pressed={settings.cardOrder === 'shuffled'}
            onClick={() => onChange({ ...settings, cardOrder: 'shuffled' })}
          >
            Shuffled
          </button>
          <button
            type="button"
            className={styles.segmentButton}
            aria-pressed={settings.cardOrder === 'sequential'}
            onClick={() => onChange({ ...settings, cardOrder: 'sequential' })}
          >
            Sequential
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Theme</span>
        <div className={styles.segmented} role="group" aria-label="Theme">
          {(['system', 'light', 'dark'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              className={styles.segmentButton}
              aria-pressed={settings.theme === theme}
              onClick={() => onChange({ ...settings, theme })}
            >
              {theme[0]?.toUpperCase()}
              {theme.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.row}>
        <label className={styles.rowLabel} htmlFor="speech-rate">
          Speech speed ({settings.speechRate.toFixed(2)}×)
        </label>
        <input
          id="speech-rate"
          type="range"
          className={styles.slider}
          min={SPEECH_RATE_MIN}
          max={SPEECH_RATE_MAX}
          step={SPEECH_RATE_STEP}
          value={settings.speechRate}
          onChange={(event) => onChange({ ...settings, speechRate: Number(event.target.value) })}
        />
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Autoplay on reveal</span>
        <div className={styles.segmented} role="group" aria-label="Autoplay on reveal">
          <button
            type="button"
            className={styles.segmentButton}
            aria-pressed={settings.autoplayOnReveal}
            onClick={() => onChange({ ...settings, autoplayOnReveal: true })}
          >
            On
          </button>
          <button
            type="button"
            className={styles.segmentButton}
            aria-pressed={!settings.autoplayOnReveal}
            onClick={() => onChange({ ...settings, autoplayOnReveal: false })}
          >
            Off
          </button>
        </div>
      </div>

      <button
        type="button"
        className={styles.resetButton}
        onClick={() => onChange({ ...DEFAULT_SETTINGS, lastLevels: settings.lastLevels })}
      >
        Reset to defaults
      </button>
    </div>
  );
}
