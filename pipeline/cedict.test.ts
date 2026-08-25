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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CedictParseError, type CedictEntry, loadCedict, parseCedict } from './cedict';

const FIXTURE_PATH = resolve(import.meta.dirname, '../data/test-fixtures/cedict-entries.txt');
const REAL_SOURCE_PATH = resolve(
  import.meta.dirname,
  '../data/source/cedict/cedict_1_0_ts_utf-8_mdbg.txt',
);

function loadFixtureRaw(): string {
  return readFileSync(FIXTURE_PATH, 'utf-8');
}

// Fixture entries, in file order, each traceable to a specific real line in
// the pinned CC-CEDICT source (data/source/cedict/SOURCE.md's own spot-check
// table covers two of these; the rest are additional real lines picked for
// this work order — see the WO-004 work report for the full mapping). Every
// case named in testing-strategy.md §2 is covered, plus the register
// markers named explicitly in data-pipeline.md §3 ((coll.), (lit.), (fig.),
// (dialect)) and the "also pr. [...]"/"Taiwan pr. [...]" bracket family that
// this parser deliberately leaves untouched (see cedict.ts's module
// docstring, "Deliberately NOT touched").
const EXPECTED_ENTRIES: ReadonlyArray<{ readonly case: string; readonly entry: CedictEntry }> = [
  {
    case: 'non-Han-headword sibling is excluded, not parsed here (see EXCLUDED test below); this is the first *kept* fixture row',
    entry: {
      traditional: 'A咖',
      simplified: 'A咖',
      readingNumeric: 'A ka1',
      senses: ['(coll.) A-list; top-tier'],
      sourceLine: 26,
    },
  },
  {
    case: 'cross-reference-only entry (word[reading] form, no pipe since trad === simp) — real line 61',
    entry: {
      traditional: 'B格',
      simplified: 'B格',
      readingNumeric: 'bi1 ge2',
      senses: ['variant of 逼格'],
      sourceLine: 27,
    },
  },
  {
    case: 'register marker (dialect), two senses, rare CJK Ext-A headword — real line 217',
    entry: {
      traditional: '㞎',
      simplified: '㞎',
      readingNumeric: 'ba3',
      senses: ['(dialect) poo', '(dialect) to shit'],
      sourceLine: 28,
    },
  },
  {
    case: 'register markers (lit.) and (fig.) together, multi-sense — real line 398',
    entry: {
      traditional: '一人得道，雞犬升天',
      simplified: '一人得道，鸡犬升天',
      readingNumeric: 'yi1 ren2 de2 dao4 , ji1 quan3 sheng1 tian1',
      senses: [
        '(lit.) when a person attains enlightenment and immortality, even his chickens and dogs will ascend to heaven with him (idiom)',
        '(fig.) when somebody attains a position of power and influence, their relatives and friends also benefit',
      ],
      sourceLine: 29,
    },
  },
  {
    case: 'register marker (fig.), multi-sense, plain entry mixed in — real line 503',
    entry: {
      traditional: '一團漆黑',
      simplified: '一团漆黑',
      readingNumeric: 'yi1 tuan2 qi1 hei1',
      senses: [
        'pitch-dark',
        '(fig.) completely in the dark; totally ignorant of',
        '(fig.) grim; beyond salvation',
      ],
      sourceLine: 30,
    },
  },
  {
    case:
      'erhua entry: r5 preserved verbatim in readingNumeric; multi-sense; trailing "also pr. [...]" ' +
      "sense is left untouched (documented, not a bug — see cedict.ts) — real line 682, the spec's own worked example",
    entry: {
      traditional: '一會兒',
      simplified: '一会儿',
      readingNumeric: 'yi1 hui4 r5',
      senses: ['a moment', 'a while', 'in a moment', 'now...now...', 'also pr. [yi1 hui3 r5]'],
      sourceLine: 31,
    },
  },
  {
    case: 'CL: entry, single classifier, multi-sense before it — real line 1828',
    entry: {
      traditional: '上衣',
      simplified: '上衣',
      readingNumeric: 'shang4 yi1',
      senses: ['jacket', 'upper outer garment'],
      classifiers: [{ traditional: '件', simplified: '件', readingNumeric: 'jian4' }],
      sourceLine: 32,
    },
  },
  {
    case: 'capitalised proper noun, plain single-sense entry — real line 3316',
    entry: {
      traditional: '中國',
      simplified: '中国',
      readingNumeric: 'Zhong1 guo2',
      senses: ['China'],
      sourceLine: 33,
    },
  },
  {
    case: 'plain entry — real line 7520',
    entry: {
      traditional: '你好',
      simplified: '你好',
      readingNumeric: 'ni3 hao3',
      senses: ['hello; hi'],
      sourceLine: 34,
    },
  },
  {
    case:
      'multiple classifiers, one using the trad|simp[reading] sub-form; CL: sense removed from ' +
      'the middle of the sense list, not just the end — real line 54323',
    entry: {
      traditional: '書',
      simplified: '书',
      readingNumeric: 'shu1',
      senses: ['book', 'letter', 'document', 'to write'],
      classifiers: [
        { traditional: '本', simplified: '本', readingNumeric: 'ben3' },
        { traditional: '冊', simplified: '册', readingNumeric: 'ce4' },
        { traditional: '部', simplified: '部', readingNumeric: 'bu4' },
      ],
      sourceLine: 35,
    },
  },
  {
    case: 'surname entry, first of a real trad/simp-identical pair — real line 62801',
    entry: {
      traditional: '汪',
      simplified: '汪',
      readingNumeric: 'Wang1',
      senses: ['surname Wang'],
      sourceLine: 36,
    },
  },
  {
    case: 'surname entry, capitalised single-syllable reading — real line 72827',
    entry: {
      traditional: '王',
      simplified: '王',
      readingNumeric: 'Wang2',
      senses: ['surname Wang'],
      sourceLine: 37,
    },
  },
  {
    case:
      'u: entry (lu:4 -> kept verbatim, NOT converted to lǜ here) whose second sense also ' +
      'exercises trad|simp[reading] normalisation inside an ordinary sense — real line 85916',
    entry: {
      traditional: '綠',
      simplified: '绿',
      readingNumeric: 'lu:4',
      senses: [
        'green',
        "(slang) (derived from 绿帽子) to cheat on (one's spouse or boyfriend or girlfriend)",
      ],
      sourceLine: 38,
    },
  },
  {
    case: 'homograph group member 1/3: 行 hang2, multi-sense with (bound form) markers — real line 97800',
    entry: {
      traditional: '行',
      simplified: '行',
      readingNumeric: 'hang2',
      senses: [
        '(bound form) row; line',
        '(bound form) line of business; trade; profession',
        '(bound form) commercial firm',
        "(bound form) to rank (first, second etc) among one's siblings (by age)",
        '(in data tables) row; (Tw) column',
        'classifier for rows or lines',
      ],
      sourceLine: 39,
    },
  },
  {
    case:
      'homograph group member 2/3: 行 heng2, single sense that is itself a word[reading] ' +
      'cross-reference — real line 97801',
    entry: {
      traditional: '行',
      simplified: '行',
      readingNumeric: 'heng2',
      senses: ['used in 道行'],
      sourceLine: 40,
    },
  },
  {
    case:
      'homograph group member 3/3: 行 xing2 — same headword as the two above, third distinct ' +
      'reading (this corpus entry is a triple, exceeding the "at least two" fixture requirement); ' +
      'also exercises "Taiwan pr. [...]" left untouched — real line 97802',
    entry: {
      traditional: '行',
      simplified: '行',
      readingNumeric: 'xing2',
      senses: [
        '(bound form) to walk; to go; to travel',
        '(literary) trip; journey; visit',
        '(bound form) temporary; makeshift',
        '(bound form) current; in circulation',
        '(bound form) to do; to perform',
        'capable; competent',
        'all right; OK!; will do',
        'behavior; conduct (Taiwan pr. [xing4])',
        '(literary) about to; soon',
      ],
      sourceLine: 41,
    },
  },
];

