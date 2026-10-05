// Narration of the video: each hand-written Arabic line (never a verse) spoken by Groq Orpheus Arabic, saved as WAV
// with a correct header (Orpheus streams a WAV whose size fields are unset).
//   node tools/video/voice.mjs <narration.json> <out-dir>      (GROQ_API_KEY from .dev.vars, never printed)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [IN, OUT] = process.argv.slice(2);
const env = {};
for (const line of readFileSync(new URL('../../.dev.vars', import.meta.url), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
const N = JSON.parse(readFileSync(IN, 'utf8'));
mkdirSync(OUT, { recursive: true });
for (const l of N.lines) {
  const f = join(OUT, `${l.id}.wav`);
  if (existsSync(f) && !process.env.REGEN) { console.log('kept', l.id); continue; }
  let buf = null;
  for (let k = 0; k < 4 && !buf; k++) {
    const r = await fetch('https://api.groq.com/openai/v1/audio/speech', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.GROQ_API_KEY },
      body: JSON.stringify({ model: 'canopylabs/orpheus-arabic-saudi', input: l.ar, voice: N.voice || 'fahad', response_format: 'wav' }) });
    if (r.ok) buf = Buffer.from(await r.arrayBuffer());
    else { console.log(l.id, r.status, (await r.text()).slice(0, 200)); await new Promise(res => setTimeout(res, 8000 * (k + 1))); }
  }
  if (!buf) throw new Error('TTS failed for ' + l.id);
  const k = buf.indexOf('data') + 8, pcm = buf.subarray(k);
  const rate = buf.readUInt32LE(24), ch = buf.readUInt16LE(22), bits = buf.readUInt16LE(34);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * ch * bits / 8, 28); h.writeUInt16LE(ch * bits / 8, 32); h.writeUInt16LE(bits, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(f, Buffer.concat([h, pcm]));
  console.log(l.id, (pcm.length / (rate * ch * bits / 8)).toFixed(2), 's');
}
