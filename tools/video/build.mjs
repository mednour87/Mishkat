// The 2-minute video, assembled from the real footage (capture.mjs), the motion-design layer (overlay.html, drawn frame
// by frame in Chrome with a transparent background), the Arabic narration (voice.mjs) and the real recitations.
//   node tools/video/build.mjs <video-dir> [--summary eval/rag1000/summary_v2.json] [--from-overlay]
// <video-dir> holds footage/*.mp4, voice/*.wav, audio/alafasy_*.mp3, narration.json; writes Mishkat_video_2min.mp4.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { launch, sleep } from './cdp.mjs';

const DIR = resolve(process.argv[2] || '../04_LIVRABLES/video');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FFMPEG = process.env.FFMPEG || 'C:/Users/ASUS/AppData/Local/Programs/Python/Python313/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';
const FPS = 30, XF = 0.35;
const N = JSON.parse(readFileSync(join(DIR, 'narration.json'), 'utf8'));
const VO = Object.fromEntries(N.lines.map(l => [l.id, l]));
const wavDur = (f) => { const b = readFileSync(f); return b.readUInt32LE(40) / b.readUInt32LE(28); };
for (const id of Object.keys(VO)) VO[id].dur = wavDur(join(DIR, 'voice', `${id}.wav`));

// ------------------------------------------------ measured figures for the card (never typed by hand)
const S = JSON.parse(readFileSync(resolve(arg('summary', 'eval/rag1000/summary_v2.json')), 'utf8'));
const QQA = { mrr: 0.616, best: 0.576 };   // eval/qqa23/RESULTS.md — 3 runs on the free tier, 4 Oct 2026
const pctOf = (x) => Math.round(1000 * x) / 10;

// ------------------------------------------------ the base track: segments of footage and full-screen cards
const SEG = [
  { id: 'intro', clip: 'intro', in: 1.6, dur: 8.4 },
  { id: 'home', clip: 'home', in: 0.5, dur: 5.8 },
  { id: 'search', clip: 'sadness', in: 0.3, dur: 22.4 },
  { id: 'recite', clip: 'recite', in: 2.2, dur: 8.6 },
  { id: 'english', clip: 'english', in: 0.5, dur: 3.6 },
  { id: 'english2', clip: 'english', in: 9.0, dur: 6.4 },
  { id: 'ruling', clip: 'ruling', in: 0.3, dur: 12.2 },
  { id: 'misquote', clip: 'misquote', in: 4.0, dur: 7.2 },
  { id: 'crisis', clip: 'crisis', in: 4.5, dur: 11.8 },
  { id: 'stats', color: true, dur: 6.6 },
  { id: 'tajweed', clip: 'tajweed', in: 1.6, dur: 3.2 },
  { id: 'khatma', clip: 'services', in: 0.4, dur: 2.6 },
  { id: 'prayer', clip: 'services', in: 5.6, dur: 2.6 },
  { id: 'qibla', clip: 'services', in: 10.9, dur: 2.4 },
  { id: 'mosques', clip: 'services', in: 18.0, dur: 2.8 },
  { id: 'athkar', clip: 'services', in: 23.6, dur: 2.4 },
  { id: 'tekrar', clip: 'services', in: 28.2, dur: 2.4 },
  { id: 'lamp', clip: 'lamp', in: 0.9, dur: 3.6 },
  { id: 'shapes', clip: 'shapes', in: 3.4, dur: 2.6 },
  { id: 'end', color: true, dur: 6.8 },
];
let t = 0;
for (const s of SEG) { s.at = t; t += s.dur - XF; }
const TOTAL = +(t + XF).toFixed(2);
const at = (id, rel = 0) => SEG.find(s => s.id === id).at + rel;

// ------------------------------------------------ narration, captions, tags, motion graphics
const events = [], audio = [];
const say = (vid, seg, rel) => { const v = VO[vid]; audio.push({ file: join(DIR, 'voice', `${vid}.wav`), at: at(seg, rel), gain: 1.9 }); events.push({ kind: 'cap', at: at(seg, rel) - 0.1, dur: v.dur + 0.45, ar: v.ar, en: v.en }); };
const tag = (seg, n, ar, en, rel = 0.25, dur = 3.4) => events.push({ kind: 'tag', at: at(seg, rel), dur, n, ar, en });
const cap = (seg, rel, dur, ar, en) => events.push({ kind: 'cap', at: at(seg, rel), dur, ar, en });

