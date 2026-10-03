// The only place an LLM is called. Two narrow tasks, both returning JSON that
// is validated here AND again in the browser (engine.verifyExpansion/verifyLLM):
//
//   expand(query)  → intent + search keywords (Arabic/English). The
//                    keywords are used ONLY to retrieve verses; never shown.
//   select(query, candidates, sentences) → ids of relevant verses and ids of
//                    tafsir sentences, taken from CLOSED numbered lists.
//
// The LLM never writes text that reaches the user.
// Providers: Groq (OpenAI-compatible, free tier) with model fallback.

import { ttsReady } from './tts.js';

export const DEFAULT_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];

// Queries often come from voice search (Whisper): dialect, fillers, no punctuation, small
// transcription errors. The prompts say so, so that the model reads the intent, not the noise.
const RULES = `You are a component of a Quran search engine. You NEVER write explanations, translations, rulings, tafsir or any religious content. You only output JSON.
The query may be a speech transcription: dialectal Arabic (Gulf, Egyptian, Levantine, Maghrebi) or English, with filler words ("um", «طيب», «يعني»), politeness («لو سمحت»), no punctuation and small transcription errors (ه written for ة, missing hamza, "patients" for "patience", names such as Musa, Firaun, Yusuf, Isa). Read what the person is asking about.
intent: "ruling" if the user asks whether something is halal/haram/permissible/obligatory or asks for a fatwa; "personal" ONLY if the user describes a specific private situation involving decisions about other people (family conflict, marriage, divorce, work) and asks what to do; general questions such as "how to deal with sadness", "how to be patient", "how to repent" are "topic";
"polemic" if the query asserts or insinuates that Islam, the Quran or Muslims are violent, unjust, hateful, or is a trap question built to make Islam look bad; a bare subject word or phrase (e.g. "الخمر", "usury", "divorce") is always "topic"; "topic" if the user looks for what the Quran says about a subject, story, person, attribute or idea; "other" if the query is not about the Quran, Islam, its stories or its teachings at all (prices, weather, technology, small talk, a microphone test, an empty or meaningless text).`;

const SYS_EXPAND = `${RULES}
Task: understand the query and propose search keywords and central verses.
keywords.ar: up to 6 words written exactly as they appear in the Quran or in the classical tafsirs At-Tafsir Al-Muyassar / Al-Mukhtasar — the root-bearing noun or verb (e.g. «الصبر», «الصابرين», «يغتب», «الغيبة», «الربا», «اليتيم»), without diacritics. Never dialect words, never words meaning "verse", "Quran", "what", "tell", "story".
keywords.en: up to 5 words as used in the English translation shown by the site (Noor International) or Al-Mukhtasar in English (e.g. "patient", "backbite", "orphan", "Pharaoh").
refs: up to 8 references "sura:aya" of the well-known verses that most directly state the answer or tell the asked story (they are checked against the real text; wrong ones are discarded).
Return {"intent":"...","keywords":{"ar":[...],"en":[...]},"refs":["17:23",...]}.
Keywords must be single words or 2-word phrases, no sentences.`;

const SYS_SELECT = `${RULES}
Input: a query and a numbered list of candidate verses (id "sura:aya" + the beginning of a vetted tafsir of that verse).
Task:
1. intent (as defined).
2. items: the candidate verses relevant to the query, ordered from the most to the least relevant, at most 12, each with a score. Use ONLY ids from the list.
   score 2 = the verse itself DIRECTLY answers the question or states the asked subject (e.g. "seeking knowledge" → «وقل رب زدني علما»);
   score 1 = only related (mentions the subject in passing, or a neighbouring idea). Do not list unrelated verses (score 0).
   - Judge by the meaning of the tafsir, not by shared words. Reject homonyms (e.g. «شفا حفرة» = brink, not «شفاء» = cure; «الجاريات» = ships, not «الجار» = neighbour; "interest" = benefit, not usury) and verses about the opposite or another subject.
   - Prefer verses that state the answer itself; skip verses that only mention the word in passing.
   - If the query joins several subjects («الصبر والشكر», "fear and hope"), list first the verses that mention them together (if any), then verses for EACH subject separately, so that every subject is covered. A verse about only one of the subjects is still relevant.
   - For a story, choose the verses that narrate its main events, in the order of the story.
   - For hostile or trap questions, prefer the verses that state the general principle and its conditions.
   - If no candidate answers the query, return "items": [].
3. confidence: "high" if the selected verses clearly answer the query, else "low".
Return {"intent":"...","items":[{"id":"20:114","score":2},...],"confidence":"high|low"}`;

