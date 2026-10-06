// The 2-minute video, version 3 (6 October 2026 — the author's review of v2: «many overlaps, it lags in the middle and
// at the end, not enough motion graphics»). Measured on v2: 7.8 s of frozen picture on the measures card, 5.5 s on the
// end card, several 2–4 s freezes on still pages of the site; captions, cards and the rail laid over the site's own UI.
// v3 is a «studio» layout (tools/video/overlay3.html): the site plays in a window (or full screen for the opening and the
// Challenge flower), the motion graphics have their own places around it (a column for each chapter and its points, a
// band under the window for the narration, a thin rail, the name), and the background moves at every frame. The overlay
// frames are piped straight into ffmpeg (no PNG files on disk). Same narration, same figures (eval/rag1000 summary).
//   node tools/video/build3.mjs <video-dir> --voice voice_fusha --out Mishkat_video_2min_fusha.mp4
//   node tools/video/build3.mjs <video-dir> --voice voice       --out Mishkat_video_2min_saudi.mp4
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { createServer } from 'node:http';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { launch, sleep } from './cdp.mjs';

const DIR = resolve(process.argv[2] || '../04_LIVRABLES/video');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VOICE = arg('voice', 'voice_fusha'), OUTF = arg('out', 'Mishkat_video_2min_fusha.mp4'), FOOT = arg('footage', 'footage2');
const FFMPEG = process.env.FFMPEG || 'C:/Users/ASUS/AppData/Local/Programs/Python/Python313/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';
const FPS = 30, XF = 0.65, ONLY = arg('frames', '');            // --frames 10,60,118 → stills only (review)
const N = JSON.parse(readFileSync(join(DIR, 'narration.json'), 'utf8'));
const VO = Object.fromEntries(N.lines.map(l => [l.id, l]));
const wavDur = (f) => { const b = readFileSync(f); return b.readUInt32LE(40) / b.readUInt32LE(28); };
for (const id of Object.keys(VO)) VO[id].dur = wavDur(join(DIR, VOICE, `${id}.wav`));
const S = JSON.parse(readFileSync(resolve(arg('summary', 'eval/rag1000/summary_v4-v4j2.json')), 'utf8'));
const QQA = { mrr: 0.616, best: 0.576 };   // eval/qqa23/RESULTS.md — 3 runs on the free tier, 4 Oct 2026
const pctOf = (x) => Math.round(1000 * x) / 10;

// ------------------------------------------------ layouts: where the footage is drawn
const LAYOUTS = { win: { x: 472, y: 104, w: 1400, h: 788, rad: 18 }, full: { x: 0, y: 0, w: 1920, h: 1080, rad: 0 }, card: { x: 1172, y: 498, w: 0, h: 0, rad: 0 } };
const SEG = [
  { id: 'intro', clip: 'intro', in: 3.36, dur: 6.0, layout: 'full', crop: 'crop=1600:900:160:90' },   // the site film without its own buttons and rail
  { id: 'home', clip: 'home', in: 0.5, dur: 6.3, tr: 'fade', layout: 'win' },
  { id: 'search', clip: 'sadness', in: 0.3, dur: 18.8, tr: 'fade', layout: 'win' },
  { id: 'recite', clip: 'recite', in: 2.2, dur: 5.8, tr: 'smoothleft', layout: 'win' },
  { id: 'english', clip: 'english', in: 6.0, dur: 5.0, tr: 'smoothleft', layout: 'win' },
  { id: 'ruling', clip: 'ruling', in: 3.5, dur: 8.85, tr: 'smoothleft', layout: 'win' },
  { id: 'crisis', clip: 'crisis', in: 4.5, dur: 6.7, tr: 'smoothleft', layout: 'win' },
  { id: 'stats', color: true, dur: 11.2, tr: 'fade', layout: 'card' },
  { id: 'bridge', color: true, dur: 6.3, tr: 'fade', layout: 'card' },
  { id: 'tekrar', clip: 'tekrar', in: 4.5, dur: 10.2, tr: 'fade', layout: 'win' },
  { id: 'child', clip: 'child', in: 2.0, dur: 8.7, tr: 'smoothleft', layout: 'win' },
  { id: 'khatma', clip: 'khatma', in: 0.4, dur: 6.9, tr: 'smoothleft', layout: 'win' },
  { id: 'prayer', clip: 'services', in: 5.6, dur: 2.6, tr: 'smoothleft', layout: 'win' },
  { id: 'qibla', clip: 'services', in: 10.9, dur: 2.5, tr: 'fade', layout: 'win' },
  { id: 'mosques', clip: 'services', in: 17.4, dur: 4.1, tr: 'fade', layout: 'win' },
  { id: 'install', clip: 'install', in: 3.0, dur: 7.3, tr: 'smoothleft', layout: 'win' },
  { id: 'zahra', clip: 'shapes', in: 0.6, dur: 1.8, tr: 'fade', layout: 'win' },
  { id: 'end', color: true, dur: 11.9, tr: 'fade', layout: 'card' },
];
let t = 0;
for (const s of SEG) { s.at = t; t += s.dur - XF; }
const TOTAL = +(t + XF).toFixed(2);
const at = (id, rel = 0) => SEG.find(s => s.id === id).at + rel;
const segEnd = (id) => { const s = SEG.find(x => x.id === id); return s.at + s.dur; };

