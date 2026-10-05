// Content of the tool panels: khatma plan, Hijri calendar, useful links, settings. Arabic + English.
// Religious content shown here is only: verses (Tanzil text, opened in the reader) and authentic
// hadiths of HadeethEnc shown verbatim with their grade and link. Titles and help texts are ours.
import { toHijri, toGregorian, formatHijri, upcoming, nextEvent, nextWhiteDays, MONTHS, REMARKABLE, MONTHLY, WEEKLY } from './hijri.js';
import { N_PAGES, todayPortion, pagesRead, countRead, markRead, unmarkRead, encodeRead, decodeRead, surasRead, streak, planToIcs, ymd, pageRange, pageOf, planOf, planUnits, planSuras, planTotal, planDays, todayPortion2, planToIcs2, suggestPlan } from './khatma.js';
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
    kMarkHere: (r) => `علّم حتى الآية المفتوحة (${r}) كمقروءة`, kMarkHereQ: (r, n) => `تعليم كل الآيات من أول المصحف حتى ${r} (${arCount(n, AYAS)}) كمقروءة؟`, kStop: 'إلغاء الخطة', kStopQ: 'إلغاء الخطة؟ تبقى الآيات المقروءة محفوظة.', sWelcome: 'تحية صوتية قصيرة عند الدخول (صوت المتصفح)', kGalaxy: 'أظهر السور المكتملة في المجرّة', kMap: 'خريطة الختمة في المشكاة (السور المقروءة مضيئة)',
    kAutoNote: 'تُحسب الآية مقروءة عند الاستماع إلى تلاوتها كاملة، أو عند قراءتها بالتمرير في المصحف (تبقى عند سطر القراءة وقتًا كافيًا ثم تتجاوزها)، أو عند الضغط على «قرأته». يمكن تغيير ذلك في الإعدادات.',
    kIcsTitle: 'مشكاة — وِرد الختمة', kIcsPart: (p) => `${p.moment.label}: ${p.from === p.to ? 'صفحة ' + p.from : 'الصفحات ' + p.from + '–' + p.to} (اليوم ${p.day})`,
    // hijri
    hToday: 'اليوم', hConv: 'تحويل التاريخ', hToH: 'ميلادي ← هجري', hToG: 'هجري ← ميلادي', hDay: 'اليوم', hMonth: 'الشهر', hYear: 'السنة', hConvert: 'حوّل',
    hNoDay: 'هذا اليوم غير موجود في تقويم أم القرى.', hUpcoming: 'أيام فاضلة قادمة', hIn: (n) => n === 0 ? 'اليوم' : n === 1 ? 'غدًا' : n === 2 ? 'بعد يومين' : `بعد ${arCount(n, DAYS)}`, hOngoing: 'جارٍ الآن',
    hEvidence: 'الدليل', hVerses: 'من القرآن الكريم', hHadith: 'من السنة النبوية (HadeethEnc)', hGrade: 'الدرجة', hOpen: 'افتح الحديث في موسوعة الأحاديث النبوية',
    hNoEn: 'هذا الحديث غير متوفر بالإنجليزية في الموسوعة؛ نعرضه بالعربية.',
    hNote: 'التاريخ محسوب بتقويم أم القرى في متصفحك. بداية الشهر تتبع رؤية الهلال التي تعلنها الجهات الرسمية في بلدك.',
    hAdj: 'بداية الشهر في بلدك', hAdjHelp: 'إن بدأ الشهر عندكم قبل أم القرى أو بعده، اضبط الفرق هنا: يتغيّر التاريخ والتحويل والأيام القادمة معًا.',
    hAdjN: (n) => n === 0 ? 'كما في أم القرى' : n === 1 ? 'بعده بيوم' : n === 2 ? 'بعده بيومين' : n === -1 ? 'قبله بيوم' : 'قبله بيومين',
    hGreg: 'التاريخ الميلادي', hHij: 'التاريخ الهجري', hConvHelp: 'اختر تاريخًا في أحد الجانبين، فيظهر ما يقابله في الجانب الآخر.',
    hDisputed: 'لا تُدرج المناسبات المختلف في تاريخها أو في مشروعية الاحتفال بها.', hWhite: 'الأيام البيض القادمة', hWeekly: 'كل أسبوع',
    // links
    lIntro: 'مواقع من المرجعية العلمية للتحدي ومن مصادر مشكاة:',
    // settings
    sHijri: 'فرق التقويم الهجري (أيام)', sHijriHelp: 'إذا بدأ الشهر في بلدك قبل أم القرى أو بعده.', sAuto: 'احسب الآية مقروءة عند سماع تلاوتها كاملة',
    sGalaxy: 'أظهر السور المكتملة في المجرّة', sData: 'بياناتك', sDataHelp: 'تُحفظ الإعدادات والختمة في متصفحك فقط، ولا تُرسل إلى أي خادم.',
    sExport: 'نزّل نسخة من بياناتك', sImport: 'استرجع نسخة', sReset: 'امسح كل بياناتك', sResetQ: 'مسح الإعدادات والختمة والآيات المقروءة من هذا المتصفح؟', sImported: 'تم استرجاع البيانات.', sBadFile: 'ملف غير صالح.',
    sDisplay: 'العرض', sLang: 'اللغة', sTheme: 'المظهر', sDark: 'داكن', sLight: 'فاتح', sNames: 'أسماء السور على المجرّة', sRotate: 'دوران المجرّة تلقائيًا',
    sReading: 'القراءة والتلاوة', sSpeed: 'سرعة التلاوة', sFont: 'حجم خط المصحف', sSmaller: 'أصغر', sLarger: 'أكبر',
    sScroll: 'احسب الآية مقروءة عند قراءتها بالتمرير (تبقى عند سطر القراءة وقتًا كافيًا ثم تتجاوزها)',
    sKhatmaSec: 'الختمة', sOpenKhatma: 'افتح الختمة', sHijriSec: 'التقويم الهجري', sOpenHijri: 'افتح التقويم والتحويل',
    sYou: 'أنت', sAge: 'العمر', sChild: 'أقل من ١٨ سنة', sAdult: '١٨ سنة فأكثر', sAgeHelp: 'لمن هو أقل من ١٨ سنة: لا تُعرض فتاوى، ويقترح عليك «مشكاة» حفظ سورة وفهم معانيها.',
    sIntro: 'شاهد فيلم التعريف بمشكاة', sInstall: 'ثبّت التطبيق على هذا الجهاز',
    kProposal: (n, p) => `خطة مقترحة: ختمة في ${arCount(n, DAYS)}، نحو ${arCount(p, PAGES)} كل يوم، موزّعة على أوقاتك. عدّل المدة والأوقات حسب التزاماتك ثم اضغط «ابدأ الختمة».`,
    kProposalActive: 'لديك خطة ختمة جارية؛ هذا تقدّمك. يمكنك إلغاؤها وبدء خطة جديدة بمدة أخرى تناسب التزاماتك.',
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
    kMarkHere: (r) => `Mark up to the open verse (${r}) as read`, kMarkHereQ: (r, n) => `Mark every verse from the start of the Mushaf up to ${r} (${n} verses) as read?`, kStop: 'Cancel the plan', kStopQ: 'Cancel the plan? The verses read stay saved.', sWelcome: 'A short spoken welcome on entering (browser voice)', kGalaxy: 'Show completed surahs on the galaxy', kMap: 'Khatma map inside the lamp (surahs read light up)',
    kAutoNote: 'A verse counts as read when you listen to its full recitation, when you read it by scrolling the Mushaf (it stays at the reading line long enough, then you scroll on), or when you press “Done”. This can be changed in Settings.',
    kIcsTitle: 'Mishkat — khatma portion', kIcsPart: (p) => `${p.moment.label}: ${p.from === p.to ? 'page ' + p.from : 'pages ' + p.from + '–' + p.to} (day ${p.day})`,
    hToday: 'Today', hConv: 'Convert a date', hToH: 'Gregorian → Hijri', hToG: 'Hijri → Gregorian', hDay: 'Day', hMonth: 'Month', hYear: 'Year', hConvert: 'Convert',
    hNoDay: 'This day does not exist in the Umm al-Qura calendar.', hUpcoming: 'Coming virtuous days', hIn: (n) => n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`, hOngoing: 'now',
    hEvidence: 'Evidence', hVerses: 'From the Quran', hHadith: 'From the Sunnah (HadeethEnc)', hGrade: 'Grade', hOpen: 'Open the hadith in the Encyclopedia of Translated Hadiths',
    hNoEn: 'This hadith is not available in English in the encyclopedia; shown in Arabic.',
    hNote: 'Dates are computed with the Umm al-Qura calendar of your browser. A month begins with the moon sighting announced by the authorities of your country.',
    hAdj: 'Start of the month where you live', hAdjHelp: 'If the month starts earlier or later in your country than in Umm al-Qura, set the difference here: the date, the conversion and the coming days change together.',
    hAdjN: (n) => n === 0 ? 'As in Umm al-Qura' : n > 0 ? `${n} day${n > 1 ? 's' : ''} later` : `${-n} day${n < -1 ? 's' : ''} earlier`,
    hGreg: 'Gregorian date', hHij: 'Hijri date', hConvHelp: 'Choose a date on either side; the matching date appears on the other side.',
    hDisputed: 'Occasions whose date or celebration is disputed are not listed.', hWhite: 'Next white days', hWeekly: 'Every week',
    lIntro: 'Sites from the challenge’s scholarly reference pack and from Mishkat’s sources:',
    sHijri: 'Hijri calendar difference (days)', sHijriHelp: 'If the month starts earlier or later in your country than in Umm al-Qura.', sAuto: 'Count a verse as read when its recitation is heard to the end',
    sGalaxy: 'Show completed surahs on the galaxy', sData: 'Your data', sDataHelp: 'Settings and khatma are kept in this browser only, never sent to a server.',
    sExport: 'Download a copy of your data', sImport: 'Restore a copy', sReset: 'Erase all your data', sResetQ: 'Erase settings, khatma and read verses from this browser?', sImported: 'Data restored.', sBadFile: 'Invalid file.',
    sDisplay: 'Display', sLang: 'Language', sTheme: 'Theme', sDark: 'Dark', sLight: 'Light', sNames: 'Surah names on the galaxy', sRotate: 'Galaxy turns by itself',
    sReading: 'Reading and recitation', sSpeed: 'Recitation speed', sFont: 'Mushaf text size', sSmaller: 'Smaller', sLarger: 'Larger',
    sScroll: 'Count a verse as read when read by scrolling (it stays at the reading line long enough, then you scroll on)',
    sYou: 'You', sAge: 'Age', sChild: 'Under 18', sAdult: '18 or over', sAgeHelp: 'Under 18: no fatwas are shown, and Mishkat suggests memorising a surah and understanding its meanings.',
    sIntro: 'Watch the Mishkat presentation film', sInstall: 'Install the app on this device',
    kProposal: (n, p) => `A proposed plan: the whole Quran in ${n} days, about ${p} pages a day, spread over your reading times. Change the length and times to fit your commitments, then press “Start the khatma”.`,
    kProposalActive: 'You already have a khatma plan running; here is your progress. You can cancel it and start a new plan of another length that fits your commitments.',
    sKhatmaSec: 'Khatma', sOpenKhatma: 'Open the khatma', sHijriSec: 'Hijri calendar', sOpenHijri: 'Open the calendar and converter',
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
    ['https://alifta.gov.sa', 'الرئاسة العامة للبحوث العلمية والإفتاء', 'General Presidency of Scholarly Research and Ifta'],
    ['https://dorar.net/feqhia', 'الموسوعة الفقهية — الدرر السنية', 'Fiqh encyclopedia — Dorar'] ] },
  { cat: { ar: 'الرد على الشبهات والدعوة', en: 'Answering objections and da‘wah' }, items: [
    ['https://bayenat.net/ar', 'بيّنات: أسئلة وأجوبة عن الإسلام', 'Bayyinat: questions and answers about Islam'],
    ['https://dawa.center', 'المستودع الدعوي الرقمي', 'Digital Da‘wah Repository'],
    ['https://islamic-content.com', 'موسوعة الجمهرة — مفردات المحتوى الإسلامي', 'Al-Jamhara — Islamic content encyclopedia'] ] },
];

const PRESETS = [7, 10, 15, 20, 30, 40, 60];
const MOMENT_IDS = ['fajr', 'morning', 'noon', 'asr', 'maghrib', 'isha', 'night', 'other'];
const MOMENT_TIME = { fajr: '05:30', morning: '08:00', noon: '13:30', asr: '16:30', maghrib: '19:00', isha: '20:30', night: '22:00', other: '' };
// (5 Oct, evening) the khatma v2: every moment can be chosen, plans by length or by daily amount, by pages, verses or
// surahs, the whole Quran or chosen surahs, Mushaf order or the short surahs first, and «اختر لي» (choose for me)
export const K2 = {
  ar: {
    isha: 'بعد العشاء', choose: '✦ اختر لي', chooseLead: 'أجب عن أسئلة قليلة، فنقترح عليك أنسب خطة، ثم تعدّلها كما تشاء.', manual: 'أو صمّم خطتك بنفسك:',
    what: 'ماذا تقرأ؟', whole: 'القرآن كله', some: 'سورًا أختارها', pickSuras: 'اختر السور (اضغط مع Ctrl لاختيار أكثر من سورة)', nSel: (n) => `اخترت ${n}`,
    order: 'من أين تبدأ؟', oMushaf: 'ترتيب المصحف (من الفاتحة)', oShort: 'قصار السور أولًا (من الناس صعودًا)',
    how: 'كيف تُحسب خطتك؟', byDays: 'بالمدة: أختم في عدد من الأيام', byAmount: 'بالمقدار: أقرأ كل يوم', unit: 'الوحدة', uPages: 'صفحات', uAyas: 'آيات', uSuras: 'سور',
    perDay: 'كل يوم', moments: 'متى تقرأ؟ (اختر وقتًا أو أكثر)', time: 'الساعة',
    qMin: 'كم دقيقة تستطيع أن تقرأ كل يوم؟', min: (n) => `${n} دقيقة`, qWhen: 'متى يناسبك أن تقرأ؟', qPace: 'كيف قراءتك؟', pSlow: 'متأنّية', pMed: 'متوسطة', pFast: 'سريعة',
    qStart: 'بماذا تحب أن تبدأ؟', qDead: 'هل تريد أن تختم في مدة محددة؟', dNone: 'لا، حسب وقتي', d30: 'شهر', d60: 'شهران', d90: 'ثلاثة أشهر', d7: 'أسبوع',
    suggest: 'اقترح عليّ', result: 'خطتك المقترحة', resLine: (d, p, m) => `ختمة في ${d} يومًا، نحو ${p} صفحة كل يوم (قرابة ${m} دقيقة).`,
    resWhen: (w) => `موزّعة على: ${w}.`, resShort: 'تبدأ بقصار السور، من الناس صعودًا.', resMushaf: 'بترتيب المصحف، من الفاتحة.',
    noFit: (d, m) => `لتختم في ${d} يومًا تحتاج نحو ${m} دقيقة كل يوم؛ لذا اقترحنا مدة تناسب وقتك. يمكنك تعديلها.`,
    accept: 'اعتمد هذه الخطة', edit: 'عدّلها بنفسي', back: 'رجوع',
    howRead: 'كيف تحب أن تقرأ وردك؟', rWith: '🎧 مع القارئ والمجرّة', rOnly: '📖 قراءة فقط (ملء الشاشة)', rListen: '🔊 استماع فقط', later: 'لاحقًا',
    revealTitle: 'سور خطتك تضيء في المشكاة', portion: (u) => u, rangeSura: (name, a, b) => a === b ? `${name} ${a}` : `${name} ${a}–${b}`,
    unitsLeft: (a, b) => `${a} من ${b}`, uWord: { pages: 'صفحة', ayas: 'آية', suras: 'سورة' },
  },
  en: {
    isha: 'After Isha', choose: '✦ Choose for me', chooseLead: 'Answer a few questions and we propose the plan that fits you best; you can change it afterwards.', manual: 'Or design your own plan:',
    what: 'What will you read?', whole: 'The whole Quran', some: 'Surahs I choose', pickSuras: 'Choose the surahs (Ctrl-click to choose several)', nSel: (n) => `${n} chosen`,
    order: 'Where do you start?', oMushaf: 'Mushaf order (from al-Fatiha)', oShort: 'Short surahs first (from an-Nas up)',
    how: 'How is your plan counted?', byDays: 'By length: finish in a number of days', byAmount: 'By amount: read every day', unit: 'Unit', uPages: 'pages', uAyas: 'verses', uSuras: 'surahs',
    perDay: 'every day', moments: 'When do you read? (one moment or more)', time: 'Time',
    qMin: 'How many minutes can you read every day?', min: (n) => `${n} min`, qWhen: 'When suits you?', qPace: 'How do you read?', pSlow: 'Slowly', pMed: 'Medium', pFast: 'Fast',
    qStart: 'How would you like to start?', qDead: 'Do you want to finish within a set time?', dNone: 'No, at my pace', d30: 'A month', d60: 'Two months', d90: 'Three months', d7: 'A week',
    suggest: 'Suggest a plan', result: 'Your proposed plan', resLine: (d, p, m) => `A khatma in ${d} days, about ${p} pages a day (around ${m} minutes).`,
    resWhen: (w) => `Spread over: ${w}.`, resShort: 'It starts with the short surahs, from an-Nas up.', resMushaf: 'In Mushaf order, from al-Fatiha.',
    noFit: (d, m) => `To finish in ${d} days you would need about ${m} minutes a day, so we proposed a length that fits your time. You can change it.`,
    accept: 'Use this plan', edit: 'Adjust it myself', back: 'Back',
    howRead: 'How would you like to read your portion?', rWith: '🎧 With the reciter and the galaxy', rOnly: '📖 Reading only (full screen)', rListen: '🔊 Listening only', later: 'Later',
    revealTitle: 'The surahs of your plan light up in the lamp', portion: (u) => u, rangeSura: (name, a, b) => a === b ? `${name} ${a}` : `${name} ${a}–${b}`,
    unitsLeft: (a, b) => `${a} of ${b}`, uWord: { pages: 'pages', ayas: 'verses', suras: 'surahs' },
  },
};

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
    const k2 = K2[ar() ? 'ar' : 'en'], mlabel = (id) => id === 'isha' ? k2.isha : (t.kMoment[id] || id);
    if (!kp.active) {
      if (args.wizard || state2.wizard) return wizard(body, args);
      const cur = planOf(kp.v === 2 ? kp : { ...kp, mode: 'days' });
      const days = args.days || cur.days || 30;
      const moments = (cur.moments && cur.moments.length ? cur.moments : DEFAULTS.khatma.moments).map(m => ({ ...m }));
      const prop = args.days ? `<p class="k-proposal">${esc(t.kProposal(num(days), num(Math.ceil(N_PAGES / days))))}</p>` : '';
      const chosen = new Set(cur.suras || []);
      body.innerHTML = `${prop}<p class="p-lead">${esc(t.kIntro)}</p>
        <div class="k-choose"><button type="button" class="btn gold big" id="kWiz">${esc(k2.choose)}</button><p class="p-small">${esc(k2.chooseLead)}</p></div>
        <h3 class="p-sub">${esc(k2.manual)}</h3>
        <fieldset class="p-field"><legend>${esc(k2.what)}</legend><div class="chips">
          <label class="chip"><input type="radio" name="kScope" value="quran" ${cur.scope !== 'suras' ? 'checked' : ''}> ${esc(k2.whole)}</label>
          <label class="chip"><input type="radio" name="kScope" value="suras" ${cur.scope === 'suras' ? 'checked' : ''}> ${esc(k2.some)}</label></div>
          <div id="kSurasBox" ${cur.scope === 'suras' ? '' : 'hidden'}><label class="p-small" for="kSuras">${esc(k2.pickSuras)}</label>
            <select id="kSuras" multiple size="7">${ctx.core.suras.map(x => `<option value="${x.n}" ${chosen.has(x.n) ? 'selected' : ''}>${x.n}. ${esc(ar() ? x.ar : x.tr)}</option>`).join('')}</select> <small id="kNSel"></small></div></fieldset>
        <fieldset class="p-field"><legend>${esc(k2.order)}</legend><div class="chips">
          <label class="chip"><input type="radio" name="kOrd" value="mushaf" ${cur.order !== 'short' ? 'checked' : ''}> ${esc(k2.oMushaf)}</label>
          <label class="chip"><input type="radio" name="kOrd" value="short" ${cur.order === 'short' ? 'checked' : ''}> ${esc(k2.oShort)}</label></div></fieldset>
        <fieldset class="p-field"><legend>${esc(k2.how)}</legend>
          <label class="p-row"><input type="radio" name="kMode" value="days" ${cur.mode !== 'amount' ? 'checked' : ''}> ${esc(k2.byDays)}</label>
          <div id="kByDays"><div class="chips">${PRESETS.map(n => `<label class="chip"><input type="radio" name="kd" value="${n}" ${n === days ? 'checked' : ''}> ${esc(t.kDaysN(num(n)))}</label>`).join('')}</div>
            <label class="p-row">${esc(t.kCustom)} <input type="number" id="kdN" min="1" max="1000" value="${PRESETS.includes(days) ? '' : days}" inputmode="numeric"></label></div>
          <label class="p-row"><input type="radio" name="kMode" value="amount" ${cur.mode === 'amount' ? 'checked' : ''}> ${esc(k2.byAmount)}</label>
          <div id="kByAmount" class="p-row"><input type="number" id="kPer" min="1" max="604" value="${cur.perDay || 2}" inputmode="numeric" style="width:6em">
            <select id="kUnitA"><option value="pages">${esc(k2.uPages)}</option><option value="ayas">${esc(k2.uAyas)}</option><option value="suras">${esc(k2.uSuras)}</option></select> ${esc(k2.perDay)}</div>
          <label class="p-row">${esc(k2.unit)} <select id="kUnit"><option value="pages">${esc(k2.uPages)}</option><option value="ayas">${esc(k2.uAyas)}</option><option value="suras">${esc(k2.uSuras)}</option></select></label></fieldset>
        <label class="p-row">${esc(t.kStart)} <input type="date" id="kStart" value="${ymd(new Date())}"></label>
        <fieldset class="p-field"><legend>${esc(k2.moments)}</legend><div id="kMoms" class="k-moms"></div></fieldset>
        <button type="button" class="btn gold" id="kGo" autofocus>${esc(t.kBegin)}</button>`;
      const $b = (q) => body.querySelector(q);
      $b('#kUnit').value = cur.unit || 'pages'; $b('#kUnitA').value = cur.unit || 'pages';
      const syncMode = () => { const m = (body.querySelector('input[name=kMode]:checked') || {}).value; $b('#kByDays').hidden = m === 'amount'; $b('#kByAmount').hidden = m !== 'amount'; $b('#kUnit').closest('label').hidden = m === 'amount'; };
      body.querySelectorAll('input[name=kMode]').forEach(x => x.onchange = syncMode); syncMode();
      const syncScope = () => { $b('#kSurasBox').hidden = (body.querySelector('input[name=kScope]:checked') || {}).value !== 'suras'; };
      body.querySelectorAll('input[name=kScope]').forEach(x => x.onchange = syncScope);
      const nSel = () => { $b('#kNSel').textContent = k2.nSel(num([...$b('#kSuras').selectedOptions].length)); };
      $b('#kSuras').onchange = nSel; nSel();
      // every moment as a chip; a chosen one shows its time (editable)
      const on = new Map(moments.map(m => [m.id, m.time || MOMENT_TIME[m.id] || '']));
      const drawMoms = () => {
        $b('#kMoms').innerHTML = MOMENT_IDS.map(id => `<div class="k-mom ${on.has(id) ? 'on' : ''}"><label class="chip"><input type="checkbox" data-m="${id}" ${on.has(id) ? 'checked' : ''}> ${esc(mlabel(id))}</label>
          ${on.has(id) ? `<input type="time" data-t="${id}" value="${esc(on.get(id) || '')}" aria-label="${esc(k2.time)}">` : ''}</div>`).join('');
        body.querySelectorAll('[data-m]').forEach(c => c.onchange = () => { if (c.checked) on.set(c.dataset.m, MOMENT_TIME[c.dataset.m] || ''); else on.delete(c.dataset.m); drawMoms(); });
        body.querySelectorAll('[data-t]').forEach(c => c.onchange = () => on.set(c.dataset.t, c.value));
      };
      drawMoms();
      $b('#kWiz').onclick = () => { state2.wizard = true; wizard(body, args); };
      $b('#kGo').onclick = () => {
        const mode = (body.querySelector('input[name=kMode]:checked') || {}).value || 'days';
        const custom = +$b('#kdN').value;
        const d = custom >= 1 ? Math.min(1000, Math.round(custom)) : +(body.querySelector('input[name=kd]:checked') || {}).value || 30;
        const scope = (body.querySelector('input[name=kScope]:checked') || {}).value || 'quran';
        const suras = [...$b('#kSuras').selectedOptions].map(o => +o.value);
        const plan = { v: 2, active: true, start: $b('#kStart').value || ymd(new Date()), mode, days: d, perDay: Math.max(1, +$b('#kPer').value || 1),
          unit: mode === 'amount' ? $b('#kUnitA').value : $b('#kUnit').value, scope: scope === 'suras' && suras.length ? 'suras' : 'quran', suras,
          order: (body.querySelector('input[name=kOrd]:checked') || {}).value || 'mushaf',
          moments: MOMENT_IDS.filter(id => on.has(id)).map(id => ({ id, time: on.get(id) || '' })) };
        if (!plan.moments.length) plan.moments = [{ id: 'other', time: '' }];
        P.khatma = plan; ctx.save(); ctx.onReadChange();
        afterPlan(body, plan);
      };
      return;
    }
    const plan = { ...planOf(kp), moments: (kp.moments || []).map(m => ({ ...m, label: mlabel(m.id) })) };
    const units = planUnits(plan, ctx.core.suras, pages), totalU = planTotal(units), daysN = planDays(plan, units);
    const tp = todayPortion2(plan, bits, units);
    const uw = k2.uWord[plan.unit] || k2.uWord.pages;
    const nRead = countRead(bits), done = Math.round(tp.doneW);
    const rangesOf = (list) => { const out = []; for (const u of list) { const l = out[out.length - 1]; if (l && l.sura === u.sura && l.b + 1 === u.a) l.b = u.b; else out.push({ sura: u.sura, a: u.a, b: u.b }); } return out; };
    const nameOf = (n) => { const x = ctx.core.suras[n - 1]; return ar() ? x.ar : x.tr; };
    const descr = (list) => rangesOf(list).map(r => { const S0 = ctx.core.suras[r.sura - 1]; return k2.rangeSura(nameOf(r.sura), num(r.a - S0.first + 1), num(r.b - S0.first + 1)); }).join(' · ');
    const greens = surasRead(bits, ctx.core.suras);
    const here = ctx.readerVerse();
    let h = (args.days ? `<p class="k-proposal">${esc(t.kProposalActive)}</p>` : '') + `<div class="k-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${Math.round(totalU)}" aria-valuenow="${done}"><span style="width:${(100 * tp.doneW / totalU).toFixed(1)}%"></span></div>
      <p class="p-row k-sum"><b>${esc(k2.unitsLeft(num(done), num(Math.round(totalU))))} ${esc(uw)}</b> · ${esc(t.kDay(num(Math.max(1, tp.day)), num(daysN)))}</p>`;
    if (tp.finished) h += `<p class="k-ok">${esc(t.kFinished)}</p>`;
    else {
      if (tp.behind >= 1 && plan.mode !== 'amount' && plan.unit === 'pages') h += `<p class="note">${esc(t.kBehind(num(Math.round(tp.behind))))}</p>`;
      h += `<h3 class="p-sub">${esc(t.kToday)}</h3><ol class="k-parts">${tp.parts.map((p, j) => {
        const all = p.units.every(u => countRead(bits, u.a, u.b) === u.b - u.a + 1);
        return `<li class="${all ? 'done' : ''}"><div><b>${esc(p.moment.label)}</b>${p.moment.time ? ` <small>${esc(num(p.moment.time))}</small>` : ''}</div>
          <div>${esc(descr(p.units))}</div>
          <div class="k-btns"><button type="button" class="mini" data-go="${p.units[0].a}">${esc(t.kRead)}</button>
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
    h += `<p><button type="button" class="mini gold" id="kMap">✦ ${esc(t.kMap)}</button></p>`;
    h += `<label class="p-row"><input type="checkbox" id="kGal" ${P.showReadOnGalaxy ? 'checked' : ''}> ${esc(t.kGalaxy)}</label>
      <h3 class="p-sub">${esc(t.kIcs)}</h3><p class="p-small">${esc(t.kIcsHelp)}</p><button type="button" class="mini gold" id="kIcs">⤓ ${esc(t.kIcs)}</button>
      <p><button type="button" class="mini danger" id="kStop">${esc(t.kStop)}</button></p>`;
    body.innerHTML = h;
    const mark = (a, b, on) => { const B = decodeRead(P.read); const before = countRead(B); (on ? markRead : unmarkRead)(B, a, b); P.read = encodeRead(B); const k = ymd(new Date()); P.log = P.log || {}; P.log[k] = Math.max(0, (P.log[k] || 0) + countRead(B) - before); ctx.save(); ctx.onReadChange(); khatma(body); };
    body.querySelectorAll('[data-go]').forEach(b => b.onclick = () => ctx.openVerse(+b.dataset.go));
    body.querySelectorAll('[data-mark]').forEach(b => b.onclick = () => {
      const p = tp.parts[+b.dataset.mark], all = p.units.every(u => countRead(bits, u.a, u.b) === u.b - u.a + 1);
      const B = decodeRead(P.read), before = countRead(B);
      for (const u of p.units) (all ? unmarkRead : markRead)(B, u.a, u.b);
      P.read = encodeRead(B); const k = ymd(new Date()); P.log = P.log || {}; P.log[k] = Math.max(0, (P.log[k] || 0) + countRead(B) - before); ctx.save(); ctx.onReadChange(); khatma(body);
    });
    const kh = body.querySelector('#kHere'); if (kh) kh.onclick = () => { if (confirm(t.kMarkHereQ(refOf(here).label, num(here + 1)))) mark(0, here, true); };
    body.querySelector('#kGal').onchange = (ev) => { P.showReadOnGalaxy = ev.target.checked; ctx.save(); ctx.onReadChange(); };
    const km = body.querySelector('#kMap'); if (km) km.onclick = () => ctx.openLampMap && ctx.openLampMap();
    body.querySelector('#kIcs').onclick = () => download('mishkat-khatma.ics', planToIcs2(plan, units, { title: t.kIcsTitle, describe: (p) => `${p.moment.label || ''}: ${descr(p.units)}`, url: location.origin + location.pathname }), 'text/calendar');
    body.querySelector('#kStop').onclick = () => { if (confirm(t.kStopQ)) { P.khatma = { ...P.khatma, active: false }; ctx.save(); ctx.onReadChange(); khatma(body); } };
  }

  // «اختر لي»: a few questions → the best plan for the visitor's time → accept (or adjust it in the form)
  const state2 = { wizard: false };
  function wizard(body, args = {}) {
    const t = L(), k2 = K2[ar() ? 'ar' : 'en'], mlabel = (id) => id === 'isha' ? k2.isha : (t.kMoment[id] || id);
    const A = { minutes: 15, when: new Set(['fajr']), pace: 'medium', order: 'mushaf', deadline: 0 };
    const chips = (name, list, val) => `<div class="chips">${list.map(([v, l]) => `<label class="chip"><input type="radio" name="${name}" value="${v}" ${String(v) === String(val) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div>`;
    body.innerHTML = `<div class="k-wiz"><p class="p-lead">${esc(k2.chooseLead)}</p>
      <fieldset class="p-field"><legend>${esc(k2.qMin)}</legend>${chips('wMin', [5, 10, 15, 20, 30, 45, 60].map(n => [n, k2.min(num(n))]), A.minutes)}</fieldset>
      <fieldset class="p-field"><legend>${esc(k2.qWhen)}</legend><div class="chips">${MOMENT_IDS.filter(id => id !== 'other').map(id => `<label class="chip"><input type="checkbox" name="wWhen" value="${id}" ${A.when.has(id) ? 'checked' : ''}> ${esc(mlabel(id))}</label>`).join('')}</div></fieldset>
      <fieldset class="p-field"><legend>${esc(k2.qPace)}</legend>${chips('wPace', [['slow', k2.pSlow], ['medium', k2.pMed], ['fast', k2.pFast]], A.pace)}</fieldset>
      <fieldset class="p-field"><legend>${esc(k2.qStart)}</legend>${chips('wOrd', [['short', k2.oShort], ['mushaf', k2.oMushaf]], A.order)}</fieldset>
      <fieldset class="p-field"><legend>${esc(k2.qDead)}</legend>${chips('wDead', [[0, k2.dNone], [7, k2.d7], [30, k2.d30], [60, k2.d60], [90, k2.d90]], A.deadline)}</fieldset>
      <p class="p-row"><button type="button" class="btn gold" id="wGo">${esc(k2.suggest)}</button> <button type="button" class="mini" id="wBack">${esc(k2.back)}</button></p>
      <div id="wRes" aria-live="polite"></div></div>`;
    const $b = (q) => body.querySelector(q), val = (n) => (body.querySelector(`input[name=${n}]:checked`) || {}).value;
    $b('#wBack').onclick = () => { state2.wizard = false; khatma(body, { ...args, wizard: false }); };
    $b('#wGo').onclick = () => {
      const when = [...body.querySelectorAll('input[name=wWhen]:checked')].map(x => x.value);
      const ans = { minutes: +val('wMin') || 15, pace: val('wPace') || 'medium', order: val('wOrd') || 'mushaf', deadline: +val('wDead') || 0,
        moments: (when.length ? when : ['fajr']).map(id => ({ id, time: MOMENT_TIME[id] })) };
      const r = suggestPlan(ans, ymd(new Date()));
      const needMin = ans.deadline ? Math.round(N_PAGES / ans.deadline / ({ slow: 1 / 3, medium: 1 / 2, fast: 3 / 4 }[ans.pace])) : 0;
      $b('#wRes').innerHTML = `<section class="k-res"><h3>${esc(k2.result)}</h3>
        <p><b>${esc(k2.resLine(num(r.days), num(Math.round(r.pagesPerDay * 10) / 10), num(r.minutesPerDay)))}</b></p>
        <p>${esc(k2.resWhen(ans.moments.map(m => mlabel(m.id)).join('، ')))} ${esc(ans.order === 'short' ? k2.resShort : k2.resMushaf)}</p>
        ${r.fits ? '' : `<p class="note">${esc(k2.noFit(num(ans.deadline), num(needMin)))}</p>`}
        <p class="p-row"><button type="button" class="btn gold big" id="wOk">${esc(k2.accept)}</button> <button type="button" class="mini" id="wEdit">${esc(k2.edit)}</button></p></section>`;
      $b('#wOk').onclick = () => { state2.wizard = false; P().khatma = { ...r.plan, active: true }; ctx.save(); ctx.onReadChange(); afterPlan(body, P().khatma); };
      $b('#wEdit').onclick = () => { state2.wizard = false; P().khatma = { ...r.plan, active: false }; ctx.save(); khatma(body, { ...args, wizard: false }); };
      $b('#wRes').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
  }
  const P = () => ctx.prefs;
  // after a plan is set: the surahs of the plan light up one by one in the 3D lamp, then «how would you like to read?»
  function afterPlan(body, plan) {
    khatma(body);
    const k2 = K2[ar() ? 'ar' : 'en'];
    const seq = planSuras(plan, ctx.core.suras);
    if (!ctx.planReveal) return;
    ctx.planReveal(seq, { title: k2.revealTitle, question: k2.howRead,
      choices: [{ id: 'with', label: k2.rWith }, { id: 'only', label: k2.rOnly }, { id: 'listen', label: k2.rListen }, { id: 'later', label: k2.later }],
      onChoice: async (id) => {
        if (id === 'later') return;
        const units = planUnits(plan, ctx.core.suras, (await ctx.meta()).pages);
        const tp = units && units.length ? todayPortion2(plan, decodeRead(ctx.prefs.read), units) : null;
        const first = tp && tp.parts.length ? tp.parts[0].units[0].a : ctx.core.suras[seq[0] - 1].first;
        ctx.startReading && ctx.startReading(first, id);
      } });
  }

  // ------------------------------------------------------------------ hijri
  async function hijri(body, args = {}) {
    const t = L(), adj = +ctx.prefs.hijriAdjust || 0, now = new Date(), lg = ctx.lang();
    const h = toHijri(now, adj), list = upcoming(now, adj, 8), white = nextWhiteDays(now, adj);
    const pick = args.event ? nextEvent(args.event, now, adj) : null;
    const evItem = (e) => `<li class="h-ev ${pick && pick.id === e.id ? 'hit' : ''}" data-ev="${e.id}"><details ${pick && pick.id === e.id ? 'open' : ''}>
        <summary><b>${esc(e[lg] || e.ar)}</b> <span class="h-when">${esc(e.ongoing ? t.hOngoing : t.hIn(e.inDays))}</span>
        <small>${esc(formatHijri({ y: e.hy, m: e.m, d: e.d }, lg))} · ${esc(dateStr(e.start))}</small></summary><div class="h-evid"></div></details></li>`;
    // order: today (with the local start of the month right there) → converter → coming days → notes
    body.innerHTML = `<div class="h-today"><div class="h-big">${esc(formatHijri(h, lg))}</div><div class="p-small">${esc(dateStr(now))}</div>
        <label class="h-adj">${esc(t.hAdj)} <select id="hAdj">${[-2, -1, 0, 1, 2].map(n => `<option value="${n}" ${n === adj ? 'selected' : ''}>${esc(t.hAdjN(n))}</option>`).join('')}</select></label></div>
      <p class="p-small">${esc(t.hAdjHelp)}</p>
      <section class="h-conv" aria-labelledby="hConvT"><h3 class="p-sub" id="hConvT">${esc(t.hConv)}</h3><p class="p-small">${esc(t.hConvHelp)}</p>
        <div class="h-side"><div class="h-lab">${esc(t.hToH)}</div><input type="date" id="hG" value="${ymd(now)}" aria-label="${esc(t.hGreg)}"><output id="hGo" class="h-out"></output></div>
        <div class="h-side"><div class="h-lab">${esc(t.hToG)}</div><div class="h-dmy"><input type="number" id="hD" min="1" max="30" value="${h.d}" aria-label="${esc(t.hDay)}">
          <select id="hM" aria-label="${esc(t.hMonth)}">${MONTHS[lg === 'en' ? 'en' : 'ar'].map((m, k) => `<option value="${k + 1}" ${k + 1 === h.m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
          <input type="number" id="hY" min="1300" max="1600" value="${h.y}" aria-label="${esc(t.hYear)}"></div><output id="hHo" class="h-out"></output></div></section>
      <h3 class="p-sub">${esc(t.hUpcoming)}</h3><ol class="h-list">${list.map(evItem).join('')}
        ${white ? `<li class="h-ev" data-ev="white"><details><summary><b>${esc(MONTHLY[lg] || MONTHLY.ar)}</b> <span class="h-when">${esc(t.hIn(white.inDays))}</span> <small>${esc(dateStr(white.start))}</small></summary><div class="h-evid"></div></details></li>` : ''}
        <li class="h-ev" data-ev="monthu"><details><summary><b>${esc(WEEKLY[lg] || WEEKLY.ar)}</b> <span class="h-when">${esc(t.hWeekly)}</span></summary><div class="h-evid"></div></details></li></ol>
      <p class="p-small">${esc(t.hNote)} ${esc(t.hDisputed)}</p>`;
    const g2h = () => { const v = body.querySelector('#hG').value; if (!v) return; const [y, m, d] = v.split('-').map(Number); body.querySelector('#hGo').textContent = formatHijri(toHijri(new Date(y, m - 1, d), adj), lg); };
    const h2g = () => { const g = toGregorian(+body.querySelector('#hY').value, +body.querySelector('#hM').value, +body.querySelector('#hD').value, adj); body.querySelector('#hHo').textContent = g ? dateStr(g) : t.hNoDay; };
    ['#hG'].forEach(s => body.querySelector(s).oninput = g2h);
    ['#hD', '#hM', '#hY'].forEach(s => body.querySelector(s).oninput = h2g);
    g2h(); h2g();
    // the local start of the month: saved, and the whole panel follows at once
    body.querySelector('#hAdj').onchange = (ev) => { ctx.prefs.hijriAdjust = +ev.target.value; ctx.save(); hijri(body, args); };
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
    // sections: display · reading and recitation · khatma · Hijri calendar · your data (the page's own controls
    // through ctx.ui: language, theme, galaxy, recitation speed, Mushaf text size)
    const U = ctx.ui, lg = ctx.lang(), sec = (title, html) => `<section class="s-sec"><h3 class="p-sub">${esc(title)}</h3>${html}</section>`;
    const seg = (id, items, cur) => `<div class="seg" role="group" id="${id}">${items.map(([v, label]) => `<button type="button" data-v="${v}" aria-pressed="${v === cur}">${esc(label)}</button>`).join('')}</div>`;
    const check = (id, on, label) => `<label class="p-row"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}> ${esc(label)}</label>`;
    body.innerHTML = (U ? sec(t.sDisplay,
        `<div class="s-line"><span>${esc(t.sLang)}</span>${seg('sLang', [['ar', 'العربية'], ['en', 'English']], lg)}</div>
        <div class="s-line"><span>${esc(t.sTheme)}</span>${seg('sTheme', [['dark', t.sDark], ['light', t.sLight]], U.theme())}</div>
        ${check('sNames', U.names(), t.sNames)}${check('sRot', U.rotate(), t.sRotate)}`)
      + sec(t.sReading,
        `<div class="s-line"><span>${esc(t.sSpeed)}</span>${seg('sSpeed', [0.75, 1, 1.25, 1.5].map(x => [String(x), '×' + x]), String(U.speed()))}</div>
        <div class="s-line"><span>${esc(t.sFont)}</span><div class="seg" role="group"><button type="button" id="sFm">A− ${esc(t.sSmaller)}</button><button type="button" id="sFp">A+ ${esc(t.sLarger)}</button></div></div>
        ${check('sAuto', P.autoMark, t.sAuto)}${check('sScroll', P.scrollMark, t.sScroll)}${check('sWelcome', P.welcomeVoice !== false, t.sWelcome)}`) : sec(t.sReading, check('sAuto', P.autoMark, t.sAuto) + check('sScroll', P.scrollMark, t.sScroll)))
      + (U && U.age ? sec(t.sYou, `<div class="s-line"><span>${esc(t.sAge)}</span>${seg('sAge', [['child', t.sChild], ['adult', t.sAdult]], U.age() || '')}</div><p class="p-small">${esc(t.sAgeHelp)}</p>
        <div class="k-btns"><button type="button" class="mini" id="sIntro">▶ ${esc(t.sIntro)}</button><button type="button" class="mini gold" id="sInst">⤓ ${esc(t.sInstall)}</button></div>`) : '')
      + sec(t.sKhatmaSec, `${check('sGal', P.showReadOnGalaxy, t.sGalaxy)}${U ? `<button type="button" class="mini gold" id="sGoK">${esc(t.sOpenKhatma)}</button>` : ''}`)
      + sec(t.sHijriSec, `<label class="p-row">${esc(t.hAdj)} <select id="sHj">${[-2, -1, 0, 1, 2].map(n => `<option value="${n}" ${n === (+P.hijriAdjust || 0) ? 'selected' : ''}>${esc(t.hAdjN(n))}</option>`).join('')}</select></label>
        <p class="p-small">${esc(t.sHijriHelp)}</p>${U ? `<button type="button" class="mini gold" id="sGoH">${esc(t.sOpenHijri)}</button>` : ''}`)
      + sec(t.sData, `<p class="p-small">${esc(t.sDataHelp)}</p>
        <div class="k-btns"><button type="button" class="mini" id="sExp">⤓ ${esc(t.sExport)}</button>
        <label class="mini file">${esc(t.sImport)}<input type="file" id="sImp" accept="application/json,.json" hidden></label>
        <button type="button" class="mini danger" id="sRst">${esc(t.sReset)}</button></div><p id="sMsg" class="p-small" aria-live="polite"></p>`);
    const $b = (s) => body.querySelector(s);
    const segOn = (id, fn) => { const g = $b('#' + id); if (g) g.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { g.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', x === b)); fn(b.dataset.v); }); };
    if (U) {
      segOn('sLang', (v) => U.setLang(v));                 // the page redraws this panel in the new language
      segOn('sTheme', (v) => U.setTheme(v));
      segOn('sSpeed', (v) => U.setSpeed(+v));
      if (U.age) { segOn('sAge', (v) => U.setAge(v)); $b('#sIntro').onclick = () => U.replayIntro(); $b('#sInst').onclick = () => U.install(); }
      $b('#sNames').onchange = (ev) => U.setNames(ev.target.checked);
      const sw = $b('#sWelcome'); if (sw) sw.onchange = (ev) => { P.welcomeVoice = ev.target.checked; ctx.save(); };
      $b('#sRot').onchange = (ev) => U.setRotate(ev.target.checked);
      $b('#sFm').onclick = () => U.font(-0.1);
      $b('#sFp').onclick = () => U.font(0.1);
      $b('#sGoK').onclick = () => U.open('khatma');
      $b('#sGoH').onclick = () => U.open('hijri');
    }
    $b('#sScroll').onchange = (ev) => { P.scrollMark = ev.target.checked; ctx.save(); };
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
