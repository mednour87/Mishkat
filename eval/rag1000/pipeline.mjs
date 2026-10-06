// The page's whole answer path, run in Node, as close as possible to production (app.js + search-worker.js):
//   engine.ask with the AI (expand + closed-list select + semantic neighbours) → Sunnah section (BM25 over HadeethEnc,
//   AI keeps numbers from a closed list) → «الجواب باختصار» (closed list → /api/answer composer + judge → rag.js rules)
//   or, for a ruling, the Fiqh Encyclopedia of Dorar (search + AI filter of its own results, statement verbatim).
// Differences with the page, stated: semantic neighbours are ranked on the full 1,024-d vectors (the browser ranks the
// 256-d projection: top-10 overlap 8–9/10, see T019); no browser cache between questions.
// Keys from .dev.vars (never printed). Workers AI (bge-m3) through the REST API with the wrangler OAuth token.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadEngine, readJson } from '../../tests/load.mjs';
import { select, expand, pickRelevant } from '../../functions/_lib/selector.js';
import { answer } from '../../functions/_lib/answer.js';
import { fiqhSearch } from '../../functions/_lib/fiqh.js';
import { denseSearch, setVectors } from '../../functions/_lib/dense.js';
import { buildClosedList, applyAnswer, questionTypeOf, forModels } from '../../public/js/rag.js';
import { tokens, expandTokens, isCrisis, guardCheck } from '../../public/js/engine.js';
import { mapQuestion } from '../../public/js/scope.js';
import { routeTool } from '../../public/js/tools.js';
import { athkarQuery, filterAthkar } from '../../public/js/athkar.js';
import { factAnswer } from '../../public/js/facts.js';
import { encycKinds } from '../../public/js/encyc.js';
import { encycSearch } from '../../functions/_lib/encyc.js';
import { suraOfIndex } from '../../public/js/stats.js';