// the basmala of the film is recited from 3.36 s of its footage (first word lit, measured on the frames)
const BASMALA_AT = 3.36;
events.push({ kind: 'brand', at: at('intro', 4.0), dur: 4.3 });
audio.push({ file: join(DIR, 'audio', 'alafasy_001001.mp3'), at: at('intro', BASMALA_AT - 1.6), gain: 0.8 });
say('v01', 'home', 0.9);
tag('search', '١', 'البحث الذكي', 'Smart search', 0.2, 4.2);
say('v02', 'search', 0.7);
say('v03', 'search', 5.5);
say('v04', 'search', 16.6);
events.push({ kind: 'pipe', at: at('search', 5.0), dur: 16.9, steps: [
  { at: 0.0, ar: 'سؤالك بكلماتك', en: 'Your question, in your words' },
  { at: 1.6, ar: 'قائمة مغلقة: آيات المصحف وجمل التفسير المعتمد', en: 'Closed list: Mushaf verses + vetted tafsir sentences' },
  { at: 4.6, ar: 'الذكاء الاصطناعي يختار بالأرقام فقط', en: 'The AI only picks numbers' },
  { at: 11.6, ar: 'نموذج ثانٍ يتحقق من الصلة', en: 'A second model checks relevance' },
  { at: 14.0, ar: 'عرضٌ بالحروف مع المصدر', en: 'Shown verbatim, with its source' },
] });
tag('recite', '٢', 'التلاوة المتزامنة', 'Word-synchronised recitation', 0.3, 3.2);
cap('recite', 3.8, 4.4, 'تلاوة الشيخ مشاري العفاسي، والكلمة المتلوّة تضيء في المصحف والمجرّة', 'Sheikh Mishary Alafasy — the recited word lights up in the Mushaf and in the galaxy');
audio.push({ file: join(DIR, 'audio', 'alafasy_013028.mp3'), at: at('recite', 3.14 - 2.2), gain: 0.8, fadeOut: { at: 8.6 - (3.14 - 2.2) - 1.1, d: 1.1 } });
tag('english', '٣', 'بالعربية والإنجليزية', 'Arabic & English', 0.25, 3.0);
say('v05', 'english', 1.0);
tag('ruling', '٤', 'الأحكام: لا فتوى', 'Rulings: never a fatwa', 0.25, 3.4);
say('v06', 'ruling', 0.6);
tag('misquote', '٥', 'كشف الاقتباس المحرَّف', 'Misquote check', 0.25, 3.0);
say('v07', 'misquote', 2.4);
tag('crisis', '٦', 'الأمان أولًا', 'Safety first', 0.25, 3.0);
say('v08', 'crisis', 1.0);
say('v09', 'crisis', 7.7);
const R = S.relevance;
events.push({ kind: 'stats', at: at('stats', 0), dur: SEG.find(s => s.id === 'stats').dur, title: { ar: 'اختبار على ١٬٠٠٠ سؤال', en: `Tested on ${S.questions.toLocaleString('en')} questions — Arabic & English` },
  kpis: [
    { v: S.verbatim.passages ? 100 * (S.verbatim.passages - S.verbatim.notFound) / S.verbatim.passages : 100, dec: 0, suf: '%', good: true, ar: 'من الجمل المعروضة موجودة بحروفها في مصدرها', en: `of ${S.verbatim.passages.toLocaleString('en')} quoted sentences found word for word in their source` },
    { v: pctOf(R.top1Relevant[0]), dec: 1, suf: '%', ar: 'أوّل آية ذات صلة بالسؤال', en: 'first verse relevant — independent judge' },
    { v: pctOf(R.briefOnTopic[0]), dec: 1, suf: '%', ar: 'جواب مختصر في صلب السؤال', en: 'short answers on topic — independent judge' },
    { v: QQA.mrr, dec: 3, suf: '', ar: 'على مقياس دولي منشور للبحث في القرآن', en: `Qur'an QA 2023, MRR@10 — comparable to the best published (${QQA.best})` },
  ], foot: `Judge: ${S.judge || 'DeepSeek-V3.2 (another model family)'} · 95 % bootstrap intervals in eval/rag1000/REPORT · ${S.errors} technical errors` });
say('v10', 'stats', 0.4);
tag('tajweed', '٧', 'في يومك', 'Every day', 0.2, 3.0);
say('v11', 'tajweed', 0.3);
for (const [seg, ar, en] of [['tajweed', 'التجويد بالألوان', 'Tajweed colours'], ['khatma', 'الختمة', 'Khatma plan'], ['prayer', 'مواقيت الصلاة', 'Prayer times'], ['qibla', 'القبلة', 'Qibla'], ['mosques', 'المساجد القريبة', 'Nearby mosques'], ['athkar', 'الأذكار بدرجتها', 'Graded adhkar'], ['tekrar', 'التكرار والحفظ', 'Repetition & memorising']]) {
  if (seg !== 'tajweed') events.push({ kind: 'tag', at: at(seg, 0.15), dur: SEG.find(s => s.id === seg).dur - 0.45, ar, en });
}
tag('lamp', '٨', 'المشكاة تضيء بختمتك', 'Your khatma lights the lamp', 0.2, 5.2);
say('v12', 'lamp', 0.4);
events.push({ kind: 'end', at: at('end', 0), dur: SEG.find(s => s.id === 'end').dur + 0.2, url: 'mishkat-4m1.pages.dev', ar: VO.v13.ar.replace(/^هذه\s+/, ''), en: VO.v13.en, foot: 'Islamic AI Challenge 2026 · المسار 01' });
say('v13', 'end', 0.5);
// the end card speaks for itself: no caption box over it
for (let k = events.length - 1; k >= 0; k--) if (events[k].kind === 'cap' && events[k].ar === VO.v13.ar) events.splice(k, 1);
// the overlay never draws over the full-screen cards except their own content
writeFileSync(join(DIR, 'timeline.json'), JSON.stringify({ total: TOTAL, segments: SEG, events, audio: audio.map(a => ({ ...a, file: a.file.replace(DIR, '.') })) }, null, 1));
console.log('total', TOTAL, 's');
if (TOTAL > 120) throw new Error('longer than 2 minutes');

