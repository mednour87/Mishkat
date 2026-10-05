// The 2-minute video, version 2 (5 October 2026, night — the author's review): the domain on screen all along, a
// chapter rail, light sweeps and a bridge card between the parts (no «parachuted» cut from the demo to the measures),
// the services narrated one by one (memorising, child mode, khatma, prayer/qibla/mosques, install), the Challenge
// flower shape, and the challenge's name, address and logo at the end. Two narrations of the same hand-written lines:
//   node tools/video/build2.mjs <video-dir> --voice voice        --out Mishkat_video_2min_saudi.mp4   (Orpheus, Saudi)
//   node tools/video/build2.mjs <video-dir> --voice voice_fusha  --out Mishkat_video_2min_fusha.mp4   (Hamed, fusha)
// Footage: <video-dir>/footage2 (tools/video/capture.mjs on the current site). Figures: eval/rag1000 summary (never typed).
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { launch, sleep } from './cdp.mjs';

const DIR = resolve(process.argv[2] || '../04_LIVRABLES/video');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VOICE = arg('voice', 'voice'), OUTF = arg('out', 'Mishkat_video_2min.mp4'), FOOT = arg('footage', 'footage2');
const FFMPEG = process.env.FFMPEG || 'C:/Users/ASUS/AppData/Local/Programs/Python/Python313/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';
const FPS = 30, XF = 0.65;
const N = JSON.parse(readFileSync(join(DIR, 'narration.json'), 'utf8'));
const VO = Object.fromEntries(N.lines.map(l => [l.id, l]));
const wavDur = (f) => { const b = readFileSync(f); return b.readUInt32LE(40) / b.readUInt32LE(28); };
for (const id of Object.keys(VO)) VO[id].dur = wavDur(join(DIR, VOICE, `${id}.wav`));

const S = JSON.parse(readFileSync(resolve(arg('summary', 'eval/rag1000/summary_v4-v4j2.json')), 'utf8'));
const QQA = { mrr: 0.616, best: 0.576 };   // eval/qqa23/RESULTS.md — 3 runs on the free tier, 4 Oct 2026
const pctOf = (x) => Math.round(1000 * x) / 10;

// ------------------------------------------------ segments (footage or full-screen cards), with their transition in
const SEG = [
  { id: 'intro', clip: 'intro', in: 1.6, dur: 6.4 },
  { id: 'home', clip: 'home', in: 0.5, dur: 5.5, tr: 'fadeblack' },
  { id: 'search', clip: 'sadness', in: 0.3, dur: 19.5, tr: 'circleopen' },
  { id: 'recite', clip: 'recite', in: 2.2, dur: 6.5, tr: 'smoothleft' },
  { id: 'english', clip: 'english', in: 6.0, dur: 5.0, tr: 'smoothleft' },
  { id: 'ruling', clip: 'ruling', in: 3.5, dur: 9.0, tr: 'smoothleft' },
  { id: 'crisis', clip: 'crisis', in: 4.5, dur: 7.0, tr: 'smoothleft' },
  { id: 'stats', color: true, dur: 11.0, tr: 'fadeblack' },
  { id: 'bridge', color: true, dur: 6.0, tr: 'fade' },
  { id: 'tekrar', clip: 'tekrar', in: 4.5, dur: 10.0, tr: 'circleopen' },
  { id: 'child', clip: 'child', in: 2.0, dur: 8.3, tr: 'smoothleft' },
  { id: 'khatma', clip: 'khatma', in: 0.4, dur: 6.6, tr: 'smoothleft' },
  { id: 'prayer', clip: 'services', in: 5.6, dur: 2.6, tr: 'smoothleft' },
  { id: 'qibla', clip: 'services', in: 10.9, dur: 2.5, tr: 'fade' },
  { id: 'mosques', clip: 'services', in: 17.4, dur: 2.7, tr: 'fade' },
  { id: 'install', clip: 'install', in: 3.0, dur: 7.4, tr: 'smoothleft' },
  { id: 'zahra', clip: 'shapes', in: 0.6, dur: 2.6, tr: 'circleopen' },
  { id: 'end', color: true, dur: 12.0, tr: 'fadeblack' },
];
let t = 0;
for (const s of SEG) { s.at = t; t += s.dur - XF; }
const TOTAL = +(t + XF).toFixed(2);
const at = (id, rel = 0) => SEG.find(s => s.id === id).at + rel;
const segDur = (id) => SEG.find(s => s.id === id).dur;

