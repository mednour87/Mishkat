// The plate of the search + RAG pipeline (docs/pipeline_rag.png), drawn by headless Chrome from HTML:
//   node tools/make_pipeline.mjs [out.png]
// Every box names the file that does the work; every figure comes from a results file (eval/rag1000, eval/qqa23).
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const OUT = resolve(process.argv[2] || 'docs/pipeline_rag.png');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const fonts = encodeURI('file:///' + resolve('public/fonts').replace(/\\/g, '/') + '/');   // the path has Arabic letters
const logo = readFileSync('public/img/logo.svg', 'utf8').replace(/width="120" height="120"/, 'width="100%" height="100%"');
const W = 2600, H = 1560;

const box = (n, cls, en, ar, file, body = '') => `<div class="b ${cls}"><div class="bh"><span class="n">${n}</span><span class="en">${en}</span><span class="ar">${ar}</span></div>
  ${body}<div class="f">${file}</div></div>`;
const AI = '<span class="ai">AI · ids only</span>', NOAI = '<span class="noai">no AI</span>';

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Amiri; src: url(${fonts}Amiri-700-arabic.woff2); font-weight: 700; }
@font-face { font-family: Plex; src: url(${fonts}IBMPlexSansArabic-500-arabic.woff2); }
@font-face { font-family: Plex; src: url(${fonts}IBMPlexSansArabic-600-arabic.woff2); font-weight: 700; }
@font-face { font-family: Inter; src: url(${fonts}Inter-400-latin.woff2); }
@font-face { font-family: Inter; src: url(${fonts}Inter-600-latin.woff2); font-weight: 600; }
@font-face { font-family: Inter; src: url(${fonts}Inter-700-latin.woff2); font-weight: 700; }
* { box-sizing: border-box; }
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
body { background: radial-gradient(ellipse at 50% 30%, #13204a 0%, #080d1f 60%, #04060c 100%); color: #e9e3d2; font: 18px/1.4 Inter, Plex, sans-serif; position: relative; }
.top { position: absolute; left: 60px; right: 1000px; top: 30px; display: flex; align-items: center; gap: 28px; }
.top .lg { width: 110px; height: 110px; filter: drop-shadow(0 0 22px rgba(255,214,107,.5)); }
.top h1 { margin: 0; font: 700 50px/1.1 Inter, sans-serif; color: #fff3cf; }
.top h1 b { font-family: Amiri, serif; color: #ffd66b; font-size: 60px; margin-inline-start: 14px; }
.top p { margin: 6px 0 0; font-size: 23px; color: #c9cfe0; }
.rule { position: absolute; right: 60px; top: 30px; width: 900px; padding: 12px 20px; border: 2px solid #ffd66b; border-radius: 18px; background: rgba(255,214,107,.08); font-size: 18.5px; }
.rule b { color: #ffd66b; } .rule .ar { font-family: Plex, sans-serif; direction: rtl; display: block; margin-top: 6px; color: #fff3cf; }
.row { position: absolute; left: 60px; right: 60px; display: flex; gap: 0; align-items: stretch; }
.b { position: relative; flex: 1; border-radius: 18px; padding: 16px 18px 14px; background: rgba(18, 28, 60, .85); border: 1.5px solid rgba(150, 185, 255, .35); display: flex; flex-direction: column; gap: 8px; }
/* .bai: an AI step (not .ai, the badge) */
.b.bai { border-color: rgba(47, 238, 195, .7); background: rgba(10, 48, 60, .75); }
.b.gold { border-color: #ffd66b; background: rgba(60, 45, 10, .55); }
.b.red { border-color: #ff8a7a; background: rgba(70, 20, 20, .5); }
.bh { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; align-items: center; }
.n { grid-row: span 2; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; font: 700 24px Inter; color: #05070d; background: #ffd66b; }
.b.bai .n { background: #2feec3; }
.en { font: 700 23px/1.15 Inter; color: #fff; } .ar { font: 700 21px/1.3 Plex, sans-serif; color: #ffd66b; direction: rtl; text-align: left; }
.b ul { margin: 0; padding-left: 20px; font-size: 17.5px; color: #dfe4f2; } .b li { margin: 2px 0; }
.f { margin-top: auto; font: 15px/1.2 ui-monospace, Consolas, monospace; color: #8fb3ff; }
.ai, .noai { display: inline-block; font: 600 14px Inter; padding: 2px 9px; border-radius: 999px; margin-right: 6px; }
.ai { background: #2feec3; color: #04221c; } .noai { background: #3a4565; color: #dfe4f2; }
.arr { flex: 0 0 54px; display: grid; place-items: center; }
.arr svg { width: 50px; height: 40px; }
.q { flex: 0 0 250px; border-radius: 18px; border: 2px dashed rgba(255,214,107,.6); padding: 16px; display: grid; align-content: center; gap: 8px; text-align: center; }
.q .qa { font: 700 26px/1.5 Plex, sans-serif; color: #fff3cf; direction: rtl; } .q .qe { font-size: 18px; color: #c9cfe0; }
.lbl { position: absolute; left: 60px; font: 700 20px Inter; letter-spacing: .14em; color: #8fb3ff; text-transform: uppercase; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; } .chip { font-size: 15.5px; padding: 3px 9px; border-radius: 8px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.15); }
.chip.k { border-color: #2feec3; } .chip.g { border-color: #ffd66b; }
.down { position: absolute; width: 50px; height: 70px; }
.foot { position: absolute; left: 60px; right: 60px; bottom: 34px; display: grid; grid-template-columns: 1.15fr 1fr; gap: 26px; }
.panel { border-radius: 18px; padding: 16px 20px; background: rgba(8, 14, 34, .8); border: 1.5px solid rgba(150,185,255,.3); font-size: 18px; }
.panel h3 { margin: 0 0 8px; font: 700 21px Inter; color: #fff3cf; } .panel h3 span { font-family: Plex; color: #ffd66b; margin-left: 10px; }
.m { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.m div { border-radius: 12px; background: rgba(255,255,255,.05); padding: 10px 12px; } .m b { display: block; font: 700 32px Inter; color: #ffd66b; } .m small { font-size: 15px; color: #c9cfe0; }
.src { columns: 2; column-gap: 26px; font-size: 16.5px; } .src div { break-inside: avoid; margin-bottom: 4px; } .src b { color: #ffd66b; }
.copy { position: absolute; right: 64px; bottom: 8px; font-size: 14px; color: #7f8aa8; }
</style></head><body>
<div class="top"><div class="lg">${logo}</div><div><h1>Mishkat search &amp; RAG pipeline <b>مِشكاة</b></h1>
  <p>Evidence-bound extractive RAG · the AI understands and <u>chooses numbers</u> in a closed list · what is shown is a verbatim copy of the source</p></div></div>
<div class="rule"><b>Golden rule:</b> no religious word is ever written by a model. Verses = Tanzil text; explanations = whole sentences of vetted tafsir; hadith with its grade; rulings from the Dorar Fiqh Encyclopedia. No evidence → abstain.
  <span class="ar">القاعدة الذهبية: لا يكتب النموذج حرفًا دينيًّا؛ يختار أرقامًا من قائمة مغلقة، ويُعرض النص بحروفه من مصدره.</span></div>

<div class="lbl" style="top:212px">① Understand &amp; retrieve · in the browser (Web Worker) + 3 small server calls</div>
<div class="row" style="top:248px;height:400px">
  <div class="q"><div class="qa">«ماذا يقول القرآن عن الصبر؟»</div><div class="qe">a question, a word, a verse<br>Arabic · English · voice (Whisper)</div></div>
  <div class="arr"><svg viewBox="0 0 50 40"><path d="M2 20h40M30 8l14 12-14 12" stroke="#ffd66b" stroke-width="4" fill="none"/></svg></div>
  ${box(1, '', 'Question map', 'خريطة السؤال', 'scope.js · tools.js · app.js run()', `<div>${NOAI}</div><ul><li>crisis → always answered, verses of tranquillity</li><li>child (&lt;18) → no fatwa</li><li>off-topic, date/time → fixed card</li><li>«خطة ختمة», «متى رمضان» → tool</li></ul>`)}
  <div class="arr"><svg viewBox="0 0 50 40"><path d="M2 20h40M30 8l14 12-14 12" stroke="#ffd66b" stroke-width="4" fill="none"/></svg></div>
  ${box(2, 'red', 'Guard &amp; routing', 'الحراسة والتوجيه', 'engine.js ask0() · injection.js', `<div>${NOAI}</div><ul><li>«2:255», «سورة الكهف» → open</li><li>quote → verse? hadith (Dorar)?</li><li>exact Quran words, sure spelling fix</li><li>personal fatwa, dream → abstain (level د)</li><li>sensitive → red banner + reviewed context</li></ul>`)}
  <div class="arr"><svg viewBox="0 0 50 40"><path d="M2 20h40M30 8l14 12-14 12" stroke="#ffd66b" stroke-width="4" fill="none"/></svg></div>
  ${box(3, 'bai', 'Understand', 'فهم السؤال', 'POST /api/expand · selector.js', `<div>${AI}</div><ul><li>intent: topic · ruling · personal · polemic · other</li><li>keywords ar/en as in Quran &amp; tafsir (search only, never shown)</li><li>≤ 8 proposed verses → checked: exist + shared word or semantic neighbour</li></ul>`)}
  <div class="arr"><svg viewBox="0 0 50 40"><path d="M2 20h40M30 8l14 12-14 12" stroke="#ffd66b" stroke-width="4" fill="none"/></svg></div>
  ${box(4, '', 'Hybrid retrieval', 'استرجاع هجين', 'topicSearch · dense-rank.js · search-worker.js', `<div class="chips"><span class="chip">BM25 lexical · verse + tafsir + translation</span><span class="chip k">bge-m3 meaning · 256-d, ranked in the browser</span><span class="chip k">AI keywords</span><span class="chip g">human subject index (Quranpedia, 6,100 topics)</span></div>
    <ul><li>rank-by-rank fusion (RRF style)</li><li><b style="color:#ffd66b">closed list ≤ 36 verses</b> (id s:a + start of its tafsir)</li></ul>`)}
</div>

<svg class="down" style="left:${W - 230}px;top:652px" viewBox="0 0 50 70"><path d="M25 2v54M12 44l13 14 13-14" stroke="#ffd66b" stroke-width="4" fill="none"/></svg>

<div class="lbl" style="top:700px">② Choose, then prove · two models, fixed rules, verbatim display</div>
<div class="row" style="top:736px;height:430px;flex-direction:row-reverse">
  ${box(5, 'bai', 'Closed-list selection', 'اختيار من قائمة مغلقة', 'POST /api/select · engine.verifyLLM', `<div>${AI}</div><ul><li>reads the tafsir of each candidate, judges by meaning</li><li>score 2 = answers · 1 = related · homonyms rejected (الجاريات ≠ الجار)</li><li>ids outside the list dropped twice (server + browser)</li><li>→ confirmed verses, surahs lit in the 3D galaxy</li></ul>`)}
  <div class="arr"><svg viewBox="0 0 50 40"><path d="M48 20H8M20 8L6 20l14 12" stroke="#ffd66b" stroke-width="4" fill="none"/></svg></div>
  ${box(6, 'gold', 'Closed list of sentences', 'قائمة مغلقة من الجمل', 'rag.js (browser)', `<div class="chips"><span class="chip g">V:2:153 verse (Tanzil)</span><span class="chip g">Q:2:153#1 tafsir sentence (Muyassar / Mukhtasar)</span><span class="chip g">H:id#t hadith, graded صحيح / حسن (HadeethEnc)</span></div><ul><li>whole sentences only (R8), ≤ 48, ≤ 600 chars each</li></ul>`)}
  <div class="arr"><svg viewBox="0 0 50 40"><path d="M48 20H8M20 8L6 20l14 12" stroke="#ffd66b" stroke-width="4" fill="none"/></svg></div>
  ${box(7, 'bai', 'Composer + independent judge', 'مُركِّب ثم مُحكِّم مستقل', 'POST /api/answer · answer.js', `<div>${AI}</div><ul><li>composer (gpt-oss-120b): 1–3 concepts, 1–2 sentence ids each, per question type</li><li>judge (gpt-oss-20b, own prompt, renumbered): keeps only same-sense answers</li><li>uncovered concept → said, never filled</li></ul>`)}
  <div class="arr"><svg viewBox="0 0 50 40"><path d="M48 20H8M20 8L6 20l14 12" stroke="#ffd66b" stroke-width="4" fill="none"/></svg></div>
  ${box(8, 'red', 'Fixed rules R1–R13', 'قواعد ثابتة', 'rag.js', `<div>${NOAI}</div><ul><li>list ids only · no judge → no answer</li><li>distress → no punishment passages</li><li>violence polemic → context first</li><li>homonym locks · caps 3 points / 1,200 chars</li><li>Muyassar units: sentence shares a word with its own verse</li></ul>`)}
  <div class="arr"><svg viewBox="0 0 50 40"><path d="M48 20H8M20 8L6 20l14 12" stroke="#ffd66b" stroke-width="4" fill="none"/></svg></div>
  ${box(9, 'gold', 'Shown: «الجواب باختصار»', 'يُعرض بحروفه', 'app.js loadRag()', `<ul><li>the browser's own copy of each sentence, verbatim</li><li>verse, source and link under each one</li><li><b>+ Sunnah</b>: HadeethEnc hadiths picked by number (/api/pick)</li><li><b>+ ruling</b>: Dorar Fiqh Encyclopedia text, consensus / disagreement, red banner, no fatwa</li><li><b>+ objections</b>: Bayenat links</li></ul>`)}
</div>

<div class="foot">
  <div class="panel"><h3>Measured <span>القياس</span></h3><div class="m">
    <div><b>84.5 %</b><small>first verse answers directly · 1,000 questions, independent judge (DeepSeek-V3.2), 95 % CI 81.9–87.1</small></div>
    <div><b>0 / 1,058</b><small>quoted passages not found word for word in their source</small></div>
    <div><b>15 → 2</b><small>critical cases after the fixes of 5 Oct (v1 → v4)</small></div>
    <div><b>0.616</b><small>MRR@10 Qur'an QA 2023 (public benchmark) — comparable to the best published (0.576), not better</small></div></div></div>
  <div class="panel"><h3>Sources of truth <span>مصادر النص</span></h3><div class="src">
    <div><b>Quran</b> Tanzil Uthmani (Hafs)</div><div><b>Tafsir</b> Muyassar · Mukhtasar · As-Sa'di · Ibn Kathir · Tabari</div>
    <div><b>Sunnah</b> HadeethEnc · Dorar</div><div><b>Rulings</b> Dorar Fiqh Encyclopedia</div>
    <div><b>Index</b> Quranpedia topics</div><div><b>Recitation</b> Alafasy, word timings</div>
    <div><b>Models</b> Groq free first (gpt-oss) → OpenRouter capped</div><div><b>Meaning</b> bge-m3 · Cloudflare Workers AI</div></div></div>
</div>
<div class="copy">© 2026 Mohamed Nour Bou Ali — Mishkat · mishkatquran.org · All rights reserved</div>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'mishkat-pipe-'));
const file = join(dir, 'pipeline.html');
writeFileSync(file, html);
const r = spawnSync(CHROME, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${W},${H}`, '--virtual-time-budget=4000',
  '--allow-file-access-from-files', `--screenshot=${OUT.replace(/\\/g, '/')}`, 'file:///' + file.replace(/\\/g, '/')], { encoding: 'utf8' });
console.log(r.status === 0 ? 'written ' + OUT : r.stderr);