// ------------------------------------------------ narration, captions, motion graphics
const events = [], audio = [];
const say = (vid, seg, rel) => { const v = VO[vid]; audio.push({ file: join(DIR, VOICE, `${vid}.wav`), at: at(seg, rel), gain: 1.9 }); events.push({ kind: 'cap', at: at(seg, rel) - 0.1, dur: v.dur + 0.45, ar: v.ar, en: v.en }); };
const cap = (seg, rel, dur, ar, en) => events.push({ kind: 'cap', at: at(seg, rel), dur, ar, en });
// a column: the chapter (number, title) and its points, from the start of a part to the end of another
const col = (from, to, n, ar, en, points, steps = false) => events.push({ kind: 'col', at: at(from, 0.15), dur: segEnd(to) - at(from, 0.15) - 0.35, n, ar, en, points, steps });

events.push({ kind: 'top', at: 0, dur: TOTAL }, { kind: 'topL', at: 0, dur: TOTAL }, { kind: 'url', at: 0, dur: TOTAL, url: 'mishkatquran.org' });
events.push({ kind: 'rail', at: at('home', 0), dur: TOTAL - at('home', 0), chapters: [
  { at: at('home', 0), ar: 'مشكاة', en: 'Mishkat' }, { at: at('search', 0), ar: 'البحث', en: 'Search' }, { at: at('stats', 0), ar: 'الثقة', en: 'Trust' },
  { at: at('bridge', 0), ar: 'في يومك', en: 'Every day' }, { at: at('end', 0), ar: 'الختام', en: 'End' }] });

const BASMALA_AT = 3.36;
events.push({ kind: 'brand', at: at('intro', 2.3), dur: 3.4 });
// the basmala recited by the sheikh opens the film; no voice speaks over a recitation (6 Oct)
audio.push({ file: join(DIR, 'audio', 'alafasy_001001.mp3'), at: at('intro', BASMALA_AT - SEG[0].in), gain: 0.8 });
col('home', 'home', '', 'مجرّة القرآن', 'The Quran galaxy', [
  { ar: '٧٧٬٤٣٣ كلمة، كل كلمة نجمة', en: '77,433 words, each one a star', at: 0.5 }, { ar: 'أشكال ثلاثية الأبعاد لترتيب السور', en: '3D shapes to order the surahs', at: 1.7 }, { ar: 'بالعربية والإنجليزية', en: 'In Arabic and English', at: 2.9 }]);
say('v01', 'home', 0.9);
col('search', 'search', '01', 'البحث الذكي', 'Smart search — how an answer is built', [
  { ar: 'سؤالك بكلماتك', en: 'Your question, in your words', at: 2.9 },
  { ar: 'قائمة مغلقة: آيات المصحف وجمل التفسير', en: 'Closed list: Mushaf verses + tafsir sentences', at: 4.3 },
  { ar: 'الذكاء الاصطناعي يختار بالأرقام فقط', en: 'The AI only picks numbers', at: 6.7 },
  { ar: 'نموذج ثانٍ يتحقق من الصلة', en: 'A second model checks relevance', at: 13.7 },
  { ar: 'عرضٌ بالحروف مع المصدر', en: 'Shown verbatim, with its source', at: 16.1 }], true);
