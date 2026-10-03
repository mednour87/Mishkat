// Regression tests for the errors found by the 2026-10-03 audit (01_PLAN/CARTOGRAPHIE_ERREURS_ET_AMELIORATIONS.md).
// Every test goes through ask(), like the app does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine, readJson } from './load.mjs';
import { readFileSync } from 'node:fs';

const { engine: E } = loadEngine();
const ask = (q, o = {}) => E.ask(q, { uiLang: 'ar', ...o });

test('E8: «X و Y» without AI finds verses (regex (?=\\S), not (?=S))', async () => {
  for (const q of ['الصبر والشكر', 'الصبر و الشكر']) {
    const r = await ask(q);
    assert.notEqual(r.type, 'notfound', q);
    assert.ok(r.verses.length > 0, q);
  }
});

test('E2: a status word without «هل» is a fatwa request (level D); a bare topic stays a topic', async () => {
  for (const q of ['الموسيقى حرام', 'الموسيقى حرام؟', 'التدخين حلال ولا حرام', 'music haram?', 'is music haram', 'can i pray sitting']) {
    const r = await ask(q);
    assert.equal(r.type, 'abstain', q); assert.equal(r.reason, 'ruling', q); assert.equal(r.level, 'D', q);
  }
  for (const q of ['الخمر', 'الربا', 'المسجد الحرام', 'الشهر الحرام']) assert.equal((await ask(q)).type, 'topic', q);
  // the AI saying «ruling» on a two-word query that carries a status word is no longer demoted to «topic»
  const r = await ask('الغناء حرام', { llm: { expand: async () => ({ intent: 'ruling' }) } });
  assert.equal(r.type, 'abstain');
});

test('E3: no over-refusal — the 50 legitimate questions of eval/overrefusal.json are never refused', async () => {
  const { questions } = JSON.parse(readFileSync(new URL('../eval/overrefusal.json', import.meta.url), 'utf8'));
  assert.ok(questions.length >= 50);
  const refused = [];
  for (const q of questions) { const r = await ask(q); if (r.type === 'abstain') refused.push(`${q} → ${r.reason}`); }
  assert.deepEqual(refused, []);
});

test('E3: real personal cases are still referred (level D)', async () => {
  for (const q of ['زوجي يضربني', 'زوجتي لا تصلي', 'هل أطلق زوجتي', 'should i divorce my husband', 'my husband beats me', 'ماذا أفعل مع زوجي']) {
    const r = await ask(q);
    assert.equal(r.type, 'abstain', q); assert.equal(r.reason, 'personal', q);
  }
});

test('E1: a subject-index topic reached through ONE AI keyword never short-circuits the AI selection', async () => {
  let selected = 0;
  const llm = {
    expand: async () => ({ intent: 'topic', keywords: { ar: ['الصبر'] } }),
    select: async ({ candidates }) => { selected++; return { intent: 'topic', confidence: 'high', ids: [candidates[0].id, candidates[1].id] }; },
  };
  const r = await ask('الصبر والشكر', { llm });
  assert.equal(selected, 1);
  assert.equal(r.topicIndex, null);
  assert.equal(r.confirmedBy, 'ai');
});

test('E4: a subject-index topic is filtered by the AI; without AI it gives no short answer and no answer card', async () => {
  // with AI: the index verses are candidates, the AI keeps what answers
  let cands = null;
  const llm = { select: async ({ candidates }) => { cands = candidates.map(c => c.id); return { intent: 'topic', confidence: 'high', ids: ['33:59', '24:31'].filter(x => cands.includes(x)) }; } };
  const r = await ask('الحجاب', { llm });
  assert.ok(cands && cands.length > 0, 'select was called');
  if (r.verses.length) assert.ok(!r.verses.some(v => v.ref === '7:46' && v.ai), '7:46 not presented as an AI answer');
  assert.ok(!(r.brief && r.brief.items.some(i => i.ref === '7:46')));
  // without AI: no «in short», no tafsir card presented as the answer
  const r0 = await ask('الحجاب');
  assert.equal(r0.brief, null);
  assert.ok(!r0.answer.some(a => a.kind === 'quote' && a.role === 'answer'));
});

test('E5: the short answer never contains a sentence without a word of the question', async () => {
  const llm = { select: async ({ candidates }) => ({ intent: 'topic', confidence: 'high', ids: candidates.slice(0, 3).map(c => c.id) }) };
  const r = await ask('الصبر', { llm });
  if (r.brief) for (const it of r.brief.items) assert.ok(/صبر|الصبر|يصبر|اصبر|صابر/.test(it.text), it.text.slice(0, 80));
});

test('E7: a 429 or 402 on the paid provider does not block the same model on the free backup', async () => {
  const { select, resetCoolDown } = await import('../functions/_lib/selector.js');
  resetCoolDown();
  const calls = [];
  const fake = (status) => async (url) => {
    calls.push(url);
    if (/openrouter/.test(url)) return { ok: false, status, headers: { get: () => '9' } };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"intent":"topic","ids":["2:1"]}' } }] }) };
  };
  const env = { PRIMARY_URL: 'https://openrouter.ai/api/v1/chat/completions', PRIMARY_KEY: 'k', PRIMARY_MODELS: 'openai/gpt-oss-120b',
    GROQ_API_KEY: 'g', GROQ_MODELS: 'openai/gpt-oss-120b', PREFER_PAID: '1' };   // paid-first order (optional mode)
  const body = { query: 'x', candidates: [{ id: '2:1', text: 'a' }] };
  for (const status of [429, 402]) {
    resetCoolDown(); calls.length = 0;
    const r1 = await select(body, env, fake(status));
    assert.equal(r1.ok, true, `status ${status}`);
    // second request: the paid host is cooling down, the backup (same model name) is still used
    const r2 = await select(body, env, fake(status));
    assert.equal(r2.ok, true);
    assert.equal(calls.filter(u => /openrouter/.test(u)).length, 1, `paid provider skipped after ${status}`);
    assert.equal(calls.filter(u => /groq/.test(u)).length, 2);
  }
  resetCoolDown();
});

