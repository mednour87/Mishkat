// T103 — fixes found by the 1,000-question RAG test (eval/rag1000, 5 October 2026)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadEngine, readJson } from './load.mjs';
import { guardCheck } from '../public/js/engine.js';
import { athkarQuery, filterAthkar } from '../public/js/athkar.js';
import { fiqhStem, fiqhWords, fiqhSearch } from '../functions/_lib/fiqh.js';

const { engine: E } = loadEngine();
E.addTopicIndex(readJson('qp_topics.json'));
E.addSurahSciences(readJson('surah_sciences.json'));

test('T103 a request for the tafsir of a named surah or verse opens it (it was «no verse found»)', async () => {
  const a = await E.ask('تفسير سورة الإخلاص', { uiLang: 'ar' });
  assert.equal(a.type, 'sura'); assert.equal(a.sura, 112);
  const b = await E.ask('تفسير آخر آيتين من سورة البقرة', { uiLang: 'ar' });
  assert.equal(b.type, 'range'); assert.deepEqual(b.verses.map(v => v.ref), ['2:285', '2:286']);
  assert.equal((await E.ask('ما معنى آية الكرسي؟', { uiLang: 'ar' })).verses[0].ref, '2:255');
  assert.equal((await E.ask('tafsir of surah al-asr', { uiLang: 'en' })).sura, 103);
  // a word that is not a surah stays a topic
  assert.equal((await E.ask('ما معنى الصمد؟', { uiLang: 'ar' })).type, 'topic');
});

test('T103 penalties and marriage of minors named alone are questions of ruling (homographs before)', () => {
  for (const q of ['الرجم', 'حد الرجم', 'زواج القاصرات', 'stoning', 'child marriage']) assert.equal(guardCheck(q), 'ruling', q);
  for (const q of ['قاصرات الطرف', 'رجم الشياطين', 'stoning of the devil']) assert.equal(guardCheck(q), null, q);
});

test('T103 a story episode goes to the selection; the approved episodes open the story', async () => {
  const m = await E.ask('قصة مريم', { uiLang: 'ar' });
  assert.equal(m.type, 'story'); assert.equal(m.verses[0].ref, '19:16');
  assert.notEqual((await E.ask('قصة إبراهيم مع الأصنام', { uiLang: 'ar' })).type, 'story');
});

test('T103 a person in distress is never «off topic», and the verses of tranquillity are candidates', async () => {
  let cands = null;
  const llm = { expand: async () => ({ intent: 'other', keywords: { ar: [], en: [] }, refs: [] }), select: async (p) => { cands = p.candidates.map(c => c.id); return { intent: 'topic', ids: [] }; } };
  const r = await E.ask('وش اسوي اذا ضاق صدري', { uiLang: 'ar', llm });
  assert.notEqual(r.type, 'notfound');
  assert.ok(r.verses.some(v => v.ref === '13:28'));
  const r2 = await E.ask('اذا ضاقت فيني الدنيا وش اقرا', { uiLang: 'ar', llm: { ...llm, expand: async () => ({ intent: 'topic', keywords: { ar: ['اقرأ'] }, refs: [] }) } });
  assert.ok(cands.includes('94:5') && cands.includes('13:28'), 'comfort verses among the candidates');
  assert.ok(r2.verses.length);
});

test('T103 adhkar: an English word stays English (all 342 remembrances were listed for any English request)', () => {
  const all = readJson('athkar.json').items;
  const rain = filterAthkar(all, athkarQuery('what should i say when it rains'));
  assert.ok(rain.length > 0 && rain.length < 10);
  assert.ok(rain.some(x => /المطر/.test([x.title, x.chapter, x.text].join(' '))));
  assert.ok(filterAthkar(all, athkarQuery('what to say when angry')).length < 40);   // the theme «distress», not all 342
});

test('T103 fiqh: light stems match the encyclopedia titles; generic words are not a subject', () => {
  assert.equal(fiqhStem('تارك'), fiqhStem('ترك'));
  assert.equal(fiqhStem('الصيام'), fiqhStem('الصوم'));
  assert.equal(fiqhStem('للمريض'), fiqhStem('المريض'));
  assert.equal(fiqhStem('الزواج'), fiqhStem('النكاح'));
  assert.deepEqual(fiqhWords('لمن تعطى الزكاة'), fiqhWords('تعطى الزكاة'));
  assert.ok(fiqhWords('عمل المرأة').length === 2);           // «عمل» is the subject here, not a filler
});

test('T103 fiqh: a section with sub-sections is read in its first sub-section, only if it names the subject', async () => {
  const child = readFileSync(new URL('./fixtures/dorar_feqhia_3401.html', import.meta.url), 'utf8');
  const parent = `<html><body><form><input type="hidden" name="title" value="المبحث الثَّاني: حكمُ تناولِ التَّبْغِ&lt;span class=&quot;tip&quot;&gt; [202] التَّبغُ ويُسمَّى (التنباك) &lt;/span&gt;، والشَّمَّةِ، والقاتِ"></form></body></html>`;
  const fake = async (url) => ({ ok: true, url, text: async () => (/\/3400$/.test(url) ? parent : /\/3401$/.test(url) ? child : '<html></html>') });
  const r = await fiqhSearch({ id: 3400, q: 'ما حكم التدخين' }, {}, fake);
  assert.equal(r.ok, true); assert.equal(r.id, 3401); assert.equal(r.via, 3400);
  assert.match(r.title, /التبغ/);
  // another subject: the tobacco sub-section is not shown for a question on usury
  assert.equal((await fiqhSearch({ id: 3400, q: 'ما حكم الربا' }, {}, fake)).ok, false);
});

test('T103 a trap question about violence lists no hadith on its own (Sunnah section)', () => {
  const app = readFileSync(new URL('../public/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(res\.polemic \|\| res\.pack === 'violence'\) \{ res\._sunnah = \[\]; box\.hidden = true; return; \}/);
});
