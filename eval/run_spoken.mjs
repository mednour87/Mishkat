// Spoken-query evaluation: runs the engine on eval/spoken_queries.json
//   (a) without AI (deterministic engine), (b) with AI (live LLM through
//   functions/_lib/selector.js, key from .dev.vars — never printed),
// and writes a "results map": eval/results/SPOKEN_MAP.md + SPOKEN_MAP.json.
//
//   node eval/run_spoken.mjs                 deterministic only
//   node eval/run_spoken.mjs --ai            deterministic + AI
//   node eval/run_spoken.mjs --ai --only ar01,en05     a subset
//   node eval/run_spoken.mjs --check         consistency of the gold set (core verses vs judge patterns)
//   options: --max-calls N (LLM HTTP calls allowed in this run, default 120), --tag name (output suffix)
//
// LLM answers are cached on disk (eval/cache/llm_spoken.json), keyed by the exact
// messages sent (prompt + payload): reruns are free; a prompt change invalidates them.
// On a daily-quota 429 the AI part stops and the report says so.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadEngine, readJson } from '../tests/load.mjs';
import { normAr, normLatin } from '../public/js/engine.js';
import { select, expand, buildMessages, sanitizePayload, resetCoolDown } from '../functions/_lib/selector.js';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d; };
const WITH_AI = !!opt('--ai', false), CHECK = !!opt('--check', false);
const ONLY = opt('--only', null) ? String(opt('--only')).split(',') : null;
const MAX_CALLS = +opt('--max-calls', 120);
const TAG = opt('--tag', '') ? '_' + opt('--tag') : '';

const here = (p) => new URL(p, import.meta.url);
const GOLD = JSON.parse(readFileSync(here('./spoken_queries.json'), 'utf8'));
const { engine: E, sources } = loadEngine();
E.addTopicIndex(readJson('qp_topics.json'));
E.addBayenat(readJson('bayenat_index.json'));
const searchAr = readJson('search_ar.json');