describe('parseCedict — fixture-driven entry shapes (testing-strategy.md §2)', () => {
  const result = parseCedict(loadFixtureRaw());
  const byLine = new Map(result.entries.map((entry) => [entry.sourceLine, entry]));

  it.each(EXPECTED_ENTRIES)('$case', ({ entry: expected }) => {
    const actual = byLine.get(expected.sourceLine);
    expect(actual).toEqual(expected);
  });

  it('parses exactly the expected number of kept entries from the fixture', () => {
    expect(result.entries).toHaveLength(EXPECTED_ENTRIES.length);
  });
});

describe('parseCedict — non-Han-headword exclusion (criterion 11, domain-model.md §3 invariant 5)', () => {
  const result = parseCedict(loadFixtureRaw());

  it('excludes the non-Han entry from `entries`', () => {
    expect(result.entries.some((e) => e.simplified === '3C')).toBe(false);
  });

  it('records it in `excluded` instead of silently dropping it', () => {
    expect(result.excluded).toEqual([
      {
        traditional: '3C',
        simplified: '3C',
        readingNumeric: 'san1 C',
        reason: 'non-han-headword',
        sourceLine: 25,
      },
    ]);
  });
});

describe('parseCedict — homograph pair (criterion 12, domain-model.md §4)', () => {
  it('keeps all three 行 readings as separate entries sharing one headword, none merged', () => {
    const result = parseCedict(loadFixtureRaw());
    const xingEntries = result.entries.filter((e) => e.simplified === '行');
    expect(xingEntries).toHaveLength(3);
    const readings = xingEntries.map((e) => e.readingNumeric).sort();
    expect(readings).toEqual(['hang2', 'heng2', 'xing2']);
    // Never merge senses across readings (data-pipeline.md §5.2 rule 3).
    const hang2 = xingEntries.find((e) => e.readingNumeric === 'hang2');
    const xing2 = xingEntries.find((e) => e.readingNumeric === 'xing2');
    expect(hang2?.senses).not.toContain('capable; competent');
    expect(xing2?.senses).not.toContain('(bound form) row; line');
  });
});