export const env = {};
for (const line of readFileSync(new URL('../../.dev.vars', import.meta.url), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
delete env.SITE_PASS;
if (process.env.FREE_ONLY === '1') for (const k of ['PRIMARY_URL', 'PRIMARY_KEY', 'PRIMARY_MODELS']) delete env[k];

const { engine: E, core, sources } = loadEngine();
E.addTopicIndex(readJson('qp_topics.json'));
E.addLatinIndex(readJson('latin_index.json'));
E.addBayenat(readJson('bayenat_index.json'));
E.addSurahSciences(readJson('surah_sciences.json'));   // as the search worker does (stories, surah information)
export { E as engine, core, sources };

// ------------------------------------------------ semantic neighbours (bge-m3, Workers AI REST)
const WRANGLER = join(homedir(), 'AppData', 'Roaming', 'xdg.config', '.wrangler', 'config', 'default.toml');
const token = () => { try { const m = readFileSync(WRANGLER, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/); return m && m[1]; } catch (e) { return null; } };
const denseEnv = { get CF_AI_TOKEN() { return token(); }, CF_ACCOUNT: process.env.CF_ACCOUNT || '' };
let denseReady = false;
function initDense() {
  if (denseReady || !denseEnv.CF_ACCOUNT) return;
  const buf = readFileSync(new URL('../../public/data/vec/bge_m3_int8.bin', import.meta.url));
  const refs = []; for (const s of core.suras) for (let a = 1; a <= s.ayas; a++) refs[s.first + a - 1] = `${s.n}:${a}`;
  setVectors(new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength), refs);
  denseReady = true;
}
export const stats = { dense: 0, denseFail: 0 };

// ------------------------------------------------ the AI relays of the page
function makeLLM() {
  const KW = new Map();
  const llm = {
    expand: async (p) => { const j = await expand(p, env); if (!j || !j.ok) throw new Error('AI'); KW.set(String(p.query), j.keywords); return j; },
    select: async (p) => { const j = await select(p, env); if (!j || !j.ok) throw new Error('AI'); return j; },
  };
  initDense();
  if (denseReady) llm.dense = async (p) => { try { const j = await denseSearch({ query: p.query }, denseEnv); if (!j.ok) throw new Error('dense'); stats.dense++; return j; } catch (e) { stats.denseFail++; throw e; } };
  return { llm, KW };
}

// ------------------------------------------------ Sunnah section (search-worker.js sunnahFor)
const HAD = {};
function hadIndex(lang) {
  if (HAD[lang]) return HAD[lang];
  const d = readJson(`hadeeth/idx_${lang}.json`);
  const post = new Map(), len = new Float32Array(d.doc.length);
  let total = 0;
  d.doc.forEach((doc, i) => {
    const ts = tokens(doc, lang); len[i] = ts.length; total += ts.length;
    const tf = new Map(); for (const t of ts) tf.set(t, (tf.get(t) || 0) + 1);
    for (const [t, c] of tf) { let p = post.get(t); if (!p) post.set(t, (p = [])); p.push(i, c); }
  });
  return (HAD[lang] = { ...d, post, len, avg: total / d.doc.length || 1, N: d.doc.length });
}
async function sunnahFor(res, KW) {
  if (!res || !['topic', 'term', 'notfound'].includes(res.type)) return null;   // T122: notfound too
  if (res.meta && res.meta.route === 'word') return null;
  const lang = res.lang === 'en' ? 'en' : 'ar';
  const H = hadIndex(lang);
  const q = String(res.query || '');
  const base = [...new Set(tokens(q, lang))];
  if (!base.length) return null;
  const kw = (Array.isArray((KW.get(q) || {})[lang]) ? KW.get(q)[lang] : []).map(String).slice(0, 6);
  const groups = base.map(t => [t, ...new Set(expandTokens([t], lang, lang))]);
  const extra = [...new Set(kw.flatMap(w => tokens(w, lang)))];
  const acc = new Map(), cover = new Map();
  const score = (toks, w, gi) => {
    for (const t of new Set(toks)) {
      const p = H.post.get(t); if (!p) continue;
      const df = p.length / 2, idf = Math.log(1 + (H.N - df + 0.5) / (df + 0.5));
      for (let k = 0; k < p.length; k += 2) {
        const d = p[k], tf = p[k + 1];
        acc.set(d, (acc.get(d) || 0) + w * idf * tf * 2.2 / (tf + 1.2 * (0.25 + 0.75 * H.len[d] / H.avg)));
        if (gi != null) { let c = cover.get(d); if (!c) cover.set(d, (c = new Set())); c.add(gi); }
      }
    }
  };
  groups.forEach((g, gi) => score(g, 1, gi));
  if (extra.length) score(extra, 0.5, null);
  const ranked = [...acc.entries()].map(([d, s]) => ({ d, s, cov: (cover.get(d) || new Set()).size / groups.length }))
    .sort((a, b) => b.cov - a.cov || b.s - a.s).slice(0, 10);
  if (!ranked.length) return null;
  const keep = await pickRelevant(q, ranked.map(r => H.doc[r.d].slice(0, 300)), env, { max: 3, what: 'hadith' }).catch(() => null);
  if (keep) return { by: 'ai', ids: [...new Set(keep)].slice(0, 3).map(i => H.ids[ranked[i].d]) };
  const strict = ranked.filter(r => r.cov === 1).slice(0, 2);
  return strict.length ? { by: 'search', ids: strict.map(r => H.ids[r.d]) } : null;
}
const HCH = new Map();
function hadithsById(lang, ids) {
  const H = hadIndex(lang), out = [];
  for (const id of ids) {
    const p = H.ids.indexOf(+id); if (p < 0) continue;
    const k = Math.floor(p / H.chunk), key = lang + k;
    if (!HCH.has(key)) HCH.set(key, readJson(`hadeeth/${lang}/${k}.json`));
    const rec = HCH.get(key)[p % H.chunk];
    if (rec && rec.id === +id) out.push({ ...rec, lang });
  }
  return out;
}

// ------------------------------------------------ one question
const STORY_Q = /^(قصة|قصه)\s|\bstory of\b/i;
const GOOD = /صحيح|حسن|sahih|hasan|authentic|good/i, WEAK = /ضعيف|موضوع|منكر|weak|fabricated/i;
const isRulingRes = (res) => res.type === 'abstain' && res.reason === 'ruling';

// app.js run(): the question is mapped before any search — the clock, an off-topic request, a feature of the site,
// or a practical tool (adhkar, prayer, calendar, khatma…) — and only then sent to the engine
let ATHKAR = null;
// T122: verified answers (app.js run → worker op 'fact'), before the map of the question
let FACT_CTX = null;
export function factFor(q) {
  FACT_CTX = FACT_CTX || { core, plain: readJson('search_ar.json'), meta: readJson('mushaf_meta.json'), suraOf: suraOfIndex(core) };
  return factAnswer(q, { ...FACT_CTX, lang: /[؀-ۿ]/.test(q) ? 'ar' : 'en' });
}
export function preRoute(q) {
  if (isCrisis(q)) return null;
  const f = factFor(q);
  if (f) return { type: 'fact', fact: f.id, answer: f.answer, factVerses: f.verses.slice(0, 10), hadiths: f.hadiths };
  const m = mapQuestion(q);
  if (m && ['now', 'offtopic', 'feature'].includes(m.kind)) return { type: 'card', card: m.kind, topic: m.topic || m.feature || null };
  const tool = routeTool(q, { guard: guardCheck });
  if (!tool) return null;
  const out = { type: 'tool', tool: tool.tool, args: tool.args || {} };
  if (tool.tool === 'athkar') {
    ATHKAR = ATHKAR || readJson('athkar.json').items;
    const list = filterAthkar(ATHKAR, athkarQuery(tool.args && tool.args.q || q));
    out.athkar = list.slice(0, 3).map(x => ({ id: x.id, title: String(x.title || x.chapter || '').slice(0, 120), text: String(x.text || '').slice(0, 220) }));
  }
  return out;
}

export async function runQuestion(q, { uiLang = 'ar' } = {}) {
  const t0 = Date.now();
  const pre = preRoute(q);
  if (pre) return { q, lang: /[؀-ۿ]/.test(q) ? 'ar' : 'en', ...pre, reason: null, verses: [], aiVerses: [], route: pre.type, ms: Date.now() - t0 };
  const { llm, KW } = makeLLM();
  const r = await E.ask(q, { uiLang, llm });
  const L = r.lang === 'en' ? 'en' : 'ar';
  const row = { q, lang: L, type: r.type, reason: r.reason || null, verdict: r.verdict || null, level: r.level || null, pack: r.pack || null,
    sensitive: !!r.sensitive, polemic: !!r.polemic, crisis: !!r.crisis, blood: !!r.blood, confirmedBy: r.confirmedBy || null,
    route: (r.meta && r.meta.route) || r.type, dense: r.meta ? r.meta.dense || 0 : 0, llm: r.meta && r.meta.llm ? { model: r.meta.llm.model || null, used: !!r.meta.llm.used, stage: r.meta.llm.stage || null, error: r.meta.llm.error || null, skipped: r.meta.llm.skipped || null, candidates: r.meta.llm.candidates || null } : null,
    verses: (r.verses || []).filter(v => !v.closestOnly).map(v => v.ref).slice(0, 10),
    aiVerses: (r.verses || []).filter(v => v.ai).map(v => v.ref).slice(0, 10),
    contextPack: (r.answer || []).filter(a => a.kind === 'quote' && a.role === 'context').map(a => a.ref),
    msEngine: Date.now() - t0 };
  row.qtype = questionTypeOf({ ...r, query: q });
  // ruling: the Fiqh Encyclopedia (app.js loadFiqh) — AI Arabic keywords for a non-Arabic question
  if (isRulingRes(r)) {
    let kw = [];
    const k = KW.get(q);
    if (k) kw = (Array.isArray(k.fatwa) && k.fatwa.length ? k.fatwa : Array.isArray(k.ar) ? k.ar : []).map(String).filter(w => /^[؀-ۿ\s_]+$/.test(w)).map(w => w.replace(/_/g, ' ')).slice(0, 4);
    else { /* the page asks the AI for the keywords of every ruling question (worker op 'kw'), Arabic too */ try { const j = await expand({ query: q, lang: L }, env); const kk = j && j.keywords; kw = (kk && Array.isArray(kk.fatwa) && kk.fatwa.length ? kk.fatwa : kk && Array.isArray(kk.ar) ? kk.ar : []).map(String).filter(w => /^[؀-ۿ\s_]+$/.test(w)).map(w => w.replace(/_/g, ' ')).slice(0, 4); } catch (e) { kw = []; } }
    row.fiqhKw = kw;
    if (kw.length || /[؀-ۿ]/.test(q)) {
      const s = await fiqhSearch(kw.length ? { q, kw } : { q }, env).catch(e => ({ ok: false, error: String(e.message || e) }));
      row.fiqhBy = s && s.by || null;
      if (s && s.ok && s.items && s.items.length) {
        const docs = (await Promise.all(s.items.slice(0, 4).map(x => fiqhSearch(kw.length ? { id: +x.id, q, kw } : { id: +x.id, q }, env).catch(() => null)))).filter(f => f && f.ok).filter((f, k, a) => a.findIndex(g => g.id === f.id) === k).slice(0, 2);
        row.fiqh = docs.map(f => ({ id: f.id, title: f.title, path: f.path, consensus: f.consensus || null, ruling: (f.ruling || []).join(' ').slice(0, 500) }));
      } else row.fiqh = []; row.fiqhError = s && !s.ok ? s.error || 'error' : null;
    } else row.fiqh = null;      // English without AI keywords: the page says the AI is needed
  }
  // Sunnah + short answer (app.js render → loadSunnah → loadRag)
  // T122: the approved encyclopedias (app.js loadEncyc): creed and history, also when no verse answers
  const kinds = encycKinds(r, q);
  if (kinds.length) {
    // the page asks the worker for the AI's Arabic terms (op 'kw' → expand when the search did not keep them)
    let k = KW.get(q);
    if (!k) { try { const j = await expand({ query: q, lang: r.lang === 'en' ? 'en' : 'ar' }, env); k = j && j.keywords; } catch (e) { k = null; } }
    const kw = k ? (Array.isArray(k.fatwa) && k.fatwa.length ? k.fatwa : Array.isArray(k.ar) ? k.ar : []).map(String).filter(w => /^[؀-ۿ\s_]+$/.test(w)).map(w => w.replace(/_/g, ' ')).slice(0, 4) : [];
    row.encyc = [];
    for (const enc of kinds) {
      const j = await encycSearch({ enc, q, ...(kw.length ? { kw } : {}) }, env).catch(e => ({ ok: false, error: String(e.message || e) }));
      if (!j || !j.ok || !j.items || !j.items.length) { row.encyc.push({ enc, items: [], error: j && j.error || null }); continue; }
      if (enc === 'history') { row.encyc.push({ enc, by: j.by, items: j.items.map(x => ({ id: x.id, title: x.title, hijri: x.hijri })) }); continue; }
      const docs = [];
      for (const x of j.items.slice(0, 4)) { const d = await encycSearch({ enc, q, id: +x.id, ...(kw.length ? { kw } : {}) }, env).catch(() => null); if (d && d.ok && d.ruling && d.ruling.length && !docs.some(o => o.id === d.id)) docs.push({ id: d.id, title: d.title, first: d.ruling[0].slice(0, 160) }); if (docs.length >= 2) break; }
      row.encyc.push({ enc, by: j.by, items: docs });
    }
  }
  if (['topic', 'term', 'notfound'].includes(r.type)) {
    const sun = r.polemic || r.pack === 'violence' ? null : await sunnahFor({ ...r, query: q }, KW).catch(() => null);   // app.js loadSunnah
    row.hadiths = sun ? sun.ids : [];
    row.hadithBy = sun ? sun.by : null;
    const wanted = !r.crisis && !isRulingRes(r) && (r.confirmedBy === 'ai' || !!r.pack) && !STORY_Q.test(q);
    if (wanted && (r.confirmedBy === 'ai' || (r.pack && r.pack !== 'crisis'))) {
      const ctxIdx = new Set((r.answer || []).filter(a => a.kind === 'quote' && a.role === 'context').map(a => a.idx));
      const vs = (r.verses || []).filter(v => v.ai);
      const ordered = vs.filter(v => !v.aiRelated).concat(vs.filter(v => v.aiRelated));
      const ctx = (r.verses || []).filter(v => ctxIdx.has(v.idx) && !v.ai).map(v => ({ ...v, ctx: true }));
      const same = (i, c) => { const o = i >= 0 && i < core.verses.length && E.suraOf[i] === E.suraOf[c.idx] ? E.cardOf(L, i, 'answer') : null; return !!(o && o.text === c.text); };
      const verses = ctx.concat(ordered).map(v => { const c = E.cardOf(L, v.idx, 'answer'); return c && { idx: v.idx, ref: E.ref(v.idx), direct: !v.aiRelated, ctx: !!v.ctx, verseText: core.verses[v.idx], text: c.text, source: c.source, sourceTitle: c.sourceTitle, grouped: same(v.idx - 1, { ...c, idx: v.idx }) || same(v.idx + 1, { ...c, idx: v.idx }) }; }).filter(Boolean);
      const hadiths = hadithsById(L, row.hadiths).filter(h => GOOD.test(h.grade || '') && !WEAK.test(h.grade || ''));
      const qtype = questionTypeOf({ ...r, query: q });
      const list = buildClosedList({ verses, hadiths, qtype });
      row.listSize = list.length;
      if (list.length) {
        const out = await answer({ query: q, lang: L, qtype, sentences: forModels(list) }, env).catch(e => ({ ok: false, error: String(e.message || e) }));
        const b = applyAnswer(list, out, q, qtype, { violence: !!(r.polemic || r.pack === 'violence'), balanced: list.some(x => x.ctx) });
        row.rag = b ? 'shown' : out && out.ok ? 'no-brief' : 'error:' + (out && out.error);
        row.judge = out && out.judge || null;
        row.points = b ? b.points.map(p => ({ concept: p.concept, items: p.items.map(x => ({ sid: x.sid, kind: x.kind, ref: x.ref || null, id: x.id || null, text: x.text })) })) : [];
        row.uncovered = b ? b.uncovered.map(u => u.concept) : [];
        row.dropped = b ? b.dropped : [];
        row._list = list.map(x => ({ sid: x.sid, kind: x.kind, idx: x.idx, id: x.id, text: x.text }));
      } else row.rag = 'empty-list';
    } else row.rag = r.crisis ? 'crisis' : STORY_Q.test(q) ? 'story' : 'not-wanted';
  }
  row.ms = Date.now() - t0;
  return row;
}
