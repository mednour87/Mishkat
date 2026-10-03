// Content of the tool panels: khatma plan, Hijri calendar, useful links, settings. Arabic + English.
// Religious content shown here is only: verses (Tanzil text, opened in the reader) and authentic
// hadiths of HadeethEnc shown verbatim with their grade and link. Titles and help texts are ours.
import { toHijri, toGregorian, formatHijri, upcoming, nextEvent, nextWhiteDays, MONTHS, REMARKABLE, MONTHLY, WEEKLY } from './hijri.js';
import { N_PAGES, todayPortion, pagesRead, countRead, markRead, unmarkRead, encodeRead, decodeRead, surasRead, streak, planToIcs, ymd, pageRange, pageOf } from './khatma.js';
import { exportPrefs, importPrefs, resetPrefs, DEFAULTS } from './prefs.js';

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const arDigits = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
// Arabic counted noun: 1 and 2 by the noun alone, 3–10 plural, 11–99 singular accusative, 100… singular
// («يوم واحد، يومان، ٧ أيام، ٣٠ يومًا، ١٠٠ يوم»). n: a number or Arabic-Indic digits.
export function arCount(n, [one, two, few, many, sing]) {
  const k = +String(n).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), r = k % 100, d = arDigits(n);
  if (k === 1) return one;
  if (k === 2) return two;
  if (r >= 3 && r <= 10) return `${d} ${few}`;
  if (r >= 11) return `${d} ${many}`;
  return `${d} ${sing}`;
}
const DAYS = ['يوم واحد', 'يومان', 'أيام', 'يومًا', 'يوم'], PAGES = ['صفحة واحدة', 'صفحتان', 'صفحات', 'صفحة', 'صفحة'], AYAS = ['آية واحدة', 'آيتان', 'آيات', 'آية', 'آية'];

