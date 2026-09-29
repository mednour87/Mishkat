// The only place an LLM is called. Two narrow tasks, both returning JSON that
// is validated here AND again in the browser (engine.verifyExpansion/verifyLLM):
//
//   expand(query)  → intent + search keywords (Arabic/English/French). The
//                    keywords are used ONLY to retrieve verses; never shown.
//   select(query, candidates, sentences) → ids of relevant verses and ids of
//                    tafsir sentences, taken from CLOSED numbered lists.
//
// The LLM never writes text that reaches the user.
// Providers: Groq (OpenAI-compatible, free tier) with model fallback.

export const DEFAULT_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];

const RULES = `You are a component of a Quran search engine. You NEVER write explanations, translations, rulings, tafsir or any religious content. You only output JSON.
intent: "ruling" if the user asks whether something is halal/haram/permissible/obligatory or asks for a fatwa; "personal" ONLY if the user describes a specific private situation involving decisions about other people (family conflict, marriage, divorce, work) and asks what to do; general questions such as "how to deal with sadness", "how to be patient", "how to repent" are "topic"; a bare subject word or phrase (e.g. "الخمر", "usury", "le divorce") is always "topic"; "topic" if the user looks for what the Quran says about a subject, story, person, attribute or idea; "other" otherwise.`;

const SYS_EXPAND = `${RULES}
Task: understand the query and propose search keywords that would appear in the Quran text or in classical tafsir (Al-Muyassar, Al-Mukhtasar) for this topic.
Also list up to 8 verse references "sura:aya" that you believe are central to this topic (they will be checked against the real text; wrong ones are discarded).
Return {"intent":"...","keywords":{"ar":[up to 6 Arabic words or short phrases, classical vocabulary, without diacritics],"en":[up to 5],"fr":[up to 5]},"refs":["17:23",...]}.
Keywords must be single words or 2-word phrases, no sentences.`;

const SYS_SELECT = `${RULES}
Input: a query, a numbered list of candidate verses (id "sura:aya" + tafsir excerpt) and a list of tafsir sentences (id "sura:aya#k").
Task:
1. intent (as defined).
2. ids: the candidate verse ids that are genuinely about the query, most relevant first, at most 12. Use ONLY ids from the candidate list. If none is relevant, [].
3. sentences: 2 to 4 sentence ids that, read in order, best explain what the Quran says about the query. Use ONLY sentence ids from the list; prefer sentences from different verses. [] if none fits.
4. confidence: "high" if the selected verses clearly answer the query, else "low".
Return {"intent":"...","ids":[...],"sentences":[...],"confidence":"high|low"}`;

const ID_RE = /^\d{1,3}:\d{1,3}$/;
const SID_RE = /^\d{1,3}:\d{1,3}#\d{1,2}$/;

export function sanitizePayload(body, kind = 'select') {
  if (!body || typeof body !== 'object') throw new Error('bad body');
  const query = String(body.query || '').slice(0, 300).trim();
  const lang = ['ar', 'en', 'fr'].includes(body.lang) ? body.lang : 'ar';
  if (!query) throw new Error('empty query');
  if (kind === 'expand') return { query, lang };
  const candidates = (Array.isArray(body.candidates) ? body.candidates : []).slice(0, 40)
    .filter(c => c && ID_RE.test(String(c.id)))
    .map(c => ({ id: String(c.id), text: String(c.text || '').slice(0, 240) }));
  const sentences = (Array.isArray(body.sentences) ? body.sentences : []).slice(0, 30)
    .filter(c => c && SID_RE.test(String(c.id)))
    .map(c => ({ id: String(c.id), text: String(c.text || '').slice(0, 280) }));
  if (!candidates.length) throw new Error('empty candidates');
  return { query, lang, candidates, sentences };
}

export function buildMessages(p, kind = 'select') {
  if (kind === 'expand') return [{ role: 'system', content: SYS_EXPAND }, { role: 'user', content: `Query (${p.lang}): ${p.query}` }];
  const list = p.candidates.map((c, i) => `${i + 1}. [${c.id}] ${c.text}`).join('\n');
  const sents = p.sentences.map(s => `[${s.id}] ${s.text}`).join('\n');
  return [
    { role: 'system', content: SYS_SELECT },
    { role: 'user', content: `Query (${p.lang}): ${p.query}\n\nCandidate verses:\n${list}\n\nTafsir sentences:\n${sents || '(none)'}` },
  ];
}