const ID_RE = /^\d{1,3}:\d{1,3}$/;
const SID_RE = /^\d{1,3}:\d{1,3}#\d{1,2}$/;

export function sanitizePayload(body, kind = 'select') {
  if (!body || typeof body !== 'object') throw new Error('bad body');
  const query = String(body.query || '').slice(0, 300).trim();
  const lang = ['ar', 'en'].includes(body.lang) ? body.lang : 'ar';
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
  return [
    { role: 'system', content: SYS_SELECT },
    { role: 'user', content: `Query (${p.lang}): ${p.query}\n\nCandidate verses:\n${list}` },
  ];
}

function parseJson(raw) {
  if (raw && typeof raw === 'object') return raw;
  const m = String(raw || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  return JSON.parse(m[0]);
}

const INTENTS = ['topic', 'ruling', 'personal', 'polemic', 'other'];
export function validateOutput(raw, candidates, sentences = []) {
  const obj = parseJson(raw);
  const allowed = new Set(candidates.map(c => c.id)), allowedS = new Set(sentences.map(s => s.id));
  const intent = INTENTS.includes(obj.intent) ? obj.intent : 'topic';
  const ids = [], sids = [], scores = {}; let rejected = 0;
  // {"items":[{"id","score"}]} (scored selection) or {"ids":[...]} (older format, score 2)
  const items = Array.isArray(obj.items) ? obj.items : (Array.isArray(obj.ids) ? obj.ids.map(id => ({ id, score: 2 })) : []);
  for (const it of items) {
    const s = String(it && typeof it === 'object' ? it.id : it).trim();
    const sc = it && typeof it === 'object' && +it.score === 1 ? 1 : 2;
    if (it && typeof it === 'object' && +it.score === 0) continue;
    if (allowed.has(s) && !ids.includes(s)) { ids.push(s); scores[s] = sc; } else rejected++;
  }
  for (const id of Array.isArray(obj.sentences) ? obj.sentences : []) {
    const s = String(id).trim();
    if (allowedS.has(s) && !sids.includes(s)) sids.push(s); else rejected++;
  }
  const keep = ids.slice(0, 12);
  return { intent, ids: keep, scores: Object.fromEntries(keep.map(k => [k, scores[k]])), sentences: sids.slice(0, 4), confidence: obj.confidence === 'high' ? 'high' : 'low', rejected };
}

export function validateExpansion(raw) {
  const obj = parseJson(raw);
  const kw = obj.keywords && typeof obj.keywords === 'object' ? obj.keywords : {};
  const clean = (a) => (Array.isArray(a) ? a : []).map(x => String(x).trim().slice(0, 30)).filter(x => x && x.split(/\s+/).length <= 3).slice(0, 6);
  const refs = (Array.isArray(obj.refs) ? obj.refs : []).map(x => String(x).trim()).filter(x => ID_RE.test(x)).slice(0, 8);
  return { intent: INTENTS.includes(obj.intent) ? obj.intent : 'topic', keywords: { ar: clean(kw.ar), en: clean(kw.en) }, refs };
}

export async function callOpenAICompat({ url, key, model, messages, timeoutMs = 6000, fetchImpl = fetch }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const body = { model, messages, temperature: 0, max_tokens: 900, response_format: { type: 'json_object' } };
    if (/openrouter\.ai/.test(url)) {
      // OpenRouter: its own reasoning field, the fastest hosts first, only hosts that honour JSON mode
      if (/gpt-oss/.test(model)) body.reasoning = { effort: 'low', exclude: true };
      body.provider = { sort: 'throughput', require_parameters: true, data_collection: 'deny' };
    } else if (/gpt-oss/.test(model)) body.reasoning_effort = 'low';
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
    // 401/402: bad key or credit exhausted — that provider is skipped for a long time (E7)
    if (r.status === 401 || r.status === 402) { const e = new Error(`${model} HTTP ${r.status}`); e.billing = true; throw e; }
    if (!r.ok) throw new Error(`${model} HTTP ${r.status}`);
    const j = await r.json();
    return j.choices[0].message.content;
  } finally { clearTimeout(t); }
}

