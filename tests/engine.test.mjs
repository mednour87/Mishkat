import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadEngine, readJson } from './load.mjs';
import { verifyLLM, normAr, sentences } from '../public/js/engine.js';
import { validateOutput, sanitizePayload, select, health } from '../functions/_lib/selector.js';

const { engine: E, core, sources } = loadEngine();
const ask = (q, o = {}) => E.ask(q, { uiLang: 'ar', ...o });

// Every piece of religious content in a result must come verbatim from a source.
function assertGrounded(res) {
  for (const v of res.verses) {
    assert.ok(Number.isInteger(v.idx) && v.idx >= 0 && v.idx < 6236, `bad idx ${v.idx}`);
    assert.equal(v.ref, E.ref(v.idx));
  }
  for (const a of res.answer) {
    if (a.kind !== 'quote') continue;
    const full = sources[a.source].text[a.idx];
    const t = a.text.replace(/ …$/, '');
    assert.ok(full.includes(t), `quote not verbatim: ${a.text.slice(0, 60)}`);
    assert.equal(a.ref, E.ref(a.idx));
  }
}

// ------------------------------------------------------------ data integrity
test('data: 114 suras, 6236 verses, contiguous indices', () => {
  assert.equal(core.suras.length, 114);
  assert.equal(core.verses.length, 6236);
  assert.equal(core.suras.reduce((n, s) => n + s.ayas, 0), 6236);
  core.suras.forEach((s, i) => { if (i) assert.equal(s.first, core.suras[i - 1].first + core.suras[i - 1].ayas); });
});

