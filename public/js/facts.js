// T122 (6 Oct 2026) — VERIFIED ANSWERS to factual questions, without AI.
// The author: «when asked the number of verses of the Quran, of surahs or any detail of Islam, it says it does
// not know». The search engine looks for verses about a SUBJECT; «كم عدد آيات القرآن» has no verse that states it.
// This module answers such questions exactly, before any search:
//   1. COUNTED from the Mushaf data shipped with the site (Tanzil, Hafs ʿan ʿAsim — core.json, search_ar.json,
//      mushaf_meta.json from Tanzil quran-data.xml): surahs, verses, words, letters, juz, hizb, pages, sajdas,
//      Meccan/Medinan, order of revelation, longest/shortest, basmala, disjoined letters, occurrences of a word,
//      the surah of a number, the juz of a surah… The figure is computed, never written by hand.
//   2. STATED BY AN AUTHENTIC HADITH (HadeethEnc, grade صحيح): pillars of Islam and of faith, ihsan, greatest
//      surah and verse, al-Ikhlas = a third of the Quran, the first revelation, the 99 Names, the five prayers.
//      The short answer line repeats the hadith's own words; the hadith follows verbatim with its grade and link.
//   3. The prophets named in the Quran: each name shown with a verse that names him (checked by a test).
// Each answer says how it was obtained (method) and gives its evidence (verses, hadiths). Anything else goes to
// the search engine, as before. No numerology, no «numerical miracle» (rule 8 of the project).
import { normQ } from './scope.js';
import { normAr } from './engine.js';
import { wordStats, suraStats, totals, verseWords, letterCount } from './stats.js';

// dialect words for «how many» / «what» → the standard word (the question is matched on the normalised text)
const DIALECT = [[/(^| )(كام|قداش|قديش|شحال|شكد|اشحال|قدش)( |$)/g, '$1كم$3'], [/(^| )(شنو|شنوه|شنوة|ايش|إيش|وش|شو|واش|اش)( |$)/g, '$1ما$3'], [/(^| )ايه (هي|هو|اللي)( |$)/g, '$1ما $2$3'],
  [/(^| )(فيه|فيها)( |$)/g, '$1في$3']];
