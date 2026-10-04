// T094 — statistics of a surah and of a word, counted in the browser from the Tanzil text (core.json, shown as
// is) and its plain-spelling copy (search_ar.json, for matching words). Counts only: verses, words, letters, pages,
// occurrences and where they are. No numerical value of letters (jummal) and no «numerical miracle»: a count is a
// count (rule 8 of the project).
import { normAr } from './engine.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LETTER = /[ء-يٱ]/;
const LETTERS_G = /[ء-ؿف-يٱ]/g;   // Arabic letters (not the tatweel U+0640)
// function words left out of «most frequent words» (plain spelling, normalised)
const STOP = new Set(('من في علي الي عن ما لا ان او ام ثم قد لم لن هو هي هم هن انت انتم نحن انا انه انهم الذي الذين التي اللذين ' +
  'كان كانوا يكون تكون كانت هذا هذه ذلك تلك اولئك هل بل اذا اذ اذن لو لولا الا حتي مع عند كل بعض غير قل قال قالوا يا ' +
  'لهم له لها لكم لنا به بها بهم فيه فيها عليه عليهم عليها منه منها منهم الله ولا وما ومن وان فان فلا ولكن لكن ' +
  'ف و ب ل ك ان اما اي يوم').split(' '));

// the article and the prepositions written with it (وال فال بال كال لل ال), when at least 3 letters remain:
// «والصبر» → «صبر», but «الله» stays «الله» (for the most frequent words)
const ART = ['وال', 'فال', 'بال', 'كال', 'لل', 'ال'];
const strip = (w) => { for (const p of ART) if (w.startsWith(p) && w.length - p.length >= 3) return w.slice(p.length); return w; };
// every written form of a word with what is attached before it in writing: و ف, then ب ك ل, then the article
// («الصبر» → صبر الصبر والصبر بالصبر فبالصبر…; «الله» → الله والله بالله لله ولله تالله is not added). Never a
// letter that may belong to the word itself is removed («فرعون», «بصير» stay whole).
export function wordForms(query) {
  const q = normAr(query).split(' ')[0] || '';
  if (q.length < 2) return null;
  const hasArt = q.startsWith('ال') && q.length > 3, core = hasArt ? q.slice(2) : q;
  // ل + the article: «للصبر»; when the word itself starts with ل the lams merge: «لله», «لليل»
  const lil = (c) => 'لل' + (c.startsWith('ل') ? c.slice(1) : c);
  const base = new Set(hasArt ? [q, 'ب' + q, 'ك' + q, lil(core)] : [q, 'ب' + q, 'ك' + q, 'ل' + q, 'ال' + q, 'بال' + q, 'كال' + q, lil(q)]);
  if (hasArt && core.length >= 3) for (const f of [core, 'ب' + core, 'ك' + core, 'ل' + core]) base.add(f);
  const out = new Set(base);
  for (const f of base) { out.add('و' + f); out.add('ف' + f); }
  return { q, core, set: out };
}

// words of a verse in the Tanzil text, without the basmala that Tanzil puts before verse 1 (but 1 and 9) and
// without the pause marks (tokens without letters)
export function verseWords(core, i, suraOf) {
  const w = core.verses[i].split(' ').filter(x => LETTER.test(x));
  const S = core.suras[suraOf[i] - 1];
  return i === S.first && S.n !== 1 && S.n !== 9 ? w.slice(4) : w;
}
export const letterCount = (words) => words.reduce((s, w) => s + (w.match(LETTERS_G) || []).length, 0);

export function suraOfIndex(core) {
  const out = new Uint8Array(core.verses.length);
  for (const S of core.suras) for (let k = 0; k < S.ayas; k++) out[S.first + k] = S.n;
  return out;
}

export function suraStats(core, plain, meta, n, suraOf) {
  const S = core.suras[n - 1];
  let words = 0, letters = 0, longest = null, shortest = null;
  const lens = [], freq = new Map();
  for (let k = 0; k < S.ayas; k++) {
    const i = S.first + k, w = verseWords(core, i, suraOf);
    words += w.length; letters += letterCount(w); lens.push(w.length);
    if (!longest || w.length > longest.n) longest = { i, n: w.length };
    if (!shortest || w.length < shortest.n) shortest = { i, n: w.length };
    const pw = normAr(plain[i] || '').split(' ');
    const skip = i === S.first && n !== 1 && n !== 9 && pw[0] === 'بسم' ? 4 : 0;
    for (const t of pw.slice(skip)) { const s = strip(t); if (s.length < 2 || STOP.has(t) || STOP.has(s)) continue; freq.set(s, (freq.get(s) || 0) + 1); }
  }
  const pageOf = (i) => { let lo = 0, hi = meta.pages.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (meta.pages[m] <= i) lo = m; else hi = m - 1; } return lo + 1; };
  const juzOf = (i) => { let j = 0; while (j + 1 < meta.juz.length && meta.juz[j + 1] <= i) j++; return j + 1; };
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return { S, words, letters, lens, longest, shortest, top, pages: [pageOf(S.first), pageOf(S.first + S.ayas - 1)], juz: [juzOf(S.first), juzOf(S.first + S.ayas - 1)] };
}