say('v02', 'search', 0.5); say('v03', 'search', 3.3); say('v04', 'search', 13.9);
col('recite', 'recite', '02', 'التلاوة المتزامنة', 'Word-synchronised recitation', [
  { ar: 'تلاوة بشرية: الشيخ مشاري العفاسي', en: 'A human reciter: Sheikh Mishary Alafasy', at: 0.6 }, { ar: 'الكلمة المتلوّة تضيء في المصحف', en: 'The recited word lights up in the Mushaf', at: 1.8 }, { ar: 'وفي المجرّة ثلاثية الأبعاد', en: 'And in the 3D galaxy', at: 3.0 }]);
cap('recite', 3.2, 3.0, 'تلاوة الشيخ مشاري العفاسي، والكلمة المتلوّة تضيء في المصحف والمجرّة', 'Sheikh Mishary Alafasy — the recited word lights up in the Mushaf and in the galaxy');
audio.push({ file: join(DIR, 'audio', 'alafasy_013028.mp3'), at: at('recite', 3.14 - 2.2), gain: 0.8, fadeOut: { at: SEG.find(s => s.id === 'recite').dur - (3.14 - 2.2) - 1.75, d: 1.0 } });   // silent before the next part
col('english', 'english', '03', 'بالعربية والإنجليزية', 'Arabic & English', [
  { ar: 'الواجهة والأسئلة باللغتين', en: 'Interface and questions in both languages', at: 0.5 }, { ar: 'ترجمة المعاني من QuranEnc', en: 'Translation of the meanings from QuranEnc', at: 1.6 }, { ar: 'المصادر نفسها، بلا توليد', en: 'The same sources, nothing generated', at: 2.7 }]);
say('v05', 'english', 0.4);
col('ruling', 'ruling', '04', 'الأحكام: لا فتوى', 'Rulings: never a fatwa', [
  { ar: 'تنبيه «سؤال حساس» بالأحمر', en: 'A red «sensitive question» notice', at: 0.8 }, { ar: 'نص الموسوعة الفقهية بحروفه (الدرر السنية)', en: 'The Fiqh Encyclopedia’s text, verbatim (Dorar)', at: 2.6 }, { ar: 'رابط المصدر وإحالة إلى أهل العلم', en: 'The source link, and a referral to scholars', at: 4.4 }]);
say('n06', 'ruling', 0.3);
col('crisis', 'crisis', '05', 'الأمان أولًا', 'Safety first', [
  { ar: 'رسالة دعم ثابتة، مكتوبة مسبقًا', en: 'A fixed support message, written in advance', at: 1.0 }, { ar: 'دليل أرقام المساعدة في كل بلد', en: 'A directory of help lines in every country', at: 2.4 }, { ar: 'آيات الأمل مع تفسيرها كاملًا', en: 'Verses of hope with their full tafsir', at: 3.8 }]);
say('v08', 'crisis', 0.6);
const R = S.relevance;
events.push({ kind: 'stats', at: at('stats', 0), dur: SEG.find(s => s.id === 'stats').dur, title: { ar: 'وكيف نثق بها؟ اختبار على ١٬٠٠٠ سؤال', en: `How can you trust it? Tested on ${S.questions.toLocaleString('en')} questions — Arabic & English` },
  kpis: [
    { v: S.verbatim.passages ? 100 * (S.verbatim.passages - S.verbatim.notFound) / S.verbatim.passages : 100, frac: S.verbatim.passages ? (S.verbatim.passages - S.verbatim.notFound) / S.verbatim.passages : 1, dec: 0, suf: '%', good: true, ar: 'من الجمل المعروضة موجودة بحروفها في مصدرها', en: `of ${S.verbatim.passages.toLocaleString('en')} quoted sentences found word for word in their source` },
    { v: pctOf(R.top1Relevant[0]), frac: R.top1Relevant[0], dec: 1, suf: '%', ar: 'أوّل آية ذات صلة بالسؤال', en: 'first verse relevant — independent judge' },
    { v: pctOf(R.briefOnTopic[0]), frac: R.briefOnTopic[0], dec: 1, suf: '%', ar: 'جواب مختصر في صلب السؤال', en: 'short answers on topic — independent judge' },
    { v: QQA.mrr, frac: QQA.mrr, dec: 3, suf: '', ar: 'على مقياس دولي منشور للبحث في القرآن', en: `Qur'an QA 2023, MRR@10 — comparable to the best published (${QQA.best})` },
  ], foot: `Judge: ${S.judge || 'DeepSeek-V3.2 (another model family)'} · 95 % bootstrap intervals in eval/rag1000/REPORT · ${S.errors} technical errors` });
