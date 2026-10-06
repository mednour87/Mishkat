// Builds public/data/asma.json — the Most Beautiful Names of Allah for the «الأسماء الحسنى» panel.
//
//   node data_build/build_asma.mjs
//
// Inputs (data_build/cache/asma/):
//   aladhan_asma.json  the list of 99 names with transliteration and English meaning (api.aladhan.com/v1/asmaAlHusna),
//                      the list narrated by at-Tirmidhi (3507), the one most people learn
//   asma_scribe.json   word timings of the recording (ElevenLabs Scribe, data_build/asma_scribe.mjs) — T123: used first;
//                      the Whisper timings drifted by about 4 s at the end and the last three names fell on silence
//   asma_stt.json      word timings of the recording (Whisper large-v3 on Groq, verbose_json, word granularity), fallback
// Audio: Wikimedia Commons «Asma Ul Husna.ogg» (CC0). Only the names are kept: from «الله الذي لا إله إلا هو»
// to «الصبور»; the closing supplication of the recording is cut off.
//
// No verse list is computed here: a word-for-word lookup confuses the divine name with the same word in another sense
// («الأول» in «أول كافر»). The panel sends the name to Mishkat's own Quran word search instead.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const CACHE = 'data_build/cache/asma/';
const AUDIO_IN = process.env.ASMA_OGG;              // the original .ogg (downloaded once, not kept in the repository)
const CUT_FROM = 4.0, CUT_TO = 160.75;              // seconds kept in the recording («الصبور» ends at 160.42)

const names = JSON.parse(readFileSync(CACHE + 'aladhan_asma.json', 'utf8')).data;
const words = JSON.parse(readFileSync(CACHE + (existsSync(CACHE + 'asma_scribe.json') ? 'asma_scribe.json' : 'asma_stt.json'), 'utf8')).words;

// Arabic letters only, no vowel marks, one form of alif / ya / ta marbuta
const plain = (s) => s
  .replace(/[ً-ٰٟۖ-ۭـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  .replace(/[^ء-ي\s]/g, '').replace(/\s+/g, ' ').trim();
const bare = (s) => plain(s).replace(/^ال/, '').replace(/ ال/g, ' ');

// edit distance, used to match a name with what the speech-to-text heard
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// 1. align the 99 names with the heard words, in order: each name takes the closest word among the next few
const heard = words.map(w => ({ ...w, key: bare(w.word) }));
let k = heard.findIndex(w => w.key === 'رحمن');
const timed = [];
for (const n of names) {
  const key = bare(n.name).split(' ')[0];
  let best = -1, bestD = Infinity;
  for (let j = k; j < Math.min(heard.length, k + 4); j++) {
    const dd = distance(key, heard[j].key) / Math.max(key.length, 1);
    if (dd < bestD) { bestD = dd; best = j; }
  }
  if (best < 0 || bestD > 0.6) { timed.push(null); continue; }
  timed.push(heard[best].start);
  k = best + 1 + (n.name.split(/\s+/).length - 1);   // a name of two or three words uses as many heard words
}
// a name the speech-to-text missed gets a time between its neighbours
for (let i = 0; i < timed.length; i++) {
  if (timed[i] != null) continue;
  let a = i - 1, b = i + 1;
  while (b < timed.length && timed[b] == null) b++;
  const t0 = timed[a] ?? CUT_FROM, t1 = timed[b] ?? CUT_TO;
  timed[i] = t0 + (t1 - t0) * (i - a) / (b - a);
}

const out = names.map((n, i) => {
  return {
    n: n.number, ar: n.name, tr: n.transliteration, en: n.en.meaning,
    start: +(timed[i] - CUT_FROM - 0.15).toFixed(2),
    end: +((i + 1 < timed.length ? timed[i + 1] : CUT_TO) - CUT_FROM - 0.15).toFixed(2)
  };
});

writeFileSync('public/data/asma.json', JSON.stringify({
  source: {
    list: 'api.aladhan.com/v1/asmaAlHusna — the list narrated by at-Tirmidhi (3507)',
    audio: 'Wikimedia Commons, «Asma Ul Husna.ogg», CC0 (https://commons.wikimedia.org/wiki/File:Asma_Ul_Husna.ogg); names only',
    timings: 'ElevenLabs Scribe word timings, aligned to the list (data_build/asma_scribe.mjs, data_build/build_asma.mjs)',
  },
  audio: 'audio/asma/asma_husna.mp3?v=t123',   // T123: the recording was cut again (a cached copy lacked the last names)
  intro: { start: 0, end: +(timed[0] - CUT_FROM - 0.15).toFixed(2) },
  names: out,
}, null, 1));

if (AUDIO_IN) {
  mkdirSync('public/audio/asma', { recursive: true });
  const ffmpeg = execFileSync('python', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
  // seek on the input (-ss before -i) so that the fade's time is counted from the cut, not from the original's start
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-ss', String(CUT_FROM), '-i', AUDIO_IN, '-t', (CUT_TO - CUT_FROM).toFixed(2),
    // T123: the fade was placed on the original's clock and silenced the last 4 s (the last three names); a plain gain
    // + limiter replaces the one-pass loudnorm
    '-af', 'volume=4dB,alimiter=limit=0.85,afade=t=out:st=' + (CUT_TO - CUT_FROM - 0.25).toFixed(2) + ':d=0.25', '-ac', '1', '-ar', '44100', '-b:a', '80k', 'public/audio/asma/asma_husna.mp3']);
}
console.log('names', out.length, '· first', out[0].start, '· last', out[98].start);
