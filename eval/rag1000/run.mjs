// RAG test on 1,000 questions (5 October 2026): the whole answer path of the page (pipeline.mjs) on every question,
// with the AI (Groq free tier first, OpenRouter pay-per-token only on 429/failure, price-capped).
//   CF_ACCOUNT=<id> node eval/rag1000/run.mjs [--from N] [--to N] [--conc 3] [--out rows.jsonl] [--only ids.json]
// Resumable: rows already in the output file are skipped. Each row records the route, the verses, the Sunnah
// section, the short answer (sentence ids + verbatim text) or the encyclopedia's ruling, timings, and:
//   - verbatim: every quoted passage is checked against the source files themselves (Tanzil text, tafsir files,
//     HadeethEnc records) — not against the closed list only;
//   - expectations: the known expectations of the internal sets (same checks as the 1,000-question map).
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { buildQuestions, checkExpect } from './questions.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = new URL(arg('out', 'rows.jsonl'), import.meta.url);
const FROM = +arg('from', 1), TO = +arg('to', 1000), CONC = +arg('conc', 3);
const ONLY = arg('only', null) ? new Set(JSON.parse(readFileSync(arg('only'), 'utf8'))) : null;
const { runQuestion, sources, core, stats, engine: E } = await import('./pipeline.mjs');
const { readJson } = await import('../../tests/load.mjs');

// ------------------------------------------------ verbatim check against the source files
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const TAFSIR = {};
for (const [id, p] of Object.entries(sources)) TAFSIR[id] = p;
function inTafsir(text, idx) {
  const t = norm(text);
  for (const p of Object.values(TAFSIR)) { const arr = p.text || p.texts || p; const s = Array.isArray(arr) ? arr[idx] : null; if (s && norm(s).includes(t)) return true; }
  return false;
}
const HADC = new Map();
function hadithText(lang, id) {
  const idx = readJson(`hadeeth/idx_${lang}.json`), p = idx.ids.indexOf(+id);
  if (p < 0) return '';
  const k = Math.floor(p / idx.chunk), key = lang + k;
  if (!HADC.has(key)) HADC.set(key, readJson(`hadeeth/${lang}/${k}.json`));
  const rec = HADC.get(key)[p % idx.chunk];
  return rec ? norm([rec.text, rec.expl, rec.explanation, rec.title, ...(Array.isArray(rec.hints) ? rec.hints : [])].filter(Boolean).join(' ')) : '';
}
function verbatim(row) {
  const bad = [];
  for (const p of row.points || []) for (const x of p.items) {
    const src = (row._list || []).find(y => y.sid === x.sid);
    let ok = false;
    if (x.kind === 'quran') ok = !!src && norm(core.verses[src.idx]) === norm(x.text);
    else if (x.kind === 'tafsir') ok = !!src && inTafsir(x.text, src.idx);
    else if (x.kind === 'hadith') ok = !!src && hadithText(row.lang, src.id).includes(norm(x.text));
    else ok = !!src && norm(src.text) === norm(x.text);
    if (!ok) bad.push(x.sid);
  }
  return bad;
}

// ------------------------------------------------ Workers AI token (wrangler OAuth, about one hour)
// refreshed by `wrangler whoami` when it expires within 10 minutes (the token lives about one hour)
const WRANGLER = join(homedir(), 'AppData', 'Roaming', 'xdg.config', '.wrangler', 'config', 'default.toml');
let lastCheck = 0;
function refreshToken() {
  if (Date.now() - lastCheck < 60e3) return;
  lastCheck = Date.now();
  let exp = 0;
  try { exp = Date.parse((readFileSync(WRANGLER, 'utf8').match(/expiration_time\s*=\s*"([^"]+)"/) || [])[1] || 0) || 0; } catch (e) { exp = 0; }
  if (exp - Date.now() > 10 * 60e3) return;
  try { execSync('npx wrangler whoami', { stdio: 'ignore', timeout: 90e3, shell: true }); } catch (e) { /* the dense search simply fails → counted */ }
}

// ------------------------------------------------ run
const all = await buildQuestions();
const done = new Set(existsSync(OUT) ? readFileSync(OUT, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l).id) : []);
const todo = all.filter(x => x.id >= FROM && x.id <= TO && !done.has(x.id) && (!ONLY || ONLY.has(x.id)));
console.log(`questions ${all.length} · to run ${todo.length} · already ${done.size} · concurrency ${CONC}`);
let k = 0, n = 0;
const t0 = Date.now();
async function worker() {
  while (k < todo.length) {
    const it = todo[k++];
    refreshToken();
    let row;
    const tq = Date.now();
    try {
      row = await Promise.race([runQuestion(it.q), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 120 s')), 120e3))]);
    } catch (e) { row = { q: it.q, error: String(e && e.message || e), ms: Date.now() - tq }; }
    row = { id: it.id, fam: it.fam, src: it.src, expect: it.expect, ...row };
    row.verbatimBad = row.points ? verbatim(row) : [];
    const f = checkExpect(row); row.expectOk = f ? f.length === 0 : null; row.expectFails = f || [];
    delete row._list;
    appendFileSync(OUT, JSON.stringify(row) + '\n');
    n++;
    const el = (Date.now() - t0) / 1000;
    console.log(`${String(it.id).padStart(4)} [${it.fam}] ${it.q.slice(0, 50)} | ${row.error ? 'ERROR ' + row.error : `${row.type}${row.reason ? '/' + row.reason : ''} by ${row.confirmedBy || '-'} v ${(row.verses || []).slice(0, 3).join(' ')} rag ${row.rag || '-'}${row.fiqh ? ' fiqh ' + row.fiqh.length : ''}`} | ${row.ms} ms | ${n}/${todo.length} ${(el / n).toFixed(1)} s/q`);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
console.log('done', n, 'dense ok', stats.dense, 'dense failed', stats.denseFail, `${((Date.now() - t0) / 60e3).toFixed(1)} min`);
