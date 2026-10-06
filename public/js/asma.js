// «الأسماء الحسنى» — the Most Beautiful Names of Allah: read, listen, learn.
//
// Data: data/asma.json (data_build/build_asma.mjs) — the list narrated by at-Tirmidhi with transliteration and English
// meaning (Aladhan), and one recording of the names (Wikimedia Commons, CC0) with the time of each name.
// Three ways in:
//   · the list: every name, its number, its transliteration and meaning; a tap plays it and offers a Quran search;
//   · listen: the whole recording in a full-screen stage, each name shown as it is said;
//   · learn: like «التكرار» — a group of names, each repeated, then the group together, with an optional test that
//     hides the name until it is said.
// Each name heard to its end or learnt sends a ray of light to the logo (ctx.onName).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const AS = {
  ar: {
    title: 'الأسماء الحسنى', lead: 'أسماء الله الحسنى كما وردت في رواية الترمذي (٣٥٠٧)، وفي ثبوت سردها كلامٌ لأهل العلم. اضغط اسمًا لتسمعه، أو استمع إليها كلها، أو احفظها مجموعةً بعد مجموعة.',
    listen: 'استمع إليها كلها', learn: 'احفظ', search: 'ابحث عنه في القرآن', play: 'استمع', group: 'المجموعة', size: 'عدد الأسماء', reps: 'تكرار كل اسم',
    test: 'اختبرني: أخفِ الاسم حتى يُقال', start: 'ابدأ الحفظ', stop: 'إيقاف', next: 'التالي', prev: 'السابق', close: 'إغلاق', pause: 'إيقاف مؤقت', resume: 'متابعة',
    learnt: (n) => `حفظتَ أو سمعتَ هذا الشهر: ${n} من ٩٩`, from: (a, b) => `من ${a} إلى ${b}`, groupDone: 'أتممتَ المجموعة ✓', loading: '…', fail: 'تعذّر تحميل الأسماء.',
    source: 'المصدر: القائمة من خدمة Aladhan (رواية الترمذي)، والتسجيل الصوتي من Wikimedia Commons برخصة CC0 (القارئ غير مسمّى)، والتوقيت من تفريغ آلي مطابَق مع القائمة.',
  },
  en: {
    title: 'The Most Beautiful Names', lead: 'The Names of Allah as listed in the narration of at-Tirmidhi (3507); scholars have discussed whether the list itself is part of the hadith. Tap a name to hear it, listen to them all, or learn them group by group.',
    listen: 'Listen to them all', learn: 'Learn', search: 'Search it in the Quran', play: 'Listen', group: 'Group', size: 'Names per group', reps: 'Repeat each name',
    test: 'Test me: hide the name until it is said', start: 'Start learning', stop: 'Stop', next: 'Next', prev: 'Previous', close: 'Close', pause: 'Pause', resume: 'Resume',
    learnt: (n) => `Learnt or heard this month: ${n} of 99`, from: (a, b) => `${a} to ${b}`, groupDone: 'Group complete ✓', loading: '…', fail: 'The names could not be loaded.',
    source: 'Source: the list from the Aladhan service (narration of at-Tirmidhi); the recording from Wikimedia Commons, CC0 (reciter not named); timings from an automatic transcription aligned to the list.',
  },
};

// the order in which names are said in a learning session: each name `reps` times, then the whole group once
export function learnQueue(from, size, reps, total = 99) {
  const last = Math.min(total, from + size - 1), q = [];
  for (let n = from; n <= last; n++) for (let r = 0; r < reps; r++) q.push(n);
  for (let n = from; n <= last; n++) q.push(n);
  return q;
}

