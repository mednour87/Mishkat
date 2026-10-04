// T098 — the presentation film, shown once at the first visit (after the basmala and the choice of the place), with a
// Skip button. It is drawn live (no video file): the verse of light (24:35) recited by Sheikh Alafasy, its words
// gathering as luminous points in time with the recitation; the logo built part by part on the words it comes from
// (مشكاة · مصباح · زجاجة · كوكب دري · شجرة مباركة زيتونة · زيتها يضيء · نور على نور); then a real transition into the
// 3D galaxy of the page, where the reader mode lights the words of the same verse, the shapes change, and the lamp
// fills with the surahs read; finally a quick motion-graphic tour of the services (AI search, khatma, prayer, qibla,
// mosques, repetition, statistics, engagement, installing the app).
// Religious text shown: only the Tanzil text of the verses (core.json) and the verse words themselves as labels.
import { lampSVG } from './lamp.js';
import { miniLamp } from './lampmap.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const IN = {
  ar: {
    skip: 'تخطَّ', start: 'ابدأ رحلتك', sound: 'الصوت', name: 'مِشكاة', sub: 'دليل مجرّة القرآن الذكي',
    nameFrom: 'الاسم والشعار من آية النور', galaxy: '٧٧٬٤٣٣ كلمة · كل كلمة نجمة', reader: 'وضع القارئ: الكلمة المتلوّة تضيء في المجرّة', shapes: 'أشكال ثلاثية الأبعاد لترتيب السور',
    lampLit: 'المشكاة تضيء بالسور التي تقرؤها',
    feats: [
      ['بحث ذكي في القرآن', 'سؤال بالعربية أو الإنجليزية، فيختار الذكاء الاصطناعي الآيات من قائمة مغلقة، والنص من المصحف والتفسير المعتمد.'],
      ['الختمة', 'خطة على أيامك وأوقاتك، والسور المقروءة تضيء في المشكاة.'],
      ['مواقيت الصلاة', 'حسب مدينتك، مع عدّ تنازلي للصلاة القادمة.'],
      ['القبلة', 'اتجاه الكعبة من موقعك، مع بوصلة الهاتف.'],
      ['المساجد القريبة', 'من خريطة OpenStreetMap، ومسار في Google Maps.'],
      ['التكرار والحفظ', 'عدّاد لكل تكرار، ووقت أدنى قريب من وقت الشيخ، وتشجيع دائم.'],
      ['الإحصاءات', 'السور والكلمات ومواضعها — دون حساب الجُمَّل.'],
      ['خريطة الالتزام', 'ثلاثة مستويات بأسماء من آية النور: غرسة، زيتونة، كوكب دري.'],
      ['ثبّت التطبيق', 'على الهاتف والحاسوب من المتصفح مباشرة.'],
    ],
    demoQ: 'ماذا يقول القرآن عن الصبر؟', demoNote: 'الآيات من قائمة مغلقة · النص من المصحف', counter: 'كرّرتُ', next: 'الصلاة القادمة', place: (p) => p ? `في ${p}` : '',
  },
  en: {
    skip: 'Skip', start: 'Start your journey', sound: 'Sound', name: 'Mishkat', sub: 'the smart guide to the Quran galaxy',
    nameFrom: 'The name and the logo come from the verse of light', galaxy: '77,433 words · every word a star', reader: 'Reader mode: the recited word lights up in the galaxy', shapes: '3D shapes to order the surahs',
    lampLit: 'The lamp lights up with the surahs you read',
    feats: [
      ['Smart Quran search', 'Ask in Arabic or English: the AI picks verses from a closed list; the text comes from the Mushaf and vetted tafsir.'],
      ['Khatma', 'A plan on your days and times; the surahs you read light up in the lamp.'],
      ['Prayer times', 'For your city, with a countdown to the next prayer.'],
      ['Qibla', 'The direction of the Kaaba from where you are, with the phone’s compass.'],
      ['Nearby mosques', 'From OpenStreetMap, with a route in Google Maps.'],
      ['Repetition & memorising', 'A counter for each repetition, a minimal time close to the reciter’s, constant encouragement.'],
      ['Statistics', 'Surahs, words and where they occur — no letter values.'],
      ['Engagement map', 'Three levels named from the verse of light: sapling, olive tree, shining star.'],
      ['Install the app', 'On your phone and computer, straight from the browser.'],
    ],
    demoQ: 'What does the Quran say about patience?', demoNote: 'Verses from a closed list · text from the Mushaf', counter: 'Repeated', next: 'Next prayer', place: (p) => p ? `in ${p}` : '',
  },
};

