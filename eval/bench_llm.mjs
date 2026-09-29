// Compare free Groq models inside the Mishkat pipeline (same engine, same
// verifier). Measures: valid JSON, ids/sentences rejected by the verifier,
// correct abstention, topic hit@10, latency.   node eval/bench_llm.mjs [n]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { loadEngine } from '../tests/load.mjs';
import { select, expand } from '../functions/_lib/selector.js';

const env = { ...process.env };
const dv = new URL('../.dev.vars', import.meta.url);
if (existsSync(dv)) for (const line of readFileSync(dv, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
if (!env.GROQ_API_KEY) { console.log('No GROQ_API_KEY — skipped.'); process.exit(0); }

const { engine: E } = loadEngine();
const gold = readFileSync(new URL('./golden.jsonl', import.meta.url), 'utf8').trim().split('\n').map(l => JSON.parse(l));
const N = +(process.argv[2] || 24);
const topics = gold.filter(g => g.cat.startsWith('topic_'));
const crit = gold.filter(g => g.cat === 'safety_critical');
const items = [...topics.filter((_, i) => i % Math.ceil(topics.length / N) === 0), ...crit.filter((_, i) => i % 8 === 0)];
const MODELS = (process.argv[3] || 'openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b,allam-2-7b').split(',');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const results = {};
for (const model of MODELS) {
  const menv = { GROQ_API_KEY: env.GROQ_API_KEY, GROQ_MODELS: model };
  let ok = 0, calls = 0, rejected = 0, hit = 0, nt = 0, abst = 0, nc = 0, paraLLM = 0, ms = 0, errors = 0;
  for (const it of items) {
    const stats = { calls: 0, ok: 0, rej: 0 };
    const llm = {
      expand: async (p) => { stats.calls++; const o = await expand(p, menv); if (o.ok) stats.ok++; else errors++; return o; },
      select: async (p) => { stats.calls++; const o = await select(p, menv); if (o.ok) stats.ok++; else errors++; stats.rej += o.rejected || 0; return o; },
    };
    const t0 = Date.now();
    const r = await E.ask(it.q, { uiLang: 'ar', llm, llmTimeoutMs: 30000 });
    ms += Date.now() - t0; calls += stats.calls; ok += stats.ok; rejected += stats.rej;
    if (it.cat === 'safety_critical') { nc++; if (r.type === 'abstain') abst++; }
    else {
      nt++;
      const refs = r.verses.slice(0, 10).map(v => v.ref);
      if (it.expect.keys.some(k => refs.includes(k))) hit++;
      if (r.paragraphBy === 'llm') paraLLM++;
    }
    await sleep(2500); // stay under free-tier TPM
  }
  results[model] = { items: items.length, validJson: `${ok}/${calls}`, rejectedByVerifier: rejected, providerErrors: errors,
    topicHit10: `${hit}/${nt}`, paragraphChosenByLLM: `${paraLLM}/${nt}`, criticalAbstain: `${abst}/${nc}`, avgLatencyMs: Math.round(ms / items.length) };
  console.log(model, results[model]);
}
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL('./results/bench_llm.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), results }, null, 1));
