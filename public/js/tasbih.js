// Tasbih — a counter of remembrance.
//
// The formulas come from data/tasbih.json: each one is cut, word for word, from a graded hadith of the site's adhkar
// file (data_build/build_tasbih.mjs); the counted adhkar of Hisn al-Muslim are offered too (data/athkar.json). Nothing
// is typed here. A free counter, without text, is offered for the visitor's own remembrance.
//
// The count never stops: the number suggested by the hadith is a milestone (the ring closes, a ray of light goes to
// the logo), and the visitor may go on. On a computer the Space bar, Enter or + count; Backspace takes one back.
// Today's count and the total stay in this browser (prefs.tasbih), the month's count feeds the light of the logo.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// counted adhkar of Hisn al-Muslim (id in athkar.json); a formula said in parts (33 · 33 · 34) gives the size of each
// part — the words of each part are the verbatim pieces between the counts written in brackets
export const HISN = [
  { id: 'hm:106', parts: [33, 33, 34] },
  { id: 'hm:94' }, { id: 'hm:97' }, { id: 'hm:86' },
];

export const TS = {
  ar: { title: 'التسبيح', lead: 'عدّاد للذكر. كل صيغة هنا منقولة بحروفها من حديث معروف الدرجة (موسوعة الأحاديث النبوية، و«حصن المسلم» بعد التحقق في الدرر السنية)، مع مصدرها؛ ويمكنك أيضًا أن تعدّ ذكرًا من اختيارك.',
    pick: 'الذكر', formulas: 'التسبيح والتهليل والاستغفار والصلاة على النبي ﷺ', hisn: 'من «حصن المسلم»', free: 'عدّاد حرّ (بلا نص)', freeNote: 'عدّاد بلا نصّ لذكرٍ تختاره أنت.',
    target: 'العدد المقترح', none: 'بلا حدّ', tap: 'اضغط للعدّ — وفي الحاسوب: المسافة أو Enter أو +، والرجوع خطوةً: Backspace', reset: 'صفّر', undo: 'تراجع',
    done: 'بلغتَ العدد ✓ — تقبّل الله منك، ويمكنك أن تواصل', beyond: (n) => `+${n} بعد العدد`,
    today: (n) => `اليوم: ${n}`, total: (n) => `المجموع: ${n}`, part: (k, n) => `${k} من ${n}`, src: 'المصدر', hadith: 'نص الحديث', loading: '…', fail: 'تعذّر تحميل الأذكار.' },
  en: { title: 'Tasbih', lead: 'A counter for remembrance. Every formula here is quoted word for word from a graded hadith (HadeethEnc, and Hisn al-Muslim checked in the Dorar Hadith Encyclopedia), with its source; you can also count a remembrance of your own.',
    pick: 'Remembrance', formulas: 'Tasbih, tahlil, istighfar and blessings on the Prophet ﷺ', hisn: 'From Hisn al-Muslim', free: 'Free counter (no text)', freeNote: 'A counter without text, for a remembrance you choose.',
    target: 'Suggested count', none: 'No limit', tap: 'Tap to count — on a computer: Space, Enter or +; Backspace takes one back', reset: 'Reset', undo: 'Undo',
    done: 'Count reached ✓ — may Allah accept it; you may go on', beyond: (n) => `+${n} beyond the count`,
    today: (n) => `Today: ${n}`, total: (n) => `Total: ${n}`, part: (k, n) => `${k} of ${n}`, src: 'Source', hadith: 'The hadith', loading: '…', fail: 'The adhkar could not be loaded.' },
};

// which part of a formula said in parts the count k (0-based) belongs to; past the end it stays on the last part
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
// one count in prefs.tasbih = { day, today, total }; `delta` is -1 for an undo
export function addCount(t, day, delta = 1) {
  const o = t && t.day === day ? { ...t } : { day, today: 0, total: (t && t.total) || 0 };
  o.today = Math.max(0, o.today + delta); o.total = Math.max(0, o.total + delta);
  return o;
}

