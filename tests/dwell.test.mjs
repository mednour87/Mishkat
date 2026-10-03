// T050 (D1): facts shown under the lamp after a 3-second dwell on a word — rank in the verse and in the surah,
// occurrences of the exact form — computed from the real word list (77,433 words, no basmala prefixes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from './load.mjs';
import { wordFacts, formCount } from '../public/js/dwell.js';
import { UI } from '../public/js/i18n.js';

const core = readJson('core.json'), words = readJson('words.json');
// word ranges of each verse, as the galaxy builds them (Tanzil's basmala before verse 1 is not a word of it)
const firsts = new Set(core.suras.filter(s => s.n !== 1 && s.n !== 9).map(s => s.first));
const start = []; let w = 0;
core.verses.forEach((v, i) => { start.push(w); w += v.split(/\s+/).filter(x => /[ء-يٱ]/.test(x)).length - (firsts.has(i) ? 4 : 0); });
start.push(w);
const range = (v) => [start[v], start[v + 1]];

test('dwell: the word ranges match the 77,433 words of the galaxy', () => {
  assert.equal(w, words.length);
});

test('dwell: rank in the verse and in the surah, occurrences of the form', () => {
  const S112 = core.suras[111], v = S112.first;                    // 112:1 قُلْ هُوَ ٱللَّهُ أَحَدٌ
  const f = wordFacts(words, start[v] + 2, range(v), start[S112.first]);
  const allah = core.verses[v].split(' ')[4 + 2];                   // Tanzil text (after its basmala prefix), never typed by hand
  assert.equal(f.word, allah); assert.equal(f.inVerse, 3); assert.equal(f.verseWords, 4); assert.equal(f.inSura, 3);
  assert.equal(f.occurrences, words.filter(x => x === allah).length);
  assert.ok(f.occurrences > 500);
  const S2 = core.suras[1], v255 = S2.first + 254;                  // 2:255, first word ٱللَّهُ
  const g = wordFacts(words, start[v255], range(v255), start[S2.first]);
  assert.equal(g.inVerse, 1); assert.equal(g.word, allah);
  assert.equal(g.inSura, start[v255] - start[S2.first] + 1);
  let total = 0; const seen = new Set();
  words.forEach((x, i) => { if (!seen.has(x)) { seen.add(x); total += formCount(words, i); } });
  assert.equal(total, words.length);
});

test('dwell: lamp lines in Arabic and English', () => {
  const ar = UI.ar.dwellInfo('الإخلاص 112:1', 3, 4, 3, 2), en = UI.en.dwellInfo('Al-Ikhlas 112:1', 3, 4, 3, 1);
  assert.equal(ar.split('\n').length, 3); assert.match(ar, /الكلمة ٣ من ٤/); assert.match(ar, /مرتين$/);
  assert.match(UI.ar.dwellInfo('x', 1, 1, 1, 7), /٧ مرات$/); assert.match(UI.ar.dwellInfo('x', 1, 1, 1, 980), /٩٨٠ مرة$/);
  assert.match(en, /word 3 of 4/); assert.match(en, /occurs once/);
});