// ------------------------------------------------ 1. the base track (footage + cards), cross-faded
const base = join(DIR, 'base.mp4');
if (!process.argv.includes('--from-overlay') || !existsSync(base)) {
  const inputs = [], parts = [];
  SEG.forEach((s, k) => {
    if (s.color) { inputs.push('-f', 'lavfi', '-t', String(s.dur), '-i', `color=c=0x03050c:s=1920x1080:r=${FPS}`); parts.push(`[${k}:v]format=yuv420p,setsar=1,fps=${FPS}[s${k}]`); }
    else { inputs.push('-ss', String(s.in), '-t', String(s.dur), '-i', join(DIR, 'footage', `${s.clip}.mp4`)); parts.push(`[${k}:v]setpts=PTS-STARTPTS,scale=1920:1080,format=yuv420p,setsar=1,fps=${FPS}[s${k}]`); }
  });
  let prev = 's0', acc = SEG[0].dur;
  for (let k = 1; k < SEG.length; k++) {
    const off = (acc - XF).toFixed(3);
    parts.push(`[${prev}][s${k}]xfade=transition=fade:duration=${XF}:offset=${off}[x${k}]`);
    prev = `x${k}`; acc = acc - XF + SEG[k].dur;
  }
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', parts.join(';'), '-map', `[${prev}]`, '-r', String(FPS), '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', base], { stdio: 'inherit', maxBuffer: 1 << 26 });
  console.log('base', base);
}

// ------------------------------------------------ 2. the motion-design layer, frame by frame
const OV = join(DIR, 'overlay_frames');
const ROOT = resolve('.');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(8796);
if (existsSync(OV)) rmSync(OV, { recursive: true });
mkdirSync(OV, { recursive: true });
const b = await launch({ port: 9460, gpu: true, w: 1920, h: 1080 });
try {
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await b.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.TL = ${JSON.stringify({ events })};` });
  await b.send('Page.navigate', { url: 'http://localhost:8796/tools/video/overlay.html' });
  for (let k = 0; k < 100 && !(await b.evalJs('!!window.__ready && !!window.render')); k++) await sleep(100);
  const nF = Math.ceil(TOTAL * FPS);
  let prevSig = null, blank = null, last = null;
  for (let f = 0; f < nF; f++) {
    const tt = f / FPS;
    const active = events.some(e => tt >= e.at && tt <= e.at + e.dur);
    const file = join(OV, `${String(f).padStart(5, '0')}.png`);
    if (!active) {
      if (!blank) { await b.evalJs(`render(${tt}), 1`); const { data } = await b.send('Page.captureScreenshot', { format: 'png' }); blank = join(OV, 'blank.png'); writeFileSync(blank, Buffer.from(data, 'base64')); }
      copyFileSync(blank, file); prevSig = null; continue;
    }
    const sig = await b.evalJs(`render(${tt}), [...document.querySelectorAll('#root > .L')].map(d => d.style.opacity + d.style.transform + d.style.display + [...d.querySelectorAll('[style]')].map(x => x.getAttribute('style') + x.className + x.textContent.slice(0, 12)).join('')).join('|')`);
    if (sig === prevSig && last) { copyFileSync(last, file); continue; }
    const { data } = await b.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(file, Buffer.from(data, 'base64'));
    prevSig = sig; last = file;
    if (f % 300 === 0) console.log('overlay', f, '/', nF);
  }
} finally { await b.close(); srv.close(); }

// ------------------------------------------------ 3. composition + sound
const out = join(DIR, 'Mishkat_video_2min.mp4');
const ain = [], af = [];
audio.forEach((a, k) => {
  ain.push('-i', a.file);
  const ms = Math.round(a.at * 1000);
  let chain = `[${k + 2}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${a.gain}`;
  if (a.fadeOut) chain += `,afade=t=out:st=${a.fadeOut.at.toFixed(2)}:d=${a.fadeOut.d}`;
  af.push(`${chain},adelay=${ms}|${ms}[a${k}]`);
});
const mix = `${audio.map((_, k) => `[a${k}]`).join('')}amix=inputs=${audio.length}:normalize=0:duration=longest,alimiter=limit=0.95,apad=whole_dur=${TOTAL}[aout]`;
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', base, '-framerate', String(FPS), '-i', join(OV, '%05d.png'), ...ain,
  '-filter_complex', `[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[vout];${af.join(';')};${mix}`,
  '-map', '[vout]', '-map', '[aout]', '-t', String(TOTAL), '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out], { stdio: 'inherit', maxBuffer: 1 << 26 });
console.log('video', out, (statSync(out).size / 1e6).toFixed(1), 'MB', TOTAL, 's');
