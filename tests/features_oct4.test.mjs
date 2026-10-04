// Features of 4 October (T090–T098): question map (off-topic, date, services), child mode guard, progress and
// rewards (mark from 7, monthly reset, khatma count, levels), repetition units and minimal time, statistics,
// installable app files, presentation film strings. Before: none of these existed (an off-topic request went to the
// engine and the AI; a child saw fatwas; no repetition counter; no statistics; no install).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mapQuestion, islamicRest, SCOPE_S } from '../public/js/scope.js';
import { refusedText } from '../functions/_lib/guard.js';
import { guardCheck, isSensitiveText } from '../public/js/engine.js';
import { rollMonth, noteRead, checkKhatma, noteTekrar, monthPct, weekly, rewardScore, engagement, minRepeatMs, hifzProgress, LEVELS, CHEERS, monthKey } from '../public/js/progress.js';
import { units, verseMs, TK } from '../public/js/tekrar.js';
import { wordStats, suraStats, totals, suraOfIndex, wordForms, ST } from '../public/js/stats.js';
import { encodeRead, newRead, markRead, N_VERSES, ymd } from '../public/js/khatma.js';
import { DEFAULTS } from '../public/js/prefs.js';
import { IN } from '../public/js/intro.js';
import { EG } from '../public/js/engage3d.js';

const core = JSON.parse(fs.readFileSync('public/data/core.json', 'utf8'));
const plain = JSON.parse(fs.readFileSync('public/data/search_ar.json', 'utf8'));
const meta = JSON.parse(fs.readFileSync('public/data/mushaf_meta.json', 'utf8'));
const fresh = () => JSON.parse(JSON.stringify(DEFAULTS));

