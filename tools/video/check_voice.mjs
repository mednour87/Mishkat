// re-transcribes each narration line with Whisper (Groq) to check what a listener hears
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const DIR = process.argv[2];
const env = {};
for (const line of readFileSync(new URL('../../.dev.vars', import.meta.url), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
for (const f of readdirSync(DIR).filter(x => x.endsWith('.wav')).sort()) {
  const fd = new FormData();
  fd.append('file', new Blob([readFileSync(join(DIR, f))], { type: 'audio/wav' }), f);
  fd.append('model', 'whisper-large-v3-turbo'); fd.append('language', 'ar'); fd.append('temperature', '0');
  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { authorization: 'Bearer ' + env.GROQ_API_KEY }, body: fd });
  const j = await r.json();
  console.log(f, '|', j.text || JSON.stringify(j).slice(0, 150));
}
