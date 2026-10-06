// T113 — the author's requests of 6 October: khatma (end of a surah, reading more, the record), the tafsir while reading
// full screen, repetition (full size, next surah, next settings, tajweed, the test, sharing), tasbih, light theme, the name
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as K from '../public/js/khatma.js';
import { compare, normWord, hint, verdict } from '../public/js/hifztest.js';
import { HISN as PRESETS, partAt, partWordsOf, addCount } from '../public/js/tasbih.js';

const core = JSON.parse(fs.readFileSync('public/data/core.json', 'utf8'));
const meta = JSON.parse(fs.readFileSync('public/data/mushaf_meta.json', 'utf8'));
const app = fs.readFileSync('public/js/app.js', 'utf8');

test('khatma: the day share is fixed in the morning; reading more is kept and lightens the coming days', () => {
  const plan = { v: 2, start: '2026-10-06', days: 30, unit: 'pages', moments: [{ id: 'fajr' }] };
  const U = K.planUnits(plan, core.suras, meta.pages), d = new Date(2026, 9, 6, 8);
  let bits = K.newRead();
  const t0 = K.todayPortion2(plan, bits, U, d, null);
  assert.equal(t0.readToday, 0); assert.ok(!t0.dayDone);
  // read today's whole portion, then more
  for (const p of t0.parts) for (const u of p.units) K.markRead(bits, u.a, u.b);
  const t1 = K.todayPortion2(plan, bits, U, d, t0.snap);
  assert.ok(t1.dayDone, 'the portion is done');
  assert.ok(Math.abs(t1.readToday - t0.share) < 1);
  const more = t1.parts.flatMap(p => p.units);
  assert.ok(more.length && !K.isRead(bits, more[0].a), 'a next portion is offered to read more');
  for (const u of more) K.markRead(bits, u.a, u.b);
  const t2 = K.todayPortion2(plan, bits, U, d, t0.snap);
  assert.ok(t2.extra > 1, 'the extra reading is counted');
  // tomorrow: a new day, a smaller share than at the start
  const t3 = K.todayPortion2(plan, bits, U, new Date(2026, 9, 7, 8), t2.snap);
  assert.ok(t3.share < t0.share, `${t3.share} < ${t0.share}`);
  assert.equal(t3.readToday, 0);
  // without a snap the old behaviour stays (tests of 5 Oct)
  assert.equal(K.todayPortion2(plan, K.newRead(), U, d).readToday, 0);
});

test('khatma: the reading record merges runs of verses by day', () => {
  const d = new Date(2026, 9, 6);
  let r = K.addRecord([], [10, 11, 12], d);
  r = K.addRecord(r, [13, 14], d);
  r = K.addRecord(r, [100], d);
  r = K.addRecord(r, [101], new Date(2026, 9, 7));
  assert.deepEqual(r, [{ d: '2026-10-06', a: 10, b: 14 }, { d: '2026-10-06', a: 100, b: 100 }, { d: '2026-10-07', a: 101, b: 101 }]);
  assert.equal(K.addRecord(r, [1, 2, 3], d, 2).length, 2, 'capped');
});