// ctx: { lang(), prefs (getter), save(), digits(n), search(q), onName(n, el), learntCount() }
export function createAsma(ctx) {
  let dataP = null, audio = null, stage = null, raf = 0;
  const L = () => AS[ctx.lang()] || AS.ar;
  const num = (n) => ctx.digits ? ctx.digits(n) : String(n);
  const load = () => (dataP = dataP || fetch('data/asma.json').then(r => { if (!r.ok) throw new Error('asma'); return r.json(); }));

  function player(src) {
    if (!audio) { audio = new Audio(src); audio.preload = 'auto'; }
    return audio;
  }
  // a seek before the file's metadata is known is lost (the browser starts at 0): wait for it first
  const ready = (au) => au.readyState >= 1 ? Promise.resolve() : new Promise(r => au.addEventListener('loadedmetadata', r, { once: true }));
  // play one name (or a range of names) and resolve when its end is reached or playback is stopped
  function playSpan(d, a, b) {
    const au = player(d.audio);
    const start = d.names[a].start, end = d.names[b].end;
    return ready(au).then(() => new Promise((resolve) => {
      au.currentTime = Math.max(0, start);
      const done = (ok) => { au.pause(); au.removeEventListener('pause', onPause); cancelAnimationFrame(watch.id); resolve(ok); };
      const onPause = () => { if (au.currentTime < end - 0.05) done(false); };
      const watch = () => { if (au.currentTime >= end) return done(true); watch.id = requestAnimationFrame(watch); };
      au.addEventListener('pause', onPause);
      au.play().then(() => { watch.id = requestAnimationFrame(watch); }).catch(() => resolve(false));
    }));
  }
  function stopAudio() { if (audio) audio.pause(); }

  async function render(body) {
    const t = L(), en = ctx.lang() === 'en';
    body.innerHTML = `<p class="note">${esc(t.loading)}</p>`;
    let d;
    try { d = await load(); } catch (e) { dataP = null; body.innerHTML = `<p class="note">${esc(t.fail)}</p>`; return; }
    const P = ctx.prefs;
    const set = P.asmaLearn || { size: 5, reps: 3, from: 1, test: false };
    body.innerHTML = `<p class="p-small">${esc(t.lead)}</p>
      <p class="p-row"><button type="button" class="btn gold" id="asListen">▶ ${esc(t.listen)}</button> <span class="p-small" id="asCount">${esc(t.learnt(num(ctx.learntCount())))}</span></p>
      <fieldset class="as-learn"><legend>${esc(t.learn)}</legend>
        <label class="p-row">${esc(t.group)} <select id="asFrom">${Array.from({ length: Math.ceil(99 / set.size) }, (_, k) => 1 + k * set.size).map(f => `<option value="${f}"${f === set.from ? ' selected' : ''}>${esc(t.from(num(f), num(Math.min(99, f + set.size - 1))))}</option>`).join('')}</select></label>
        <label class="p-row">${esc(t.size)} <select id="asSize">${[3, 5, 9, 11, 33].map(n => `<option value="${n}"${n === set.size ? ' selected' : ''}>${num(n)}</option>`).join('')}</select></label>
        <label class="p-row">${esc(t.reps)} <select id="asReps">${[1, 3, 5, 7].map(n => `<option value="${n}"${n === set.reps ? ' selected' : ''}>${num(n)}</option>`).join('')}</select></label>
        <label class="p-row"><input type="checkbox" id="asTest"${set.test ? ' checked' : ''}> ${esc(t.test)}</label>
        <button type="button" class="btn" id="asLearn">${esc(t.start)}</button>
      </fieldset>
      <ol class="as-grid">${d.names.map(x => `<li><button type="button" class="as-name" data-n="${x.n}"><small>${esc(num(x.n))}</small><b lang="ar" dir="rtl">${esc(x.ar)}</b><i dir="ltr">${esc(x.tr)}</i>${en ? `<em>${esc(x.en)}</em>` : ''}</button></li>`).join('')}</ol>
      <p class="p-small">${esc(t.source)}</p>`;

    const save = () => { P.asmaLearn = set; ctx.save(); };
    body.querySelector('#asListen').onclick = () => openStage(d, { mode: 'listen' });
    body.querySelector('#asFrom').onchange = (ev) => { set.from = +ev.target.value; save(); };
    body.querySelector('#asSize').onchange = (ev) => { set.size = +ev.target.value; set.from = 1; save(); render(body); };
    body.querySelector('#asReps').onchange = (ev) => { set.reps = +ev.target.value; save(); };
    body.querySelector('#asTest').onchange = (ev) => { set.test = ev.target.checked; save(); };
    body.querySelector('#asLearn').onclick = () => openStage(d, { mode: 'learn', queue: learnQueue(set.from, set.size, set.reps), test: set.test });
    body.querySelectorAll('.as-name').forEach(b => b.onclick = async () => {
      const n = +b.dataset.n, x = d.names[n - 1];
      body.querySelectorAll('.as-name.on').forEach(o => o.classList.remove('on'));
      b.classList.add('on');
      body.querySelector('.as-pop')?.remove();
      b.insertAdjacentHTML('afterend', `<div class="as-pop"><button type="button" class="mini" data-search>${esc(t.search)}</button></div>`);
      b.parentElement.querySelector('[data-search]').onclick = () => ctx.search(x.ar.replace(/[ً-ٰٟ]/g, ''));
      if (await playSpan(d, n - 1, n - 1)) { ctx.onName(n, b); refreshCount(body); }
    });
  }
  function refreshCount(body) {
    const c = body.querySelector('#asCount');
    if (c) c.textContent = L().learnt(num(ctx.learntCount()));
  }

  // ------------------------------------------------------------ the full-screen stage
  // a dark sky with slow orbits of light; the name being said in the middle, large; the next ones waiting below
  function openStage(d, { mode, queue = null, test = false }) {
    closeStage();
    const t = L(), en = ctx.lang() === 'en';
    stage = document.createElement('div');
    stage.className = 'as-stage';
    stage.setAttribute('role', 'dialog');
    stage.setAttribute('aria-label', t.title);
    stage.innerHTML = `<canvas class="as-sky" aria-hidden="true"></canvas>
      <div class="as-center"><small class="as-num"></small><b class="as-big" lang="ar" dir="rtl"></b><i class="as-tr" dir="ltr"></i>${en ? '<em class="as-en"></em>' : ''}</div>
      <div class="as-rail" aria-hidden="true">${d.names.map(x => `<span data-n="${x.n}"></span>`).join('')}</div>
      <div class="as-bar">
        <button type="button" class="mini" data-act="prev">${esc(t.prev)}</button>
        <button type="button" class="mini gold" data-act="toggle">${esc(t.pause)}</button>
        <button type="button" class="mini" data-act="next">${esc(t.next)}</button>
        <button type="button" class="mini" data-act="close">✕ ${esc(t.close)}</button>
      </div>`;
    document.body.appendChild(stage);
    stage.requestFullscreen?.().catch(() => {});
    const sky = startSky(stage.querySelector('.as-sky'));
    const show = (n, hidden = false) => {
      const x = d.names[n - 1];
      stage.querySelector('.as-num').textContent = num(n);
      const big = stage.querySelector('.as-big');
      big.textContent = hidden ? '…' : x.ar;
      big.classList.remove('in'); void big.offsetWidth; big.classList.add('in');
      stage.querySelector('.as-tr').textContent = hidden ? '' : x.tr;
      const e = stage.querySelector('.as-en'); if (e) e.textContent = hidden ? '' : x.en;
      stage.querySelectorAll('.as-rail span').forEach(s => s.classList.toggle('on', +s.dataset.n === n));
      sky.pulse();
    };
    let running = true, idx = 0;
    const order = queue || d.names.map(x => x.n);
    const au = player(d.audio);

    if (mode === 'listen') {
      // one continuous playback; the name shown follows the time of the recording
      let shown = 1;
      show(1);
      ready(au).then(() => { au.currentTime = d.names[0].start; return au.play(); }).catch(() => {});
      const follow = () => {
        if (!stage) return;
        const time = au.currentTime;
        const k = d.names.findIndex(x => time >= x.start && time < x.end);
        if (k >= 0 && k + 1 !== shown) {
          if (k + 1 > shown) ctx.onName(shown, stage.querySelector('.as-big'));   // the previous name was heard to its end
          shown = k + 1; show(shown);
        }
        if (time >= d.names[98].end) { ctx.onName(99, stage.querySelector('.as-big')); au.pause(); return; }
        raf = requestAnimationFrame(follow);
      };
      raf = requestAnimationFrame(follow);
      stage.querySelector('[data-act=prev]').onclick = () => { au.currentTime = d.names[Math.max(0, shown - 2)].start; };
      stage.querySelector('[data-act=next]').onclick = () => { au.currentTime = d.names[Math.min(98, shown)].start; };
    } else {
      // learning: name after name from the queue, each played alone; in a test the name appears once it is said
      const step = async () => {
        while (stage && running && idx < order.length) {
          const n = order[idx];
          show(n, test);
          const ok = await playSpan(d, n - 1, n - 1);
          if (!stage || !running) return;
          if (test) show(n, false);
          if (ok && order.indexOf(n, idx + 1) === -1) ctx.onName(n, stage.querySelector('.as-big'));   // its last time: learnt
          await new Promise(r => setTimeout(r, test ? 900 : 350));
          idx++;
        }
        if (stage && idx >= order.length) { stage.querySelector('.as-big').textContent = t.groupDone; stage.querySelector('.as-tr').textContent = ''; }
      };
      step();
      stage.querySelector('[data-act=prev]').onclick = () => { idx = Math.max(0, idx - 1); stopAudio(); };
      stage.querySelector('[data-act=next]').onclick = () => { idx = Math.min(order.length - 1, idx + 1); stopAudio(); };
      stage._resume = () => { running = true; step(); };
    }
    stage.querySelector('[data-act=toggle]').onclick = (ev) => {
      if (mode === 'listen') { if (au.paused) au.play(); else au.pause(); ev.target.textContent = au.paused ? t.resume : t.pause; return; }
      running = !running;
      ev.target.textContent = running ? t.pause : t.resume;
      if (running) stage._resume(); else stopAudio();
    };
    stage.querySelector('[data-act=close]').onclick = closeStage;
    stage.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeStage(); });
    stage._sky = sky;
    stage.tabIndex = -1; stage.focus();
  }
  function closeStage() {
    cancelAnimationFrame(raf);
    stopAudio();
    if (!stage) return;
    stage._sky.stop();
    if (document.fullscreenElement === stage) document.exitFullscreen().catch(() => {});
    stage.remove();
    stage = null;
  }

  // the sky of the stage: points of light on slow elliptic orbits; a pulse when a name is said
  function startSky(canvas) {
    const ctx2 = canvas.getContext('2d');
    const dpr = Math.min(2, devicePixelRatio || 1);
    let w = 0, h = 0, glow = 0, on = true;
    const stars = Array.from({ length: 220 }, (_, i) => ({ r: 0.15 + Math.random() * 0.85, a: Math.random() * Math.PI * 2, s: (0.02 + Math.random() * 0.08) * (i % 2 ? 1 : -1), z: Math.random() }));
    const size = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx2.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    let last = performance.now();
    const frame = (now) => {
      if (!on) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      glow = Math.max(0, glow - dt * 0.9);
      ctx2.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, R = Math.max(w, h) * 0.55;
      const halo = ctx2.createRadialGradient(cx, cy, 0, cx, cy, R * (0.35 + glow * 0.25));
      halo.addColorStop(0, `rgba(255,214,122,${0.16 + glow * 0.3})`); halo.addColorStop(1, 'rgba(255,214,122,0)');
      ctx2.fillStyle = halo; ctx2.fillRect(0, 0, w, h);
      for (const s of stars) {
        s.a += s.s * dt * (1 + glow * 3);
        const x = cx + Math.cos(s.a) * s.r * R, y = cy + Math.sin(s.a) * s.r * R * 0.55;
        const b = 0.35 + 0.65 * s.z;
        ctx2.fillStyle = `rgba(255,${200 + 55 * s.z | 0},${150 + 100 * s.z | 0},${b * (0.6 + glow * 0.4)})`;
        ctx2.beginPath(); ctx2.arc(x, y, 0.6 + s.z * 1.6, 0, Math.PI * 2); ctx2.fill();
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return { pulse: () => { glow = 1; }, stop: () => { on = false; removeEventListener('resize', size); } };
  }

  return { render, stop: closeStage };
}
