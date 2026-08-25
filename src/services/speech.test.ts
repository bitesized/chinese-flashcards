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
import { selectMandarinVoice } from './speech.js';

// jsdom does not implement the Web Speech API at all — every voice used
// here is a plain object shaped like the bits of SpeechSynthesisVoice this
// module actually reads (name, lang), cast through `as unknown as
// SpeechSynthesisVoice[]` since the real interface has more fields no test
// needs to fill in.
function voice(name: string, lang: string) {
  return { name, lang } as unknown as SpeechSynthesisVoice;
}

describe('selectMandarinVoice — matching rule (architecture.md §5)', () => {
  it('prefers an exact zh-CN voice', () => {
    const voices = [voice('Some Voice', 'en-US'), voice('Tingting', 'zh-CN')];
    expect(selectMandarinVoice(voices)?.name).toBe('Tingting');
  });

  it('falls back to zh-Hans when no zh-CN voice exists', () => {
    const voices = [voice('Some Voice', 'en-US'), voice('Generic Mandarin', 'zh-Hans')];
    expect(selectMandarinVoice(voices)?.name).toBe('Generic Mandarin');
  });

  it('never selects zh-TW or zh-HK', () => {
    const voices = [voice('Meijia', 'zh-TW'), voice('Sinji', 'yue-HK')];
    expect(selectMandarinVoice(voices)).toBeNull();
  });

  it('returns null when no candidate voice exists at all', () => {
    expect(selectMandarinVoice([])).toBeNull();
    expect(selectMandarinVoice([voice('Karen', 'en-AU')])).toBeNull();
  });

  it('matching is case-insensitive on the lang tag', () => {
    const voices = [voice('Odd Casing Voice', 'ZH-cn')];
    expect(selectMandarinVoice(voices)?.name).toBe('Odd Casing Voice');
  });
});

describe('selectMandarinVoice — persona-voice deprioritisation', () => {
  // Real voice list captured from a macOS Chromium install during WO-012:
  // eight generic, multi-language "persona" voices (Eddy, Flo, Grandma,
  // Grandpa, Reed, Rocko, Sandy, Shelley — the same names exist under every
  // language, e.g. "Eddy (Japanese (Japan))") plus Tingting, macOS's
  // long-standing standard Mandarin voice. A plain `find()` on array order
  // picked "Eddy" (alphabetically first) — confirmed live to sound worse
  // for a learner than Tingting (owner feedback: "too fast and unclear").
  const macOSVoiceList = [
    voice('Eddy (Chinese (China mainland))', 'zh-CN'),
    voice('Flo (Chinese (China mainland))', 'zh-CN'),
    voice('Grandma (Chinese (China mainland))', 'zh-CN'),
    voice('Grandpa (Chinese (China mainland))', 'zh-CN'),
    voice('Reed (Chinese (China mainland))', 'zh-CN'),
    voice('Rocko (Chinese (China mainland))', 'zh-CN'),
    voice('Sandy (Chinese (China mainland))', 'zh-CN'),
    voice('Shelley (Chinese (China mainland))', 'zh-CN'),
    voice('Tingting', 'zh-CN'),
  ];

  it('prefers the unsuffixed standard voice over persona voices, regardless of array order', () => {
    expect(selectMandarinVoice(macOSVoiceList)?.name).toBe('Tingting');
    expect(selectMandarinVoice([...macOSVoiceList].reverse())?.name).toBe('Tingting');
  });

  it('falls back to a persona voice when no standard voice is present', () => {
    const personasOnly = macOSVoiceList.filter((v) => v.name !== 'Tingting');
    expect(selectMandarinVoice(personasOnly)?.name).toBe('Eddy (Chinese (China mainland))');
  });

  it('does not misclassify an ordinary parenthetical dialect note as a persona name', () => {
    // A single, non-nested parenthetical (no "(Language (Region))" nesting)
    // must not be deprioritised — only the specific nested pattern Apple's
    // persona voices use should match.
    const voices = [voice('Standard Voice (Mainland)', 'zh-CN')];
    expect(selectMandarinVoice(voices)?.name).toBe('Standard Voice (Mainland)');
  });
});

