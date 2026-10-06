// ElevenLabs narration (6 Oct 2026, author's request) — hand-written lines only, NEVER a verse (the Quran is always
// Sheikh Alafasy's human recitation). The key is read from .dev.vars (ELEVENLABS_API_KEY) and never printed.
//   node tools/voice_eleven.mjs voices                         → Arabic voices of the account and of the shared library
//   node tools/voice_eleven.mjs probe <voice_id> [model]       → «مِشكاة» said 4 ways, written to scratch for a check
//   node tools/voice_eleven.mjs video <voice_id> [model]       → 04_LIVRABLES/video/voice_eleven/<id>.wav (24 kHz mono)
//   node tools/voice_eleven.mjs intro <voice_id_ar> <voice_id_en> [model] → public/audio/intro/{ar,en}/*.mp3
// Models: eleven_multilingual_v2 (stable, Arabic), eleven_v3 (most expressive). Credits: 1 per character (v2/v3).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const env = {};
for (const line of readFileSync(join(ROOT, '.dev.vars'), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
const KEY = env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('ELEVENLABS_API_KEY missing in .dev.vars'); process.exit(1); }
const FFMPEG = process.env.FFMPEG || 'C:/Users/ASUS/AppData/Local/Programs/Python/Python313/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';
const API = 'https://api.elevenlabs.io/v1';
const H = { 'xi-api-key': KEY, 'content-type': 'application/json' };
const [cmd, a1, a2, a3] = process.argv.slice(2);

// (6 Oct) the name, for the VOICE only, in its pause form «مِشْكَاهْ»: in the middle of a sentence the voice joined it
// with its case ending («mishkātu», heard «مشكات»); with the sukun on the ha it is always «Mishkāh» (checked by
// speech-to-text, tools/voice_check.mjs). The texts on screen keep «مشكاة».
export const spokenName = (t) => String(t).replace(/(ال[ً-ْ]*)?م[ً-ْ]*ش[ً-ْ]*ك[ً-ْ]*ا[ً-ْ]*ة[ً-ْ]*/g, (m, al) => (al ? 'الْ' : '') + 'مِشْكَاهْ');
async function tts(voice, text, model = 'eleven_multilingual_v2', lang = 'ar') {
  for (let k = 0; k < 4; k++) {
    const r = await fetch(`${API}/text-to-speech/${voice}?output_format=mp3_44100_128`, { method: 'POST', headers: H,
      body: JSON.stringify({ text: lang === 'ar' ? spokenName(text) : text, model_id: model, ...(model === 'eleven_v3' || model === 'eleven_multilingual_v2' ? {} : { language_code: lang }),
        voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 0.95 } }) });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    const msg = (await r.text()).slice(0, 300); console.warn('tts', r.status, msg);
    if (r.status === 401 || r.status === 402) throw new Error('ElevenLabs: ' + msg);
    await new Promise(res => setTimeout(res, 4000 * (k + 1)));
  }
  throw new Error('ElevenLabs TTS failed');
}
const toWav = (mp3, wav) => {
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', mp3, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  // a plain 44-byte header (build3 reads the data size at byte 40)
  const b = readFileSync(wav), k = b.indexOf('data') + 8, pcm = b.subarray(k), h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(wav, Buffer.concat([h, pcm]));
};

if (cmd === 'voices') {
  const mine = await (await fetch(`${API}/voices`, { headers: H })).json();
  for (const v of mine.voices || []) console.log('mine  ', v.voice_id, v.name, JSON.stringify(v.labels || {}));
  const lib = await (await fetch(`${API}/shared-voices?page_size=60&language=ar&sort=usage_character_count_1y`, { headers: H })).json();
  for (const v of lib.voices || []) console.log('shared', v.voice_id, v.public_owner_id, '|', v.name, '|', v.gender, v.age, v.accent, v.use_case, '|', (v.description || '').slice(0, 80));
} else if (cmd === 'probe') {
  const out = resolve(ROOT, '..', '04_LIVRABLES', 'video', 'eleven_probe'); mkdirSync(out, { recursive: true });
  const forms = { a: 'أهلًا بك في مِشْكَاة.', b: 'أهلًا بك في مِشْكَاةَ.', c: 'أهلًا بك في مِشكاه.', d: 'هذه مِشْكَاةُ: نجمعُ لك نورَ البيان.' };
  for (const [k, txt] of Object.entries(forms)) { writeFileSync(join(out, `${k}.mp3`), await tts(a1, txt, a2 || 'eleven_multilingual_v2')); console.log(k, txt); }
} else if (cmd === 'video') {
  const D = resolve(ROOT, '..', '04_LIVRABLES', 'video'), N = JSON.parse(readFileSync(join(D, 'narration.json'), 'utf8')), out = join(D, 'voice_eleven');
  mkdirSync(out, { recursive: true });
  for (const l of N.lines) {
    const wav = join(out, `${l.id}.wav`); if (existsSync(wav) && !process.env.REGEN) { console.log('kept', l.id); continue; }
    const mp3 = join(out, `${l.id}.mp3`); writeFileSync(mp3, await tts(a1, l.ar_fusha || l.ar, a2 || 'eleven_multilingual_v2')); toWav(mp3, wav);
    console.log(l.id, (readFileSync(wav).readUInt32LE(40) / 48000).toFixed(2), 's');
  }
} else if (cmd === 'intro') {
  globalThis.matchMedia = () => ({ matches: false });
  const m = await import('../public/js/intro.js'), meta = {};
  for (const [lang, voice] of [['ar', a1], ['en', a2]]) {
    const lines = m.lines(lang), out = join(ROOT, 'public', 'audio', 'intro', lang);
    for (const [id, text] of Object.entries(lines)) { writeFileSync(join(out, `${id}.mp3`), await tts(voice, text, a3 || 'eleven_multilingual_v2', lang)); console.log(lang, id); }
    meta[lang] = lines;
  }
  writeFileSync(join(ROOT, 'public', 'audio', 'intro', 'lines.json'), JSON.stringify({ voices: { ar: 'ElevenLabs ' + a1, en: 'ElevenLabs ' + a2, model: a3 || 'eleven_multilingual_v2' }, lines: meta }, null, 1));
} else if (cmd === 'welcome') {
  // the spoken welcome after the basmala (i18n.js welcomeSpoken), fully vowelled for the voice
  writeFileSync(join(ROOT, 'public', 'audio', 'welcome_ar.mp3'), await tts(a1, 'أَهْلًا بِكَ فِي مِشْكَاة. ابْحَثْ فِي الْقُرْآنِ الْكَرِيمِ بِسُؤَالٍ، أَوْ كَلِمَةٍ، أَوْ آيَةٍ.', a2 || 'eleven_multilingual_v2'));
  console.log('welcome_ar.mp3');
} else console.log('usage: voices | probe <voice> | video <voice> [model] | intro <voice_ar> <voice_en> [model]');