say('n10', 'stats', 0.4);
events.push({ kind: 'bridge', at: at('bridge', 0), dur: SEG.find(s => s.id === 'bridge').dur, ar: 'رفيقك اليومي مع القرآن', en: 'Your daily companion with the Quran', icons: ['↻', '🧒', '📖', '🕌', '📱', '📿'] });
say('f0', 'bridge', 0.35);
col('tekrar', 'tekrar', '06', 'الحفظ بالتكرار', 'Memorising by repetition', [
  { ar: 'عدّاد لكل تكرار', en: 'A counter for each repetition', at: 1.0 }, { ar: 'لا يُحتسب قبل ٧٠٪ من وقت الشيخ', en: 'Counted only after 70 % of the reciter’s time', at: 3.4 },
  { ar: 'اختبار حفظ: كتابةً أو تلاوةً', en: 'A memory test: written or recited', at: 5.8 }, { ar: 'تشجيع دائم وعلامة من ٧ إلى ١٠', en: 'Constant encouragement, a mark from 7 to 10', at: 7.6 }]);
say('f1', 'tekrar', 0.3);
col('child', 'child', '07', 'وضع آمن للأطفال', 'A safe mode for children', [
  { ar: 'لا فتاوى', en: 'No fatwas', at: 2.0 }, { ar: 'لا موضوعات حسّاسة', en: 'No sensitive subjects', at: 3.6 }, { ar: 'توجيه لطيف إلى الحفظ والختمة', en: 'A gentle path to memorising', at: 5.4 }]);
say('f2', 'child', 0.4);
col('khatma', 'khatma', '08', 'الختمة', 'Khatma', [
  { ar: '«اختر لي»: خطة على وقتك', en: '«Choose for me»: a plan on your time', at: 0.8 }, { ar: 'ما تقرؤه زيادةً يُخفّف ما بعده', en: 'Reading more lightens the coming days', at: 2.4 },
  { ar: 'السور المقروءة تضيء في المشكاة', en: 'Surahs read light up in the lamp', at: 4.0 }]);
say('f3', 'khatma', 0.3);
col('prayer', 'mosques', '09', 'الصلاة والقبلة والمساجد', 'Prayer, qibla & mosques', [
  { ar: 'مواقيت الصلاة في مدينتك', en: 'Prayer times in your city', at: 0.3 }, { ar: 'القبلة بالبوصلة', en: 'The qibla with the compass', at: at('qibla', 0.2) - at('prayer', 0.15) }, { ar: 'المساجد القريبة على الخريطة', en: 'Nearby mosques on the map', at: at('mosques', 0.2) - at('prayer', 0.15) }]);
say('f4', 'prayer', 0.3);
col('install', 'install', '10', 'على هاتفك وحاسوبك', 'On your phone & computer', [
  { ar: 'الهاتف: «إضافة إلى الشاشة الرئيسية»', en: 'Phone: «Add to home screen»', at: 1.2 }, { ar: 'الحاسوب: زر التثبيت في المتصفح', en: 'Computer: the browser’s install button', at: 3.0 },
  { ar: 'بلا إعلانات ولا تتبّع ولا حساب', en: 'No ads, no tracking, no account', at: 4.8 }]);
