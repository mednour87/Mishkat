// T098 — the presentation film, shown once at the first visit (after the basmala and the choice of the place), with a
// Skip button. It is drawn live (no video file): the verse of light (24:35) recited by Sheikh Alafasy, its words
// gathering as luminous points in time with the recitation; the logo built part by part on the words it comes from
// (مشكاة · مصباح · زجاجة · كوكب دري · شجرة مباركة زيتونة · زيتها يضيء · نور على نور); then a real transition into the
// 3D galaxy of the page, where the reader mode lights the words of the same verse, the shapes change, and the lamp
// fills with the surahs read; finally a quick motion-graphic tour of the services (AI search, khatma, prayer, qibla,
// mosques, repetition, statistics, engagement, installing the app).
// Religious text shown: only the Tanzil text of the verses (core.json) and the verse words themselves as labels;
// in English, the QuranEnc translation of the same verses (the reader's own translation source), footnote marks removed.
// (4 Oct, refonte) The film opens with the basmala — the Tanzil text of 1:1, recited by the same reciter — whose
// points of light then flow into the verse of light.
// (5 Oct, T102) Shorter and in the visitor's hands: the services tour starts on the live galaxy while the end of the
// verse is still recited (≈ 95 s instead of ≈ 125 s); a chapter rail (basmala · verse · galaxy · services · start)
// lets the visitor jump ahead; the whole verse stays faintly readable before its words are recited; the search card
// shows the real path of an answer (question → closed list → choice by number → second check); the last screen offers
// three example questions that start a real search.
import { lampSVG } from './lamp.js';
import { miniLamp } from './lampmap.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const IN = {
  ar: {
    skip: 'تخطَّ', start: 'ابدأ رحلتك', sound: 'الصوت', name: 'مِشكاة', sub: 'دليل مجرّة القرآن الذكي',
    nameFrom: 'الاسم والشعار من آية النور', galaxy: '٧٧٬٤٣٣ كلمة · كل كلمة نجمة', reader: 'وضع القارئ: الكلمة المتلوّة تضيء في المجرّة', shapes: 'أشكال ثلاثية الأبعاد لترتيب السور',
    lampLit: 'المشكاة تضيء بالسور التي تقرؤها',
    chapters: ['البسملة', 'آية النور', 'المجرّة', 'الخدمات', 'ابدأ'], chapNav: 'فصول العرض',
    feats: [
      ['بحث ذكي في القرآن', 'اسأل بالعربية أو الإنجليزية: يختار الذكاء الاصطناعي من قائمة مغلقة بأرقامها، والنص من المصحف والتفسير المعتمد، ولا يكتب حرفًا من عنده.'],
      ['الختمة', 'خطة على أيامك وأوقاتك، والسور المقروءة تضيء في المشكاة.'],
      ['الصلاة والقبلة', 'مواقيت مدينتك مع عدّ تنازلي، واتجاه الكعبة ببوصلة الهاتف.'],
      ['المساجد القريبة', 'على خريطة Google داخل الصفحة، والقائمة من OpenStreetMap، مع المسار.'],
      ['التكرار والحفظ', 'عدّاد لكل تكرار، ووقت أدنى قريب من وقت الشيخ، وتشجيع دائم.'],
      ['الإحصاءات والالتزام', 'السور والكلمات ومواضعها — دون حساب الجُمَّل — وخريطة التزام بثلاثة مستويات: غرسة، زيتونة، كوكب دري.'],
      ['ثبّت التطبيق', 'على الهاتف والحاسوب من المتصفح مباشرة.'],
    ],
    steps: ['فهم السؤال', 'قائمة مغلقة: المصحف والتفسير', 'اختيار بالأرقام', 'تحقّق نموذج ثانٍ'],
    demoQ: 'ماذا يقول القرآن عن الصبر؟', demoNote: 'نص المصحف · التفسير الميسر بحروفه', counter: 'كرّرتُ', next: 'الصلاة القادمة', place: (p) => p ? `في ${p}` : '',
    tryLead: 'جرّب سؤالًا:', tryQ: ['كيف أتعامل مع الحزن؟', 'ماذا يقول القرآن عن الصبر؟', 'قصة يوسف'],
  },
  en: {
    skip: 'Skip', start: 'Start your journey', sound: 'Sound', name: 'Mishkat', sub: 'the smart guide to the Quran galaxy',
    nameFrom: 'The name and the logo come from the verse of light', galaxy: '77,433 words · every word a star', reader: 'Reader mode: the recited word lights up in the galaxy', shapes: '3D shapes to order the surahs',
    lampLit: 'The lamp lights up with the surahs you read',
    chapters: ['Basmala', 'Verse of light', 'Galaxy', 'Services', 'Start'], chapNav: 'Chapters of the film',
    feats: [
      ['Smart Quran search', 'Ask in Arabic or English: the AI picks by number from a closed list; the text comes from the Mushaf and vetted tafsir — it never writes a word of its own.'],
      ['Khatma', 'A plan on your days and times; the surahs you read light up in the lamp.'],
      ['Prayer & qibla', 'Your city’s prayer times with a countdown, and the direction of the Kaaba with the phone’s compass.'],
      ['Nearby mosques', 'On a Google map inside the page, the list from OpenStreetMap, with the route.'],
      ['Repetition & memorising', 'A counter for each repetition, a minimal time close to the reciter’s, constant encouragement.'],
      ['Statistics & engagement', 'Surahs, words and where they occur — no letter values — and an engagement map with three levels: sapling, olive tree, shining star.'],
      ['Install the app', 'On your phone and computer, straight from the browser.'],
    ],
    steps: ['Understand the question', 'Closed list: Mushaf & tafsir', 'Choice by number', 'Second model checks'],
    demoQ: 'What does the Quran say about patience?', demoNote: 'Mushaf text · Mukhtasar tafsir, verbatim', counter: 'Repeated', next: 'Next prayer', place: (p) => p ? `in ${p}` : '',
    tryLead: 'Try a question:', tryQ: ['How do I deal with sadness?', 'Verses about patience', 'Story of Yusuf'],
  },
};