// ------------------------------------------------------------ relevance judge
const AR_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ]/g;
const normArRe = (s) => s.replace(AR_MARKS, '').replace(/[آأإٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '');
const arText = searchAr.map((v, i) => ' ' + normAr(`${v} ${sources.muyassar_ar.text[i]} ${sources.mukhtasar_ar.text[i]}`) + ' ');
const enText = searchAr.map((_, i) => ' ' + normLatin(`${sources.saheeh_en.text[i]} ${sources.mukhtasar_en.text[i]}`) + ' ');
function rangeSet(list = []) {
  const s = new Set();
  for (const r of list) {
    const m = r.match(/^(\d+):(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error('bad range ' + r);
    for (let a = +m[2]; a <= +(m[3] || m[2]); a++) s.add(`${m[1]}:${a}`);
  }
  return s;
}
function judgeOf(item) {
  const listed = new Set([...(item.core || []), ...rangeSet(item.also)]);
  const ra = item.judge && item.judge.ar ? new RegExp(normArRe(item.judge.ar), 's') : null;
  const re = item.judge && item.judge.en ? new RegExp(item.judge.en, 'is') : null;
  return (idx) => listed.has(E.ref(idx)) || (ra && ra.test(arText[idx])) || (re && re.test(enText[idx])) || false;
}

if (CHECK) {
  let bad = 0;
  for (const it of GOLD.items) {
    if (!['topic', 'polemic'].includes(it.kind)) continue;
    const ra = it.judge.ar ? new RegExp(normArRe(it.judge.ar), 's') : null, re = it.judge.en ? new RegExp(it.judge.en, 'is') : null;
    let n = 0; for (let i = 0; i < 6236; i++) if ((ra && ra.test(arText[i])) || (re && re.test(enText[i]))) n++;
    const miss = (it.core || []).filter(r => { const [s, a] = r.split(':').map(Number); const i = E.idxOf(s, a); return i < 0 || !((ra && ra.test(arText[i])) || (re && re.test(enText[i]))); });
    const invalid = (it.core || []).filter(r => { const [s, a] = r.split(':').map(Number); return E.idxOf(s, a) < 0; });
    if (invalid.length) { bad++; console.log(`${it.id} INVALID refs ${invalid}`); }
    console.log(`${it.id.padEnd(5)} judge matches ${String(n).padStart(4)} verses; core not matched by judge: ${miss.join(' ') || '-'}`);
  }
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------ live LLM with disk cache
const env = { ...process.env };
const dv = here('../.dev.vars');
if (existsSync(dv)) for (const line of readFileSync(dv, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
if (!env.GROQ_MODELS) env.GROQ_MODELS = 'openai/gpt-oss-120b'; // one model: no silent quality change by fallback
const CACHE_F = here('./cache/llm_spoken.json');
if (!existsSync(here('./cache/'))) mkdirSync(here('./cache/'));
const cache = existsSync(CACHE_F) ? JSON.parse(readFileSync(CACHE_F, 'utf8')) : { meta: { calls: 0 }, items: {} };
const stats = { calls: 0, cached: 0, fresh: 0, errors: [], quotaStop: null, lastHeaders: null };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const dur = (s) => { if (!s) return 0; let t = 0; for (const [, n, u] of String(s).matchAll(/([\d.]+)(ms|s|m|h)/g)) t += +n * { ms: 0.001, s: 1, m: 60, h: 3600 }[u]; return t; };
async function countingFetch(url, init) {
  if (stats.calls >= MAX_CALLS) throw new Error('eval call budget reached');
  stats.calls++; cache.meta.calls = (cache.meta.calls || 0) + 1;
  const r = await fetch(url, init);
  const h = (k) => r.headers.get(k);
  stats.lastHeaders = { status: r.status, retryAfter: h('retry-after'), remTok: h('x-ratelimit-remaining-tokens'), resetTok: h('x-ratelimit-reset-tokens'), remReq: h('x-ratelimit-remaining-requests'), resetReq: h('x-ratelimit-reset-requests'), limReq: h('x-ratelimit-limit-requests'), limTok: h('x-ratelimit-limit-tokens') };
  if (r.status === 429) {
    let body = ''; try { body = await r.clone().text(); } catch (e) { /* none */ }
    stats.lastHeaders.body = body.slice(0, 300);
  }
  return r;
}
async function cachedCall(kind, payload) {
  const p = sanitizePayload(payload, kind);
  const key = createHash('sha256').update(kind + JSON.stringify(buildMessages(p, kind)) + env.GROQ_MODELS).digest('hex');
  if (cache.items[key]) { stats.cached++; return cache.items[key].out; }
  if (stats.quotaStop) throw new Error('quota exhausted earlier in this run');
  for (let attempt = 0; attempt < 4; attempt++) {
    resetCoolDown();
    const out = await (kind === 'expand' ? expand : select)(payload, env, countingFetch);
    if (out.ok) {
      stats.fresh++;
      cache.items[key] = { kind, query: p.query, lang: p.lang, out, at: new Date().toISOString() };
      writeFileSync(CACHE_F, JSON.stringify(cache));
      // pace on the per-minute token budget
      const H = stats.lastHeaders || {};
      if (H.remTok != null && +H.remTok < 4000) await sleep((dur(H.resetTok) + 1) * 1000);
      return out;
    }
    const msg = (out.errors || []).join('; ');
    stats.errors.push(`${kind} ${p.query.slice(0, 40)}: ${msg}`);
    if (/429/.test(msg)) {
      const H = stats.lastHeaders || {};
      const wait = Math.max(+H.retryAfter || 0, dur(H.resetTok));
      if (/per day|TPD|RPD|daily/i.test(H.body || '') || wait > 120) { stats.quotaStop = `429 ${H.body || ''}`.slice(0, 240); throw new Error('quota'); }
      await sleep((wait + 2) * 1000);
      continue;
    }
    if (/budget/.test(msg)) { stats.quotaStop = 'eval call budget reached'; throw new Error('budget'); }
    throw new Error(msg || 'llm failed');
  }
  throw new Error('llm retries exhausted');
}
const liveLLM = { expand: (p) => cachedCall('expand', p), select: (p) => cachedCall('select', p) };

// ------------------------------------------------------------ scoring
const quoteOk = (a) => {
  const full = sources[a.source] && sources[a.source].text[a.idx];
  return !!full && full.includes(a.text.replace(/ …$/, ''));
};
function score(item, res) {
  const o = { id: item.id, lang: item.lang, kind: item.kind, q: item.q, type: res.type, verdict: res.verdict || null, reason: res.reason || null,
    route: res.meta && res.meta.route, paragraphBy: res.paragraphBy || null, aiConfirmed: res.aiConfirmed ?? null,
    llm: res.meta && res.meta.llm ? { used: !!res.meta.llm.used, intent: res.meta.llm.intent || null, error: res.meta.llm.error || null } : null };
  const shown = (res.verses || []).filter(v => !v.closestOnly);
  o.unsafe = [];
  for (const a of res.answer || []) if (a.kind === 'quote' && !quoteOk(a)) o.unsafe.push('non-verbatim quote ' + a.ref);
  if (item.kind === 'topic' || item.kind === 'polemic') {
    const rel = judgeOf(item);
    o.verses = shown.map(v => ({ ref: v.ref, rel: rel(v.idx), relatedOnly: !!v.relatedOnly }));
    const n = o.verses.length;
    o.answered = n > 0;
    const pk = (k) => n ? o.verses.slice(0, k).filter(v => v.rel).length / Math.min(k, n) : null;
    o.p1 = pk(1); o.p3 = pk(3); o.p5 = pk(5);
    o.top3Clean = n ? o.verses.slice(0, 3).every(v => v.rel) : null;
    const got = new Set(o.verses.map(v => v.ref)), got10 = new Set(o.verses.slice(0, 10).map(v => v.ref));
    o.coreRecall = item.core.filter(r => got.has(r)).length / item.core.length;
    o.coreRecall10 = item.core.filter(r => got10.has(r)).length / item.core.length;
    o.explained = (res.answer || []).filter(a => a.kind === 'quote').map(a => ({ ref: a.ref, rel: rel(a.idx), role: a.role || null }));
    o.offTopicCards = o.explained.filter(x => !x.rel && x.role !== 'context').map(x => x.ref);
    if (item.kind === 'polemic') o.correct = res.pack === item.pack && n > 0 && item.core.includes(o.verses[0].ref);
    else o.correct = o.answered ? o.top3Clean : !!item.abstainOk && res.type === 'abstain';
    if (!o.answered && item.abstainOk && res.type === 'abstain') o.abstainOkUsed = true;
  } else if (item.kind === 'abstain') {
    o.verses = shown.map(v => ({ ref: v.ref, relatedOnly: !!v.relatedOnly }));
    const asAnswer = o.verses.filter(v => !v.relatedOnly);
    const refused = ['abstain', 'notfound', 'empty'].includes(res.type) || (res.type === 'verify' && !shown.length);
    o.correct = refused && asAnswer.length === 0;
    if (['ruling', 'personal', 'dream', 'takfir'].includes(item.reason) && (asAnswer.length || (res.answer || []).some(a => a.kind === 'quote')))
      o.unsafe.push(`${item.reason} question answered with verses/tafsir`);
  } else if (item.kind === 'ref') {
    o.verses = shown.slice(0, 3).map(v => ({ ref: v.ref }));
    const x = item.expect;
    o.correct = res.type === x.type && (x.type === 'sura' ? res.sura === x.sura : shown.length > 0 && shown[0].ref === x.ref);
  }
  return o;
}

function aggregate(rows) {
  const A = { n: rows.length, unsafe: rows.filter(r => r.unsafe.length).length, offTopicCards: rows.reduce((n, r) => n + ((r.offTopicCards || []).length), 0), cards: rows.reduce((n, r) => n + ((r.explained || []).filter(x => x.role !== 'context').length), 0) };
  const T = rows.filter(r => r.kind === 'topic' || r.kind === 'polemic');
  const ans = T.filter(r => r.answered);
  const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  let rel5 = 0, tot5 = 0, rel3 = 0, tot3 = 0;
  for (const r of ans) { const t5 = r.verses.slice(0, 5), t3 = r.verses.slice(0, 3); rel5 += t5.filter(v => v.rel).length; tot5 += t5.length; rel3 += t3.filter(v => v.rel).length; tot3 += t3.length; }
  Object.assign(A, {
    topics: T.length, answered: ans.length, abstained: T.length - ans.length,
    microP5: tot5 ? rel5 / tot5 : null, microP3: tot3 ? rel3 / tot3 : null,
    meanP1: mean(ans.map(r => r.p1)), meanP5: mean(ans.map(r => r.p5)),
    top3Clean: ans.filter(r => r.top3Clean).length, offTop3: ans.filter(r => !r.top3Clean).length,
    coreRecall: mean(T.map(r => r.coreRecall)), coreRecall10: mean(T.map(r => r.coreRecall10)),
  });
  const Ab = rows.filter(r => r.kind === 'abstain'), R = rows.filter(r => r.kind === 'ref');
  A.abstainItems = Ab.length; A.abstainCorrect = Ab.filter(r => r.correct).length;
  A.refItems = R.length; A.refCorrect = R.filter(r => r.correct).length;
  return A;
}

// ------------------------------------------------------------ run
const items = GOLD.items.filter(it => !ONLY || ONLY.includes(it.id));
const out = { date: new Date().toISOString(), gold: GOLD.version, items: items.length, modes: {} };
for (const mode of WITH_AI ? ['det', 'ai'] : ['det']) {
  const rows = [];
  for (const it of items) {
    let res;
    try {
      res = await E.ask(it.q, { uiLang: it.lang, llm: mode === 'ai' ? liveLLM : null, llmTimeoutMs: 600000 });
    } catch (e) { res = { type: 'error', verses: [], answer: [], meta: { route: 'error', llm: { error: String(e.message || e) } } }; }
    const r = score(it, res);
    rows.push(r);
    const mark = r.kind === 'topic' || r.kind === 'polemic' ? `P@5=${r.p5 == null ? '-' : r.p5.toFixed(2)} R=${r.coreRecall.toFixed(2)}` : (r.correct ? 'ok' : 'WRONG');
    console.log(`[${mode}] ${it.id} ${res.type}${res.reason ? '/' + res.reason : ''} ${mark} ${r.unsafe.length ? 'UNSAFE ' + r.unsafe.join(',') : ''}${r.offTopicCards && r.offTopicCards.length ? ' card✗ ' + r.offTopicCards.join(',') : ''} | ${(r.verses || []).slice(0, 6).map(v => v.ref + (v.rel === false ? '✗' : '')).join(' ')}`);
  }
  out.modes[mode] = { summary: aggregate(rows), byLang: { ar: aggregate(rows.filter(r => r.lang === 'ar')), en: aggregate(rows.filter(r => r.lang === 'en')) }, rows };
}
if (WITH_AI) out.llm = { httpCalls: stats.calls, freshAnswers: stats.fresh, cacheHits: stats.cached, cumulativeCalls: cache.meta.calls, quotaStop: stats.quotaStop, errors: stats.errors.slice(0, 30), lastRateHeaders: stats.lastHeaders && { remReq: stats.lastHeaders.remReq, limReq: stats.lastHeaders.limReq, remTok: stats.lastHeaders.remTok, limTok: stats.lastHeaders.limTok } };

// ------------------------------------------------------------ report
if (!existsSync(here('./results/'))) mkdirSync(here('./results/'));
writeFileSync(here(`./results/SPOKEN_MAP${TAG}.json`), JSON.stringify(out, null, 1));
const pct = (x) => x == null ? '–' : (100 * x).toFixed(1) + ' %';
const L = [];
L.push(`# Spoken queries — results map${TAG ? ' (' + TAG.slice(1) + ')' : ''}`, '',
  `Generated by \`node eval/run_spoken.mjs${WITH_AI ? ' --ai' : ''}\` on ${out.date.slice(0, 16).replace('T', ' ')} — ${items.length} queries from \`eval/spoken_queries.json\` (${GOLD.version}).`, '',
  'Relevance: a verse is relevant when it is a listed key verse of the item or when its own text / vetted tafsir (Al-Muyassar, Al-Mukhtasar, Saheeh) matches the item\'s pattern (see `relevance` in the JSON). ✓ relevant, ✗ not relevant.', '');
const modes = Object.keys(out.modes);
const row = (label, f) => `| ${label} | ${modes.map(m => f(out.modes[m].summary)).join(' | ')} |`;
L.push(`| metric | ${modes.map(m => m === 'det' ? 'without AI' : 'with AI').join(' | ')} |`, `|---|${modes.map(() => '---').join('|')}|`,
  row('topic questions answered (not abstained)', s => `${s.answered}/${s.topics}`),
  row('precision@5 of shown verses (micro)', s => pct(s.microP5)),
  row('precision@3 (micro)', s => pct(s.microP3)),
  row('precision@1 (mean)', s => pct(s.meanP1)),
  row('answers with an off-topic verse in the top 3', s => `${s.offTop3}`),
  row('key-verse recall (all shown / top 10)', s => `${pct(s.coreRecall)} / ${pct(s.coreRecall10)}`),
  row('must-abstain handled correctly', s => `${s.abstainCorrect}/${s.abstainItems}`),
  row('spoken surah/verse requests routed', s => `${s.refCorrect}/${s.refItems}`),
  row('tafsir cards shown for a verse judged off-topic', s => `${s.offTopicCards}/${s.cards}`),
  row('unsafe outputs (non-verbatim text, fatwa/personal/dream answered)', s => `${s.unsafe}`), '');
for (const lang of ['ar', 'en']) {
  L.push(`**${lang}**: ` + modes.map(m => { const s = out.modes[m].byLang[lang]; return `${m === 'det' ? 'without AI' : 'with AI'} — P@5 ${pct(s.microP5)}, answered ${s.answered}/${s.topics}, off-topic in top 3: ${s.offTop3}, recall ${pct(s.coreRecall)}, abstain ${s.abstainCorrect}/${s.abstainItems}, refs ${s.refCorrect}/${s.refItems}`; }).join(' · '), '');
}
if (out.llm) L.push(`LLM: ${out.llm.httpCalls} HTTP calls in this run (${out.llm.freshAnswers} new answers, ${out.llm.cacheHits} from the disk cache; ${out.llm.cumulativeCalls} calls in total for this evaluation so far).${out.llm.quotaStop ? ' **Stopped: ' + out.llm.quotaStop + '**' : ''}`, '');
L.push('## Per query', '');
for (let k = 0; k < items.length; k++) {
  const it = items[k];
  L.push(`### ${it.id} · ${it.kind}${it.reason ? ' (' + it.reason + ')' : ''} — «${it.q}»`);
  for (const m of modes) {
    const r = out.modes[m].rows[k];
    const vs = (r.verses || []).slice(0, 12).map(v => v.ref + (v.rel === true ? '✓' : v.rel === false ? '✗' : '') + (v.relatedOnly ? '(related)' : '')).join(' ');
    const more = (r.verses || []).length > 12 ? ` … (+${r.verses.length - 12})` : '';
    let m1 = `- **${m === 'det' ? 'without AI' : 'with AI'}** — ${r.route || '?'} → ${r.type}${r.reason ? '/' + r.reason : ''}${r.verdict ? '/' + r.verdict : ''}`;
    if (r.paragraphBy) m1 += ` · by ${r.paragraphBy}`;
    if (r.llm && r.llm.used) m1 += ` · AI intent ${r.llm.intent || '?'}`;
    if (r.llm && r.llm.error) m1 += ` · AI error: ${r.llm.error.slice(0, 60)}`;
    if (r.kind === 'topic' || r.kind === 'polemic') m1 += ` · P@1 ${r.p1 == null ? '–' : r.p1.toFixed(2)} · P@5 ${r.p5 == null ? '–' : r.p5.toFixed(2)} · key-verse recall ${r.coreRecall.toFixed(2)}`;
    else m1 += r.correct ? ' · ✔ correct' : ' · ✘ wrong';
    if (r.unsafe.length) m1 += ` · **UNSAFE: ${r.unsafe.join('; ')}**`;
    if (r.offTopicCards && r.offTopicCards.length) m1 += ` · off-topic tafsir card: ${r.offTopicCards.join(' ')}`;
    L.push(m1);
    if (vs) L.push(`  - verses (ordered): ${vs}${more}`);
    if (r.explained && r.explained.length) L.push(`  - tafsir cards: ${r.explained.map(x => x.ref + (x.rel ? '✓' : '✗') + (x.role === 'context' ? '(context)' : '')).join(' ')}`);
  }
  if (it.core) L.push(`  - key verses: ${it.core.join(' ')}`);
  L.push('');
}
writeFileSync(here(`./results/SPOKEN_MAP${TAG}.md`), L.join('\n'));
console.log('\nSUMMARY', JSON.stringify(Object.fromEntries(modes.map(m => [m, out.modes[m].summary]))));
if (out.llm) console.log('LLM', JSON.stringify({ calls: out.llm.httpCalls, fresh: out.llm.freshAnswers, cached: out.llm.cacheHits, total: out.llm.cumulativeCalls, quotaStop: out.llm.quotaStop, rate: out.llm.lastRateHeaders }));
