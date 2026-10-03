// Extractive answer (plan v5, lot B): the model can only return sentence IDs of the closed list;
// a judge removes off-topic sentences; nothing it writes is shown.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answer, sanitizeAnswer, validateCompose } from '../functions/_lib/answer.js';
import { resetCoolDown } from '../functions/_lib/selector.js';
import { buildClosedList, applyAnswer, inQuery } from '../public/js/rag.js';
import { loadEngine } from './load.mjs';

const { engine: E, sources } = loadEngine();
const env = { PRIMARY_URL: 'https://openrouter.ai/api/v1/chat/completions', PRIMARY_KEY: 'k', PRIMARY_MODELS: 'openai/gpt-oss-120b,openai/gpt-oss-20b' };
const reply = (obj) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }] }) });
const verse = (s, a) => { const i = E.idxOf(s, a); const c = E.cardOf('ar', i, 'answer'); return { idx: i, ref: `${s}:${a}`, text: c.text, source: c.source, sourceTitle: c.sourceTitle }; };

test('closed list: every sentence is an exact substring of the vetted tafsir, ids are well formed', () => {
  const list = buildClosedList({ verses: [verse(2, 153), verse(14, 7)], hadiths: [{ id: 4196, text: 'من صام رمضان إيمانا واحتسابا غفر له ما تقدم من ذنبه.', expl: 'في الحديث فضل صيام رمضان. وفيه الحث على الإخلاص.', grade: 'صحيح', by: 'متفق عليه' }] });
  assert.ok(list.length >= 4);
  for (const s of list) {
    assert.match(s.sid, /^(Q:\d+:\d+#\d+|H:\d+#[te]\d)$/);
    if (s.kind === 'verse') assert.ok(sources.muyassar_ar.text[s.idx].includes(s.text), s.text.slice(0, 40));
  }
});

test('server sanitising: bad ids, duplicates, empty texts are dropped; at most 48 sentences', () => {
  const p = sanitizeAnswer({ query: ' الصبر ', lang: 'xx', sentences: [{ sid: 'Q:2:153#1', text: 'a' }, { sid: 'Q:2:153#1', text: 'b' }, { sid: 'X:1', text: 'c' }, { sid: 'H:12#t1', text: '' }, ...Array.from({ length: 60 }, (_, k) => ({ sid: `Q:3:${k + 1}#1`, text: 't' }))] });
  assert.equal(p.lang, 'ar'); assert.equal(p.query, 'الصبر');
  assert.equal(p.sentences[0].text, 'a'); assert.equal(p.sentences.length, 48);
  assert.throws(() => sanitizeAnswer({ query: '' }));
});

test('composer output: only ids of the list, ≤ 3 points, ≤ 2 ids each, no point → answerable no', () => {
  const list = [{ sid: 'Q:2:153#1' }, { sid: 'Q:2:153#2' }, { sid: 'Q:14:7#1' }, { sid: 'H:4196#t1' }];
  const v = validateCompose({ answerable: 'yes', concepts: ['الصبر', 'الشكر'], points: [{ concept: 'الصبر', ids: ['Q:2:153#1', 'Q:9:9#1', 'Q:2:153#2', 'Q:2:153#1'] }, { concept: 'الشكر', ids: ['FAKE'] }, { concept: 'الشكر', ids: ['Q:14:7#1'] }], text: 'INVENTED' }, list);
  assert.deepEqual(v.points, [{ concept: 'الصبر', sids: ['Q:2:153#1', 'Q:2:153#2'] }, { concept: 'الشكر', sids: ['Q:14:7#1'] }]);
  assert.equal(validateCompose({ answerable: 'yes', points: [{ ids: ['nope'] }] }, list).answerable, 'no');
  assert.equal(validateCompose('garbage', list).answerable, 'no');
});

test('pipeline: a hostile composer cannot inject text; the judge removes an off-topic sentence; uncovered concept reported', async () => {
  resetCoolDown();
  const calls = [];
  const fake = async (url, init) => {
    const body = JSON.parse(init.body); calls.push(body.model);
    if (body.messages[0].content.startsWith('You select evidence')) return reply({ answerable: 'yes', concepts: ['الصبر', 'الشكر'], text: 'INVENTED RELIGIOUS CLAIM',
      points: [{ concept: 'الصبر', ids: ['Q:2:153#1', 'Q:7:46#1'], explanation: 'INVENTED' }, { concept: 'الشكر', ids: ['Q:2:153#2'] }] });
    return reply({ keep: [1] });                         // the judge keeps only the first sentence
  };
  const out = await answer({ query: 'الصبر والشكر', lang: 'ar', sentences: [{ sid: 'Q:2:153#1', text: 'جملة أ' }, { sid: 'Q:2:153#2', text: 'جملة ب' }, { sid: 'Q:7:46#1', text: 'جملة ج' }] }, env, fake);
  assert.equal(out.ok, true);
  assert.deepEqual(out.points, [{ concept: 'الصبر', sids: ['Q:2:153#1'] }]);
  assert.deepEqual(out.uncovered, ['الشكر']);
  assert.equal(out.answerable, 'partial');
  assert.ok(!JSON.stringify(out).includes('INVENTED'));
  assert.deepEqual(calls, ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);   // composer large, judge small
});

test('pipeline: judge unreachable → nothing unjudged is shown; ruling → no answer', async () => {
  resetCoolDown();
  const fake = async (url, init) => {
    const body = JSON.parse(init.body);
    if (body.messages[0].content.startsWith('You select evidence')) return reply({ answerable: 'yes', concepts: ['x'], points: [{ concept: 'x', ids: ['Q:2:153#1'] }] });
    return { ok: false, status: 500, json: async () => ({}) };
  };
  const out = await answer({ query: 'x', sentences: [{ sid: 'Q:2:153#1', text: 't' }] }, env, fake);
  assert.equal(out.answerable, 'no'); assert.deepEqual(out.points, []); assert.equal(out.unjudged, true);
  resetCoolDown();
  const r2 = await answer({ query: 'x', sentences: [{ sid: 'Q:2:153#1', text: 't' }] }, env, async () => reply({ answerable: 'no', concepts: [], points: [] }));
  assert.equal(r2.answerable, 'no');
  assert.equal((await answer({ query: 'x', sentences: [] }, env)).ok, false);
  assert.equal((await answer({ query: 'x', sentences: [{ sid: 'Q:2:153#1', text: 't' }] }, {})).ok, false);
  resetCoolDown();
});

test('display: only sentences of the local list, verbatim; AI concept labels shown only when they are words of the question', () => {
  const list = buildClosedList({ verses: [verse(2, 153), verse(14, 7)] });
  const a = list.find(s => s.ref === '2:153'), b = list.find(s => s.ref === '14:7');
  const out = applyAnswer(list, { ok: true, concepts: ['الصبر', 'الشكر', 'التوكل على الله'], points: [{ concept: 'الصبر', sids: [a.sid, 'Q:9:9#9'] }, { concept: 'الشكر', sids: [b.sid] }] }, 'الصبر والشكر');
  assert.equal(out.points.length, 2);
  assert.equal(out.points[0].items[0].text, a.text);
  assert.equal(out.points[0].items.length, 1);
  assert.ok(out.points.every(p => p.shown));
  assert.deepEqual(out.uncovered, [{ concept: 'التوكل على الله', shown: false }]);
  assert.equal(out.answerable, 'partial');
  assert.equal(applyAnswer(list, { ok: false }), null);
  assert.ok(inQuery('anxiety', 'how to deal with anxiety'));
  assert.ok(!inQuery('القلق', 'ماذا أفعل إذا شعرت بالحزن'));
});
