// Choosing the narrator objectively (6 Oct 2026): each candidate ElevenLabs voice says the same lines, a speech-to-text
// pass (Groq Whisper large v3) writes back what it heard, and the voices are ranked by how many words come back right —
// above all the name «مشكاة». Keys from .dev.vars, never printed.
//   node tools/voice_pick.mjs <voice_id:name> …
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const env = {};
for (const line of readFileSync(join(ROOT, '.dev.vars'), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
const OUT = join(ROOT, '..', '04_LIVRABLES', 'video', 'eleven_probe'); mkdirSync(OUT, { recursive: true });
const LINES = [
  'هَذِهِ مِشْكَاةُ: نَجْمَعُ لَكَ نُورَ الْبَيَانِ، وَلَا نَكْتُبُ عَنِ اللَّهِ مَا لَمْ يُنْقَلْ.',
  'الذَّكَاءُ الاصْطِنَاعِيُّ لَا يَكْتُبُ حَرْفًا: يَخْتَارُ بِالأَرْقَامِ آيَاتٍ وَجُمَلَ تَفْسِيرٍ مِنْ قَائِمَةٍ مُغْلَقَةٍ.',
  'أَهْلًا بِكَ فِي مِشْكَاةَ. كَيْفَ يُمْكِنُنِي أَنْ أُسَاعِدَكَ؟',
];
const norm = (s) => String(s).replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^ء-ي\s]/g, ' ').split(/\s+/).filter(Boolean);
async function tts(voice, text, model) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true } }) });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return Buffer.from(await r.arrayBuffer());
}
async function stt(buf) {
  const fd = new FormData(); fd.append('model', 'whisper-large-v3'); fd.append('language', 'ar'); fd.append('file', new Blob([buf], { type: 'audio/mpeg' }), 'a.mp3');
  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { authorization: 'Bearer ' + env.GROQ_API_KEY }, body: fd });
  return (await r.json()).text || '';
}
const res = [];
for (const arg of process.argv.slice(2)) {
  const [voice, name, model = 'eleven_multilingual_v2'] = arg.split(':');
  let ok = 0, tot = 0, nameOk = 0; const heard = [];
  try {
    for (const [k, line] of LINES.entries()) {
      const buf = await tts(voice, line, model); writeFileSync(join(OUT, `${name}_${model}_${k}.mp3`), buf);
      const h = await stt(buf); heard.push(h);
      const want = norm(line), got = new Set(norm(h));
      for (const w of want) { tot++; if (got.has(w)) ok++; }
      if (k !== 1 && /مشكا[ةه]/.test(h.replace(/[ً-ْ]/g, ''))) nameOk++;
    }
    res.push({ name, model, words: +(ok / tot).toFixed(3), name2: nameOk, heard });
    console.log(name, model, 'words', (100 * ok / tot).toFixed(1) + '%', 'name', nameOk + '/2', '|', heard.join(' || '));
  } catch (e) { console.log(name, 'error', e.message); }
}
writeFileSync(join(OUT, 'ranking.json'), JSON.stringify(res.sort((a, b) => b.name2 - a.name2 || b.words - a.words), null, 1));