// words of 24:35 at which each part of the logo appears (0-based word index in the Tanzil verse)
// 6 كمشكاة · 8 مصباح · 11 زجاجة · 14–15 كوكب دري · 18–20 شجرة مباركة زيتونة · 26–27 زيتها يضيء · 32–34 نور على نور
const PARTS = [
  { at: 6, cls: 'p-niche' }, { at: 8, cls: 'p-lamp' }, { at: 11, cls: 'p-glass' }, { at: 14, cls: 'p-star' },
  { at: 18, cls: 'p-tree' }, { at: 26, cls: 'p-oil' }, { at: 32, cls: 'p-halo' },
];
const PHRASES = [[6], [8], [11], [14, 15], [18, 19, 20], [26, 27], [32, 33, 34]];   // written beside the logo as it grows
export const CH = ['basmala', 'verse', 'galaxy', 'features', 'end'];
// card durations (ms): the search card is the longest — it is the heart of the site
export const DUR = [8600, 3700, 3900, 3500, 3600, 4100, 3200];

// ctx: { lang(), core, galaxy, audioBase, timing, timingBasmala, translation(i): Promise<string>, placeName(), setView(shape, order),
//        qibla(): degrees|null, onDone(query|undefined) }
export function playIntro(ctx) {
  const lang = ctx.lang(), t = IN[lang] || IN.ar, ar = lang === 'ar';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = ctx.core.suras[23], vIdx = S.first + 34;
  const verseWords = ctx.core.verses[vIdx].split(' '), basmalaWords = ctx.core.verses[0].split(' ');
  let words = basmalaWords;
  const root = document.createElement('div');
  root.id = 'intro'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', t.name);
  root.dir = ar ? 'rtl' : 'ltr';
  root.classList.toggle('in-en', !ar);
  root.innerHTML = `<canvas class="in-cv" aria-hidden="true"></canvas>
    <div class="in-brand"><b>${esc(t.name)}</b><small>${esc(t.sub)}</small></div>
    <div class="in-cap" aria-live="polite"></div>
    <p class="in-tr" lang="en" dir="ltr" hidden></p>
    <div class="in-logo" aria-hidden="true"><p class="in-from"></p><div class="in-lamp">${lampSVG({ size: 240, title: 'Mishkat' })}</div><div class="in-labels"></div></div>
    <div class="in-stage" aria-live="polite"></div>
    <div class="in-ctl"><button type="button" class="in-mute" aria-pressed="false">🔊 ${esc(t.sound)}</button><button type="button" class="in-skip">${esc(t.skip)} ⏭</button></div>
    <nav class="in-chap" aria-label="${esc(t.chapNav)}">${t.chapters.map((c, k) => `<button type="button" data-ch="${CH[k]}"><i><b></b></i><span>${esc(c)}</span></button>`).join('')}</nav>`;
  document.body.appendChild(root);
  document.body.classList.add('intro-on');
  const cv = root.querySelector('.in-cv'), g = cv.getContext('2d');
  const cap = root.querySelector('.in-cap'), stage = root.querySelector('.in-stage'), logo = root.querySelector('.in-logo'), labelsEl = root.querySelector('.in-labels');
  const trEl = root.querySelector('.in-tr');
  let W = 0, H = 0, DPR = 1, parts = [], wordBox = [], txtCv = null, wordLit = [], lineH = 0, lastDraw = 0, alive = true, raf = 0, audio = null, t0 = performance.now(), tim = null, phase = 'basmala', galaxyOn = false, timVerse = null;
  let silent = false;                                // the visitor jumped ahead: the recitation was stopped, the film runs on its clock
  let featT0 = 0, featK = -1, featTimer = 0, galT0 = 0, featuresOn = false;
  const timers = [];
  const later = (fn, ms) => { const id = setTimeout(() => { if (alive) fn(); }, ms); timers.push(id); return id; };

  // ---------------------------------------------------------------- the translation under the verse (English only)
  function showTranslation(i) {
    if (ar || !ctx.translation) { trEl.hidden = true; return; }
    Promise.resolve(ctx.translation(i)).then(s => {
      if (!alive) return;
      const txt = String(s || '').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
      trEl.textContent = txt; trEl.hidden = !txt; trEl.classList.remove('on'); void trEl.offsetWidth; trEl.classList.add('on');
    }).catch(() => { trEl.hidden = true; });
  }

  // ---------------------------------------------------------------- the verse as luminous points
  function layoutText() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const phone = W < 700, fs = (phase === 'basmala' ? 1.45 : 1) * (phone ? Math.max(21, Math.min(28, W / 15)) : Math.min(44, W / 27, H / 17));
    const off = document.createElement('canvas'), o = off.getContext('2d');
    off.width = W; off.height = Math.round(H * 0.6);
    o.font = `${fs}px Amiri, 'Noto Naskh Arabic', serif`; o.fillStyle = '#fff'; o.textBaseline = 'middle';
    const maxW = W * (phone ? 0.92 : 0.8), gap = fs * 0.35, lh = fs * 1.9;
    const lines = [[]]; let lw = 0;
    for (let k = 0; k < words.length; k++) {
      const ww = o.measureText(words[k]).width;
      if (lw + ww > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; }
      lines[lines.length - 1].push({ k, ww }); lw += ww + gap;
    }
    const top = phase === 'basmala' ? H * (phone ? 0.3 : 0.26) : phone ? H * 0.1 : H * 0.09;
    wordBox = [];
    lines.forEach((ln, r) => {
      const total = ln.reduce((s, x) => s + x.ww, 0) + gap * (ln.length - 1);
      let x = (W + total) / 2;                       // right to left
      const y = top + r * lh + lh / 2;
      for (const { k, ww } of ln) { x -= ww; o.fillText(words[k], x, y); wordBox[k] = { x0: x, x1: x + ww, y }; x -= gap; }
    });
    // (5 Oct) the letters themselves, sharp at the screen's resolution with a thin golden outline: the points alone
    // (sampled every 2 px) made the verse look blurred, without clear edges (author's remark). Each word appears
    // when it is recited; the points stay around it as a halo.
    txtCv = document.createElement('canvas');
    txtCv.width = Math.round(W * DPR); txtCv.height = Math.round(off.height * DPR);
    { const c = txtCv.getContext('2d');
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
      c.font = o.font; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.shadowColor = 'rgba(255, 196, 80, .4)'; c.shadowBlur = Math.max(4, fs * 0.2);
      c.fillStyle = '#fff8ea';
      for (let k = 0; k < words.length; k++) { const b = wordBox[k]; if (b) c.fillText(words[k], b.x0, b.y); }
      c.shadowBlur = 0; c.strokeStyle = 'rgba(255, 210, 110, .7)'; c.lineWidth = Math.max(0.5, fs / 40);
      for (let k = 0; k < words.length; k++) { const b = wordBox[k]; if (b) c.strokeText(words[k], b.x0, b.y); } }
    wordLit = wordBox.map(() => 0); lineH = lh;
    const step = 2, img = o.getImageData(0, 0, off.width, off.height).data;
    const old = parts; parts = [];
    let lit = 0;
    for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) if (img[(y * off.width + x) * 4 + 3] >= 128) lit++;
    const keep = Math.min(1, (phone ? 4600 : 8500) / Math.max(1, lit));
    for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) {
      if (img[(y * off.width + x) * 4 + 3] < 128 || Math.random() > keep) continue;
      let k = 0; for (let j = 0; j < wordBox.length; j++) { const b = wordBox[j]; if (b && x >= b.x0 - 2 && x <= b.x1 + 2 && Math.abs(y - b.y) < lh / 2) { k = j; break; } }
      const prev = old[parts.length];
      const a = Math.random() * 6.283, r = 8 + Math.random() * 16;   // waiting close to its place: the verse's shape is already there, faint
      parts.push({ tx: x, ty: y, ox: Math.cos(a) * r, oy: Math.sin(a) * r * 0.6, x: prev ? prev.x : W / 2 + (Math.random() - 0.5) * W * 0.3, y: prev ? prev.y : H * 0.4 + (Math.random() - 0.5) * H * 0.2, vx: 0, vy: 0, k, tw: Math.random() * 6.28 });
    }
    const lamp = root.querySelector('.in-lamp svg');
    const below = top + lines.length * lh + 14;
    const room = H - below - (ar ? 165 : 265);      // English: the translation (≈ 4 lines) and the rail below the logo      // English: room for the translation at the bottom
    const ls = Math.max(ar ? 100 : 80, Math.min(phone ? Math.min(170, W * 0.42) : Math.min(260, H * 0.32), room));
    if (lamp) { lamp.setAttribute('width', ls); lamp.setAttribute('height', ls); }
    logo.style.top = `${Math.min(H - ls - (ar ? 140 : 235), below)}px`;   // the word labels and the chapter rail stay below
  }
  // the word being recited (index) from the audio clock
  const clockMs = () => audio && !audio.paused && audio.currentTime > 0 ? audio.currentTime * 1000 : performance.now() - t0 - 1200;
  const wordAt = (ms) => {
    if (silent) return words.length - 1;
    if (!tim || !tim.t) return Math.min(words.length - 1, Math.floor(ms / 1650));
    let k = -1; for (let j = 0; j < tim.t.length / 2; j++) if (ms >= tim.t[2 * j]) k = j;
    return k;
  };
  function drawParticles(ms) {
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = galaxyOn ? 'rgba(3,5,12,0.25)' : 'rgba(3,5,12,0.32)'; g.fillRect(0, 0, W, H);
    if (galaxyOn) g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    const cur = wordAt(ms), leaving = phase !== 'verse' && phase !== 'basmala';
    for (const p of parts) {
      const on = p.k <= cur && !leaving;
      let ax, ay;
      if (leaving) {                                // flowing out into the galaxy: a spiral towards the centre
        const dx = p.x - W / 2, dy = p.y - H / 2, r = Math.hypot(dx, dy) + 1;
        ax = (-dy / r) * 0.9 - dx * 0.004; ay = (dx / r) * 0.9 - dy * 0.004;
      } else if (on) { ax = (p.tx - p.x) * 0.09; ay = (p.ty - p.y) * 0.09; }
      else { p.tw += 0.012; ax = (p.tx + p.ox * Math.cos(p.tw) - p.x) * 0.03; ay = (p.ty + p.oy * Math.sin(p.tw) - p.y) * 0.03; }
      p.vx = (p.vx + ax) * 0.86; p.vy = (p.vy + ay) * 0.86; p.x += p.vx; p.y += p.vy;
      const hot = p.k === cur && !leaving;
      // once its sharp letters are drawn, a recited word's points are only a soft halo around them
      g.fillStyle = hot ? 'rgba(255,222,130,0.55)' : on ? 'rgba(255,236,190,0.22)' : 'rgba(150,175,230,0.12)';
      const s = hot ? 2 : on ? 1.5 : 1.1;
      g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    // the sharp letters: the whole verse faintly readable from the start (T102), the recited words fully lit
    // (and every word fading out when the verse flows into the galaxy)
    const now = performance.now(), dts = Math.min(0.1, (now - (lastDraw || now)) / 1000); lastDraw = now;
    if (txtCv) {
      g.globalCompositeOperation = 'source-over';
      for (let k = 0; k < wordBox.length; k++) {
        const b = wordBox[k];
        if (!b) continue;
        const goal = leaving ? 0 : k <= cur ? 1 : 0.16;
        wordLit[k] += (goal - wordLit[k]) * (1 - Math.exp(-dts * (goal > wordLit[k] ? 3.2 : 1.6)));
        if (wordLit[k] < 0.01) continue;
        const pad = 14, x = Math.max(0, b.x0 - pad), y = Math.max(0, b.y - lineH / 2), w = Math.min(W - x, b.x1 - b.x0 + 2 * pad), h = lineH;
        g.globalAlpha = wordLit[k] * (k === cur && !leaving ? 1 : 0.9);
        g.drawImage(txtCv, x * DPR, y * DPR, w * DPR, h * DPR, x, y, w, h);
        if (k === cur && !leaving) {                 // the recited word glows a little more
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22 * wordLit[k];
          g.drawImage(txtCv, x * DPR, y * DPR, w * DPR, h * DPR, x, y, w, h);
          g.globalCompositeOperation = 'source-over';
        }
      }
      g.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- logo parts and labels
  let shownParts = 0;
  function logoAt(cur) {
    if (phase === 'basmala') return;
    while (shownParts < PARTS.length && cur >= PARTS[shownParts].at) { logo.classList.add(PARTS[shownParts].cls); shownParts++; }
    const labs = PHRASES.filter(ph => ph[0] <= cur).map(ph => `<span>${esc(ph.filter(k => k <= cur).map(k => words[k]).join(' '))}</span>`).join('');
    if (labelsEl.dataset.h !== labs) { labelsEl.innerHTML = labs; labelsEl.dataset.h = labs; }
    if (cur >= 6 && phase === 'verse') { const f = logo.querySelector('.in-from'); if (!f.textContent) f.textContent = t.nameFrom; }
  }

  // ---------------------------------------------------------------- the real galaxy (reader mode on the same verse)
  let galW0 = 0, lastGW = -1, shapesDone = false;
  function enterGalaxy() {
    if (galaxyOn) return;
    galaxyOn = true; phase = 'galaxy'; galT0 = performance.now();
    root.classList.add('see-galaxy'); document.body.classList.add('intro-galaxy');
    trEl.classList.add('away');
    cap.textContent = t.reader;
    try { ctx.galaxy.setAutoRotate(true); [galW0] = ctx.galaxy.wordsOfVerse(vIdx); ctx.galaxy.setReciting(!silent); } catch (e) { /* galaxy not ready */ }
    // the services come on the live galaxy while the end of the verse is still recited
    later(() => { if (!featuresOn) features(); }, silent ? 1600 : (reduced ? 2500 : 4500));
  }
  function galaxyAt(cur) {
    if (silent || !ctx.galaxy || cur < 0 || cur === lastGW) return;
    lastGW = cur;
    try { ctx.galaxy.setActiveWord(galW0 + cur, words[cur]); ctx.galaxy.lookAtWord(galW0 + cur); } catch (e) { /* ignore */ }
  }
  function shapesTour() {
    if (shapesDone) return;
    shapesDone = true;
    try { ctx.galaxy.setActiveWord(null); ctx.galaxy.setReciting(false); ctx.galaxy.home(); } catch (e) { /* ignore */ }
    const tour = [['rose', 'mushaf'], ['dome', 'nuzul'], ['galaxy', 'mushaf']];
    tour.forEach(([sh, od], k) => later(() => ctx.setView(sh, od), 600 + k * 4200));
  }

  // ---------------------------------------------------------------- the services, one card after another
  function searchDemo() {
    const v = ctx.core.verses[ctx.core.suras[1].first + 152];   // 2:153, Tanzil text
    return `<div class="d-search"><span class="d-mag" aria-hidden="true">⌕</span><span class="d-q"></span><i class="d-caret"></i></div>
      <ol class="d-steps">${t.steps.map((s, j) => `<li style="--j:${j}"><b>${ar ? '١٢٣٤'[j] : j + 1}</b>${esc(s)}</li>`).join('')}</ol>
      <div class="d-ans"><p class="d-v" dir="rtl" lang="ar">${esc(v)} <small>﴿٢:١٥٣﴾</small></p><small>✓ ${esc(t.demoNote)}</small></div>`;
  }
  function featureCard(k) {
    featK = k; featT0 = performance.now();
    const [h, p] = t.feats[k];
    let demo = '';
    if (k === 0) demo = searchDemo();
    else if (k === 1) demo = `<div class="d-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="r0"/><circle cx="60" cy="60" r="50" class="r1" pathLength="100"/></svg><div class="d-mini">${lampSVG({ size: 74, animated: false, title: '' })}</div></div>`;
    else if (k === 2) { const q = ctx.qibla(); demo = `<div class="d-two"><div class="d-pray"><small>${esc(t.next)} ${esc(t.place(ctx.placeName()))}</small><b class="d-count" dir="ltr">00:42:17</b></div><div class="d-comp"><i class="d-needle" style="--q:${q == null ? 110 : Math.round(q)}deg"></i><span>N</span></div></div>`; }
    else if (k === 3) demo = `<div class="d-map">${[18, 42, 66, 30, 76].map((x, j) => `<i style="--x:${x}%;--y:${[30, 60, 38, 70, 55][j]}%;--d:${j * 0.25}s"></i>`).join('')}</div>`;
    else if (k === 4) demo = `<button type="button" class="d-tk" tabindex="-1"><b>0</b><small>${esc(t.counter)}</small></button>`;
    else if (k === 5) demo = `<div class="d-two"><div class="d-bars">${[90, 64, 48, 36, 22].map((v, j) => `<i style="--v:${v}%;--d:${j * 0.15}s"></i>`).join('')}</div><div class="d-lv">${[0, 1, 2].map(j => `<i style="--j:${j}"></i>`).join('')}<b></b></div></div>`;
    else demo = `<div class="d-inst"><span class="d-phone">📱</span><span class="d-pc">💻</span></div>`;
    stage.innerHTML = `<article class="in-card${k === 0 ? ' big' : ''}"><div class="in-demo">${demo}</div><h3>${esc(h)}</h3><p>${esc(p)}</p>
      <div class="in-dots">${t.feats.map((f, j) => `<button type="button" class="${j === k ? 'on' : ''}" data-k="${j}" aria-label="${esc(f[0])}"></button>`).join('')}</div></article>`;
    stage.querySelectorAll('.in-dots button').forEach(b => b.onclick = () => goCard(+b.dataset.k));
    if (k === 0) {
      const q = stage.querySelector('.d-q'); let n = 0;
      const steps = [...stage.querySelectorAll('.d-steps li')];
      const iv = setInterval(() => {
        if (!alive || !q.isConnected) return clearInterval(iv);
        q.textContent = t.demoQ.slice(0, ++n);
        if (n >= t.demoQ.length) {
          clearInterval(iv);
          steps.forEach((li, j) => setTimeout(() => li.isConnected && li.classList.add('on'), 350 + j * 700));
          setTimeout(() => { const a = stage.querySelector('.d-ans'); if (a) a.classList.add('on'); }, 350 + steps.length * 700);
        }
      }, 45);
    }
    if (k === 2) { const c = stage.querySelector('.d-count'); let s = 42 * 60 + 17; const iv = setInterval(() => { if (!alive || !c.isConnected) return clearInterval(iv); s--; c.textContent = `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000); }
    if (k === 4) { const b = stage.querySelector('.d-tk b'); let n = 0; const iv = setInterval(() => { if (!alive || !b.isConnected) return clearInterval(iv); n = Math.min(7, n + 1); b.textContent = String(n); b.parentElement.classList.remove('pop'); void b.offsetWidth; b.parentElement.classList.add('pop'); }, 480); }
    clearTimeout(featTimer);
    featTimer = later(() => (k + 1 >= t.feats.length ? finale() : featureCard(k + 1)), (reduced ? 1.3 : 1) * DUR[k]);
  }
  function goCard(k) { if (phase === 'features' && k >= 0 && k < t.feats.length) featureCard(k); }
  function features() {
    if (featuresOn) return;
    featuresOn = true;
    if (!galaxyOn) enterGalaxy();
    phase = 'features'; cap.textContent = '';
    root.classList.add('feat');
    logo.classList.add('small');
    featureCard(0);
  }
  function finale() {
    phase = 'end'; clearTimeout(featTimer);
    if (!featuresOn) { featuresOn = true; if (!galaxyOn) enterGalaxy(); }
    root.classList.remove('feat'); root.classList.add('fin');
    stopAudio(true);
    logo.classList.remove('small'); logo.classList.add('final');
    cap.textContent = t.lampLit;
    const prog = ctx.core.suras.map(() => 0);
    const box = document.createElement('div'); box.className = 'in-dotsLamp'; root.querySelector('.in-lamp').appendChild(box);
    let n = 0;
    const iv = setInterval(() => { if (!alive) return clearInterval(iv); for (let j = 0; j < 4 && n < 114; j++) prog[n++] = 1; box.innerHTML = miniLamp(prog, ctx.core.suras, 'mushaf'); if (n >= 114) clearInterval(iv); }, 60);
    stage.innerHTML = `<div class="in-end"><button type="button" class="btn gold big in-go">${esc(t.start)}</button>
      <p class="in-try"><span>${esc(t.tryLead)}</span>${t.tryQ.map(q => `<button type="button" class="in-q" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</p></div>`;
    stage.querySelector('.in-go').onclick = () => done();
    stage.querySelectorAll('.in-q').forEach(b => b.onclick = () => done(b.dataset.q));
    stage.querySelector('.in-go').focus();
  }

  // ---------------------------------------------------------------- the recitation (basmala, then the verse)
  function startAudio(u) {
    if (audio) { audio.pause(); audio = null; }
    if (!u || silent) return;
    audio = new Audio(ctx.audioBase + u);
    audio.volume = 0.95;
    const muted = root.querySelector('.in-mute').getAttribute('aria-pressed') === 'true';
    audio.muted = muted;
    audio.play().catch(() => {
      // blocked (no gesture): the film runs on its own clock; the sound button starts the recitation at that time
      const b = root.querySelector('.in-mute'); b.textContent = `▶ ${t.sound}`; b.classList.add('pulse');
      b.onclick = () => { if (!audio) return; audio.currentTime = Math.max(0, (performance.now() - t0 - 1200) / 1000); audio.play().then(() => { b.classList.remove('pulse'); b.textContent = `🔊 ${t.sound}`; b.onclick = muteToggle; }).catch(() => {}); };
    });
  }
  // a gentle fade instead of a cut when the visitor jumps ahead or the film ends
  function stopAudio(fade) {
    const a = audio; audio = null;
    if (!a) return;
    if (!fade || a.paused) { a.pause(); return; }
    const v0 = a.volume, t1 = performance.now();
    const step = () => { const f = 1 - (performance.now() - t1) / 900; if (f <= 0) { a.pause(); return; } a.volume = Math.max(0, v0 * f); requestAnimationFrame(step); };
    step();
  }
  function startVerse() {
    phase = 'verse'; words = verseWords; tim = timVerse;
    layoutText();                                  // the points of the basmala flow into the verse
    showTranslation(vIdx);
    t0 = performance.now();
    later(() => { if (phase === 'verse') startAudio(tim && tim.u); }, 1200);
  }
  // the chapter rail: jumping ahead stops the recitation (with a fade) and goes straight to the chosen part
  function jump(ch) {
    const at = CH.indexOf(chapterNow()), to = CH.indexOf(ch);
    if (to <= at) return;
    if (ch === 'verse') { stopAudio(true); startVerse(); return; }
    if (phase === 'basmala' || phase === 'verse') { silent = true; stopAudio(true); if (phase === 'basmala') { words = verseWords; layoutText(); } }
    if (ch === 'galaxy') { enterGalaxy(); shapesTour(); return; }
    if (ch === 'features') { if (!galaxyOn) enterGalaxy(); if (silent) shapesTour(); features(); return; }
    finale();
  }
  const chapterNow = () => phase === 'basmala' ? 'basmala' : phase === 'verse' ? 'verse' : phase === 'galaxy' ? 'galaxy' : phase === 'features' ? 'features' : 'end';
  root.querySelectorAll('.in-chap button').forEach(b => b.onclick = () => jump(b.dataset.ch));
  function railAt(ms) {
    const ch = chapterNow(), k = CH.indexOf(ch);
    let f = 0;
    if (ch === 'basmala') { const end = tim && tim.t ? tim.t[tim.t.length - 1] + 900 : 6000; f = ms / end; }
    else if (ch === 'verse') { const tt = timVerse && timVerse.t; f = ms / (tt ? tt[2 * 35] : 60000); }
    else if (ch === 'galaxy') f = (performance.now() - galT0) / 4500;
    else if (ch === 'features') f = (featK + Math.min(1, (performance.now() - featT0) / DUR[Math.max(0, featK)])) / t.feats.length;
    else f = 1;
    root.querySelectorAll('.in-chap button').forEach((b, j) => {
      b.classList.toggle('on', j === k); b.classList.toggle('past', j < k);
      const bar = b.querySelector('b'), w = j < k ? 100 : j === k ? Math.max(0, Math.min(100, f * 100)) : 0;
      if (bar.dataset.w !== w.toFixed(0)) { bar.dataset.w = w.toFixed(0); bar.style.width = `${w.toFixed(0)}%`; }
    });
  }

  // ---------------------------------------------------------------- the loop and the clock
  function loop() {
    if (!alive) return;
    const ms = clockMs(), cur = wordAt(ms);
    if (phase === 'basmala') {
      const endB = tim && tim.t ? tim.t[tim.t.length - 1] : 5200;
      if (ms > endB + 900) startVerse();
    } else if (phase === 'verse' || phase === 'galaxy' || phase === 'features') {
      if (phase === 'verse') logoAt(cur);
      // the last part of the verse («يهدي الله لنوره…») is read on the real galaxy
      if (phase === 'verse' && cur >= 35) enterGalaxy();
      if (galaxyOn && !silent && !shapesDone) galaxyAt(cur);
      const end = timVerse && timVerse.t ? timVerse.t[timVerse.t.length - 1] : 80060;
      if (galaxyOn && !shapesDone && (silent || (words === verseWords && ms > end + 600))) shapesTour();
    }
    if (!reduced || phase === 'verse' || phase === 'basmala') drawParticles(ms);
    railAt(Math.max(0, ms));
    raf = requestAnimationFrame(loop);
  }
  function done(query) {
    if (!alive) return;
    alive = false; cancelAnimationFrame(raf);
    timers.forEach(clearTimeout); clearTimeout(featTimer);
    stopAudio(false);
    try { ctx.galaxy.setActiveWord(null); ctx.galaxy.setReciting(false); } catch (e) { /* ignore */ }
    document.body.classList.remove('intro-on', 'intro-galaxy');
    root.classList.add('leaving');
    window.removeEventListener('resize', layoutText); document.removeEventListener('keydown', onKey, true);
    setTimeout(() => { root.remove(); try { ctx.galaxy.home(); } catch (e) { /* ignore */ } ctx.onDone && ctx.onDone(query); }, 600);
  }
  const onKey = (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done(); return; }
    if (phase === 'features' && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
      ev.preventDefault(); ev.stopPropagation();
      const fwd = (ev.key === 'ArrowLeft') === ar;     // reading direction: left is "next" in Arabic
      if (fwd) { if (featK + 1 >= t.feats.length) finale(); else goCard(featK + 1); } else goCard(Math.max(0, featK - 1));
    }
  };
  root.querySelector('.in-skip').onclick = () => done();
  const muteToggle = (ev) => { const b = ev.currentTarget, m = b.getAttribute('aria-pressed') !== 'true'; if (audio) audio.muted = m; b.setAttribute('aria-pressed', String(m)); b.textContent = `${m ? '🔇' : '🔊'} ${t.sound}`; };
  root.querySelector('.in-mute').onclick = muteToggle;
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', layoutText);
  // fonts first (the verse is sampled from the Amiri glyphs), then the recitation
  (document.fonts && document.fonts.load ? document.fonts.load('40px Amiri').catch(() => {}) : Promise.resolve()).then(async () => {
    if (!alive) return;
    layoutText();
    showTranslation(0);
    try { const all = await ctx.timing; timVerse = all && all[34]; } catch (e) { timVerse = null; }
    try { const b = await ctx.timingBasmala; tim = b && b[0]; } catch (e) { tim = null; }
    t0 = performance.now();
    later(() => { if (phase === 'basmala') startAudio(tim && tim.u); }, 1200);
    loop();
  });
  root.querySelector('.in-skip').focus();
  return { close: () => done() };
}
