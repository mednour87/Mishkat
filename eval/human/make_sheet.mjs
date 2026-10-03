// Measured benefit (audit V3): a BLIND rating sheet «Mishkat vs a general chatbot» + automatic counts.
//   node eval/human/make_sheet.mjs [n=60]
// Questions: 30 Arabic topic questions of the internal set + 30 real English question titles of
// Islam Stack Exchange (titles only, CC BY-SA). For each question:
//   - Mishkat: the deployed pipeline (engine + AI selection + extractive short answer, judged);
//   - chatbot: the same model (gpt-oss-120b) asked directly to answer with Quran verses, no retrieval —
//     what a visitor gets from a general chatbot.
// Outputs (eval/human/):
//   rating_sheet.csv  — UTF-8 with BOM (opens in Excel): systems shown as A/B in random order (seed 42)
//   rating_key.json   — which system is A or B for each row (do NOT give it to the raters)
//   auto_metrics.json — automatic, no human needed: invented references (no such verse) and quotations
//                       of the Quran that are not word for word in the Mushaf (checked by Mishkat's verifier)
import { readFileSync, writeFileSync } from 'node:fs';
import { loadEngine } from '../../tests/load.mjs';
import { select, expand, providers, callOpenAICompat } from '../../functions/_lib/selector.js';
import { answer } from '../../functions/_lib/answer.js';
import { buildClosedList, applyAnswer } from '../../public/js/rag.js';

