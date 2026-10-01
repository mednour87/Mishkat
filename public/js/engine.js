// Mishkat query engine v2 — runs unchanged in the browser and in Node (tests).
//
// Safety contract ("golden rule"):
//   1. Verse text only ever comes from core.verses (Tanzil, verbatim).
//   2. Explanatory sentences are only ever *verbatim slices* of a vetted tafsir,
//      each labelled with its source and verse.
//   3. Everything else is a fixed, hand-written template (MSG below).
//   4. The optional LLM may (a) flag ruling/personal questions, (b) propose
//      search keywords (used for retrieval only, never shown), (c) pick verse ids
//      and tafsir-sentence ids from CLOSED lists. All its output is verified;
//      anything outside the lists is dropped.
//   5. When evidence is insufficient the engine abstains.
//   6. Reference-pack sources (subject index, glossary, Dorar, Bayenat) only
//      select or point; their text is shown as published, with its source.
import { GLOSSARY, TERM_CUE, termFor, isBareTerm } from './glossary.js';

// ---------------------------------------------------------------- text utils
const AR_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ]/g;
export const AR_RANGE = /[؀-ۿ]/;
const DIGITS_AR = '٠١٢٣٤٥٦٧٨٩', DIGITS_FA = '۰۱۲۳۴۵۶۷۸۹';

export function toAsciiDigits(s) {
  return s.replace(/[٠-٩۰-۹]/g, d => {
    const i = DIGITS_AR.indexOf(d);
    return String(i >= 0 ? i : DIGITS_FA.indexOf(d));
  });
}

