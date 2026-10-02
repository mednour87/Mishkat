// The search engine in a Web Worker: building the indexes (several hundred ms) and running a
// query never freeze the page, the galaxy or the recitation. The page keeps a light copy of
// the engine for display only (verse texts, tafsir texts, references).
// Messages in : {id, op:'ask', query, opts} · {id, op:'warm', lang} · {id, op:'llm-reply', ok, value|error}
// Messages out: {id, ok, value|error} · {op:'llm', id, kind, payload} (the page calls the AI API,
// with its cache and circuit breaker, and replies).
import { createEngine, detectLang, SOURCES_NEEDED } from './engine.js';

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
const LLM = { expand: relay('expand'), select: relay('select') };

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
    throw new Error('unknown op ' + m.op);
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, error: String(err && err.message || err) });
  }
};
