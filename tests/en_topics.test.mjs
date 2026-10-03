// T021: English questions WITHOUT AI reach the human-curated subject index (W5 of the 1,000-question map), in
// the right sense of homographs; real questions and unknown words are not forced onto a topic; a surah named
// after a person («Maryam») offers the person as the other reading.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine, readJson } from './load.mjs';
import { englishTopicOf } from '../public/js/engine.js';

const { engine: E, core } = loadEngine();
E.addTopicIndex(readJson('qp_topics.json'));
E.addLatinIndex(readJson('latin_index.json'));
const ask = (q, o = {}) => E.ask(q, { uiLang: 'en', ...o });
const ref = (s, a) => core.suras[s - 1].first + a - 1;
const has = (r, s, a) => r.verses.some(v => v.idx === ref(s, a));

test('en topics: a bare topic or a framed question reaches the subject index, no AI', async () => {
  for (const [q, name] of [['patience', 'الصبر'], ['what does the quran say about repentance', 'التوبة'], ['how do i stay steadfast', 'الثبات'],
    ['virtues of charity', 'الصدقة'], ['importance of prayer in islam', 'الصلاة'], ['trust in allah', 'التوكل'], ['day of judgment', 'يوم القيامة']]) {
    const r = await ask(q);
    assert.equal(r.confirmedBy, 'index', q);
    assert.ok(r.topicIndex && r.topicIndex.name.replace(/[ً-ْٰ]/g, '').includes(name), `${q} → ${r.topicIndex && r.topicIndex.name}`);
  }
  const p = await ask('kindness to parents');
  assert.equal(p.confirmedBy, 'index');
  for (const [s, a] of [[17, 23], [31, 14], [4, 36]]) assert.ok(has(p, s, a), `kindness to parents → ${s}:${a}`);
});

test('en topics: the right sense of homographs', async () => {
  const bare = (s) => s.replace(/[ً-ْٰ]/g, '');
  const par = await ask('paradise'); assert.doesNotMatch(par.topicIndex.groups.map(g => g.name).join(' '), /الجنون/);
  const fa = await ask('faith'); assert.ok(!fa.topicIndex.groups.some(g => bare(g.name) === 'الأيمان'), 'faith ≠ oaths');
  const fo = await ask('forgiveness'); assert.ok(!has(fo, 2, 219), 'forgiveness ≠ the surplus of 2:219');
  const dh = await ask('remembrance of allah'); assert.match(dh.topicIndex.name, /ذكر الله/);
  const mg = await ask('magic'); assert.doesNotMatch(mg.topicIndex.name, /آخر الليل/);
  const pr = await ask('prayer'); assert.ok(!pr.topicIndex.groups.some(g => /صلاة الله على/.test(bare(g.name))), 'prayer ≠ God\'s blessing');
  const de = await ask('death'); assert.ok(!has(de, 2, 173) && !has(de, 5, 3), 'death ≠ carrion');
  const inh = await ask('inheritance'); assert.ok(!inh.topicIndex.groups.some(g => /ورثة الجنة|ميراث الكتاب/.test(bare(g.name))));
  // reviewed out: other senses in the index (7:46 under «الحجاب», «الأذان» = a proclamation) or sensitive subjects
  for (const w of ['hijab', 'adhan', 'jews', 'christians', 'jihad', 'theft', 'adultery']) assert.equal(englishTopicOf(w), null, w);
});

test('en topics: no topic forced on real questions, unknown or other-sense words', async () => {
  for (const q of ['is hijab mandatory', 'why do women inherit half', 'does the quran allow wife beating', 'night of power', 'garden',
    'what should i remember when i am sick', 'bitcoin price', 'fast cars', 'How do we know that the Qur\'an has never been changed?']) {
    const r = await ask(q);
    assert.notEqual(r.confirmedBy, 'index', `«${q}» must not be answered by an index topic (${r.topicIndex && r.topicIndex.name})`);
  }
  assert.equal(englishTopicOf('night of power'), null);
  assert.equal(englishTopicOf('what should i say when it rains'), null, 'a supplication, not the topic «rain» (often a punishment)');
  // a tiny index entry gives way to the full keyword match (backbiting: 49:12)
  assert.ok(has(await ask('what does the quran say about backbiting'), 49, 12));
  assert.equal(englishTopicOf('jihad'), null, 'fighting is left to the AI with its context');
});

test('Maryam: the surah, and the person as the other reading', async () => {
  const en = await ask('Maryam'), ar = await E.ask('مريم', { uiLang: 'ar' });
  assert.equal(en.type, 'sura'); assert.equal(en.sura, 19);
  assert.deepEqual(en.alt, { mode: 'topic', query: 'Mary', person: 'Mary' });
  assert.ok(ar.alt && (ar.alt.mode === 'sura' || ar.alt.person === 'مريم'));
  const person = await ask(en.alt.query, { mode: 'topic' });
  assert.equal(person.confirmedBy, 'index');
  assert.ok(has(person, 3, 42) && has(person, 19, 16), 'verses about Maryam');
  const jo = await ask('Joseph');
  assert.equal(jo.alt.person, 'Joseph');
  assert.ok((await ask('Joseph', { mode: 'topic' })).topicIndex.name.includes('يوسف'));
});