export function normAr(s) {
  return toAsciiDigits(s)
    .replace(AR_MARKS, '')
    .replace(/[آأإٱٲٳ]/g, 'ا')
    .replace(/ى/g, 'ي').replace(/ی/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي').replace(/ک/g, 'ك')
    .replace(/ء/g, '')
    .replace(/[^ء-ي0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function normLatin(s) {
  return toAsciiDigits(s).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`´]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

const AR_PREFIX = ['وال', 'فال', 'بال', 'كال', 'لل', 'ال'];
const AR_SUFFIX = ['هما', 'كما', 'ها', 'هم', 'هن', 'كم', 'كن', 'نا', 'ان', 'ات', 'ون', 'ين', 'وا', 'يه', 'ه', 'ي'];
export function stemAr(w) {
  for (const p of AR_PREFIX) {
    if (w.startsWith(p) && w.length - p.length >= 2) { w = w.slice(p.length); break; }
  }
  let changed = true;
  while (changed && w.length > 3) {
    changed = false;
    for (const s of AR_SUFFIX) {
      const min = s === 'ات' ? 4 : 3;
      if (w.endsWith(s) && w.length - s.length >= min) { w = w.slice(0, -s.length); changed = true; break; }
    }
  }
  return w;
}

export function stemLatin(w) {
  // light verb endings (en: spending → spend)
  if (w.length > 6 && /(ez|er|ent)$/.test(w) && !/(ier|eer)$/.test(w)) return w.replace(/(ez|er|ent)$/, '');
  if (w.length > 6 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && w.endsWith('es') && !w.endsWith('ses')) return w.slice(0, -1);
  if (w.length > 3 && (w.endsWith('s') || w.endsWith('x')) && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

const STOP = {
  ar: new Set('في من على الى إلى عن ما ماذا متى اين أين كيف لماذا هل هو هي هم انا أنا انت نحن ذلك هذه هذا التي الذي الذين ان أن إن او أو ثم قد لا لم لن كل بعض عند مع يا الا إلا قال ايه اية ايات آية آيات القران القرآن سوره سورة يقول ذكر تحدث لو ولو كان كانت اذا إذا حتى بل لكن ولكن فيه فيها به بها له لها لهم منه منهم عليه عليهم كما غير بين اريد أريد اعرف أعرف معنى شرح اذكر'.split(' ').map(normAr)),
  en: new Set('the a an of and or in on at to for from about with by is are was were be been what which who whom whose when where why how does do did say says said quran koran verse verses ayah ayat surah sura chapter tell me show find please that this these those it its as into there their them they he she his her i you we us our your can could would should will explain meaning mean'.split(' ')),
};
// words present in a large share of verses: ignored when other words are given
const UBIQ = { ar: new Set(['له', 'رب', 'ربك', 'ربه', 'لله']), en: new Set(['allah', 'god', 'lord']) };

export function tokens(text, lang, { stem = true, stop = true } = {}) {
  const norm = lang === 'ar' ? normAr(text) : normLatin(text);
  const out = [];
  for (const w of norm.split(' ')) {
    if (!w || (stop && STOP[lang] && STOP[lang].has(w))) continue;
    if (lang !== 'ar' && w.length < 2) continue;
    out.push(stem ? (lang === 'ar' ? stemAr(w) : stemLatin(w)) : w);
  }
  return out;
}

export function detectLang(q, uiLang = 'ar') {
  // Mishkat speaks Arabic and English: any text without Arabic letters is searched in English
  return AR_RANGE.test(q) ? 'ar' : 'en';
}

// Sentence splitter that returns exact substrings of the source.
export function sentences(text) {
  const out = [];
  const re = /[^.!?؟؛;]+[.!?؟؛;]*/g;
  let m;
  while ((m = re.exec(text))) {
    const s = m[0].trim();
    if (s.length > 1 && !/^\d+\.?$/.test(s)) out.push(s);
  }
  return out;
}

export function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function levenshtein(a, b, max = 3) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i; let rowMin = dp[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp; rowMin = Math.min(rowMin, dp[j]);
    }
    if (rowMin > max) return max + 1;
  }
  return dp[b.length];
}

// ------------------------------------------------------------------ messages
function arCount(n, one, two, few, many) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

export const MSG = {
  ar: {
    sura: (s) => `سورة ${s.ar} (${s.tr})، ${s.type === 'meccan' ? 'مكية' : 'مدنية'}، عدد آياتها ${s.ayas}، وترتيبها في المصحف ${s.n}.`,
    verse: (r) => `الآية ${r}`,
    range: (r) => `الآيات ${r}`,
    exact: (n) => n === 1 ? 'هذا النص موجود بلفظه في القرآن الكريم في الموضع التالي:' : `هذا النص موجود بلفظه في القرآن الكريم في ${arCount(n, 'موضع واحد', 'موضعين', 'مواضع', 'موضعًا')}:`,
    near: (r) => `لم يُعثر على هذا النص بلفظه، وأقرب آية إليه هي ${r}، وفيها اختلاف في الألفاظ المظللة. اللفظ الصحيح كما في المصحف:`,
    merged: (a, b) => `يبدو أن هذا النص يجمع بين آيتين: ${a} و${b}. انتبه إلى الفرق بينهما:`,
    notFound: 'لم يُعثر على هذا النص في القرآن الكريم (رواية حفص، نص مشروع تنزيل). قد يكون حديثًا أو قولًا مأثورًا أو نصًّا محرَّفًا؛ فلا يُنسب إلى القرآن.',
    notVerse: 'لا توجد آية بهذا اللفظ في القرآن الكريم (رواية حفص، نص مشروع تنزيل)؛ فلا يُنسب هذا النص إلى القرآن.',
    related: 'آيات ورد فيها بعض ألفاظه أو معناه (بحث موضوعي):',
    closest: 'أقرب الآيات لفظًا (للاستئناس فقط، وليست مطابقة):',
    topic: (n, q, s = 1) => `وجدتُ ${arCount(n, 'آية واحدة', 'آيتين', 'آيات', 'آية')} ذات صلة بـ«${q}» في ${arCount(s, 'سورة واحدة', 'سورتين', 'سور', 'سورة')}. وهذا بيان أبرزها من التفسير المعتمد، ثم السور التي وردت فيها:`,
    noTopic: 'لم أجد مرجعًا كافيًا لهذا السؤال في الآيات والتفاسير المعتمدة لديّ، فأمتنع عن الإجابة حتى لا أنسب إلى القرآن ما ليس فيه. جرّب كلمة مفتاحية أوضح (مثل: الصبر، الوالدين، موسى).',
    ruling: 'هذا سؤال عن حكم شرعي، والفتوى لأهل العلم؛ فلا تُصدر «مشكاة» أحكامًا. تجد أدناه روابط مصادر الفتوى الرسمية، وآيات ذات صلة بالموضوع للاطلاع (وليست فتوى).',
    personal: 'هذه مسألة شخصية تحتاج إلى عالم أو مختص يسمع تفاصيلها. لا تقدّم «مشكاة» نصائح أو أحكامًا في الحالات الخاصة. يمكنك البحث عن موضوع عام (مثل: الصبر، بر الوالدين).',
    dream: 'تعبير الرؤى لا يدخل في عمل «مشكاة»، ولا يُبنى على آلة. يمكنك البحث عن ذكر الرؤيا في القرآن بكلمة «الرؤيا».',
    invalidRef: (s, n) => `سورة ${s} عدد آياتها ${n} فقط؛ هذا الرقم غير موجود.`,
    invalidSura: 'رقم السورة يجب أن يكون بين 1 و114.',
    empty: 'اكتب فكرة أو سؤالًا أو اسم سورة أو رقم آية أو جزءًا من آية.',
    lowConf: 'نتائج بحث لفظي (ثقة منخفضة) — تحقّق من السياق.',
    personalNote: 'هذه آيات عامة في الموضوع؛ أما حالتك الخاصة فاعرضها على عالم أو مختص.',
    topicLexical: (n, q, s = 1) => `وجدتُ ${arCount(n, 'آية واحدة', 'آيتين', 'آيات', 'آية')} ورد فيها لفظ «${q}» في ${arCount(s, 'سورة واحدة', 'سورتين', 'سور', 'سورة')} (بحث لفظي). الآيات مرتّبة أدناه حسب السورة:`,
    lexicalOnly: 'هذه نتائج بحث لفظي لم يؤكدها الذكاء الاصطناعي؛ قد لا تكون كلها متعلقة بسؤالك، فراجع السياق والتفسير.',
    polemic: 'هذه الآيات ذات الصلة بالسؤال، يعرضها التفسير المعتمد في سياقها كما هي، دون انتقاء جزء منها. والحكم على المعنى يكون بقراءة الآية مع سياقها وتفسيرها.',
    sensitiveNote: 'موضوع يحتاج إلى فهمه في سياقه: افتح «السياق» لقراءة ما قبل الآية وما بعدها، ولتفصيل الأحكام يُرجع إلى أهل العلم.',
    takfir: 'الحكم على الأشخاص أو الطوائف بالكفر من شأن أهل العلم والقضاء، لا من شأن أداة بحث. يمكنك البحث عن موضوع عام (مثل: الإيمان، الكفر) لقراءة الآيات وتفسيرها.',
    violence: 'لا تجيب «مشكاة» عن طلبات الإيذاء أو العنف. والنفس المعصومة محرّمة، ويمكنك البحث عن «حرمة النفس» لقراءة الآيات وتفسيرها.',
    trFound: 'وُجدت هذه العبارة في ترجمة معاني الآيات التالية:',
    trNone: 'لم أجد هذه العبارة في ترجمات المعاني المعتمدة لديّ. ولا يمكن الحكم على نص مترجَم بأنه آية؛ الصق النص العربي للتحقق الدقيق.',
    topicIndex: (n, q, s, name) => `«${name}» موضوعٌ في الفهرس الموضوعي للموسوعة القرآنية؛ وفيه ${arCount(n, 'آية واحدة', 'آيتان', 'آيات', 'آية')} في ${arCount(s, 'سورة واحدة', 'سورتين', 'سور', 'سورة')}. وهذا بيان أبرزها من التفسير المعتمد، ثم الآيات مجموعةً حسب الموضوعات الفرعية:`,
    topicSubset: (n, q, s, name) => `لم أجد جوابًا مباشرًا عن سؤالك بنصّه؛ وهذه آيات موضوع «${name}» الوارد فيه، من الفهرس الموضوعي للموسوعة القرآنية (${arCount(n, 'آية واحدة', 'آيتان', 'آيات', 'آية')} في ${arCount(s, 'سورة واحدة', 'سورتين', 'سور', 'سورة')}):`,
    term: (t) => `«${t}» في قاموس المصطلحات المعتمد في مرجعية التحدي، مع آيات موضوعه في الفهرس الموضوعي:`,
    hadithIntro: 'لا تولّد «مشكاة» الأحاديث ولا تحكم عليها. هذه نتائج البحث في الموسوعة الحديثية (الدرر السنية) بنصّها، مع حكم المحدّث على كل رواية:',
    hadithLatin: 'البحث في الأحاديث يكون بنصها العربي في الموسوعة الحديثية (الدرر السنية). اكتب نص الحديث بالعربية، أو افتح الموسوعة من الرابط أدناه.',
    hadithNone: 'لم أعثر في الموسوعة الحديثية على رواية تطابق هذا الكلام؛ فلا يُنسب إلى النبي ﷺ دون مصدر وحكم معتمد.',
    khilaf: 'القرآن الكريم وما ثبت من أصول الدين محلّ اتفاق بين المسلمين، أما كثير من مسائل الفقه التفصيلية فقد يختلف فيها العلماء باجتهادٍ في فهم الأدلة، ولا يُصوَّر كل خلاف على أنه تناقض. ولا تنسب «مشكاة» اتفاقًا ولا خلافًا في مسألة بعينها دون مصدر؛ ولمعرفة أقوال العلماء فيها يُرجع إلى جهات الفتوى المعتمدة أدناه.',
  },
  en: {
    sura: (s) => `Surah ${s.tr} (${s.en}) — ${s.type === 'meccan' ? 'Meccan' : 'Medinan'}, ${s.ayas} verses, number ${s.n} in the Mushaf.`,
    verse: (r) => `Verse ${r}`,
    range: (r) => `Verses ${r}`,
    exact: (n) => n === 1 ? 'This text appears verbatim in the Quran at:' : `This text appears verbatim in the Quran at ${n} places:`,
    near: (r) => `This exact wording was not found. The closest verse is ${r}; the highlighted words differ. The correct wording in the Mushaf is:`,
    merged: (a, b) => `This text seems to merge two verses: ${a} and ${b}. Note the difference:`,
    notFound: 'This text was not found in the Quran (Hafs, Tanzil text). It may be a hadith, a saying or a distorted quote — it should not be attributed to the Quran.',
    notVerse: 'No verse of the Quran has this wording (Hafs, Tanzil text), so this text should not be attributed to the Quran.',
    related: 'Verses sharing some of its words or meaning (topic search):',
    closest: 'Closest verses by wording (for reference only, not a match):',
    topic: (n, q, s = 1) => `I found ${n} verse${n === 1 ? '' : 's'} related to “${q}” in ${s} surah${s === 1 ? '' : 's'}. Here is the explanation of the main ones from vetted tafsir, then the surahs where they occur:`,
    noTopic: 'I could not find sufficient evidence for this in the vetted verses and tafsir I hold, so I abstain rather than attribute to the Quran what is not in it. Try a clearer keyword (e.g. patience, parents, Moses).',
    ruling: 'This asks for a religious ruling, which belongs to qualified scholars; Mishkat does not issue rulings. Below are links to official fatwa sources, and related verses for reading (not a fatwa).',
    personal: 'This is a personal matter that needs a scholar or specialist who can hear the details. Mishkat gives no advice or rulings on individual cases. You can search a general topic instead (e.g. patience, parents).',
    dream: 'Dream interpretation is outside Mishkat’s scope and should not be done by a machine. You can search for dreams mentioned in the Quran with the word “dream”.',
    invalidRef: (s, n) => `Surah ${s} has only ${n} verses; this verse number does not exist.`,
    invalidSura: 'The surah number must be between 1 and 114.',
    empty: 'Type an idea, a question, a surah name, a verse number or part of a verse.',
    lowConf: 'Keyword results (low confidence) — check the context.',
    personalNote: 'These are general verses on the subject; for your own situation, please consult a scholar or specialist.',
    topicLexical: (n, q, s = 1) => `I found ${n} verse${n === 1 ? '' : 's'} containing the words of “${q}” in ${s} surah${s === 1 ? '' : 's'} (keyword search). They are listed below, surah by surah:`,
    lexicalOnly: 'These keyword results were not confirmed by the AI; some may not answer your question — check the context and the tafsir.',
    polemic: 'Here are the verses relevant to this question, each shown in full with its vetted tafsir — no part is cut out. The meaning of a verse is judged by reading it with its context and its tafsir.',
    sensitiveNote: 'This subject must be read in context: open “Context” to see the verses before and after, and refer to scholars for detailed rulings.',
    takfir: 'Judging that a person or a group has left Islam belongs to scholars and courts, not to a search tool. You can search a general topic (e.g. faith, disbelief) to read the verses and their tafsir.',
    violence: 'Mishkat does not answer requests to harm anyone. Human life is sacred; you can search “sanctity of life” to read the verses and their tafsir.',
    trFound: 'This wording appears in the translation of the following verse(s):',
    trNone: 'I could not find this wording in the vetted translations I hold. A translated sentence cannot be confirmed as a verse — translations differ — so do not attribute it to the Quran; paste the Arabic text for an exact check.',
    topicIndex: (n, q, s, name) => `«${name}» is a topic of the Quranic Encyclopedia’s subject index: ${n} verse${n === 1 ? '' : 's'} in ${s} surah${s === 1 ? '' : 's'}. Here is the explanation of the main ones from vetted tafsir, then the verses grouped by sub-topic:`,
    topicSubset: (n, q, s, name) => `No direct answer to your exact question was found; here are the verses of the topic «${name}» it mentions, from the Quranic Encyclopedia’s subject index (${n} verse${n === 1 ? '' : 's'} in ${s} surah${s === 1 ? '' : 's'}):`,
    term: (t) => `«${t}» in the glossary of approved terms of the challenge’s reference pack, with the verses of its topic in the subject index:`,
    hadithIntro: 'Mishkat does not generate hadith or grade them. These are the results of the Hadith Encyclopedia (Dorar.net) as published, with each muhaddith’s verdict:',
    hadithLatin: 'Hadith are searched by their Arabic text in the Hadith Encyclopedia (Dorar.net). Type the Arabic text, or open the encyclopedia with the link below.',
    hadithNone: 'No narration matching these words was found in the Hadith Encyclopedia; nothing should be attributed to the Prophet ﷺ without a source and an authoritative grading.',
    khilaf: 'The Quran and the established foundations of the faith are agreed upon by Muslims; many detailed questions of jurisprudence, however, are subject to differences of scholarly ijtihad in understanding the evidence, and not every difference is a contradiction. Mishkat does not claim agreement or disagreement on a specific question without a source; for the scholars’ positions, refer to the official fatwa bodies below.',
  },

};

// ------------------------------------------------ cross-lingual thesaurus
// Groups of equivalent search terms [ar, en]. Used ONLY to widen the
// retrieval (which verses to look at); never shown as content.
const THESAURUS = [
  ['موسى', 'moses'], ['عيسى المسيح', 'jesus messiah'], ['مريم', 'mary maryam'],
  ['ابراهيم', 'abraham ibrahim'], ['نوح', 'noah'], ['يوسف', 'joseph yusuf'],
  ['يعقوب', 'jacob'], ['اسحاق', 'isaac'], ['اسماعيل', 'ishmael ismail'], ['داود', 'david'],
  ['سليمان', 'solomon'], ['يونس', 'jonah'], ['ايوب', 'job'], ['زكريا', 'zechariah zakariya'],
  ['يحيي', 'john yahya'], ['هارون', 'aaron'], ['لوط', 'lot'], ['هود', 'hud'],
  ['صالح', 'salih'], ['شعيب', 'shuayb'], ['ادم', 'adam'], ['محمد', 'muhammad'],
  ['فرعون', 'pharaoh'], ['ابليس الشيطان', 'satan iblees'], ['جبريل', 'gabriel'],
  ['الجنة', 'paradise garden'], ['النار جهنم', 'hell hellfire'],
  ['الصلاة', 'prayer'], ['الصيام الصوم', 'fasting'], ['الزكاة', 'zakah'],
  ['الحج', 'hajj pilgrimage'], ['الصبر', 'patience patient'],
  ['الوالدين', 'parent'], ['الرحمة', 'mercy'], ['التوبة', 'repentance repent'],
  ['الكعبة', 'kaaba'], ['القران', 'quran'], ['الملائكة', 'angel'], ['اليتيم', 'orphan'],
  ['الوضوء توضؤوا فتوضؤوا', 'ablution wudu'], ['الربا', 'usury interest riba'], ['الخمر', 'intoxicant wine'],
];
const THES_INDEX = { ar: new Map(), en: new Map() };
THESAURUS.forEach((g, gi) => {
  ['ar', 'en'].forEach((l, li) => {
    for (const w of g[li].split(' ')) for (const t of tokens(w, l, { stop: false })) THES_INDEX[l].set(t, gi);
  });
});
export function expandTokens(qtoks, fromLang, toLang) {
  const extra = [];
  for (const t of qtoks) {
    const gi = THES_INDEX[fromLang].get(t);
    if (gi == null) continue;
    const li = ['ar', 'en'].indexOf(toLang);
    for (const w of THESAURUS[gi][li].split(' ')) extra.push(...tokens(w, toLang, { stop: false }));
  }
  return extra;
}

// ----------------------------------------------------- well-known names
// Only names on which there is no disagreement. [aliases], [[sura, from, to]...]
const FAMOUS = [
  [['اية الكرسي', 'ayat al kursi', 'ayatul kursi', 'ayat ul kursi', 'ayat alkursi', 'the throne verse', 'throne verse', 'verse of the throne', 'le verset du trone', 'verset du trone', 'ayat al koursi'], [[2, 255, 255]]],
  [['اية الدين', 'ayat al dayn', 'the verse of debt', 'verse of debt', 'le verset de la dette', 'verset de la dette'], [[2, 282, 282]]],
  [['اية النور', 'ayat an nur', 'the verse of light', 'verse of light', 'le verset de la lumiere', 'verset de la lumiere'], [[24, 35, 35]]],
  [['خواتيم البقرة', 'خواتيم سورة البقرة', 'اواخر سورة البقرة', 'اخر ايتين من سورة البقرة', 'last two verses of al baqarah', 'last two verses of surah al baqarah', 'les deux derniers versets de la baqara', 'deux derniers versets de la baqara'], [[2, 285, 286]]],
  [['المعوذتان', 'المعوذتين', 'al muawwidhatayn', 'muawwidhatayn'], [[113, 1, 5], [114, 1, 6]]],
  [['ام الكتاب', 'ام القران', 'السبع المثاني', 'umm al kitab', 'the mother of the book', 'la mere du livre'], [[1, 1, 7]]],
];
const FAMOUS_INDEX = new Map();
for (const [names, spans] of FAMOUS) for (const n of names) FAMOUS_INDEX.set(AR_RANGE.test(n) ? normAr(n) : normLatin(n), spans);
function famousLookup(q) {
  const lead = /^(ما هي|ما هو|ما|اين|اقرا|what is|what are|show me|read|quelle est|quels sont|lire|montre moi)\s+/;
  for (const n of [normAr(q), normLatin(q)]) {
    if (!n) continue;
    const k = n.replace(lead, '').trim();
    if (FAMOUS_INDEX.has(k)) return FAMOUS_INDEX.get(k);
  }
  return null;
}

// ----------------------------------------------------------------- guard
const GUARD = [
  ['dream', /(تفسير|تعبير)\s+(حلم|الحلم|رؤيا|الرؤيا|منام)|رأيت\s+في\s+(المنام|منامي|حلمي)|\bmeaning of (my|a) dream\b|\binterpret(ation of)? (my |a )?dreams?\b|\bi (saw|dreamt|dreamed)\b|\b(interpr[eé]t\w*|signification|sens) (de |d )?(mon |ce |un )?r[eê]ve\b|\bj ai r[eê]v[eé]\b/i],
  ['ruling', /(^|\s)و?ما\s+حكم|حكم\s+(ال)?\S+\s+في\s+الإسلام|هل\s+(يجوز|يحل|يحرم|يصح|تجوز|تصح|يباح)|هل\s+\S*\s*(حرام|حلال|مكروه|جائز|بدعة)|(حرام|حلال)\s+(أم|او|أو)\s+(حلال|حرام)|فتو[ىي]|أفتوني|ما\s+الحكم|\bfatwa\b|\bruling (on|about|of)\b|\bis (it|this|that|\w+ing|\w+) (\w+ )?(halal|haram|permissible|allowed|forbidden|lawful|unlawful|sinful|a sin)\b|\b(halal|haram) or (halal|haram)\b|\bam i allowed\b|\best[ -](ce|il) (que )?(\w+ )?(permis|licite|illicite|haram|halal|interdit|autoris[eé]|un p[eé]ch[eé])\b|\bai[ -]je le droit\b|\bavis juridique\b|\b(est|sont|serait)[- ](il |elle )?(haram|halal|licite|illicite|interdite?s?|permise?s?|autoris[eé]e?s?)\b|\b(is|are) (it |this |that )?(halal|haram)\b/i],
  ['takfir', /هل\s+(ال)?\S+\s+(كفار|كافر|كافرة|مرتد|مرتدون|مشركون|مشرك)\s*[؟?]?$|\bis\s+\S+(\s+\S+)?\s+(a\s+)?(kafir|kaffir|infidel|apostate|disbeliever)s?\b|\bare\s+\S+(\s+\S+)?\s+(kafirs?|infidels?|apostates?|disbelievers)\b|\best[- ]ce que\s+.{1,40}\s+(est|sont)\s+(un |des )?(mécréants?|mecreants?|apostats?|kafirs?)\b/i],
  ['violence', /كيف\s+(اقتل|أقتل|نقتل|أفجر|افجر|اصنع\s+قنبلة|أصنع\s+قنبلة)|\bhow (to|do i|can i) (kill|murder|attack|make a bomb|build a bomb)\b|\bcomment (tuer|fabriquer une bombe|attaquer)\b/i],
  ['personal', /(زوجي|زوجتي|طليقي|طليقتي|أبي|أمي|ابني|ابنتي|مديري)\s+(يضرب|تضرب|يمنع|تمنع|تمنعني|يمنعني|طلق|يريد|تريد|لا\s+يصلي|لا\s+تصلي|ترفض|يرفض)|هل\s+(أطلق|أترك|أتزوج|أسامح)|ماذا\s+أفعل|\bshould i\b|\bcan i\b|\bwhat should i do\b|\bmy (husband|wife|father|mother|son|daughter|boss)\b|\bdois[ -]je\b|\bpuis[ -]je\b|\bque dois[ -]je faire\b|\bmon (mari|p[eè]re|fils|patron)\b|\bma (femme|m[eè]re|fille)\b/i],
];
const GUARD_EXTRA = [
  ['ruling', /^هل\s+.{1,60}\s(حرام|حلال|مكروه|مكروهة|جائز|جائزة|بدعة|مباح|مباحة|واجب|واجبة|فرض|شرك)\s*$/],
];
export function guardCheck(q) {
  const t = q + ' \n ' + normLatin(q);
  for (const [kind, re] of GUARD) if (re.test(t)) return kind;
  const na = normAr(q);
  for (const [kind, re] of GUARD_EXTRA) if (re.test(na)) return kind;
  return null;
}

// ------------------------------------------- trap questions & sensitive subjects
// Hostile or trap phrasings ("Islam is violent", "the Quran orders killing"…).
const POLEMIC = /(الاسلام|الإسلام|القران|القرآن|المسلمين|المسلمون)\s+(دين\s+)?(ارهاب|إرهاب|عنف|ظلم|تخلف|كراهية|يحرض|يأمر\s+بقتل|يدعو\s+(الى|إلى)\s+(القتل|العنف))|\b(islam|the quran|muslims?)\s+(is|are)\s+(a\s+)?(religion of\s+)?(violent|violence|terror|terrorist|hate|hateful|evil|backward|misogyn\w*|oppress\w*)|\b(quran|koran)\s+(says?|orders?|tells?|commands?)\s+(to\s+)?(kill|murder|beat|hate)|\bwhy (does|do) (islam|the quran|muslims?)\s+(hate|kill|oppress)|\bl ?islam (est|serait) (une religion )?(violente?|de la violence|terroriste|haineuse?|misogyne|arriér\w*)|\ble coran (ordonne|dit|demande) de (tuer|frapper|haïr)|\bpourquoi (l ?islam|le coran|les musulmans) (hait|haïssent|tue|tuent|opprime)/i;
const POLEMIC2 = /(دينكم|دينك)\s+(متخلف|ارهاب|إرهاب|ارهابي|إرهابي|عنف|ظلم|باطل|كذب)|(الاسلام|الإسلام)\s+(متخلف|ارهابي|إرهابي|دموي)|انتشر\s+بالسيف|\bspread by the sword\b|\bislam (was |is )?spread by (force|the sword)\b|\bpropag\w* par (l ?epee|la force)\b|\brepandu par (l ?epee|la force)\b/i;
export function isPolemic(q) { return POLEMIC.test(q) || POLEMIC.test(normLatin(q)) || POLEMIC2.test(q) || POLEMIC2.test(normLatin(q)); }

// Curated context packs: well-known passages, each verified against At-Tafsir Al-Muyassar
// (full tafsir unit shown, never a fragment). They are shown FIRST for trap questions
// and sensitive subjects, before the verses retrieved for the question itself.
const PACKS = [
  { id: 'violence', words: ['عنف', 'ارهاب', 'إرهاب', 'قتل', 'قتال', 'القتال', 'جهاد', 'الجهاد', 'حرب', 'سيف', 'violence', 'violent', 'terror', 'terrorism', 'terrorist', 'kill', 'killing', 'jihad', 'war', 'sword', 'tuer', 'terrorisme', 'guerre', 'djihad'], refs: ['2:190', '2:256', '8:61', '60:8', '22:39'] },
  { id: 'women', words: ['المراة', 'المرأة', 'امراة', 'امرأة', 'النساء', 'نساء', 'women', 'woman', 'wives', 'misogynist', 'misogynistic', 'misogyny', 'sexist', 'femme', 'femmes', 'epouse', 'épouse', 'misogyne', 'misogynie', 'sexiste'], refs: ['4:1', '4:19', '33:35', '16:97', '30:21', '4:124'] },
  { id: 'slavery', words: ['الرق', 'رقيق', 'عبيد', 'عبودية', 'العبودية', 'slavery', 'slave', 'slaves', 'esclavage', 'esclave', 'esclaves'], refs: ['90:13', '24:33', '4:92', '58:3', '9:60'] },
  { id: 'religions', words: ['اليهود', 'النصارى', 'المسيحيين', 'الاديان', 'الأديان', 'غير المسلمين', 'christians', 'christian', 'jews', 'jewish', 'religions', 'non muslims', 'non-muslims', 'infidel', 'infidels', 'kafir', 'chretiens', 'chrétiens', 'juifs', 'infideles', 'infidèles', 'mecreants', 'mécréants'], refs: ['109:6', '60:8', '29:46', '49:13', '2:256'] },
  { id: 'freedom', words: ['الردة', 'المرتد', 'اكراه', 'إكراه', 'حرية', 'apostasy', 'apostate', 'compulsion', 'freedom of religion', 'apostasie', 'apostat', 'liberte', 'liberté'], refs: ['2:256', '18:29', '10:99', '88:21'] },
  { id: 'source', words: ['من كتب القران', 'من كتب القرآن', 'مؤلف القران', 'مؤلف القرآن', 'who wrote the quran', 'wrote the quran', 'author of the quran', 'copied', 'qui a ecrit le coran', 'qui a écrit le coran', 'auteur du coran'], refs: ['10:37', '16:103', '29:48', '4:82', '2:23'] },
];
const PACK_IDX = PACKS.map(p => ({ ...p, norm: p.words.map(w => /[؀-ۿ]/.test(w) ? normAr(w) : normLatin(w)) }));
export function packFor(q) {
  const words = normAr(q).split(/\s+/).filter(Boolean);
  const na = ' ' + words.concat(words.map(w => w.replace(/^(و|ف)?(بال|كال|لل|ال|ب|ل|ك)?/, ''))).join(' ') + ' ', nl = ' ' + normLatin(q) + ' ';
  for (const p of PACK_IDX) for (const w of p.norm) {
    const hay = /[؀-ۿ]/.test(w) ? na : nl;
    if (hay.includes(' ' + w + ' ') || (w.length > 4 && hay.includes(w))) return p;
  }
  return null;
}
const SENSITIVE = /(الحدود|حد\s+السرقة|قطع\s+اليد|الرجم|الجلد|القصاص|تعدد\s+الزوجات|ضرب\s+الزوجة|الميراث|stoning|amputation|flogging|polygamy|beat(ing)? (his |the )?wi(fe|ves)|lapidation|polygamie|frapper (sa|les) femmes?)/i;
export function isSensitive(q) { return SENSITIVE.test(q) || SENSITIVE.test(normLatin(q)) || !!packFor(q); }

// Words that turn a subject into a fatwa request; removed to search the related verses.
const RULING_WORDS = /(ما\s+حكم|حكم|هل\s+يجوز|يجوز|هل|حلال|حرام|مكروه|جائز|بدعة|فتوى|أفتوني|is it|is|are|haram|halal|permissible|allowed|forbidden|ruling on|ruling|fatwa|est[- ]ce que|est[- ]il|est[- ]elle|permis|licite|illicite|interdit|avis juridique|\?|؟)/gi;
export function fatwaLinks(q) {
  const enc = encodeURIComponent(q.trim().slice(0, 80));
  return [
    { id: 'binbaz', url: `https://binbaz.org.sa/search?q=${enc}` },
    { id: 'alifta', url: 'https://alifta.gov.sa/ar/home' },
  ];
}

// ------------------------------------------------------------------ BM25
const BM25_K1 = 1.2, BM25_B = 0.75;

class FieldIndex {
  constructor(docs, lang) {
    this.lang = lang;
    this.post = new Map();
    this.len = new Float32Array(docs.length);
    let total = 0;
    docs.forEach((d, i) => {
      const toks = tokens(d || '', lang);
      this.len[i] = toks.length; total += toks.length;
      const tf = new Map();
      for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
      for (const [t, c] of tf) {
        let p = this.post.get(t);
        if (!p) this.post.set(t, (p = []));
        p.push(i, c);
      }
    });
    this.N = docs.length;
    this.avg = total / docs.length || 1;
  }
  score(qtoks, acc, hits, weight) {
    for (const t of new Set(qtoks)) {
      const p = this.post.get(t);
      if (!p) continue;
      const df = p.length / 2;
      const idf = Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
      for (let k = 0; k < p.length; k += 2) {
        const d = p[k], tf = p[k + 1];
        const s = idf * (tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + BM25_B * this.len[d] / this.avg));
        acc.set(d, (acc.get(d) || 0) + weight * s);
        hits.add(d);
      }
    }
  }
}

const FIELDS = {
  ar: [['quran', 1.0], ['mukhtasar_ar', 0.7], ['muyassar_ar', 0.6], ['saadi_ar', 0.35]],
  en: [['saheeh_en', 1.0], ['mukhtasar_en', 0.7]],
};
// explanatory paragraph source per language (Arabic: At-Tafsir Al-Muyassar)
export const PARAGRAPH_FOR = { ar: 'muyassar_ar', en: 'mukhtasar_en' };
export const TAFSIR_FOR = { ar: 'mukhtasar_ar', en: 'mukhtasar_en' };
export const TRANSLATION_FOR = { ar: null, en: 'saheeh_en' };
export const SOURCES_NEEDED = {
  ar: ['mukhtasar_ar', 'muyassar_ar'],
  en: ['mukhtasar_en', 'saheeh_en'],
};

// ------------------------------------------------------------ LLM verifiers
const INTENTS = new Set(['topic', 'ruling', 'personal', 'polemic', 'other']);
export function verifyLLM(out, candidates, sentenceIds = []) {
  const allowed = new Set(candidates.map(c => c.id));
  const allowedS = new Set(sentenceIds);
  const res = { intent: 'topic', ids: [], sentences: [], confidence: 'low', rejected: 0 };
  if (!out || typeof out !== 'object') return res;
  if (INTENTS.has(out.intent)) res.intent = out.intent;
  if (out.confidence === 'high') res.confidence = 'high';
  for (const id of Array.isArray(out.ids) ? out.ids : []) {
    const s = String(id).trim();
    if (allowed.has(s) && !res.ids.includes(s)) res.ids.push(s); else res.rejected++;
    if (res.ids.length >= 15) break;
  }
  for (const id of Array.isArray(out.sentences) ? out.sentences : []) {
    const s = String(id).trim();
    if (allowedS.has(s) && !res.sentences.includes(s)) res.sentences.push(s); else res.rejected++;
    if (res.sentences.length >= 4) break;
  }
  return res;
}
export function verifyExpansion(out) {
  const res = { intent: 'topic', keywords: { ar: [], en: [] }, refs: [] };
  if (!out || typeof out !== 'object') return res;
  res.refs = (Array.isArray(out.refs) ? out.refs : []).map(x => String(x).trim()).filter(x => /^\d{1,3}:\d{1,3}$/.test(x)).slice(0, 8);
  if (INTENTS.has(out.intent)) res.intent = out.intent;
  const kw = out.keywords && typeof out.keywords === 'object' ? out.keywords : {};
  for (const l of ['ar', 'en']) {
    res.keywords[l] = (Array.isArray(kw[l]) ? kw[l] : []).map(x => String(x).slice(0, 30)).filter(x => x.trim()).slice(0, 8);
  }
  return res;
}

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('llm timeout')), ms))]);
}

