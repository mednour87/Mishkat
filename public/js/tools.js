// Practical requests typed in the search bar («متى رمضان», «خطة لختم القرآن في شهر», "hijri date")
// are answered by deterministic tools (calendar, khatma plan, links, settings), never by the AI:
// toolIntent() recognises them with fixed patterns and the page opens the tool's panel.
// A question about a ruling stays a question («ما حكم صيام يوم عرفة» → fatwa referral, not a tool):
// the page checks the guard first. Everything else stays a Quran search.
//
// returns null or { tool, args }

// Arabic-Indic digits become ASCII first: they lie inside the range of the diacritics removed next (U+0660–0669)
const N = (s) => String(s || '').normalize('NFKC').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا')
  .replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[؟?!.,،]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

export const TOOLS = ['khatma', 'hijri', 'links', 'settings', 'prayer', 'qibla', 'mosques', 'athkar'];

const EVENTS = [
  ['ramadan', /رمضان|ramadan|ramadhan/],
  ['fitr', /عيد\s+الفطر|eid al ?fitr|eid ul ?fitr/],
  ['adha', /عيد\s+الاضحي|العيد\s+الكبير|eid al ?adha|eid ul ?adha/],
  ['arafah', /عرفه|arafah|arafat/],
  ['ashura', /عاشوراء|عاشورا|ashura|ashoura/],
  ['dhulhijja', /عشر\s+ذي\s+الحجه|ذي\s+الحجه|dhul? ?hijj?a/],
  ['white', /الايام\s+البيض|ايام\s+البيض|white days/],
  ['eid', /العيد|\beid\b/],
];
const eventOf = (q) => { for (const [id, re] of EVENTS) if (re.test(q)) return id; return null; };

const RULES = [
  // Hijri calendar: today's date, conversion, «when is / how many days until» a remarkable day
  ['hijri', [
    /(التاريخ|اليوم|الشهر|السنه)\s+(ال)?هجري/, /(ما|كم)\s+(تاريخ|التاريخ)\s+(اليوم|الهجري)/, /^التقويم(\s+الهجري)?$/, /تحويل\s+(التاريخ|من\s+الهجري|من\s+الميلادي|الي\s+الهجري)/,
    /(كم|باقي|بقي)\s+(يوم|يوما|ايام)?\s*(علي|الي|حتي|ل)\s*(رمضان|العيد|عيد|عرفه|عاشوراء|ذي\s+الحجه)/,
    /(متي|موعد|تاريخ)\s+(رمضان|العيد|عيد\s+الفطر|عيد\s+الاضحي|يوم\s+عرفه|عرفه|عاشوراء|الايام\s+البيض|عشر\s+ذي\s+الحجه)/,
    /\bhijri\b/, /\bislamic (date|calendar)\b/, /\b(when|what date) is (ramadan|eid|arafah|ashura)/, /\bhow (many|long) (days )?(until|till|to|before) (ramadan|eid|arafah|ashura)/,
  ], (q) => ({ event: eventOf(q) })],
  // khatma plan / progress
  ['khatma', [
    /(خطه|برنامج|جدول)\s+(ل|في)?\s*(ختم|ختمه|الختمه|قراءه|حفظ)/, /(كيف|اريد\s+ان|ابي|ابغي)\s+(اختم|اكمل)\s+(ال)?(قران|مصحف)/, /^(ال)?ختمه$/,
    /كم\s+(بقي|باقي)\s+(لي\s+)?(علي\s+|حتي\s+|ل)?(الختم|ختم|اختم|الختمه)/, /ورد(ي)?\s+(ال)?يومي/,
    /\b(plan|schedule) (to|for) (finish|complete|read|reading) the (whole )?quran\b/, /\bkhatm(a|ah)?\b/, /\bhow much (is )?left to finish the quran\b/, /\bdaily (quran )?(reading|wird)\b/,
  ], (q) => {
    const m = q.match(/(\d+|[٠-٩]+)\s*(يوم|يوما|ايام|days?|اسبوع|اسابيع|weeks?|شهر|اشهر|شهور|months?)/) || q.match(/(شهر|اسبوع|month|week)/);
    if (!m) return {};
    const n = m[2] ? +String(m[1]).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) : 1, u = m[2] || m[1];
    return { days: /اسبوع|اسابيع|week/.test(u) ? n * 7 : /شهر|اشهر|شهور|month/.test(u) ? n * 30 : n };
  }],
  ['links', [/(روابط|مواقع)\s+(مفيده|اسلاميه|موثوقه)/, /\b(useful|islamic|trusted) (links|websites|sites)\b/], () => ({})],
  ['settings', [/^(الاعدادات|الاعدادات|التفضيلات|اعدادات)$/, /^(settings|preferences)$/], () => ({})],
  // practical tools of the next lot (their panels exist only once their data source is integrated)
  ['prayer', [/(كم\s+(بقي|باقي)|متي|وقت|مواقيت|اوقات|موعد)\s+(علي\s+)?(ال)?(صلاه|اذان|الفجر|الظهر|العصر|المغرب|العشاء)/, /(الصلاه)\s+(القادمه|التاليه|الجايه)/, /\b(next prayer|prayer times?|when is (fajr|dhuhr|zuhr|asr|maghrib|isha))\b/], () => ({})],
  ['qibla', [/(اتجاه|جهه|وين|اين)\s+(ال)?قبله/, /\bqiblah?\b/], () => ({})],
  ['mosques', [/(اقرب|قريب)\s+(ال)?(مسجد|مساجد|جامع)/, /\b(nearest|nearby|closest) (mosque|masjid)s?\b/], () => ({})],
];

// The search bar's router: the guard of the engine speaks first (a ruling, a personal case, a dream… is never
// a tool: «ما حكم صيام يوم عرفة» stays a question), then the tool patterns; null = an ordinary Quran search.
export function routeTool(query, { available = TOOLS, guard = () => null } = {}) {
  if (guard(query)) return null;
  return toolIntent(query, available);
}

export function toolIntent(query, available = TOOLS) {
  const q = N(query);
  if (!q || q.length > 80) return null;
  for (const [tool, res, args] of RULES) {
    if (!available.includes(tool)) continue;
    if (res.some(re => re.test(q))) return { tool, args: args(q) };
  }
  return null;
}