test('reader: the end of a surah offers «I finished it» (recorded) and the next surah; the tafsir opens over the full-screen Mushaf', () => {
  assert.match(app, /function suraEndHtml\(sura\)/);
  assert.match(app, /function markSuraRead\(sura\)[\s\S]{0,600}P\.khRec = addRecord\(P\.khRec, nw\)/);
  assert.match(app, /openReader\(to, null, \{ autoplay: was \? 'all' : false \}\)/);
  assert.match(app, /P\.khRec = addRecord\(P\.khRec, \[i\]\)/);
  assert.match(app, /if \(document\.body\.classList\.contains\('read-full'\)\) setTafFull\(/);
  const css = fs.readFileSync('public/css/refonte.css', 'utf8');
  assert.match(css, /body\.read-full\.taf-full\[data-mode=study\] #tzone \{ display: flex !important;/);
  // the light theme: the chosen order of the 3D lamp map is dark on gold
  assert.match(css, /html\[data-theme=light\] #lampMap \.lm-orders button\[aria-checked=true\] \{ color: #1a1406;/);
});

test('memorisation test: forgiving on spelling, strict on words', () => {
  const plain = JSON.parse(fs.readFileSync('public/data/search_ar.json', 'utf8'));
  const S = core.suras[111];   // al-Ikhlas
  assert.ok(compare('قل هو الله احد', plain[S.first]).ok);
  assert.ok(compare('قُلْ هُوَ اللَّهُ أَحَدٌ', plain[S.first]).ok);
  assert.ok(!compare('قل هو الله', plain[S.first]).ok);
  const r = compare('قل الله احد', plain[S.first]);
  assert.deepEqual(r.found, [true, false, true, true]);
  // spellings of the Mushaf and of the simple text meet (long alif written or not, alef wasla, hamza seats)
  assert.equal(normWord('ٱلْكِتَٰبُ'), normWord('الكتاب'));
  assert.equal(normWord('الصَّلَوٰةَ'), normWord('الصلاة'));
  assert.equal(normWord('يُؤْمِنُونَ'), normWord('يومنون'));
  // Al-Baqara 2: written from memory in the simple spelling
  assert.ok(compare('ذلك الكتاب لا ريب فيه هدى للمتقين', plain[core.suras[1].first + 1]).ok);
  assert.equal(hint(['قُلْ', 'هُوَ', 'ٱللَّهُ', 'أَحَدٌ'], 2), 'قُلْ هُوَ …');
  assert.ok(verdict([{ ok: false, score: 0 }, { ok: false, score: 0.2 }]).relearn);
  assert.ok(verdict([{ ok: true, score: 1 }]).all);
});

test('repetition: opens full size, next surah with the same settings, the next settings below, tajweed, test, share, invitation link', () => {
  const tk = fs.readFileSync('public/js/tekrar.js', 'utf8');
  assert.match(app, /state\.panels\.setMax\(id === 'tekrar'\)/);
  assert.match(tk, /id="tkNextS"/); assert.match(tk, /<details class="tk-next">/); assert.match(tk, /id="tkTj"/);
  assert.match(tk, /id="tkTest"/); assert.match(tk, /id="ttShare"/); assert.match(tk, /id="ttInv"/);
  assert.match(tk, /\?tk=\$\{conf\.sura\}\.\$\{conf\.from\}\.\$\{conf\.count\}/);
  assert.match(app, /sp\.get\('tk'\)/);
  // the test compares with the simple spelling of the verse, never with a generated text
  assert.match(tk, /const ref = \(i\) => plain && plain\[i\] \? plain\[i\] : mushafToks\(i\)\.join\(' '\)/);
});

test('tasbih: the formulas are verbatim adhkar of the site, with their source; parts cut from the text itself', () => {
  const d = JSON.parse(fs.readFileSync('public/data/athkar.json', 'utf8'));
  const byId = new Map(d.items.map(x => [x.id, x]));
  for (const p of PRESETS) {
    const x = byId.get(p.id);
    assert.ok(x, p.id);
    assert.ok(x.src === 'hisn' ? x.dorar && /صحيح|حسن/.test(x.dorar.grade) : /صحيح|حسن/.test(x.grade || ''), `${p.id} graded`);
  }
  const x106 = byId.get('hm:106');
  const w = partWordsOf(x106.text, 3);
  assert.equal(w.length, 3);
  for (const part of w) assert.ok(x106.text.includes(part), 'a piece of the verbatim text');
  assert.deepEqual([partAt([33, 33, 34], 0), partAt([33, 33, 34], 33), partAt([33, 33, 34], 99)], [0, 1, 2]);
  const c = addCount(addCount(null, '2026-10-06'), '2026-10-06');
  assert.deepEqual(c, { day: '2026-10-06', today: 2, total: 2 });
  assert.deepEqual(addCount(c, '2026-10-07'), { day: '2026-10-07', today: 1, total: 3 });
  assert.match(app, /const DOCK = \['athkar', 'tasbih',/);
});

test('the voice says the name right: «مِشكاه» for the voice only, the text keeps «مشكاة»', () => {
  for (const f of ['tools/make_intro_voice.py', 'tools/video/voice_fusha.py']) assert.match(fs.readFileSync(f, 'utf8'), /مِشكاه/);
  const lines = JSON.parse(fs.readFileSync('public/audio/intro/lines.json', 'utf8')).lines.ar;
  assert.ok(Object.values(lines).some(l => l.includes('مِشْكَاة')), 'the cards keep the right spelling');
  assert.ok(!Object.values(lines).some(l => l.includes('مِشكاه')));
});