describe('parseCedict — header metadata (criterion 2)', () => {
  it('captures the release date and source entry count from #! lines, skipping plain # comments', () => {
    const result = parseCedict(loadFixtureRaw());
    expect(result.dictionaryVersion).toBe('2026-08-23T06:21:07Z');
    expect(result.sourceEntryCount).toBe(17);
  });

  it('leaves both undefined when the input has no header at all', () => {
    const result = parseCedict('你好 你好 [ni3 hao3] /hello; hi/\n');
    expect(result.dictionaryVersion).toBeUndefined();
    expect(result.sourceEntryCount).toBeUndefined();
  });

  it('ignores a malformed #! line rather than crashing (entries= with a non-numeric value)', () => {
    const result = parseCedict(
      '#! entries=not-a-number\n#! date=2026-01-01\n你好 你好 [ni3 hao3] /hi/\n',
    );
    expect(result.sourceEntryCount).toBeUndefined();
    expect(result.dictionaryVersion).toBe('2026-01-01');
  });
});

describe('parseCedict — field order (criterion 3)', () => {
  it('reads Traditional before Simplified; a swapped-order fixture produces the wrong pairing', () => {
    // 中國 (trad) / 中国 (simp) are visually distinct enough that swapping
    // them is a real, catchable mistake, not a coincidence of this example.
    const result = parseCedict('中國 中国 [Zhong1 guo2] /China/\n');
    expect(result.entries[0]?.traditional).toBe('中國');
    expect(result.entries[0]?.simplified).toBe('中国');
    // The deliberately-wrong assertion this fixture is designed to catch:
    expect(result.entries[0]?.traditional).not.toBe('中国');
  });
});

describe('parseCedict — CRLF handling (criterion 1)', () => {
  it('parses the CRLF-terminated fixture with no field carrying a trailing \\r', () => {
    const result = parseCedict(loadFixtureRaw());
    expect(result.entries.length).toBeGreaterThan(0);
    for (const entry of result.entries) {
      expect(entry.traditional).not.toMatch(/\r/);
      expect(entry.simplified).not.toMatch(/\r/);
      expect(entry.readingNumeric).not.toMatch(/\r/);
      for (const sense of entry.senses) expect(sense).not.toMatch(/\r/);
    }
  });

  it('parses identically whether the input is CRLF or bare-LF terminated', () => {
    const crlf = loadFixtureRaw();
    const lf = crlf.replace(/\r\n/g, '\n');
    expect(parseCedict(lf)).toEqual(parseCedict(crlf));
  });
});

describe('parseCedict — embedded (CL:...) classifier, not just a top-level CL: sense', () => {
  // Found wiring WO-008's no-leaked-syntax gate against real HSK-1 data:
  // CC-CEDICT also embeds a classifier annotation parenthetically INSIDE an
  // otherwise substantive sense, distinct from the top-level "CL:..." shape
  // data-pipeline.md §3's own worked example shows. 85 real corpus entries
  // use this shape. Real line 10577, copied verbatim.
  const raw = '光 光 [guang1] /light; ray (CL:道[dao4])/bright; shiny/\n';

  it('extracts the embedded classifier and strips it from the sense text', () => {
    const { entries } = parseCedict(raw);
    expect(entries).toHaveLength(1);
    const entry = entries[0]!;
    expect(entry.senses).toEqual(['light; ray', 'bright; shiny']);
    expect(entry.classifiers).toEqual([
      { traditional: '道', simplified: '道', readingNumeric: 'dao4' },
    ]);
  });

  it('never leaves "CL:" text in a sense (the exact shape that broke the no-leaked-syntax gate)', () => {
    const { entries } = parseCedict(raw);
    for (const sense of entries[0]!.senses) {
      expect(sense).not.toContain('CL:');
      expect(sense).not.toContain('[');
    }
  });

  it('handles multiple classifiers in one embedded annotation, trad|simp sub-form included', () => {
    // Real line 94219 (菜/cai4), second sense: "dish (of food)
    // (CL:樣|样[yang4],道[dao4],盤|盘[pan2])".
    const { entries } = parseCedict(
      '菜 菜 [cai4] /dish of food (CL:樣|样[yang4],道[dao4],盤|盘[pan2])/\n',
    );
    expect(entries[0]!.senses).toEqual(['dish of food']);
    expect(entries[0]!.classifiers).toEqual([
      { traditional: '樣', simplified: '样', readingNumeric: 'yang4' },
      { traditional: '道', simplified: '道', readingNumeric: 'dao4' },
      { traditional: '盤', simplified: '盘', readingNumeric: 'pan2' },
    ]);
  });

  it('still handles the ordinary top-level CL: sense unchanged (regression)', () => {
    const { entries } = parseCedict('上衣 上衣 [shang4 yi1] /jacket/CL:件[jian4]/\n');
    expect(entries[0]!.senses).toEqual(['jacket']);
    expect(entries[0]!.classifiers).toEqual([
      { traditional: '件', simplified: '件', readingNumeric: 'jian4' },
    ]);
  });
});