test('data: verse texts are the Tanzil text recorded at build time', () => {
  const info = readJson('build_info.json');
  assert.equal(info.tanzil_sha256, 'bf4f57b968d03f4131c070b1e285da9be0e0a108a21c910e872801ca273312c8');
  const buf = readFileSync(new URL('../public/data/core.json', import.meta.url));
  assert.equal(createHash('sha256').update(buf).digest('hex'), info.files['core.json'][0]);
  // byte-exact comparison with the Tanzil file shipped in data_build/
  const raw = readFileSync(new URL('../data_build/quran-uthmani.txt', import.meta.url));
  assert.equal(createHash('sha256').update(raw).digest('hex'), info.tanzil_sha256);
  const lines = raw.toString('utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('|').slice(2).join('|'));
  assert.equal(lines.length, 6236);
  lines.forEach((t, i) => assert.equal(core.verses[i], t, `verse ${i}`));
});

test('data: every tafsir/translation covers all 6236 verses', () => {
  for (const [id, s] of Object.entries(sources)) {
    assert.equal(s.text.length, 6236, id);
    assert.equal(s.text.filter(x => !x).length, 0, id);
  }
});

// ------------------------------------------------------------- routing
test('references: numeric, named, ranges, Arabic digits', async () => {
  const cases = [['2:255', '2:255'], ['٢:٢٥٥', '2:255'], ['البقرة 255', '2:255'], ['سورة البقرة آية 255', '2:255'],
    ['Al-Baqarah 255', '2:255'], ['surah 18 verse 10', '18:10'], ['surah 36 verse 1', '36:1'], ['2/255', '2:255'], ['verse 255 of surah 2', '2:255']];
  for (const [q, ref] of cases) {
    const r = await ask(q);
    assert.equal(r.type, 'verse', q);
    assert.equal(r.verses[0].ref, ref, q);
  }
  const r = await ask('2:285-286');
  assert.equal(r.type, 'range'); assert.deepEqual(r.verses.map(v => v.ref), ['2:285', '2:286']);
});

test('sura names (ar/en), with and without typos', async () => {
  const cases = [['الكهف', 18], ['سورة الكهف', 18], ['Al-Kahf', 18], ['kahf', 18], ['Yasin', 36], ['Ya-Sin', 36], ['Fatiha', 1],
    ['al fatihah', 1], ['the cow', 2], ['yaseen', 36], ['Baqara', 2], ['baqarra', 2], ['Ikhlas', 112], ['surah 114', 114], ['الملك', 67], ['Maryam', 19]];
  for (const [q, n] of cases) {
    const r = await ask(q);
    if (r.type === 'topic') { // surah name that is also an ordinary word: topic + one-click "open surah"
      assert.equal(r.alt && r.alt.sura, n, q);
      continue;
    }
    assert.equal(r.type, 'sura', q);
    assert.equal(r.sura, n, q);
    assert.equal(r.verses.length, core.suras[n - 1].ayas, q);
  }
  assert.equal((await ask('سورة الملك')).sura, 67);
});

test('invalid references are reported, never invented', async () => {
  const r = await ask('2:300');
  assert.equal(r.type, 'invalid_ref'); assert.equal(r.verses.length, 0);
  assert.match(r.answer[0].text, /286/);
  assert.equal((await ask('surah 115')).type, 'invalid_ref');
  assert.equal((await ask('112:5')).type, 'invalid_ref');
});

test('well-known verse names', async () => {
  for (const [q, ref] of [['آية الكرسي', '2:255'], ['Ayat al-Kursi', '2:255'], ['the throne verse', '2:255'], ['آية الدين', '2:282'], ['آية النور', '24:35']]) {
    const r = await ask(q);
    assert.equal(r.verses[0].ref, ref, q);
  }
  const m = await ask('المعوذتين');
  assert.deepEqual([...new Set(m.verses.map(v => v.ref.split(':')[0]))], ['113', '114']);
});

// ------------------------------------------------------------ verification
test('exact quotes are located, including repeated verses', async () => {
  const r1 = await ask('إن الله مع الصابرين');
  assert.equal(r1.verdict, 'exact'); assert.deepEqual(r1.verses.map(v => v.ref).sort(), ['2:153', '8:46']);
  const r2 = await ask('فبأي آلاء ربكما تكذبان');
  assert.equal(r2.verdict, 'exact'); assert.equal(r2.verses.length, 31);
  const r3 = await ask('قُلْ هُوَ ٱللَّهُ أَحَدٌ');
  assert.equal(r3.verdict, 'exact'); assert.equal(r3.verses[0].ref, '112:1');
});

test('every verse is found by its own text (all 6236, imla\'i form)', async () => {
  const S = readJson('search_ar.json');
  let bad = [];
  for (let i = 0; i < 6236; i++) {
    const words = normAr(S[i]).split(' ');
    if (words.length < 2) continue;
    const res = E.verifyText(S[i], true, 'ar');
    if (!res || res.verdict !== 'exact' || !res.verses.some(v => v.idx === i)) bad.push(E.ref(i));
  }
  assert.deepEqual(bad, []);
});

test('misquotes: one word changed → near match with the correct verse', async () => {
  const r = await ask('إن الله مع المتقين الصابرين');
  assert.ok(['near', 'exact'].includes(r.verdict));
  const r2 = await ask('هل هذه آية: وما خلقت الجن والإنس إلا ليعبدوني');
  assert.equal(r2.verdict, 'near'); assert.equal(r2.verses[0].ref, '51:56');
  assert.ok(r2.diffWords.length >= 1);
});

test('merged similar verses are detected', async () => {
  // first half of 2:62-like wording + second half of another verse
  const a = normAr(readJson('search_ar.json')[E.idxOf(2, 25)]).split(' ').slice(0, 8).join(' ');
  const b = normAr(readJson('search_ar.json')[E.idxOf(3, 15)]).split(' ').slice(-8).join(' ');
  const r = await ask(`هل هذه آية: ${a} ${b}`);
  assert.equal(r.verdict, 'merged');
  assert.deepEqual(r.verses.map(v => v.ref).sort(), ['2:25', '3:15']);
});

test('sayings that are not Quran are never attributed to the Quran', async () => {
  for (const q of ['هل هذه آية: النظافة من الإيمان', 'هل هذه آية: اطلبوا العلم ولو في الصين', 'هل هذه آية: الجنة تحت أقدام الأمهات',
    'هل هذه آية: خير الأمور أوسطها', 'هل هذه آية: حب الوطن من الإيمان', 'Is this a verse: «العلم نور»']) {
    const r = await ask(q);
    assert.equal(r.type, 'verify', q);
    assert.equal(r.verdict, 'notfound', q);
    assert.ok(r.verses.every(v => v.closestOnly), q);
  }
  const s = await ask('الجنة تحت أقدام الأمهات');
  assert.ok(s.verdict === 'notverse' || s.type === 'notfound');
  assert.ok(!['exact', 'near', 'merged'].includes(s.verdict));
});

// --------------------------------------------------------------- guard
test('rulings, personal cases and dreams → abstention (ar/en)', async () => {
  const cases = [['ما حكم الموسيقى', 'ruling'], ['هل يجوز الاقتراض بالربا', 'ruling'], ['هل التدخين حرام', 'ruling'],
    ['is music haram', 'ruling'], ['is it permissible to pray sitting', 'ruling'], ['fatwa on mortgages', 'ruling'],
    ['is listening to music haram', 'ruling'], ['is it allowed to fast while travelling', 'ruling'],
    ['my husband does not pray what should i do', 'personal'], ['زوجي لا يصلي ماذا أفعل', 'personal'], ['what should i do about my husband', 'personal'],
    ['تفسير حلم رأيت ثعبانا', 'dream'], ['what is the meaning of my dream', 'dream'], ['interpretation of my dream', 'dream']];
  for (const [q, reason] of cases) {
    const r = await ask(q);
    assert.equal(r.type, 'abstain', q); assert.equal(r.reason, reason, q);
    if (reason === 'ruling') {
      // no ruling given: only related verses explicitly labelled "not a fatwa" + official links
      assert.ok(r.verses.every(v => v.relatedOnly), q);
      assert.ok(r.links && r.links.some(l => l.id === 'alifta') && r.links.some(l => l.id === 'dorarFiqh'), q);
      assert.ok(!r.answer.some(a => a.kind === 'quote'), q);
    } else assert.equal(r.verses.length, 0, q);
  }
  // topics that merely contain sensitive words are NOT blocked
  for (const q of ['المسجد الحرام', 'الطلاق', 'the forbidden fruit', 'the last day', 'how can i become more patient']) assert.notEqual((await ask(q)).type, 'abstain', q);
});

// ---------------------------------------------------------------- topics
test('topic search: expected key verses appear (ar/en)', async () => {
  const cases = [['الصبر', ['2:153', '2:45', '3:200']], ['patience', ['2:153', '3:200']],
    ['قصة يوسف', ['12:7']], ['Moses and Pharaoh', ['7:104']], ['Maryam', ['19:16', '3:42', '19:27', '3:45', '19:34']],
    ['بر الوالدين', ['17:23', '31:14', '46:15', '6:151']], ['parents', ['31:14', '17:23', '46:15']]];
  for (const [q, refs] of cases) {
    const r = await ask(q, { uiLang: 'en' });
    assert.ok(['topic', 'sura', 'story'].includes(r.type), q + ' ' + r.type);   // «قصة يوسف»: story route (T080)
    const got = new Set(r.verses.map(v => v.ref));
    assert.ok(refs.some(x => got.has(x)), `${q}: none of ${refs} in ${[...got].slice(0, 12)}`);
    assertGrounded(r);
  }
});

test('gibberish and unrelated queries abstain', async () => {
  for (const q of ['xqzv plorf', 'bitcoin price tomorrow', 'كيبورد لابتوب']) {
    const r = await ask(q);
    assert.ok(['notfound', 'verify'].includes(r.type), q + ' ' + r.type);
    if (r.type === 'verify') assert.notEqual(r.verdict, 'exact');
  }
});

test('all answers are grounded (random battery)', async () => {
  const qs = ['الرحمة', 'mercy', 'الجنة', 'paradise', 'hellfire', 'الصلاة', 'fasting', 'Jesus', 'Noah', 'اليتيم', 'orphans', 'التوبة', 'repentance', 'Abraham', 'الكعبة', 'angels'];
  for (const q of qs) assertGrounded(await ask(q));
});

// ------------------------------------------------------------------- LLM
test('LLM verifier drops ids outside the candidate list', () => {
  const c = [{ id: '2:153' }, { id: '3:200' }];
  const v = verifyLLM({ intent: 'topic', ids: ['3:200', '99:99', '2:153', '2:153', 'hello'], confidence: 'high', sentences: ['2:153#1', 'x'] }, c, ['2:153#1']);
  assert.deepEqual(v.sentences, ['2:153#1']);
  assert.deepEqual(v.ids, ['3:200', '2:153']); assert.equal(v.rejected, 4);
  assert.deepEqual(verifyLLM('garbage', c).ids, []);
  assert.deepEqual(verifyLLM(null, c).ids, []);
});

test('a hostile LLM cannot inject a verse, a text, or a reference', async () => {
  let cands = null;
  const evil = {
    expand: async () => ({ intent: 'topic', keywords: { ar: ['صبر', 'INVENTED'], en: [], fr: [] }, text: 'INVENTED RELIGIOUS CLAIM' }),
    select: async ({ candidates }) => {
      cands = candidates;
      return { intent: 'topic', confidence: 'high', model: 'evil', text: 'INVENTED RELIGIOUS CLAIM',
        ids: ['114:7', '2:300', 'Fake 1:1', candidates[3].id, candidates[1].id], explanation: 'INVENTED' };
    },
  };
  const r = await ask('الصبر', { llm: evil });
  assert.equal(r.meta.llm.used, true);
  assert.equal(r.meta.llm.rejected, 3);
  assert.deepEqual(r.verses.slice(0, 2).map(v => v.ref), [cands[3].id, cands[1].id]);
  for (const v of r.verses) assert.ok(v.idx >= 0 && v.idx < 6236);
  assert.equal(r.paragraphBy, 'llm');
  const quotes = r.answer.filter(a => a.kind === 'quote');
  assert.ok(quotes.length >= 1 && quotes.length <= 3);
  // every explanation is the COMPLETE tafsir unit of its verse — never a fragment
  for (const qt of quotes) assert.equal(qt.text, sources[qt.source].text[qt.idx].replace(/^\d+\.\s*/, '').trim());
  assert.ok(!JSON.stringify(r).includes('INVENTED'));
  assertGrounded(r);
});

test('without AI confirmation there is no explanation, only a labelled keyword list', async () => {
  const r = await ask('الصبر');
  assert.equal(r.type, 'topic');
  assert.ok(!r.answer.some(a => a.kind === 'quote'));
  assert.ok(r.answer.some(a => a.kind === 'note'));
  assert.equal(r.paragraphBy, 'none');
});

test('trap questions get the verified context pack first, with full tafsir units', async () => {
  for (const [q, pack, first] of [['Islam is a religion of violence', 'violence', '2:190'], ['الإسلام دين إرهاب', 'violence', '2:190'],
    ['islam is misogynistic', 'women', '4:1'], ['who wrote the Quran', 'source', '10:37'], ['what does the Quran say about slavery', 'slavery', '90:13']]) {
    const r = await ask(q);
    assert.equal(r.pack, pack, q);
    assert.equal(r.verses[0].ref, first, q);
    const ctx = r.answer.filter(a => a.kind === 'quote' && a.role === 'context');
    assert.ok(ctx.length >= 4, q);
    for (const c of ctx) assert.equal(c.text, sources[c.source].text[c.idx].replace(/^\d+\.\s*/, '').trim());
    assert.ok(r.sensitive, q);
    assertGrounded(r);
  }
  assert.ok((await ask('الجهاد')).sensitive);
  assert.ok(!(await ask('الصبر')).sensitive);
});

test('takfir and violence requests are refused', async () => {
  for (const [q, reason] of [['هل الشيعة كفار', 'takfir'], ['is my neighbour a kafir', 'takfir'], ['how to make a bomb', 'violence'], ['كيف أقتل شخصا', 'violence']]) {
    const r = await ask(q);
    assert.equal(r.type, 'abstain', q); assert.equal(r.reason, reason, q); assert.equal(r.verses.length, 0, q);
  }
});

test('context() returns neighbouring verses of the same surah only', () => {
  assert.deepEqual(E.context(E.idxOf(1, 1)).map(E.ref), ['1:1', '1:2', '1:3']);
  assert.deepEqual(E.context(E.idxOf(2, 3)).map(E.ref), ['2:1', '2:2', '2:3', '2:4', '2:5']);
});

test('verse references proposed by the LLM are kept only if real and on-topic', async () => {
  let seen = null;
  const llm = {
    expand: async () => ({ intent: 'topic', keywords: { ar: ['الوالدين'] }, refs: ['17:23', '999:1', '2:300', '112:1', 'bad'] }),
    select: async ({ candidates }) => { seen = candidates.map(c => c.id); return { intent: 'topic', ids: [] }; },
  };
  const r = await ask('بر الوالدين', { llm });
  assert.ok(seen.includes('17:23'));          // real and about parents → candidate
  assert.ok(!seen.includes('112:1'));         // real but off-topic → dropped
  assert.ok(!seen.some(x => x.startsWith('999') || x === '2:300'));
  assert.equal(r.meta.proposedKept, 1);
  assertGrounded(r);
});

test('LLM ruling intent only makes the engine safer (abstain)', async () => {
  const q = 'موقف الشرع من التأمين التجاري';
  const r = await ask('ما يقول القرآن عن الخمر والميسر', { llm: { expand: async () => ({ intent: 'topic', keywords: { ar: ['الخمر'] } }), select: async () => ({ intent: 'ruling', ids: [] }) } });
  assert.equal(r.type, 'abstain');
  const r2 = await ask(q, { llm: { expand: async () => ({ intent: 'ruling' }) } });
  assert.equal(r2.type, 'abstain');
  // a bare topic word flagged "ruling" by the LLM is still searched as a topic
  const r3 = await ask('الخمر', { llm: { expand: async () => ({ intent: 'ruling' }) } });
  assert.equal(r3.type, 'topic');
});

test('LLM failure or timeout falls back to deterministic ranking', async () => {
  const base = await ask('الصبر');
  const r1 = await ask('الصبر', { llm: { expand: async () => { throw new Error('429'); }, select: async () => { throw new Error('429'); } } });
  assert.deepEqual(r1.verses.map(v => v.ref), base.verses.map(v => v.ref));
  const r2 = await ask('الصبر', { llm: { select: () => new Promise(() => {}) }, llmTimeoutMs: 50 });
  assert.deepEqual(r2.verses.map(v => v.ref), base.verses.map(v => v.ref));
  assertGrounded(r1);
});

test('topic answers group verses by surah, ranked by relevance', async () => {
  const r = await ask('الصبر');
  assert.ok(r.suras.length >= 3);
  const all = new Set(r.verses.map(v => v.idx));
  for (const g of r.suras) for (const i of g.verses) { assert.ok(all.has(i)); assert.equal(E.suraOf[i], g.sura); }
  for (let k = 1; k < r.suras.length; k++) assert.ok(r.suras[k - 1].score >= r.suras[k].score);
});

test('surah names that are ordinary words do not hijack topics', async () => {
  for (const q of ['الجنة', 'الربا', 'الحسد', 'Adam', 'الملائكة']) {
    const r = await ask(q);
    assert.notEqual(r.type, 'sura', q);
  }
  const t = await ask('التوبة');
  assert.ok(t.type === 'sura' || (t.type === 'topic' && t.alt && t.alt.sura === 9), 'التوبة');
});

// ------------------------------------------------------------- server lib
test('selector: payload sanitising and output validation', async () => {
  assert.throws(() => sanitizePayload({ query: '', candidates: [] }));
  const p = sanitizePayload({ query: 'x', lang: 'zz', candidates: [{ id: '2:1', text: 'a' }, { id: 'bad', text: 'b' }] });
  assert.equal(p.lang, 'ar'); assert.equal(p.candidates.length, 1);
  const v = validateOutput('noise {"intent":"topic","ids":["2:1","9:9"],"confidence":"high"} noise', p.candidates);
  assert.deepEqual(v.ids, ['2:1']); assert.equal(v.rejected, 1);
  const h = health({});
  assert.equal(h.ok, true); assert.equal(h.llm, false); assert.equal(h.model, null); assert.equal(h.stt, false);
  const out = await select({ query: 'x', candidates: [{ id: '2:1', text: 'a' }] }, {});
  assert.equal(out.ok, false); assert.deepEqual(out.ids, []);
  const fake = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{"intent":"topic","ids":["2:1","5:5"]}' } }] }) });
  const ok = await select({ query: 'x', candidates: [{ id: '2:1', text: 'a' }] }, { GROQ_API_KEY: 'k', GROQ_MODELS: 'm1' }, fake);
  assert.equal(ok.ok, true); assert.deepEqual(ok.ids, ['2:1']); assert.equal(ok.model, 'm1');
});

test('sentence splitter returns exact substrings', () => {
  const t = sources.mukhtasar_ar.text[E.idxOf(2, 255)];
  for (const s of sentences(t)) assert.ok(t.includes(s));
});
