// (6 Oct, author's request) tasbih — a counter of remembrance. The formulas offered are those of the adhkar file of the
// site (data/athkar.json: Hisn al-Muslim checked on the Dorar Hadith Encyclopedia, HadeethEnc), VERBATIM, with their
// number and their grade and source; nothing is written here. A free counter (no words) is offered too, for the
// visitor's own remembrance. Today's count and the total stay in this browser (prefs.tasbih).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// the formulas: item id in athkar.json and, for a formula said in parts (33 · 33 · 34), the count of each part — the
// words of each part are cut from the verbatim text itself (the pieces between its counts in brackets), never retyped
export const PRESETS = [
  { id: 'hm:91' }, { id: 'hm:96' },
  { id: 'hm:106', parts: [33, 33, 34] },
  { id: 'hm:94' }, { id: 'hm:97' }, { id: 'hm:86' },
];
export const TS = {
  ar: { title: 'التسبيح', lead: 'عدّاد للذكر. الأذكار هنا من «حصن المسلم» بعد التحقق من درجتها في الموسوعة الحديثية (الدرر السنية)، بنصّها وعددها ومصدرها؛ ويمكنك أيضًا أن تعدّ ذكرًا من اختيارك.',
    free: 'عدّاد حرّ', freeNote: 'عدّاد بلا نصّ لذكرٍ تختاره أنت.', target: 'العدد', inf: '∞', tap: 'اضغط للعدّ · المسافة أو Enter في الحاسوب', reset: 'صفّر', done: 'تمّ العدد ✓ — تقبّل الله منك',
    today: (n) => `اليوم: ${n}`, total: (n) => `المجموع: ${n}`, part: (k, n) => `${k} من ${n}`, src: 'المصدر', loading: '…', fail: 'تعذّر تحميل الأذكار.', vib: 'اهتزاز عند كل ٣٣ وعند التمام' },
  en: { title: 'Tasbih', lead: 'A counter for remembrance. The formulas come from Hisn al-Muslim, each checked in the Dorar Hadith Encyclopedia, with their text, number and source; you can also count a remembrance of your own.',
    free: 'Free counter', freeNote: 'A counter without text, for a remembrance you choose.', target: 'Count', inf: '∞', tap: 'Tap to count · Space or Enter on a computer', reset: 'Reset', done: 'Count complete ✓ — may Allah accept it',
    today: (n) => `Today: ${n}`, total: (n) => `Total: ${n}`, part: (k, n) => `${k} of ${n}`, src: 'Source', loading: '…', fail: 'The adhkar could not be loaded.', vib: 'Vibrates at every 33 and at the end' },
};

