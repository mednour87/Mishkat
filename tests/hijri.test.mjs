// T067: Hijri calendar in the browser (Intl Umm al-Qura) and its remarkable days. Religious content of the
// panel = verses (Tanzil) + hadiths of HadeethEnc shown verbatim with their grade: every hadith id must exist
// in the local files with an authentic or good grade; no disputed occasion; Aladhan's «holidays» never used.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readJson } from './load.mjs';
import { toHijri, toGregorian, nextEvent, upcoming, nextWhiteDays, formatHijri, REMARKABLE, MONTHLY, WEEKLY } from '../public/js/hijri.js';

const PUB = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const hadith = (lang, id) => {
  const idx = readJson(`hadeeth/idx_${lang}.json`), p = idx.ids.indexOf(+id);
  if (p < 0) return null;
  return readJson(`hadeeth/${lang}/${Math.floor(p / idx.chunk)}.json`)[p % idx.chunk];
};

test('hijri: conversion both ways is consistent over two years', () => {
  for (let k = 0; k < 730; k += 3) {
    const g = new Date(2026, 0, 1 + k), h = toHijri(g), back = toGregorian(h.y, h.m, h.d);
    assert.equal(back.toDateString(), g.toDateString());
  }
  // ± adjustment: the month starts one day later where the visitor lives
  const g = new Date(2026, 9, 3), h0 = toHijri(g, 0), h1 = toHijri(g, 1);
  assert.notDeepEqual(h0, h1);
  assert.equal(toGregorian(h1.y, h1.m, h1.d, 1).toDateString(), g.toDateString());
  assert.match(formatHijri(h0, 'ar'), /هـ$/); assert.match(formatHijri(h0, 'en'), /AH$/);
});

test('hijri: remarkable days come in order, the next one is found, white days exist', () => {
  const from = new Date(2026, 9, 3), list = upcoming(from, 0, 8);
  assert.equal(list.length, REMARKABLE.length);
  for (let i = 1; i < list.length; i++) assert.ok(list[i].start >= list[i - 1].start);
  const r = nextEvent('ramadan', from);
  assert.equal(toHijri(r.start).m, 9); assert.equal(toHijri(r.start).d, 1); assert.ok(r.inDays >= 0);
  assert.equal(nextEvent('eid', from).id, 'fitr');
  const w = nextWhiteDays(from);
  assert.equal(toHijri(w.start).d, 13);
});

test('hijri: every hadith shown exists locally with an authentic or good grade (Arabic); no disputed occasion', () => {
  const GOOD = /صحيح|حسن/, WEAK = /ضعيف|موضوع|منكر|لا\s+أصل/;
  for (const ev of [...REMARKABLE, MONTHLY, WEEKLY]) {
    assert.ok(ev.ar && ev.en, 'title in Arabic and English: ' + ev.id);
    for (const id of ev.had || []) {
      const h = hadith('ar', id);
      assert.ok(h, `hadith ${id} (${ev.id}) missing from the local HadeethEnc files`);
      assert.match(h.grade, GOOD, `grade of ${id}`); assert.doesNotMatch(h.grade, WEAK);
      assert.ok(h.text && h.text.length > 20);
    }
    for (const ref of ev.refs || []) { const [s, a] = ref.split(':').map(Number); assert.ok(s >= 1 && s <= 114 && a >= 1); }
  }
  const ids = REMARKABLE.map(e => e.id).join(' ');
  assert.doesNotMatch(ids, /mawlid|isra|miraj|nisf|shaban|rajab|hijra|new ?year/i, 'disputed occasions are not listed');
});

test('hijri: no external calendar API, its «holidays» list is never used', () => {
  for (const f of ['js/hijri.js', 'js/toolpanels.js', 'js/app.js']) {
    // code only: the comments say why the list is never shown
    const src = readFileSync(join(PUB, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    assert.doesNotMatch(src, /aladhan\.com/i, f); assert.doesNotMatch(src, /\.holidays\b|\[\s*['"]holidays['"]\s*\]/, f);
  }
});