say('f5', 'install', 0.3);
col('zahra', 'zahra', '✿', 'زهرة التحدّي', 'The Challenge flower', [{ ar: '١٩ بتلة × ٦ سور = ١١٤', en: '19 petals × 6 surahs = 114', at: 0.4 }]);
events.push({ kind: 'end', at: at('end', 0), dur: SEG.find(s => s.id === 'end').dur + 0.2, url: 'mishkatquran.org', ar: VO.v13.ar.replace(/^هذه\s+/, ''), en: VO.v13.en, chalAt: 6.2,
  chal: { logo: '/tools/video/challenge-lockup.svg', ar: 'تحدّي الذكاء الاصطناعي في خدمة المحتوى الإسلامي ٢٠٢٦ · islamicaich.org', en: 'Islamic AI Challenge 2026 · Track 01' },
  foot: '© 2026 Mohamed Nour Bou Ali · All rights reserved' });
say('v13', 'end', 0.3);
say('e1', 'end', 6.65);
for (let k = events.length - 1; k >= 0; k--) if (events[k].kind === 'cap' && (events[k].ar === VO.v13.ar || events[k].ar === VO.e1.ar)) events.splice(k, 1);
const TLJ = { events, segments: SEG.map(s => ({ id: s.id, at: s.at, dur: s.dur, layout: s.layout })), xf: XF, layouts: LAYOUTS };
writeFileSync(join(DIR, `timeline3_${VOICE}.json`), JSON.stringify({ total: TOTAL, ...TLJ, audio: audio.map(a => ({ ...a, file: a.file.replace(DIR, '.') })) }, null, 1));
// no two captions at once, every narration inside its part
const caps = events.filter(e => e.kind === 'cap').sort((a, b) => a.at - b.at);
// a caption ends (fades out) before the next one comes: never two captions in the same place
for (let k = 0; k + 1 < caps.length; k++) caps[k].dur = Math.min(caps[k].dur, caps[k + 1].at - caps[k].at - 0.05);
// (6 Oct) no two narrations at once, for the two voices: the parts are long enough for the longer one
if (audio[0].at + 6.09 > at('home', 0.9)) throw new Error('the narration would cover the basmala');
const voices = audio.filter(a => a.file.includes(join(DIR, VOICE))).map(a => ({ id: a.file.split(/[\\/]/).pop().replace('.wav', ''), at: a.at })).sort((x, y) => x.at - y.at);
const otherV = VOICE === 'voice' ? 'voice_fusha' : 'voice';
for (let k = 0; k + 1 < voices.length; k++) for (const vv of [VOICE, otherV]) {
  const f = join(DIR, vv, `${voices[k].id}.wav`); if (!existsSync(f)) continue;
  const end = voices[k].at + wavDur(f);
  if (end > voices[k + 1].at + 0.02) throw new Error(`narrations overlap (${vv}): ${voices[k].id} ends ${end.toFixed(2)} after ${voices[k + 1].id} starts ${voices[k + 1].at.toFixed(2)}`);
}
console.log('total', TOTAL, 's');
if (TOTAL > 120) throw new Error('longer than 2 minutes');
writeFileSync(join(DIR, `timeline3_${VOICE}.json`), JSON.stringify({ total: TOTAL, ...TLJ, audio: audio.map(a => ({ ...a, file: a.file.replace(DIR, '.') })) }, null, 1));   // with the captions clipped
if (process.argv.includes('--plan')) process.exit(0);

