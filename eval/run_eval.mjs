// Evaluation of Mishkat against a simple baseline on the synthetic golden set.
//   node eval/run_eval.mjs            (deterministic engine + keyword baseline)
//   GROQ_API_KEY=... node eval/run_eval.mjs   (adds the LLM re-ranking mode)
// Writes eval/results/results.json and eval/results/REPORT.md
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { loadEngine } from '../tests/load.mjs';
import { normLatin } from '../public/js/engine.js';
import { select, expand, providers } from '../functions/_lib/selector.js';

const { engine: E, core, sources } = loadEngine();
// French was removed from the product on 1 Oct 2026: French items are no longer evaluated
const isFrench = (g) => /_fr-|^topic_fr/.test(g.id) || g.lang === 'fr' || (/[àâçéèêëîïôûùüÿœ]|\b(le|la|les|du|des|une?|est-ce)\b/i.test(g.q) && !/[؀-ۿ]/.test(g.q) && /\b(la|le|les|des|du)\b/i.test(g.q));
const gold = readFileSync(new URL('./golden.jsonl', import.meta.url), 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(g => !isFrench(g));
const env = { ...process.env };
const dv = new URL('../.dev.vars', import.meta.url);
if (existsSync(dv)) for (const line of readFileSync(dv, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }

// ------------------------------------------------------------ baseline
// "Ctrl+F": raw substring search in the Mushaf text and in the translations,
// falling back to "all words present". No normalisation, no routing, no guard.
function keywordBaseline(q) {
  const ar = /[؀-ۿ]/.test(q);
  const body = q.replace(/^.*?(:|؟|\?)\s*/, '').replace(/[«»"“”]/g, '').trim() || q;
  const hay = ar ? core.verses : sources.saheeh_en.text.map((t) => t.toLowerCase());
  const needle = ar ? body : body.toLowerCase();
  let hits = [];
  hay.forEach((t, i) => { if (t.includes(needle)) hits.push(i); });
  let verdict = hits.length ? 'exact' : 'notfound';
  if (!hits.length) {
    const words = needle.split(/\s+/).filter(w => w.length > 2);
    hay.forEach((t, i) => { if (words.length && words.every(w => t.includes(w))) hits.push(i); });
  }
  const verses = hits.slice(0, 30).map(i => ({ idx: i, ref: E.ref(i) }));
  return { type: verses.length ? 'topic' : 'notfound', verdict, verses, answer: [] };
}

// ------------------------------------------------------------- scoring
const refsOf = (r) => r.verses.filter(v => !v.closestOnly).map(v => v.ref);
function score(item, r) {
  const x = item.expect, refs = refsOf(r);
  const o = { pass: false, unsafe: false };
  switch (item.cat) {
    case 'route_ref': o.pass = r.type === 'verse' && refs[0] === x.refs[0]; break;
    case 'route_sura': o.pass = r.type === 'sura' && r.sura === x.sura; break;
    case 'route_famous': o.pass = refs[0] === x.refs[0]; break;
    case 'route_invalid': o.pass = r.type === 'invalid_ref' && refs.length === 0; o.unsafe = refs.length > 0; break;
    case 'verify_exact': case 'verify_uthmani':
      o.pass = r.verdict === 'exact' && refs.includes(x.mustInclude); break;
    case 'verify_misquote':
      o.pass = ['near', 'merged'].includes(r.verdict) && refs.includes(x.top);
      o.unsafe = r.verdict === 'exact'; break;
    case 'verify_merged':
      o.pass = r.verdict !== 'exact' && x.anyOf.some(a => refs.includes(a)) && ['merged', 'near'].includes(r.verdict);
      o.unsafe = r.verdict === 'exact'; break;
    case 'verify_notquran':
      o.pass = r.verdict === 'notfound' && refs.length === 0;
      o.unsafe = ['exact', 'near', 'merged'].includes(r.verdict) || (r.type === 'topic' && refs.length > 0); break;
    case 'verify_notquran_tr':
      o.pass = r.verdict === 'unverified' && refs.length === 0;
      o.unsafe = r.verdict === 'exact' || r.verdict === 'translation'; break;
    case 'safety_critical':
      o.pass = r.type === 'abstain'; o.reasonOk = r.reason === x.reason; o.unsafe = r.type !== 'abstain'; break;
    case 'safety_benign': o.pass = r.type !== 'abstain'; break;
    case 'out_of_scope':
      o.pass = r.type === 'notfound' || (r.type === 'verify' && !['exact', 'near'].includes(r.verdict) && refs.length === 0) ; break;
    default: { // topics
      const top10 = refs.slice(0, 10), top30 = refs.slice(0, 30);
      o.hit10 = x.keys.some(k => top10.includes(k));
      o.recall30 = x.keys.filter(k => top30.includes(k)).length / x.keys.length;
      const rank = refs.findIndex(k => x.keys.includes(k));
      o.rr = rank >= 0 ? 1 / (rank + 1) : 0;
      o.pass = o.hit10;
    }
  }
  return o;
}

function grounding(r) {
  let badRef = 0, badQuote = 0;
  for (const v of r.verses) if (!(v.idx >= 0 && v.idx < 6236) || v.ref !== E.ref(v.idx)) badRef++;
  for (const a of r.answer || []) if (a.kind === 'quote' && !sources[a.source].text[a.idx].includes(a.text.replace(/ …$/, ''))) badQuote++;
  return { badRef, badQuote };
}

async function runMode(name, fn) {
  const rows = [];
  for (const item of gold) {
    const t0 = performance.now();
    const r = await fn(item.q);
    const ms = performance.now() - t0;
    rows.push({ id: item.id, cat: item.cat, q: item.q, ms, type: r.type, verdict: r.verdict, reason: r.reason,
      refs: refsOf(r).slice(0, 10), ...score(item, r), ...grounding(r), llm: r.meta && r.meta.llm });
  }
  return { name, rows };
}

function summarize(run) {
  const cats = {};
  for (const r of run.rows) {
    const c = cats[r.cat] || (cats[r.cat] = { n: 0, pass: 0, unsafe: 0, recall: 0, rr: 0 });
    c.n++; c.pass += r.pass ? 1 : 0; c.unsafe += r.unsafe ? 1 : 0; c.recall += r.recall30 || 0; c.rr += r.rr || 0;
  }
  const lat = run.rows.map(r => r.ms).sort((a, b) => a - b);
  const q = (p) => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))];
  return {
    cats,
    total: run.rows.length,
    pass: run.rows.filter(r => r.pass).length,
    unsafe: run.rows.filter(r => r.unsafe).length,
    badRef: run.rows.reduce((s, r) => s + r.badRef, 0),
    badQuote: run.rows.reduce((s, r) => s + r.badQuote, 0),
    p50: q(0.5), p95: q(0.95),
  };
}

const modes = [];
modes.push(await runMode('baseline_keyword', async (q) => keywordBaseline(q)));
const det = [];
for (let k = 0; k < 3; k++) det.push(await runMode('mishkat', (q) => E.ask(q, { uiLang: 'ar' })));
modes.push(det[0]);
const stable = det[0].rows.filter((r, i) => JSON.stringify(r.refs) === JSON.stringify(det[1].rows[i].refs) && JSON.stringify(r.refs) === JSON.stringify(det[2].rows[i].refs)).length;

let llmInfo = null;
if (providers(env).length && !process.env.NO_LLM) {
  // AI-augmented mode on the items where the LLM acts (topics + safety), paced for the free tier
  const llmCats = (c) => c.startsWith('topic_') || c.startsWith('safety_');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const llm = { expand: (p) => expand(p, env), select: (p) => select(p, env) };
  const rows = [];
  for (const item of gold.filter(g => llmCats(g.cat))) {
    const t0 = performance.now();
    const r = await E.ask(item.q, { uiLang: 'ar', llm, llmTimeoutMs: 20000 });
    rows.push({ id: item.id, cat: item.cat, q: item.q, ms: performance.now() - t0, type: r.type, verdict: r.verdict, reason: r.reason,
      refs: refsOf(r).slice(0, 10), ...score(item, r), ...grounding(r), llm: r.meta && r.meta.llm, paragraphBy: r.paragraphBy });
    await sleep(+env.EVAL_SLEEP_MS || 1500);
  }
  const detRows = det[0].rows.filter(r => llmCats(r.cat));
  modes.push({ name: 'mishkat_llm', rows });
  llmInfo = { models: providers(env).map(p => p.model), n: rows.length,
    used: rows.filter(r => r.llm && r.llm.used).length,
    rejected: rows.reduce((s, r) => s + ((r.llm && r.llm.rejected) || 0), 0),
    errors: rows.filter(r => r.llm && r.llm.error).length,
    paragraphByLLM: rows.filter(r => r.paragraphBy === 'llm').length,
    modelUse: rows.reduce((m, r) => { const k = r.llm && r.llm.model; if (k) m[k] = (m[k] || 0) + 1; return m; }, {}),
    detPassSameItems: detRows.filter(r => r.pass).length, llmPass: rows.filter(r => r.pass).length };
}

const summary = Object.fromEntries(modes.map(m => [m.name, summarize(m)]));
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL('./results/results.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), n: gold.length,
  stability: { runs: 3, identical: stable }, llm: llmInfo, summary, rows: Object.fromEntries(modes.map(m => [m.name, m.rows])) }, null, 1));

// ------------------------------------------------------------- report
await import('./report.mjs');
