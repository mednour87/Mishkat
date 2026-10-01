// Voice input. Whisper on the server (dialects, punctuation) when available,
// otherwise the browser's Web Speech API. Returns plain text only.
//  - the language spoken is given explicitly (short Arabic questions are often mis-detected)
//  - recording stops by itself after a pause, or after maxMs
//  - nothing is sent when no speech was heard (Whisper invents text on silence)
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const BCP = { ar: 'ar-SA', en: 'en-US', fr: 'fr-FR' };

export function voiceSupported(serverStt) {
  return !!(SR || (serverStt && typeof MediaRecorder !== 'undefined' && navigator.mediaDevices));
}

// listen({ lang, serverStt, onState, onLevel, onPartial }) → Promise<string>
//   lang: 'ar' | 'en' | 'fr' or a function returning it (read when the audio is sent)
//   onState('listening' | 'processing' | 'idle'), onLevel(0..1), onPartial(text)
// Errors carry .code: 'denied' | 'nospeech' | 'failed' | 'unsupported'
export function listen({ lang = 'ar', serverStt = false, onState = () => {}, onLevel = () => {}, onPartial = () => {},
  maxMs = 15000, silenceMs = 1500, waitMs = 7000 } = {}) {
  const getLang = typeof lang === 'function' ? lang : () => lang;
  if (serverStt && typeof MediaRecorder !== 'undefined' && navigator.mediaDevices) {
    return recordWhisper({ getLang, onState, onLevel, maxMs, silenceMs, waitMs });
  }
  if (SR) return webSpeech({ getLang, onState, onPartial, maxMs });
  return Promise.reject(err('unsupported'));
}

let stopCurrent = null, cancelCurrent = null;
export function stopListening() { if (stopCurrent) stopCurrent(); }
export function cancelListening() { if (cancelCurrent) cancelCurrent(); }

function err(code, msg) { const e = new Error(msg || code); e.code = code; return e; }

function webSpeech({ getLang, onState, onPartial, maxMs }) {
  return new Promise((resolve, reject) => {
    const rec = new SR();
    rec.lang = BCP[getLang()] || 'ar-SA';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let done = false, text = '', cancelled = false;
    const end = (fn) => { if (done) return; done = true; stopCurrent = cancelCurrent = null; clearTimeout(timer); onState('idle'); fn(); };
    rec.onresult = (ev) => {
      text = [...ev.results].map(r => r[0].transcript).join(' ');
      onPartial(text);
    };
    rec.onerror = (ev) => end(() => reject(err(ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? 'denied' : ev.error === 'no-speech' ? 'nospeech' : 'failed', ev.error)));
    rec.onend = () => end(() => cancelled ? resolve('') : text.trim() ? resolve(text.trim()) : reject(err('nospeech')));
    stopCurrent = () => { try { rec.stop(); } catch (e) { /* stopped */ } };
    cancelCurrent = () => { cancelled = true; try { rec.abort(); } catch (e) { /* stopped */ } };
    const timer = setTimeout(stopCurrent, maxMs);
    onState('listening');
    try { rec.start(); } catch (e) { end(() => reject(err('failed', e.message))); }
  });
}

const MIMES = [['audio/webm;codecs=opus', 'webm'], ['audio/webm', 'webm'], ['audio/ogg;codecs=opus', 'ogg'], ['audio/mp4', 'm4a']];

async function recordWhisper({ getLang, onState, onLevel, maxMs, silenceMs, waitMs }) {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
  } catch (e) {
    throw err(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : 'failed', e && e.message);
  }
  const pick = MIMES.find(([m]) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(stream, pick ? { mimeType: pick[0] } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise(res => { rec.onstop = res; });

  // level meter + end-of-speech detection
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = AC ? new AC() : null;
  let timer = 0, heard = false, cancelled = false;
  const stop = () => { if (rec.state !== 'inactive') rec.stop(); };
  stopCurrent = stop;
  cancelCurrent = () => { cancelled = true; stop(); };
  if (ctx) {
    const an = ctx.createAnalyser(); an.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize);
    const t0 = performance.now();
    let floor = 0.01, lastVoice = 0, voiced = 0;
    const tick = () => {
      an.getFloatTimeDomainData(buf);
      let s = 0; for (const x of buf) s += x * x;
      const rms = Math.sqrt(s / buf.length), now = performance.now();
      if (now - t0 < 350) floor = Math.max(floor, rms * 1.2);         // ambient noise
      const thr = Math.max(0.02, floor * 2.2);
      onLevel(Math.min(1, rms / 0.2));
      if (rms > thr) { voiced += 1; lastVoice = now; if (voiced > 6) heard = true; }
      if ((heard && now - lastVoice > silenceMs) || (!heard && now - t0 > waitMs) || now - t0 > maxMs) stop(); // pause after speaking / nobody spoke / too long
    };
    // a timer, not requestAnimationFrame: it keeps running when the tab is in the background
    timer = setInterval(tick, 60);
  } else {
    heard = true;
    timer = setTimeout(stop, Math.min(maxMs, 8000));
  }
  onState('listening');
  rec.start(250);
  await stopped;
  clearInterval(timer); clearTimeout(timer);
  stopCurrent = cancelCurrent = null;
  stream.getTracks().forEach(t => t.stop());
  if (ctx) ctx.close().catch(() => {});
  onLevel(0);
  if (cancelled) { onState('idle'); return ''; }
  if (!heard || !chunks.length) { onState('idle'); throw err('nospeech'); }
  onState('processing');
  try {
    const type = rec.mimeType || (pick && pick[0]) || 'audio/webm';
    const ext = (MIMES.find(([m]) => type.startsWith(m.split(';')[0])) || [0, 'webm'])[1];
    const fd = new FormData();
    fd.append('audio', new Blob(chunks, { type: type.split(';')[0] }), `speech.${ext}`);
    fd.append('lang', getLang());
    const r = await fetch('api/transcribe', { method: 'POST', body: fd });
    const j = r.ok ? await r.json() : null;
    if (!j || !j.ok) throw err('failed', (j && j.error) || `HTTP ${r.status}`);
    if (!j.text) throw err('nospeech');
    return j.text;
  } finally { onState('idle'); }
}