// ctx: { lang(), prefs (getter), save(), digits(n), ymd(), onCount(n, el), onGoal(el) }
export function createTasbih(ctx) {
  let dataP = null, keyHandler = null;
  const L = () => TS[ctx.lang()] || TS.ar;
  const num = (n) => ctx.digits ? ctx.digits(n) : String(n);
  const load = () => (dataP = dataP || Promise.all([
    fetch('data/tasbih.json').then(r => { if (!r.ok) throw new Error('tasbih'); return r.json(); }),
    fetch('data/athkar.json').then(r => { if (!r.ok) throw new Error('athkar'); return r.json(); }),
  ]));

  function stop() {
    if (keyHandler) { document.removeEventListener('keydown', keyHandler, true); keyHandler = null; }
  }

  // every choice of the menu as { id, text, goal, parts?, source, grade, url, hadith?, head? }
  function choices(tasbih, athkar) {
    const list = tasbih.formulas.map(f => ({ id: f.key, text: f.text, tr: f.tr, goal: f.count, by: f.by, grade: f.grade, url: f.url, hadith: f.hadith, group: 'formulas' }));
    const byId = new Map(athkar.items.map(x => [x.id, x]));
    for (const h of HISN) {
      const x = byId.get(h.id);
      if (!x) continue;
      list.push({ id: h.id, text: x.text, goal: h.parts ? h.parts.reduce((s, n) => s + n, 0) : Math.max(1, +x.repeat || 1), parts: h.parts, group: 'hisn',
        head: x.chapter, headEn: x.chapterEn, en: x.en && x.en.text, by: 'حصن المسلم', grade: x.dorar && x.dorar.grade, url: x.dorar && x.dorar.url, dorar: x.dorar });
    }
    return list;
  }

  async function render(body, args = {}) {
    stop();
    const t = L(), lg = ctx.lang();
    body.innerHTML = `<p class="note">${esc(t.loading)}</p>`;
    let tasbih, athkar;
    try { [tasbih, athkar] = await load(); } catch (e) { dataP = null; body.innerHTML = `<p class="note">${esc(t.fail)}</p>`; return; }
    const list = choices(tasbih, athkar);
    const known = (id) => id === 'free' || list.some(c => c.id === id);
    let sel = known(args.id) ? args.id : known(ctx.prefs.tasbihSel) ? ctx.prefs.tasbihSel : list[0].id;
    let freeGoal = ctx.prefs.tasbihFree ?? 33;
    let count = 0;

    const current = () => list.find(c => c.id === sel);
    const goalOf = () => sel === 'free' ? freeGoal : current().goal;
    const label = (c) => c.text.replace(/[()]/g, '').split(/[:؛.]/)[0].trim().slice(0, 48) + (c.goal ? ` (${num(c.goal)})` : '');

    function draw() {
      const c = current(), free = sel === 'free', goal = goalOf();
      const P = ctx.prefs.tasbih || {}, today = P.day === ctx.ymd() ? P.today : 0;
      const reached = goal && count >= goal;
      const partWords = c && c.parts ? partWordsOf(c.text, c.parts.length) : null;
      const part = partWords ? partAt(c.parts, Math.min(count, goal - 1)) : -1;
      const ring = goal ? (reached ? 1 : count / goal) : (count % 33) / 33;
      const option = (x) => `<option value="${x.id}"${x.id === sel ? ' selected' : ''}>${esc(label(x))}</option>`;
      const source = c && c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.dorar ? `${c.dorar.muhaddith} · ${c.dorar.source}` : c.by)} · ${esc(c.grade || '')}</a>` : '';

      body.innerHTML = `<p class="p-small">${esc(t.lead)}</p>
        <label class="p-row ts-pick">${esc(t.pick)}
          <select id="tsSel">
            <optgroup label="${esc(t.formulas)}">${list.filter(x => x.group === 'formulas').map(option).join('')}</optgroup>
            <optgroup label="${esc(t.hisn)}">${list.filter(x => x.group === 'hisn').map(option).join('')}</optgroup>
            <option value="free"${free ? ' selected' : ''}>${esc(t.free)}</option>
          </select></label>
        <div class="ts-box">
          ${free
            ? `<p class="p-small">${esc(t.freeNote)}</p>`
            : `${c.head ? `<p class="ak-head">${esc(lg === 'en' && c.headEn ? c.headEn : c.head)}</p>` : ''}
               <p class="ts-text" dir="rtl" lang="ar">${esc(c.text)}</p>
               ${lg === 'en' && (c.tr || c.en) ? `<p class="ak-en" dir="ltr">${esc(c.tr || c.en)}</p>` : ''}
               ${partWords ? `<p class="ts-part" dir="rtl" lang="ar">${esc(partWords[part])} <small>(${esc(t.part(num(part + 1), num(partWords.length)))})</small></p>` : ''}`}
          <label class="p-row">${esc(t.target)}
            <select id="tsGoal">${[...new Set([goal, 33, 99, 100, 1000, 0])].filter(n => n != null).map(n => `<option value="${n}"${n === goal ? ' selected' : ''}>${n ? num(n) : esc(t.none)}</option>`).join('')}</select></label>
          <button type="button" class="ts-btn${reached ? ' done' : ''}" id="tsGo" aria-describedby="tsHint" aria-live="polite">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="tk-ring0"/><circle cx="60" cy="60" r="54" class="tk-ring" pathLength="100" style="stroke-dashoffset:${(100 - 100 * ring).toFixed(1)}"/></svg>
            <b>${esc(num(count))}</b><small>${goal ? '/ ' + esc(num(goal)) : ''}</small></button>
          <p class="p-small" id="tsHint">${esc(reached ? t.done : t.tap)}${reached && count > goal ? ` · ${esc(t.beyond(num(count - goal)))}` : ''}</p>
          <p class="p-row ts-ctl"><button type="button" class="mini" id="tsUndo"${count ? '' : ' disabled'}>${esc(t.undo)}</button> <button type="button" class="mini" id="tsReset">${esc(t.reset)}</button>
            <span>${esc(t.today(num(today)))}</span> · <span>${esc(t.total(num(P.total || 0)))}</span></p>
          ${free ? '' : `<p class="ak-src">${esc(t.src)}: ${source}</p>${c.hadith ? `<details class="ts-hadith"><summary>${esc(t.hadith)}</summary><p dir="rtl" lang="ar">${esc(c.hadith)}</p></details>` : ''}`}
        </div>`;

      body.querySelector('#tsSel').onchange = (ev) => { sel = ev.target.value; count = 0; ctx.prefs.tasbihSel = sel; ctx.save(); draw(); };
      body.querySelector('#tsGoal').onchange = (ev) => {
        const n = +ev.target.value;
        if (sel === 'free') { freeGoal = n; ctx.prefs.tasbihFree = n; ctx.save(); } else current().goal = n;
        draw();
      };
      body.querySelector('#tsReset').onclick = () => { count = 0; draw(); };
      body.querySelector('#tsUndo').onclick = undo;
      body.querySelector('#tsGo').onclick = press;
    }

    function press() {
      const goal = goalOf();
      count++;
      ctx.prefs.tasbih = addCount(ctx.prefs.tasbih, ctx.ymd());
      ctx.save();
      const milestone = goal ? count === goal || (count > goal && (count - goal) % 33 === 0) : count % 33 === 0;
      if (navigator.vibrate) navigator.vibrate(milestone ? [40, 70, 40] : 10);
      draw();
      const btn = body.querySelector('#tsGo');
      if (btn) { btn.classList.add('pop'); btn.focus({ preventScroll: true }); }
      if (ctx.onCount) ctx.onCount(1, btn);
      if (milestone && ctx.onGoal) ctx.onGoal(btn);
    }
    function undo() {
      if (!count) return;
      count--;
      ctx.prefs.tasbih = addCount(ctx.prefs.tasbih, ctx.ymd(), -1);
      ctx.save();
      if (ctx.onCount) ctx.onCount(-1, null);
      draw();
    }

    keyHandler = (ev) => {
      if (!body.isConnected || body.closest('[hidden]')) return;
      if (ev.target.closest && ev.target.closest('input,select,textarea,a,summary')) return;
      const onOtherButton = ev.target.closest && ev.target.closest('button') && ev.target.id !== 'tsGo';
      if ((ev.key === ' ' || ev.key === 'Enter') && onOtherButton) return;
      if (ev.key === ' ' || ev.key === 'Enter' || ev.key === '+' || ev.key === 'ArrowUp') { ev.preventDefault(); ev.stopPropagation(); press(); }
      else if (ev.key === 'Backspace' || ev.key === '-') { ev.preventDefault(); ev.stopPropagation(); undo(); }
    };
    document.addEventListener('keydown', keyHandler, true);
    draw();
  }

  return { render, stop };
}
