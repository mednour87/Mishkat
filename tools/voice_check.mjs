// Every narration line, heard back (6 Oct 2026): a speech-to-text pass (Groq Whisper large v3) on each file of a voice
// folder, compared word by word with the line it should say — and the name «مشكاة» checked where it occurs.
//   node tools/voice_check.mjs <voice-dir> [narration.json]
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const env = {};
for (const line of readFileSync(join(ROOT, '.dev.vars'), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
const DIR = resolve(process.argv[2]), N = JSON.parse(readFileSync(process.argv[3] || join(DIR, '..', 'narration.json'), 'utf8'));
const norm = (s) => String(s).replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^ء-ي\s]/g, ' ').split(/\s+/).filter(Boolean);
let bad = 0;
for (const l of N.lines) {
  const f = readdirSync(DIR).find(x => x === `${l.id}.wav` || x === `${l.id}.mp3`); if (!f) continue;
  const fd = new FormData(); fd.append('model', 'whisper-large-v3'); fd.append('language', 'ar'); fd.append('file', new Blob([readFileSync(join(DIR, f))]), f);
  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { authorization: 'Bearer ' + env.GROQ_API_KEY }, body: fd });
  const h = (await r.json()).text || '', want = norm(l.ar_fusha || l.ar), got = new Set(norm(h));
  const miss = want.filter(w => !got.has(w)), name = /مشك/.test(l.ar) ? (/مشكا[ةه]/.test(h.replace(/[ً-ْ]/g, '')) ? 'name ok' : 'NAME ?') : '';
  if (miss.length > 1 || name === 'NAME ?') bad++;
  console.log(l.id.padEnd(4), `${(100 * (want.length - miss.length) / want.length).toFixed(0)}%`, name, miss.length ? '— missed: ' + miss.join(' ') : '', '|', h.trim());
  await new Promise(res => setTimeout(res, 2500));
}
console.log(bad ? `${bad} line(s) to look at` : 'all lines heard right');
