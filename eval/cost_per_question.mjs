// Real token use and cost of one question (all AI calls of the pipeline), read from the providers' own
// `usage` field. Prices: OpenRouter public price list (per million tokens), passed on the command line or
// the defaults below (checked on 2026-10-03, https://openrouter.ai/api/v1/models/openai/gpt-oss-120b/endpoints).
//   node eval/cost_per_question.mjs [question …]
import { readFileSync } from 'node:fs';
import { loadEngine } from '../tests/load.mjs';
import { select, expand, pickRelevant } from '../functions/_lib/selector.js';
import { answer } from '../functions/_lib/answer.js';
import { buildClosedList, applyAnswer } from '../public/js/rag.js';

const env = {};
for (const line of readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
const PRICE = { // $ per million tokens [input, output]
  'openai/gpt-oss-120b': { cheapest: [0.037, 0.17], cerebras: [0.35, 0.75] },
  'openai/gpt-oss-20b': { cheapest: [0.03, 0.14], cerebras: [0.1, 0.5] },
};
const usage = [];
let stage = '';
const counting = async (url, init) => {
  const r = await fetch(url, init);
  const j = await r.clone().json().catch(() => null);
  if (j && j.usage) usage.push({ stage, model: JSON.parse(init.body).model, host: j.provider || '', in: j.usage.prompt_tokens, out: j.usage.completion_tokens, cost: j.usage.cost });
  return r;
};
const { engine: E } = loadEngine();
E.addTopicIndex(JSON.parse(readFileSync(new URL('../public/data/qp_topics.json', import.meta.url), 'utf8')));
const w = (f, s) => async (p) => { stage = s; const j = await f(p, env, counting); if (!j.ok) throw new Error(s); return j; };
const llm = { expand: w(expand, 'expand'), select: w(select, 'select') };
const QS = process.argv.slice(2).length ? process.argv.slice(2) : ['الصبر والشكر', 'how to deal with anxiety', 'فضل الصدقة', 'بر الوالدين'];
let total = { cheapest: 0, cerebras: 0, reported: 0 }, n = 0;
for (const q of QS) {
  usage.length = 0;
  const r = await E.ask(q, { uiLang: 'ar', llm });
  if (r.confirmedBy === 'ai') {
    const L = r.lang === 'en' ? 'en' : 'ar';
    const vs = r.verses.filter(v => v.ai);
    stage = 'pick'; await pickRelevant(q, Array.from({ length: 10 }, (_, k) => 'حديث رقم ' + k + ' — ' + 'نص '.repeat(60)), env, { what: 'hadith', fetchImpl: counting });
    const list = buildClosedList({ verses: vs.map(v => { const c = E.cardOf(L, v.idx, 'answer'); return c && { idx: v.idx, ref: E.ref(v.idx), text: c.text, source: c.source }; }).filter(Boolean) });
    stage = 'answer'; await answer({ query: q, lang: L, sentences: list.map(s => ({ sid: s.sid, text: s.text })) }, env, counting);
  }
  const c = (k) => usage.reduce((a, u) => { const p = (PRICE[u.model] || PRICE['openai/gpt-oss-120b'])[k]; return a + (u.in * p[0] + u.out * p[1]) / 1e6; }, 0);
  const rep = usage.reduce((a, u) => a + (+u.cost || 0), 0);
  total.cheapest += c('cheapest'); total.cerebras += c('cerebras'); total.reported += rep; n++;
  console.log(q, '|', usage.map(u => `${u.stage}:${u.model.split('/')[1]}@${u.host || '?'} ${u.in}+${u.out}`).join(' · '), `| $${c('cheapest').toFixed(5)} cheapest, $${c('cerebras').toFixed(5)} Cerebras, reported $${rep.toFixed(5)}`);
  await new Promise(res => setTimeout(res, 1500));
}
const per = (k) => total[k] / n;
console.log(`\nper question: cheapest hosts $${per('cheapest').toFixed(5)} · Cerebras $${per('cerebras').toFixed(5)} · billed (reported by OpenRouter) $${per('reported').toFixed(5)}`);
console.log(`questions for $8: ${Math.floor(8 / per('cheapest'))} (cheapest) · ${Math.floor(8 / per('cerebras'))} (Cerebras) · ${per('reported') ? Math.floor(8 / per('reported')) : '?'} (as billed now)`);
