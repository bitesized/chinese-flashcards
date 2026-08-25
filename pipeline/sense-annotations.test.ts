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

import { describe, expect, it } from 'vitest';
import { SenseAnnotationError, transformSenseAnnotations } from './sense-annotations.js';

// Every worked example from LR-001 (docs/workstream/reviews/LR-001-pronunciation-annotation-brackets.md),
// transcribed exactly, plus real corpus lines used as regression fixtures.
describe('transformSenseAnnotations — LR-001 §1.2/§1.3, Mandarin pronunciation variants', () => {
  it.each([
    ['also pr. [tou4]', 'also pr. tòu'],
    ['Taiwan pr. [xia4hai2]', 'Taiwan pr. xià hái'],
    ['Taiwan pr. [si4de5]', 'Taiwan pr. sì de'],
    ['Taiwan pr. [pang2], [bang1], [bang4]', 'Taiwan pr. páng, bāng, bàng'],
    ['colloquial pr. [ga1li3] or [ga1li2]', 'colloquial pr. gā lǐ or gā lí'],
    ['also pr. [dai1 hui3 r5] or [dai1 hui5 r5]', 'also pr. dāi huǐr or dāi huir'],
    ['also pr. [di4] or [di5] in poetry and songs', 'also pr. dì or di in poetry and songs'],
    ['Taiwan pr. [Ya3]', 'Taiwan pr. Yǎ'],
    ['... often written as "8+9", [ba1 jia1 jiu3]', '... often written as "8+9", bā jiā jiǔ'],
    [
      'nonstandard pronunciation of a Chinese character, e.g. the reading [hao4] in 爱好 rather than the usual [hao3]',
      'nonstandard pronunciation of a Chinese character, e.g. the reading hào in 爱好 rather than the usual hǎo',
    ],
  ])('converts %j -> %j', (input, expected) => {
    expect(transformSenseAnnotations([input])).toEqual([expected]);
  });

  it('LR-001 §1.3: hyphen-joined tone-sandhi pairs', () => {
    expect(transformSenseAnnotations(['also pr. [yi1mo2-yi1yang4]'])).toEqual([
      'also pr. yī mó-yī yàng',
    ]);
    expect(transformSenseAnnotations(['also pr. [zhu1yun2-she2jian4]'])).toEqual([
      'also pr. zhū yún-shé jiàn',
    ]);
    expect(transformSenseAnnotations(['Taiwan pr. [zhuo2zhuo2-shi1bai4]'])).toEqual([
      'Taiwan pr. zhuó zhuó-shī bài',
    ]);
  });
});

describe('transformSenseAnnotations — LR-001 §1.1, non-Mandarin romanisation dropped', () => {
  it('drops a Jyutping clause, keeping the surrounding etymology', () => {
    const input =
      '(soccer slang) spectacular, world-class goal; wonder goal (originally Cantonese: 波 is borrowed from English "ball", Jyutping [bo1])';
    const expected =
      '(soccer slang) spectacular, world-class goal; wonder goal (originally Cantonese: 波 is borrowed from English "ball")';
    expect(transformSenseAnnotations([input])).toEqual([expected]);
  });

  it('drops a Tai-lo clause, keeping the surrounding etymology', () => {
    const input =
      '(Tw) to cram; to study (from Taiwanese 齧書, Tai-lo pr. [khè-su], lit. to gnaw a book, similar to Mandarin 啃书)';
    const expected =
      '(Tw) to cram; to study (from Taiwanese 齧書, lit. to gnaw a book, similar to Mandarin 啃书)';
    expect(transformSenseAnnotations([input])).toEqual([expected]);
  });

  it('drops a Tai-lo clause with two "or"-chained bracket groups', () => {
    const input =
      '(Tw) A-choy, or Taiwanese lettuce (Lactuca sativa var. sativa) (from Taiwanese 萵仔菜, Tai-lo pr. [ue-á-tshài] or [e-á-tshài])';
    const expected =
      '(Tw) A-choy, or Taiwanese lettuce (Lactuca sativa var. sativa) (from Taiwanese 萵仔菜)';
    expect(transformSenseAnnotations([input])).toEqual([expected]);
  });

  it('does not confuse a bare Tai-lo clause with no other content', () => {
    const input = '(Tw) southern Taiwan (from Taiwanese, Tai-lo pr. [ē-káng])';
    const expected = '(Tw) southern Taiwan (from Taiwanese)';
    expect(transformSenseAnnotations([input])).toEqual([expected]);
  });
});

describe('transformSenseAnnotations — real corpus regressions (HSK-matched entries)', () => {
  it.each([
    ['also pr. [di4] or [di5] in poetry and songs', 'also pr. dì or di in poetry and songs'], // 的
    ['how (to what extent) (Taiwan pr. [duo2])', 'how (to what extent) (Taiwan pr. duó)'], // 多
    [
      '(joining two nouns) and; together with; with (Taiwan pr. [han4])',
      '(joining two nouns) and; together with; with (Taiwan pr. hàn)',
    ], // 和
    ['Taiwan pr. [huo4]', 'Taiwan pr. huò'], // 和 (huo2 reading)
    ['(bound form) a moment (Taiwan pr. [hui3])', '(bound form) a moment (Taiwan pr. huǐ)'], // 会
  ])('real HSK-matched sense %j -> %j', (input, expected) => {
    expect(transformSenseAnnotations([input])).toEqual([expected]);
  });
});

describe('transformSenseAnnotations — passthrough and errors', () => {
  it('leaves a sense with no bracket untouched', () => {
    expect(transformSenseAnnotations(['to love; to be fond of'])).toEqual([
      'to love; to be fond of',
    ]);
  });

  it('throws SenseAnnotationError on a bracket numberedToDiacritic cannot parse (LR-001 §1.4)', () => {
    expect(() => transformSenseAnnotations(['also pr. [xyz999]'])).toThrow(SenseAnnotationError);
  });

  it('the thrown error carries the offending sense for a human to read', () => {
    try {
      transformSenseAnnotations(['also pr. [xyz999]']);
      expect.unreachable('expected transformSenseAnnotations to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(SenseAnnotationError);
      expect((error as SenseAnnotationError).sense).toBe('also pr. [xyz999]');
    }
  });
});