describe('parseCedict — malformed input fails loudly (fail the build rather than warn)', () => {
  it('throws CedictParseError on a line that does not match the entry grammar', () => {
    expect(() => parseCedict('this is not a cedict line\n')).toThrow(CedictParseError);
  });

  it('throws CedictParseError on a malformed CL: classifier item', () => {
    expect(() => parseCedict('你好 你好 [ni3 hao3] /CL:not-a-classifier/\n')).toThrow(
      CedictParseError,
    );
  });

  it('the thrown error carries the 1-based line number and the offending line', () => {
    try {
      parseCedict('你好 你好 [ni3 hao3] /hi/\nbroken line here\n');
      expect.unreachable('parseCedict should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(CedictParseError);
      expect((error as InstanceType<typeof CedictParseError>).lineNumber).toBe(2);
      expect((error as InstanceType<typeof CedictParseError>).line).toBe('broken line here');
    }
  });
});

describe('parseCedict — full pinned corpus, end-to-end (criterion 13)', () => {
  // Runs against the real committed file (data/source/cedict/SOURCE.md), not
  // a fixture — this is the one test in this suite that is deliberately not
  // fixture-only, because criterion 13 requires exercising the parser
  // against the actual pinned release. It still never fetches anything: the
  // file is read from the committed path (testing-strategy.md §2).
  const raw = readFileSync(REAL_SOURCE_PATH, 'utf-8');

  it('parses the full pinned file without throwing', () => {
    expect(() => parseCedict(raw)).not.toThrow();
  });

  it("produces a kept-entry count that is sane relative to the header's own entries= count", () => {
    const result = parseCedict(raw);
    // SOURCE.md: header states entries=124903; every one of those data
    // lines matches the entry grammar (verified while building this
    // parser), and 44 of them are non-Han headwords that are excluded
    // rather than kept, leaving 124859 kept entries. Asserted with a small
    // tolerance rather than the exact figures so a future CC-CEDICT point
    // release (a handful of entries added/removed upstream) doesn't fail
    // this test outright — a large swing should still fail loudly.
    expect(result.sourceEntryCount).toBe(124903);
    expect(result.entries.length + result.excluded.length).toBe(result.sourceEntryCount);
    expect(result.entries.length).toBeGreaterThan(120000);
    expect(result.excluded.length).toBeGreaterThan(0);
    expect(result.excluded.length).toBeLessThan(1000);
  });

  it('captures the pinned release date as dictionaryVersion', () => {
    const result = parseCedict(raw);
    expect(result.dictionaryVersion).toBe('2026-08-23T06:21:07Z');
  });

  it('leaves no leaked CL:, and no sense produced by the trad|simp normalisation still carries a pipe', () => {
    // Two assertions per sense across the full pinned corpus (tens of
    // thousands of senses) reliably clears Vitest's 5s default on a
    // slower CI runner even though the parse itself is fast — a longer
    // timeout, not a smaller check, is the correct fix (testing-strategy.md
    // §2 criterion 13 wants this exhaustive).
    const result = parseCedict(raw);
    for (const entry of result.entries) {
      for (const sense of entry.senses) {
        expect(sense.startsWith('CL:')).toBe(false);
        expect(sense).not.toContain('|');
      }
    }
  }, 15000);
});

describe('loadCedict — reads the pinned file from disk (thin I/O shell)', () => {
  it('reads the default committed path and returns the same result as parseCedict on its contents', () => {
    const result = loadCedict();
    const expected = parseCedict(readFileSync(REAL_SOURCE_PATH, 'utf-8'));
    expect(result).toEqual(expected);
  });

  it('accepts an explicit path, for use against a fixture in isolation', () => {
    const result = loadCedict(FIXTURE_PATH);
    expect(result.entries.length).toBe(EXPECTED_ENTRIES.length);
  });
});
