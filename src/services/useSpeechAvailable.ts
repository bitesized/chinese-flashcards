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
 * A thin React wrapper around `speech.ts`'s subscription API, kept in its
 * own file specifically so `speech.ts` itself stays framework-free (WO-012:
 * "a plain service module, consumed via a small hook or direct calls").
 * Shared by `StudySession.tsx` and the Hanzi section's character page —
 * two independent places that both need to know whether a Mandarin voice
 * is available right now.
 */

import { useSyncExternalStore } from 'react';
import { isSpeechAvailable, subscribeSpeechAvailability } from './speech.js';

export function useSpeechAvailable(): boolean {
  return useSyncExternalStore(subscribeSpeechAvailability, isSpeechAvailable);
}
