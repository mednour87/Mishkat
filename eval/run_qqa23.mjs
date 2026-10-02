// Mishkat on the public benchmark Qur'an QA 2023 — Task A (Qur'anic passage retrieval).
// Data (CC BY-NC-ND 4.0, not redistributed here): eval/qqa23/get_data.sh downloads it from
// https://gitlab.com/bigirqu/quran-qa-2023 . Official scorer: eval/qqa23/QQA23_TaskA_eval.py
// (MAP@10, MRR@10; a no-answer question scores 1 only if the run returns the single id -1).
//
//   node eval/run_qqa23.mjs <mode> [split]      mode: lex | ai | ai_dense | dense   split: test (default) | dev
//   - lex      : the engine without any AI (words, thesaurus, subject index)
//   - ai       : + AI expansion and closed-list selection (via the local server, npm run dev)
//   - ai_dense : + semantic neighbours (bge-m3) as candidates and as a check of AI-proposed verses
//   - dense    : semantic neighbours alone (no engine), for the ablation table
// Dense search needs CF_ACCOUNT and CF_AI_TOKEN in the environment (Workers AI REST API).
// Each run is written to eval/qqa23/runs/mishkat_<mode>_<split>.tsv in the official format.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '../public/js/engine.js';
import { denseSearch } from '../functions/_lib/dense.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const D = path.join(HERE, 'qqa23');
const mode = process.argv[2] || 'lex', split = process.argv[3] || 'test';
const API = process.env.MISHKAT_API || 'http://localhost:8790';
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'data', p), 'utf8'));

// thematic passages: id "s:a-b"
const passages = fs.readFileSync(path.join(D, 'QQA23_TaskA_QPC_v1.1.tsv'), 'utf8').split(/\r?\n/).filter(Boolean).map(l => {
  const id = l.split('\t')[0]; const m = id.match(/^(\d+):(\d+)-(\d+)$/); return { id, s: +m[1], a: +m[2], b: +m[3] };
});
const passageOf = (s, a) => (passages.find(p => p.s === s && a >= p.a && a <= p.b) || {}).id;
const questions = fs.readFileSync(path.join(D, `QQA23_TaskA_ayatec_v1.2_${split}.tsv`), 'utf8').split(/\r?\n/).filter(Boolean).map(l => { const [qid, q] = l.split('\t'); return { qid, q }; });

const core = J('core.json');
const e = createEngine({ core, searchAr: J('search_ar.json') });
for (const id of ['mukhtasar_ar', 'muyassar_ar']) e.addSource(id, J(`tafsir_${id}.json`));
try { e.addTopicIndex(J('qp_topics.json')); } catch (err) { /* optional */ }
try { e.addBayenat(J('bayenat_index.json')); } catch (err) { /* optional */ }

const env = {
  CF_ACCOUNT: process.env.CF_ACCOUNT, CF_AI_TOKEN: process.env.CF_AI_TOKEN,
  ASSETS: { fetch: async (req) => new Response(fs.readFileSync(path.join(ROOT, 'public', new URL(req.url).pathname))) },
};
const post = (kind) => async (payload) => {
  const r = await fetch(`${API}/api/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: API }, body: JSON.stringify(payload) });
  const j = await r.json();
  if (!j || j.ok === false) { failures++; throw new Error(kind + ' failed'); }
  return j;
};
const dense = async (p) => { const j = await denseSearch({ query: p.query }, env); if (!j.ok) throw new Error('dense'); return j; };
const llm = mode === 'ai' ? { expand: post('expand'), select: post('select') }
  : mode === 'ai_dense' ? { expand: post('expand'), select: post('select'), dense } : null;

const RUN = { lex: 'lex', ai: 'ai', ai_dense: 'aidense', dense: 'dense' }[mode] || mode;
let failures = 0;
const lines = [];
let n = 0;
for (const { qid, q } of questions) {
  let refs = [];
  if (mode === 'dense') refs = (await dense({ query: q })).ids;
  else {
    const res = await e.ask(q, { uiLang: 'ar', llm, llmTimeoutMs: 20000 });
    refs = (res && res.verses ? res.verses : []).filter(v => !v.closestOnly).map(v => v.ref);
    if (res && res.wordHits) refs = refs.concat(res.wordHits.map(i => e.ref(i)));
  }
  const pids = [];
  for (const r of refs) { const [s, a] = String(r).split(':').map(Number); const p = passageOf(s, a); if (p && !pids.includes(p)) pids.push(p); if (pids.length >= 10) break; }
  if (!pids.length) lines.push(`${qid}\tQ0\t-1\t1\t1.0\tmishkat_${mode}`);
  else pids.forEach((p, k) => lines.push(`${qid}\tQ0\t${p}\t${k + 1}\t${(10 - k) / 10}\tmishkat_${mode}`));
  if (++n % 10 === 0) console.error(mode, n, '/', questions.length);
  if (llm) await new Promise(r => setTimeout(r, +(process.env.EVAL_DELAY_MS || 3500)));   // stay under the API rate limit (40/min)
}
fs.mkdirSync(path.join(D, 'runs', split), { recursive: true });
const out = path.join(D, 'runs', split, `Mishkat_${RUN}.tsv`);   // official naming: <team>_<run id 2-9 chars>.tsv
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log('written', out, questions.length, 'questions; failed AI calls:', failures);