test('T091 off-topic requests are mapped and refused without AI (page and API)', () => {
  const OFF = ['وصفة الكسكسي', 'طريقة عمل كيكة الشوكولاتة', 'how to cook pasta', 'كم سعر تذكرة طيران إلى باريس', 'سعر رحلة العمرة',
    'write me a python script', 'كيف أصمم موقع ويب', 'اكتب لي قصيدة عن البحر', 'write an essay about climate', 'what is the weather in Paris',
    'who won the world cup', 'tell me a joke', 'best phone to buy', 'solve this equation 2x+3=7', 'bitcoin price today'];
  for (const q of OFF) {
    const m = mapQuestion(q);
    assert.equal(m && m.kind, 'offtopic', q);
    assert.equal(refusedText('expand', { query: q }), 'offtopic', 'API: ' + q);
  }
});
test('T091 Islamic questions stay questions (no over-refusal)', () => {
  const IN_SCOPE = ['الطعام في القرآن', 'what does the quran say about food', 'ما حكم بيع الذهب بالتقسيط', 'الصبر', 'how to deal with anxiety',
    'قصة يوسف', 'ما فضل حفظ القرآن', 'symptoms of hypocrisy', 'ما حكم الموسيقى', 'آية الكرسي', 'what does islam say about music', 'الرزق في القرآن', 'الشفاء في القرآن'];
  for (const q of IN_SCOPE) {
    const m = mapQuestion(q);
    assert.ok(!m || m.kind !== 'offtopic', q + ' → ' + JSON.stringify(m));
    assert.equal(refusedText('expand', { query: q }), null, 'API: ' + q);
  }
  assert.equal(islamicRest('اكتب مقالا عن الصبر'), 'الصبر');
});
test('T091 today’s date and the time are answered, prayer stays with the prayer tool', () => {
  for (const q of ['ما تاريخ اليوم', 'تاريخ اليوم', 'كم الساعة', "what's the date today", 'what time is it', 'what day is it today']) assert.equal(mapQuestion(q)?.kind, 'now', q);
  assert.notEqual(mapQuestion('كم بقي على صلاة العصر')?.kind, 'offtopic');
});
test('T093 requests answered by Mishkat services', () => {
  assert.deepEqual(mapQuestion('أريد أن أحفظ سورة الملك'), { kind: 'feature', feature: 'tekrar', sura: null, word: null });
  assert.equal(mapQuestion('help me memorize surah 67').sura, 67);
  assert.equal(mapQuestion('كم مرة ذكرت كلمة الصبر').word, 'الصبر');
  assert.equal(mapQuestion('how many times is the word mercy mentioned').feature, 'stats');
  assert.equal(mapQuestion('مستواي').feature, 'engage');
  assert.equal(mapQuestion('كيف أثبت التطبيق')?.feature, undefined);   // «أثبت» (to prove) is not «ثبّت»
  assert.equal(mapQuestion('تثبيت التطبيق').feature, 'install');
  assert.equal(mapQuestion('install the app').feature, 'install');
});
test('T092 what a child is never shown: rulings, takfir, penalties', () => {
  const blocked = (q) => { const g = guardCheck(q); return g === 'ruling' || g === 'takfir' || isSensitiveText(q) || /فتو[ىي]|مفتي|\bfatwa\b/i.test(q); };
  for (const q of ['ما حكم الموسيقى', 'هل التدخين حرام', 'is music haram', 'حد السرقة', 'هل فلان كافر', 'أريد فتوى']) assert.ok(blocked(q), q);
  for (const q of ['الصبر', 'قصة يوسف', 'سورة الملك', 'how to be kind to parents']) assert.ok(!blocked(q), q);
  const app = fs.readFileSync('public/js/app.js', 'utf8');
  assert.match(app, /state\.prefs\.age === 'child' && childBlocked\(query\)/);
  const css = fs.readFileSync('public/css/features.css', 'utf8');
  assert.match(css, /body\.child \.sens \{ display: none; \}/);   // no red banner for a child
});
test('T095 the mark starts at 7, grows, never goes down below 7', () => {
  const P = fresh();
  assert.equal(rewardScore(P).score, 7);
  const now = new Date();
  for (let k = 0; k < 7; k++) { const d = new Date(now); d.setDate(d.getDate() - k); P.log[ymd(d)] = 40; noteTekrar(P, { from: k * 3, to: k * 3 + 2, reps: 7, sec: 900 }, d); }
  const r = rewardScore(P, now);
  assert.ok(r.score > 9 && r.score <= 10, String(r.score));
  assert.ok(Object.values(LEVELS).every(ls => ls.length === 3));
  assert.ok(CHEERS.ar.length >= 5 && CHEERS.en.length >= 5);
});
test('T095 monthly percentages start again with the month; khatmas stay', () => {
  const P = fresh();
  const sep = new Date(2026, 8, 20), oct = new Date(2026, 9, 2);
  noteRead(P, 10, sep); noteTekrar(P, { from: 0, to: 6, reps: 5, sec: 100 }, sep);
  assert.ok(monthPct(P, sep).read > 0 && monthPct(P, sep).hifz > 0);
  P.khatmas = 3;
  assert.equal(rollMonth(P, oct), true);
  assert.deepEqual(monthPct(P, oct), { read: 0, hifz: 0 });
  assert.equal(P.khatmas, 3);
  assert.equal(monthKey(oct), '2026-10');
  assert.ok(hifzProgress(P, core.suras)[0] === 1, 'al-Fatiha repeated stays in the all-time bits (blue in 3D)');
});
test('T095 the whole Quran read: one more khatma, the bits start again', () => {
  const P = fresh();
  const b = newRead(); markRead(b, 0, N_VERSES - 1); P.read = encodeRead(b);
  P.khatma = { active: true, days: 30 };
  assert.equal(checkKhatma(P), true);
  assert.equal(P.khatmas, 1);
  assert.equal(checkKhatma(P), false);
  assert.equal(P.khatma.active, false);
});
test('T095 weekly bars follow the khatma plan', () => {
  const P = fresh();
  P.khatma = { active: true, days: 30 };
  assert.equal(weekly(P).readGoal, Math.ceil(N_VERSES / 30) * 7);
});
test('T096 three positive levels from engagement', () => {
  const P = fresh();
  assert.equal(engagement(P).level, 1);
  const now = new Date();
  for (let k = 0; k < 28; k++) { const d = new Date(now); d.setDate(d.getDate() - k); P.log[ymd(d)] = 60; P.tk.log[ymd(d)] = { reps: 30, ayas: 6, sec: 900, units: 3, calm: 30 }; }
  assert.equal(engagement(P, now).level, 3);
  assert.equal(engagement(P, now).daily.length, 28);
  for (const L of [LEVELS.ar, LEVELS.en]) for (const l of L) assert.doesNotMatch(l.name + l.desc, /ضعيف|سيئ|bad|poor|weak|low/i);
});
test('T095 repetition: units, reciter time, minimal time = 70 %', () => {
  assert.deepEqual(units(10, 3, false), [[10, 10], [11, 11], [12, 12]]);
  assert.deepEqual(units(10, 3, true), [[10, 12]]);
  assert.equal(minRepeatMs(20000), 14000);
  assert.equal(minRepeatMs(0, 10), 3150);
  assert.equal(minRepeatMs(500), 2000);
  const tim = JSON.parse(fs.readFileSync('public/data/timing/24.json', 'utf8'));
  assert.ok(verseMs(tim[34]) > 70000);
  assert.ok(TK.ar.press && TK.en.press);
});
test('T094 statistics from the Mishkat text (no jummal)', () => {
  const so = suraOfIndex(core);
  const t = totals(core, so);
  assert.equal(t.verses, 6236); assert.equal(t.words, 77433);
  const r = suraStats(core, plain, meta, 112, so);
  assert.equal(r.S.ayas, 4); assert.equal(r.words, 15); assert.deepEqual(r.pages, [604, 604]);
  const w = wordStats(core, plain, 'الصبر', 'word', so);
  assert.equal(w.total, 8);
  assert.ok(wordForms('الله').set.has('لله') && wordForms('الليل').set.has('لليل'));
  assert.ok(!wordForms('فرعون').set.has('رعون'));
  for (const L of [ST.ar, ST.en]) assert.doesNotMatch(JSON.stringify(L), /إعجاز عددي[^»”]/);
});
test('T097 installable app: manifest, icons, service worker never caches the API', () => {
  const m = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
  assert.equal(m.display, 'standalone');
  assert.ok(m.icons.some(i => i.purpose === 'maskable') && m.icons.some(i => i.sizes === '512x512'));
  for (const i of m.icons) assert.ok(fs.existsSync('public/' + i.src), i.src);
  const sw = fs.readFileSync('public/sw.js', 'utf8');
  assert.match(sw, /url\.pathname\.includes\('\/api\/'\)\) return/);
  const html = fs.readFileSync('public/index.html', 'utf8');
  assert.match(html, /rel="manifest" href="manifest\.webmanifest" crossorigin="use-credentials"/);
});
test('T098 film strings exist in Arabic and English, and the place step comes before it', () => {
  assert.equal(IN.ar.feats.length, IN.en.feats.length);
  assert.ok(EG.ar.remind('x') && EG.en.remind('x'));
  const app = fs.readFileSync('public/js/app.js', 'utf8');
  assert.match(app, /if \(state\.practical && !state\.practical\.place\(\)\) await placeStep\(\);\s*await runIntro\(\);/);
  assert.ok(SCOPE_S.ar.offTitle && SCOPE_S.en.offTitle);
});
test('T090 the tafsir zone has a close button and a reopen button', () => {
  const app = fs.readFileSync('public/js/app.js', 'utf8');
  assert.match(app, /id="tClose"/); assert.match(app, /id="rTaf"/);
  assert.match(app, /function setTafsirOpen\(on\)/);
});
test('T099 tajweed colours land only on letters of their rule (checked data), text unchanged', async () => {
  const { colourToken, tokenOffsets, RULES } = await import('../public/js/tajweed.js');
  const meta = JSON.parse(fs.readFileSync('public/data/tajweed/meta.json', 'utf8'));
  assert.ok(meta.coverage.verses_ok / meta.coverage.verses > 0.9);
  assert.match(meta.license, /CC BY 4\.0/);
  let checked = 0;
  for (const s of [1, 2, 36, 67, 112]) {
    const t = JSON.parse(fs.readFileSync(`public/data/tajweed/${s}.json`, 'utf8')), S = core.suras[s - 1];
    t.forEach((ann, k) => {
      if (!ann) return;
      const v = core.verses[S.first + k], cp = [...v];
      for (const [a, b, r] of ann) {
        const seg = cp.slice(a, b).join('');
        if (RULES[r] === 'hamzat_wasl') assert.equal(seg, 'ٱ');
        if (RULES[r] === 'lam_shamsiyyah') assert.equal(seg, 'ل');
        if (RULES[r] === 'qalqalah') assert.match(seg, /[قطبجد]/);
        checked++;
      }
      // colouring never changes the text
      const offs = tokenOffsets(v);
      const html = v.split(' ').map((tok, j) => colourToken(tok, offs[j], ann)).join(' ').replace(/<[^>]+>/g, '');
      assert.equal(html, v.replace(/&/g, '&amp;'));
    });
  }
  assert.ok(checked > 1000);
});
