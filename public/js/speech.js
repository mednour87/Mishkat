// Reading a tafsir passage aloud.
//  1. a voice of the browser for the language, when one is installed (free, instant);
//  2. otherwise the server voice (POST api/tts, Groq Orpheus), sentence by sentence,
//     the next sentence being prepared while the current one plays.
// Only text already on the screen is read; it is a machine reading of the tafsir,
// never a recitation of the Quran.

export const MAX_CHARS = 3000;   // longer passages: the beginning is read
const CHUNK = 190;               // the server voice takes at most 200 characters

export function cleanForSpeech(text) {
  return String(text || '').replace(/\[\d+\]/g, ' ').replace(/[﴿﴾«»"“”<>{}]/g, ' ').replace(/\s+/g, ' ').trim();
}

// chunks of ≤ max characters, cut at sentence ends, then commas, then spaces
export function speechChunks(text, max = CHUNK) {
  const out = [];
  const push = (s) => { s = s.trim(); if (s) out.push(s); };
  let cur = '';
  for (const sent of cleanForSpeech(text).match(/[^.!?؟؛;:]+[.!?؟؛;:]*\s*/g) || []) {
    if ((cur + sent).length <= max) { cur += sent; continue; }
    push(cur); cur = '';
    if (sent.length <= max) { cur = sent; continue; }
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

// voices load asynchronously in Chromium: wait for them a little
function voices() {
  const ss = window.speechSynthesis;
  if (!ss) return Promise.resolve([]);
  const now = ss.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise(res => {
    const done = () => { ss.removeEventListener('voiceschanged', done); res(ss.getVoices()); };
    ss.addEventListener('voiceschanged', done);
    setTimeout(done, 1200);
  });
}
export async function browserVoice(lang) {
  const list = (await voices()).filter(v => v.lang && v.lang.toLowerCase().startsWith(lang));
  // natural / online voices first
  return list.sort((a, b) => (/natural|online|google/i.test(b.name) ? 1 : 0) - (/natural|online|google/i.test(a.name) ? 1 : 0))[0] || null;
}

// createSpeaker({ server: () => boolean, onState: (state, info) => void })
//   states: 'loading' | 'speaking' | 'idle' | 'error' (info: 'novoice' | 'terms' | 'quota' | 'failed')
export function createSpeaker({ server = () => false, onState = () => {} } = {}) {
  let run = 0, audio = null;
  const stop = () => {
    run++;
    if (window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
    if (audio) { audio.onended = audio.onerror = null; audio.pause(); URL.revokeObjectURL(audio.src); audio = null; }
  };
  const fetchChunk = async (text, lang) => {
    const r = await fetch('api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, lang }) });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || type.includes('json')) {
      let code = r.status === 429 ? 'quota' : 'failed';
      try { const j = await r.json(); code = j.code || code; } catch (e) { /* not json */ }
      throw Object.assign(new Error('tts'), { code });
    }
    return URL.createObjectURL(await r.blob());
  };
  async function speak(text, lang) {
    stop();
    const my = ++run;
    const full = cleanForSpeech(text);
    const trimmed = full.length > MAX_CHARS;
    const body = trimmed ? full.slice(0, MAX_CHARS).replace(/\s+\S*$/, '') : full;
    const parts = speechChunks(body);
    if (!parts.length) return;
    onState('loading', { trimmed });
    const voice = await browserVoice(lang);
    if (my !== run) return;
    if (voice) {
      // the browser's own voice, sentence by sentence (long utterances get cut in Chromium)
      onState('speaking', { trimmed, via: 'browser' });
      for (const p of parts) {
        const ok = await new Promise(res => {
          const u = new SpeechSynthesisUtterance(p);
          u.voice = voice; u.lang = voice.lang; u.rate = lang === 'ar' ? 0.92 : 1;
          u.onend = () => res(true); u.onerror = () => res(false);
          speechSynthesis.speak(u);
        });
        if (my !== run) return;
        if (!ok) break;
      }
      if (my === run) onState('idle');
      return;
    }
    if (!server()) { onState('error', 'novoice'); return; }
    try {
      let next = fetchChunk(parts[0], lang);
      for (let k = 0; k < parts.length; k++) {
        const url = await next;
        if (my !== run) { URL.revokeObjectURL(url); return; }
        next = k + 1 < parts.length ? fetchChunk(parts[k + 1], lang) : null;
        if (next) next.catch(() => {}); // a failure is reported when it is awaited
        if (k === 0) onState('speaking', { trimmed, via: 'server' });
        await new Promise((res, rej) => {
          audio = new Audio(url);
          audio.onended = () => { URL.revokeObjectURL(url); res(); };
          audio.onerror = () => { URL.revokeObjectURL(url); rej(Object.assign(new Error('audio'), { code: 'failed' })); };
          audio.play().catch(rej);
        });
        if (my !== run) return;
      }
      if (my === run) { audio = null; onState('idle'); }
    } catch (e) {
      if (my === run) { stop(); onState('error', e.code || 'failed'); }
    }
  }
  return { speak, stop, get active() { return !!(audio || (window.speechSynthesis && speechSynthesis.speaking)); } };
}
