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
 * The single seam between the UI and the Web Speech API
 * (architecture.md §5, DEC-009) — nothing else in this project should call
 * `window.speechSynthesis` directly, same pattern as `storage.ts` for
 * `localStorage`.
 *
 * Voice resolution is asynchronous and platform-dependent: `getVoices()`
 * returns an empty array on first call on most browsers, with the real list
 * arriving via the `voiceschanged` event. A few browsers populate the list
 * without ever firing that event, so a handful of delayed re-checks back it
 * up. `speak()` itself stays fully synchronous (no `await` anywhere in its
 * call path) because iOS requires `speechSynthesis.speak()` to be invoked
 * synchronously inside the user-gesture handler that triggered it — if
 * voice resolution isn't finished yet, it simply has no voice to speak
 * with (`isSpeechAvailable()` returns false) rather than awaiting it.
 *
 * Voice matching is deliberately narrow: an exact `zh-CN` voice is
 * preferred; failing that, an exact `zh-Hans` voice (a script-only tag some
 * engines use for "Chinese, Simplified" with no region). `zh-TW`/`zh-HK`
 * are never selected — correct Chinese voices, wrong regional
 * pronunciation for Mandarin as taught here.
 */

// Web Speech API's `rate` is a unitless multiplier of the voice's own
// default speed (1 = that voice's own default), not a real-world
// units-per-second value. 1 read as "too fast and unclear" for a learner in
// practice (owner feedback, live-tested against this build); the UI now
// exposes a continuous slider rather than a fixed normal/slow pair, bounded
// to a range that stays intelligible at either end — both the bounds and
// the default are chosen by ear, not derived from a spec.
export const SPEECH_RATE_MIN = 0.5;
export const SPEECH_RATE_MAX = 1.5;
export const SPEECH_RATE_STEP = 0.05;

// Apple ships a fixed set of generic, multi-language "persona" voices —
// Eddy, Flo, Grandma, Grandpa, Reed, Rocko, Sandy, Shelley — under every
// language a persona supports, distinguishable by name from a language's
// own standard voice only in that the persona's name carries a trailing
// "(Language (Region))" tag (e.g. "Eddy (Chinese (China mainland))") where
// a standard voice's does not (e.g. "Tingting"). `find()` picking whichever
// sorts first alphabetically among same-language candidates can land on one
// of these personas instead of the standard voice, and personas are tuned
// for character over clarity — confirmed live (owner feedback: "too fast
// and unclear") against a real voice list containing exactly this pattern.
// Preferring an unsuffixed name first is a heuristic, not a spec: on
// platforms without this naming convention it simply never matches and
// falls through to the existing first-match behaviour, unchanged.
const PERSONA_VOICE_NAME_PATTERN = /\([^()]*\([^()]*\)\)\s*$/;

function isLikelyPersonaVoice(voice: SpeechSynthesisVoice): boolean {
  return PERSONA_VOICE_NAME_PATTERN.test(voice.name);
}

/** Exported for unit testing against a mocked voice list — jsdom does not
 *  implement the Web Speech API at all, so this is the one piece of
 *  matching logic that can be verified without a real browser. */
export function selectMandarinVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  return pickBestMatch(voices, 'zh-cn') ?? pickBestMatch(voices, 'zh-hans');
}

function pickBestMatch(
  voices: readonly SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null {
  const candidates = voices.filter((v) => v.lang.toLowerCase() === lang);
  if (candidates.length === 0) return null;
  const nonPersona = candidates.find((v) => !isLikelyPersonaVoice(v));
  return nonPersona ?? candidates[0] ?? null;
}

function getSynth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null;
}

let cachedVoice: SpeechSynthesisVoice | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function refreshVoice(): void {
  const synth = getSynth();
  if (!synth) return;
  const next = selectMandarinVoice(synth.getVoices());
  if (next !== cachedVoice) {
    cachedVoice = next;
    listeners.forEach((listener) => {
      listener();
    });
  }
}

/** Runs once, on the first subscription: an eager synchronous attempt, plus
 *  the `voiceschanged` listener and its delayed-recheck fallback. Not run
 *  from `isSpeechAvailable()` itself, which must stay a pure snapshot read
 *  (it backs a `useSyncExternalStore` hook). */
function ensureInitialized(): void {
  if (initialized) return;
  initialized = true;
  const synth = getSynth();
  if (!synth) return;
  refreshVoice();
  synth.addEventListener('voiceschanged', refreshVoice);
  for (const delayMs of [100, 500, 1500]) {
    setTimeout(refreshVoice, delayMs);
  }
}

/** Pure snapshot read — the currently cached voice-availability state,
 *  with no side effects. Call `subscribeSpeechAvailability` at least once
 *  (e.g. via `useSpeechAvailable`) to actually start resolving voices. */
export function isSpeechAvailable(): boolean {
  return cachedVoice !== null;
}

/** For `useSyncExternalStore`. Triggers voice resolution on first call. */
export function subscribeSpeechAvailability(callback: () => void): () => void {
  ensureInitialized();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Speaks `text` with the resolved Mandarin voice at the given rate. No-op
 * if no Mandarin voice is available — callers should check
 * `isSpeechAvailable()` (or `useSpeechAvailable()`) and disable the
 * triggering control rather than relying on this silently doing nothing.
 * Always cancels any in-flight utterance first, so rapid re-triggering
 * interrupts rather than queues (roadmap M4 gate #4).
 */
export function speak(text: string, rate: number): void {
  const synth = getSynth();
  if (!synth || !cachedVoice) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  // Always zh-CN regardless of the matched voice's own lang tag (zh-Hans is
  // accepted as a fallback voice but the utterance's declared language is
  // always the one CLAUDE.md and FR-42 actually specify).
  utterance.lang = 'zh-CN';
  utterance.voice = cachedVoice;
  utterance.rate = rate;
  synth.speak(utterance);
}