describe('speech service — voice availability and speak() (mocked Web Speech API)', () => {
  let cancelSpy: ReturnType<typeof vi.fn>;
  let speakSpy: ReturnType<typeof vi.fn>;
  let listeners: Record<string, () => void>;

  beforeEach(() => {
    // The service schedules real setTimeout fallback re-checks (100ms,
    // 500ms, 1500ms — architecture.md §5, for engines that never fire
    // voiceschanged). Left as real timers, those would fire minutes into
    // an unrelated later test against whatever global happens to be
    // stubbed at that moment. Fake timers make them inert and
    // deterministically discardable instead.
    vi.useFakeTimers();
    vi.resetModules();
    cancelSpy = vi.fn();
    speakSpy = vi.fn();
    listeners = {};
    vi.stubGlobal('speechSynthesis', {
      getVoices: vi.fn().mockReturnValue([]),
      cancel: cancelSpy,
      speak: speakSpy,
      addEventListener: (event: string, cb: () => void) => {
        listeners[event] = cb;
      },
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      vi.fn().mockImplementation(function (this: { text: string }, text: string) {
        this.text = text;
      }),
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('isSpeechAvailable is false before any voice resolves, true after a matching voice appears', async () => {
    const speech = await import('./speech.js');
    expect(speech.isSpeechAvailable()).toBe(false);

    const unsubscribe = speech.subscribeSpeechAvailability(() => {});
    // Module-load-time getVoices() returned [] above; simulate the voice
    // list arriving via the voiceschanged event, per architecture.md §5.
    (
      window.speechSynthesis.getVoices as unknown as { mockReturnValue: (v: unknown) => void }
    ).mockReturnValue([voice('Tingting', 'zh-CN')]);
    listeners.voiceschanged?.();

    expect(speech.isSpeechAvailable()).toBe(true);
    unsubscribe();
  });

  it('speak() cancels any in-flight utterance before speaking (roadmap M4 gate #4)', async () => {
    const speech = await import('./speech.js');
    speech.subscribeSpeechAvailability(() => {});
    (
      window.speechSynthesis.getVoices as unknown as { mockReturnValue: (v: unknown) => void }
    ).mockReturnValue([voice('Tingting', 'zh-CN')]);
    listeners.voiceschanged?.();

    speech.speak('你好', 0.7);

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(speakSpy).toHaveBeenCalledTimes(1);
    const callOrder = cancelSpy.mock.invocationCallOrder[0]!;
    const speakOrder = speakSpy.mock.invocationCallOrder[0]!;
    expect(callOrder).toBeLessThan(speakOrder);
  });

  it('speak() sets lang to zh-CN and applies the given rate, speaking the headword text', async () => {
    const speech = await import('./speech.js');
    speech.subscribeSpeechAvailability(() => {});
    (
      window.speechSynthesis.getVoices as unknown as { mockReturnValue: (v: unknown) => void }
    ).mockReturnValue([voice('Tingting', 'zh-CN')]);
    listeners.voiceschanged?.();

    speech.speak('茶', 0.7);

    const utterance = speakSpy.mock.calls[0]?.[0] as { text: string; lang: string; rate: number };
    expect(utterance.text).toBe('茶');
    expect(utterance.lang).toBe('zh-CN');
    expect(utterance.rate).toBe(0.7);
  });

  it('speak() is a no-op when no Mandarin voice is available', async () => {
    const speech = await import('./speech.js');
    speech.subscribeSpeechAvailability(() => {});
    // getVoices() stays [] — no voiceschanged firing, matching the "device
    // has no Mandarin voice" case (FR-43).
    speech.speak('你好', 0.7);
    expect(speakSpy).not.toHaveBeenCalled();
  });
});
