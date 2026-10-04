// T091 — map of the question before any search: what kind of request is this?
//   offtopic  a request outside Mishkat's subject (a recipe, the price of a trip, writing code, the weather,
//             a football score, a poem…): a fixed, kind answer that says what Mishkat does — never the AI
//             (the server refuses the same texts, functions/_lib/guard.js, so a script cannot use our AI as a
//             general chatbot).
//   now       today's date or the time: answered at once from the browser's clock (Gregorian + Umm al-Qura).
//   feature   a request that one of Mishkat's own services answers (memorising with repetition, statistics,
//             engagement, installing the app): the service opens with the request's details.
// Prayer times, qibla, khatma plan, adhkar and the calendar are routed by js/tools.js (unchanged).
// Kept deliberately narrow: «الطعام في القرآن», "what does the Quran say about wealth", «ما حكم بيع الذهب
// بالتقسيط» are ordinary questions. A request is off-topic only when an off-topic pattern matches AND no
// Islamic anchor is present — except for «hard» requests (price, booking, writing code, composing an essay or a
// poem, cooking) that Mishkat cannot answer even when an Islamic word appears («سعر رحلة العمرة»), unless the
// question asks for a ruling or about the Quran itself.

const AR_MARKS = /[ً-ْٰـ]/g;
export const normQ = (s) => String(s || '').normalize('NFKC').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(AR_MARKS, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[؟?!.,،:;«»"“”()]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

// an Islamic subject in the question (normalised text). STRONG = the question is about the Quran, the Sunna or a ruling.
const STRONG = /(^| )(و|ف|ب|ل)?(ال)?(قران|القران|مصحف|ايه|ايات|سوره|سور|حديث|احاديث|تفسير|حكم|فتوي|حلال|حرام|الله|رسول|النبي|نبي|الانبياء|الصحابه|السنه|السيره|الشريعه|الفقه|تجويد|تلاوه)( |$)|\b(quran|koran|qur an|verse|verses|ayah|ayat|surah|sura|hadith|hadiths|tafsir|tafseer|ruling|fatwa|halal|haram|allah|prophet|messenger|sunnah|sharia|fiqh|tajweed|tajwid)\b/;
const WEAK = /(^| )(و|ف|ب|ل)?(ال)?(صلاه|صلوات|صوم|صيام|رمضان|زكاه|حج|عمره|مسجد|مساجد|دعاء|ادعيه|ذكر|اذكار|جنه|النار|جهنم|ملائكه|توبه|صبر|اسلام|الاسلام|مسلم|مسلمين|دين|ايمان|عباده|قبله|اذان|وضوء|ختمه|شهيد|اخره|يوم القيامه|الرحمن|محمد|عيسي|موسي|ابراهيم|نوح|يوسف|مريم|نفاق|منافق|منافقين|ذنب|ذنوب|معصيه|قلب|قلوب|روح|نفس|موت|قبر|صدقه|والدين|يتيم|اخلاق|حسنات|سيئات)( |$)|\b(islam|islamic|muslim|muslims|prayer|pray|salah|salat|fasting|fast|ramadan|zakat|zakah|hajj|umrah|mosque|masjid|dua|dhikr|adhkar|paradise|jannah|hell|jahannam|angels?|repentance|patience|faith|worship|qibla|adhan|wudu|khatma|hereafter|judgement day|muhammad|jesus|moses|abraham|noah|joseph|mary|hypocrisy|hypocrites?|sins?|soul|heart|hearts|death|grave|charity|sadaqah?|parents|orphans?|manners|akhlaq|good deeds)\b/;

// [kind, hard, regexp on the normalised text]
const OFF = [
  // cooking
  ['food', true, /(^| )(وصفه|وصفات|طريقه (عمل|تحضير|طبخ)|كيف (اطبخ|احضر|اعمل|نطبخ|نعمل) (ال)?\S+|مقادير|طبخه|طبق|حلويات|كيكه|كعكه|بيتزا|معكرونه|كسكسي|كسكس|شوربه|سلطه)( |$)|\b(recipe|recipes|how (do i|to|can i) (cook|bake|make|prepare) (a |an |the |some )?(cake|pizza|pasta|soup|bread|cookies|couscous|salad|dinner|lunch|breakfast|chicken|rice|meal)|ingredients for|cooking time|bake a)\b/],
  // prices, travel, shopping, money markets
  ['money', true, /(^| )(سعر|اسعار|ثمن|تكلفه|كم (يكلف|تكلف|سعر|ثمن)|بكم|تذكره|تذاكر|طيران|فندق|فنادق|حجز|رحله الي|سياحه|تخفيض|تخفيضات|عرض خاص|بيتكوين|عملات رقميه|البورصه|اسهم|سهم|سعر الصرف|الدولار|اليورو|الذهب اليوم)( |$)|\b(price|prices|cost of|how much (is|does|are|for)|cheap(est)? (flight|hotel|ticket)|flights?|hotels?|book(ing)? (a )?(flight|hotel|trip|ticket)|travel (to|package|agency|deal)|trip to|discount|coupon|bitcoin|crypto(currency)?|stock (price|market)|shares of|exchange rate|forex)\b/],
  // programming, computers
  ['code', true, /(^| )(كود|اكواد|برمجه|برمج|بايثون|جافا|جافاسكربت|html|css|sql|قاعده بيانات|موقع (ويب|الكتروني|انترنت)|تطبيق (اندرويد|ايفون|جوال|موبايل)|اصمم موقع|انشاء موقع|سكريبت|خوارزميه)( |$)|\b(code|coding|program(ming)?|python|javascript|typescript|java|c\+\+|html|css|sql|database|website|web ?site|web app|android app|ios app|algorithm|debug|compile|api|function in|script)\b/],
  // writing on demand (essays, poems, letters, CVs, stories that are not about prophets)
  ['write', true, /(^| )(اكتب|اكتبي|اكتب لي|الف|انشئ|حرر|صغ)( لي| لنا)? (مقال|مقالا|مقاله|قصيده|قصيدا|شعر|شعرا|رساله|ايميل|بريد|سيره ذاتيه|موضوع تعبير|تعبير|بحث|خطاب|قصه قصيره|روايه|نكته|اغنيه|تقرير)( |$)|\b(write|compose|draft|generate)( me| us)? (an? |the |my )?(essay|poem|poetry|letter|email|e-mail|cv|resume|cover letter|speech|story|novel|joke|song|lyrics|report|article|tweet|post|homework)\b/],
  // homework, maths, translation of ordinary texts
  ['homework', false, /(^| )(حل (المعادله|معادله|التمرين|تمرين|المسأله|مساله|الواجب)|احسب (لي )?(\d|مساحه|محيط|حجم|جذر|تكامل|مشتق)|تكامل|مشتقه|ترجم (لي )?(هذا|هذه|النص|الجمله|الي))( |$)|\b(solve (this|the|for|my)|equation|integral of|derivative of|calculate (the )?(area|volume|square root|integral|percentage)|homework|translate (this|the following|into|to) (french|english|spanish|german|text|sentence))\b/],
  // weather, sport, entertainment, celebrities, politics, news
  ['world', false, /(^| )(الطقس|حاله الطقس|درجه الحراره|الامطار|مباراه|مباريات|كره القدم|الدوري|كاس العالم|ريال مدريد|برشلونه|ميسي|رونالدو|فيلم|افلام|مسلسل|مسلسلات|نتفليكس|يوتيوبر|مطرب|مغني|انتخابات|الرئيس|رئيس الحكومه|الحكومه|اخبار|الاخبار|عاصمه|من فاز)( |$)|\b(weather|forecast|temperature|rain|football|soccer|match|score|league|world cup|nba|messi|ronaldo|movie|movies|film|series|netflix|tv show|celebrity|singer|election|elections|president|prime minister|government|news|capital of|who won)\b/],
  // health, beauty, shopping, devices, games
  ['life', false, /(^| )(دواء|ادويه|علاج (الصداع|الزكام|البرد|السكري|الضغط)|اعراض|حميه|رجيم|تخسيس|تمارين|مكياج|بشره|شعر (ال)?(طويل|جاف)|موضه|ملابس|هاتف|ايفون|سامسونج|حاسوب|لابتوب|لعبه|العاب|ببجي|فورتنايت)( |$)|\b(medicine for|symptoms|diagnos\w*|diet|lose weight|workout|exercise plan|makeup|skincare|hairstyle|fashion|outfit|iphone|samsung|laptop|best phone|video game|games?|fortnite|minecraft|pubg)\b/],
  // chit-chat about the assistant itself
  ['chat', false, /^(نكته|احك(ي)? (لي )?نكته|من انت|ما اسمك|كيف حالك|هل انت (روبوت|انسان|ذكاء)|هل تحبني)( |$)|^\s*(tell me a joke|a joke|who are you|what is your name|how are you|are you (a robot|human|an ai|chatgpt)|do you love me)\b/],
];

// today's date / the time (answered from the clock, never searched)
const NOW = [
  /(^| )(ما|كم|شنو|ايش|وش) (هو )?(تاريخ|التاريخ) (اليوم|الحين|الان)( |$)/, /(^| )(تاريخ|التاريخ) (اليوم|الحين)( |$)/, /^(ما|اي) (هو )?اليوم$/, /(^| )(ما|اي) يوم (هو )?(اليوم|نحن)( |$)/, /(^| )(كم|ما) (هي )?الساعه( |$)/,
  /\b(what('?s| is) (the )?(date|day) today|what('?s| is) today('?s)? date|today'?s date|what day is (it|today)|what time is it|current (date|time))\b/,
];

// Mishkat's own services (opened with the request's details)
const FEATURE = [
  ['tekrar', /(^| )(اريد|اود|ابي|ابغي|ساعدني|علمني|كيف)( ان)?( علي| في)? (احفظ|حفظ|الحفظ|اتعلم)( |$)|(^| )احفظ (سوره|ايه|ايات|القران|جزء)|(^| )(وضع|صفحه|خدمه) (التكرار|التحفيظ|الحفظ)( |$)|^(حفظ|تكرار|التكرار|تحفيظ|مراجعه الحفظ)$|(^| )اراجع حفظي( |$)|\b(memori[sz]e|memori[sz]ing|memori[sz]ation|learn (a |the )?(surah|sura|verse|ayah) by heart|hifz|help me learn (surah|sura)|repetition mode|tikrar|tekrar)\b/],
  ['stats', /(^| )(احصائيات|احصاءات|احصائيه|كم (عدد|مره) (ايات|كلمات|حروف|ذكرت|وردت|ورد|تكررت|جاءت)|كم (ايه|كلمه) في|عدد (ايات|كلمات|حروف) (سوره)?|كم مره (ذكرت|وردت|ورد|جاءت|تكررت) (كلمه )?)( |$)|\b(statistics|stats|how many (verses|words|letters|times) (are |is |does |in |appear|occur|mentioned)?|word count|number of (verses|words) in|how often (is|does) .{1,30} (appear|occur|mentioned))\b/],
  ['engage', /(^| )(مستواي|مستوي التزامي|التزامي|تقدمي|انجازاتي|نقاطي|مكافاتي|علامتي|درجتي)( |$)|\b(my (level|progress|engagement|points|score|rewards|streak))\b/],
  ['install', /(^| )(ثبت|تثبيت|تنزيل|حمل|تحميل) (ال)?(تطبيق|برنامج|مشكاه)( |$)|(^| )(تطبيق مشكاه|هل يوجد تطبيق)( |$)|\b(install|download) (the )?(app|application|mishkat)\b|\b(is there an app|add to home screen)\b/],
];

const SURA_NUM = /(^| )(سوره|سورت|surah|sura|surat) (\d{1,3})( |$)/;

export function mapQuestion(query) {
  const q = normQ(query);
  if (!q || q.length > 300) return null;
  if (NOW.some(re => re.test(q))) return { kind: 'now' };
  const strong = STRONG.test(q), weak = WEAK.test(q);
  for (const [id, re] of FEATURE) if (re.test(q)) {
    const m = q.match(SURA_NUM);
    const w = id === 'stats' ? (q.match(/(?:^| )كلمه (\S+)/) || q.match(/(?:ذكرت|وردت|ورد|جاءت|تكررت) (?:كلمه )?(\S+)/) || q.match(/\bthe word (\S+)/) || q.match(/\bhow (?:many times|often) (?:is|does) (?:the word )?(\S+)/)) : null;
    const word = w && !/^(في|القران|سوره|ايه|the|in|quran)$/.test(w[1]) ? w[1] : null;
    return { kind: 'feature', feature: id, sura: m ? Math.min(114, Math.max(1, +m[3])) : null, word };
  }
  for (const [topic, hard, re] of OFF) {
    if (!re.test(q)) continue;
    // a hard off-topic request stays off-topic with an ordinary Islamic word («سعر رحلة العمرة»), not when it asks
    // about the Quran or a ruling («ما حكم بيع الذهب بالتقسيط», "what does the Quran say about the price of…")
    if (strong) return null;
    if (weak && !hard) return null;
    // «what does Islam say about…» / «في الإسلام» turns a world subject into a question about the religion
    if (/(في|عن) (ال)?(اسلام|دين)|\b(in|about) islam\b|\bislamic view\b/.test(q)) return null;
    return { kind: 'offtopic', topic };
  }
  return null;
}

// the words of the question once the off-topic frame is set aside (to offer a Quran search when they carry an
// Islamic subject, e.g. «اكتب مقالا عن الصبر» → «الصبر»)
export function islamicRest(query) {
  const q = normQ(query);
  const m = q.match(/(?:^| )(?:عن|حول|في) (.{2,60})$/) || q.match(/\b(?:about|on) (.{2,60})$/);
  const rest = m ? m[1].trim() : '';
  return rest && (STRONG.test(rest) || WEAK.test(rest)) ? rest : '';
}

// ------------------------------------------------------------------ fixed texts (ar + en)
export const SCOPE_S = {
  ar: {
    offTitle: 'هذا خارج ما تخصّصت فيه مشكاة',
    off: {
      food: 'لا أجيب عن وصفات الطعام.', money: 'لا أجيب عن الأسعار والرحلات والحجوزات والأسواق.', code: 'لا أكتب برامج ولا مواقع.',
      write: 'لا أؤلّف مقالات ولا قصائد ولا رسائل.', homework: 'لا أحلّ التمارين ولا أترجم النصوص العامة.', world: 'لا أتابع الأخبار والرياضة والطقس والترفيه.',
      life: 'لا أقدّم نصائح طبية أو تجارية أو تقنية.', chat: 'أنا «مشكاة»، دليل يبحث لك في القرآن الكريم ومصادره الموثوقة.',
    },
    offWhy: 'مشكاة دليل للقرآن الكريم: تبحث في الآيات والتفسير المعتمد والسنة الصحيحة، وتساعدك في الختمة والحفظ ومواقيت الصلاة. لا تولّد نصوصًا في غير ذلك.',
    offCan: 'يمكنني أن:', can: ['أبحث في القرآن عن موضوع أو سؤال', 'أفتح سورة وأسمعك تلاوتها', 'أساعدك على حفظ آيات بالتكرار', 'أضع لك خطة ختمة', 'أعرض مواقيت الصلاة والقبلة والمساجد القريبة'],
    offSearch: (r) => `ابحث في القرآن عن «${r}»`,
    nowTitle: 'اليوم', nowTime: 'الساعة الآن', nowHijri: 'بالتقويم الهجري (أم القرى، يُضبط في الإعدادات)', nowPrayer: 'الصلاة القادمة', openCal: 'التقويم الهجري', openPrayer: 'مواقيت الصلاة',
    featOpen: 'تفتح الخدمة…',
  },
  en: {
    offTitle: 'This is outside what Mishkat is made for',
    off: {
      food: 'I do not answer cooking recipes.', money: 'I do not answer prices, trips, bookings or markets.', code: 'I do not write code or websites.',
      write: 'I do not compose essays, poems or letters.', homework: 'I do not solve exercises or translate general texts.', world: 'I do not follow news, sport, weather or entertainment.',
      life: 'I do not give medical, shopping or technical advice.', chat: 'I am Mishkat, a guide that searches the Holy Quran and its trusted sources for you.',
    },
    offWhy: 'Mishkat is a guide to the Holy Quran: it searches the verses, the vetted tafsir and the authentic Sunna, and helps you with your khatma, memorising and prayer times. It writes nothing else.',
    offCan: 'I can:', can: ['search the Quran for a subject or a question', 'open a surah and play its recitation', 'help you memorise verses by repetition', 'make you a khatma plan', 'show prayer times, the qibla and nearby mosques'],
    offSearch: (r) => `Search the Quran for “${r}”`,
    nowTitle: 'Today', nowTime: 'Time now', nowHijri: 'Hijri calendar (Umm al-Qura, adjustable in Settings)', nowPrayer: 'Next prayer', openCal: 'Hijri calendar', openPrayer: 'Prayer times',
    featOpen: 'Opening the service…',
  },
};
