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
// the narration is fully vowelled for the voice; the cards show it with the shadda only (easier to read)
export const plain = (s) => String(s).replace(/[ً-ِْ]/g, '');
// every narrated line of the film, by file name (tools/make_intro_voice.py reads them from here)
export const lines = (l) => Object.fromEntries([...IN[l].feats.map(([id, , p]) => [id, p]), ['galaxy', IN[l].bridge], ['greet', IN[l].greet]]);

export const IN = {
  ar: {
    skip: 'تخطَّ', start: 'ابدأ رحلتك', sound: 'الصوت', name: 'مِشكاة', sub: 'دليل مجرّة القرآن الذكي',
    nameFrom: 'الاسم والشعار من آية النور', galaxy: '٧٧٬٤٣٣ كلمة · كل كلمة نجمة', reader: 'وضع القارئ: الكلمة المتلوّة تضيء في المجرّة', shapes: 'أشكال ثلاثية الأبعاد لترتيب السور',
    lampLit: 'المشكاة تضيء بالسور التي تقرؤها',
    chapters: ['البسملة', 'آية النور', 'المجرّة', 'الخدمات', 'ابدأ'], chapNav: 'فصول العرض',
    // (5 Oct, evening) seven services, each narrated (public/audio/intro/ar/<id>.mp3, fusha, tools/make_intro_voice.py)
    // (6 Oct, author's review) rewritten as one spoken thread, each line leading to the next, fully vowelled so that
    // the voice reads every word right (the card shows the same line without the short vowels)
    feats: [
      ['search', 'بحث ذكي في القرآن', 'هَلْ فِي نَفْسِكَ سُؤَالٌ؟ اكْتُبْهُ بِكَلِمَاتِكَ، أَوْ قُلْهُ بِصَوْتِكَ. مِشْكَاةُ لَا تَكْتُبُ جَوَابًا مِنْ عِنْدِهَا: تَخْتَارُ مِنْ آيَاتِ الْمُصْحَفِ وَكُتُبِ التَّفْسِيرِ الْمُعْتَمَدَةِ، وَيُرَاجِعُ اخْتِيَارَهَا نَمُوذَجٌ ثَانٍ، فَيَصِلُكَ النَّصُّ كَمَا هُوَ، بِمَصْدَرِهِ.'],
      ['recite', 'التلاوة المتزامنة', 'وَإِذَا وَجَدْتَ آيَتَكَ، فَاسْتَمِعْ إِلَيْهَا بِصَوْتِ الشَّيْخِ مِشَارِي الْعَفَاسِيِّ؛ كُلُّ كَلِمَةٍ يَتْلُوهَا تُضِيءُ أَمَامَكَ، فِي الْمُصْحَفِ وَفِي الْمَجَرَّةِ.'],
      ['khatma', 'الختمة', 'وَإِنْ أَرَدْتَ أَنْ تَخْتِمَ الْقُرْآنَ، فَضَعْ خُطَّتَكَ عَلَى أَيَّامِكَ، أَوْ دَعْ مِشْكَاةَ تَخْتَارُ لَكَ؛ وَكُلُّ سُورَةٍ تَقْرَؤُهَا تُضِيءُ فِي الْمِشْكَاةِ.'],
      ['tekrar', 'الحفظ بالتكرار', 'وَإِنْ كُنْتَ تَحْفَظُ، فَكَرِّرِ الْآيَةَ وَمِشْكَاةُ تَعُدُّ مَعَكَ، بِتَمَهُّلٍ قَرِيبٍ مِنْ تِلَاوَةِ الشَّيْخِ، حَتَّى تُتْقِنَ.'],
      ['prayer', 'الصلاة والقبلة والمساجد', 'وَإِذَا حَانَ وَقْتُ الصَّلَاةِ، وَجَدْتَ مَوَاقِيتَهَا فِي مَدِينَتِكَ، وَاتِّجَاهَ الْقِبْلَةِ عَلَى الْبُوصَلَةِ، وَأَقْرَبَ الْمَسَاجِدِ إِلَيْكَ عَلَى الْخَرِيطَةِ.'],
      ['child', 'وضع آمن للأطفال', 'وَلِأَطْفَالِكَ وَضْعٌ آمِنٌ، يُبْعِدُهُمْ عَنِ الْفَتَاوَى وَالْمَوْضُوعَاتِ الْحَسَّاسَةِ، وَيُحَبِّبُ إِلَيْهِمُ الْحِفْظَ بِلُطْفٍ.'],
      ['install', 'على هاتفك وحاسوبك', 'وَمِشْكَاةُ مَعَكَ أَيْنَمَا كُنْتَ: ثَبِّتْهَا عَلَى هَاتِفِكَ أَوْ حَاسُوبِكَ مِنَ الْمُتَصَفِّحِ مُبَاشَرَةً، بِلَا إِعْلَانَاتٍ، وَلَا تَتَبُّعٍ.'],
    ],
    // the bridge from the verse to the services, said over the turning shapes (public/audio/intro/ar/galaxy.mp3)
    bridge: 'فِي هَذِهِ الْمَجَرَّةِ كَلِمَاتُ الْقُرْآنِ كُلُّهَا: أَكْثَرُ مِنْ سَبْعَةٍ وَسَبْعِينَ أَلْفَ كَلِمَةٍ، لِكُلِّ كَلِمَةٍ نَجْمَةٌ. فَمَاذَا تَجِدُ فِي مِشْكَاةَ؟',
    greet: 'أَهْلًا بِكَ فِي مِشْكَاةَ. كَيْفَ يُمْكِنُنِي أَنْ أُسَاعِدَكَ؟',
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
      ['search', 'Smart Quran search', 'Got a question? Type it in your own words, or just ask it out loud. Mishkat never writes an answer of its own: it picks from the Mushaf and trusted tafsir, a second model checks that choice, and the text reaches you exactly as it is, with its source.'],
      ['recite', 'Synchronised recitation', 'Found your verse? Listen to it in the voice of Sheikh Mishary Alafasy, and watch every word light up as he recites it, in the Mushaf and in the galaxy.'],
      ['khatma', 'Khatma', 'Want to read the whole Quran? Make a plan that fits your days, or let Mishkat choose one for you; every surah you read lights up inside the lamp.'],
      ['tekrar', 'Memorising by repetition', 'Memorising? Repeat the verse and Mishkat counts with you, at a calm pace close to the reciter’s, until you know it by heart.'],
      ['prayer', 'Prayer, qibla & mosques', 'When it is time to pray, you will find the prayer times for your city, the qibla on a compass, and the nearest mosques on a map.'],
      ['child', 'A safe mode for children', 'And for your children, a safe mode that keeps fatwas and sensitive topics away, and gently makes memorising a joy.'],
      ['install', 'On your phone & computer', 'Mishkat goes wherever you go: install it on your phone or computer straight from the browser. No ads, no tracking.'],
    ],
    bridge: 'This galaxy holds every word of the Quran: more than seventy-seven thousand words, one star for each. So, what can you find in Mishkat?',
    greet: 'Welcome to Mishkat. How can I help you?',
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
// (6 Oct) the shapes of the galaxy part, each on a recited word of 24:35 (0-based): 40 «وَيَضْرِبُ», 44 «وَٱللَّهُ»
export const CUES = [{ at: 40, shape: 'rose' }, { at: 44, shape: 'zahra' }];
// card durations (ms): the search card is the longest — it is the heart of the site
export const DUR = [20200, 11600, 11400, 10000, 11600, 9900, 10700];   // fallback when the narration cannot play (≈ its length + 0.6 s)

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
    <div class="in-word" dir="rtl" lang="ar" aria-hidden="true"></div>
    <div class="in-ctl"><button type="button" class="in-mute" aria-pressed="false">🔊 ${esc(t.sound)}</button><button type="button" class="in-skip">${esc(t.skip)} ⏭</button></div>
    <nav class="in-chap" aria-label="${esc(t.chapNav)}">${t.chapters.map((c, k) => `<button type="button" data-ch="${CH[k]}"><i><b></b></i><span>${esc(c)}</span></button>`).join('')}</nav>`;
  document.body.appendChild(root);
  document.body.classList.add('intro-on');
  const cv = root.querySelector('.in-cv'), g = cv.getContext('2d');
  const cap = root.querySelector('.in-cap'), stage = root.querySelector('.in-stage'), logo = root.querySelector('.in-logo'), labelsEl = root.querySelector('.in-labels');
  const trEl = root.querySelector('.in-tr');
  let W = 0, H = 0, DPR = 1, parts = [], wordBox = [], txtCv = null, wordLit = [], lineH = 0, lastDraw = 0, alive = true, raf = 0, audio = null, t0 = performance.now(), tim = null, phase = 'basmala', galaxyOn = false, timVerse = null;
  let leaveT0 = 0;
  let silent = false;                             // the visitor jumped ahead: the recitation was stopped, the film runs on its clock
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
      placeLogo();
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
    const top = phase === 'basmala' ? H * (phone ? 0.3 : 0.26) : phone ? H * 0.1 : Math.max(66, H * 0.09);   // below the name and its subtitle
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
    // (5 Oct, evening) one small canvas PER WORD, with room for its glow: cutting each word out of one canvas of the
    // whole verse (a rectangle around the word) also cut pieces of the neighbouring letters and clipped the glow into
    // visible luminous edges around words that were not being recited (author's remark).
    const pad = Math.ceil(Math.max(8, fs * 0.6));
    txtCv = wordBox.map((b, k) => {
      if (!b) return null;
      const c = document.createElement('canvas'), w = b.x1 - b.x0 + 2 * pad, h = lh + 2 * pad;
      c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
      const x = c.getContext('2d');
      x.setTransform(DPR, 0, 0, DPR, 0, 0);
      x.font = o.font; x.textBaseline = 'middle'; x.lineJoin = 'round';
      x.shadowColor = 'rgba(255, 196, 80, .4)'; x.shadowBlur = Math.max(4, fs * 0.2);
      x.fillStyle = '#fff8ea'; x.fillText(words[k], pad, pad + lh / 2);
      x.shadowBlur = 0; x.strokeStyle = 'rgba(255, 210, 110, .7)'; x.lineWidth = Math.max(0.5, fs / 40);
      x.strokeText(words[k], pad, pad + lh / 2);
      return { c, w, h, pad };
    });
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
    belowVerse = top + lines.length * lh + 14;
    placeLogo();
  }
  // (6 Oct, author's review) the logo lives between the verse and what is under it — in English the translation,
  // whose real height is measured: on a laptop screen the logo used to be pushed up over the verse and under the
  // English sentence. The translation gets smaller first, then the lamp; they never overlap.
  let belowVerse = 0;
  function placeLogo() {
    const lamp = root.querySelector('.in-lamp svg');
    if (!lamp || !W) return;
    const phone = W < 700, rail = phone ? 44 : 64;
    const labH = phone ? 64 : ar ? 40 : 86, fromH = phone ? 40 : 26;   // the word labels (two rows in English) and the line above the lamp
    const maxL = phone ? Math.min(170, W * 0.42) : Math.min(260, H * 0.32);
    let room = 0;
    for (const fs of [15, 14, 13, 12, 11]) {
      if (!ar && phone) trEl.style.fontSize = `${Math.max(11, fs - 2)}px`; else if (!ar) trEl.style.fontSize = `${fs}px`;
      const trH = !ar && trEl.textContent && !trEl.hidden ? trEl.offsetHeight + 10 : 40;   // Arabic: the caption line
      room = (H - rail - trH) - belowVerse - fromH - labH - 12;
      if (ar || room >= 90) break;
    }
    const ls = Math.max(48, Math.min(maxL, room));
    lamp.setAttribute('width', ls); lamp.setAttribute('height', ls);
    logo.style.top = `${belowVerse}px`;
    logo.classList.toggle('tight', room < 48);       // no room at all (a very low window): the word labels give way
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
    // (6 Oct, author's review) the points flowing out into the galaxy fade away within 2.5 s: left to themselves they
    // settled on an orbit around the centre and drew the white circle seen over the 3D shapes
    if (leaving && !leaveT0) leaveT0 = performance.now();
    const fade = leaving ? Math.max(0, 1 - (performance.now() - leaveT0) / 2500) : 1;
    if (fade <= 0) { parts = []; txtCv = null; return; }
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
      g.fillStyle = hot ? 'rgba(255,222,130,0.5)' : on ? 'rgba(255,236,190,0.14)' : leaving ? `rgba(150,175,230,${(0.05 * fade).toFixed(3)})` : 'rgba(150,175,230,0.05)';
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
        const wc = txtCv[k];
        if (!wc) continue;
        const x = b.x0 - wc.pad, y = b.y - lineH / 2 - wc.pad;
        g.globalAlpha = wordLit[k] * (k === cur && !leaving ? 1 : 0.9);
        g.drawImage(wc.c, x, y, wc.w, wc.h);
        if (k === cur && !leaving) {                 // the recited word glows a little more
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22 * wordLit[k];
          g.drawImage(wc.c, x, y, wc.w, wc.h);
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
  // (6 Oct, author's review) the shapes change ON the recited words — «وَيَضْرِبُ ٱللَّهُ ٱلْأَمْثَٰلَ» brings the rose,
  // «وَٱللَّهُ بِكُلِّ شَىْءٍ عَلِيمٌ» the challenge's flower — and every shape keeps turning (at the site's calm speed a
  // whole turn took ≈ 3 minutes: the flower looked frozen while only the words changed)
  let galW0 = 0, lastGW = -1, shapesDone = false, cueK = 0, bridged = false, bridgeT0 = 0, bridgeMs = 10000;
  const spin = () => { try { ctx.galaxy.setAutoRotate(true, 1.6); } catch (e) { /* ignore */ } };
  function toShape(sh) { ctx.setView(sh, 'mushaf'); later(spin, 2500); }
  // (6 Oct) the thread of the reader's current verse (1:1 by default, at the very centre of the spiral) was drawn
  // over the film as a white circle: hidden while the film plays, given back at the end
  let focus0 = null;
  function hideThread() { try { const f = ctx.galaxy.focusVerse; if (f != null) { focus0 = f; ctx.galaxy.setFocusVerse(null); } } catch (e) { /* ignore */ } }
  hideThread();
  try { if (ctx.prepare) for (const c of CUES) ctx.prepare(c.shape, 'mushaf'); } catch (e) { /* ignore */ }
  function enterGalaxy() {
    if (galaxyOn) return;
    galaxyOn = true; phase = 'galaxy'; galT0 = performance.now();
    root.classList.add('see-galaxy'); document.body.classList.add('intro-galaxy');
    trEl.classList.add('away');
    cap.textContent = t.reader;
    hideThread();
    try { ctx.galaxy.home(); [galW0] = ctx.galaxy.wordsOfVerse(vIdx); ctx.galaxy.setReciting(!silent); } catch (e) { /* galaxy not ready */ }
    later(spin, 1600);
    root.classList.add('see-word');
    // (5 Oct, evening) the services come only AFTER the whole verse has been recited (loop below); when the visitor
    // jumped ahead (no recitation), the shapes and the bridge come at once
    if (silent) later(bridge, 600);
  }
  // (5 Oct, evening) the word being recited is written large over the galaxy, in time with the recitation, and its star
  // lights up; the camera no longer dives onto the word (at that distance the verse's own turn of the helix filled the
  // screen as a big white circle, author's remark) — it keeps a calm view of the whole galaxy
  const wordEl = root.querySelector('.in-word');
  function galaxyAt(cur) {
    if (silent || !ctx.galaxy || cur < 0 || cur === lastGW) return;
    lastGW = cur;
    while (cueK < CUES.length && cur >= CUES[cueK].at) toShape(CUES[cueK++].shape);
    try { ctx.galaxy.setActiveWord(galW0 + cur, words[cur]); } catch (e) { /* ignore */ }
    wordEl.textContent = words[cur]; wordEl.classList.remove('pop'); void wordEl.offsetWidth; wordEl.classList.add('pop');
  }
  // the shapes not reached yet, one after the other (when the visitor jumped ahead: no recitation to follow)
  function shapesTour() {
    if (shapesDone) return;
    shapesDone = true;
    CUES.slice(cueK).forEach((c, k) => later(() => toShape(c.shape), 300 + k * 3600));
    cueK = CUES.length;
  }
  // after the verse: one spoken sentence leads from the galaxy to the services (no jump from one to the other)
  function bridge() {
    if (bridged || featuresOn) return;
    bridged = true; bridgeT0 = performance.now();
    shapesTour();
    try { ctx.galaxy.setActiveWord(null); ctx.galaxy.setReciting(false); } catch (e) { /* ignore */ }
    root.classList.remove('see-word'); wordEl.textContent = '';
    cap.textContent = ar ? plain(t.bridge) : t.bridge;
    clearTimeout(featTimer);
    featTimer = later(features, (silent ? 7600 : 10500));
    say('galaxy', (ms) => { if (featuresOn) return; clearTimeout(featTimer); bridgeMs = ms + 900; featTimer = later(features, ms + 900); });
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
    const [id, h, p] = t.feats[k];
    let demo = '';
    if (id === 'search') demo = searchDemo();
    else if (id === 'recite') demo = `<p class="d-rec" dir="rtl" lang="ar">${verseWords.slice(4, 9).map((w, j) => `<span style="--j:${j}">${esc(w)}</span>`).join(' ')}</p>`;
    else if (id === 'khatma') demo = `<div class="d-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="r0"/><circle cx="60" cy="60" r="50" class="r1" pathLength="100"/></svg><div class="d-mini">${lampSVG({ size: 74, animated: false, title: '' })}</div></div>`;
    else if (id === 'prayer') { const q = ctx.qibla(); demo = `<div class="d-two"><div class="d-pray"><small>${esc(t.next)} ${esc(t.place(ctx.placeName()))}</small><b class="d-count" dir="ltr">00:42:17</b></div><div class="d-comp"><i class="d-needle" style="--q:${q == null ? 110 : Math.round(q)}deg"></i><span>N</span></div><div class="d-map">${[18, 42, 66, 30, 76].map((x, j) => `<i style="--x:${x}%;--y:${[30, 60, 38, 70, 55][j]}%;--d:${j * 0.25}s"></i>`).join('')}</div></div>`; }
    else if (id === 'tekrar') demo = `<button type="button" class="d-tk" tabindex="-1"><b>0</b><small>${esc(t.counter)}</small></button>`;
    else if (id === 'child') demo = `<div class="d-kid"><span>🧒</span><span>🛡️</span><span>📖</span></div>`;
    else demo = `<div class="d-inst"><span class="d-phone">📱</span><span class="d-pc">💻</span></div>`;
    stage.innerHTML = `<article class="in-card big"><div class="in-demo">${demo}</div><h3>${esc(h)}</h3><p>${esc(ar ? plain(p) : p)}</p>
      <div class="in-dots">${t.feats.map((f, j) => `<button type="button" class="${j === k ? 'on' : ''}" data-k="${j}" aria-label="${esc(f[0])}"></button>`).join('')}</div></article>`;
    stage.querySelectorAll('.in-dots button').forEach(b => b.onclick = () => goCard(+b.dataset.k));
    if (id === 'search') {
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
    if (id === 'prayer') { const c = stage.querySelector('.d-count'); let s = 42 * 60 + 17; const iv = setInterval(() => { if (!alive || !c.isConnected) return clearInterval(iv); s--; c.textContent = `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000); }
    if (id === 'tekrar') { const b = stage.querySelector('.d-tk b'); let n = 0; const iv = setInterval(() => { if (!alive || !b.isConnected) return clearInterval(iv); n = Math.min(7, n + 1); b.textContent = String(n); b.parentElement.classList.remove('pop'); void b.offsetWidth; b.parentElement.classList.add('pop'); }, 480); }
    clearTimeout(featTimer);
    const next = () => (k + 1 >= t.feats.length ? finale() : featureCard(k + 1));
    // the card stays as long as its narration, then 0.9 s; without sound, its fallback duration
    say(id, (ms) => { clearTimeout(featTimer); featTimer = later(next, ms + 900); });
    featTimer = later(next, (reduced ? 1.3 : 1) * DUR[k]);
  }
  // ---------------------------------------------------------------- the narration (fusha / English), never a verse
  let voiceA = null;
  function say(id, onLen) {
    if (voiceA) { voiceA.pause(); voiceA = null; }
    const muted = root.querySelector('.in-mute').getAttribute('aria-pressed') === 'true';
    const a = new Audio(`audio/intro/${ar ? 'ar' : 'en'}/${id}.mp3`);
    a.muted = muted; voiceA = a;
    a.addEventListener('loadedmetadata', () => { if (voiceA === a && onLen && isFinite(a.duration)) onLen(a.duration * 1000); }, { once: true });
    a.play().catch(() => { /* blocked: the card keeps its fallback duration */ });
  }
  function goCard(k) { if (phase === 'features' && k >= 0 && k < t.feats.length) featureCard(k); }
  function features() {
    if (featuresOn) return;
    featuresOn = true;
    if (!galaxyOn) enterGalaxy();
    phase = 'features'; cap.textContent = '';
    root.classList.remove('see-word'); wordEl.textContent = '';
    root.classList.add('feat');
    logo.classList.add('small');
    featureCard(0);
  }
  function finale() {
    phase = 'end'; clearTimeout(featTimer);
    if (!featuresOn) { featuresOn = true; if (!galaxyOn) enterGalaxy(); }
    root.classList.remove('feat'); root.classList.add('fin');
    stopAudio(true);
    shapesDone = true; toShape('galaxy');           // the end on the galaxy of the Mushaf, the lamp above it
    logo.classList.remove('small'); logo.classList.add('final');
    cap.textContent = t.lampLit;
    const prog = ctx.core.suras.map(() => 0);
    const box = document.createElement('div'); box.className = 'in-dotsLamp'; root.querySelector('.in-lamp').appendChild(box);
    let n = 0;
    const iv = setInterval(() => { if (!alive) return clearInterval(iv); for (let j = 0; j < 4 && n < 114; j++) prog[n++] = 1; box.innerHTML = miniLamp(prog, ctx.core.suras, 'mushaf'); if (n >= 114) clearInterval(iv); }, 60);
    stage.innerHTML = `<div class="in-end"><button type="button" class="btn gold big in-go">${esc(t.start)}</button>
      <p class="in-try"><span>${esc(t.tryLead)}</span>${t.tryQ.map(q => `<button type="button" class="in-q" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</p></div>`;
    // the search engine greets the visitor and asks how it can help (fusha in Arabic, English otherwise)
    later(() => say('greet'), 700);
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
    if (ch === 'galaxy') { if (galaxyOn) bridge(); else enterGalaxy(); return; }
    if (ch === 'features') { if (!galaxyOn) enterGalaxy(); shapesTour(); features(); return; }
    finale();
  }
  const chapterNow = () => phase === 'basmala' ? 'basmala' : phase === 'verse' ? 'verse' : phase === 'galaxy' ? 'galaxy' : phase === 'features' ? 'features' : 'end';
  root.querySelectorAll('.in-chap button').forEach(b => b.onclick = () => jump(b.dataset.ch));
  function railAt(ms) {
    const ch = chapterNow(), k = CH.indexOf(ch);
    let f = 0;
    if (ch === 'basmala') { const end = tim && tim.t ? tim.t[tim.t.length - 1] + 900 : 6000; f = ms / end; }
    else if (ch === 'verse') { const tt = timVerse && timVerse.t; f = ms / (tt ? tt[2 * 35] : 60000); }
    else if (ch === 'galaxy') f = bridged ? 0.5 + 0.5 * (performance.now() - bridgeT0) / bridgeMs : silent ? 0 : 0.5 * Math.max(0, wordAt(ms) - 34) / 13;
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
      if (galaxyOn && !silent && !bridged) galaxyAt(cur);
      const end = timVerse && timVerse.t ? timVerse.t[timVerse.t.length - 1] : 80060;
      if (galaxyOn && !bridged && !silent && words === verseWords && ms > end + 700) bridge();
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
    if (voiceA) { voiceA.pause(); voiceA = null; }
    try { ctx.galaxy.setActiveWord(null); ctx.galaxy.setReciting(false); ctx.galaxy.setAutoRotate(true, 0.35); if (focus0 != null) ctx.galaxy.setFocusVerse(focus0); } catch (e) { /* ignore */ }
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
  const muteToggle = (ev) => { const b = ev.currentTarget, m = b.getAttribute('aria-pressed') !== 'true'; if (audio) audio.muted = m; if (voiceA) voiceA.muted = m; b.setAttribute('aria-pressed', String(m)); b.textContent = `${m ? '🔇' : '🔊'} ${t.sound}`; };
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