function parseJson(raw) {
  if (raw && typeof raw === 'object') return raw;
  const m = String(raw || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  return JSON.parse(m[0]);
}

const INTENTS = ['topic', 'ruling', 'personal', 'other'];
export function validateOutput(raw, candidates, sentences = []) {
  const obj = parseJson(raw);
  const allowed = new Set(candidates.map(c => c.id)), allowedS = new Set(sentences.map(s => s.id));
  const intent = INTENTS.includes(obj.intent) ? obj.intent : 'topic';
  const ids = [], sids = []; let rejected = 0;
  for (const id of Array.isArray(obj.ids) ? obj.ids : []) {
    const s = String(id).trim();
    if (allowed.has(s) && !ids.includes(s)) ids.push(s); else rejected++;
  }
  for (const id of Array.isArray(obj.sentences) ? obj.sentences : []) {
    const s = String(id).trim();
    if (allowedS.has(s) && !sids.includes(s)) sids.push(s); else rejected++;
  }
  return { intent, ids: ids.slice(0, 12), sentences: sids.slice(0, 4), confidence: obj.confidence === 'high' ? 'high' : 'low', rejected };
}

export function validateExpansion(raw) {
  const obj = parseJson(raw);
  const kw = obj.keywords && typeof obj.keywords === 'object' ? obj.keywords : {};
  const clean = (a) => (Array.isArray(a) ? a : []).map(x => String(x).trim().slice(0, 30)).filter(x => x && x.split(/\s+/).length <= 3).slice(0, 6);
  const refs = (Array.isArray(obj.refs) ? obj.refs : []).map(x => String(x).trim()).filter(x => ID_RE.test(x)).slice(0, 8);
  return { intent: INTENTS.includes(obj.intent) ? obj.intent : 'topic', keywords: { ar: clean(kw.ar), en: clean(kw.en), fr: clean(kw.fr) }, refs };
}

async function callOpenAICompat({ url, key, model, messages, timeoutMs = 6000, fetchImpl = fetch }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const body = { model, messages, temperature: 0, max_tokens: 900, response_format: { type: 'json_object' } };
    if (/gpt-oss/.test(model)) body.reasoning_effort = 'low';
    const send = () => fetchImpl(url, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    let r = await send();
    if (r.status === 429) { // free-tier rate limit: retry once only if the wait is short
      const ra = parseFloat(r.headers && r.headers.get ? r.headers.get('retry-after') : '');
      if (!(ra > 2)) { await new Promise(res => setTimeout(res, (ra || 1) * 1000)); r = await send(); }
    }
    if (r.status === 429) { const e = new Error(`${model} HTTP 429`); e.quota = true; throw e; }
    if (!r.ok) throw new Error(`${model} HTTP ${r.status}`);
    const j = await r.json();
    return j.choices[0].message.content;
  } finally { clearTimeout(t); }
}

// env: GROQ_API_KEY, GROQ_MODELS (comma list), FALLBACK_URL / FALLBACK_KEY / FALLBACK_MODEL
export function providers(env) {
  const out = [];
  if (env.GROQ_API_KEY) {
    const models = (env.GROQ_MODELS || DEFAULT_MODELS.join(',')).split(',').map(s => s.trim()).filter(Boolean);
    for (const m of models) out.push({ name: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: env.GROQ_API_KEY, model: m });
  }
  if (env.FALLBACK_URL && env.FALLBACK_KEY && env.FALLBACK_MODEL) out.push({ name: 'fallback', url: env.FALLBACK_URL, key: env.FALLBACK_KEY, model: env.FALLBACK_MODEL });
  return out;
}

// per-model circuit breaker: a model that returned 429 is skipped for 2 minutes
const coolDown = new Map();
export function resetCoolDown() { coolDown.clear(); }

async function run(kind, body, env, fetchImpl) {
  const p = sanitizePayload(body, kind);
  const messages = buildMessages(p, kind);
  const errors = [];
  for (const pr of providers(env)) {
    if ((coolDown.get(pr.model) || 0) > Date.now()) { errors.push(`${pr.model} cooling down`); continue; }
    try {
      const raw = await callOpenAICompat({ ...pr, messages, fetchImpl });
      const v = kind === 'expand' ? validateExpansion(raw) : validateOutput(raw, p.candidates, p.sentences);
      return { ok: true, model: pr.model, ...v };
    } catch (e) {
      errors.push(String(e.message || e));
      if (e.quota) coolDown.set(pr.model, Date.now() + 120000);
    }
  }
  return kind === 'expand'
    ? { ok: false, errors, intent: 'topic', keywords: { ar: [], en: [], fr: [] } }
    : { ok: false, errors, intent: 'topic', ids: [], sentences: [], confidence: 'low', rejected: 0 };
}

export const select = (body, env, fetchImpl = fetch) => run('select', body, env, fetchImpl);
export const expand = (body, env, fetchImpl = fetch) => run('expand', body, env, fetchImpl);

export function health(env) {
  const p = providers(env);
  return { ok: true, llm: p.length > 0, model: p.length ? p[0].model : null };
}
