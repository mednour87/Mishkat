// T095 — repetition mode (تكرار) to learn verses by heart. The visitor chooses the surah, the first verse, how many
// verses (1, 2, 5, 10, another number, the whole surah), how many repetitions, verse by verse or the verses together,
// and whether to hear Sheikh Alafasy first (each time, the first time only, or never). After each repetition they press
// the counter (or Enter / Space on a computer); a repetition counts only after a minimal time: 70 % of the reciter's own
// time for the same verses (20 s → 14 s), so nobody rushes. At the number fixed, the next verse comes, until the end.
// Rewards are only encouragement: a mark that starts at 7/10 (js/progress.js), kind words, and the surahs repeated
// turn blue in the 3D views. The verses are the Tanzil text; the audio is the human recitation (never synthesis).
import { noteTekrar, noteSession, rewardScore, weekly, minRepeatMs, CHEERS, scoreWords } from './progress.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const TK = {
  ar: {
    title: 'التكرار والحفظ',
    lead: 'اختر الآيات وعدد مرات التكرار. ردّد الآية ثم اضغط العدّاد بعد كل مرة (أو مفتاح Enter في الحاسوب). لا يُحسب التكرار قبل وقت أدنى قريب من وقت تلاوة الشيخ حتى لا تستعجل.',
    sura: 'السورة', from: 'من الآية', count: 'عدد الآيات', other: 'عدد آخر', whole: 'السورة كاملة', reps: 'عدد التكرار', mode: 'طريقة التكرار',
    one: 'آية آية', together: 'الآيات معًا', listen: 'الاستماع إلى الشيخ العفاسي', lEvery: 'قبل كل تكرار', lFirst: 'في المرة الأولى فقط', lNone: 'بدون استماع',
    start: 'ابدأ التكرار', unitOne: (a, k, n) => `الآية ${a} — ${k} من ${n}`, unitMany: (a, b, k, n) => `الآيات ${a}–${b} — ${k} من ${n}`,
    press: 'كرّرتُ', pressHint: 'اضغط بعد كل تكرار · Enter أو المسافة في الحاسوب', wait: 'تمهّل قليلًا… ردّد بهدوء', listenNow: '🔊 استمع', next: 'التالي ⟵', stop: 'إنهاء',
    playing: 'استمع إلى الشيخ، ثم ردّد', yourTurn: 'دورك الآن: ردّد الآية', doneUnit: 'أحسنت! ننتقل إلى ما بعدها',
    endTitle: 'ما شاء الله، أتممت الجلسة', endLine: (u, a, r, m) => `${u} وحدة · ${a} آية · ${r} تكرارًا · ${m} دقيقة`, again: 'أعد الجلسة', cont: 'تابع ما بعدها', close: 'إغلاق',
    score: 'علامتك هذا الأسبوع', scoreNote: 'تبدأ العلامة من ٧ وتزيد بالمواظبة والوقت والانتظام والتفاعل — لا علامات سيئة هنا.',
    week: 'هذا الأسبوع', weekRead: (a, g) => `قراءة: ${a} من ${g} آية`, weekTk: (a, g) => `تكرار: ${a} من ${g} آية`,
    audioFail: 'تعذّر تشغيل التلاوة الآن؛ يمكنك المتابعة بالتكرار دون استماع.', blue: 'السور التي أتممت تكرارها تظهر بالأزرق في خريطة الختمة ثلاثية الأبعاد.',
    perUnit: (s) => `وقت أدنى بين تكرارين: ${s} ث (٧٠٪ من وقت تلاوة الشيخ)`,
  },
  en: {
    title: 'Repetition & memorising',
    lead: 'Choose the verses and how many times to repeat them. Recite, then press the counter after each repetition (or Enter on a computer). A repetition counts only after a minimal time close to the reciter’s own time, so you never rush.',
    sura: 'Surah', from: 'From verse', count: 'Number of verses', other: 'Other number', whole: 'Whole surah', reps: 'Repetitions', mode: 'How to repeat',
    one: 'Verse by verse', together: 'Verses together', listen: 'Listen to Sheikh Alafasy', lEvery: 'Before each repetition', lFirst: 'The first time only', lNone: 'No listening',
    start: 'Start repeating', unitOne: (a, k, n) => `Verse ${a} — ${k} of ${n}`, unitMany: (a, b, k, n) => `Verses ${a}–${b} — ${k} of ${n}`,
    press: 'Repeated', pressHint: 'Press after each repetition · Enter or Space on a computer', wait: 'A little slower… recite calmly', listenNow: '🔊 Listen', next: 'Next ⟶', stop: 'Finish',
    playing: 'Listen to the sheikh, then recite', yourTurn: 'Your turn: recite the verse', doneUnit: 'Well done! On to the next',
    endTitle: 'Masha’Allah, session complete', endLine: (u, a, r, m) => `${u} units · ${a} verses · ${r} repetitions · ${m} min`, again: 'Repeat the session', cont: 'Continue after', close: 'Close',
    score: 'Your mark this week', scoreNote: 'The mark starts at 7 and grows with perseverance, time, regularity and engagement — no bad marks here.',
    week: 'This week', weekRead: (a, g) => `Reading: ${a} of ${g} verses`, weekTk: (a, g) => `Repetition: ${a} of ${g} verses`,
    audioFail: 'The recitation cannot be played now; you can go on repeating without listening.', blue: 'Surahs you finished repeating turn blue in the 3D khatma map.',
    perUnit: (s) => `Minimal time between two repetitions: ${s} s (70 % of the reciter’s time)`,
  },
};