// Providers, in order of preference (all OpenAI-compatible):
//   PRIMARY_URL / PRIMARY_KEY / PRIMARY_MODELS  — the paid provider: OpenRouter, pay per token
//     (PRIMARY_URL=https://openrouter.ai/api/v1/chat/completions,
//      PRIMARY_MODELS=openai/gpt-oss-120b,openai/gpt-oss-20b — the models benchmarked on Groq)
//   GROQ_API_KEY / GROQ_MODELS                   — Groq free tier (backup)
//   FALLBACK_URL / FALLBACK_KEY / FALLBACK_MODEL — any other endpoint
export function providers(env) {
  const out = [];
  const list = (v, d) => (v || d).split(',').map(x => x.trim()).filter(Boolean);
  if (env.PRIMARY_URL && env.PRIMARY_KEY && env.PRIMARY_MODELS) {
    for (const m of list(env.PRIMARY_MODELS)) out.push({ name: 'primary', url: env.PRIMARY_URL, key: env.PRIMARY_KEY, model: m });
  }
  if (env.GROQ_API_KEY) {
    for (const m of list(env.GROQ_MODELS, DEFAULT_MODELS.join(','))) out.push({ name: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: env.GROQ_API_KEY, model: m });
  }
  if (env.FALLBACK_URL && env.FALLBACK_KEY && env.FALLBACK_MODEL) out.push({ name: 'fallback', url: env.FALLBACK_URL, key: env.FALLBACK_KEY, model: env.FALLBACK_MODEL });
  return out;
}

// Speech-to-text (Whisper on Groq). Returns the transcription text only.
// The language is given (short Arabic questions are often mis-detected), a short
// vocabulary prompt biases the spelling, and text invented on silence is dropped.
const STT_PROMPT = {
  ar: 'سؤال عن القرآن الكريم: آية، سورة، تفسير، الصبر، بر الوالدين، قصة يوسف، موسى، الصلاة، الزكاة، الصيام.',
  en: 'A question about the Quran: verse, surah, tafsir, patience, parents, Joseph, Moses, prayer, fasting.',
};
// phrases Whisper is known to produce on silence or noise (subtitle credits, outros)
const P = String.raw`[\s\p{P}\p{S}]*`;   // spaces / punctuation only (Unicode-aware: Arabic letters are NOT matched)
const STT_GHOSTS = [/ترجمة\s*نانسي/u, /اشتركوا?\s*في\s*القناة/u, /شكرا\s*(لكم\s*)?على\s*المشاهدة/u, /شكرا\s*للمشاهدة/u,
  /sous-?titr/iu, /merci d.avoir regard/iu, /thanks? (you )?for watching/iu, /please subscribe|subscribe to (my|the|our) channel/iu, /amara\.org/iu,
  new RegExp(`^${P}(you|thank you|thanks|bye|merci|au revoir|شكرا|شكرًا|موسيقى)${P}$`, 'iu'), new RegExp(`^${P}$`, 'u')];