// ------------------------------------------------ narration, captions, motion graphics
const events = [], audio = [];
const say = (vid, seg, rel) => { const v = VO[vid]; audio.push({ file: join(DIR, VOICE, `${vid}.wav`), at: at(seg, rel), gain: 1.9 }); events.push({ kind: 'cap', at: at(seg, rel) - 0.1, dur: v.dur + 0.45, ar: v.ar, en: v.en }); };
const tag = (seg, n, ar, en, rel = 0.25, dur = 3.4) => events.push({ kind: 'tag', at: at(seg, rel), dur, n, ar, en });
const sweep = (seg, ar, en) => events.push({ kind: 'sweep', at: at(seg, -XF / 2 - 0.35), dur: 1.4, ar, en });
const feat = (seg, icon, ar, en, points, side = 'l', rel = 0.4) => events.push({ kind: 'feat', at: at(seg, rel), dur: segDur(seg) - rel - 0.5, icon, ar, en, points, side });

// the chapter rail and the address, all along (it steps aside under the full-screen cards)
events.push({ kind: 'rail', at: at('home', 0), dur: TOTAL - at('home', 0), url: 'mishkatquran.org', chapters: [
  { at: at('home', 0), ar: 'مشكاة', en: 'Mishkat' }, { at: at('search', 0), ar: 'البحث', en: 'Search' }, { at: at('stats', 0), ar: 'الثقة', en: 'Trust' },
  { at: at('bridge', 0), ar: 'في يومك', en: 'Every day' }, { at: at('end', 0), ar: 'الختام', en: 'End' }] });

const BASMALA_AT = 3.36;
events.push({ kind: 'brand', at: at('intro', 2.4), dur: 4.0 });
audio.push({ file: join(DIR, 'audio', 'alafasy_001001.mp3'), at: at('intro', BASMALA_AT - 1.6), gain: 0.8 });
say('v01', 'home', 0.3);
sweep('search', 'البحث الذكي', 'Smart search');
tag('search', '١', 'البحث الذكي', 'Smart search', 0.3, 3.6);
say('v02', 'search', 0.5);
say('v03', 'search', 3.3);
say('v04', 'search', 13.9);
events.push({ kind: 'pipe', at: at('search', 3.1), dur: 15.8, steps: [
  { at: 0.0, ar: 'سؤالك بكلماتك', en: 'Your question, in your words' },
  { at: 1.4, ar: 'قائمة مغلقة: آيات المصحف وجمل التفسير المعتمد', en: 'Closed list: Mushaf verses + vetted tafsir sentences' },
  { at: 3.8, ar: 'الذكاء الاصطناعي يختار بالأرقام فقط', en: 'The AI only picks numbers' },
  { at: 10.8, ar: 'نموذج ثانٍ يتحقق من الصلة', en: 'A second model checks relevance' },
  { at: 13.2, ar: 'عرضٌ بالحروف مع المصدر', en: 'Shown verbatim, with its source' },
] });
tag('recite', '٢', 'التلاوة المتزامنة', 'Word-synchronised recitation', 0.3, 3.0);
cap('recite', 3.2, 3.0, 'تلاوة الشيخ مشاري العفاسي، والكلمة المتلوّة تضيء في المصحف والمجرّة', 'Sheikh Mishary Alafasy — the recited word lights up in the Mushaf and in the galaxy');
function cap(seg, rel, dur, ar, en) { events.push({ kind: 'cap', at: at(seg, rel), dur, ar, en }); }
audio.push({ file: join(DIR, 'audio', 'alafasy_013028.mp3'), at: at('recite', 3.14 - 2.2), gain: 0.8, fadeOut: { at: segDur('recite') - (3.14 - 2.2) - 1.0, d: 1.0 } });
tag('english', '٣', 'بالعربية والإنجليزية', 'Arabic & English', 0.25, 3.0);
say('v05', 'english', 0.4);
tag('ruling', '٤', 'الأحكام: لا فتوى', 'Rulings: never a fatwa', 0.25, 3.4);
say('n06', 'ruling', 0.3);
tag('crisis', '٥', 'الأمان أولًا', 'Safety first', 0.25, 3.0);
say('v08', 'crisis', 0.6);
// the bridge into the measures: a question, then the figures (no cut from a demo to a table)
sweep('stats', 'وكيف نثق بها؟', 'How can you trust it?');
const R = S.relevance;
events.push({ kind: 'stats', at: at('stats', 0), dur: segDur('stats'), title: { ar: 'وكيف نثق بها؟ اختبار على ١٬٠٠٠ سؤال', en: `How can you trust it? Tested on ${S.questions.toLocaleString('en')} questions — Arabic & English` },
  kpis: [
    { v: S.verbatim.passages ? 100 * (S.verbatim.passages - S.verbatim.notFound) / S.verbatim.passages : 100, dec: 0, suf: '%', good: true, ar: 'من الجمل المعروضة موجودة بحروفها في مصدرها', en: `of ${S.verbatim.passages.toLocaleString('en')} quoted sentences found word for word in their source` },
    { v: pctOf(R.top1Relevant[0]), dec: 1, suf: '%', ar: 'أوّل آية ذات صلة بالسؤال', en: 'first verse relevant — independent judge' },
    { v: pctOf(R.briefOnTopic[0]), dec: 1, suf: '%', ar: 'جواب مختصر في صلب السؤال', en: 'short answers on topic — independent judge' },
    { v: QQA.mrr, dec: 3, suf: '', ar: 'على مقياس دولي منشور للبحث في القرآن', en: `Qur'an QA 2023, MRR@10 — comparable to the best published (${QQA.best})` },
  ], foot: `Judge: ${S.judge || 'DeepSeek-V3.2 (another model family)'} · 95 % bootstrap intervals in eval/rag1000/REPORT · ${S.errors} technical errors` });