// occurrences of a word: 'word' = the word itself with the attached و/ف/ب/ك/ل and the article; 'forms' = every word
// that contains these letters (derived forms, conjugations — and sometimes unrelated words: said on the page)
export function wordStats(core, plain, query, mode = 'word', suraOf) {
  const wf = wordForms(query);
  if (!wf) return null;
  const q = mode === 'word' ? wf.q : wf.core;
  const by = new Map(), forms = new Map();
  let total = 0, verses = 0, meccan = 0, medinan = 0, first = null, last = null;
  for (let i = 0; i < plain.length; i++) {
    const n = suraOf[i], S = core.suras[n - 1];
    let pw = normAr(plain[i] || '').split(' ');
    if (i === S.first && n !== 1 && n !== 9 && pw[0] === 'بسم') pw = pw.slice(4);
    let c = 0;
    for (const t of pw) {
      if (mode === 'word' ? wf.set.has(t) : t.includes(q)) { c++; forms.set(t, (forms.get(t) || 0) + 1); }
    }
    if (!c) continue;
    total += c; verses++;
    if (S.type === 'meccan') meccan += c; else medinan += c;
    by.set(n, (by.get(n) || 0) + c);
    if (first == null) first = i;
    last = i;
  }
  return { q, mode, total, verses, suras: by.size, meccan, medinan, first, last,
    bySura: [...by.entries()].sort((a, b) => b[1] - a[1]), forms: [...forms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12) };
}

export function totals(core, suraOf) {
  let words = 0, letters = 0;
  for (let i = 0; i < core.verses.length; i++) { const w = verseWords(core, i, suraOf); words += w.length; letters += letterCount(w); }
  return { suras: core.suras.length, verses: core.verses.length, words, letters };
}

export const ST = {
  ar: {
    title: 'الإحصاءات', lead: 'أرقام محسوبة في متصفحك من نص المصحف (Tanzil): الآيات والكلمات والحروف والمواضع. لا حساب للجُمَّل ولا «إعجاز عددي».',
    all: 'القرآن كله', suras: 'سورة', verses: 'آية', words: 'كلمة', letters: 'حرفًا',
    tabSura: 'سورة', tabWord: 'كلمة', pick: 'اختر سورة', type: 'النوع', meccan: 'مكية', medinan: 'مدنية', order: 'ترتيب النزول', ayas: 'عدد الآيات', nWords: 'عدد الكلمات', nLetters: 'عدد الحروف',
    pages: 'الصفحات', juz: 'الجزء', share: 'نسبتها من المصحف', longest: 'أطول آية', shortest: 'أقصر آية', wordsN: (n) => `${n} كلمة`, top: 'أكثر الكلمات تكرارًا (دون حروف المعاني)',
    lens: 'طول الآيات بالكلمات (من أول السورة إلى آخرها)', open: 'افتح',
    wordPh: 'اكتب كلمة، مثل: الصبر', count: 'احسب', modeWord: 'الكلمة نفسها (مع و ف ب ك ل وأل)', modeForms: 'كل كلمة تحتوي هذه الحروف',
    occ: 'مرة', inVerses: 'في آية', inSuras: 'في سورة', mec: 'في السور المكية', med: 'في السور المدنية', first: 'أول موضع', last: 'آخر موضع',
    bySura: 'السور الأكثر ورودًا (اضغط للفتح)', forms: 'الصيغ التي وُجدت', none: 'لم أجد هذه الكلمة بهذه الصيغة؛ جرّب «كل كلمة تحتوي هذه الحروف».',
    note: 'العدّ على الرسم الإملائي المبسط؛ لا يجمع الكلمات حسب الجذر، فقد تختلف الأرقام قليلًا عن الكتب التي تعدّ بالجذر.', searchIt: (w) => `ابحث في القرآن عن «${w}»`,
  },
  en: {
    title: 'Statistics', lead: 'Counts made in your browser from the Mushaf text (Tanzil): verses, words, letters and places. No letter values (jummal) and no “numerical miracle”.',
    all: 'The whole Quran', suras: 'surahs', verses: 'verses', words: 'words', letters: 'letters',
    tabSura: 'Surah', tabWord: 'Word', pick: 'Choose a surah', type: 'Type', meccan: 'Meccan', medinan: 'Medinan', order: 'Order of revelation', ayas: 'Verses', nWords: 'Words', nLetters: 'Letters',
    pages: 'Pages', juz: 'Juz', share: 'Share of the Mushaf', longest: 'Longest verse', shortest: 'Shortest verse', wordsN: (n) => `${n} words`, top: 'Most frequent words (without particles)',
    lens: 'Verse lengths in words (from the first verse to the last)', open: 'Open',
    wordPh: 'Type an Arabic word, e.g. الصبر', count: 'Count', modeWord: 'The word itself (with و ف ب ك ل and al-)', modeForms: 'Every word containing these letters',
    occ: 'times', inVerses: 'verses', inSuras: 'surahs', mec: 'in Meccan surahs', med: 'in Medinan surahs', first: 'First place', last: 'Last place',
    bySura: 'Surahs where it occurs most (click to open)', forms: 'Forms found', none: 'This word was not found in this form; try “every word containing these letters”.',
    note: 'Counted on the simplified spelling; words are not grouped by root, so figures may differ slightly from books that count by root.', searchIt: (w) => `Search the Quran for “${w}”`,
  },
};