const AUDIO_EXT = { 'audio/webm': 'webm', 'video/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav' };
export function cleanTranscript(j, lang) {
  let text;
  if (Array.isArray(j.segments) && j.segments.length) {
    text = j.segments.filter(sg => !(sg.no_speech_prob > 0.6 && sg.avg_logprob < -0.7) && !(sg.avg_logprob < -1.2))
      .map(sg => String(sg.text || '')).join(' ');
  } else text = String(j.text || '');
  text = text.replace(/\s+/g, ' ').trim();
  const prompt = STT_PROMPT[lang] || '';
  // the vocabulary prompt echoed back on silence (a one-word question such as «الصبر» is kept)
  const echo = prompt && text.split(/\s+/).length >= 4 && prompt.includes(text.replace(/[.،,:;!?؟]+$/u, ''));
  if (!text || echo || STT_GHOSTS.some(re => re.test(text))) return '';
  return text.slice(0, 500);
}
export async function transcribe(audioBlob, lang, env, fetchImpl = fetch) {
  const key = env.STT_KEY || env.GROQ_API_KEY;
  if (!key) return { ok: false, error: 'no stt key' };
  if (!audioBlob || typeof audioBlob === 'string') return { ok: false, error: 'bad audio' };
  const type = String(audioBlob.type || 'audio/webm').split(';')[0];
  const once = async (l) => {
    const fd = new FormData();
    fd.append('file', audioBlob, `speech.${AUDIO_EXT[type] || 'webm'}`);
    fd.append('model', env.STT_MODEL || 'whisper-large-v3');
    if (l) { fd.append('language', l); fd.append('prompt', STT_PROMPT[l]); }
    fd.append('response_format', 'verbose_json');
    fd.append('temperature', '0');
    const r = await fetchImpl(env.STT_URL || 'https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: { authorization: `Bearer ${key}` }, body: fd });
    if (!r.ok) return { ok: false, error: `stt HTTP ${r.status}` };
    const j = await r.json();
    return { ok: true, text: cleanTranscript(j, l), raw: String(j.text || '').trim() };
  };
  const l = ['ar', 'en'].includes(lang) ? lang : '';
  let out = await once(l);
  // speech was heard but did not fit the chosen language (e.g. English spoken, Arabic selected): auto-detect once
  if (out.ok && !out.text && out.raw && l) out = await once('');
  return out.ok ? { ok: true, text: out.text } : out;
}

// circuit breaker per PROVIDER AND model (E7: a 429 from OpenRouter must not block the same model on
// Groq): 429 → skipped 2 minutes, 401/402 (key or credit) → 30 minutes
const coolDown = new Map();
export function resetCoolDown() { coolDown.clear(); }
const ckey = (pr) => `${pr.name}:${pr.model}`;
export const cooling = (pr) => (coolDown.get(ckey(pr)) || 0) > Date.now();
export function trip(pr, e) {
  if (e && e.billing) coolDown.set(ckey(pr), Date.now() + 30 * 60000);
  else if (e && e.quota) coolDown.set(ckey(pr), Date.now() + 120000);
}
// one request has 7.5 s in all (the page waits 9 s): each provider gets at most 4.5 s, then the next
// one is tried with what is left, so the free backup is really reached when the paid host is slow
const BUDGET_MS = 7500, PER_PROVIDER_MS = 4500, MIN_TRY_MS = 1500;

async function run(kind, body, env, fetchImpl) {
  const p = sanitizePayload(body, kind);
  const messages = buildMessages(p, kind);
  const errors = [];
  const t0 = Date.now();
  for (const pr of providers(env)) {
    if ((coolDown.get(ckey(pr)) || 0) > Date.now()) { errors.push(`${ckey(pr)} cooling down`); continue; }
    const left = BUDGET_MS - (Date.now() - t0);
    if (left < MIN_TRY_MS) { errors.push('time budget spent'); break; }
    try {
      const raw = await callOpenAICompat({ ...pr, messages, fetchImpl, timeoutMs: Math.min(PER_PROVIDER_MS, left) });
      const v = kind === 'expand' ? validateExpansion(raw) : validateOutput(raw, p.candidates, p.sentences);
      return { ok: true, model: pr.model, ...v };
    } catch (e) {
      errors.push(String(e.message || e));
      trip(pr, e);
    }
  }
  return kind === 'expand'
    ? { ok: false, errors, intent: 'topic', keywords: { ar: [], en: [] } }
    : { ok: false, errors, intent: 'topic', ids: [], sentences: [], confidence: 'low', rejected: 0 };
}

export const select = (body, env, fetchImpl = fetch) => run('select', body, env, fetchImpl);

// Closed-list relevance check for published documents (fatwas, hadiths): the model only returns
// the numbers of the items, among those given, that address the user's question. Nothing it
// writes is shown; unknown numbers are dropped. Without a model: null (the caller keeps its order).
export async function pickRelevant(question, items, env, { max = 4, what = 'fatwa', fetchImpl = fetch } = {}) {
  const list = items.slice(0, 12).map((x, i) => `[${i + 1}] ${String(x).replace(/\s+/g, ' ').slice(0, 260)}`).join(String.fromCharCode(10));
  const messages = [
    { role: 'system', content: `You check relevance only. Given a user's question and numbered ${what} titles/summaries, return JSON {"keep":[numbers]} with the numbers (at most ${max}, best first) of the items whose MEANING answers the same question or directly addresses its subject (guidance, ruling, virtue, warning, comfort). Exclude items where the word only appears incidentally (another meaning, a name, a place, a different topic). Return {"keep":[]} if none does. Never write anything else.` },
    { role: 'user', content: `Question: ${String(question).slice(0, 300)}` + String.fromCharCode(10, 10) + list },
  ];
  for (const pr of providers(env)) {
    if ((coolDown.get(ckey(pr)) || 0) > Date.now()) continue;
    try {
      const raw = await callOpenAICompat({ ...pr, messages, fetchImpl, timeoutMs: 7000 });
      const j = JSON.parse(String(raw).replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
      const keep = (Array.isArray(j.keep) ? j.keep : []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= Math.min(12, items.length));
      return [...new Set(keep)].slice(0, max).map(n => n - 1);
    } catch (e) { trip(pr, e); }
  }
  return null;
}
export const expand = (body, env, fetchImpl = fetch) => run('expand', body, env, fetchImpl);

export function health(env) {
  const p = providers(env);
  return { ok: true, llm: p.length > 0, model: p.length ? p[0].model : null, stt: !!(env.STT_KEY || env.GROQ_API_KEY), tts: ttsReady(env),
    // semantic neighbours need an embedding model (Workers AI binding, or the REST API for local runs)
    dense: !!((env.AI && env.AI.run) || (env.CF_ACCOUNT && env.CF_AI_TOKEN)) };
}