// words of 24:35 at which each part of the logo appears (0-based word index in the Tanzil verse)
// 6 كمشكاة · 8 مصباح · 11 زجاجة · 14–15 كوكب دري · 18–20 شجرة مباركة زيتونة · 26–27 زيتها يضيء · 32–34 نور على نور
const PARTS = [
  { at: 6, cls: 'p-niche' }, { at: 8, cls: 'p-lamp' }, { at: 11, cls: 'p-glass' }, { at: 14, cls: 'p-star' },
  { at: 18, cls: 'p-tree' }, { at: 26, cls: 'p-oil' }, { at: 32, cls: 'p-halo' },
];
const PHRASES = [[6], [8], [11], [14, 15], [18, 19, 20], [26, 27], [32, 33, 34]];   // written beside the logo as it grows

// ctx: { lang(), core, galaxy, audioBase, timing: Promise<array of surah 24>, placeName(), setView(shape, order), qibla(): degrees|null, onDone() }
export function playIntro(ctx) {
  const lang = ctx.lang(), t = IN[lang] || IN.ar, ar = lang === 'ar';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = ctx.core.suras[23], vIdx = S.first + 34;
  const words = ctx.core.verses[vIdx].split(' ');
  const root = document.createElement('div');
  root.id = 'intro'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', t.name);
  root.dir = ar ? 'rtl' : 'ltr';
  root.innerHTML = `<canvas class="in-cv" aria-hidden="true"></canvas>
    <div class="in-brand"><b>${esc(t.name)}</b><small>${esc(t.sub)}</small></div>
    <div class="in-cap" aria-live="polite"></div>
    <div class="in-logo" aria-hidden="true"><p class="in-from"></p><div class="in-lamp">${lampSVG({ size: 240, title: 'Mishkat' })}</div><div class="in-labels"></div></div>
    <div class="in-stage" aria-live="polite"></div>
    <div class="in-ctl"><button type="button" class="in-mute" aria-pressed="false">🔊 ${esc(t.sound)}</button><button type="button" class="in-skip">${esc(t.skip)} ⏭</button></div>
    <div class="in-prog"><i></i></div>`;
  document.body.appendChild(root);
  document.body.classList.add('intro-on');
  const cv = root.querySelector('.in-cv'), g = cv.getContext('2d');
  const cap = root.querySelector('.in-cap'), stage = root.querySelector('.in-stage'), logo = root.querySelector('.in-logo'), labelsEl = root.querySelector('.in-labels');
  let W = 0, H = 0, DPR = 1, parts = [], wordBox = [], alive = true, raf = 0, audio = null, t0 = performance.now(), tim = null, phase = 'verse', galaxyOn = false;

  // ---------------------------------------------------------------- the verse as luminous points
  function layoutText() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const phone = W < 700, fs = phone ? Math.max(21, Math.min(28, W / 15)) : Math.min(44, W / 27, H / 17);
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
    const top = phone ? H * 0.1 : H * 0.09;
    wordBox = [];
    lines.forEach((ln, r) => {
      const total = ln.reduce((s, x) => s + x.ww, 0) + gap * (ln.length - 1);
      let x = (W + total) / 2;                       // right to left
      const y = top + r * lh + lh / 2;
      for (const { k, ww } of ln) { x -= ww; o.fillText(words[k], x, y); wordBox[k] = { x0: x, x1: x + ww, y }; x -= gap; }
    });
    const step = 2, img = o.getImageData(0, 0, off.width, off.height).data;
    const old = parts; parts = [];
    let lit = 0;
    for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) if (img[(y * off.width + x) * 4 + 3] >= 128) lit++;
    const keep = Math.min(1, (phone ? 3800 : 7000) / Math.max(1, lit));
    for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) {
      if (img[(y * off.width + x) * 4 + 3] < 128 || Math.random() > keep) continue;
      let k = 0; for (let j = 0; j < wordBox.length; j++) { const b = wordBox[j]; if (b && x >= b.x0 - 2 && x <= b.x1 + 2 && Math.abs(y - b.y) < lh / 2) { k = j; break; } }
      const prev = old[parts.length];
      const a = Math.random() * 6.283, r = 25 + Math.random() * 70;
      parts.push({ tx: x, ty: y, ox: Math.cos(a) * r, oy: Math.sin(a) * r * 0.6, x: prev ? prev.x : Math.random() * W, y: prev ? prev.y : Math.random() * H, vx: 0, vy: 0, k, tw: Math.random() * 6.28 });
    }
    const lamp = root.querySelector('.in-lamp svg');
    const below = top + lines.length * lh + 14;
    const ls = Math.max(110, Math.min(phone ? Math.min(170, W * 0.42) : Math.min(260, H * 0.32), H - below - 120));
    if (lamp) { lamp.setAttribute('width', ls); lamp.setAttribute('height', ls); }
    logo.style.top = `${Math.min(H - ls - 95, below)}px`;
  }
  // the word being recited (index) from the audio clock
  const clockMs = () => audio && !audio.paused && audio.currentTime > 0 ? audio.currentTime * 1000 : performance.now() - t0 - 1200;
  const wordAt = (ms) => {
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
    const cur = wordAt(ms), leaving = phase !== 'verse';
    for (const p of parts) {
      const on = p.k <= cur && !leaving;
      let ax, ay;
      if (leaving) {                                // flowing out into the galaxy: a spiral towards the centre
        const dx = p.x - W / 2, dy = p.y - H / 2, r = Math.hypot(dx, dy) + 1;
        ax = (-dy / r) * 0.9 - dx * 0.004; ay = (dx / r) * 0.9 - dy * 0.004;
      } else if (on) { ax = (p.tx - p.x) * 0.09; ay = (p.ty - p.y) * 0.09; }
      else { p.tw += 0.015; ax = (p.tx + p.ox + Math.cos(p.tw) * 12 - p.x) * 0.025; ay = (p.ty + p.oy + Math.sin(p.tw * 1.3) * 8 - p.y) * 0.025; }
      p.vx = (p.vx + ax) * 0.86; p.vy = (p.vy + ay) * 0.86; p.x += p.vx; p.y += p.vy;
      const hot = p.k === cur && !leaving;
      g.fillStyle = hot ? 'rgba(255,222,130,1)' : on ? 'rgba(255,244,215,0.8)' : 'rgba(150,175,230,0.07)';
      const s = hot ? 2.4 : on ? 1.9 : 1.1;
      g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  }

  // ---------------------------------------------------------------- logo parts and labels
  let shownParts = 0;
  function logoAt(cur) {
    while (shownParts < PARTS.length && cur >= PARTS[shownParts].at) { logo.classList.add(PARTS[shownParts].cls); shownParts++; }
    const labs = PHRASES.filter(ph => ph[0] <= cur).map(ph => `<span>${esc(ph.filter(k => k <= cur).map(k => words[k]).join(' '))}</span>`).join('');
    if (labelsEl.dataset.h !== labs) { labelsEl.innerHTML = labs; labelsEl.dataset.h = labs; }
    if (cur >= 6 && phase === 'verse') { const f = logo.querySelector('.in-from'); if (!f.textContent) f.textContent = t.nameFrom; }
  }

  // ---------------------------------------------------------------- the real galaxy (reader mode on the same verse)
  let galW0 = 0, lastGW = -1, shapeT = 0;
  function enterGalaxy() {
    galaxyOn = true; phase = 'galaxy';
    root.classList.add('see-galaxy'); document.body.classList.add('intro-galaxy');
    cap.textContent = t.reader;
    try { ctx.galaxy.setAutoRotate(true); [galW0] = ctx.galaxy.wordsOfVerse(vIdx); ctx.galaxy.setReciting(true); } catch (e) { /* galaxy not ready */ }
  }
  function galaxyAt(ms, cur) {
    if (!ctx.galaxy || cur < 0 || cur === lastGW) return;
    lastGW = cur;
    try { ctx.galaxy.setActiveWord(galW0 + cur, words[cur]); ctx.galaxy.lookAtWord(galW0 + cur); } catch (e) { /* ignore */ }
  }
  function shapesTour() {
    phase = 'shapes'; cap.textContent = t.shapes;
    try { ctx.galaxy.setActiveWord(null); ctx.galaxy.setReciting(false); ctx.galaxy.home(); } catch (e) { /* ignore */ }
    const tour = [['rose', 'mushaf'], ['dome', 'nuzul'], ['galaxy', 'mushaf']];
    tour.forEach(([sh, od], k) => setTimeout(() => { if (alive) ctx.setView(sh, od); }, k * 2600));
    shapeT = performance.now();
  }

  // ---------------------------------------------------------------- the services, one card after another
  const lampDots = () => { const prog = ctx.core.suras.map(() => 0); return prog; };
  function featureCard(k) {
    const [h, p] = t.feats[k];
    let demo = '';
    if (k === 0) {
      const v = ctx.core.verses[ctx.core.suras[1].first + 152];   // 2:153, Tanzil text
      demo = `<div class="d-search"><span class="d-q"></span><i class="d-caret"></i></div><div class="d-ans"><p class="d-v" dir="rtl" lang="ar">${esc(v)} <small>﴿٢:١٥٣﴾</small></p><small>${esc(t.demoNote)}</small></div>`;
    } else if (k === 1) demo = `<div class="d-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="r0"/><circle cx="60" cy="60" r="50" class="r1" pathLength="100"/></svg><div class="d-mini">${lampSVG({ size: 74, animated: false, title: '' })}</div></div>`;
    else if (k === 2) demo = `<div class="d-pray"><small>${esc(t.next)} ${esc(t.place(ctx.placeName()))}</small><b class="d-count" dir="ltr">00:42:17</b></div>`;
    else if (k === 3) { const q = ctx.qibla(); demo = `<div class="d-comp"><i class="d-needle" style="--q:${q == null ? 110 : Math.round(q)}deg"></i><span>N</span></div>`; }
    else if (k === 4) demo = `<div class="d-map">${[18, 42, 66, 30, 76].map((x, j) => `<i style="--x:${x}%;--y:${[30, 60, 38, 70, 55][j]}%;--d:${j * 0.25}s"></i>`).join('')}</div>`;
    else if (k === 5) demo = `<button type="button" class="d-tk" tabindex="-1"><b>0</b><small>${esc(t.counter)}</small></button>`;
    else if (k === 6) demo = `<div class="d-bars">${[90, 64, 48, 36, 22].map((v, j) => `<i style="--v:${v}%;--d:${j * 0.15}s"></i>`).join('')}</div>`;
    else if (k === 7) demo = `<div class="d-lv">${[0, 1, 2].map(j => `<i style="--j:${j}"></i>`).join('')}<b></b></div>`;
    else demo = `<div class="d-inst"><span class="d-phone">📱</span><span class="d-pc">💻</span></div>`;
    stage.innerHTML = `<article class="in-card"><div class="in-demo">${demo}</div><h3>${esc(h)}</h3><p>${esc(p)}</p><div class="in-dots">${t.feats.map((_, j) => `<i class="${j === k ? 'on' : ''}"></i>`).join('')}</div></article>`;
    if (k === 0) { const q = stage.querySelector('.d-q'); let n = 0; const iv = setInterval(() => { if (!alive || !q.isConnected) return clearInterval(iv); q.textContent = t.demoQ.slice(0, ++n); if (n >= t.demoQ.length) { clearInterval(iv); stage.querySelector('.d-ans').classList.add('on'); } }, 55); }
    if (k === 2) { const c = stage.querySelector('.d-count'); let s = 42 * 60 + 17; const iv = setInterval(() => { if (!alive || !c.isConnected) return clearInterval(iv); s--; c.textContent = `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000); }
    if (k === 5) { const b = stage.querySelector('.d-tk b'); let n = 0; const iv = setInterval(() => { if (!alive || !b.isConnected) return clearInterval(iv); n = Math.min(7, n + 1); b.textContent = String(n); b.parentElement.classList.remove('pop'); void b.offsetWidth; b.parentElement.classList.add('pop'); }, 520); }
  }
  function features() {
    phase = 'features'; cap.textContent = '';
    logo.classList.add('small');
    let k = 0;
    featureCard(0);
    const iv = setInterval(() => { if (!alive) return clearInterval(iv); k++; if (k >= t.feats.length) { clearInterval(iv); finale(); return; } featureCard(k); }, reduced ? 3200 : 3900);
  }
  function finale() {
    phase = 'end';
    logo.classList.remove('small'); logo.classList.add('final');
    cap.textContent = t.lampLit;
    const prog = lampDots();
    const box = document.createElement('div'); box.className = 'in-dotsLamp'; root.querySelector('.in-lamp').appendChild(box);
    let n = 0;
    const iv = setInterval(() => { if (!alive) return clearInterval(iv); for (let j = 0; j < 4 && n < 114; j++) prog[n++] = 1; box.innerHTML = miniLamp(prog, ctx.core.suras, 'mushaf'); if (n >= 114) clearInterval(iv); }, 60);
    stage.innerHTML = `<div class="in-end"><button type="button" class="btn gold big in-go">${esc(t.start)}</button></div>`;
    stage.querySelector('.in-go').onclick = () => done();
    stage.querySelector('.in-go').focus();
  }

  // ---------------------------------------------------------------- the loop and the clock
  const TOTAL = 80060 + 9 * 3900 + 4000;
  function loop() {
    if (!alive) return;
    const ms = clockMs(), cur = wordAt(ms);
    if (phase === 'verse' || phase === 'galaxy') {
      logoAt(cur);
      // the last part of the verse («يهدي الله لنوره…») is read on the real galaxy
      if (phase === 'verse' && cur >= 35) enterGalaxy();
      if (phase === 'galaxy') galaxyAt(ms, cur);
      const end = tim && tim.t ? tim.t[tim.t.length - 1] : 80060;
      if (ms > end + 600) { shapesTour(); setTimeout(() => alive && features(), reduced ? 2000 : 7600); }
    }
    if (!reduced || phase === 'verse') drawParticles(ms);
    const el = phase === 'features' || phase === 'end' ? 80060 + 7600 + 3900 * (stage.querySelectorAll('.in-dots .on').length ? [...stage.querySelectorAll('.in-dots i')].findIndex(x => x.classList.contains('on')) : 9) : Math.max(0, ms);
    root.querySelector('.in-prog i').style.width = `${Math.min(100, 100 * el / TOTAL).toFixed(1)}%`;
    raf = requestAnimationFrame(loop);
  }
  function done() {
    if (!alive) return;
    alive = false; cancelAnimationFrame(raf);
    if (audio) { audio.pause(); audio = null; }
    try { ctx.galaxy.setActiveWord(null); ctx.galaxy.setReciting(false); } catch (e) { /* ignore */ }
    document.body.classList.remove('intro-on', 'intro-galaxy');
    root.classList.add('leaving');
    window.removeEventListener('resize', layoutText); document.removeEventListener('keydown', onKey, true);
    setTimeout(() => { root.remove(); try { ctx.galaxy.home(); } catch (e) { /* ignore */ } ctx.onDone && ctx.onDone(); }, 600);
  }
  const onKey = (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done(); } };
  root.querySelector('.in-skip').onclick = done;
  const muteToggle = (ev) => { if (!audio) return; audio.muted = !audio.muted; ev.currentTarget.setAttribute('aria-pressed', String(audio.muted)); ev.currentTarget.textContent = `${audio.muted ? '🔇' : '🔊'} ${t.sound}`; };
  root.querySelector('.in-mute').onclick = muteToggle;
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', layoutText);
  // fonts first (the verse is sampled from the Amiri glyphs), then the recitation
  (document.fonts && document.fonts.load ? document.fonts.load('40px Amiri').catch(() => {}) : Promise.resolve()).then(async () => {
    if (!alive) return;
    layoutText();
    try { const all = await ctx.timing; tim = all && all[34]; } catch (e) { tim = null; }
    t0 = performance.now();
    if (tim && tim.u) {
      audio = new Audio(ctx.audioBase + tim.u);
      audio.volume = 0.95;
      setTimeout(() => { if (alive && audio) audio.play().catch(() => {
        // blocked (no gesture): the film runs on its own clock; the sound button starts the recitation at that time
        const b = root.querySelector('.in-mute'); b.textContent = `▶ ${t.sound}`; b.classList.add('pulse');
        b.onclick = () => { if (!audio) return; audio.currentTime = Math.max(0, (performance.now() - t0 - 1200) / 1000); audio.play().then(() => { b.classList.remove('pulse'); b.textContent = `🔊 ${t.sound}`; b.onclick = muteToggle; }).catch(() => {}); };
      }); }, 1200);
    }
    loop();
  });
  root.querySelector('.in-skip').focus();
  return { close: done };
}
