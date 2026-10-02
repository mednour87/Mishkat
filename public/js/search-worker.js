// The search engine in a Web Worker: building the indexes (several hundred ms) and running a
// query never freeze the page, the galaxy or the recitation. The page keeps a light copy of
// the engine for display only (verse texts, tafsir texts, references).
// Messages in : {id, op:'ask', query, opts} · {id, op:'warm', lang} · {id, op:'llm-reply', ok, value|error}
// Messages out: {id, ok, value|error} · {op:'llm', id, kind, payload} (the page calls the AI API,
// with its cache and circuit breaker, and replies).
import { createEngine, detectLang, SOURCES_NEEDED, tokens, expandTokens } from './engine.js';

const getJSON = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };
let engineP = null, latinP = null;
const loading = new Map();

function engine() {
  if (!engineP) engineP = (async () => {
    const [core, searchAr] = await Promise.all([getJSON('../data/core.json'), getJSON('../data/search_ar.json')]);
    const e = createEngine({ core, searchAr });
    await Promise.all([
      getJSON('../data/qp_topics.json').then(d => e.addTopicIndex(d)).catch(() => {}),
      getJSON('../data/bayenat_index.json').then(d => e.addBayenat(d)).catch(() => {}),
    ]);
    return e;
  })();
  return engineP;
}
async function ensureSources(e, lang) {
  await Promise.all((SOURCES_NEEDED[lang] || []).map(id => {
    if (e.hasSource(id)) return null;
    if (!loading.has(id)) loading.set(id, getJSON(`../data/tafsir_${id}.json`).then(p => e.addSource(id, p)));
    return loading.get(id);
  }));
}

// the AI layer lives in the page (cache, live API, circuit breaker); calls are relayed
let llmSeq = 0;
const llmWait = new Map();
const relay = (kind) => (payload) => new Promise((resolve, reject) => {
  const id = 'l' + (++llmSeq);
  llmWait.set(id, { resolve, reject });
  self.postMessage({ op: 'llm', id, kind, payload });
});
// the AI's search keywords for the last questions stay here (search only; never shown, never in a result)
const KW = new Map();
const LLM = {
  expand: (p) => relay('expand')(p).then(out => { KW.set(String(p.query), out && out.keywords); if (KW.size > 50) KW.delete(KW.keys().next().value); return out; }),
  select: relay('select'), pick: relay('pick'),
};

// ------------------------------------------------ Sunnah section (HadeethEnc)
// BM25 over each hadith's title, text and the start of its explanation; the 10 best go to the AI,
// which may only keep numbers from that closed list. Without AI, a hadith is proposed only when
// every query word occurs in it. The page shows the hadith verbatim, with its grade and link.
const HAD = {};
function hadIndex(lang) {
  if (!HAD[lang]) HAD[lang] = getJSON(`../data/hadeeth/idx_${lang}.json`).then(d => {
    const post = new Map(), len = new Float32Array(d.doc.length);
    let total = 0;
    d.doc.forEach((doc, i) => {
      const ts = tokens(doc, lang); len[i] = ts.length; total += ts.length;
      const tf = new Map(); for (const t of ts) tf.set(t, (tf.get(t) || 0) + 1);
      for (const [t, c] of tf) { let p = post.get(t); if (!p) post.set(t, (p = [])); p.push(i, c); }
    });
    return { ...d, post, len, avg: total / d.doc.length || 1, N: d.doc.length };
  });
  return HAD[lang];
}
async function sunnahFor(res, opts) {
  if (!res || !['topic', 'term'].includes(res.type)) return null;
  if (res.meta && res.meta.route === 'word') return null;
  const lang = res.lang === 'en' ? 'en' : 'ar';
  let H;
  try { H = await hadIndex(lang); } catch (e) { return null; }
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
  if (opts.ai) {
    try {
      const out = await LLM.pick({ query: q, lang, what: 'hadith', items: ranked.map(r => H.doc[r.d].slice(0, 300)) });
      const keep = (out && Array.isArray(out.keep) ? out.keep : []).filter(i => Number.isInteger(i) && i >= 0 && i < ranked.length);
      return { by: 'ai', lang, ids: [...new Set(keep)].slice(0, 3).map(i => H.ids[ranked[i].d]), chunk: H.chunk, all: H.ids.length };
    } catch (e) { /* no AI: strict lexical rule below */ }
  }
  const strict = ranked.filter(r => r.cov === 1).slice(0, 2);
  return strict.length ? { by: 'search', lang, ids: strict.map(r => H.ids[r.d]), chunk: H.chunk, all: H.ids.length } : null;
}
function idPos(lang, id) { return HAD[lang].then(H => H.ids.indexOf(id)); }

self.onmessage = async (ev) => {
  const m = ev.data || {};
  if (m.op === 'llm-reply') {
    const w = llmWait.get(m.id);
    if (!w) return;
    llmWait.delete(m.id);
    if (m.ok) w.resolve(m.value); else w.reject(new Error(m.error || 'AI unavailable'));
    return;
  }
  try {
    const e = await engine();
    if (m.op === 'warm') {
      await ensureSources(e, m.lang || 'ar');
      e.warm();
      self.postMessage({ id: m.id, ok: true, value: true });
      return;
    }
    if (m.op === 'ask') {
      const opts = m.opts || {};
      const qLang = detectLang(m.query, opts.uiLang || 'ar');
      if (qLang !== 'ar' && !latinP) latinP = getJSON('../data/latin_index.json').then(d => e.addLatinIndex(d)).catch(() => {});
      if (latinP) await latinP;
      await ensureSources(e, qLang);
      if (qLang !== 'ar') await ensureSources(e, 'ar');
      const value = await e.ask(m.query, { ...opts, llm: opts.ai ? LLM : null });
      self.postMessage({ id: m.id, ok: true, value });
      return;
    }
    if (m.op === 'sunnah') {   // asked by the page after the answer is shown (never delays it)
      const s = await sunnahFor(m.res, m.opts || {});
      if (s) s.pos = await Promise.all(s.ids.map(id => idPos(s.lang, id)));
      self.postMessage({ id: m.id, ok: true, value: s });
      return;
    }
    throw new Error('unknown op ' + m.op);
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, error: String(err && err.message || err) });
  }
};