// ------------------------------------------------ 1. the base track: footage placed in its layout, varied transitions
const base = join(DIR, 'base3.mp4');
if ((!ONLY && !process.argv.includes('--from-overlay')) || !existsSync(base)) {
  const inputs = [], parts = [];
  SEG.forEach((s, k) => {
    const L = LAYOUTS[s.layout];
    if (s.color) { inputs.push('-f', 'lavfi', '-t', String(s.dur), '-i', `color=c=black:s=1920x1080:r=${FPS}`); parts.push(`[${k}:v]format=yuv420p,setsar=1,fps=${FPS}[s${k}]`); }
    else {
      inputs.push('-ss', String(s.in), '-t', String(s.dur), '-i', join(DIR, FOOT, `${s.clip}.mp4`));
      const place = (s.crop ? s.crop + ',' : '') + (s.layout === 'full' ? 'scale=1920:1080:flags=lanczos' : `scale=${L.w}:${L.h}:flags=lanczos,pad=1920:1080:${L.x}:${L.y}:black`);
      // a clip shorter than its part (child, install) holds its last image: the chain of transitions never stops early
      parts.push(`[${k}:v]setpts=PTS-STARTPTS,${place},format=yuv420p,setsar=1,fps=${FPS},tpad=stop_mode=clone:stop_duration=${s.dur},trim=duration=${s.dur}[s${k}]`);
    }
  });
  let prev = 's0', acc = SEG[0].dur;
  for (let k = 1; k < SEG.length; k++) {
    parts.push(`[${prev}][s${k}]xfade=transition=${SEG[k].tr || 'fade'}:duration=${XF}:offset=${(acc - XF).toFixed(3)}[x${k}]`);
    prev = `x${k}`; acc = acc - XF + SEG[k].dur;
  }
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', parts.join(';'), '-map', `[${prev}]`, '-r', String(FPS), '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', base], { stdio: 'inherit', maxBuffer: 1 << 26 });
  // the base must last the whole film (a short clip once ended it at 86.7 s)
  const nb = +((spawnSync(FFMPEG, ['-hide_banner', '-i', base, '-map', '0:v', '-f', 'null', '-'], { encoding: 'utf8' }).stderr.match(/frame= *(\d+)/g) || ['0']).pop().replace(/\D/g, ''));
  if (nb < Math.floor(TOTAL * FPS) - 2) throw new Error(`base track too short: ${nb} frames for ${TOTAL} s`);
  console.log('base', base, nb, 'frames');
}

// ------------------------------------------------ 2. the motion-design layer, frame by frame, piped into ffmpeg with the sound
const ROOT = resolve('.');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf' };
const srv = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(8798);
const out = join(DIR, OUTF);
const b = await launch({ port: 9462, gpu: true, w: 1920, h: 1080 });
try {
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await b.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.TL = ${JSON.stringify(TLJ)};` });
  await b.send('Page.navigate', { url: 'http://localhost:8798/tools/video/overlay3.html' });
  for (let k = 0; k < 100 && !(await b.evalJs('!!window.__ready && !!window.render')); k++) await sleep(100);
  await sleep(800);
  if (ONLY) {
    // review stills: the overlay over the base frame at the same time
    for (const s of ONLY.split(',').map(Number)) {
      await b.evalJs(`render(${s})`);
      const { data } = await b.send('Page.captureScreenshot', { format: 'png' });
      const png = join(DIR, `review3_${s}.png`), jpg = join(DIR, `review3_${s}.jpg`); writeFileSync(png, Buffer.from(data, 'base64'));
      execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', String(s), '-i', base, '-i', png, '-filter_complex', '[0:v][1:v]overlay=0:0', '-frames:v', '1', jpg]);
      console.log('still', jpg);
    }
  } else {
    const ain = [], af = [];
    audio.forEach((a, k) => {
      ain.push('-i', a.file);
      const ms = Math.round(a.at * 1000);
      let chain = `[${k + 2}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${a.gain}`;
      if (a.fadeOut) chain += `,afade=t=out:st=${a.fadeOut.at.toFixed(2)}:d=${a.fadeOut.d}`;
      af.push(`${chain},adelay=${ms}|${ms}[a${k}]`);
    });
    const mix = `${audio.map((_, k) => `[a${k}]`).join('')}amix=inputs=${audio.length}:normalize=0:duration=longest,alimiter=limit=0.95,apad=whole_dur=${TOTAL}[aout]`;
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-i', base, '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', 'pipe:0', ...ain,
      '-filter_complex', `[0:v][1:v]overlay=0:0:format=auto:shortest=1,format=yuv420p[vout];${af.join(';')};${mix}`,
      '-map', '[vout]', '-map', '[aout]', '-t', String(TOTAL), '-r', String(FPS), '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', (c) => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
    const nF = Math.ceil(TOTAL * FPS);
    for (let f = 0; f < nF; f++) {
      await b.evalJs(`render(${f / FPS})`);
      const { data } = await b.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
      const buf = Buffer.from(data, 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 300 === 0) console.log('frame', f, '/', nF);
    }
    ff.stdin.end();
    await done;
    console.log('video', out, (statSync(out).size / 1e6).toFixed(1), 'MB', TOTAL, 's');
  }
} finally { await b.close(); srv.close(); }