// ctx: { lang(), core, plain() → Promise<array>, meta() → Promise, openVerse(i), search(q), digits(n) }
export function createStats(ctx) {
  const L = () => ST[ctx.lang()] || ST.ar;
  const num = (n) => ctx.digits ? ctx.digits(n) : String(n);
  let suraOf = null, tot = null, tab = 'sura';
  async function render(body, args = {}) {
    const t = L(), core = ctx.core;
    const [plain, meta] = await Promise.all([ctx.plain(), ctx.meta()]);
    suraOf = suraOf || suraOfIndex(core);
    tot = tot || totals(core, suraOf);
    if (args.word) tab = 'word'; else if (args.sura) tab = 'sura';
    const name = (n) => ctx.lang() === 'ar' ? core.suras[n - 1].ar : core.suras[n - 1].tr;
    const ref = (i) => `${name(suraOf[i])} ${num(suraOf[i])}:${num(i - core.suras[suraOf[i] - 1].first + 1)}`;
    body.innerHTML = `<p class="p-lead">${esc(t.lead)}</p>
      <div class="st-all"><b>${esc(t.all)}</b> <span>${esc(num(tot.suras))} ${esc(t.suras)}</span><span>${esc(num(tot.verses))} ${esc(t.verses)}</span><span>${esc(num(tot.words))} ${esc(t.words)}</span><span>${esc(num(tot.letters))} ${esc(t.letters)}</span></div>
      <div class="seg st-tabs" role="tablist"><button type="button" role="tab" data-tab="sura" aria-selected="${tab === 'sura'}">${esc(t.tabSura)}</button><button type="button" role="tab" data-tab="word" aria-selected="${tab === 'word'}">${esc(t.tabWord)}</button></div>
      <div class="st-body"></div><p class="p-small">${esc(t.note)}</p>`;
    const box = body.querySelector('.st-body');
    const bars = (rows, max, fmt) => `<ul class="st-bars">${rows.map(r => `<li${r.go != null ? ` data-go="${r.go}" tabindex="0" role="button"` : ''}><span class="st-l">${esc(r.label)}</span><span class="st-b"><i style="width:${(100 * r.v / max).toFixed(1)}%"></i></span><b>${esc(fmt(r.v))}</b></li>`).join('')}</ul>`;
    const wire = () => box.querySelectorAll('[data-go]').forEach(el => { el.onclick = () => ctx.openVerse(+el.dataset.go); el.onkeydown = (ev) => { if (ev.key === 'Enter') ctx.openVerse(+el.dataset.go); }; });
    const drawSura = (n) => {
      const r = suraStats(core, plain, meta, n, suraOf), S = r.S, max = Math.max(...r.lens);
      const W = 300, H = 46, bw = W / r.lens.length;
      const spark = r.lens.map((v, k) => `<rect x="${(k * bw).toFixed(2)}" y="${(H - H * v / max).toFixed(2)}" width="${Math.max(0.6, bw - 0.4).toFixed(2)}" height="${(H * v / max).toFixed(2)}"/>`).join('');
      box.innerHTML = `<label class="p-row">${esc(t.pick)} <select id="stS">${core.suras.map(s => `<option value="${s.n}" ${s.n === n ? 'selected' : ''}>${s.n}. ${esc(name(s.n))}</option>`).join('')}</select></label>
        <dl class="k-stats st-grid">
          <div><dt>${esc(t.type)}</dt><dd>${esc(S.type === 'meccan' ? t.meccan : t.medinan)}</dd></div><div><dt>${esc(t.order)}</dt><dd>${esc(num(S.order))}</dd></div>
          <div><dt>${esc(t.ayas)}</dt><dd>${esc(num(S.ayas))}</dd></div><div><dt>${esc(t.nWords)}</dt><dd>${esc(num(r.words))}</dd></div>
          <div><dt>${esc(t.nLetters)}</dt><dd>${esc(num(r.letters))}</dd></div><div><dt>${esc(t.share)}</dt><dd>${esc(num((100 * r.words / tot.words).toFixed(2)))}٪</dd></div>
          <div><dt>${esc(t.pages)}</dt><dd>${esc(r.pages[0] === r.pages[1] ? num(r.pages[0]) : `${num(r.pages[0])}–${num(r.pages[1])}`)}</dd></div><div><dt>${esc(t.juz)}</dt><dd>${esc(r.juz[0] === r.juz[1] ? num(r.juz[0]) : `${num(r.juz[0])}–${num(r.juz[1])}`)}</dd></div></dl>
        <p class="p-row"><button type="button" class="mini" data-go="${r.longest.i}">${esc(t.longest)}: ${esc(ref(r.longest.i))} · ${esc(t.wordsN(num(r.longest.n)))}</button>
          <button type="button" class="mini" data-go="${r.shortest.i}">${esc(t.shortest)}: ${esc(ref(r.shortest.i))} · ${esc(t.wordsN(num(r.shortest.n)))}</button></p>
        <h3 class="p-sub">${esc(t.lens)}</h3><svg class="st-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(t.lens)}">${spark}</svg>
        <h3 class="p-sub">${esc(t.top)}</h3>${bars(r.top.map(([w, v]) => ({ label: w, v })), r.top.length ? r.top[0][1] : 1, num)}`;
      box.querySelector('#stS').onchange = (ev) => drawSura(+ev.target.value);
      wire();
    };
    const drawWord = (w0 = '', mode = 'word') => {
      box.innerHTML = `<form class="p-row st-wf"><input type="search" id="stW" dir="rtl" lang="ar" value="${esc(w0)}" placeholder="${esc(t.wordPh)}" maxlength="40"><button class="mini gold">${esc(t.count)}</button></form>
        <div class="chips"><label class="chip"><input type="radio" name="stm" value="word" ${mode === 'word' ? 'checked' : ''}> ${esc(t.modeWord)}</label><label class="chip"><input type="radio" name="stm" value="forms" ${mode === 'forms' ? 'checked' : ''}> ${esc(t.modeForms)}</label></div>
        <div class="st-res" aria-live="polite"></div>`;
      const go = () => {
        const w = box.querySelector('#stW').value.trim(), m = (box.querySelector('input[name=stm]:checked') || {}).value || 'word';
        const res = box.querySelector('.st-res');
        if (!w) { res.innerHTML = ''; return; }
        const r = wordStats(core, plain, w, m, suraOf);
        if (!r || !r.total) { res.innerHTML = `<p class="note">${esc(t.none)}</p>`; return; }
        const top = r.bySura.slice(0, 12);
        res.innerHTML = `<div class="st-big"><b>${esc(num(r.total))}</b> ${esc(t.occ)} · ${esc(num(r.verses))} ${esc(t.inVerses)} · ${esc(num(r.suras))} ${esc(t.inSuras)}</div>
          <p class="p-row"><span>${esc(num(r.meccan))} ${esc(t.mec)}</span> · <span>${esc(num(r.medinan))} ${esc(t.med)}</span></p>
          <p class="p-row"><button type="button" class="mini" data-go="${r.first}">${esc(t.first)}: ${esc(ref(r.first))}</button><button type="button" class="mini" data-go="${r.last}">${esc(t.last)}: ${esc(ref(r.last))}</button></p>
          <h3 class="p-sub">${esc(t.bySura)}</h3>${bars(top.map(([n, v]) => ({ label: name(n), v, go: core.suras[n - 1].first })), top[0][1], num)}
          <h3 class="p-sub">${esc(t.forms)}</h3><div class="chips st-forms">${r.forms.map(([f, v]) => `<span class="chip">${esc(f)} <small>${esc(num(v))}</small></span>`).join('')}</div>
          <p><button type="button" class="mini gold" id="stSearch">${esc(t.searchIt(w))}</button></p>`;
        wire();
        res.querySelector('#stSearch').onclick = () => ctx.search(w);
      };
      box.querySelector('form').onsubmit = (ev) => { ev.preventDefault(); go(); };
      box.querySelectorAll('input[name=stm]').forEach(x => x.onchange = go);
      if (w0) go();
    };
    body.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; body.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b)); tab === 'sura' ? drawSura(args.sura || 1) : drawWord(); });
    if (tab === 'word') drawWord(args.word || ''); else drawSura(args.sura || 1);
  }
  return { render };
}
