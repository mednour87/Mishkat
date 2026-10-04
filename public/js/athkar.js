// T062 — adhkar by theme, each with its grade and source, verbatim (data_build/build_athkar.py):
// HadeethEnc remembrances graded صحيح/حسن, and Hisn al-Muslim remembrances ONLY when the Hadith Encyclopedia
// of Dorar gives a صحيح/حسن verdict for that wording (muhaddith, book and number shown). A counter per dhikr
// (its prescribed number of repetitions), the audio of Hisn al-Muslim when published. Nothing is generated.
import { normAr } from './engine.js';

export const AS = {
  ar: { title: 'الأذكار', all: 'الكل', search: 'ابحث في الأذكار…', none: 'لا يوجد ذكر ثابت بهذا اللفظ في المصادر المعتمدة لديّ.', loading: 'جارٍ التحميل…', fail: 'تعذّر تحميل الأذكار.',
    count: (n) => `التكرار: ${n}`, tap: 'اضغط للعدّ', done: 'تمّ', reset: 'إعادة', listen: 'استماع', hisn: 'حصن المسلم', he: 'موسوعة الأحاديث النبوية',
    graded: (m, g) => `حكم المحدث (${m}): ${g}`, note: 'لا يُعرض ذكر إلا بحكم صحيح أو حسن من مصدر معتمد: أحاديث HadeethEnc بأحكامها، وأذكار «حصن المسلم» بعد التحقق من كل ذكر في الموسوعة الحديثية بالدرر السنية؛ وما لم يُعثر له على حكم استُبعد.',
    meaning: 'المعنى بالإنجليزية', more: (n) => `${n} ذكرًا آخر`, src: 'المصدر' },
  en: { title: 'Adhkar', all: 'All', search: 'Search the adhkar…', none: 'No established remembrance with these words in the approved sources I hold.', loading: 'Loading…', fail: 'The adhkar could not be loaded.',
    count: (n) => `Repeat: ${n}`, tap: 'tap to count', done: 'done', reset: 'reset', listen: 'Listen', hisn: 'Hisn al-Muslim', he: 'HadeethEnc',
    graded: (m, g) => `Grade (${m}): ${g}`, note: 'A remembrance is shown only with a sahih or hasan grade from an approved source: HadeethEnc hadiths with their grades, and Hisn al-Muslim remembrances after each one was checked in the Hadith Encyclopedia of Dorar; those without a grade were left out.',
    meaning: 'Meaning in English', more: (n) => `${n} more`, src: 'Source' },
};
// words of a request → theme and search words («أذكار النوم», «ماذا أقول في التشهد», "morning adhkar")
const THEME_WORDS = [
  ['morning', /الصباح|المساء|الصباحيه|المسائيه|morning|evening/],
  ['sleep', /النوم|انام|نومي|الاستيقاظ|استيقظ|sleep|sleeping|bed|wake|waking/],
  ['prayer', /التشهد|الصلاه|السجود|الركوع|الاستفتاح|الاذان|المسجد|الوضوء|القنوت|الوتر|الاستخاره|prayer|tashahhud|sujood|ruku|adhan|mosque|wudu|ablution|istikhara/],
  ['home', /الطعام|الاكل|الشرب|المنزل|البيت|الخلاء|اللباس|العطاس|eating|food|home|house|toilet|clothes|sneez/],
  ['travel', /السفر|الركوب|المسافر|travel|journey|riding/],
  ['distress', /الكرب|الهم|الحزن|المرض|المريض|المصيبه|الخوف|الغضب|distress|anxiety|grief|illness|sick|fear|anger|calamity/],
  ['istighfar', /الاستغفار|التسبيح|التهليل|forgiveness|istighfar|tasbih/],
];
const STOP = new Set(['اذكار', 'الاذكار', 'ذكر', 'دعاء', 'ادعيه', 'الدعاء', 'ماذا', 'اقول', 'يقال', 'ما', 'في', 'عند', 'قبل', 'بعد', 'what', 'to', 'say', 'when', 'before', 'after', 'adhkar', 'azkar', 'dhikr', 'dua', 'duas', 'supplication', 'of', 'the', 'for', 'i', 'do', 'should', 'remembrance', 'words']);
export function athkarQuery(q) {
  const n = (normAr(String(q || '')) + ' ' + String(q || '').toLowerCase().replace(/[^a-z\s]/g, ' ')).replace(/\s+/g, ' ').trim();
  const theme = (THEME_WORDS.find(([, re]) => re.test(n)) || [null])[0];
  const words = n.split(/\s+/).filter(w => w.length > 2 && !STOP.has(w) && !STOP.has(w.replace(/^ال/, '')));
  return { theme, words };
}
// items of a theme, filtered by the words when they match something (else the whole theme)
export function filterAthkar(items, { theme = null, words = [] } = {}) {
  let list = theme ? items.filter(x => x.theme === theme) : items.slice();
  if (words.length) {
    const hay = (x) => normAr([x.chapter, x.title, x.text, (x.cats || []).join(' ')].join(' '));
    const W = words.map(w => normAr(w).replace(/^ال/, ''));
    const hit = list.filter(x => W.some(w => hay(x).includes(w)));
    // the chapter or title that names it first («التشهد» → the tashahhud before the supplications after it)
    const head = (x) => normAr([x.chapter, x.title].join(' '));
    if (hit.length) list = hit.map((x, i) => [x, i, W.some(w => head(x).includes(w)) ? 0 : 1]).sort((a, b) => a[2] - b[2] || a[1] - b[1]).map(a => a[0]);
  }
  return list;
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createAthkar(ctx) {
  let dataP = null;
  const L = () => AS[ctx.lang()] || AS.ar;
  const num = (n) => ctx.lang() === 'ar' ? String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n);
  let audio = null;
  let last = {};
  return async function athkar(body, args = {}) {
    // a redraw (language change) comes without the request: keep the last one
    if (args && (args.q || args.theme)) last = args; else args = last;
    const t = L(), lg = ctx.lang();
    body.innerHTML = `<p class="note">${esc(t.loading)}</p>`;
    let d;
    try { d = await (dataP = dataP || fetch('data/athkar.json').then(r => { if (!r.ok) throw new Error('athkar'); return r.json(); })); }
    catch (e) { dataP = null; body.innerHTML = `<p class="note">${esc(t.fail)}</p>`; return; }
    const q = args.q ? athkarQuery(args.q) : { theme: args.theme || null, words: [] };
    let theme = q.theme, words = q.words, SHOW = 25;
    const draw = () => {
      const list = filterAthkar(d.items, { theme, words });
      body.innerHTML = `<div class="ak-themes" role="group">${[['', t.all], ...d.themes.map(x => [x.id, lg === 'ar' ? x.ar : x.en])].map(([id, name]) => `<button type="button" class="chip${(theme || '') === id ? ' on' : ''}" data-th="${id}">${esc(name)}</button>`).join('')}</div>
        <form class="p-row ak-find"><input type="search" placeholder="${esc(t.search)}" value="${esc(words.join(' '))}" aria-label="${esc(t.search)}"></form>
        ${list.length ? '' : `<p class="note">${esc(t.none)}</p>`}
        <ol class="ak-list">${list.slice(0, SHOW).map(x => item(x)).join('')}</ol>
        ${list.length > SHOW ? `<button type="button" class="mini" data-more>${esc(t.more(num(list.length - SHOW)))}</button>` : ''}
        <p class="p-small">${esc(t.note)}</p>`;
      body.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { theme = b.dataset.th || null; words = []; SHOW = 25; last = theme ? { theme } : {}; draw(); });
      body.querySelector('.ak-find').onsubmit = (ev) => { ev.preventDefault(); const v = ev.target.querySelector('input').value; const qq = athkarQuery(v); words = qq.words; if (qq.theme && !theme) theme = qq.theme; SHOW = 25; draw(); };
      const more = body.querySelector('[data-more]'); if (more) more.onclick = () => { SHOW += 25; draw(); };
      body.querySelectorAll('[data-count]').forEach(b => b.onclick = () => {
        const left = Math.max(0, +b.dataset.left - 1);
        b.dataset.left = left;
        b.querySelector('b').textContent = num(left);
        b.classList.toggle('done', left === 0);
        if (navigator.vibrate) navigator.vibrate(left === 0 ? [30, 60, 30] : 15);
      });
      body.querySelectorAll('[data-reset]').forEach(b => b.onclick = () => { const c = b.parentElement.querySelector('[data-count]'); c.dataset.left = c.dataset.n; c.querySelector('b').textContent = num(c.dataset.n); c.classList.remove('done'); });
      body.querySelectorAll('[data-audio]').forEach(b => b.onclick = () => { if (audio) audio.pause(); audio = new Audio(b.dataset.audio); audio.play().catch(() => {}); });
    };
    const item = (x) => {
      const n = Math.max(1, +x.repeat || 1);
      const src = x.src === 'hisn'
        ? `${esc(t.hisn)} — <a href="${esc(x.dorar.url)}" target="_blank" rel="noopener">${esc(t.graded(x.dorar.muhaddith, x.dorar.grade))}</a> · ${esc(x.dorar.source)}${x.dorar.page ? ' ' + esc(x.dorar.page) : ''}`
        : `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(t.he)}</a> · ${esc(x.by)} · ${esc(x.grade)}`;
      const en = lg === 'en' && x.en && x.en.text ? `<p class="ak-en" dir="ltr">${esc(x.en.text)}</p>` : '';
      return `<li class="ak-item"><p class="ak-head">${esc(x.src === 'hisn' ? (lg === 'en' && x.chapterEn ? x.chapterEn : x.chapter) : (lg === 'en' && x.en && x.en.title ? x.en.title : x.title))}</p>
        <p class="ak-text" dir="rtl">${esc(x.text)}</p>${en}
        <div class="ak-row"><button type="button" class="ak-count" data-count data-n="${n}" data-left="${n}" aria-label="${esc(t.tap)}"><b>${esc(num(n))}</b><small>${esc(n > 1 ? t.count(num(n)) : t.tap)}</small></button>
        ${n > 1 ? `<button type="button" class="mini" data-reset>${esc(t.reset)}</button>` : ''}
        ${x.audio ? `<button type="button" class="mini" data-audio="${esc(x.audio)}">▶ ${esc(t.listen)}</button>` : ''}</div>
        <p class="ak-src">${src}</p></li>`;
    };
    draw();
  };
}
