// Reading the tafsir aloud when the visitor's browser has no voice for the language
// (e.g. Windows without an Arabic voice). Text-to-speech on Groq (Orpheus):
//   ar → canopylabs/orpheus-arabic-saudi   en → canopylabs/orpheus-v1-english
// The model only reads a text that is already on the screen (a verbatim tafsir);
// it writes nothing. Requests are limited to 200 characters by the provider, so
// the browser sends the text sentence by sentence (see ttsChunks).
// The org admin must accept the models' terms once in the Groq console.

export const TTS_MODELS = {
  ar: { model: 'canopylabs/orpheus-arabic-saudi', voices: ['fahad', 'abdullah', 'sultan', 'noura', 'lulwa', 'aisha'] },
  en: { model: 'canopylabs/orpheus-v1-english', voices: ['daniel', 'troy', 'austin', 'hannah', 'diana', 'autumn'] },
};
export const TTS_MAX = 200;

export function ttsReady(env) {
  return !!(env.AZURE_TTS_KEY || env.TTS_KEY || env.GROQ_API_KEY) && env.TTS_OFF !== '1';
}

// Azure Speech (free tier F0, 500,000 characters a month), tried first when its key is set: neural voices
// ar-SA / en-US. Same rule: only a known passage reaches this function.
export const AZURE_VOICES = { ar: 'ar-SA-HamedNeural', en: 'en-US-AndrewNeural' };
const xmlEsc = (s) => s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
export async function azureSpeak(text, lang, env, fetchImpl = fetch) {
  const region = String(env.AZURE_TTS_REGION || '').replace(/[^a-z0-9]/gi, '');
  if (!env.AZURE_TTS_KEY || !region) return null;
  const voice = (lang === 'en' ? env.AZURE_VOICE_EN : env.AZURE_VOICE_AR) || AZURE_VOICES[lang];
  const ssml = `<speak version="1.0" xml:lang="${lang === 'en' ? 'en-US' : 'ar-SA'}"><voice name="${xmlEsc(voice)}"><prosody rate="${lang === 'en' ? '0%' : '-8%'}">${xmlEsc(text)}</prosody></voice></speak>`;
  const r = await fetchImpl(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': env.AZURE_TTS_KEY, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'Mishkat' },
    body: ssml,
  });
  if (!r.ok) return { ok: false, error: `azure HTTP ${r.status}`, code: r.status === 429 ? 'quota' : 'failed' };
  return { ok: true, audio: await r.arrayBuffer(), type: 'audio/mpeg' };
}