const prep = (q) => { let s = ' ' + normQ(q).replace(/[-'’ʿ]/g, ' ') + ' '; for (const [re, to] of DIALECT) { s = s.replace(re, to); s = s.replace(re, to); } return s.replace(/\s+/g, ' ').trim(); };

const HOW = String.raw`(?:كم|ما عدد|عدد|كم عدد|ما هو عدد|ما هي عدد|كم يبلغ عدد)(?: من)?`;
const QURAN = String.raw`(?:ال)?(?:قران|مصحف)(?: الكريم| الشريف)?`;
const EN_HOW = String.raw`(?:how many|number of|the number of|count of|total (?:number of )?)`;
const EN_Q = String.raw`(?:the )?(?:holy )?(?:quran|koran|qur an|mushaf)`;

// surah names, normalised as the question is (scope.js normQ)
function suraNames(core) {
  return core.suras.map(S => {
    const ar = normQ(S.ar), bare = ar.replace(/^ال/, '');
    const tr = normQ(S.tr).replace(/[-']/g, ' ').replace(/\s+/g, ' ').trim();
    const trBare = tr.replace(/^(al|an|ar|as|at|ad|adh|az|ash|ath) /, '');
    return { n: S.n, ar: [...new Set([ar, bare.length >= 3 ? bare : ar])], en: [...new Set([tr, tr.replace(/ /g, ''), trBare])].filter(x => x.length >= 2) };
  });
}
// «سورة X» (explicit) or «surah X»; a number after the word «surah» too
const SURA_WORD = /(^| )(?:ال)?(?:سوره|سورت|surah|sura|surat|chapter)( |$)/;
function findSura(q, names) {
  let best = null;
  const tryAt = (re, nm, n) => { if (re.test(q) && (!best || nm.length > best.len)) best = { n, len: nm.length }; };
  for (const s of names) {
    for (const nm of s.ar) tryAt(new RegExp(`(?:^| )(?:سوره|سورت|السوره) ${nm}(?: |$)`), nm, s.n);
    for (const nm of s.en) tryAt(new RegExp(`(?:^| )(?:surah|sura|surat|chapter) ${nm}(?: |$)`), nm, s.n);
  }
  if (!best) { const m = q.match(/(?:^| )(?:ال)?(?:سوره|سورت|surah|sura|surat|chapter)(?: رقم| number| no)? (\d{1,3})(?: |$)/); if (m && +m[1] >= 1 && +m[1] <= 114) best = { n: +m[1], len: 0 }; }
  // a few names nobody confuses with another word, without «سورة»: «كم آية في البقرة»
  if (!best) for (const [nm, n] of [['البقره', 2], ['ال عمران', 3], ['المائده', 5], ['الانعام', 6], ['الاعراف', 7], ['الانفال', 8], ['الفاتحه', 1], ['الكهف', 18], ['يس', 36], ['الاخلاص', 112], ['الملك', 67], ['al baqarah', 2], ['al kahf', 18], ['al fatihah', 1], ['al mulk', 67], ['yasin', 36], ['ya sin', 36]])
    if (new RegExp(`(?:^| )${nm}(?: |$)`).test(q)) { best = { n, len: nm.length }; break; }
  return best && best.n;
}

// [id, test(q, en) → bool] — order matters: the most specific first
const R = (s) => new RegExp(s);
const RULES = [
  ['sura_by_number', (q) => R(`(?:^| )(?:ما|من) (?:هي |اسم )?(?:ال)?سوره (?:رقم )?\\d{1,3}(?: |$)|(?:^| )(?:ال)?سوره رقم \\d{1,3}(?: |$)|\\b(?:what|which) (?:is )?(?:the )?(?:surah|sura|chapter) (?:number |no )?\\d{1,3}\\b|\\bsurah number \\d{1,3}\\b`).test(q) && !/(ايه|ايات|verse|ayah)/.test(q)],
  ['sura_verses', (q) => R(`${HOW} (?:عدد )?(?:ال)?(?:ايات|ايه|اية)|(?:ايات|ايه) (?:كم|عددها)|${EN_HOW} (?:verses|ayat|ayahs|ayas)|how long is`).test(q)],
  ['sura_words', (q) => R(`${HOW} (?:عدد )?(?:ال)?كلمات|${EN_HOW} words`).test(q)],
  ['sura_letters', (q) => R(`${HOW} (?:عدد )?(?:ال)?حروف|${EN_HOW} letters`).test(q)],
  ['sura_type', (q) => /(^| )(مكيه|مدنيه|المكيه|المدنيه)( |$)|(اين|متي) نزلت|\b(meccan|medinan|makki|madani|makkan|madinan|where was .* revealed)\b/.test(q)],
  ['sura_order', (q) => /(ترتيب|رقم)( نزول)?( ال)?سوره|ترتيب (ال)?نزول|ترتيبها|رقمها|\b(order of revelation|revelation order|what number is|number of surah)\b/.test(q)],
  ['sura_juz', (q) => /(اي|اين|ما) (ال)?جزء|في اي جزء|\bwhich (juz|part|para)\b|\bjuz\b/.test(q)],
];
// facts about the whole Quran (no surah in the question)
const GLOBAL = [
  ['suras_count', (q) => R(`${HOW} (?:عدد )?(?:ال)?سور(?:ه)?(?: في)? ${QURAN}|${HOW} (?:عدد )?(?:ال)?سور(?: |$)|${EN_HOW} (?:surahs|suras|chapters)\\b`).test(q) && !/(مكيه|مدنيه|meccan|medinan|makki|madani|تبدا|تفتتح|مقطعه|begin|start)/.test(q)],
  ['meccan_count', (q) => /(كم|عدد)( عدد)? (ال)?سور (ال)?(مكيه|مدنيه)|\bhow many (meccan|medinan|makki|madani|makkan|madinan) (surahs|suras|chapters)\b/.test(q)],
  ['verses_count', (q) => R(`${HOW} (?:عدد )?(?:ال)?(?:ايات|ايه|اية)(?: في)? ${QURAN}|${HOW} (?:عدد )?(?:ال)?(?:ايات|ايه)$|${EN_HOW} (?:verses|ayat|ayahs|ayas)\\b.*\\b(?:quran|koran|mushaf)\\b|${EN_HOW} (?:verses|ayat|ayahs)$`).test(q)],
  ['words_count', (q) => R(`${HOW} (?:عدد )?(?:ال)?كلمات(?: في)? ${QURAN}|${EN_HOW} words\\b.*\\b(?:quran|koran|mushaf)\\b`).test(q)],
  ['letters_count', (q) => R(`${HOW} (?:عدد )?(?:ال)?حروف(?: في)? ${QURAN}|${EN_HOW} letters\\b.*\\b(?:quran|koran|mushaf)\\b`).test(q)],
  ['juz_count', (q) => R(`${HOW} (?:عدد )?(?:ال)?(?:اجزاء|جزء)(?: في)?(?: ${QURAN})?(?: |$)|${EN_HOW} (?:juz|ajza|parts|paras|juzs)\\b`).test(q)],
  ['hizb_count', (q) => R(`${HOW} (?:عدد )?(?:ال)?(?:احزاب|حزب|ارباع)(?: في)?(?: ${QURAN})?(?: |$)|${EN_HOW} (?:hizb|hizbs|ahzab)\\b`).test(q)],
  ['pages_count', (q) => R(`${HOW} (?:عدد )?(?:ال)?(?:صفحات|صفحه)(?: في)? ${QURAN}|${EN_HOW} pages\\b.*\\b(?:quran|koran|mushaf)\\b`).test(q)],
  ['sajdas', (q) => /(كم|عدد|ما|اين|مواضع|ماهي)( هي)?( عدد)? (ال)?(سجدات|سجده التلاوه|سجود التلاوه|سجدات التلاوه|مواضع السجود|مواضع السجده|السجدات)|\b(sajdas?|sajdah|prostrations? of recitation|places of prostration)\b/.test(q)],
  ['muqattaat', (q) => /(الحروف المقطعه|حروف مقطعه|الحروف النورانيه|فواتح السور)|\b(disjointed|disconnected|mysterious|muqatta.?at) letters\b|\bmuqattaat\b/.test(q)],
  ['basmala_twice', (q) => /(البسمله|بسم الله الرحمن الرحيم) (مرتين|مكرره|تتكرر)|بسملتين|بسملتان|\bbasmala (twice|two times)|\b(bismillah|basmala) .*(twice|two times)\b/.test(q)],
  ['no_basmala', (q) => /(لا|لم|ما) (تبدا|تبتدي|تفتتح|تستفتح|يبدا|تحتوي|تبتدئ)( على| علي)? ?(بال)?(بسمله|البسمله|بسم الله)|(بدون|بلا|من غير|ليس فيها|ليست فيها) (ال)?بسمله|\b(without|no|doesn ?t (start|begin) with|does not (start|begin) with) (the )?(basmala|bismillah)\b/.test(q)],
  ['basmala_count', (q) => /(كم مره|عدد مرات|كم) (وردت|ذكرت|تكررت|جاءت)? ?(ال)?بسمله|\bhow many times .*(basmala|bismillah)\b/.test(q)],
  ['longest_sura', (q) => /(اطول|اكبر) (سوره|السور)|\b(longest|biggest|largest|longest) (surah|sura|chapter)\b/.test(q)],
  ['shortest_sura', (q) => /(اقصر|اصغر) (سوره|السور)|\b(shortest|smallest) (surah|sura|chapter)\b/.test(q)],
  ['longest_verse', (q) => /(اطول|اكبر) (ايه|الايات|آيه)|\b(longest|biggest|largest) (verse|ayah|aya)\b/.test(q)],
  ['shortest_verse', (q) => /(اقصر|اصغر) (ايه|الايات)|\b(shortest|smallest) (verse|ayah|aya)\b/.test(q)],
  ['first_revealed', (q) => /(اول) (ما|سوره|ايه|ايات|شيء|ما) ?(نزل|نزلت|انزل|انزلت|اوحي|نزولا)|(اول|بدايه|بدء) (نزول )?(الوحي)|\bfirst (revelation|revealed|thing revealed|verses? revealed|surah revealed|sura revealed)\b|\bwhat was (first )?revealed first\b/.test(q)],
  ['first_sura', (q) => /(اول) (سوره) (في )?(ال)?(مصحف|قران)|(ما|ماهي) (هي )?اول سوره$|\bfirst (surah|sura|chapter) (in|of) (the )?(quran|mushaf)\b/.test(q) && !/نزل|revealed/.test(q)],
  ['last_sura', (q) => /(اخر) (سوره) (في )?(ال)?(مصحف|قران)|(ما|ماهي) (هي )?اخر سوره$|\blast (surah|sura|chapter) (in|of) (the )?(quran|mushaf)\b/.test(q) && !/نزل|revealed/.test(q)],
  ['prophets_count', (q) => /(كم|عدد|ما|من هم|اسماء)( هو| هي)?( عدد)? (ال)?(انبياء|الرسل|الانبياء والرسل|الرسل والانبياء)( الذين| المذكورين| المذكورون| المذكوره| الوارد| الواردين| ذكروا| ذكرت)|(كم|عدد)( عدد)? (ال)?(انبياء|رسل)( في)? (ال)?قران|\bhow many prophets\b|\bprophets (mentioned|named) in the (quran|koran)\b|\bnames of (the )?prophets in the quran\b/.test(q)],
  ['pillars_iman', (q) => /(اركان|ركن) (ال)?ايمان|\bpillars of (iman|faith|belief)\b|\barticles of faith\b/.test(q)],
  ['pillars_islam', (q) => /(اركان|ركن|اسس|دعائم) (ال)?اسلام|بني (ال)?اسلام|\b(five )?pillars of islam\b/.test(q)],
  ['ihsan', (q) => /(^| )(ما|ما هو|تعريف|معني|ماهو) (هو )?(ال)?احسان( في الاسلام)?$|\bwhat is ihsan\b|\bdefinition of ihsan\b/.test(q)],
  ['greatest_sura', (q) => /(اعظم|افضل) (سوره|السور)|\b(greatest|best|most excellent) (surah|sura|chapter)\b/.test(q)],
  ['greatest_verse', (q) => /(اعظم|افضل) (ايه|الايات|اية)|\b(greatest|best) (verse|ayah)\b/.test(q)],
  ['third_quran', (q) => /(تعدل|تعادل|تساوي|بمنزله) (ثلث|ثلثي) (ال)?قران|ثلث (ال)?قران|\b(equal|equivalent|equals) (to )?(a |one )?third of (the )?quran\b|\bthird of the quran\b/.test(q)],
  ['names_99', (q) => /(كم|عدد)( عدد)? (اسماء الله|الاسماء الحسني)|\bhow many (names of allah|beautiful names)\b|\b99 names\b/.test(q)],
  ['daily_prayers', (q) => /(كم|عدد)( عدد)? (ال)?(صلوات|الصلوات|صلاه)( المفروضه| الواجبه| في اليوم| اليوميه| المكتوبه)|(كم|عدد)( عدد)? (ال)?صلوات$|\bhow many (daily |obligatory |compulsory )?prayers\b/.test(q)],
];
// «كم مرة ذكر اسم موسى» → the word
function wordAsked(q) {
  const m = q.match(/(?:كم مره|عدد مرات|كم عدد مرات|كم)( (?:تم )?(?:ذكر|ذكرت|وردت|ورد|جاء|جاءت|تكرر|تكررت|ذكره|اتذكر|انذكر|اتذكرت))( (?:اسم|كلمه|لفظ|لفظه|لفظ الجلاله|سيدنا|النبي))? (\S+)/);
  if (m) { const w = m[3]; return /^(في|القران|سوره|ايه|اسم|كلمه|البسمله|بسمله)$/.test(w) ? null : w; }
  const e = q.match(/\bhow (?:many times|often) (?:is|was|does|did|are)? ?(?:the )?(?:word |name )?(?:of )?(?:prophet )?([a-z؀-ۿ]+)/);
  if (e) return EN_NAMES[e[1]] || (/[؀-ۿ]/.test(e[1]) ? e[1] : null);
  const e2 = q.match(/\b(?:how many times|how often) (?:is |was )?(?:the )?(?:word |name )?([a-z]+) (?:mentioned|used|repeated|cited|appear|occur)/);
  if (e2) return EN_NAMES[e2[1]] || null;
  return null;
}
const EN_NAMES = { musa: 'موسى', moses: 'موسى', isa: 'عيسى', jesus: 'عيسى', muhammad: 'محمد', mohammed: 'محمد', allah: 'الله', ibrahim: 'إبراهيم', abraham: 'إبراهيم',
  maryam: 'مريم', mary: 'مريم', yusuf: 'يوسف', joseph: 'يوسف', nuh: 'نوح', noah: 'نوح', adam: 'آدم', harun: 'هارون', aaron: 'هارون', dawud: 'داود', david: 'داود',
  sulayman: 'سليمان', solomon: 'سليمان', pharaoh: 'فرعون', firaun: 'فرعون', paradise: 'الجنة', jannah: 'الجنة', hell: 'جهنم', jahannam: 'جهنم', satan: 'الشيطان', iblis: 'إبليس',
  prayer: 'الصلاة', salah: 'الصلاة', zakat: 'الزكاة', patience: 'الصبر', mercy: 'الرحمة' };

// the prophets named in the Quran, each with a verse that names him (tests/facts.test.mjs checks the verse contains the name)
export const PROPHETS = [['آدم', 'Adam', '2:31'], ['إدريس', 'Idris (Enoch)', '19:56'], ['نوح', 'Nuh (Noah)', '71:1'], ['هود', 'Hud', '11:50'], ['صالح', 'Salih', '11:61'],
  ['إبراهيم', 'Ibrahim (Abraham)', '2:124'], ['لوط', 'Lut (Lot)', '37:133'], ['إسماعيل', 'Ismail (Ishmael)', '19:54'], ['إسحاق', 'Ishaq (Isaac)', '6:84'], ['يعقوب', 'Yaqub (Jacob)', '6:84'],
  ['يوسف', 'Yusuf (Joseph)', '6:84'], ['أيوب', 'Ayyub (Job)', '21:83'], ['شعيب', 'Shuayb', '11:84'], ['موسى', 'Musa (Moses)', '19:51'], ['هارون', 'Harun (Aaron)', '19:53'],
  ['يونس', 'Yunus (Jonah)', '37:139'], ['داود', 'Dawud (David)', '6:84'], ['سليمان', 'Sulayman (Solomon)', '6:84'], ['إلياس', 'Ilyas (Elijah)', '37:123'], ['اليسع', 'Al-Yasa (Elisha)', '6:86'],
  ['ذو الكفل', 'Dhul-Kifl', '21:85'], ['زكريا', 'Zakariya (Zechariah)', '6:85'], ['يحيى', 'Yahya (John)', '6:85'], ['عيسى', 'Isa (Jesus)', '6:85'], ['محمد', 'Muhammad', '48:29']];

// hadith-stated facts: [id, HadeethEnc id, verses (refs), answer ar, answer en]
const HADITH_FACTS = {
  pillars_islam: { had: [65000], refs: [], ar: 'أركان الإسلام خمسة: شهادة أن لا إله إلا الله وأن محمدًا رسول الله، وإقام الصلاة، وإيتاء الزكاة، وصوم رمضان، وحج البيت.', en: 'The pillars of Islam are five: the testimony that there is no god but Allah and that Muhammad is His Messenger, establishing prayer, giving zakat, fasting Ramadan, and pilgrimage to the House.' },
  pillars_iman: { had: [4563], refs: [], ar: 'أركان الإيمان ستة: أن تؤمن بالله، وملائكته، وكتبه، ورسله، واليوم الآخر، وتؤمن بالقدر خيره وشره.', en: 'The pillars of faith are six: to believe in Allah, His angels, His books, His messengers, the Last Day, and in the divine decree, its good and its bad.' },
  ihsan: { had: [4563], refs: [], ar: 'الإحسان: أن تعبد الله كأنك تراه، فإن لم تكن تراه فإنه يراك.', en: 'Ihsan is to worship Allah as though you see Him, and if you do not see Him, He sees you.' },
  greatest_sura: { had: [10112], refs: ['1:1-7'], ar: 'أعظم سورة في القرآن سورة الفاتحة: ﴿الحمد لله رب العالمين﴾، هي السبع المثاني والقرآن العظيم.', en: 'The greatest surah of the Quran is Al-Fatihah («All praise is for Allah, Lord of the worlds»): the seven oft-repeated verses and the Great Quran.' },
  greatest_verse: { had: [65059], refs: ['2:255'], ar: 'أعظم آية في كتاب الله آية الكرسي: ﴿الله لا إله إلا هو الحي القيوم﴾ (البقرة: ٢٥٥).', en: 'The greatest verse in the Book of Allah is Ayat al-Kursi: «Allah — there is no god except Him, the Ever-Living, the Sustainer of all» (2:255).' },
  third_quran: { had: [65261, 65262], refs: ['112:1-4'], ar: 'سورة الإخلاص ﴿قل هو الله أحد﴾ تعدل ثلث القرآن.', en: 'Surah Al-Ikhlas («Say: He is Allah, the One») equals a third of the Quran.' },
  first_revealed: { had: [66303], refs: ['96:1-5'], ar: 'أول ما نزل من القرآن صدرُ سورة العلق: ﴿اقرأ باسم ربك الذي خلق﴾، نزل على النبي ﷺ في غار حراء.', en: 'The first of the Quran to be revealed was the opening of Surah Al-ʿAlaq: «Read in the name of your Lord who created», revealed to the Prophet ﷺ in the cave of Hira.' },
  names_99: { had: [10416], refs: [], ar: 'لله تسعة وتسعون اسمًا، مائة إلا واحدًا، من أحصاها دخل الجنة.', en: 'Allah has ninety-nine names, one hundred less one; whoever memorises them enters Paradise.' },
  daily_prayers: { had: [3390], refs: [], ar: 'الصلوات المفروضة خمس صلوات في كل يوم وليلة.', en: 'The obligatory prayers are five prayers in every day and night.' },
};

// Arabic counted nouns (the figure may be written in Arabic-Indic digits): 1 → «آية واحدة», 2 → «آيتان / آيتين»,
// 3–10 → plural «آيات», 11 and more → singular «آية» (by the last two digits: 103 آيات, 111 آية)
const NOUN = { aya: ['آية واحدة', 'آيتان', 'آيتين', 'آيات', 'آية'], sura: ['سورة واحدة', 'سورتان', 'سورتين', 'سور', 'سورة'], marra: ['مرة واحدة', 'مرتان', 'مرتين', 'مرات', 'مرة'],
  kalima: ['كلمة واحدة', 'كلمتان', 'كلمتين', 'كلمات', 'كلمة'], harf: ['حرف واحد', 'حرفان', 'حرفين', 'أحرف', 'حرفًا'] };
export function counted(s, kind, kase = 'n') {
  const n = +String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), w = NOUN[kind], k = n % 100;
  if (n === 1) return w[0];
  if (n === 2) return kase === 'n' ? w[1] : w[2];
  return `${s} ${k >= 3 && k <= 10 ? w[3] : w[4]}`;
}
const T = {
  ar: {
    counted: 'محسوب في متصفحك من نص المصحف المعروض (Tanzil، رواية حفص عن عاصم) — رقم محسوب لا مكتوب باليد.',
    countedMeta: 'من بيانات مصحف المدينة في مشروع Tanzil (quran-data.xml).',
    byHadith: 'من نص حديث صحيح (موسوعة الأحاديث النبوية HadeethEnc)؛ الجملة الأولى تعيد ألفاظ الحديث، والحديث بنصه أدناه.',
    wordNote: 'العدّ على الكلمة نفسها مع ما يتصل بها كتابةً (و ف ب ك ل وأل)، على الرسم الإملائي المبسط، دون جمع المشتقات؛ لذلك قد يختلف الرقم قليلًا عن كتب الإحصاء التي تعدّ بطريقة أخرى.',
    countNote: 'رؤوس الآي يعدّها علماء العدد بطرق متعددة؛ هذا عدد المصحف المعروض (العدّ الكوفي لرواية حفص).',
    wordsNote: 'الكلمة = ما بين مسافتين في رسم المصحف (دون البسملة في أول السور إلا الفاتحة)؛ والحرف = الحروف المكتوبة دون علامات الشكل. تختلف الكتب في طريقة العدّ.',
    suras: (n, m, d) => `عدد سور القرآن الكريم ${n} سورة: ${m} مكية و${d} مدنية (تصنيف Tanzil).`,
    meccan: (m, d) => `في القرآن ${m} سورة مكية و${d} سورة مدنية (تصنيف Tanzil).`,
    verses: (n) => `عدد آيات القرآن الكريم ${n} آية.`,
    words: (n) => `عدد كلمات القرآن الكريم في رسم المصحف المعروض: ${n} كلمة.`,
    letters: (n) => `عدد حروف القرآن الكريم في رسم المصحف المعروض: ${n} حرفًا.`,
    juz: (n) => `القرآن الكريم ${n} جزءًا.`,
    hizb: (n, q) => `القرآن الكريم ${n} حزبًا (كل جزء حزبان)، وكل حزب أربعة أرباع: ${q} ربعًا.`,
    pages: (n) => `مصحف المدينة النبوية ${n} صفحة.`,
    sajdas: (n) => `مواضع سجود التلاوة المعلَّمة في المصحف ${n} موضعًا، وهذه هي:`,
    muq: (n) => `${counted(n, 'sura')} تبدأ بالحروف المقطعة.`,
    noBasmala: 'السورة التي لا تبدأ بالبسملة هي سورة التوبة (براءة)، وهي السورة التاسعة.',
    twice: 'سورة النمل فيها البسملة مرتين: في أولها، وفي الآية ٣٠ ﴿إنه من سليمان وإنه بسم الله الرحمن الرحيم﴾.',
    basmalaCount: (n) => `وردت ﴿بسم الله الرحمن الرحيم﴾ في المصحف ${n} مرة: في أول كل سورة إلا التوبة، ومرة في سورة النمل (الآية ٣٠).`,
    longestSura: (name, a, w) => `أطول سورة في القرآن سورة ${name}: ${counted(a, 'aya')} و${counted(w, 'kalima')}.`,
    shortestSura: (name, a, w) => `أقصر سورة في القرآن سورة ${name}: ${counted(a, 'aya')} و${counted(w, 'kalima')}.`,
    longestVerse: (ref, w) => `أطول آية في القرآن ${ref} (آية الدَّين): ${w} كلمة.`,
    shortestVerse: (n) => `${counted(n, 'aya')} مكتوبة في المصحف بكلمة واحدة؛ منها الحروف المقطعة التي عُدّت آية (مثل ﴿طه﴾ و﴿يس﴾) وكلمات مثل ﴿مدهامتان﴾.`,
    firstSura: 'أول سورة في ترتيب المصحف سورة الفاتحة، وآخرها سورة الناس.',
    lastSura: 'آخر سورة في ترتيب المصحف سورة الناس (١١٤)، وأولها سورة الفاتحة.',
    prophets: (n) => `ذُكر في القرآن بأسمائهم ${n} نبيًّا ورسولًا، هذه أسماؤهم مع آية تذكر كل اسم:`,
    suraVerses: (name, n) => `سورة ${name}: ${counted(n, 'aya')}.`,
    suraWords: (name, n) => `سورة ${name}: ${counted(n, 'kalima')}.`,
    suraLetters: (name, n) => `سورة ${name}: ${counted(n, 'harf')}.`,
    suraType: (name, t, o) => `سورة ${name} ${t}، وترتيبها في النزول ${o} (Tanzil).`,
    suraOrder: (name, n, o) => `سورة ${name} رقمها ${n} في ترتيب المصحف، و${o} في ترتيب النزول (Tanzil).`,
    suraNum: (n, name, a, t) => `السورة رقم ${n} هي سورة ${name}: ${counted(a, 'aya')}، ${t}.`,
    suraJuz: (name, j1, j2, p1, p2) => j1 === j2 ? `سورة ${name} في الجزء ${j1}، من الصفحة ${p1} إلى ${p2}.` : `سورة ${name} من الجزء ${j1} إلى الجزء ${j2}، من الصفحة ${p1} إلى ${p2}.`,
    word: (w, n, v, s) => `وردت «${w}» ${counted(n, 'marra', 'a')} في ${counted(v, 'aya', 'g')} من ${counted(s, 'sura', 'g')}.`,
    wordNone: (w) => `لم أجد «${w}» بهذه الصيغة في نص المصحف؛ جرّب صيغة أخرى في خدمة الإحصاءات.`,
    meccanW: 'مكية', medinanW: 'مدنية',
  },
  en: {
    counted: 'Counted in your browser from the Mushaf text shown (Tanzil, Hafs from ʿAsim) — a computed figure, not one typed by hand.',
    countedMeta: 'From the Madinah Mushaf data of the Tanzil project (quran-data.xml).',
    byHadith: 'From the text of an authentic hadith (HadeethEnc); the first line repeats the hadith’s words, the hadith is quoted in full below.',
    wordNote: 'Counted on the word itself with what is attached to it in writing (wa, fa, bi, ka, li and al-), on the simplified spelling, without derived forms; books that count otherwise may give a slightly different figure.',
    countNote: 'Scholars of verse-counting count verse endings in several ways; this is the count of the Mushaf shown (the Kufan count of the Hafs reading).',
    wordsNote: 'A word = what lies between two spaces in the Mushaf script (without the basmala at the head of surahs, except Al-Fatihah); a letter = the written letters without vowel marks. Books count in different ways.',
    suras: (n, m, d) => `The Holy Quran has ${n} surahs: ${m} Meccan and ${d} Medinan (Tanzil classification).`,
    meccan: (m, d) => `The Quran has ${m} Meccan and ${d} Medinan surahs (Tanzil classification).`,
    verses: (n) => `The Holy Quran has ${n} verses.`,
    words: (n) => `The Holy Quran has ${n} words in the Mushaf script shown.`,
    letters: (n) => `The Holy Quran has ${n} letters in the Mushaf script shown.`,
    juz: (n) => `The Holy Quran is divided into ${n} juz (parts).`,
    hizb: (n, q) => `The Holy Quran has ${n} hizb (two per juz), each of four quarters: ${q} quarters.`,
    pages: (n) => `The Madinah Mushaf has ${n} pages.`,
    sajdas: (n) => `The Mushaf marks ${n} places of prostration of recitation; here they are:`,
    muq: (n) => `${n} surahs open with disjoined letters (al-ḥurūf al-muqaṭṭaʿah).`,
    noBasmala: 'The surah that does not begin with the basmala is Surah At-Tawbah (Barāʾah), the ninth surah.',
    twice: 'Surah An-Naml has the basmala twice: at its head, and in verse 30 «It is from Solomon, and it is: In the name of Allah, the Most Compassionate, the Most Merciful».',
    basmalaCount: (n) => `«In the name of Allah, the Most Compassionate, the Most Merciful» occurs ${n} times in the Mushaf: at the head of every surah except At-Tawbah, and once in Surah An-Naml (27:30).`,
    longestSura: (name, a, w) => `The longest surah is ${name}: ${a} verses and ${w} words.`,
    shortestSura: (name, a, w) => `The shortest surah is ${name}: ${a} verses and ${w} words.`,
    longestVerse: (ref, w) => `The longest verse of the Quran is ${ref} (the verse of debt): ${w} words.`,
    shortestVerse: (n) => `${n} verses are written in the Mushaf as a single word, among them disjoined letters counted as a verse (such as Ṭā Hā and Yā Sīn) and words such as «Mudhāmmatān».`,
    firstSura: 'The first surah in the order of the Mushaf is Al-Fatihah; the last is An-Nas.',
    lastSura: 'The last surah in the order of the Mushaf is An-Nas (114); the first is Al-Fatihah.',
    prophets: (n) => `${n} prophets and messengers are named in the Quran; here are their names, each with a verse that names him:`,
    suraVerses: (name, n) => `Surah ${name}: ${n} verses.`,
    suraWords: (name, n) => `Surah ${name}: ${n} words.`,
    suraLetters: (name, n) => `Surah ${name}: ${n} letters.`,
    suraType: (name, t, o) => `Surah ${name} is ${t}; it is number ${o} in the order of revelation (Tanzil).`,
    suraOrder: (name, n, o) => `Surah ${name} is number ${n} in the order of the Mushaf and ${o} in the order of revelation (Tanzil).`,
    suraNum: (n, name, a, t) => `Surah number ${n} is ${name}: ${a} verses, ${t}.`,
    suraJuz: (name, j1, j2, p1, p2) => j1 === j2 ? `Surah ${name} is in juz ${j1}, pages ${p1} to ${p2}.` : `Surah ${name} runs from juz ${j1} to juz ${j2}, pages ${p1} to ${p2}.`,
    word: (w, n, v, s) => `«${w}» occurs ${n} times, in ${v} verses of ${s} surahs.`,
    wordNone: (w) => `«${w}» was not found in this form in the Mushaf text; try another form in the Statistics service.`,
    meccanW: 'Meccan', medinanW: 'Medinan',
  },
};

// ctx: { core, plain (array of search_ar), meta (mushaf_meta.json), suraOf (Uint8Array), lang: 'ar'|'en', num(n) → string }
// returns null, or { id, lang, answer, details[], verses[idx], hadiths[id], method, note, actions[] }
export function factAnswer(query, ctx) {
  const q = prep(query);
  if (!q || q.length > 160) return null;
  const en = !/[ء-ي]/.test(q);
  const L = ctx.lang === 'en' || en ? 'en' : 'ar', t = T[L], N = ctx.num || String, core = ctx.core;
  const out = (id, answer, o = {}) => ({ id, lang: L, answer, details: [], verses: [], hadiths: [], method: t.counted, note: null, actions: [], ...o });
  const sname = (n) => L === 'ar' ? core.suras[n - 1].ar : `${core.suras[n - 1].tr} (${core.suras[n - 1].en})`;
  const ref = (i) => `${ctx.suraOf[i]}:${i - core.suras[ctx.suraOf[i] - 1].first + 1}`;
  const idxOf = (r) => { const [s, a] = r.split(':').map(Number); return core.suras[s - 1].first + a - 1; };
  const range = (r) => { const m = r.match(/^(\d+):(\d+)(?:-(\d+))?$/); const a = idxOf(`${m[1]}:${m[2]}`), b = m[3] ? idxOf(`${m[1]}:${m[3]}`) : a; return Array.from({ length: b - a + 1 }, (_, k) => a + k); };

  // 1) word occurrences
  let w = wordAsked(q);
  if (w && /[ء-ي]/.test(w)) {
    // the visitor's own spelling (normQ wrote ة as ه): the token of the question that normalises to the same word
    const tok = String(query).split(/\s+/).map(x => x.replace(/[؟?!.,،:;«»"()]/g, '')).find(x => normQ(x) === w);
    if (tok) w = tok;
  }
  if (w && ctx.plain) {
    const s = wordStats(core, ctx.plain, w, 'word', ctx.suraOf);
    const shown = w;
    if (!s || !s.total) return out('word_count', t.wordNone(shown), { note: t.wordNote, actions: [{ kind: 'stats', word: w }] });
    return out('word_count', t.word(shown, N(s.total), N(s.verses), N(s.suras)), { note: t.wordNote,
      details: s.bySura.slice(0, 5).map(([n, c]) => `${sname(n)}: ${N(c)}`), verses: [s.first, s.last].filter((x, k, a) => x != null && a.indexOf(x) === k), actions: [{ kind: 'stats', word: w }] });
  }

  // 2) a surah named in the question
  const names = ctx._names || (ctx._names = suraNames(core));
  const sn = findSura(q, names);
  if (sn) {
    const S = core.suras[sn - 1], tp = S.type === 'meccan' ? t.meccanW : t.medinanW;
    for (const [id, test] of RULES) {
      if (!test(q)) continue;
      if (id === 'sura_by_number') return out(id, t.suraNum(N(sn), sname(sn), N(S.ayas), tp), { verses: [S.first], actions: [{ kind: 'read', sura: sn }] });
      if (id === 'sura_verses') return out(id, t.suraVerses(sname(sn), N(S.ayas)), { note: t.countNote, verses: [S.first], actions: [{ kind: 'read', sura: sn }, { kind: 'stats', sura: sn }] });
      if (id === 'sura_words' || id === 'sura_letters') {
        if (!ctx.meta || !ctx.plain) return null;
        const st = suraStats(core, ctx.plain, ctx.meta, sn, ctx.suraOf);
        return out(id, id === 'sura_words' ? t.suraWords(sname(sn), N(st.words)) : t.suraLetters(sname(sn), N(st.letters)), { note: t.wordsNote, verses: [S.first], actions: [{ kind: 'stats', sura: sn }] });
      }
      if (id === 'sura_type') return out(id, t.suraType(sname(sn), tp, N(S.order)), { method: t.countedMeta, verses: [S.first], actions: [{ kind: 'read', sura: sn }] });
      if (id === 'sura_order') return out(id, t.suraOrder(sname(sn), N(sn), N(S.order)), { method: t.countedMeta, verses: [S.first], actions: [{ kind: 'read', sura: sn }] });
      if (id === 'sura_juz') {
        if (!ctx.meta) return null;
        const st = suraStats(core, ctx.plain || [], ctx.meta, sn, ctx.suraOf);
        return out(id, t.suraJuz(sname(sn), N(st.juz[0]), N(st.juz[1]), N(st.pages[0]), N(st.pages[1])), { method: t.countedMeta, verses: [S.first], actions: [{ kind: 'read', sura: sn }] });
      }
    }
    if (RULES[0][1](q)) return out('sura_by_number', t.suraNum(N(sn), sname(sn), N(S.ayas), tp), { verses: [S.first], actions: [{ kind: 'read', sura: sn }] });
  }
  // a surah is named but the question is not one of the surah facts: only the facts that name that surah themselves
  // are kept («سورة الإخلاص تعدل ثلث القرآن»); «أطول آية في سورة آل عمران» is not answered with the whole Quran's
  const SURA_OK = new Set(['third_quran', 'greatest_sura', 'greatest_verse', 'first_revealed', 'no_basmala', 'basmala_twice']);

  // 3) the whole Quran
  for (const [id, test] of GLOBAL) {
    if (!test(q)) continue;
    if (sn && !SURA_OK.has(id)) return null;
    const H = HADITH_FACTS[id];
    if (H) return out(id, L === 'ar' ? H.ar : H.en, { method: t.byHadith, hadiths: H.had, verses: H.refs.flatMap(range),
      actions: id === 'names_99' ? [{ kind: 'tool', tool: 'asma' }] : id === 'daily_prayers' ? [{ kind: 'tool', tool: 'prayer' }] : id === 'greatest_sura' ? [{ kind: 'read', sura: 1 }] : id === 'third_quran' ? [{ kind: 'read', sura: 112 }] : id === 'first_revealed' ? [{ kind: 'read', sura: 96 }] : [] });
    const meccan = core.suras.filter(S => S.type === 'meccan').length;
    if (id === 'suras_count') return out(id, t.suras(N(core.suras.length), N(meccan), N(core.suras.length - meccan)), { actions: [{ kind: 'stats' }] });
    if (id === 'meccan_count') return out(id, t.meccan(N(meccan), N(core.suras.length - meccan)), { method: t.countedMeta, actions: [{ kind: 'stats' }] });
    if (id === 'verses_count') return out(id, t.verses(N(core.verses.length)), { note: t.countNote, actions: [{ kind: 'stats' }] });
    if (id === 'words_count' || id === 'letters_count') {
      const tt = ctx._tot || (ctx._tot = totals(core, ctx.suraOf));
      return out(id, id === 'words_count' ? t.words(N(tt.words)) : t.letters(N(tt.letters)), { note: t.wordsNote, actions: [{ kind: 'stats' }] });
    }
    if (!ctx.meta && ['juz_count', 'hizb_count', 'pages_count', 'sajdas'].includes(id)) return null;
    if (id === 'juz_count') return out(id, t.juz(N(ctx.meta.juz.length)), { method: t.countedMeta });
    if (id === 'hizb_count') return out(id, t.hizb(N(ctx.meta.quarters.length / 4), N(ctx.meta.quarters.length)), { method: t.countedMeta });
    if (id === 'pages_count') return out(id, t.pages(N(ctx.meta.pages.length)), { method: t.countedMeta });
    if (id === 'sajdas') {
      const s = ctx.meta.sajdas;
      return out(id, t.sajdas(N(s.length)), { method: t.countedMeta, verses: s.map(x => x[0]), details: s.map(x => `${sname(ctx.suraOf[x[0]])} ${N(ref(x[0]).split(':')[1])}`) });
    }
    if (id === 'muqattaat') {
      const list = core.suras.filter(S => isMuqattaat(firstWords(core, S, ctx.suraOf)));
      return out(id, t.muq(N(list.length)), { verses: list.map(S => S.first), details: list.map(S => sname(S.n)) });
    }
    if (id === 'no_basmala') {
      const none = core.suras.filter(S => !normAr(core.verses[S.first]).startsWith('بسم الله الرحمن الرحيم'));
      if (none.length !== 1 || none[0].n !== 9) return null;
      return out(id, t.noBasmala, { verses: [core.suras[8].first], actions: [{ kind: 'read', sura: 9 }] });
    }
    if (id === 'basmala_twice' || id === 'basmala_count') {
      const inside = basmalaInside(core);
      if (id === 'basmala_twice') return inside.length === 1 && ctx.suraOf[inside[0]] === 27 ? out(id, t.twice, { verses: inside, actions: [{ kind: 'read', sura: 27 }] }) : null;
      const heads = core.suras.filter(S => normAr(core.verses[S.first]).startsWith('بسم الله الرحمن الرحيم')).length;
      return out(id, t.basmalaCount(N(heads + inside.length)), { verses: inside });
    }
    if (id === 'longest_sura' || id === 'shortest_sura') {
      const by = [...core.suras].sort((a, b) => id === 'longest_sura' ? b.ayas - a.ayas : a.ayas - b.ayas);
      const S = by[0];
      if (by[1].ayas === S.ayas && id === 'longest_sura') return null;
      // the shortest by verses (3) — Al-Kawthar, Al-ʿAsr and An-Nasr have 3: the one with the fewest words is named
      const three = core.suras.filter(x => x.ayas === S.ayas).map(x => ({ x, w: suraWordCount(core, x, ctx.suraOf) })).sort((a, b) => a.w - b.w);
      const pick = id === 'shortest_sura' ? three[0] : { x: S, w: suraWordCount(core, S, ctx.suraOf) };
      return out(id, (id === 'longest_sura' ? t.longestSura : t.shortestSura)(sname(pick.x.n), N(pick.x.ayas), N(pick.w)), { note: t.wordsNote, verses: [pick.x.first], actions: [{ kind: 'read', sura: pick.x.n }, { kind: 'stats', sura: pick.x.n }],
        details: id === 'shortest_sura' ? three.slice(1).map(o => `${sname(o.x.n)}: ${N(o.x.ayas)} — ${N(o.w)}`) : [] });
    }
    if (id === 'longest_verse' || id === 'shortest_verse') {
      let best = 0, bestN = 0; const ones = [];
      for (let i = 0; i < core.verses.length; i++) { const n = verseWords(core, i, ctx.suraOf).length; if (n > bestN) { bestN = n; best = i; } if (n === 1) ones.push(i); }
      if (id === 'longest_verse') return out(id, t.longestVerse(L === 'ar' ? `آية ${sname(ctx.suraOf[best])} ${N(ref(best).split(':')[1])}` : ref(best), N(bestN)), { note: t.wordsNote, verses: [best] });
      return out(id, t.shortestVerse(N(ones.length)), { note: t.wordsNote, verses: ones.slice(0, 40) });
    }
    if (id === 'first_sura') return out(id, t.firstSura, { verses: [0, core.suras[113].first], actions: [{ kind: 'read', sura: 1 }] });
    if (id === 'last_sura') return out(id, t.lastSura, { verses: [core.suras[113].first], actions: [{ kind: 'read', sura: 114 }] });
    if (id === 'prophets_count') {
      return out(id, t.prophets(N(PROPHETS.length)), { method: L === 'ar' ? 'أسماء الأنبياء كما وردت في نص المصحف، مع آية لكل اسم (يتحقق منها اختبار آلي).' : 'The names as they occur in the Mushaf text, each with a verse that names him (checked by an automatic test).',
        details: PROPHETS.map(([a, e, r]) => `${L === 'ar' ? a : e} — ${r}`), verses: [...new Set(PROPHETS.map(p => idxOf(p[2])))] });
    }
  }
  return null;
}

const MUQ = new Set(['الم', 'المص', 'الر', 'المر', 'كهيعص', 'طه', 'طسم', 'طس', 'يس', 'ص', 'حم', 'ق', 'ن']);
function firstWords(core, S) { return normAr(core.verses[S.first]).split(' ').filter(Boolean).slice(S.n === 1 || S.n === 9 ? 0 : 4); }
// «الم» opens a surah as a verse of its own (2:1); «ألم تر» (105:1) and «ألم نشرح» (94:1) are a question, not letters
const isMuqattaat = (w) => w.length > 0 && MUQ.has(w[0]) && !(w[0] === 'الم' && w.length > 1);
function basmalaInside(core) {
  const out = [];
  for (const S of core.suras) for (let k = 0; k < S.ayas; k++) {
    const v = normAr(core.verses[S.first + k]), at = v.indexOf('بسم الله الرحمن الرحيم');
    if (at > 0 || (at === 0 && k > 0)) out.push(S.first + k);
  }
  return out;
}
function suraWordCount(core, S, suraOf) { let n = 0; for (let k = 0; k < S.ayas; k++) n += verseWords(core, S.first + k, suraOf).length; return n; }
export { letterCount };