// ------------------------------------------------------------------ engine
export function createEngine({ core, searchAr, sources = {} }) {
  const suras = core.suras;
  const verses = core.verses;
  const NV = verses.length;
  const suraOf = new Uint8Array(NV), ayaOf = new Uint16Array(NV);
  for (const s of suras) for (let a = 1; a <= s.ayas; a++) { suraOf[s.first + a - 1] = s.n; ayaOf[s.first + a - 1] = a; }
  const ref = (i) => `${suraOf[i]}:${ayaOf[i]}`;
  const idxOf = (s, a) => (s >= 1 && s <= 114 && a >= 1 && a <= suras[s - 1].ayas) ? suras[s - 1].first + a - 1 : -1;
  const src = { ...sources };
  const fields = new Map();

  // Two normalised scripts: imla'i (how people type) and Uthmani (how people
  // paste from a Mushaf app). A quote matches if it matches either.
  const scripts = [searchAr.map(normAr), verses.map(normAr)];
  const vtokS = scripts.map(sc => sc.map(v => v.split(' ')));
  const tokPost = new Map();
  vtokS.forEach(vt => vt.forEach((ts, i) => {
    for (const t of new Set(ts)) { let p = tokPost.get(t); if (!p) tokPost.set(t, (p = new Set())); p.add(i); }
  }));
  const suraTextS = scripts.map(sc => suras.map(s => {
    let txt = '';
    const starts = [];
    for (let a = 0; a < s.ayas; a++) { starts.push(txt.length); txt += sc[s.first + a] + ' '; }
    return { txt, starts };
  }));

  // ------------------------------------------------------------ sura names
  // alias -> sura; kind: 'ar' (Arabic name), 'tr' (transliteration), 'meaning' (en)
  const aliases = new Map(), aliasKind = new Map();
  const addAlias = (a, n, kind = 'tr') => {
    if (a && (a.length >= 2 || kind === 'ar') && !aliases.has(a)) { aliases.set(a, n); aliasKind.set(a, kind); }
  };
  for (const s of suras) {
    const ar = normAr(s.ar);
    addAlias(ar, s.n, 'ar'); addAlias(ar.replace(/^ال/, ''), s.n, 'ar');
    const tr = normLatin(s.tr);
    addAlias(tr.replace(/\s/g, ''), s.n);
    const trNoArt = normLatin(s.tr.replace(/^[A-Za-z]{1,3}-/, '')).replace(/\s/g, '');
    addAlias(trNoArt, s.n);
    if (trNoArt.endsWith('h')) addAlias(trNoArt.slice(0, -1), s.n);
    addAlias(normLatin(s.en).replace(/^the /, '').replace(/\s/g, ''), s.n, 'meaning');
  }
  const SURA_WORDS = /^(سورة|سوره|سورت|surah|surat|sura|soura|sourate|chapter|chapitre)$/;
  const AYA_WORDS = /^(اية|ايه|الاية|الايه|ايات|الايات|ayah|aya|ayat|verse|verses|verset|versets|v)$/;

  // Typo-tolerant matching only with a surah keyword, or for long
  // transliterations that are not ordinary words (else "الجنة" → Al-Jinn…).
  function findSura(nameStr, withKeyword = false) {
    const lat = normLatin(nameStr).replace(/^(the|la|le|les|l) /, '');
    const cands = [normAr(nameStr).replace(/\s/g, ''), lat.replace(/\s/g, '')];
    for (const c of cands) {
      if (!c) continue;
      for (const k of [c, c.replace(/^ال/, ''), c.replace(/^(al|an|ar|as|ash|at|ad|az)(?=[a-z]{3})/, '')]) {
        if (aliases.has(k)) return { n: aliases.get(k), kind: aliasKind.get(k) };
      }
    }
    let best = null, bestD = 99, tie = false;
    cands.forEach((c, ci) => {
      if (!c || c.length < 4) return;
      const isLatin = ci === 1;
      const ordinary = isLatin && THES_INDEX.en.has(stemLatin(c));
      if (!withKeyword && !(isLatin && c.length >= 6 && !ordinary)) return;
      const maxD = c.length >= 7 ? 2 : 1;
      for (const [a, n] of aliases) {
        if (Math.abs(a.length - c.length) > maxD) continue;
        const d = levenshtein(a, c, maxD);
        if (d <= maxD) {
          if (d < bestD) { bestD = d; best = n; tie = false; } else if (d === bestD && n !== best) tie = true;
        }
      }
    });
    return best && !tie ? { n: best, kind: 'fuzzy' } : null;
  }

  function field(name) {
    if (fields.has(name)) return fields.get(name);
    let docs, lang;
    if (name === 'quran') { docs = searchAr; lang = 'ar'; }
    else {
      if (!src[name]) return null;
      docs = src[name].text; lang = name.slice(-2);
    }
    const f = new FieldIndex(docs, lang);
    fields.set(name, f);
    return f;
  }

  // ------------------------------------------------------- references
  function parseReference(q) {
    const t = toAsciiDigits(q).trim();
    const m = t.match(/^\s*(\d{1,3})\s*[:：\/.\-،,]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*$/);
    if (m) return { s: +m[1], a: +m[2], b: m[3] ? +m[3] : null };
    const parts = t.replace(/[،,:()«»"'?؟]/g, ' ').split(/\s+/).filter(Boolean);
    const nums = [], words = [];
    let hadSuraWord = false;
    for (const p of parts) {
      if (/^\d{1,3}$/.test(p)) nums.push(+p);
      else {
        const pa = normAr(p), pl = normLatin(p);
        if (SURA_WORDS.test(pa) || SURA_WORDS.test(pl)) { hadSuraWord = true; continue; }
        if (AYA_WORDS.test(pa) || AYA_WORDS.test(pl) || /^(رقم|number|numero|no|n)$/.test(pl || pa)) continue;
        words.push(p);
      }
    }
    if (words.length === 0) {
      if (nums.length === 1 && (hadSuraWord || parts.length === 1)) return { s: nums[0], a: null };
      if (nums.length === 2) return { s: nums[0], a: nums[1] };
      if (nums.length === 3) return { s: nums[0], a: nums[1], b: nums[2] };
      return null;
    }
    if (words.length > 4) return null;
    const found = findSura(words.join(' '), hadSuraWord || nums.length > 0);
    if (!found) return null;
    if (nums.length === 0) return { s: found.n, a: null, bare: !hadSuraWord, kind: found.kind };
    if (nums.length === 1) return { s: found.n, a: nums[0] };
    if (nums.length === 2) return { s: found.n, a: nums[0], b: nums[1] };
    return null;
  }

  // ----------------------------------------------------- verification
  function exactFragment(qn) {
    const hits = [], seen = new Set();
    if (qn.length < 6) return hits;
    for (const suraText of suraTextS) suras.forEach((s, si) => {
      const { txt, starts } = suraText[si];
      let from = 0, pos;
      while ((pos = txt.indexOf(qn, from)) !== -1) {
        const okL = pos === 0 || txt[pos - 1] === ' ';
        const end = pos + qn.length;
        const okR = end >= txt.length || txt[end] === ' ';
        if (okL && okR) {
          let a = 0; while (a + 1 < starts.length && starts[a + 1] <= pos) a++;
          let b = a; while (b + 1 < starts.length && starts[b + 1] < end) b++;
          const k = (s.first + a) * 10000 + (s.first + b);
          if (!seen.has(k)) { seen.add(k); hits.push({ from: s.first + a, to: s.first + b }); }
        }
        from = pos + 1;
      }
    });
    hits.sort((x, y) => x.from - y.from);
    return hits;
  }

  function align1(qt, win) {
    const n = qt.length, m = win.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let x = 1; x <= n; x++) for (let y = 1; y <= m; y++)
      dp[x][y] = qt[x - 1] === win[y - 1] ? dp[x - 1][y - 1] + 1 : Math.max(dp[x - 1][y], dp[x][y - 1]);
    const matched = new Set();
    let x = n, y = m;
    while (x > 0 && y > 0) {
      if (qt[x - 1] === win[y - 1]) { matched.add(x - 1); x--; y--; }
      else if (dp[x - 1][y] >= dp[x][y - 1]) x--; else y--;
    }
    return { sim: dp[n][m] / n, matched };
  }
  function align(qt, i) {
    let best = null;
    for (const vtok of vtokS) {
      const r = align1(qt, vtok[i].concat(i + 1 < NV && suraOf[i + 1] === suraOf[i] ? vtok[i + 1] : []));
      if (!best || r.sim > best.sim) best = r;
    }
    return best;
  }
  function nearMatch(qt) {
    const count = new Map();
    for (const t of new Set(qt)) for (const i of tokPost.get(t) || []) count.set(i, (count.get(i) || 0) + 1);
    const cands = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 40).map(e => e[0]);
    let best = null;
    for (const i of cands) {
      const r = align(qt, i);
      if (!best || r.sim > best.sim) best = { i, ...r };
    }
    return best;
  }

  function verifyText(qArabic, explicit, lang) {
    const qn = normAr(qArabic);
    const qt = qn.split(' ').filter(Boolean);
    const M = MSG[lang];
    const exact = exactFragment(qn);
    if (exact.length) {
      return {
        type: 'verify', verdict: 'exact',
        answer: [{ kind: 'text', text: M.exact(exact.length) }],
        verses: exact.map(h => ({ idx: h.from, ref: ref(h.from), to: h.to !== h.from ? ref(h.to) : null })),
        focus: exact[0].from,
      };
    }
    if (qt.length < 3 && !explicit) return null;
    const best = qt.length >= 3 ? nearMatch(qt) : null;
    // merged verses: a prefix and a suffix each match a different verse almost perfectly
    if (qt.length >= 6 && (!best || best.sim < 0.9)) {
      let A = null, B = null, bestMin = 0;
      for (let h = 3; h <= qt.length - 3; h++) {
        const a = nearMatch(qt.slice(0, h)), b = nearMatch(qt.slice(h));
        if (!a || !b || a.i === b.i || Math.abs(a.i - b.i) <= 1) continue;
        const mn = Math.min(a.sim, b.sim);
        if (mn > bestMin) { bestMin = mn; A = a; B = b; }
        if (mn === 1) break;
      }
      if (A && B && bestMin >= 0.9) {
        return {
          type: 'verify', verdict: 'merged',
          answer: [{ kind: 'text', text: M.merged(ref(A.i), ref(B.i)) }],
          verses: [{ idx: A.i, ref: ref(A.i) }, { idx: B.i, ref: ref(B.i) }],
          focus: A.i,
        };
      }
    }
    const nearOk = best && best.sim >= 0.75 && best.matched.size >= 3 && (explicit || qt.length >= 5);
    if (nearOk) {
      return {
        type: 'verify', verdict: 'near',
        answer: [{ kind: 'text', text: M.near(ref(best.i)) }],
        verses: [{ idx: best.i, ref: ref(best.i) }],
        diffWords: qt.filter((_, k) => !best.matched.has(k)), focus: best.i,
      };
    }
    if (!explicit && qt.length < 5) return null; // short phrase: treat as a topic
    if (!explicit) {
      return { type: 'verify', verdict: 'notverse', answer: [{ kind: 'text', text: M.notVerse }], verses: [], focus: null, soft: true };
    }
    const res = { type: 'verify', verdict: 'notfound', answer: [{ kind: 'text', text: M.notFound }], verses: [], focus: null };
    if (best && best.sim >= 0.5 && best.matched.size >= 2) {
      res.answer.push({ kind: 'text', text: M.closest });
      res.verses = [{ idx: best.i, ref: ref(best.i), closestOnly: true }];
    }
    return res;
  }

  // Translated quotes can only be checked against the translations we hold.
  function verifyTranslation(text, lang) {
    const L = lang === 'ar' ? 'en' : lang;
    const M = MSG[L];
    const needle = normLatin(text.replace(/^.*?(:|\?)\s*/, '')).trim();
    const hits = [];
    if (needle.split(' ').length >= 3) {
      for (const id of [TRANSLATION_FOR.en, TAFSIR_FOR.en]) {
        const s = src[id];
        if (!s) continue;
        s.text.forEach((t, i) => { if (!hits.includes(i) && normLatin(t.replace(/\[\d+\]/g, '')).includes(needle)) hits.push(i); });
      }
    }
    if (hits.length) {
      return { type: 'verify', verdict: 'translation', answer: [{ kind: 'text', text: M.trFound }],
        verses: hits.slice(0, 30).map(i => ({ idx: i, ref: ref(i) })), focus: hits[0] };
    }
    return { type: 'verify', verdict: 'unverified', answer: [{ kind: 'text', text: M.trNone }], verses: [], focus: null };
  }

  // --------------------------------------------------------- topic search
  // BM25 over the fields of one language. Each query token is expanded with
  // its thesaurus synonyms; docs covering every token come first.
  // `extra` = LLM-proposed keywords (retrieval only), scored as an extra group.
  function topicSearch(q, lang, limit = 30, extra = []) {
    let qtoks = [...new Set(tokens(q, lang))];
    if (!qtoks.length) qtoks = [...new Set(tokens(q, lang, { stop: false }))]; // e.g. "القرآن" alone
    if (qtoks.length > 1) { const k = qtoks.filter(t => !UBIQ[lang].has(t)); if (k.length) qtoks = k; }
    const extraToks = [...new Set(extra.flatMap(w => tokens(w, lang)))].filter(t => !UBIQ[lang].has(t));
    if (!qtoks.length && !extraToks.length) return { qtoks, ranked: [] };
    const groups = qtoks.map(t => [t, ...new Set(expandTokens([t], lang, lang))]);
    const acc = new Map(), hitsByGroup = groups.map(() => new Set()), extraHits = new Set(), accK = new Map();
    for (const [name, w] of FIELDS[lang]) {
      const f = field(name);
      if (!f) continue;
      groups.forEach((g, gi) => f.score(g, acc, hitsByGroup[gi], w));
      if (extraToks.length) { f.score(extraToks, acc, extraHits, w * 0.6); f.score(extraToks, accK, new Set(), w); }
    }
    const kwTop = [...accK.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 16).map(e => e[0]);
    const uq = groups.length;
    const ranked = [...acc.entries()].map(([d, s]) => {
      let c = 0; for (const hs of hitsByGroup) if (hs.has(d)) c++;
      const cov = uq ? c / uq : 0;
      return { idx: d, score: s * (0.4 + 0.6 * cov * cov), cov, ext: extraHits.has(d) };
    });
    if (!ranked.length) return { qtoks, ranked: [], kwTop };
    const full = ranked.filter(r => r.cov === 1);
    let kept;
    if (!full.length && uq >= 2 && !extraToks.length) return { qtoks, ranked: [], topScore: 0, nFull: 0 };
    if (full.length >= 5 || (uq === 1 && full.length)) {
      const top = Math.max(0, ...full.map(r => r.score));
      kept = full.filter(r => r.score >= 0.3 * top);
      if (extraToks.length) kept = kept.concat(ranked.filter(r => r.cov < 1 && r.ext).sort((a, b) => b.score - a.score).slice(0, 20));
    } else {
      const top = Math.max(...ranked.map(r => r.score));
      kept = ranked.filter(r => (r.cov >= 0.5 || r.ext) && r.score >= 0.3 * top);
    }
    kept.sort((a, b) => b.cov - a.cov || b.score - a.score || a.idx - b.idx);
    return { qtoks: qtoks.concat(extraToks), ranked: kept.slice(0, limit), topScore: kept.length ? kept[0].score : 0, nFull: full.length, kwTop };
  }

  function topicSearchAuto(q, lang, uiLang, limit, extra = {}) {
    return { lang, ...topicSearch(q, lang, limit, extra[lang] || []) };
  }

  // ------------------------------------------------ explanatory paragraph
  // Numbered sentences of the paragraph source for the given verses.
  function sentencePool(lang, idxs, perVerse = 3) {
    const s = src[PARAGRAPH_FOR[lang]] || src[TAFSIR_FOR[lang]];
    const pool = [];
    if (!s) return pool;
    for (const i of idxs) {
      const text = s.text[i] || '';
      sentences(text).slice(0, perVerse).forEach((st, k) => pool.push({ id: `${ref(i)}#${k + 1}`, idx: i, text: st.replace(/^\d+\.\s*/, ''), source: s.id }));
    }
    return pool;
  }
  function bestSentences(pool, qtoks, lang, n = 3) {
    const qset = new Set(qtoks);
    const scored = pool.map((p, k) => {
      let sc = 0; for (const t of new Set(tokens(p.text, lang))) if (qset.has(t)) sc++;
      return { p, sc, k };
    });
    const out = [], usedVerse = new Set();
    for (const x of scored.sort((a, b) => b.sc - a.sc || a.k - b.k)) {
      if (usedVerse.has(x.p.idx)) continue;
      out.push(x.p); usedVerse.add(x.p.idx);
      if (out.length >= n) break;
    }
    return out;
  }
  function quoteOf(p) {
    let t = p.text;
    if (t.length > 460) { const cut = t.lastIndexOf(' ', 440); t = t.slice(0, cut > 200 ? cut : 440) + ' …'; }
    const s = src[p.source];
    return { kind: 'quote', text: t, source: p.source, sourceTitle: s && s.title, ref: ref(p.idx), idx: p.idx };
  }

  function groupBySura(order, weightOf) {
    const g = new Map();
    order.forEach((i, rank) => {
      const s = suraOf[i];
      let e = g.get(s);
      if (!e) g.set(s, (e = { sura: s, verses: [], score: 0 }));
      e.verses.push(i);
      e.score += weightOf ? weightOf(i, rank) : 1 / (rank + 1);
    });
    return [...g.values()].sort((a, b) => b.score - a.score || a.sura - b.sura);
  }

  const verseResult = (i, extra = {}) => ({ idx: i, ref: ref(i), ...extra });

  // ------------------------------------------------ الفهرس الموضوعي (Quranpedia, human-curated)
  // A topic → its verses; used when the question IS a topic of the index (or, when
  // nothing else is found, when it names one). Relevance comes from the index, the
  // explanation from the tafsir sources: nothing is generated.
  let TOPICS = null;
  function addTopicIndex(data) {
    const list = (data.items || []).map(([id, name, parent, ids]) => ({ id, name, parent, ids,
      // a bracketed qualifier («الزكاة [النماء والطهر]») tells the sense; it is not a search word
      toks: [...new Set(tokens(name.replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/[«»:]/g, ' '), 'ar'))].sort() }));
    const kids = new Map(), byKey = new Map();
    for (const t of list) if (t.parent) { if (!kids.has(t.parent)) kids.set(t.parent, []); kids.get(t.parent).push(t); }
    for (const t of list) if (t.toks.length) { const k = t.toks.join(' '); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(t); }
    TOPICS = { list, kids, byKey, size: new Map(), source: data.source, url: data.url, version: data.version };
  }
  function topicTree(roots, cap) {
    const groups = [], seen = new Set(), visited = new Set();
    const walk = (t, depth) => {
      if (visited.has(t.id) || depth > 5) return;
      visited.add(t.id);
      const ids = t.ids.filter(i => !seen.has(i)).sort((a, b) => a - b);
      ids.forEach(i => seen.add(i));
      if (ids.length) groups.push({ id: t.id, name: t.name, ids, own: depth === 0 });
      for (const c of (TOPICS.kids.get(t.id) || [])) walk(c, depth + 1);
    };
    roots.forEach(t => walk(t, 0));
    groups.sort((a, b) => (b.own - a.own) || (b.ids.length - a.ids.length));
    const total = seen.size, flat = [];
    for (const g of groups) for (const i of g.ids) if (flat.length < cap) flat.push(i);
    const keep = new Set(flat);
    return { total, ids: flat, groups: groups.map(g => ({ name: g.name, ids: g.ids.filter(i => keep.has(i)) })).filter(g => g.ids.length) };
  }
  const treeSize = (ts) => { const k = ts.map(t => t.id).join(','); if (!TOPICS.size.has(k)) TOPICS.size.set(k, topicTree(ts, 1e9).total); return TOPICS.size.get(k); };
  function topicIndexFor(q, lang, kwAr = [], cap = 60) {
    if (!TOPICS) return null;
    const tries = (lang === 'ar' ? [q] : []).concat(kwAr || []);
    for (const t of tries) {
      const k = [...new Set(tokens(t, 'ar'))].sort().join(' ');
      const hit = k && TOPICS.byKey.get(k);
      if (hit && treeSize(hit) > 0) return { mode: 'exact', name: hit[0].name, ...topicTree(hit, cap) };
    }
    if (lang !== 'ar') return null;
    // a topic named inside the question: the most specific name, then the smallest topic
    const qt = new Set(tokens(q, 'ar'));
    let best = null;
    for (const [k, ts] of TOPICS.byKey) {
      const kt = k.split(' ');
      if (kt.length > qt.size || !kt.every(x => qt.has(x))) continue;
      // one-word names are too ambiguous here («التأليف» = reconciling hearts, not composing;
      // «الأيمان» = oaths, not faith once hamza is normalised): only multi-word names
      if (kt.length < 2) continue;
      const n = treeSize(ts);
      if (n < 1 || n > 80) continue;
      if (!best || kt.length > best.len || (kt.length === best.len && n < best.n)) best = { len: kt.length, n, ts };
    }
    return best ? { mode: 'subset', name: best.ts[0].name, ...topicTree(best.ts, cap) } : null;
  }

  // ------------------------------------------------ موسوعة بينات (question titles → links)
  let BAY = null;
  function addBayenat(data) {
    const items = (data.items || []).map(x => ({ q: x.q, url: x.url, cat: x.cat, toks: new Set(tokens(x.q, 'ar', { stop: true })) }));
    const df = new Map();
    for (const x of items) for (const t of x.toks) df.set(t, (df.get(t) || 0) + 1);
    BAY = { items, df: (t) => df.get(t) || 0, idf: (t) => Math.log(1 + items.length / (df.get(t) || 0.5)), source: data.source, url: data.url };
  }
  // Calibrated on the challenge's test questions: the exact Bayyinat question comes
  // first; weak overlaps («إنكار رسالة محمد» for «تأليف محمد») are not proposed.
  function bayenatFor(q, kwAr = []) {
    if (!BAY) return [];
    const qt = [...new Set(tokens(q, 'ar').concat((kwAr || []).flatMap(k => tokens(k, 'ar'))))];
    if (qt.length < 2) return [];
    const W = qt.reduce((a, t) => a + BAY.idf(t), 0);
    const out = [], seen = new Set();
    for (const x of BAY.items) {
      let c = 0, w = 0, rare = false;
      for (const t of qt) if (x.toks.has(t)) { c++; w += BAY.idf(t); if (BAY.df(t) <= 15) rare = true; }
      if (c < 2) continue;
      const cov = w / W, prec = c / x.toks.size, score = cov * 0.7 + prec * 0.3;
      // close match of the question, or a title almost entirely contained in a longer (e.g. hostile) question
      if ((score >= 0.62 && prec >= 0.25) || (prec >= 0.6 && rare)) {
        const key = normAr(x.q).replace(/[^ء-ي ]/g, '');
        if (!seen.has(key)) { seen.add(key); out.push({ q: x.q, url: x.url, cat: x.cat, score }); }
      }
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  // ------------------------------------------------ hadith requests → Dorar (looked up by the app, never generated)
  const HADITH_WORD = /(^|\s)(حديث|حديثا|احاديث|الحديث|الاحاديث|بحديث)(\s|$)/;
  const HADITH_ASK = /(^|\s)(اعطني|اعطيني|اذكر|اذكرلي|هات|ابحث|هل يوجد|هل ورد|هل صح|ما صحه|ما درجه|هل هذا|هل هذه|خرج|تخريج|اريد)(\s|$)/;
  function hadithRequest(q) {
    const na = normAr(q);
    const prophet = /^(قال|عن)\s+(رسول الله|النبي)/.test(na);
    const latin = /\b(hadiths?|hadeeth)\b/i.test(q) && !AR_RANGE.test(q);
    if (!((HADITH_WORD.test(na) && HADITH_ASK.test(na)) || prophet || latin)) return null;
    if (latin) return { q: null };
    const t = normAr(q.replace(/[«»"“”:؟?،,.]/g, ' '))
      .replace(/(^|\s)(اعطني|اعطيني|اذكر|اذكرلي|لي|هات|ابحث|عن|هل|يوجد|ورد|صح|ما|صحه|درجه|هذا|هذه|خرج|تخريج|اريد|حديث|حديثا|احاديث|الحديث|الاحاديث|بحديث|يثبت|يدل|علي|ان|قال|رسول|الله|النبي|صلي|عليه|وسلم|ﷺ)(?=\s|$)/g, ' ')
      .replace(/\s+/g, ' ').trim();
    return { q: t.split(' ').length >= 2 ? t : normAr(q) };
  }

  // ------------------------------------------------ «do all Muslims agree…?», «why do scholars differ?»
  const KHILAF = /هل\s+(كل|جميع)\s+(ال)?(مسلمين|علماء?|فقهاء?|مذاهب)\s+(يتفقون|متفقون|اتفقوا|مجمعون|اجمعوا)|(لماذا|لم|ما\s+سبب|اسباب)\s+(ال)?(اختلاف|خلاف|تختلف|يختلف|اختلفت)|(احكام|اراء|اقوال)\s+مختلف[هة]\s+بين\s+(ال)?(علماء?|فقهاء?)|\b(do|are) all muslims (agree|in agreement)\b|\bwhy do (the )?(scholars|muslims|imams) (differ|disagree)\b|\bdifferent (rulings|opinions) (among|between) (the )?scholars\b|\btous les musulmans (sont[- ]ils )?d ?accord\b|\bpourquoi les (savants|oulemas|musulmans) (divergent|ne sont pas d ?accord)\b|\bdivergences? entre (les )?(savants|oulemas)\b/i;

  // ------------------------------------------------ response levels of the reference pack
  // A: stable sourced information · B: explanation from approved material ·
  // C: disputed / highly sensitive · D: fatwa or personal case (referral).
  function levelOf(res) {
    if (res.type === 'abstain') return 'D';
    if (res.type === 'khilaf' || res.polemic || res.sensitive) return 'C';
    if (['verse', 'range', 'sura', 'verify', 'invalid_ref', 'hadith'].includes(res.type)) return 'A';
    if (res.type === 'topic' || res.type === 'term') return 'B';
    return null;
  }

  // ---------------------------------------------------------------- ask()
  // ask(): the routes below, then the reference-pack additions (level, glossary card,
  // links to the objections encyclopedia).
  async function ask(query, opts = {}) {
    const res = await ask0(query, opts);
    if (!res || res.type === 'empty') return res;
    const q = res.query || '';
    const g = termFor(q);
    if (g && !res.term && (isBareTerm(q, g) || TERM_CUE.test(q))) res.term = g;
    // objections encyclopedia: for questions and objections, not for a plain topic («قصة يوسف»)
    const asks = /[؟?]/.test(q) || /^(لماذا|لم|هل|كيف|ما|ماذا|من|اليس|الم|اين|متي|كم)\s/.test(normAr(q)) || res.polemic || res.sensitive || res.type === 'khilaf';
    if (asks && ['topic', 'notfound', 'verify', 'term', 'khilaf', 'abstain'].includes(res.type) && res.reason !== 'violence' && res.reason !== 'dream') {
      const kw = (res.meta && res.meta.kwAr) || [];
      const b = bayenatFor(q, kw);
      if (b.length) res.bayenat = b;
    }
    if (res.type === 'verify' && (res.verdict === 'notfound' || res.verdict === 'notverse') && res.checked) res.hadithCheck = res.checked;
    // an Arabic saying (not a question) that is not in the Quran: is it a hadith? (Dorar, looked up by the app)
    else if (res.type === 'notfound' && AR_RANGE.test(q) && !/^(ما|ماذا|من|متى|اين|كيف|لماذا|لم|كم|هل)\s/.test(normAr(q)) && normAr(q).split(' ').length >= 2) res.hadithCheck = q;
    res.level = levelOf(res);
    return res;
  }

  async function ask0(query, { uiLang = 'ar', llm = null, limit = 30, llmTimeoutMs = 8000, mode = 'auto' } = {}) {
    const q = (query || '').trim().slice(0, 500);
    const lang = q ? detectLang(q, uiLang) : uiLang;
    const M = MSG[lang];
    const base = { query: q, lang, meta: { route: null, llm: { used: false } } };
    if (!q) return { ...base, type: 'empty', answer: [{ kind: 'text', text: MSG[uiLang].empty }], verses: [], focus: null };

    // 0. well-known verse names
    const fam = mode === 'topic' ? null : famousLookup(q);
    if (fam) {
      base.meta.route = 'famous';
      const vs = [];
      for (const [s, a, b] of fam) for (let x = a; x <= b; x++) vs.push(verseResult(idxOf(s, x)));
      const label = fam.length === 1 && fam[0][1] === fam[0][2] ? `${fam[0][0]}:${fam[0][1]}` : fam.map(([s, a, b]) => `${s}:${a}-${b}`).join(' · ');
      const answer = [{ kind: 'text', text: vs.length === 1 ? M.verse(label) : M.range(label) }];
      const pool = sentencePool(lang, [vs[0].idx], 99);
      if (pool.length) answer.push(quoteOf({ ...pool[0], text: (src[pool[0].source].text[vs[0].idx] || '').replace(/^\d+\.\s*/, '') }));
      return { ...base, type: vs.length === 1 ? 'verse' : 'range', answer, verses: vs, focus: vs[0].idx, suras: groupBySura(vs.map(v => v.idx)) };
    }

    // 1. references & surah names
    const r = mode === 'topic' ? null : parseReference(q);
    let altSura = null;
    if (r) {
      base.meta.route = 'reference';
      if (r.s < 1 || r.s > 114) return { ...base, type: 'invalid_ref', answer: [{ kind: 'text', text: M.invalidSura }], verses: [], focus: null };
      const S = suras[r.s - 1];
      if (r.a == null) {
        // "التوبة", "مريم", "the cow": a surah name that is also an ordinary word.
        // Surah if the word essentially occurs there, else topic + "open surah".
        if (r.bare && (r.kind === 'ar' || r.kind === 'meaning')) {
          const ts0 = topicSearchAuto(q, lang, uiLang, 20);
          const inS = ts0.ranked.filter(x => suraOf[x.idx] === S.n).length;
          if (ts0.ranked.length >= 3 && inS / ts0.ranked.length < 0.6) altSura = S.n;
        }
        if (!altSura) {
          const vs = []; for (let a = 1; a <= S.ayas; a++) vs.push(verseResult(S.first + a - 1));
          return { ...base, type: 'sura', sura: S.n, answer: [{ kind: 'text', text: M.sura(S) }], verses: vs, focus: S.first,
            suras: [{ sura: S.n, verses: vs.map(v => v.idx), score: 1 }], alt: r.bare ? { mode: 'topic', query: q } : null };
        }
      } else {
        const lastA = r.b ?? r.a;
        if (r.a < 1 || lastA > S.ayas || lastA < r.a) {
          return { ...base, type: 'invalid_ref', answer: [{ kind: 'text', text: M.invalidRef(lang === 'ar' ? S.ar : S.tr, S.ayas) }], verses: [], focus: S.first };
        }
        const vs = []; for (let a = r.a; a <= lastA; a++) vs.push(verseResult(S.first + a - 1));
        const answer = [{ kind: 'text', text: r.b ? M.range(`${S.n}:${r.a}-${lastA}`) : M.verse(`${S.n}:${r.a}`) }];
        return { ...base, type: r.b ? 'range' : 'verse', answer, verses: vs, focus: vs[0].idx, suras: groupBySura(vs.map(v => v.idx)) };
      }
    }

    // 1b. what a core term means / how to translate it (glossary of the reference pack)
    const term = mode === 'topic' ? null : termFor(q);
    if (term && TERM_CUE.test(q)) {
      base.meta.route = 'term';
      const tix = topicIndexFor(term.ar, 'ar', [], 12);
      // no topic with verses in the index: the verses where the word itself occurs
      const ids = tix ? tix.ids : (topicSearch(term.ar, 'ar', 12).ranked || []).filter(x => x.cov === 1).map(x => x.idx);
      return { ...base, lang, type: 'term', term, answer: [{ kind: 'text', text: M.term(term.ar) }], verses: ids.map(i => verseResult(i)),
        focus: ids.length ? ids[0] : null, suras: groupBySura(ids), topicIndex: tix };
    }
    // 1c. agreement / disagreement among scholars: no claim without a source
    if (KHILAF.test(normAr(q)) || KHILAF.test(normLatin(q))) {
      base.meta.route = 'khilaf';
      return { ...base, type: 'khilaf', answer: [{ kind: 'text', text: M.khilaf }], verses: [], focus: null,
        term: GLOSSARY.find(x => x.ar === 'الاجتهاد'), links: fatwaLinks(q) };
    }
    // 1d. «give me a hadith…», «is this a hadith…»: looked up in Dorar by the app
    const hr = mode === 'topic' ? null : hadithRequest(q);
    if (hr) {
      base.meta.route = 'hadith';
      return { ...base, type: 'hadith', hadith: hr, answer: [{ kind: 'text', text: hr.q ? M.hadithIntro : M.hadithLatin }], verses: [], focus: null };
    }

    // 2. guard (rulings, personal cases, dreams)
    const g = guardCheck(q);
    if (g) {
      base.meta.route = 'guard';
      if (g === 'ruling') return rulingAnswer(q, lang, uiLang, base);
      return { ...base, type: 'abstain', reason: g, answer: [{ kind: 'text', text: M[g] }], verses: [], focus: null };
    }

    // 3. quotes → verification
    let softPrefix = null;
    const quoted = ((q.match(/[«"“]([^»"”]+)[»"”]/) || [])[1] || '').trim();
    const explicit = /هل\s+(هذه|هذا|هذي)\s+(ال)?(آية|اية)|هل\s+(هذا|هذه)\s+(من|في)\s+(ال)?قرآن|هل\s+(ورد|وردت|جاء)\s+.*(القرآن)|\bis (this|it) (a |in the )?(verse|quran|ayah)\b|\bis this in the quran\b|\best[- ]ce (un verset|dans le coran|du coran)\b/i.test(q) ||
      quoted.split(/\s+/).length >= 3;
    const arabicPart = quoted || (explicit ? q.replace(/^.*?(:|؟|\?)\s*/, '') : q);
    if (explicit && !AR_RANGE.test(arabicPart)) {
      base.meta.route = 'verify-translation';
      return { ...base, ...verifyTranslation(arabicPart, lang) };
    }
    if (AR_RANGE.test(arabicPart)) {
      const isQuestion = /^(ما|ماذا|من|متى|اين|كيف|لماذا|لم|كم|هل|اذكر|اعطني|ابحث)\s/.test(normAr(q)) && !explicit;
      const words = normAr(arabicPart).split(' ').filter(Boolean).length;
      if (isQuestion && words >= 3) { // the question word may be the first word of a verse
        const v = verifyText(arabicPart, false, lang);
        if (v && v.verdict === 'exact') { base.meta.route = 'verify'; return { ...base, ...v }; }
      }
      if (explicit || (!isQuestion && words >= 3)) {
        const v = verifyText(arabicPart, explicit, lang);
        if (v && !v.soft) { base.meta.route = 'verify'; return { ...base, ...v, checked: arabicPart }; }
        if (v && v.soft) softPrefix = v;
      }
    }

    // 4. topic: (LLM intent + keywords) → BM25 over Quran + tafsir → (LLM selection) → explanation cards
    base.meta.route = softPrefix ? 'verify+topic' : 'topic';
    let expansion = null;
    if (llm && llm.expand) {
      try {
        expansion = verifyExpansion(await withTimeout(llm.expand({ query: q, lang }), llmTimeoutMs));
        base.meta.llm = { used: true, stage: 'expand', intent: expansion.intent };
        // a bare topic word ("الخمر", "usury") is a topic, not a fatwa request
        if (expansion.intent === 'ruling' && q.trim().split(/\s+/).length < 3) expansion.intent = 'topic';
        if (expansion.intent === 'ruling') return rulingAnswer(q, lang, uiLang, base);
        // the LLM recognised a question (not a pasted quote): answer it as a topic
        if (softPrefix && expansion.intent !== 'other') { softPrefix = null; base.meta.route = 'topic'; }
      } catch (e) { base.meta.llm = { used: false, error: String(e && e.message || e) }; }
    }
    const ts = topicSearchAuto(q, lang, uiLang, 40, expansion ? expansion.keywords : {});
    const { qtoks, ranked } = ts;
    const L = ts.lang;
    const ML = MSG[L];
    base.lang = L;
    // trap / hostile questions and sensitive subjects get verified context
    const polemic = isPolemic(q) || (expansion && expansion.intent === 'polemic');
    const pack = packFor(q);
    const sensitive = !!pack || isSensitive(q);
    const kwAr = expansion && expansion.keywords ? (expansion.keywords.ar || []) : [];
    // kept for the post-processing only (never serialised: LLM keywords are not content)
    Object.defineProperty(base.meta, 'kwAr', { value: kwAr, enumerable: false });
    // The subject index answers a query that IS a topic («الصبر», "patience"). A real question
    // («لماذا يعبد المسلمون الكعبة؟») keeps the normal selection: the verses of topic «الكعبة»
    // (e.g. 5:95, hunting expiation) do not answer it. The index is then only a last resort.
    const isQ = /[؟?]/.test(q) || /^(لماذا|لم|هل|كيف|ما|ماذا|من|اليس|الم|اين|متي|كم)\s/.test(normAr(q)) ||
      /^(why|how|what|is|are|does|do|can|who|where|when|pourquoi|comment|est|quel|quelle|que|qui)\b/i.test(normLatin(q));
    const tix = softPrefix ? null : topicIndexFor(q, L, isQ ? [] : kwAr);
    const tixUse = !!tix && ((tix.mode === 'exact' && !isQ) || (tix.mode === 'subset' && !ranked.length));
    if (!ranked.length && !(polemic && pack) && !tixUse) {
      if (softPrefix) return { ...base, type: 'verify', verdict: 'notverse', answer: softPrefix.answer, verses: [], focus: null };
      return { ...base, type: 'notfound', answer: [{ kind: 'text', text: ML.noTopic }], verses: [], focus: null, polemic, sensitive };
    }
    if (altSura) base.alt = { mode: 'sura', sura: altSura, name: L === 'ar' ? suras[altSura - 1].ar : suras[altSura - 1].tr };
    let order = ranked.map(x => x.idx);
    let confirmed = false, lowConf = false, personalNote = false, llmOk = false;
    if (!tixUse && llm && llm.select && ranked.length) {
      // verses proposed by the LLM are kept only if they exist AND their text
      // (verse, tafsir or translation) actually contains a word of the query
      const qset = new Set(qtoks);
      const proposed = (expansion ? expansion.refs : []).map(r0 => { const [a, b] = r0.split(':').map(Number); return idxOf(a, b); })
        .filter(i => i >= 0 && FIELDS[L].some(([name]) => {
          const txt = name === 'quran' ? searchAr[i] : (src[name] && src[name].text[i]);
          return txt && tokens(txt, L).some(t => qset.has(t));
        }));
      base.meta.proposedKept = proposed.length;
      const lex = ranked.map(x => x.idx), kw = ts.kwTop || [], seen = new Set(proposed), candIdx = [...proposed];
      for (let k = 0; candIdx.length < 30 && (k < lex.length || k < kw.length); k++) {
        for (const i of [lex[k], kw[k]]) if (i != null && !seen.has(i)) { seen.add(i); candIdx.push(i); }
      }
      const cands = candIdx.slice(0, 30).map(i => ({ id: ref(i), text: snippet(L, i) }));
      try {
        const out = await withTimeout(llm.select({ query: q, lang: L, candidates: cands }), llmTimeoutMs);
        const v = verifyLLM(out, cands);
        base.meta.llm = { ...base.meta.llm, used: true, model: out && out.model, rejected: v.rejected, intent: v.intent };
        if (v.intent === 'ruling' && q.trim().split(/\s+/).length < 3) v.intent = 'topic';
        if (v.intent === 'ruling') return rulingAnswer(q, lang, uiLang, base);
        if (v.intent === 'personal' || (expansion && expansion.intent === 'personal')) personalNote = true;
        if (v.ids.length) {
          const chosen = v.ids.map(id => { const [s, a] = id.split(':').map(Number); return idxOf(s, a); });
          llmOk = true;
          confirmed = v.confidence === 'high' || chosen.length >= 2;
          order = chosen.length >= 3 ? chosen : chosen.concat(order.filter(i => !chosen.includes(i) && ranked.find(x => x.idx === i && x.cov === 1)).slice(0, 6));
        } else lowConf = true;
      } catch (e) { base.meta.llm = { ...base.meta.llm, error: String(e && e.message || e) }; }
    }
    if (tixUse) {
      // the subject index (human-curated) gives the verses; the tafsir explains them
      order = tix.ids.slice();
      confirmed = true;
    } else if (!llmOk) {
      // no AI confirmation: only verses that contain every word of the question, no explanation
      order = ranked.filter(x => x.cov === 1).map(x => x.idx);
      if (!order.length) order = ranked.map(x => x.idx);
      order = order.slice(0, Math.min(limit, 12));
    } else order = order.slice(0, limit);
    // context pack (verified, curated) first for trap questions / sensitive subjects
    const packIdx = (polemic || sensitive) && pack ? pack.refs.map(r0 => { const [a, b] = r0.split(':').map(Number); return idxOf(a, b); }).filter(i => i >= 0) : [];
    const all = packIdx.concat(order.filter(i => !packIdx.includes(i)));
    const nSuras = new Set(all.map(i => suraOf[i])).size;
    const answer = [];
    if (softPrefix) answer.push(...softPrefix.answer, { kind: 'text', text: ML.related });
    else if (polemic) answer.push({ kind: 'text', text: ML.polemic });
    else if (tixUse) answer.push({ kind: 'text', text: (tix.mode === 'exact' ? ML.topicIndex : ML.topicSubset)(tix.total, q, nSuras, tix.name) });
    else answer.push({ kind: 'text', text: confirmed ? ML.topic(all.length, q, nSuras) : ML.topicLexical(all.length, q, nSuras) });
    for (const i of packIdx) { const c = cardOf(L, i, 'context'); if (c) answer.push(c); }
    if (confirmed) for (const i of order.filter(i => !packIdx.includes(i)).slice(0, 3)) { const c = cardOf(L, i, 'answer'); if (c) answer.push(c); }
    if (!llmOk && !softPrefix && !tixUse) answer.push({ kind: 'note', text: ML.lexicalOnly });
    if (lowConf) answer.push({ kind: 'note', text: ML.lowConf });
    if (sensitive) answer.push({ kind: 'note', text: ML.sensitiveNote });
    if (personalNote) answer.push({ kind: 'note', text: ML.personalNote });
    const rankOf = new Map(all.map((i, k) => [i, k]));
    return { ...base, type: softPrefix ? 'verify' : 'topic', verdict: softPrefix ? 'notverse' : undefined,
      answer, verses: all.map(i => verseResult(i)), focus: all[0], sensitive, polemic, pack: pack ? pack.id : null,
      suras: groupBySura(all, (i) => 1 / (rankOf.get(i) + 1)), terms: qtoks,
      topicIndex: tixUse ? { mode: tix.mode, name: tix.name, total: tix.total, groups: tix.groups } : null,
      paragraphBy: tixUse ? 'index' : confirmed ? 'llm' : (packIdx.length ? 'context' : 'none') };
  }

  // Full tafsir unit of one verse (never a fragment).
  function cardOf(lang, i, role) {
    const s = src[PARAGRAPH_FOR[lang]] || src[TAFSIR_FOR[lang]];
    const text = s && s.text[i] ? s.text[i].replace(/^\d+\.\s*/, '').trim() : '';
    if (!text) return null;
    return { kind: 'quote', role, text, source: s.id, sourceTitle: s.title, ref: ref(i), idx: i };
  }

  // Fatwa requests: no ruling, but related verses (labelled "not a fatwa") and links to official sources.
  function rulingAnswer(q, lang, uiLang, base) {
    const M = MSG[lang];
    const stripped = q.replace(RULING_WORDS, ' ').replace(/\s+/g, ' ').trim();
    const ts = stripped ? topicSearchAuto(stripped, lang, uiLang, 8) : { ranked: [] };
    const related = (ts.ranked || []).filter(x => x.cov === 1).slice(0, 6).map(x => verseResult(x.idx, { relatedOnly: true }));
    base.meta.route = base.meta.route || 'guard';
    return { ...base, type: 'abstain', reason: 'ruling', answer: [{ kind: 'text', text: M.ruling }], verses: related,
      focus: related.length ? related[0].idx : null, links: fatwaLinks(stripped || q) };
  }

  // Neighbouring verses of the same surah (context view).
  function context(i, n = 2) {
    const out = [];
    for (let k = i - n; k <= i + n; k++) if (k >= 0 && k < NV && suraOf[k] === suraOf[i]) out.push(k);
    return out;
  }

  function snippet(lang, i) {
    const s = src[TAFSIR_FOR[lang]] || src[TAFSIR_FOR.ar];
    const t = (s && s.text[i]) || searchAr[i];
    return t.replace(/^\d+\.\s*/, '').slice(0, 120);
  }

  return {
    ask, ref, idxOf, suraOf, ayaOf, suras, verses, sources: src,
    addTopicIndex, addBayenat, topicIndexFor, bayenatFor, hasTopics: () => !!TOPICS, hasBayenat: () => !!BAY,
    addSource(id, payload) { src[id] = payload; fields.delete(id); },
    hasSource: (id) => !!src[id],
    topicSearch, verifyText, parseReference, findSura, sentencePool, context,
    tafsir: (lang, i) => (src[TAFSIR_FOR[lang]] || {}).text?.[i] || '',
    text: (id, i) => (src[id] || {}).text?.[i] || '',
    translation: (lang, i) => TRANSLATION_FOR[lang] ? ((src[TRANSLATION_FOR[lang]] || {}).text?.[i] || '') : '',
  };
}