// which part of a formula said in parts the count k (0-based, before pressing) belongs to
export function partAt(parts, k) {
  let acc = 0;
  for (let j = 0; j < parts.length; j++) { acc += parts[j]; if (k < acc) return j; }
  return parts.length - 1;
}
// the words of each part of a formula said in parts: the verbatim pieces between the counts written in brackets
export function partWordsOf(text, n) {
  const segs = String(text).replace(/^[\s(]+/, '').split(/\s*\([^()]*\)\s*/).map(x => x.replace(/[()]/g, '').trim()).filter(x => /[ء-ي]/.test(x));
  return segs.length >= n ? segs.slice(0, n) : null;
}
// record one count in prefs.tasbih = { day, today, total }
export function addCount(t, day) {
  const o = t && t.day === day ? { ...t } : { day, today: 0, total: (t && t.total) || 0 };
  o.today++; o.total++;
  return o;
}

// ctx: { lang(), prefs (getter), save(), digits(n), ymd() }
export function createTasbih(ctx) {
  let dataP = null, keyH = null;
  const L = () => TS[ctx.lang()] || TS.ar;
  const num = (n) => ctx.digits ? ctx.digits(n) : String(n);
  function stop() { if (keyH) { document.removeEventListener('keydown', keyH, true); keyH = null; } }
  async function render(body, args = {}) {
    stop();
    const t = L(), lg = ctx.lang();
    body.innerHTML = `<p class="note">${esc(t.loading)}</p>`;
    let d;
    try { d = await (dataP = dataP || fetch('data/athkar.json').then(r => { if (!r.ok) throw new Error('athkar'); return r.json(); })); }
    catch (e) { dataP = null; body.innerHTML = `<p class="note">${esc(t.fail)}</p>`; return; }
    const byId = new Map(d.items.map(x => [x.id, x]));
    const list = PRESETS.map(p => ({ ...p, x: byId.get(p.id) })).filter(p => p.x);
    let sel = args.id && list.some(p => p.id === args.id) ? args.id : (ctx.prefs.tasbihSel || list[0].id), freeN = ctx.prefs.tasbihFree || 33, k = 0;
    const draw = () => {
      const p = list.find(x => x.id === sel), free = sel === 'free';
      const goal = free ? freeN : p.parts ? p.parts.reduce((s, x) => s + x, 0) : Math.max(1, +p.x.repeat || 1);
      const P = ctx.prefs.tasbih || {}, today = P.day === ctx.ymd() ? P.today : 0;
      const head = (x) => x.src === 'hisn' ? (lg === 'en' && x.chapterEn ? x.chapterEn : x.chapter) : (lg === 'en' && x.en && x.en.title ? x.en.title : x.title);
      const src = (x) => x.src === 'hisn' && x.dorar ? `<a href="${esc(x.dorar.url)}" target="_blank" rel="noopener">${esc(x.dorar.muhaddith)} · ${esc(x.dorar.source)} · ${esc(x.dorar.grade)}</a>` : x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">HadeethEnc · ${esc(x.grade || '')}</a>` : '';
      const pj = p && p.parts ? partAt(p.parts, Math.min(k, goal - 1)) : -1;
      const partWords = p && p.parts ? partWordsOf(p.x.text, p.parts.length) : null;
      const ring = goal ? Math.min(1, k / goal) : 0;
      body.innerHTML = `<p class="p-small">${esc(t.lead)}</p>
        <div class="chips ts-pick">${list.map(x => `<button type="button" class="chip${x.id === sel ? ' on' : ''}" data-ts="${x.id}">${esc(x.x.text.replace(/[()]/g, '').split(/[:،.]/)[0].trim().slice(0, 34))}</button>`).join('')}
          <button type="button" class="chip${free ? ' on' : ''}" data-ts="free">${esc(t.free)}</button></div>
        <div class="ts-box">
          ${free ? `<p class="p-small">${esc(t.freeNote)}</p><label class="p-row">${esc(t.target)} <select id="tsN">${[33, 99, 100, 1000, 0].map(n => `<option value="${n}" ${n === freeN ? 'selected' : ''}>${n ? num(n) : t.inf}</option>`).join('')}</select></label>`
            : `<p class="ak-head">${esc(head(p.x))}</p><p class="ts-text" dir="rtl" lang="ar">${esc(p.x.text)}</p>${lg === 'en' && p.x.en && p.x.en.text ? `<p class="ak-en" dir="ltr">${esc(p.x.en.text)}</p>` : ''}
              ${partWords ? `<p class="ts-part" dir="rtl" lang="ar">${esc(partWords[pj])} <small>(${esc(t.part(num(pj + 1), num(partWords.length)))})</small></p>` : ''}`}
          <button type="button" class="ts-btn${goal && k >= goal ? ' done' : ''}" id="tsGo" aria-describedby="tsHint">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="tk-ring0"/><circle cx="60" cy="60" r="54" class="tk-ring" pathLength="100" style="stroke-dashoffset:${(100 - 100 * ring).toFixed(1)}"/></svg>
            <b>${esc(num(k))}</b><small>${goal ? '/ ' + esc(num(goal)) : ''}</small></button>
          <p class="p-small" id="tsHint">${esc(goal && k >= goal ? t.done : t.tap)}</p>
          <p class="p-row ts-ctl"><button type="button" class="mini" id="tsReset">${esc(t.reset)}</button> <span>${esc(t.today(num(today)))}</span> · <span>${esc(t.total(num(P.total || 0)))}</span></p>
          ${free ? '' : `<p class="ak-src">${esc(t.src)}: ${src(p.x)}</p>`}</div>`;
      body.querySelectorAll('[data-ts]').forEach(b => b.onclick = () => { sel = b.dataset.ts; k = 0; ctx.prefs.tasbihSel = sel; ctx.save(); draw(); });
      const n = body.querySelector('#tsN'); if (n) n.onchange = () => { freeN = +n.value; ctx.prefs.tasbihFree = freeN; ctx.save(); k = 0; draw(); };
      body.querySelector('#tsReset').onclick = () => { k = 0; draw(); };
      body.querySelector('#tsGo').onclick = press;
    };
    const press = () => {
      const p = list.find(x => x.id === sel), free = sel === 'free';
      const goal = free ? freeN : p.parts ? p.parts.reduce((s, x) => s + x, 0) : Math.max(1, +p.x.repeat || 1);
      if (goal && k >= goal) return;
      k++;
      ctx.prefs.tasbih = addCount(ctx.prefs.tasbih, ctx.ymd()); ctx.save();
      if (navigator.vibrate) navigator.vibrate(goal && k >= goal ? [40, 70, 40] : k % 33 === 0 ? 40 : 10);
      draw();
      const b = body.querySelector('#tsGo'); if (b) { b.classList.add('pop'); b.focus({ preventScroll: true }); }
    };
    keyH = (ev) => {
      if (!body.isConnected || body.closest('[hidden]')) return;
      if (ev.target.closest && ev.target.closest('input,select,textarea,a')) return;
      if (ev.key === ' ' || ev.key === 'Enter') { if (ev.target.closest && ev.target.closest('button') && ev.target.id !== 'tsGo') return; ev.preventDefault(); ev.stopPropagation(); press(); }
    };
    document.addEventListener('keydown', keyH, true);
    draw();
  }
  return { render, stop };
}
