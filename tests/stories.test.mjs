// T080: the story of a prophet comes only from approved sources — Al-Jamhara «علوم السور» (summary and
// episodes, verbatim), Quranpedia's subject index and the Mushaf. Before: «قصة يوسف» listed 8 verses that
// contain the word «يوسف» (a keyword search), with no summary and most of the story missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine, readJson } from './load.mjs';
import { storyQuery, PROPHETS } from '../public/js/stories.js';

const { engine: E, core } = loadEngine();
E.addTopicIndex(readJson('qp_topics.json'));
const SCI = readJson('surah_sciences.json');
E.addSurahSciences(SCI);
const ref = (s, a) => core.suras[s - 1].first + a - 1;
const ask = (q) => E.ask(q, { uiLang: /[a-z]/i.test(q) ? 'en' : 'ar' });

test('stories: a story frame or an honorific is needed; a bare name or «سورة يوسف» stays as before', () => {
  for (const [q, id] of [['قصة يوسف', 'yusuf'], ['قصة يوسف عليه السلام', 'yusuf'], ['ما هي قصة النبي يونس', 'yunus'], ['من هو هود', 'hud'],
    ['سيدنا موسى', 'musa'], ['story of Joseph', 'yusuf'], ['tell me the story of prophet Moses', 'musa'], ['who was Noah', 'nuh'], ['حكاية مريم', 'maryam']])
    assert.equal((storyQuery(q) || {}).id, id, q);
  for (const q of ['يوسف', 'سورة يوسف', 'قصة', 'قصة أصحاب الجنة', 'Joseph', 'the story', 'صالح']) assert.equal(storyQuery(q), null, q);
});

test('stories: «قصة يوسف» — Jamhara summary verbatim, the whole surah in episodes, every verse naming him', async () => {
  const r = await ask('قصة يوسف');
  assert.equal(r.type, 'story');
  assert.equal(r.level, 'A');
  const st = r.story;
  const page = SCI.suras[11];
  assert.equal(st.summary.intro, page.intro, 'summary = the published paragraph, unchanged');
  assert.match(st.summary.intro, /قامت السورةُ بأكملها على سرد قصة \(يوسف\)/);
  // episodes cover the story from the dream (4) to the reunion (101)
  const covered = new Set();
  for (const ep of st.episodes) for (const [a, b] of ep.ranges) for (let x = a; x <= b; x++) covered.add(x);
  for (let a = 4; a <= 101; a++) if (a !== 58) assert.ok(covered.has(a), `12:${a} in an episode`);   // 58: gap of the source
  // every verse naming him, in surah 12 and elsewhere (6:84, 40:34)
  const vs = new Set(r.verses.map(v => v.idx));
  for (const [s, a] of [[12, 4], [12, 7], [12, 21], [12, 29], [12, 46], [12, 51], [12, 56], [12, 58], [12, 90], [12, 94], [12, 99], [6, 84], [40, 34]])
    assert.ok(vs.has(ref(s, a)), `${s}:${a} names Yusuf`);
  // verses about him without his name come from the subject index, and are marked so
  assert.ok(r.verses.some(v => v.indexed && v.idx === ref(12, 5)), '12:5 (Jacob tells him not to tell his brothers) via the index');
  assert.ok(r.verses.filter(v => v.named).length >= 26);
});

test('stories: other prophets — episodes across the Quran, reviewed name lists for ordinary words', async () => {
  const musa = await ask('قصة موسى');
  const suras = new Set(musa.story.episodes.map(e => e.sura));
  for (const s of [7, 20, 26, 28]) assert.ok(suras.has(s), `Musa in surah ${s}`);
  assert.equal(musa.story.summary, null, 'no summary: no surah narrates his whole story');
  const salih = await ask('قصة صالح');
  const named = salih.verses.filter(v => v.named).map(v => v.ref);
  assert.ok(!named.includes('9:120') && !named.includes('11:46'), '«عمل صالح» is not the prophet');
  assert.ok(named.includes('7:73') && named.includes('27:45'));
  const yahya = await ask('قصة يحيى');
  assert.ok(!yahya.verses.some(v => v.named && v.ref === '2:258'), '«يحيي ويميت» is not the prophet');
  const hud = await ask('قصة هود');
  assert.ok(!hud.verses.some(v => v.named && v.ref === '2:111'), '«هودًا» = the Jews in 2:111');
  for (const p of PROPHETS) assert.ok(p.ar && p.en && p.index.length, p.id);
});

test('stories: no source file → the verses still come, and nothing is invented', async () => {
  const { engine: E2 } = loadEngine();
  const r = await E2.ask('قصة يوسف', { uiLang: 'ar' });
  assert.equal(r.type, 'story');
  assert.equal(r.story.summary, null);
  assert.equal(r.story.episodes.length, 0);
  assert.ok(r.verses.length >= 26);
});