const ROOT = new URL('../../', import.meta.url);
const env = {};
for (const line of readFileSync(new URL('.dev.vars', ROOT), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
const { engine: E, core } = loadEngine();
E.addTopicIndex(JSON.parse(readFileSync(new URL('public/data/qp_topics.json', ROOT), 'utf8')));
E.addLatinIndex(JSON.parse(readFileSync(new URL('public/data/latin_index.json', ROOT), 'utf8')));
const wrap = (f) => async (p) => { const j = await f(p, env); if (!j.ok) throw new Error('AI'); return j; };
const llm = { expand: wrap(expand), select: wrap(select) };
const N = +(process.argv[2] || 60);

// questions
const golden = readFileSync(new URL('eval/golden.jsonl', ROOT), 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const ar = golden.filter(r => r.cat === 'topic_ar').map(r => r.q).slice(0, N / 2);
const forum = JSON.parse(readFileSync(new URL('eval/forum_questions.json', ROOT), 'utf8')).questions.map(x => typeof x === 'string' ? x : (x.title || x.q)).filter(Boolean);
const en = forum.filter(t => /\?$/.test(t) && t.length < 110 && /quran|qur'an|allah|verse|surah|ayah|islam/i.test(t)).slice(0, N / 2);
const QS = [...ar.map(q => ({ q, lang: 'ar' })), ...en.map(q => ({ q, lang: 'en' }))];

// the general chatbot: same model, no retrieval, asked to cite the Quran
const CHAT_SYS = 'You are a helpful assistant. Answer the user\'s question about Islam briefly (max 120 words). Support your answer with Quran verses: give each reference as (sura:aya) and quote the verse text in Arabic between ﴿ ﴾.';
async function chatbot(q) {
  for (const pr of providers(env)) {
    try { return await callOpenAICompat({ ...pr, messages: [{ role: 'system', content: CHAT_SYS }, { role: 'user', content: q }], timeoutMs: 20000 }).then(t => String(t)); }
    catch (e) { /* next */ }
  }
  return '';
}
// json_object mode is on in callOpenAICompat: the chatbot may wrap its text in JSON; take its string values
const plain = (t) => { try { const j = JSON.parse(t); return Object.values(j).flat().map(String).filter(x => x.length > 10).join(' '); } catch (e) { return t; } };

const nV = core.suras.map(s => s.ayas);
async function checkChat(text) {
  const refs = [...text.matchAll(/\(?\b(\d{1,3})\s*:\s*(\d{1,3})\b\)?/g)].map(m => [+m[1], +m[2]]);
  const badRefs = refs.filter(([s, a]) => !(s >= 1 && s <= 114 && a >= 1 && a <= nV[s - 1]));
  const quotes = [...text.matchAll(/﴿([^﴾]{8,})﴾/g)].map(m => m[1].trim());
  let notExact = 0;
  const detail = [];
  for (const q of quotes) {
    const r = await E.ask(`«${q}»`, { uiLang: 'ar' });
    const ok = r.type === 'verify' && r.verdict === 'exact';
    if (!ok) notExact++;
    detail.push({ quote: q.slice(0, 120), verdict: r.verdict || r.type });
  }
  return { refs: refs.length, badRefs: badRefs.length, quotes: quotes.length, notExact, detail };
}

let seed = 42; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const csvCell = (s) => `"${String(s ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
const rows = [], key = [], auto = [];
for (const [k, { q, lang }] of QS.entries()) {
  let mish = '';
  try {
    const r = await E.ask(q, { uiLang: lang, llm });
    const refs = (r.verses || []).slice(0, 5).map(v => v.ref);
    let short = '';
    if (r.confirmedBy === 'ai') {
      const L = r.lang === 'en' ? 'en' : 'ar';
      const vs = r.verses.filter(v => v.ai), ord = vs.filter(v => !v.aiRelated).concat(vs.filter(v => v.aiRelated));
      const list = buildClosedList({ verses: ord.map(v => { const c = E.cardOf(L, v.idx, 'answer'); return c && { idx: v.idx, ref: E.ref(v.idx), text: c.text, source: c.source }; }).filter(Boolean) });
      const b = applyAnswer(list, await answer({ query: q, lang: L, sentences: list.map(s => ({ sid: s.sid, text: s.text })) }, env), q);
      if (b && b.points.length) short = b.points.map(p => p.items.map(x => `${x.text} (${x.ref})`).join(' ')).join(' | ');
    }
    mish = r.type === 'abstain' ? `[Abstains: ${r.reason}] ` : '';
    mish += short ? `In short: ${short} — ` : '';
    mish += refs.length ? `Verses: ${refs.join(', ')}` : (r.type === 'notfound' ? '[No sufficient source]' : '');
  } catch (e) { mish = '[error]'; }
  const chat = plain(await chatbot(q));
  const chk = await checkChat(chat);
  auto.push({ q, lang, chatbot: chk });
  const aIsMishkat = rnd() < 0.5;
  key.push({ row: k + 1, A: aIsMishkat ? 'mishkat' : 'chatbot', B: aIsMishkat ? 'chatbot' : 'mishkat' });
  rows.push([k + 1, lang, q, aIsMishkat ? mish : chat, aIsMishkat ? chat : mish]);
  console.log(`${k + 1}/${QS.length} ${q.slice(0, 50)} | chatbot refs ${chk.refs} bad ${chk.badRefs} quotes ${chk.quotes} not exact ${chk.notExact}`);
  await new Promise(res => setTimeout(res, 1200));
}
const head = ['row', 'lang', 'question', 'answer A', 'answer B', 'A relevance (0-2)', 'A religious error (0/1)', 'B relevance (0-2)', 'B religious error (0/1)', 'preferred (A/B/=)', 'notes'];
writeFileSync(new URL('rating_sheet.csv', import.meta.url), '﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n'));
writeFileSync(new URL('rating_key.json', import.meta.url), JSON.stringify(key, null, 1));
const tot = auto.reduce((a, x) => ({ refs: a.refs + x.chatbot.refs, badRefs: a.badRefs + x.chatbot.badRefs, quotes: a.quotes + x.chatbot.quotes, notExact: a.notExact + x.chatbot.notExact }), { refs: 0, badRefs: 0, quotes: 0, notExact: 0 });
writeFileSync(new URL('auto_metrics.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), questions: QS.length, chatbot_model: providers(env)[0] && providers(env)[0].model,
  chatbot_totals: { refs: tot.refs, badRefs: tot.badRefs, quotes: tot.quotes },
  // by verdict of Mishkat's verifier: notfound = matches no verse (invented or heavily altered); near = close to a
  // verse (misquote OR only a spelling variant → human check); merged = two verses joined
  chatbot_quotes_by_verdict: auto.flatMap(x => x.chatbot.detail).reduce((c, d) => (c[d.verdict] = (c[d.verdict] || 0) + 1, c), {}),
  questionsWithAQuoteNotInQuran: auto.filter(x => x.chatbot.detail.some(d => d.verdict === 'notfound')).length,
  mishkat: 'every verse text comes from the Tanzil file (tested byte for byte, tests/engine.test.mjs); quotations: 0 by construction', rows: auto }, null, 1));
console.log('chatbot totals', tot);
