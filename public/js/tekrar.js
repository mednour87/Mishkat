// T095 — repetition mode (تكرار) to learn verses by heart. The visitor chooses the surah, the first verse, how many
// verses (1, 2, 5, 10, another number, the whole surah), how many repetitions, verse by verse or the verses together,
// and whether to hear Sheikh Alafasy first (each time, the first time only, or never). After each repetition they press
// the counter (or Enter / Space on a computer); a repetition counts only after a minimal time: 70 % of the reciter's own
// time for the same verses (20 s → 14 s), so nobody rushes. At the number fixed, the next verse comes, until the end.
// Rewards are only encouragement: a mark that starts at 7/10 (js/progress.js), kind words, and the surahs repeated
// turn blue in the 3D views. The verses are the Tanzil text; the audio is the human recitation (never synthesis).
import { noteTekrar, noteSession, rewardScore, weekly, minRepeatMs, CHEERS, scoreWords } from './progress.js';
import { compare, hint, verdict } from './hifztest.js';
import { colourToken, tokenOffsets, verseRules, RULE_INFO, GROUPS } from './tajweed.js';

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
    nextSura: (n) => `السورة التالية: ${n} (بالإعدادات نفسها)`, nextSet: '⚙ إعدادات الجلسة التالية (السورة، الآيات، التكرار…)', startNext: 'ابدأ الجلسة التالية',
    tj: '🎨 أحكام التجويد', tjHide: 'أخفِ أحكام التجويد', tjNone: 'لا ألوان تجويد لهذه الآية (لم يُتحقق من مطابقتها).', tjMore: 'كل الأحكام وأمثلتها',
    test: '📝 اختبر حفظك (اختياري)', testLead: 'أُخفيت الآيات التي كرّرتها. اكتب كل آية من حفظك، أو اضغط 🎤 وتلُها، ثم «تحقّق». يمكنك طلب تلميح عند الحاجة.',
    testVerse: (a) => `الآية ${a}`, write: 'اكتب الآية من حفظك…', mic: '🎤 تلاوة', micStop: '■ توقّف', hintB: '💡 تلميح', check: '✓ تحقّق', showV: 'أظهر الآية',
    ok: 'أحسنت! الآية صحيحة ✓', partial: (p) => `قريب: ${p}٪ من كلمات الآية في مكانها. الكلمات الناقصة مظلّلة.`, wrong: 'لم تُصب هذه المرة؛ هذه الآية كما في المصحف:',
    listening: 'أستمع…', micFail: 'تعذّر التعرّف على الصوت؛ اكتب الآية بدلًا من ذلك.', hintsUsed: (n) => `تلميحات: ${n}`,
    result: (ok, n) => `النتيجة: ${ok} من ${n} آية صحيحة`, allOk: 'ما شاء الله! حفظت الآيات كلها. ثبّتها بمراجعتها غدًا.',
    review: 'أحسنت في بعضها. راجع الآيات التي لم تُصبها ثم أعد الاختبار.', relearn: 'لم تثبت الآيات بعد، وهذا طبيعي في البداية: ننصحك بإعادة التكرار مع الاستماع قبل كل مرة، ثم أعد الاختبار.',
    redo: 'أعد التكرار', retest: 'أعد الاختبار', share: '🔗 شارك نتيجتك', invite: '🤝 ادعُ صديقًا / تحدَّه', copied: 'نُسخ النص، يمكنك لصقه حيث شئت.',
    shareText: (s, a, b, ok, n) => `اختبرت حفظي في «مشكاة»: سورة ${s}، الآيات ${a}–${b} — ${ok} من ${n} صحيحة.`,
    inviteText: (s, a, b) => `أتحدّاك أن تحفظ سورة ${s} (الآيات ${a}–${b}) معي في «مشكاة»، ثم نقارن نتيجة الاختبار:`,
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
    nextSura: (n) => `Next surah: ${n} (same settings)`, nextSet: '⚙ Settings of the next session (surah, verses, repetitions…)', startNext: 'Start the next session',
    tj: '🎨 Tajweed rules', tjHide: 'Hide the tajweed rules', tjNone: 'No tajweed colours for this verse (its annotation could not be checked).', tjMore: 'All the rules with examples',
    test: '📝 Test your memory (optional)', testLead: 'The verses you repeated are hidden. Write each verse from memory, or press 🎤 and recite it, then “Check”. Ask for a hint when you need one.',
    testVerse: (a) => `Verse ${a}`, write: 'Write the verse from memory…', mic: '🎤 Recite', micStop: '■ Stop', hintB: '💡 Hint', check: '✓ Check', showV: 'Show the verse',
    ok: 'Well done! The verse is right ✓', partial: (p) => `Close: ${p}% of the verse’s words in place. The missing words are highlighted.`, wrong: 'Not this time; here is the verse as in the Mushaf:',
    listening: 'Listening…', micFail: 'The voice could not be recognised; write the verse instead.', hintsUsed: (n) => `Hints: ${n}`,
    result: (ok, n) => `Result: ${ok} of ${n} verses right`, allOk: 'Masha’Allah! You know all the verses. Review them tomorrow to fix them.',
    review: 'Well done on some of them. Review the verses you missed, then test again.', relearn: 'The verses are not fixed yet, which is normal at first: repeat them again, listening before each repetition, then test again.',
    redo: 'Repeat again', retest: 'Test again', share: '🔗 Share your result', invite: '🤝 Invite / challenge a friend', copied: 'Text copied; paste it wherever you like.',
    shareText: (s, a, b, ok, n) => `I tested my memorisation on Mishkat: surah ${s}, verses ${a}–${b} — ${ok} of ${n} right.`,
    inviteText: (s, a, b) => `I challenge you to memorise surah ${s} (verses ${a}–${b}) with me on Mishkat, then we compare our test results:`,
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
  // the settings of a session; the same form opens the panel and, folded, ends every session (6 Oct): the next one is
  // set there without going back to the first page
  function formHtml(cfg) {
    const t = L(), Sx = ctx.core.suras[cfg.sura - 1];
    const chip = (name, v, on, label) => `<label class="chip"><input type="radio" name="${name}" value="${v}" ${on ? 'checked' : ''}> ${esc(label)}</label>`;
    return `<div class="p-row tk-pick"><label>${esc(t.sura)} <select id="tkS">${ctx.core.suras.map(s => `<option value="${s.n}" ${s.n === cfg.sura ? 'selected' : ''}>${s.n}. ${esc(ctx.lang() === 'ar' ? s.ar : s.tr)}</option>`).join('')}</select></label>
        <label>${esc(t.from)} <input type="number" id="tkF" min="1" max="${Sx.ayas}" value="${cfg.from}" inputmode="numeric"></label></div>
      <fieldset class="p-field"><legend>${esc(t.count)}</legend><div class="chips">${[1, 2, 5, 10].map(n => chip('tkc', n, !cfg.whole && cfg.count === n, num(n))).join('')}
        ${chip('tkc', 'whole', cfg.whole, t.whole)}</div><label class="p-row">${esc(t.other)} <input type="number" id="tkCn" min="1" max="286" inputmode="numeric" value="${!cfg.whole && ![1, 2, 5, 10].includes(cfg.count) ? cfg.count : ''}"></label></fieldset>
      <fieldset class="p-field"><legend>${esc(t.reps)}</legend><div class="chips">${[3, 5, 7, 10, 20].map(n => chip('tkr', n, cfg.reps === n, '×' + num(n))).join('')}</div>
        <label class="p-row">${esc(t.other)} <input type="number" id="tkRn" min="1" max="100" inputmode="numeric" value="${[3, 5, 7, 10, 20].includes(cfg.reps) ? '' : cfg.reps}"></label></fieldset>
      <fieldset class="p-field"><legend>${esc(t.mode)}</legend><div class="chips">${chip('tkm', 'one', !cfg.together, t.one)}${chip('tkm', 'together', cfg.together, t.together)}</div></fieldset>
      <fieldset class="p-field"><legend>${esc(t.listen)}</legend><div class="chips">${chip('tkl', 'every', cfg.listen === 'every', t.lEvery)}${chip('tkl', 'first', cfg.listen === 'first', t.lFirst)}${chip('tkl', 'none', cfg.listen === 'none', t.lNone)}</div></fieldset>`;
  }
  function wireForm(body, onStart) {
    const P = ctx.prefs, sSel = body.querySelector('#tkS'), fIn = body.querySelector('#tkF');
    sSel.onchange = () => { const s = ctx.core.suras[+sSel.value - 1]; fIn.max = s.ayas; if (+fIn.value > s.ayas) fIn.value = 1; };
    body.querySelector('#tkCn').oninput = (ev) => { if (ev.target.value) body.querySelectorAll('input[name=tkc]').forEach(x => { x.checked = false; }); };
    body.querySelector('#tkRn').oninput = (ev) => { if (ev.target.value) body.querySelectorAll('input[name=tkr]').forEach(x => { x.checked = false; }); };
    return () => {
      const s = +sSel.value, Sy = ctx.core.suras[s - 1];
      const val = (n) => (body.querySelector(`input[name=${n}]:checked`) || {}).value;
      const whole = val('tkc') === 'whole';
      const from = whole ? 1 : Math.min(Sy.ayas, Math.max(1, +fIn.value || 1));
      const cn = +body.querySelector('#tkCn').value, rn = +body.querySelector('#tkRn').value;
      const count = whole ? Sy.ayas : Math.min(Sy.ayas - from + 1, Math.max(1, cn >= 1 ? Math.round(cn) : +val('tkc') || 1));
      const reps = Math.min(100, Math.max(1, rn >= 1 ? Math.round(rn) : +val('tkr') || 5));
      const conf = { sura: s, from, count, whole, reps, together: val('tkm') === 'together' && count > 1, listen: val('tkl') || 'every' };
      P.tk = P.tk || { log: {} }; P.tk.last = conf; ctx.save();
      onStart(conf);
    };
  }
  function render(body, args = {}) {
    stop();
    const t = L(), P = ctx.prefs, last = (P.tk && P.tk.last) || {};
    const sura = args.sura || last.sura || 112, Sx = ctx.core.suras[sura - 1];
    const cfg = { sura, from: args.sura ? Math.min(Sx.ayas, Math.max(1, args.from || 1)) : Math.min(last.from || 1, Sx.ayas), count: args.count || last.count || 1, whole: !!last.whole && !args.sura, reps: last.reps || 5, together: !!last.together, listen: last.listen || 'every' };
    if (args.sura) cfg.whole = false;
    body.innerHTML = `<p class="p-lead">${esc(t.lead)}</p>${formHtml(cfg)}
      <button type="button" class="btn gold big" id="tkGo" autofocus>${esc(t.start)}</button>
      ${scoreBox()}<p class="p-small">${esc(t.blue)}</p>`;
    const go = wireForm(body, (conf) => session(body, conf));
    body.querySelector('#tkGo').onclick = go;
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
      <div class="tk-tj" hidden></div>
      <div class="tk-mid"><button type="button" class="tk-btn" id="tkPress" aria-describedby="tkHint">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="tk-ring0"/><circle cx="60" cy="60" r="54" class="tk-ring" pathLength="100"/></svg>
        <span class="tk-n"></span><span class="tk-pl">${esc(t.press)}</span></button></div>
      <p class="tk-state" aria-live="polite"></p>
      <p class="p-small tk-hint" id="tkHint">${esc(t.pressHint)}</p>
      <div class="p-row tk-ctl"><button type="button" class="mini" id="tkListen">${esc(t.listenNow)}</button><button type="button" class="mini" id="tkNext">${esc(t.next)}</button><button type="button" class="mini" id="tkTj" aria-pressed="false">${esc(t.tj)}</button><button type="button" class="mini" id="tkStop">${esc(t.stop)}</button></div>
      <p class="p-small tk-min"></p></div>`;
    const $b = (s) => body.querySelector(s);
    const state = (msg) => { $b('.tk-state').textContent = msg; };
    const ring = $b('.tk-ring');
    const draw = () => {
      const u = list[my.u], a = ayaOf(u[0]), b = ayaOf(u[1]);
      $b('.tk-where').textContent = `${ctx.lang() === 'ar' ? Sx.ar : Sx.tr}`;
      $b('.tk-of').textContent = u[0] === u[1] ? t.unitOne(num(a), num(my.u + 1), num(list.length)) : t.unitMany(num(a), num(b), num(my.u + 1), num(list.length));
      // (6 Oct) with the tajweed rules on, the verse is drawn in its tajweed colours (the text is unchanged) and its
      // rules are listed under it, each with its short definition
      const tjF = my.tjOn ? my.tjFile : null, lg = ctx.lang() === 'ar' ? 'ar' : 'en', rules = new Map();
      let v = '';
      for (let i = u[0]; i <= u[1]; i++) {
        const full = ctx.core.verses[i], toks = full.split(' '), skip = i === Sx.first && conf.sura !== 1 && conf.sura !== 9 ? 4 : 0;
        const ann = tjF ? tjF[ayaOf(i) - 1] : null, offs = tokenOffsets(full);
        const txt = toks.slice(skip).map((tok, k) => ann ? colourToken(tok, offs[k + skip], ann) : esc(tok)).join(' ');
        v += `<span class="tkv">${txt} <span class="end">﴿${num(ayaOf(i))}﴾</span></span> `;
        if (tjF) for (const { r, word } of verseRules(full, ann)) { if (word < skip) continue; if (!rules.has(r)) rules.set(r, []); const w = toks[word]; if (!rules.get(r).includes(w)) rules.get(r).push(w); }
      }
      $b('.tk-verse').innerHTML = v;
      const tjBox = $b('.tk-tj');
      tjBox.hidden = !my.tjOn;
      if (my.tjOn) tjBox.innerHTML = !tjF ? '' : rules.size ? `<ul>${[...rules.entries()].sort((x, y) => x[0] - y[0]).map(([r, ws]) => { const g = (GROUPS.find(x => x.rules.includes(r)) || {}).id;
        return `<li><span class="tj tj-${g}">●</span> <b>${esc(RULE_INFO[r][lg])}</b> <span dir="rtl" class="tk-tjw">${ws.map(esc).join('، ')}</span><br><small>${esc(lg === 'ar' ? RULE_INFO[r].dar : RULE_INFO[r].den)}</small></li>`; }).join('')}</ul>
        <a class="tj-more" href="tajweed.html?lang=${lg}&from=${conf.sura}:${a}" target="_blank" rel="noopener">${esc(t.tjMore)}</a>` : `<small>${esc(t.tjNone)}</small>`;
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
    $b('#tkTj').onclick = async () => {
      my.tjOn = !my.tjOn; $b('#tkTj').setAttribute('aria-pressed', String(my.tjOn)); $b('#tkTj').textContent = my.tjOn ? t.tjHide : t.tj;
      if (my.tjOn && !my.tjFile && ctx.tajweed) { try { my.tjFile = await ctx.tajweed(conf.sura); } catch (e) { my.tjFile = null; } }
      if (my.alive && S === my) draw();
    };
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
    const conf = my.conf;
    const doneUnits = my.u, ayas = my.list.slice(0, my.u).reduce((s, x) => s + x[1] - x[0] + 1, 0);
    const min = Math.max(1, Math.round((Date.now() - my.started) / 60000));
    stop();
    ctx.onProgress && ctx.onProgress();
    end(body, conf, { doneUnits, ayas, reps: my.totalReps, min });
  }
  // the end of a session: what was done, the test (optional), what comes next — with the settings of the next session
  // folded at the bottom (6 Oct, author's request: no need to go back to the first page)
  function end(body, conf, sum) {
    const t = L(), Sx = ctx.core.suras[conf.sura - 1], nextFrom = conf.from + conf.count;
    const nx = conf.sura < 114 ? ctx.core.suras[conf.sura] : null, nm = (x) => ctx.lang() === 'ar' ? x.ar : x.tr;
    const nextConf = nx ? { ...conf, sura: nx.n, from: 1, count: conf.whole ? nx.ayas : Math.min(conf.count, nx.ayas), together: conf.together && Math.min(conf.count, nx.ayas) > 1 } : null;
    const contConf = nextFrom <= Sx.ayas ? { ...conf, from: nextFrom, whole: false, count: Math.min(conf.count, Sx.ayas - nextFrom + 1) } : null;
    body.innerHTML = `<div class="tk-end"><div class="tk-star" aria-hidden="true">✦</div><h3>${esc(t.endTitle)}</h3>
      ${sum ? `<p>${esc(t.endLine(num(sum.doneUnits), num(sum.ayas), num(sum.reps), num(sum.min)))}</p>` : ''}
      <p><button type="button" class="btn gold big" id="tkTest">${esc(t.test)}</button></p>
      <div class="p-row tk-ctl">${contConf ? `<button type="button" class="btn gold" id="tkCont">${esc(t.cont)}</button>` : ''}
      ${nextConf ? `<button type="button" class="btn ${contConf ? '' : 'gold'}" id="tkNextS">${esc(t.nextSura(nm(nx)))}</button>` : ''}
      <button type="button" class="mini" id="tkAgain">${esc(t.again)}</button></div>
      ${scoreBox()}
      <details class="tk-next"><summary>${esc(t.nextSet)}</summary>${formHtml(contConf || nextConf || conf)}<button type="button" class="btn gold" id="tkGo2">${esc(t.startNext)}</button></details></div>`;
    const go = (c) => { ctx.prefs.tk = ctx.prefs.tk || { log: {} }; ctx.prefs.tk.last = c; ctx.save(); session(body, c); };
    const c = body.querySelector('#tkCont'); if (c) c.onclick = () => go(contConf);
    const ns = body.querySelector('#tkNextS'); if (ns) ns.onclick = () => go(nextConf);
    body.querySelector('#tkAgain').onclick = () => session(body, conf);
    body.querySelector('#tkTest').onclick = () => test(body, conf);
    body.querySelector('#tkGo2').onclick = wireForm(body, (c2) => session(body, c2));
    body.querySelector('#tkTest').focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------ the test (6 Oct, author's request)
  // every verse of the session hidden; written or recited from memory; a hint shows one more word each time; the check
  // compares word by word (js/hifztest.js); then the advice, a share of the result and an invitation to a friend
  async function test(body, conf) {
    stop();
    const t = L(), Sx = ctx.core.suras[conf.sura - 1], first = Sx.first + conf.from - 1, ids = [];
    for (let k = 0; k < conf.count; k++) ids.push(first + k);
    const plain = ctx.plain ? await ctx.plain().catch(() => null) : null;
    const skipOf = (i) => i === Sx.first && conf.sura !== 1 && conf.sura !== 9 ? 4 : 0;
    const mushafToks = (i) => ctx.core.verses[i].split(' ').slice(skipOf(i));
    // the reference: the simple spelling of the same verse (data/search_ar.json), or the Mushaf text
    const ref = (i) => plain && plain[i] ? plain[i] : mushafToks(i).join(' ');
    const st = ids.map(() => ({ hints: 0, res: null }));
    const nm = ctx.lang() === 'ar' ? Sx.ar : Sx.tr, a0 = conf.from, a1 = conf.from + conf.count - 1;
    body.innerHTML = `<div class="tk-test"><h3>${esc(nm)} ${esc(num(a0))}${a1 > a0 ? '–' + esc(num(a1)) : ''}</h3><p class="p-small">${esc(t.testLead)}</p>
      ${ids.map((i, k) => `<section class="tt-v" data-k="${k}"><div class="tt-h"><b>${esc(t.testVerse(num(i - Sx.first + 1)))}</b><small class="tt-hn"></small></div>
        <div class="tt-hint" dir="rtl" lang="ar" hidden></div>
        <textarea dir="rtl" lang="ar" rows="2" placeholder="${esc(t.write)}" aria-label="${esc(t.testVerse(num(i - Sx.first + 1)))}"></textarea>
        <div class="p-row tt-b">${ctx.listen ? `<button type="button" class="mini tt-mic">${esc(t.mic)}</button>` : ''}<button type="button" class="mini tt-hb">${esc(t.hintB)}</button><button type="button" class="mini gold tt-ck">${esc(t.check)}</button></div>
        <div class="tt-r" aria-live="polite"></div></section>`).join('')}
      <div class="tt-sum" aria-live="polite"></div></div>`;
    const secs = [...body.querySelectorAll('.tt-v')];
    const summary = () => {
      if (st.some(x => !x.res)) return;
      const v = verdict(st.map(x => x.res)), box = body.querySelector('.tt-sum');
      box.innerHTML = `<div class="tt-final ${v.all ? 'good' : v.relearn ? 'bad' : ''}"><h3>${esc(t.result(num(v.ok), num(v.n)))}</h3>
        <p>${esc(v.all ? t.allOk : v.relearn ? t.relearn : t.review)}</p>
        <div class="p-row">${v.all ? '' : `<button type="button" class="btn gold" id="ttRedo">${esc(t.redo)}</button>`}<button type="button" class="mini" id="ttRe">${esc(t.retest)}</button>
        <button type="button" class="mini" id="ttShare">${esc(t.share)}</button><button type="button" class="mini" id="ttInv">${esc(t.invite)}</button></div></div>`;
      const r = body.querySelector('#ttRedo'); if (r) r.onclick = () => session(body, { ...conf, listen: v.relearn ? 'every' : conf.listen });
      body.querySelector('#ttRe').onclick = () => test(body, conf);
      const url = `${ctx.site ? ctx.site() : location.origin + location.pathname}?tk=${conf.sura}.${conf.from}.${conf.count}`;
      const share = async (text) => {
        try { if (navigator.share) { await navigator.share({ title: 'Mishkat', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
        try { await navigator.clipboard.writeText(`${text}\n${url}`); ctx.note && ctx.note(t.copied); } catch (e) { /* blocked */ }
      };
      body.querySelector('#ttShare').onclick = () => share(t.shareText(nm, num(a0), num(a1), num(v.ok), num(v.n)));
      body.querySelector('#ttInv').onclick = () => share(t.inviteText(nm, num(a0), num(a1)));
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    secs.forEach((sec, k) => {
      const i = ids[k], ta = sec.querySelector('textarea'), out = sec.querySelector('.tt-r'), hb = sec.querySelector('.tt-hint');
      sec.querySelector('.tt-hb').onclick = () => {
        st[k].hints++; hb.hidden = false; hb.textContent = hint(mushafToks(i), st[k].hints);
        sec.querySelector('.tt-hn').textContent = t.hintsUsed(num(st[k].hints));
      };
      sec.querySelector('.tt-ck').onclick = () => {
        const r = compare(ta.value, ref(i)); st[k].res = r;
        const toks = mushafToks(i).filter(w => /[ء-يٱ]/.test(w));
        // the verse as in the Mushaf, the words not found highlighted (when the two spellings count the same words)
        const marked = toks.length === r.found.length ? toks.map((w, j) => r.found[j] ? esc(w) : `<mark>${esc(w)}</mark>`).join(' ') : esc(mushafToks(i).join(' '));
        out.innerHTML = r.ok ? `<p class="tt-ok">${esc(t.ok)}</p>` : `<p class="${r.score >= 0.5 ? 'tt-mid' : 'tt-no'}">${esc(r.score >= 0.5 ? t.partial(num(Math.round(r.score * 100))) : t.wrong)}</p><p class="tt-ans" dir="rtl" lang="ar">${marked}</p>`;
        sec.classList.toggle('good', r.ok); sec.classList.toggle('bad', !r.ok);
        summary();
      };
      const mic = sec.querySelector('.tt-mic');
      if (mic) mic.onclick = async () => {
        if (mic.classList.contains('rec')) { ctx.stopListen && ctx.stopListen(); return; }
        mic.classList.add('rec'); mic.textContent = t.micStop; out.innerHTML = `<p class="p-small">${esc(t.listening)}</p>`;
        try { const txt = await ctx.listen((p) => { ta.value = p; }); ta.value = txt || ta.value; out.innerHTML = ''; } catch (e) { out.innerHTML = `<p class="p-small">${esc(t.micFail)}</p>`; }
        mic.classList.remove('rec'); mic.textContent = t.mic;
      };
    });
    if (secs[0]) secs[0].querySelector('textarea').focus({ preventScroll: true });
  }

  return { render, stop, test, get running() { return !!S; } };
}