say('n10', 'stats', 0.4);
events.push({ kind: 'bridge', at: at('bridge', 0), dur: segDur('bridge'), ar: 'رفيقك اليومي مع القرآن', en: 'Your daily companion with the Quran', icons: ['↻', '🧒', '📖', '🕌', '📱'] });
say('f0', 'bridge', 0.35);
// the services, one by one, each with its own narration and a card whose points come one after another
tag('tekrar', '٦', 'الحفظ بالتكرار', 'Memorising by repetition', 0.2, 3.0);
feat('tekrar', '↻', 'الحفظ بالتكرار', 'Memorising by repetition', [
  { ar: 'عدّاد لكل تكرار', en: 'A counter for each repetition', at: 1.0 },
  { ar: 'لا يُحتسب قبل ٧٠٪ من وقت الشيخ', en: 'Counted only after 70 % of the reciter’s time', at: 3.4 },
  { ar: 'تشجيع دائم وعلامة من ٧ إلى ١٠', en: 'Constant encouragement, a mark from 7 to 10', at: 6.2 }]);
say('f1', 'tekrar', 0.3);
tag('child', '٧', 'وضع آمن للأطفال', 'A safe mode for children', 0.2, 3.0);
feat('child', '🧒', 'وضع آمن للأطفال', 'Safe for children', [
  { ar: 'لا فتاوى', en: 'No fatwas', at: 2.0 }, { ar: 'لا موضوعات حسّاسة', en: 'No sensitive subjects', at: 3.6 }, { ar: 'توجيه لطيف إلى الحفظ والختمة', en: 'A gentle path to memorising', at: 5.4 }]);
say('f2', 'child', 0.4);
tag('khatma', '٨', 'الختمة', 'Khatma', 0.2, 3.0);
feat('khatma', '📖', 'خطة الختمة', 'Khatma plan', [
  { ar: '«اختر لي»: خطة على وقتك', en: '«Choose for me»: a plan on your time', at: 0.8 }, { ar: 'تذكير في تقويم الهاتف', en: 'Reminders in the phone calendar', at: 2.6 },
  { ar: 'السور المقروءة تضيء في المشكاة', en: 'Surahs read light up in the lamp', at: 4.2 }]);
say('f3', 'khatma', 0.3);
for (const [seg, ar, en] of [['prayer', 'مواقيت الصلاة', 'Prayer times'], ['qibla', 'القبلة بالبوصلة', 'Qibla with the compass'], ['mosques', 'المساجد القريبة', 'Nearby mosques']])
  events.push({ kind: 'tag', at: at(seg, 0.15), dur: segDur(seg) - 0.45, ar, en });
say('f4', 'prayer', 0.3);
tag('install', '٩', 'على هاتفك وحاسوبك', 'On your phone & computer', 0.2, 3.0);
feat('install', '📱', 'ثبّت مشكاة', 'Install Mishkat', [
  { ar: 'الهاتف: «إضافة إلى الشاشة الرئيسية»', en: 'Phone: «Add to home screen»', at: 1.2 }, { ar: 'الحاسوب: زر التثبيت في المتصفح', en: 'Computer: the browser’s install button', at: 3.0 },
  { ar: 'بلا إعلانات ولا تتبّع ولا حساب', en: 'No ads, no tracking, no account', at: 4.8 }]);