// Plain text to read: no footnote marks, no brackets around verse quotes.
export function ttsClean(text) {
  return String(text || '').replace(/\[\d+\]/g, ' ').replace(/[﴿﴾«»"“”<>{}]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Split a text into chunks of at most `max` characters, at sentence ends when
// possible, then at commas, then at spaces (a word is never cut).
export function ttsChunks(text, max = TTS_MAX - 10) {
  const out = [];
  const push = (s) => { s = s.trim(); if (s) out.push(s); };
  const sentences = ttsClean(text).match(/[^.!?؟؛;:]+[.!?؟؛;:]*\s*/g) || [];
  let cur = '';
  for (const sent of sentences) {
    if ((cur + sent).length <= max) { cur += sent; continue; }
    push(cur); cur = '';
    if (sent.length <= max) { cur = sent; continue; }
    // long sentence: by commas, then by words
    for (const part of sent.match(/[^,،]+[,،]?\s*/g) || [sent]) {
      if ((cur + part).length <= max) { cur += part; continue; }
      push(cur); cur = '';
      if (part.length <= max) { cur = part; continue; }
      for (const w of part.split(/\s+/)) {
        if ((cur + ' ' + w).length > max) { push(cur); cur = ''; }
        cur += (cur ? ' ' : '') + w.slice(0, max);
      }
    }
  }
  push(cur);
  return out;
}

// T018 part 2 (audit I3): the server voice reads only KNOWN passages — a tafsir unit shipped with Mishkat,
// named by book + surah + verse + chunk number — never a free text (which would let anyone use our key as a
// free speech service, or make «Mishkat» say anything). Never the Quran: verses are recited by a human reciter.
export const TTS_BOOKS = { muyassar_ar: 'ar', mukhtasar_ar: 'ar', mukhtasar_en: 'en' };
export function passageRequest(body) {
  const b = body || {};
  if (b.text != null) return { error: 'free text is not read', code: 'bad' };
  const lang = TTS_BOOKS[b.book];
  const s = +b.s, a = +b.a, n = +b.n;
  if (!lang || !Number.isInteger(s) || s < 1 || s > 114 || !Number.isInteger(a) || a < 1 || a > 286 || !Number.isInteger(n) || n < 0 || n > 60) return { error: 'bad passage', code: 'bad' };
  return { book: b.book, s, a, n, lang };
}
// loadSura(book, s) → array of verse units (public/data/tts/{book}/{s}.json)
export async function speakPassage(body, env, loadSura, fetchImpl = fetch) {
  const p = passageRequest(body);
  if (p.error) return { ok: false, error: p.error, code: p.code };
  const units = await loadSura(p.book, p.s);
  const unit = Array.isArray(units) ? units[p.a - 1] : null;
  if (!unit) return { ok: false, error: 'no such passage', code: 'bad' };
  const chunk = ttsChunks(unit)[p.n];
  if (!chunk) return { ok: false, error: 'no such chunk', code: 'bad' };
  return speak({ text: chunk, lang: p.lang }, env, fetchImpl);
}

const badVoice = new Map(); // lang → index of the voice to use after an "invalid voice" error

// body: { text (≤ 200 chars), lang: 'ar'|'en' } → { ok, audio: ArrayBuffer, type } | { ok:false, error, code }
export async function speak(body, env, fetchImpl = fetch) {
  const lang = body && body.lang === 'en' ? 'en' : 'ar';
  const text = ttsClean(body && body.text);
  if (!text) return { ok: false, error: 'empty text', code: 'bad' };
  if (text.length > TTS_MAX) return { ok: false, error: 'text too long', code: 'bad' };
  if (!ttsReady(env)) return { ok: false, error: 'no tts key', code: 'off' };
  if (env.AZURE_TTS_KEY) {
    const az = await azureSpeak(text, lang, env, fetchImpl).catch(() => null);
    if (az && az.ok) return az;
    if (!(env.TTS_KEY || env.GROQ_API_KEY)) return az || { ok: false, error: 'azure failed', code: 'failed' };
  }
  const key = env.TTS_KEY || env.GROQ_API_KEY;
  const M = TTS_MODELS[lang];
  const wanted = (lang === 'ar' ? env.TTS_VOICE_AR : env.TTS_VOICE_EN) || '';
  const voices = [...new Set([wanted, ...M.voices].filter(Boolean))];
  let k = badVoice.get(lang) || 0;
  for (let tries = 0; tries < 3 && k < voices.length; tries++) {
    const r = await fetchImpl(env.TTS_URL || 'https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: env[`TTS_MODEL_${lang.toUpperCase()}`] || M.model, input: text, voice: voices[k], response_format: 'wav' }),
    });
    if (r.ok) return { ok: true, audio: await r.arrayBuffer(), type: 'audio/wav' };
    let msg = '';
    try { const j = await r.json(); msg = String((j.error && (j.error.code || '') + ' ' + j.error.message) || ''); } catch (e) { /* not json */ }
    if (r.status === 429) return { ok: false, error: 'tts rate limit', code: 'quota' };
    if (/terms/i.test(msg)) return { ok: false, error: 'the model terms must be accepted in the Groq console', code: 'terms' };
    if (r.status === 400 && /voice/i.test(msg)) { k++; badVoice.set(lang, k); continue; }
    return { ok: false, error: `tts HTTP ${r.status}`, code: 'failed' };
  }
  return { ok: false, error: 'no valid voice', code: 'failed' };
}
