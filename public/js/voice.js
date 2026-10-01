// Voice input: Whisper (server, handles dialects and auto-language) when
// available, otherwise the browser's Web Speech API. Returns plain text only.
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const BCP = { ar: 'ar-SA', en: 'en-US', fr: 'fr-FR' };

export function voiceSupported(serverStt) {
  return !!(SR || (serverStt && typeof MediaRecorder !== 'undefined' && navigator.mediaDevices));
}

// listen({ lang, serverStt, onState }) → Promise<string>
// onState('listening' | 'processing' | 'idle'); returns '' when nothing was heard.
export function listen({ lang = 'ar', serverStt = false, onState = () => {}, maxMs = 8000 } = {}) {
  if (serverStt && typeof MediaRecorder !== 'undefined' && navigator.mediaDevices) return recordWhisper(lang, onState, maxMs);
  if (SR) return webSpeech(lang, onState, maxMs);
  return Promise.reject(new Error('voice not supported'));
}

let stopCurrent = null;
export function stopListening() { if (stopCurrent) stopCurrent(); }

function webSpeech(lang, onState, maxMs) {
  return new Promise((resolve, reject) => {
    const rec = new SR();
    rec.lang = BCP[lang] || 'ar-SA';
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    let done = false, text = '';
    const finish = () => { if (done) return; done = true; stopCurrent = null; onState('idle'); resolve(text.trim()); };
    rec.onresult = (ev) => { text = ev.results[0][0].transcript || ''; };
    rec.onerror = (ev) => { if (!done) { done = true; stopCurrent = null; onState('idle'); reject(new Error(ev.error || 'speech error')); } };
    rec.onend = finish;
    stopCurrent = () => rec.stop();
    setTimeout(() => { try { rec.stop(); } catch (e) { /* already stopped */ } }, maxMs);
    onState('listening');
    rec.start();
  });
}

async function recordWhisper(lang, onState, maxMs) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise(res => { rec.onstop = res; });
  stopCurrent = () => { if (rec.state !== 'inactive') rec.stop(); };
  onState('listening');
  rec.start();
  const timer = setTimeout(stopCurrent, maxMs);
  await stopped;
  clearTimeout(timer);
  stopCurrent = null;
  stream.getTracks().forEach(t => t.stop());
  onState('processing');
  try {
    const fd = new FormData();
    fd.append('audio', new Blob(chunks, { type: rec.mimeType || 'audio/webm' }), 'speech.webm');
    fd.append('lang', lang);
    const r = await fetch('api/transcribe', { method: 'POST', body: fd });
    const j = r.ok ? await r.json() : null;
    if (!j || !j.ok) throw new Error((j && j.error) || 'transcription failed');
    return j.text;
  } finally { onState('idle'); }
}