say('f5', 'install', 0.3);
tag('zahra', '✿', 'زهرة التحدّي: ١٩ بتلة × ٦ سور', 'The Challenge flower: 19 petals × 6 surahs', 0.15, segDur('zahra') - 0.4);
events.push({ kind: 'end', at: at('end', 0), dur: segDur('end') + 0.2, url: 'mishkatquran.org', ar: VO.v13.ar.replace(/^هذه\s+/, ''), en: VO.v13.en, chalAt: 6.2,
  chal: { logo: '/tools/video/challenge-lockup.svg', ar: 'تحدّي الذكاء الاصطناعي في خدمة المحتوى الإسلامي ٢٠٢٦ · islamicaich.org', en: 'Islamic AI Challenge 2026 · Track 01' },
  foot: '© 2026 Mohamed Nour Bou Ali · All rights reserved' });
say('v13', 'end', 0.5);
say('e1', 'end', 6.6);
for (let k = events.length - 1; k >= 0; k--) if (events[k].kind === 'cap' && (events[k].ar === VO.v13.ar)) events.splice(k, 1);
writeFileSync(join(DIR, `timeline_${VOICE}.json`), JSON.stringify({ total: TOTAL, segments: SEG, events, audio: audio.map(a => ({ ...a, file: a.file.replace(DIR, '.') })) }, null, 1));
// every narration must end inside its part (the next part's sound must not run over it)
for (const a of audio) if (a.file.includes(VOICE)) { const id = a.file.split(/[\\/]/).pop().replace('.wav', ''), end = a.at + VO[id].dur; const seg = SEG.filter(s => s.at <= a.at + 0.01).pop(); if (id !== 'f4' && end > seg.at + seg.dur + 0.2) console.warn('narration runs over', id, (end - seg.at - seg.dur).toFixed(2), 's'); }
console.log('total', TOTAL, 's');
if (TOTAL > 120) throw new Error('longer than 2 minutes');

// ------------------------------------------------ 1. the base track (footage + cards), with varied transitions
const base = join(DIR, 'base2.mp4');
if (!process.argv.includes('--from-overlay') || !existsSync(base)) {
  const inputs = [], parts = [];
  SEG.forEach((s, k) => {
    if (s.color) { inputs.push('-f', 'lavfi', '-t', String(s.dur), '-i', `color=c=0x03050c:s=1920x1080:r=${FPS}`); parts.push(`[${k}:v]format=yuv420p,setsar=1,fps=${FPS}[s${k}]`); }
    else { inputs.push('-ss', String(s.in), '-t', String(s.dur), '-i', join(DIR, FOOT, `${s.clip}.mp4`)); parts.push(`[${k}:v]setpts=PTS-STARTPTS,scale=1920:1080,format=yuv420p,setsar=1,fps=${FPS}[s${k}]`); }
  });
  let prev = 's0', acc = SEG[0].dur;
  for (let k = 1; k < SEG.length; k++) {
    parts.push(`[${prev}][s${k}]xfade=transition=${SEG[k].tr || 'fade'}:duration=${XF}:offset=${(acc - XF).toFixed(3)}[x${k}]`);
    prev = `x${k}`; acc = acc - XF + SEG[k].dur;
  }
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', parts.join(';'), '-map', `[${prev}]`, '-r', String(FPS), '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', base], { stdio: 'inherit', maxBuffer: 1 << 26 });
  console.log('base', base);
}

// ------------------------------------------------ 2. the motion-design layer, frame by frame
const OV = join(DIR, `overlay2_${VOICE}`);
const ROOT = resolve('.');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(8797);
if (existsSync(OV)) rmSync(OV, { recursive: true });
mkdirSync(OV, { recursive: true });
const b = await launch({ port: 9461, gpu: true, w: 1920, h: 1080 });
try {
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await b.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.TL = ${JSON.stringify({ events })};` });
  await b.send('Page.navigate', { url: 'http://localhost:8797/tools/video/overlay.html' });
  for (let k = 0; k < 100 && !(await b.evalJs('!!window.__ready && !!window.render')); k++) await sleep(100);
  await sleep(600);
  const nF = Math.ceil(TOTAL * FPS);
  let prevSig = null, last = null;
  for (let f = 0; f < nF; f++) {
    const tt = f / FPS, file = join(OV, `${String(f).padStart(5, '0')}.png`);
    const sig = await b.evalJs(`render(${tt}), [...document.querySelectorAll('#root > .L')].map(d => d.style.opacity + d.style.transform + d.style.display + [...d.querySelectorAll('[style]')].map(x => x.getAttribute('style') + x.className + x.textContent.slice(0, 12)).join('')).join('|')`);
    if (sig === prevSig && last) { copyFileSync(last, file); continue; }
    const { data } = await b.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(file, Buffer.from(data, 'base64'));
    prevSig = sig; last = file;
    if (f % 300 === 0) console.log('overlay', f, '/', nF);
  }
} finally { await b.close(); srv.close(); }

// ------------------------------------------------ 3. composition + sound
const out = join(DIR, OUTF);
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