// the units of a session: [from, to] verse indexes (global), verse by verse or all together
export function units(first, count, together) {
  const out = [];
  if (together) out.push([first, first + count - 1]);
  else for (let k = 0; k < count; k++) out.push([first + k, first + k]);
  return out;
}
// the reciter's time for verse a of a surah, from the word timings (ms); 0 if unknown
export function verseMs(tim) {
  if (!tim || !Array.isArray(tim.t) || tim.t.length < 2) return 0;
  return Math.max(0, tim.t[tim.t.length - 1] - (tim.t[0] || 0));
}

// ctx: { lang(), core, prefs (getter), save(), timing(sura) → Promise<array>, audioBase, onProgress(), focus(i), digits(n) }
export function createTekrar(ctx) {
  const L = () => TK[ctx.lang()] || TK.ar;
  const num = (n) => ctx.digits ? ctx.digits(n) : String(n);
  let S = null;               // the running session
  let keyH = null;

  function stop() {
    if (S) { S.alive = false; if (S.audio) { S.audio.pause(); S.audio = null; } clearInterval(S.tick); }
    S = null;
    if (keyH) { document.removeEventListener('keydown', keyH, true); keyH = null; }
  }

  function scoreBox() {
    const t = L(), P = ctx.prefs, r = rewardScore(P), w = weekly(P);
    return `<div class="tk-score"><div class="tk-mark"><b>${esc(num(r.score.toFixed(1)))}</b><small>/${esc(num(10))}</small></div>
      <div><div class="tk-sl">${esc(t.score)} — ${esc(scoreWords(r.score, ctx.lang()))}</div>
      <div class="wk"><span>${esc(t.weekRead(num(w.read), num(w.readGoal)))}</span><i style="--f:${w.readF.toFixed(3)}"></i></div>
      <div class="wk tk"><span>${esc(t.weekTk(num(w.ayas), num(w.tkGoal)))}</span><i style="--f:${w.tkF.toFixed(3)}"></i></div>
      <p class="p-small">${esc(t.scoreNote)}</p></div></div>`;
  }

  // ------------------------------------------------------------------ setup
  function render(body, args = {}) {
    stop();
    const t = L(), P = ctx.prefs, last = (P.tk && P.tk.last) || {};
    const sura = args.sura || last.sura || 112, Sx = ctx.core.suras[sura - 1];
    const cfg = { sura, from: args.sura ? Math.min(Sx.ayas, Math.max(1, args.from || 1)) : Math.min(last.from || 1, Sx.ayas), count: last.count || 1, whole: !!last.whole && !args.sura, reps: last.reps || 5, together: !!last.together, listen: last.listen || 'every' };
    if (args.sura) cfg.whole = false;
    const chip = (name, v, on, label) => `<label class="chip"><input type="radio" name="${name}" value="${v}" ${on ? 'checked' : ''}> ${esc(label)}</label>`;
    body.innerHTML = `<p class="p-lead">${esc(t.lead)}</p>
      <div class="p-row tk-pick"><label>${esc(t.sura)} <select id="tkS">${ctx.core.suras.map(s => `<option value="${s.n}" ${s.n === cfg.sura ? 'selected' : ''}>${s.n}. ${esc(ctx.lang() === 'ar' ? s.ar : s.tr)}</option>`).join('')}</select></label>
        <label>${esc(t.from)} <input type="number" id="tkF" min="1" max="${Sx.ayas}" value="${cfg.from}" inputmode="numeric"></label></div>
      <fieldset class="p-field"><legend>${esc(t.count)}</legend><div class="chips">${[1, 2, 5, 10].map(n => chip('tkc', n, !cfg.whole && cfg.count === n, num(n))).join('')}
        ${chip('tkc', 'whole', cfg.whole, t.whole)}</div><label class="p-row">${esc(t.other)} <input type="number" id="tkCn" min="1" max="286" inputmode="numeric" value="${!cfg.whole && ![1, 2, 5, 10].includes(cfg.count) ? cfg.count : ''}"></label></fieldset>
      <fieldset class="p-field"><legend>${esc(t.reps)}</legend><div class="chips">${[3, 5, 7, 10, 20].map(n => chip('tkr', n, cfg.reps === n, '×' + num(n))).join('')}</div>
        <label class="p-row">${esc(t.other)} <input type="number" id="tkRn" min="1" max="100" inputmode="numeric" value="${[3, 5, 7, 10, 20].includes(cfg.reps) ? '' : cfg.reps}"></label></fieldset>
      <fieldset class="p-field"><legend>${esc(t.mode)}</legend><div class="chips">${chip('tkm', 'one', !cfg.together, t.one)}${chip('tkm', 'together', cfg.together, t.together)}</div></fieldset>
      <fieldset class="p-field"><legend>${esc(t.listen)}</legend><div class="chips">${chip('tkl', 'every', cfg.listen === 'every', t.lEvery)}${chip('tkl', 'first', cfg.listen === 'first', t.lFirst)}${chip('tkl', 'none', cfg.listen === 'none', t.lNone)}</div></fieldset>
      <button type="button" class="btn gold big" id="tkGo" autofocus>${esc(t.start)}</button>
      ${scoreBox()}<p class="p-small">${esc(t.blue)}</p>`;
    const sSel = body.querySelector('#tkS'), fIn = body.querySelector('#tkF');
    sSel.onchange = () => { const s = ctx.core.suras[+sSel.value - 1]; fIn.max = s.ayas; if (+fIn.value > s.ayas) fIn.value = 1; };
    body.querySelector('#tkCn').oninput = (ev) => { if (ev.target.value) body.querySelectorAll('input[name=tkc]').forEach(x => { x.checked = false; }); };
    body.querySelector('#tkRn').oninput = (ev) => { if (ev.target.value) body.querySelectorAll('input[name=tkr]').forEach(x => { x.checked = false; }); };
    body.querySelector('#tkGo').onclick = () => {
      const s = +sSel.value, Sy = ctx.core.suras[s - 1];
      const val = (n) => (body.querySelector(`input[name=${n}]:checked`) || {}).value;
      const whole = val('tkc') === 'whole';
      const from = whole ? 1 : Math.min(Sy.ayas, Math.max(1, +fIn.value || 1));
      const cn = +body.querySelector('#tkCn').value, rn = +body.querySelector('#tkRn').value;
      const count = whole ? Sy.ayas : Math.min(Sy.ayas - from + 1, Math.max(1, cn >= 1 ? Math.round(cn) : +val('tkc') || 1));
      const reps = Math.min(100, Math.max(1, rn >= 1 ? Math.round(rn) : +val('tkr') || 5));
      const conf = { sura: s, from, count, whole, reps, together: val('tkm') === 'together' && count > 1, listen: val('tkl') || 'every' };
      P.tk = P.tk || { log: {} }; P.tk.last = conf; ctx.save();
      session(body, conf);
    };
  }

  // ------------------------------------------------------------------ session
  async function session(body, conf) {
    stop();
    const t = L(), Sx = ctx.core.suras[conf.sura - 1], first = Sx.first + conf.from - 1;
    const list = units(first, conf.count, conf.together);
    const tims = await ctx.timing(conf.sura).catch(() => null);
    const my = S = { alive: true, conf, list, u: 0, k: 0, readyAt: 0, audio: null, started: Date.now(), unitStart: Date.now(), totalReps: 0, tick: 0, heardOnce: false };
    noteSession(ctx.prefs); ctx.save();
    const ayaOf = (i) => i - Sx.first + 1;
    // Tanzil puts the basmala before the first verse of each surah (but al-Fatiha and at-Tawba): not part of the verse
    const vText = (i) => i === Sx.first && conf.sura !== 1 && conf.sura !== 9 ? ctx.core.verses[i].split(' ').slice(4).join(' ') : ctx.core.verses[i];
    const unitMs = (u) => { let ms = 0, words = 0; for (let i = u[0]; i <= u[1]; i++) { ms += verseMs(tims && tims[ayaOf(i) - 1]); words += vText(i).split(/\s+/).length; } return minRepeatMs(ms, words); };
    body.innerHTML = `<div class="tk-run">
      <div class="tk-top"><b class="tk-where"></b><span class="tk-of"></span></div>
      <div class="tk-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span></span></div>
      <div class="tk-verse" dir="rtl" lang="ar"></div>
      <div class="tk-mid"><button type="button" class="tk-btn" id="tkPress" aria-describedby="tkHint">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="tk-ring0"/><circle cx="60" cy="60" r="54" class="tk-ring" pathLength="100"/></svg>
        <span class="tk-n"></span><span class="tk-pl">${esc(t.press)}</span></button></div>
      <p class="tk-state" aria-live="polite"></p>
      <p class="p-small tk-hint" id="tkHint">${esc(t.pressHint)}</p>
      <div class="p-row tk-ctl"><button type="button" class="mini" id="tkListen">${esc(t.listenNow)}</button><button type="button" class="mini" id="tkNext">${esc(t.next)}</button><button type="button" class="mini" id="tkStop">${esc(t.stop)}</button></div>
      <p class="p-small tk-min"></p></div>`;
    const $b = (s) => body.querySelector(s);
    const state = (msg) => { $b('.tk-state').textContent = msg; };
    const ring = $b('.tk-ring');
    const draw = () => {
      const u = list[my.u], a = ayaOf(u[0]), b = ayaOf(u[1]);
      $b('.tk-where').textContent = `${ctx.lang() === 'ar' ? Sx.ar : Sx.tr}`;
      $b('.tk-of').textContent = u[0] === u[1] ? t.unitOne(num(a), num(my.u + 1), num(list.length)) : t.unitMany(num(a), num(b), num(my.u + 1), num(list.length));
      let v = ''; for (let i = u[0]; i <= u[1]; i++) v += `<span class="tkv">${esc(vText(i))} <span class="end">﴿${num(ayaOf(i))}﴾</span></span> `;
      $b('.tk-verse').innerHTML = v;
      $b('.tk-n').textContent = `${num(my.k)} / ${num(conf.reps)}`;
      const done = list.slice(0, my.u).reduce((s, x) => s + x[1] - x[0] + 1, 0) * conf.reps + my.k * (u[1] - u[0] + 1), all = conf.count * conf.reps;
      $b('.tk-bar span').style.width = (100 * done / all).toFixed(1) + '%';
      $b('.tk-bar').setAttribute('aria-valuenow', Math.round(100 * done / all));
      $b('.tk-min').textContent = t.perUnit(num(Math.round(unitMs(u) / 1000)));
      ctx.focus && ctx.focus(u[0]);
    };
    const arm = () => { my.readyAt = Date.now() + unitMs(list[my.u]); };
    // the ring fills while the minimal time runs; the button is ready when it is full
    my.tick = setInterval(() => {
      if (!my.alive) return;
      const u = list[my.u], ms = unitMs(u), left = Math.max(0, my.readyAt - Date.now());
      const f = my.audio ? 0 : 1 - left / ms;
      ring.style.strokeDashoffset = (100 - 100 * Math.max(0, Math.min(1, f))).toFixed(1);
      $b('#tkPress').classList.toggle('ready', !my.audio && left <= 0);
    }, 120);
    const playUnit = async () => {
      const u = list[my.u];
      if (my.audio) { my.audio.pause(); my.audio = null; }
      state(t.playing);
      for (let i = u[0]; i <= u[1]; i++) {
        const tim = tims && tims[ayaOf(i) - 1];
        if (!tim || !my.alive || S !== my) break;
        const au = new Audio(ctx.audioBase + tim.u);
        my.audio = au;
        const ok = await new Promise((res) => { au.onended = () => res(true); au.onerror = () => res(false); au.play().catch(() => res(false)); });
        if (my.audio !== au) return;               // stopped or replaced
        if (!ok) { my.audio = null; state(t.audioFail); arm(); return; }
      }
      my.audio = null; my.heardOnce = true;
      if (my.alive) { state(t.yourTurn); arm(); }
    };
    const startRep = (msg) => {
      const want = conf.listen === 'every' || (conf.listen === 'first' && my.k === 0 && !my.heardOnce);
      if (want) playUnit(); else { state(msg || t.yourTurn); arm(); }
    };
    const nextUnit = (counted) => {
      const u = list[my.u];
      if (counted) {
        noteTekrar(ctx.prefs, { from: u[0], to: u[1], reps: conf.reps, sec: (Date.now() - my.unitStart) / 1000 });
        ctx.save(); ctx.onProgress && ctx.onProgress();
      }
      my.u++; my.k = 0; my.heardOnce = false; my.unitStart = Date.now();
      if (my.u >= list.length) return finish(body, my);
      draw(); startRep();
    };
    const press = () => {
      if (!my.alive || S !== my) return;
      if (my.audio) return;                                          // still listening
      if (Date.now() < my.readyAt) { state(t.wait); return; }
      my.k++; my.totalReps++;
      const cheers = CHEERS[ctx.lang()] || CHEERS.ar;
      $b('#tkPress').classList.remove('pop'); void $b('#tkPress').offsetWidth; $b('#tkPress').classList.add('pop');
      if (my.k >= conf.reps) { state(t.doneUnit); draw(); setTimeout(() => { if (my.alive && S === my) nextUnit(true); }, 700); return; }
      const cheer = cheers[(my.totalReps - 1) % cheers.length];
      state(cheer);
      draw(); startRep(cheer);
    };
    $b('#tkPress').onclick = press;
    $b('#tkListen').onclick = () => playUnit();
    $b('#tkNext').onclick = () => nextUnit(false);
    $b('#tkStop').onclick = () => finish(body, my);
    keyH = (ev) => {
      if (S !== my || !my.alive) return;
      if (ev.target.closest && ev.target.closest('input,select,textarea')) return;
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); press(); }
    };
    document.addEventListener('keydown', keyH, true);
    draw(); startRep();
    $b('#tkPress').focus({ preventScroll: true });
  }

  function finish(body, my) {
    const t = L(), conf = my.conf;
    const doneUnits = my.u, ayas = my.list.slice(0, my.u).reduce((s, x) => s + x[1] - x[0] + 1, 0);
    const min = Math.max(1, Math.round((Date.now() - my.started) / 60000));
    stop();
    ctx.onProgress && ctx.onProgress();
    const Sx = ctx.core.suras[conf.sura - 1], nextFrom = conf.from + conf.count;
    body.innerHTML = `<div class="tk-end"><div class="tk-star" aria-hidden="true">✦</div><h3>${esc(t.endTitle)}</h3>
      <p>${esc(t.endLine(num(doneUnits), num(ayas), num(my.totalReps), num(min)))}</p>${scoreBox()}
      <div class="p-row tk-ctl">${nextFrom <= Sx.ayas ? `<button type="button" class="btn gold" id="tkCont">${esc(t.cont)}</button>` : ''}
      <button type="button" class="mini" id="tkAgain">${esc(t.again)}</button><button type="button" class="mini" id="tkBack">⚙</button></div></div>`;
    const c = body.querySelector('#tkCont');
    if (c) c.onclick = () => { const conf2 = { ...conf, from: nextFrom, whole: false, count: Math.min(conf.count, Sx.ayas - nextFrom + 1) }; ctx.prefs.tk.last = conf2; ctx.save(); session(body, conf2); };
    body.querySelector('#tkAgain').onclick = () => session(body, conf);
    body.querySelector('#tkBack').onclick = () => render(body);
    (c || body.querySelector('#tkAgain')).focus({ preventScroll: true });
  }

  return { render, stop, get running() { return !!S; } };
}