export const S = {
  ar: {
    dock: 'الأدوات', khatma: 'الختمة', hijri: 'التقويم الهجري', links: 'روابط مفيدة', settings: 'الإعدادات', close: 'إغلاق',
    // khatma
    kIntro: 'خطة شخصية لختم القرآن: تُقسَّم صفحات المصحف (٦٠٤ صفحات) على الأيام التي تختارها وعلى أوقاتك، ويُعاد توزيع الباقي تلقائيًا إذا فاتك يوم.',
    kDays: 'المدة', kDaysN: (n) => arCount(n, DAYS), kCustom: 'عدد آخر من الأيام', kStart: 'تاريخ البدء', kMoments: 'أوقات القراءة',
    kMoment: { fajr: 'بعد الفجر', morning: 'في الصباح', noon: 'بعد الظهر', asr: 'بعد العصر', maghrib: 'بعد المغرب', night: 'قبل النوم', other: 'وقت آخر' },
    kAddMoment: '+ وقت آخر', kRemove: 'حذف', kBegin: 'ابدأ الختمة', kDay: (k, n) => `اليوم ${k} من ${n}`,
    kToday: 'وِرد اليوم', kPages: (a, b) => a === b ? `صفحة ${a}` : `الصفحات ${a}–${b}`, kRead: 'اقرأ', kDone: '✓ قرأته', kUndo: 'تراجع',
    kProgress: (p, n) => `${p} من ${n} صفحة`, kBehind: (n) => `فاتك ${arCount(n, PAGES)}: وُزِّع الباقي على الأيام المتبقية.`, kFinished: 'أتممت الختمة — تقبّل الله منك. يمكنك بدء ختمة جديدة.',
    kStats: 'إحصاءات', kVerses: 'آيات مقروءة', kWords: 'كلمات مقروءة', kSuras: 'سور أتممتها', kStreak: 'أيام متتالية', kSurasList: 'السور المكتملة (خضراء في المجرّة):',
    kIcs: 'تذكيرات في التقويم (.ics)', kIcsHelp: 'ملف تفتحه في تقويم هاتفك أو حاسوبك: تذكير في كل وقت من أوقاتك بوِرد ذلك اليوم.',
    kMarkHere: (r) => `علّم حتى الآية المفتوحة (${r}) كمقروءة`, kMarkHereQ: (r, n) => `تعليم كل الآيات من أول المصحف حتى ${r} (${arCount(n, AYAS)}) كمقروءة؟`, kStop: 'إلغاء الخطة', kStopQ: 'إلغاء الخطة؟ تبقى الآيات المقروءة محفوظة.', kGalaxy: 'أظهر السور المكتملة في المجرّة',
    kAutoNote: 'تُحسب الآية مقروءة عند الاستماع إلى تلاوتها كاملة في المصحف، أو عند الضغط على «قرأته».',
    kIcsTitle: 'مشكاة — وِرد الختمة', kIcsPart: (p) => `${p.moment.label}: ${p.from === p.to ? 'صفحة ' + p.from : 'الصفحات ' + p.from + '–' + p.to} (اليوم ${p.day})`,
    // hijri
    hToday: 'اليوم', hConv: 'تحويل التاريخ', hToH: 'ميلادي ← هجري', hToG: 'هجري ← ميلادي', hDay: 'اليوم', hMonth: 'الشهر', hYear: 'السنة', hConvert: 'حوّل',
    hNoDay: 'هذا اليوم غير موجود في تقويم أم القرى.', hUpcoming: 'أيام فاضلة قادمة', hIn: (n) => n === 0 ? 'اليوم' : n === 1 ? 'غدًا' : n === 2 ? 'بعد يومين' : `بعد ${arCount(n, DAYS)}`, hOngoing: 'جارٍ الآن',
    hEvidence: 'الدليل', hVerses: 'من القرآن الكريم', hHadith: 'من السنة النبوية (HadeethEnc)', hGrade: 'الدرجة', hOpen: 'افتح الحديث في موسوعة الأحاديث النبوية',
    hNoEn: 'هذا الحديث غير متوفر بالإنجليزية في الموسوعة؛ نعرضه بالعربية.',
    hNote: 'التاريخ محسوب بتقويم أم القرى في متصفحك. بداية الشهر تتبع رؤية الهلال التي تعلنها الجهات الرسمية في بلدك؛ يمكنك ضبط الفرق (± يومان) في الإعدادات.',
    hDisputed: 'لا تُدرج المناسبات المختلف في تاريخها أو في مشروعية الاحتفال بها.', hWhite: 'الأيام البيض القادمة', hWeekly: 'كل أسبوع',
    // links
    lIntro: 'مواقع من المرجعية العلمية للتحدي ومن مصادر مشكاة:',
    // settings
    sHijri: 'فرق التقويم الهجري (أيام)', sHijriHelp: 'إذا بدأ الشهر في بلدك قبل أم القرى أو بعده.', sAuto: 'احسب الآية مقروءة عند سماع تلاوتها كاملة',
    sGalaxy: 'أظهر السور المكتملة في المجرّة', sData: 'بياناتك', sDataHelp: 'تُحفظ الإعدادات والختمة في متصفحك فقط، ولا تُرسل إلى أي خادم.',
    sExport: 'نزّل نسخة من بياناتك', sImport: 'استرجع نسخة', sReset: 'امسح كل بياناتك', sResetQ: 'مسح الإعدادات والختمة والآيات المقروءة من هذا المتصفح؟', sImported: 'تم استرجاع البيانات.', sBadFile: 'ملف غير صالح.',
    langNote: 'اللغة والوضع الفاتح/الداكن من أعلى الصفحة.',
  },
  en: {
    dock: 'Tools', khatma: 'Khatma', hijri: 'Hijri calendar', links: 'Useful links', settings: 'Settings', close: 'Close',
    kIntro: 'A personal plan to read the whole Quran: the 604 pages of the Mushaf are spread over the days you choose and over your reading moments; if you miss a day, the rest is spread again automatically.',
    kDays: 'Duration', kDaysN: (n) => `${n} days`, kCustom: 'Other number of days', kStart: 'Start date', kMoments: 'Reading moments',
    kMoment: { fajr: 'After Fajr', morning: 'Morning', noon: 'After Dhuhr', asr: 'After Asr', maghrib: 'After Maghrib', night: 'Before sleeping', other: 'Other time' },
    kAddMoment: '+ another moment', kRemove: 'Remove', kBegin: 'Start the khatma', kDay: (k, n) => `Day ${k} of ${n}`,
    kToday: 'Today’s portion', kPages: (a, b) => a === b ? `Page ${a}` : `Pages ${a}–${b}`, kRead: 'Read', kDone: '✓ Done', kUndo: 'Undo',
    kProgress: (p, n) => `${p} of ${n} pages`, kBehind: (n) => `${n} ${+n === 1 ? 'page' : 'pages'} behind: the rest is spread over the days left.`, kFinished: 'Khatma completed — may Allah accept it from you. You can start a new one.',
    kStats: 'Statistics', kVerses: 'Verses read', kWords: 'Words read', kSuras: 'Surahs completed', kStreak: 'Days in a row', kSurasList: 'Completed surahs (green on the galaxy):',
    kIcs: 'Calendar reminders (.ics)', kIcsHelp: 'A file to open in your phone or computer calendar: a reminder at each of your moments with that day’s portion.',
    kMarkHere: (r) => `Mark up to the open verse (${r}) as read`, kMarkHereQ: (r, n) => `Mark every verse from the start of the Mushaf up to ${r} (${n} verses) as read?`, kStop: 'Cancel the plan', kStopQ: 'Cancel the plan? The verses read stay saved.', kGalaxy: 'Show completed surahs on the galaxy',
    kAutoNote: 'A verse counts as read when you listen to its full recitation in the Mushaf, or when you press “Done”.',
    kIcsTitle: 'Mishkat — khatma portion', kIcsPart: (p) => `${p.moment.label}: ${p.from === p.to ? 'page ' + p.from : 'pages ' + p.from + '–' + p.to} (day ${p.day})`,
    hToday: 'Today', hConv: 'Convert a date', hToH: 'Gregorian → Hijri', hToG: 'Hijri → Gregorian', hDay: 'Day', hMonth: 'Month', hYear: 'Year', hConvert: 'Convert',
    hNoDay: 'This day does not exist in the Umm al-Qura calendar.', hUpcoming: 'Coming virtuous days', hIn: (n) => n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`, hOngoing: 'now',
    hEvidence: 'Evidence', hVerses: 'From the Quran', hHadith: 'From the Sunnah (HadeethEnc)', hGrade: 'Grade', hOpen: 'Open the hadith in the Encyclopedia of Translated Hadiths',
    hNoEn: 'This hadith is not available in English in the encyclopedia; shown in Arabic.',
    hNote: 'Dates are computed with the Umm al-Qura calendar of your browser. A month begins with the moon sighting announced by the authorities of your country; you can set the difference (± 2 days) in Settings.',
    hDisputed: 'Occasions whose date or celebration is disputed are not listed.', hWhite: 'Next white days', hWeekly: 'Every week',
    lIntro: 'Sites from the challenge’s scholarly reference pack and from Mishkat’s sources:',
    sHijri: 'Hijri calendar difference (days)', sHijriHelp: 'If the month starts earlier or later in your country than in Umm al-Qura.', sAuto: 'Count a verse as read when its recitation is heard to the end',
    sGalaxy: 'Show completed surahs on the galaxy', sData: 'Your data', sDataHelp: 'Settings and khatma are kept in this browser only, never sent to a server.',
    sExport: 'Download a copy of your data', sImport: 'Restore a copy', sReset: 'Erase all your data', sResetQ: 'Erase settings, khatma and read verses from this browser?', sImported: 'Data restored.', sBadFile: 'Invalid file.',
    langNote: 'Language and light/dark mode are at the top of the page.',
  },
};

// reviewed list (challenge reference pack + sources of Mishkat); labels are names of the sites
export const LINKS = [
  { cat: { ar: 'القرآن والتفسير', en: 'Quran and tafsir' }, items: [
    ['https://quranenc.com', 'موسوعة القرآن الكريم المترجمة', 'QuranEnc — translated Quran encyclopedia'],
    ['https://quranpedia.net', 'قرآنبيديا', 'Quranpedia'],
    ['https://dorar.net/tafseer', 'موسوعة التفسير — الدرر السنية', 'Tafsir encyclopedia — Dorar'],
    ['https://tanzil.net', 'تنزيل — نص المصحف', 'Tanzil — Quran text'],
    ['https://qurancomplex.gov.sa', 'مجمع الملك فهد لطباعة المصحف الشريف', 'King Fahd Complex for the Printing of the Holy Quran'] ] },
  { cat: { ar: 'الحديث', en: 'Hadith' }, items: [
    ['https://dorar.net/hadith', 'الموسوعة الحديثية — الدرر السنية', 'Hadith encyclopedia — Dorar'],
    ['https://hadeethenc.com', 'موسوعة الأحاديث النبوية المترجمة', 'HadeethEnc — translated hadith encyclopedia'],
    ['https://shamela.ws', 'المكتبة الشاملة', 'Al-Maktaba al-Shamela'] ] },
  { cat: { ar: 'الفتوى', en: 'Fatwa' }, items: [
    ['https://binbaz.org.sa', 'الموقع الرسمي لسماحة الشيخ ابن باز', 'Official site of Sheikh Ibn Baz'],
    ['https://alifta.gov.sa', 'الرئاسة العامة للبحوث العلمية والإفتاء', 'General Presidency of Scholarly Research and Ifta'],
    ['https://dorar.net/feqhia', 'الموسوعة الفقهية — الدرر السنية', 'Fiqh encyclopedia — Dorar'] ] },
  { cat: { ar: 'الرد على الشبهات والدعوة', en: 'Answering objections and da‘wah' }, items: [
    ['https://bayenat.net/ar', 'بيّنات: أسئلة وأجوبة عن الإسلام', 'Bayyinat: questions and answers about Islam'],
    ['https://dawa.center', 'المستودع الدعوي الرقمي', 'Digital Da‘wah Repository'] ] },
];

const PRESETS = [7, 10, 15, 20, 30, 40, 60];
const MOMENT_IDS = ['fajr', 'morning', 'noon', 'asr', 'maghrib', 'night', 'other'];

// ctx: { lang(), core, meta(): Promise<{pages,juz}>, prefs, save(), openVerse(idx), readerVerse(): idx|null,
//        hadiths(ids, lang): Promise<items>, onReadChange(), status(msg) }
export function createToolPanels(ctx) {
  const L = () => S[ctx.lang()] || S.ar;
  const ar = () => ctx.lang() === 'ar';
  const num = (n) => ar() ? String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n);
  const dateStr = (d) => d.toLocaleDateString(ar() ? 'ar-u-nu-arab-ca-gregory' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const refOf = (i) => { const s = ctx.core.suras.findLast(x => x.first <= i); return { s, a: i - s.first + 1, label: `${ar() ? s.ar : s.tr} ${s.n}:${i - s.first + 1}` }; };
  const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  let wordsPerVerse = null;
  const wordCount = (bits) => {
    // the basmala Tanzil writes before verse 1 of each surah (but al-Fatiha and at-Tawba) is not counted:
    // the whole Quran then has 77,433 words, as in the galaxy
    if (!wordsPerVerse) {
      const firsts = new Set(ctx.core.suras.filter(s => s.n !== 1 && s.n !== 9).map(s => s.first));
      wordsPerVerse = ctx.core.verses.map((v, i) => v.split(/\s+/).filter(w => /[ء-يٱ]/.test(w)).length - (firsts.has(i) ? 4 : 0));
    }
    let n = 0; for (let i = 0; i < wordsPerVerse.length; i++) if ((bits[i >> 3] >> (i & 7)) & 1) n += wordsPerVerse[i];
    return n;
  };

  // ------------------------------------------------------------------ khatma
  async function khatma(body, args = {}) {
    const t = L(), P = ctx.prefs, meta = await ctx.meta(), pages = meta.pages;
    const bits = decodeRead(P.read);
    const kp = P.khatma;
    if (!kp.active) {
      const days = args.days || kp.days || 30;
      const moments = kp.moments && kp.moments.length ? kp.moments : DEFAULTS.khatma.moments;
      body.innerHTML = `<p class="p-lead">${esc(t.kIntro)}</p>
        <fieldset class="p-field"><legend>${esc(t.kDays)}</legend><div class="chips">${PRESETS.map(n => `<label class="chip"><input type="radio" name="kd" value="${n}" ${n === days ? 'checked' : ''}> ${esc(t.kDaysN(num(n)))}</label>`).join('')}</div>
          <label class="p-row">${esc(t.kCustom)} <input type="number" id="kdN" min="1" max="1000" value="${PRESETS.includes(days) ? '' : days}" inputmode="numeric"></label></fieldset>
        <label class="p-row">${esc(t.kStart)} <input type="date" id="kStart" value="${ymd(new Date())}"></label>
        <fieldset class="p-field"><legend>${esc(t.kMoments)}</legend><div id="kMoms"></div><button type="button" class="mini" id="kAdd">${esc(t.kAddMoment)}</button></fieldset>
        <button type="button" class="btn gold" id="kGo" autofocus>${esc(t.kBegin)}</button>`;
      const ms = moments.map(m => ({ ...m }));
      const drawMoms = () => {
        body.querySelector('#kMoms').innerHTML = ms.map((m, j) => `<div class="p-row mom"><select data-j="${j}" class="kmId">${MOMENT_IDS.map(id => `<option value="${id}" ${id === m.id ? 'selected' : ''}>${esc(t.kMoment[id])}</option>`).join('')}</select>
          <input type="time" data-j="${j}" class="kmT" value="${esc(m.time || '')}">${ms.length > 1 ? `<button type="button" class="mini kmX" data-j="${j}">${esc(t.kRemove)}</button>` : ''}</div>`).join('');
        body.querySelectorAll('.kmId').forEach(s => s.onchange = () => { ms[+s.dataset.j].id = s.value; });
        body.querySelectorAll('.kmT').forEach(s => s.onchange = () => { ms[+s.dataset.j].time = s.value; });
        body.querySelectorAll('.kmX').forEach(b => b.onclick = () => { ms.splice(+b.dataset.j, 1); drawMoms(); });
        body.querySelector('#kAdd').hidden = ms.length >= 5;
      };
      drawMoms();
      body.querySelector('#kAdd').onclick = () => { ms.push({ id: 'other', time: '' }); drawMoms(); };
      body.querySelector('#kGo').onclick = () => {
        const custom = +body.querySelector('#kdN').value;
        const d = custom >= 1 ? Math.min(1000, Math.round(custom)) : +(body.querySelector('input[name=kd]:checked') || {}).value || 30;
        P.khatma = { active: true, start: body.querySelector('#kStart').value || ymd(new Date()), days: d, moments: ms };
        ctx.save(); khatma(body); ctx.onReadChange();
      };
      return;
    }
    const plan = { ...kp, moments: kp.moments.map(m => ({ ...m, label: t.kMoment[m.id] || m.id })) };
    const tp = todayPortion(plan, bits, pages);
    const done = pagesRead(bits, pages), nRead = countRead(bits);
    const greens = surasRead(bits, ctx.core.suras);
    const here = ctx.readerVerse();
    let h = `<div class="k-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${N_PAGES}" aria-valuenow="${done}"><span style="width:${(100 * done / N_PAGES).toFixed(1)}%"></span></div>
      <p class="p-row k-sum"><b>${esc(t.kProgress(num(done), num(N_PAGES)))}</b> · ${esc(t.kDay(num(Math.max(1, tp.day)), num(kp.days)))}</p>`;
    if (tp.finished) h += `<p class="k-ok">${esc(t.kFinished)}</p>`;
    else {
      if (tp.behind > 0) h += `<p class="note">${esc(t.kBehind(num(tp.behind)))}</p>`;
      h += `<h3 class="p-sub">${esc(t.kToday)}</h3><ol class="k-parts">${tp.parts.map((p, j) => {
        const r = refOf(p.verses[0]), all = countRead(bits, p.verses[0], p.verses[1]) === p.verses[1] - p.verses[0] + 1;
        return `<li class="${all ? 'done' : ''}"><div><b>${esc(p.moment.label)}</b>${p.moment.time ? ` <small>${esc(num(p.moment.time))}</small>` : ''}</div>
          <div>${esc(t.kPages(num(p.from), num(p.to)))} <small>(${esc(r.label)})</small></div>
          <div class="k-btns"><button type="button" class="mini" data-go="${p.verses[0]}">${esc(t.kRead)}</button>
          <button type="button" class="mini ${all ? '' : 'gold'}" data-mark="${j}">${esc(all ? t.kUndo : t.kDone)}</button></div></li>`;
      }).join('')}</ol><p class="note">${esc(t.kAutoNote)}</p>`;
    }
    if (here != null) h += `<button type="button" class="mini" id="kHere">${esc(t.kMarkHere(refOf(here).label))}</button>`;
    h += `<h3 class="p-sub">${esc(t.kStats)}</h3><dl class="k-stats">
      <div><dt>${esc(t.kVerses)}</dt><dd>${esc(num(nRead))} / ${esc(num(6236))}</dd></div>
      <div><dt>${esc(t.kWords)}</dt><dd>${esc(num(wordCount(bits)))}</dd></div>
      <div><dt>${esc(t.kSuras)}</dt><dd>${esc(num(greens.length))} / ${esc(num(114))}</dd></div>
      <div><dt>${esc(t.kStreak)}</dt><dd>${esc(num(streak(P.log || {})))}</dd></div></dl>`;
    if (greens.length) h += `<p class="p-small">${esc(t.kSurasList)}</p><div class="chips">${greens.map(n => { const s = ctx.core.suras[n - 1]; return `<button type="button" class="chip green" data-go="${s.first}">${esc(ar() ? s.ar : s.tr)}</button>`; }).join('')}</div>`;
    h += `<label class="p-row"><input type="checkbox" id="kGal" ${P.showReadOnGalaxy ? 'checked' : ''}> ${esc(t.kGalaxy)}</label>
      <h3 class="p-sub">${esc(t.kIcs)}</h3><p class="p-small">${esc(t.kIcsHelp)}</p><button type="button" class="mini gold" id="kIcs">⤓ ${esc(t.kIcs)}</button>
      <p><button type="button" class="mini danger" id="kStop">${esc(t.kStop)}</button></p>`;
    body.innerHTML = h;
    const mark = (a, b, on) => { const B = decodeRead(P.read); const before = countRead(B); (on ? markRead : unmarkRead)(B, a, b); P.read = encodeRead(B); const k = ymd(new Date()); P.log = P.log || {}; P.log[k] = Math.max(0, (P.log[k] || 0) + countRead(B) - before); ctx.save(); ctx.onReadChange(); khatma(body); };
    body.querySelectorAll('[data-go]').forEach(b => b.onclick = () => ctx.openVerse(+b.dataset.go));
    body.querySelectorAll('[data-mark]').forEach(b => b.onclick = () => { const p = tp.parts[+b.dataset.mark]; const all = countRead(bits, p.verses[0], p.verses[1]) === p.verses[1] - p.verses[0] + 1; mark(p.verses[0], p.verses[1], !all); });
    const kh = body.querySelector('#kHere'); if (kh) kh.onclick = () => { if (confirm(t.kMarkHereQ(refOf(here).label, num(here + 1)))) mark(0, here, true); };
    body.querySelector('#kGal').onchange = (ev) => { P.showReadOnGalaxy = ev.target.checked; ctx.save(); ctx.onReadChange(); };
    body.querySelector('#kIcs').onclick = () => download('mishkat-khatma.ics', planToIcs(plan, pages, { title: t.kIcsTitle, describe: (p) => t.kIcsPart(p), url: location.origin + location.pathname }), 'text/calendar');
    body.querySelector('#kStop').onclick = () => { if (confirm(t.kStopQ)) { P.khatma = { ...P.khatma, active: false }; ctx.save(); ctx.onReadChange(); khatma(body); } };
  }

  // ------------------------------------------------------------------ hijri
  async function hijri(body, args = {}) {
    const t = L(), adj = +ctx.prefs.hijriAdjust || 0, now = new Date(), lg = ctx.lang();
    const h = toHijri(now, adj), list = upcoming(now, adj, 8), white = nextWhiteDays(now, adj);
    const pick = args.event ? nextEvent(args.event, now, adj) : null;
    const evItem = (e) => `<li class="h-ev ${pick && pick.id === e.id ? 'hit' : ''}" data-ev="${e.id}"><details ${pick && pick.id === e.id ? 'open' : ''}>
        <summary><b>${esc(e[lg] || e.ar)}</b> <span class="h-when">${esc(e.ongoing ? t.hOngoing : t.hIn(e.inDays))}</span>
        <small>${esc(formatHijri({ y: e.hy, m: e.m, d: e.d }, lg))} · ${esc(dateStr(e.start))}</small></summary><div class="h-evid"></div></details></li>`;
    body.innerHTML = `<div class="h-today"><div class="h-big">${esc(formatHijri(h, lg))}</div><div class="p-small">${esc(dateStr(now))}</div></div>
      <h3 class="p-sub">${esc(t.hUpcoming)}</h3><ol class="h-list">${list.map(evItem).join('')}
        ${white ? `<li class="h-ev" data-ev="white"><details><summary><b>${esc(MONTHLY[lg] || MONTHLY.ar)}</b> <span class="h-when">${esc(t.hIn(white.inDays))}</span> <small>${esc(dateStr(white.start))}</small></summary><div class="h-evid"></div></details></li>` : ''}
        <li class="h-ev" data-ev="monthu"><details><summary><b>${esc(WEEKLY[lg] || WEEKLY.ar)}</b> <span class="h-when">${esc(t.hWeekly)}</span></summary><div class="h-evid"></div></details></li></ol>
      <p class="p-small">${esc(t.hNote)} ${esc(t.hDisputed)}</p>
      <h3 class="p-sub">${esc(t.hConv)}</h3>
      <div class="p-row"><b>${esc(t.hToH)}</b> <input type="date" id="hG" value="${ymd(now)}"> <output id="hGo"></output></div>
      <div class="p-row"><b>${esc(t.hToG)}</b> <input type="number" id="hD" min="1" max="30" value="${h.d}" aria-label="${esc(t.hDay)}">
        <select id="hM" aria-label="${esc(t.hMonth)}">${MONTHS[lg === 'en' ? 'en' : 'ar'].map((m, k) => `<option value="${k + 1}" ${k + 1 === h.m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
        <input type="number" id="hY" min="1300" max="1600" value="${h.y}" aria-label="${esc(t.hYear)}"> <output id="hHo"></output></div>`;
    const g2h = () => { const v = body.querySelector('#hG').value; if (!v) return; const [y, m, d] = v.split('-').map(Number); body.querySelector('#hGo').textContent = formatHijri(toHijri(new Date(y, m - 1, d), adj), lg); };
    const h2g = () => { const g = toGregorian(+body.querySelector('#hY').value, +body.querySelector('#hM').value, +body.querySelector('#hD').value, adj); body.querySelector('#hHo').textContent = g ? dateStr(g) : t.hNoDay; };
    ['#hG'].forEach(s => body.querySelector(s).oninput = g2h);
    ['#hD', '#hM', '#hY'].forEach(s => body.querySelector(s).oninput = h2g);
    g2h(); h2g();
    // the evidence of a day loads when it is opened (hadiths verbatim, from the local HadeethEnc files)
    const evidence = async (li) => {
      const box = li.querySelector('.h-evid'); if (!box || box.dataset.done) return;
      box.dataset.done = '1';
      const id = li.dataset.ev, ev = REMARKABLE.find(e => e.id === id) || (id === 'white' ? MONTHLY : id === 'monthu' ? WEEKLY : null);
      if (!ev) return;
      let out = '';
      if (ev.refs && ev.refs.length) out += `<p class="p-small">${esc(t.hVerses)}:</p><div class="chips">${ev.refs.map(r => { const [s, a] = r.split(':').map(Number); const i = ctx.core.suras[s - 1].first + a - 1; return `<button type="button" class="chip" data-go="${i}">${esc(refOf(i).label)}</button>`; }).join('')}</div>`;
      if (ev.had && ev.had.length) {
        let items = await ctx.hadiths(ev.had, lg).catch(() => []), fallback = false;
        if (lg !== 'ar' && items.length < ev.had.length) { const arItems = await ctx.hadiths(ev.had.filter(x => !items.some(y => y.id === x)), 'ar').catch(() => []); if (arItems.length) { fallback = true; items = items.concat(arItems.map(x => ({ ...x, _ar: true }))); } }
        if (items.length) out += `<p class="p-small">${esc(t.hHadith)}:</p>${fallback ? `<p class="p-small">${esc(t.hNoEn)}</p>` : ''}<ol class="hlist">${items.map(x => `<li dir="${x._ar || lg === 'ar' ? 'rtl' : 'ltr'}"><div class="h-text">${esc(x.text)}</div>
          <div class="h-meta">${x.by ? `<span>${esc(x.by)}</span>` : ''}${x.grade ? `<span class="h-grade"><small>${esc(t.hGrade)}:</small> <b>${esc(x.grade)}</b></span>` : ''}</div>
          <a class="mini" href="https://hadeethenc.com/${x._ar ? 'ar' : lg}/browse/hadith/${encodeURIComponent(x.id)}" target="_blank" rel="noopener">${esc(t.hOpen)}</a></li>`).join('')}</ol>`;
      }
      box.innerHTML = out;
      box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => ctx.openVerse(+b.dataset.go));
    };
    body.querySelectorAll('.h-ev details').forEach(d => d.addEventListener('toggle', () => { if (d.open) evidence(d.closest('.h-ev')); }));
    const hit = body.querySelector('.h-ev.hit'); if (hit) { evidence(hit); setTimeout(() => hit.scrollIntoView({ block: 'nearest' }), 320); }
  }

  // ------------------------------------------------------------------ links
  function links(body) {
    const t = L(), lg = ctx.lang();
    body.innerHTML = `<p class="p-lead">${esc(t.lIntro)}</p>${LINKS.map(c => `<h3 class="p-sub">${esc(c.cat[lg] || c.cat.ar)}</h3><ul class="p-links">${c.items.map(([u, a, e]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(lg === 'ar' ? a : e)}</a> <small dir="ltr">${esc(u.replace(/^https:\/\//, ''))}</small></li>`).join('')}</ul>`).join('')}`;
  }

  // ------------------------------------------------------------------ settings
  function settings(body) {
    const t = L(), P = ctx.prefs;
    body.innerHTML = `<label class="p-row">${esc(t.sHijri)} <select id="sHj">${[-2, -1, 0, 1, 2].map(n => `<option value="${n}" ${n === (+P.hijriAdjust || 0) ? 'selected' : ''}>${n > 0 ? '+' : ''}${n}</option>`).join('')}</select></label>
      <p class="p-small">${esc(t.sHijriHelp)}</p>
      <label class="p-row"><input type="checkbox" id="sAuto" ${P.autoMark ? 'checked' : ''}> ${esc(t.sAuto)}</label>
      <label class="p-row"><input type="checkbox" id="sGal" ${P.showReadOnGalaxy ? 'checked' : ''}> ${esc(t.sGalaxy)}</label>
      <p class="p-small">${esc(t.langNote)}</p>
      <h3 class="p-sub">${esc(t.sData)}</h3><p class="p-small">${esc(t.sDataHelp)}</p>
      <div class="k-btns"><button type="button" class="mini" id="sExp">⤓ ${esc(t.sExport)}</button>
      <label class="mini file">${esc(t.sImport)}<input type="file" id="sImp" accept="application/json,.json" hidden></label>
      <button type="button" class="mini danger" id="sRst">${esc(t.sReset)}</button></div><p id="sMsg" class="p-small" aria-live="polite"></p>`;
    body.querySelector('#sHj').onchange = (ev) => { P.hijriAdjust = +ev.target.value; ctx.save(); };
    body.querySelector('#sAuto').onchange = (ev) => { P.autoMark = ev.target.checked; ctx.save(); };
    body.querySelector('#sGal').onchange = (ev) => { P.showReadOnGalaxy = ev.target.checked; ctx.save(); ctx.onReadChange(); };
    body.querySelector('#sExp').onclick = () => download('mishkat-data.json', exportPrefs(P), 'application/json');
    body.querySelector('#sImp').onchange = async (ev) => {
      const f = ev.target.files && ev.target.files[0]; if (!f) return;
      try { ctx.replace(importPrefs(await f.text())); body.querySelector('#sMsg').textContent = t.sImported; ctx.onReadChange(); }
      catch (e) { body.querySelector('#sMsg').textContent = t.sBadFile; }
    };
    body.querySelector('#sRst').onclick = () => { if (confirm(t.sResetQ)) { ctx.replace(resetPrefs()); ctx.onReadChange(); settings(body); } };
  }

  return { khatma, hijri, links, settings };
}