test('E9/E11: penalties are sensitive (C) whatever the wording; a cut war quotation is flagged and gets context', async () => {
  for (const q of ['ما عقوبة الزنا', 'حد السرقة', 'punishment for adultery']) assert.equal((await ask(q)).level, 'C', q);
  assert.equal((await ask('قصة امرأة فرعون')).level, 'B');      // a pack word only mentioned → not sensitive
  for (const q of ['اقتلوهم حيث ثقفتموهم', 'kill them wherever you find them']) {
    const r = await ask(q);
    assert.ok(r.verses.some(v => v.ref === '2:191'), q);
    assert.equal(r.sensitive, true, q); assert.equal(r.level, 'C', q);
    assert.ok(r.answer.some(a => a.kind === 'note'), q);
  }
});

test('E12/E13: no absurd suggestion on valid words; a sure misspelling is corrected', async () => {
  for (const q of ['الحجاب', 'الغضب', 'الجار', 'الأمانة']) assert.ok(!(await ask(q)).suggest, q);
  const r = await ask('الزكات');
  assert.equal(r.correctedFrom, 'الزكات');
  assert.ok(r.verses.length > 0);
  assert.ok(!(await ask('الجهاد')).correctedFrom);
});

test('free first: Groq answers when it can; the paid provider only when Groq is cooling down; light tasks on another free model', async () => {
  const { select, expand, resetCoolDown, providers } = await import('../functions/_lib/selector.js');
  resetCoolDown();
  const env = { PRIMARY_URL: 'https://openrouter.ai/api/v1/chat/completions', PRIMARY_KEY: 'k', PRIMARY_MODELS: 'openai/gpt-oss-120b',
    GROQ_API_KEY: 'g', GROQ_MODELS: 'openai/gpt-oss-120b,openai/gpt-oss-20b' };
  assert.deepEqual(providers(env, 'select').map(p => p.name + ':' + p.model), ['groq:openai/gpt-oss-120b', 'primary:openai/gpt-oss-120b', 'groq:openai/gpt-oss-20b']);
  assert.deepEqual(providers(env, 'expand').map(p => p.name + ':' + p.model), ['groq:openai/gpt-oss-20b', 'groq:openai/gpt-oss-120b', 'primary:openai/gpt-oss-120b']);
  const calls = [];
  let groqDown = false;
  const fake = async (url, init) => {
    calls.push((/groq/.test(url) ? 'groq:' : 'paid:') + JSON.parse(init.body).model);
    if (/groq/.test(url) && groqDown) return { ok: false, status: 429, headers: { get: () => '30' } };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"intent":"topic","ids":["2:1"],"keywords":{"ar":["x"]}}' } }] }) };
  };
  const body = { query: 'x', candidates: [{ id: '2:1', text: 'a' }] };
  const r1 = await select(body, env, fake);
  assert.equal(r1.via, 'groq');
  groqDown = true;
  const r2 = await select(body, env, fake);
  assert.equal(r2.via, 'primary');                                   // Groq 429 → paid backup, same model
  calls.length = 0;
  await select(body, env, fake);
  assert.deepEqual(calls, ['paid:openai/gpt-oss-120b']);             // Groq cooling down: not even tried
  resetCoolDown();
  const health = (await import('../functions/_lib/selector.js')).health(env);
  assert.equal(health.free, true);
});

test('map 1000: no «did you mean» on valid words or answered questions; «حكم X» is a ruling; distress without AI gets the reviewed verses of tranquillity', async () => {
  for (const q of ['fasting', 'wine', 'أفكر في الانتحار', 'التوكل على الله']) assert.ok(!(await ask(q)).suggest, q);
  assert.equal((await ask('الزكات')).correctedFrom, 'الزكات');
  const r = await ask('حكم المرتد'); assert.equal(r.type, 'abstain'); assert.equal(r.reason, 'ruling'); assert.equal(r.blood, true);
  assert.notEqual((await ask('Why is halal/haram important to Muslims?')).type, 'abstain');
  for (const q of ['how to deal with anxiety', 'ماذا أفعل إذا شعرت بالحزن', 'ضاق صدري']) { const c = await ask(q); assert.equal(c.pack, 'comfort', q); assert.equal(c.verses[0].ref, '13:28', q); assert.ok(c.answer.some(a => a.kind === 'quote'), q); }
  assert.notEqual((await ask('الخوف من الله')).pack, 'comfort');
  // with an AI selection, the AI's verses are kept
  const ai = await ask('how to deal with anxiety', { llm: { select: async ({ candidates }) => ({ intent: 'topic', confidence: 'high', ids: [candidates[0].id] }) } });
  assert.notEqual(ai.pack, 'comfort');
});
