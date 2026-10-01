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
  // light verb endings (fr: dépensez/dépenser/dépensent → dépens ; en: spending → spend)
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
  fr: new Set('le la les l un une des du de d et ou en dans sur au aux a pour par avec sans que qui quoi quel quelle quels quelles est sont etait ce cet cette ces il elle ils elles je tu nous vous se sa son ses leur leurs mon ma mes ne pas plus dit dire coran verset versets sourate sourates parle parlent comment pourquoi quand ou y montre moi trouve s explique sens signifie'.split(' ')),
};
// words present in a large share of verses: ignored when other words are given
const UBIQ = { ar: new Set(['له', 'رب', 'ربك', 'ربه', 'لله']), en: new Set(['allah', 'god', 'lord']), fr: new Set(['allah', 'dieu', 'seigneur']) };

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
  if (AR_RANGE.test(q)) return 'ar';
  const t = ' ' + normLatin(q) + ' ';
  const fr = (q.match(/[éèêàùçôîœ]/gi) || []).length * 2 +
    (t.match(/ (le|la|les|des|du|est|une|que|qui|quoi|pourquoi|comment|dans|sur|sourate|verset|parle|au|aux|et) /g) || []).length;
  const en = (t.match(/ (the|is|what|how|why|of|and|in|about|does|verse|surah|say|says|who|where) /g) || []).length;
  if (fr > en) return 'fr';
  if (en > fr) return 'en';
  return uiLang === 'fr' ? 'fr' : 'en';
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
    topic: (n, q) => `وجدتُ ${arCount(n, 'آية واحدة', 'آيتين', 'آيات', 'آية')} ذات صلة بـ«${q}». وهذا بيانها من التفسير المعتمد:`,
    noTopic: 'لم أجد مرجعًا كافيًا لهذا السؤال في الآيات والتفاسير المعتمدة لديّ، فأمتنع عن الإجابة حتى لا أنسب إلى القرآن ما ليس فيه. جرّب كلمة مفتاحية أوضح (مثل: الصبر، الوالدين، موسى).',
    ruling: 'هذا سؤال عن حكم شرعي، والفتوى لأهل العلم؛ فلا تُصدر «مشكاة» أحكامًا. تجد أدناه روابط مصادر الفتوى الرسمية، وآيات ذات صلة بالموضوع للاطلاع (وليست فتوى).',
    personal: 'هذه مسألة شخصية تحتاج إلى عالم أو مختص يسمع تفاصيلها. لا تقدّم «مشكاة» نصائح أو أحكامًا في الحالات الخاصة. يمكنك البحث عن موضوع عام (مثل: الصبر، بر الوالدين).',
    dream: 'تعبير الرؤى لا يدخل في عمل «مشكاة»، ولا يُبنى على آلة. يمكنك البحث عن ذكر الرؤيا في القرآن بكلمة «الرؤيا».',
    invalidRef: (s, n) => `سورة ${s} عدد آياتها ${n} فقط؛ هذا الرقم غير موجود.`,
    invalidSura: 'رقم السورة يجب أن يكون بين 1 و114.',
    empty: 'اكتب فكرة أو سؤالًا أو اسم سورة أو رقم آية أو جزءًا من آية.',
    lowConf: 'نتائج بحث لفظي (ثقة منخفضة) — تحقّق من السياق.',
    personalNote: 'هذه آيات عامة في الموضوع؛ أما حالتك الخاصة فاعرضها على عالم أو مختص.',
    topicLexical: (n, q) => `وجدتُ ${arCount(n, 'آية واحدة', 'آيتين', 'آيات', 'آية')} ورد فيها لفظ «${q}» (بحث لفظي).`,
    lexicalOnly: 'هذه نتائج بحث لفظي لم يؤكدها الذكاء الاصطناعي؛ قد لا تكون كلها متعلقة بسؤالك، فراجع السياق والتفسير.',
    polemic: 'هذه الآيات ذات الصلة بالسؤال، يعرضها التفسير المعتمد في سياقها كما هي، دون انتقاء جزء منها. والحكم على المعنى يكون بقراءة الآية مع سياقها وتفسيرها.',
    sensitiveNote: 'موضوع يحتاج إلى فهمه في سياقه: افتح «السياق» لقراءة ما قبل الآية وما بعدها، ولتفصيل الأحكام يُرجع إلى أهل العلم.',
    takfir: 'الحكم على الأشخاص أو الطوائف بالكفر من شأن أهل العلم والقضاء، لا من شأن أداة بحث. يمكنك البحث عن موضوع عام (مثل: الإيمان، الكفر) لقراءة الآيات وتفسيرها.',
    violence: 'لا تجيب «مشكاة» عن طلبات الإيذاء أو العنف. والنفس المعصومة محرّمة، ويمكنك البحث عن «حرمة النفس» لقراءة الآيات وتفسيرها.',
    trFound: 'وُجدت هذه العبارة في ترجمة معاني الآيات التالية:',
    trNone: 'لم أجد هذه العبارة في ترجمات المعاني المعتمدة لديّ. ولا يمكن الحكم على نص مترجَم بأنه آية؛ الصق النص العربي للتحقق الدقيق.',
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
    topic: (n, q) => `I found ${n} verse${n === 1 ? '' : 's'} related to “${q}”. Here is their explanation from vetted tafsir:`,
    noTopic: 'I could not find sufficient evidence for this in the vetted verses and tafsir I hold, so I abstain rather than attribute to the Quran what is not in it. Try a clearer keyword (e.g. patience, parents, Moses).',
    ruling: 'This asks for a religious ruling, which belongs to qualified scholars; Mishkat does not issue rulings. Below are links to official fatwa sources, and related verses for reading (not a fatwa).',
    personal: 'This is a personal matter that needs a scholar or specialist who can hear the details. Mishkat gives no advice or rulings on individual cases. You can search a general topic instead (e.g. patience, parents).',
    dream: 'Dream interpretation is outside Mishkat’s scope and should not be done by a machine. You can search for dreams mentioned in the Quran with the word “dream”.',
    invalidRef: (s, n) => `Surah ${s} has only ${n} verses; this verse number does not exist.`,
    invalidSura: 'The surah number must be between 1 and 114.',
    empty: 'Type an idea, a question, a surah name, a verse number or part of a verse.',
    lowConf: 'Keyword results (low confidence) — check the context.',
    personalNote: 'These are general verses on the subject; for your own situation, please consult a scholar or specialist.',
    topicLexical: (n, q) => `I found ${n} verse${n === 1 ? '' : 's'} containing the words of “${q}” (keyword search).`,
    lexicalOnly: 'These keyword results were not confirmed by the AI; some may not answer your question — check the context and the tafsir.',
    polemic: 'Here are the verses relevant to this question, each shown in full with its vetted tafsir — no part is cut out. The meaning of a verse is judged by reading it with its context and its tafsir.',
    sensitiveNote: 'This subject must be read in context: open “Context” to see the verses before and after, and refer to scholars for detailed rulings.',
    takfir: 'Judging that a person or a group has left Islam belongs to scholars and courts, not to a search tool. You can search a general topic (e.g. faith, disbelief) to read the verses and their tafsir.',
    violence: 'Mishkat does not answer requests to harm anyone. Human life is sacred; you can search “sanctity of life” to read the verses and their tafsir.',
    trFound: 'This wording appears in the translation of the following verse(s):',
    trNone: 'I could not find this wording in the vetted translations I hold. A translated sentence cannot be confirmed as a verse — translations differ — so do not attribute it to the Quran; paste the Arabic text for an exact check.',
  },
  fr: {
    sura: (s) => `Sourate ${s.tr} (${s.fr}) — ${s.type === 'meccan' ? 'mecquoise' : 'médinoise'}, ${s.ayas} versets, n° ${s.n} dans le Mushaf.`,
    verse: (r) => `Verset ${r}`,
    range: (r) => `Versets ${r}`,
    exact: (n) => n === 1 ? 'Ce texte figure mot pour mot dans le Coran ici :' : `Ce texte figure mot pour mot dans le Coran à ${n} endroits :`,
    near: (r) => `Cette formulation exacte est introuvable. Le verset le plus proche est ${r} ; les mots surlignés diffèrent. Le texte exact du Mushaf est :`,
    merged: (a, b) => `Ce texte semble mélanger deux versets : ${a} et ${b}. Attention à la différence :`,
    notFound: 'Ce texte est introuvable dans le Coran (lecture Hafs, texte Tanzil). Il peut s’agir d’un hadith, d’un dicton ou d’une citation déformée : il ne faut pas l’attribuer au Coran.',
    notVerse: 'Aucun verset du Coran n’a cette formulation (lecture Hafs, texte Tanzil) ; ce texte ne doit donc pas être attribué au Coran.',
    related: 'Versets partageant certains de ses mots ou son sens (recherche thématique) :',
    closest: 'Versets les plus proches par la formulation (à titre indicatif, pas une correspondance) :',
    topic: (n, q) => `J’ai trouvé ${n} verset${n === 1 ? '' : 's'} lié${n === 1 ? '' : 's'} à « ${q} ». Voici leur explication d’après un tafsir vérifié :`,
    noTopic: 'Je n’ai pas trouvé de preuve suffisante dans les versets et tafsirs vérifiés dont je dispose ; je m’abstiens plutôt que d’attribuer au Coran ce qui n’y est pas. Essayez un mot-clé plus clair (ex. patience, parents, Moïse).',
    ruling: 'Cette question demande un avis juridique (fatwa), qui relève des savants ; Mishkat ne rend aucun avis. Ci-dessous : des liens vers les sources officielles de fatwa, et des versets liés au sujet, à lire (ce n’est pas une fatwa).',
    personal: 'Il s’agit d’une situation personnelle qui demande un savant ou un spécialiste à l’écoute des détails. Mishkat ne donne ni conseil ni avis sur les cas individuels. Vous pouvez chercher un thème général (ex. patience, parents).',
    dream: 'L’interprétation des rêves est hors du champ de Mishkat et ne doit pas être confiée à une machine. Vous pouvez chercher les rêves mentionnés dans le Coran avec le mot « rêve ».',
    invalidRef: (s, n) => `La sourate ${s} ne compte que ${n} versets ; ce numéro n’existe pas.`,
    invalidSura: 'Le numéro de sourate doit être compris entre 1 et 114.',
    empty: 'Écrivez une idée, une question, un nom de sourate, un numéro ou un fragment de verset.',
    lowConf: 'Résultats par mots-clés (confiance faible) — vérifiez le contexte.',
    personalNote: 'Ce sont des versets généraux sur le sujet ; pour votre situation personnelle, consultez un savant ou un spécialiste.',
    topicLexical: (n, q) => `J’ai trouvé ${n} verset${n === 1 ? '' : 's'} contenant les mots de « ${q} » (recherche par mots-clés).`,
    lexicalOnly: 'Ces résultats par mots-clés n’ont pas été confirmés par l’IA ; certains peuvent ne pas répondre à votre question — vérifiez le contexte et le tafsir.',
    polemic: 'Voici les versets liés à cette question, chacun affiché en entier avec son tafsir vérifié — sans en couper une partie. Le sens d’un verset se juge en le lisant avec son contexte et son tafsir.',
    sensitiveNote: 'Ce sujet se lit dans son contexte : ouvrez « Contexte » pour voir les versets avant et après, et référez-vous aux savants pour le détail des règles.',
    takfir: 'Juger qu’une personne ou un groupe est sorti de l’islam relève des savants et des tribunaux, pas d’un outil de recherche. Vous pouvez chercher un thème général (ex. la foi, la mécréance) pour lire les versets et leur tafsir.',
    violence: 'Mishkat ne répond pas aux demandes de nuire à autrui. La vie humaine est sacrée ; vous pouvez chercher « caractère sacré de la vie » pour lire les versets et leur tafsir.',
    trFound: 'Cette formulation figure dans la traduction du ou des versets suivants :',
    trNone: 'Je ne trouve pas cette formulation dans les traductions vérifiées dont je dispose. Une phrase traduite ne peut pas être confirmée comme verset — les traductions diffèrent — ne l’attribuez donc pas au Coran ; collez le texte arabe pour une vérification exacte.',
  },
};

// ------------------------------------------------ cross-lingual thesaurus
// Groups of equivalent search terms [ar, en, fr]. Used ONLY to widen the
// retrieval (which verses to look at); never shown as content.
const THESAURUS = [
  ['موسى', 'moses', 'moise'], ['عيسى المسيح', 'jesus messiah', 'jesus messie'], ['مريم', 'mary maryam', 'marie maryam'],
  ['ابراهيم', 'abraham ibrahim', 'abraham ibrahim'], ['نوح', 'noah', 'noe'], ['يوسف', 'joseph yusuf', 'joseph yusuf'],
  ['يعقوب', 'jacob', 'jacob'], ['اسحاق', 'isaac', 'isaac'], ['اسماعيل', 'ishmael ismail', 'ismael'], ['داود', 'david', 'david'],
  ['سليمان', 'solomon', 'salomon'], ['يونس', 'jonah', 'jonas'], ['ايوب', 'job', 'job'], ['زكريا', 'zechariah zakariya', 'zacharie'],
  ['يحيي', 'john yahya', 'jean yahya'], ['هارون', 'aaron', 'aaron'], ['لوط', 'lot', 'loth lot'], ['هود', 'hud', 'hud houd'],
  ['صالح', 'salih', 'salih'], ['شعيب', 'shuayb', 'chouaib shuayb'], ['ادم', 'adam', 'adam'], ['محمد', 'muhammad', 'muhammad mohammed'],
  ['فرعون', 'pharaoh', 'pharaon'], ['ابليس الشيطان', 'satan iblees', 'satan iblis diable'], ['جبريل', 'gabriel', 'gabriel'],
  ['الجنة', 'paradise garden', 'paradis jardin'], ['النار جهنم', 'hell hellfire', 'enfer'],
  ['الصلاة', 'prayer', 'priere salat'], ['الصيام الصوم', 'fasting', 'jeune'], ['الزكاة', 'zakah', 'aumone zakat'],
  ['الحج', 'hajj pilgrimage', 'pelerinage hajj'], ['الصبر', 'patience patient', 'patience patient endurance'],
  ['الوالدين', 'parent', 'parent pere mere'], ['الرحمة', 'mercy', 'misericorde'], ['التوبة', 'repentance repent', 'repentir'],
  ['الكعبة', 'kaaba', 'kaaba'], ['القران', 'quran', 'coran'], ['الملائكة', 'angel', 'ange'], ['اليتيم', 'orphan', 'orphelin'],
  ['الوضوء توضؤوا فتوضؤوا', 'ablution wudu', 'ablution'], ['الربا', 'usury interest riba', 'usure riba'], ['الخمر', 'intoxicant wine', 'vin alcool'],
];
const THES_INDEX = { ar: new Map(), en: new Map(), fr: new Map() };
THESAURUS.forEach((g, gi) => {
  ['ar', 'en', 'fr'].forEach((l, li) => {
    for (const w of g[li].split(' ')) for (const t of tokens(w, l, { stop: false })) THES_INDEX[l].set(t, gi);
  });
});
export function expandTokens(qtoks, fromLang, toLang) {
  const extra = [];
  for (const t of qtoks) {
    const gi = THES_INDEX[fromLang].get(t);
    if (gi == null) continue;
    const li = ['ar', 'en', 'fr'].indexOf(toLang);
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
export function isPolemic(q) { return POLEMIC.test(q) || POLEMIC.test(normLatin(q)); }

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
  const na = ' ' + normAr(q) + ' ', nl = ' ' + normLatin(q) + ' ';
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
  fr: [['rashid_fr', 1.0], ['mukhtasar_fr', 0.7]],
};
// explanatory paragraph source per language (Arabic: At-Tafsir Al-Muyassar)
export const PARAGRAPH_FOR = { ar: 'muyassar_ar', en: 'mukhtasar_en', fr: 'mukhtasar_fr' };
export const TAFSIR_FOR = { ar: 'mukhtasar_ar', en: 'mukhtasar_en', fr: 'mukhtasar_fr' };
export const TRANSLATION_FOR = { ar: null, en: 'saheeh_en', fr: 'rashid_fr' };
export const SOURCES_NEEDED = {
  ar: ['mukhtasar_ar', 'muyassar_ar'],
  en: ['mukhtasar_en', 'saheeh_en'],
  fr: ['mukhtasar_fr', 'rashid_fr'],
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
  const res = { intent: 'topic', keywords: { ar: [], en: [], fr: [] }, refs: [] };
  if (!out || typeof out !== 'object') return res;
  res.refs = (Array.isArray(out.refs) ? out.refs : []).map(x => String(x).trim()).filter(x => /^\d{1,3}:\d{1,3}$/.test(x)).slice(0, 8);
  if (INTENTS.has(out.intent)) res.intent = out.intent;
  const kw = out.keywords && typeof out.keywords === 'object' ? out.keywords : {};
  for (const l of ['ar', 'en', 'fr']) {
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
  // alias -> sura; kind: 'ar' (Arabic name), 'tr' (transliteration), 'meaning' (en/fr)
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
    addAlias(normLatin(s.fr).replace(/^(la |le |les |l )/, '').replace(/\s/g, ''), s.n, 'meaning');
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
      const ordinary = isLatin && (THES_INDEX.en.has(stemLatin(c)) || THES_INDEX.fr.has(stemLatin(c)));
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
      for (const id of [TRANSLATION_FOR.en, TRANSLATION_FOR.fr, TAFSIR_FOR.en, TAFSIR_FOR.fr]) {
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
    if (lang === 'ar') return { lang, ...topicSearch(q, 'ar', limit, extra.ar || []) };
    const a = topicSearch(q, lang, limit, extra[lang] || []);
    const other = lang === 'en' ? 'fr' : 'en';
    if (!src[FIELDS[other][0][0]]) return { lang, ...a };
    const t = ' ' + normLatin(q) + ' ';
    const strongFr = /[éèêàùçôîœ]/i.test(q) || / (le|la|les|des|du|est|une|dans|sur|pourquoi|comment) /.test(t);
    const strongEn = / (the|is|what|how|why|does|about|who|where) /.test(t);
    if (strongFr || strongEn) return { lang, ...a };
    const b = topicSearch(q, other, limit, extra[other] || []);
    const val = (r) => Math.min(r.nFull || 0, 30) * 1000 + (r.topScore || 0);
    return val(b) > val(a) ? { lang: other, ...b } : { lang, ...a };
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

  // ---------------------------------------------------------------- ask()
  async function ask(query, { uiLang = 'ar', llm = null, limit = 30, llmTimeoutMs = 8000, mode = 'auto' } = {}) {
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
    if (!ranked.length && !(polemic && pack)) {
      if (softPrefix) return { ...base, type: 'verify', verdict: 'notverse', answer: softPrefix.answer, verses: [], focus: null };
      return { ...base, type: 'notfound', answer: [{ kind: 'text', text: ML.noTopic }], verses: [], focus: null };
    }
    if (altSura) base.alt = { mode: 'sura', sura: altSura, name: L === 'ar' ? suras[altSura - 1].ar : suras[altSura - 1].tr };
    let order = ranked.map(x => x.idx);
    let confirmed = false, lowConf = false, personalNote = false, llmOk = false;
    if (llm && llm.select && ranked.length) {
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
    if (!llmOk) {
      // no AI confirmation: only verses that contain every word of the question, no explanation
      order = ranked.filter(x => x.cov === 1).map(x => x.idx);
      if (!order.length) order = ranked.map(x => x.idx);
      order = order.slice(0, Math.min(limit, 12));
    } else order = order.slice(0, limit);
    // context pack (verified, curated) first for trap questions / sensitive subjects
    const packIdx = (polemic || sensitive) && pack ? pack.refs.map(r0 => { const [a, b] = r0.split(':').map(Number); return idxOf(a, b); }).filter(i => i >= 0) : [];
    const answer = [];
    if (softPrefix) answer.push(...softPrefix.answer, { kind: 'text', text: ML.related });
    else if (polemic) answer.push({ kind: 'text', text: ML.polemic });
    else answer.push({ kind: 'text', text: confirmed ? ML.topic(order.length, q) : ML.topicLexical(order.length, q) });
    for (const i of packIdx) { const c = cardOf(L, i, 'context'); if (c) answer.push(c); }
    if (confirmed) for (const i of order.filter(i => !packIdx.includes(i)).slice(0, 3)) { const c = cardOf(L, i, 'answer'); if (c) answer.push(c); }
    if (!llmOk && !softPrefix) answer.push({ kind: 'note', text: ML.lexicalOnly });
    if (lowConf) answer.push({ kind: 'note', text: ML.lowConf });
    if (sensitive) answer.push({ kind: 'note', text: ML.sensitiveNote });
    if (personalNote) answer.push({ kind: 'note', text: ML.personalNote });
    const all = packIdx.concat(order.filter(i => !packIdx.includes(i)));
    const rankOf = new Map(all.map((i, k) => [i, k]));
    return { ...base, type: softPrefix ? 'verify' : 'topic', verdict: softPrefix ? 'notverse' : undefined,
      answer, verses: all.map(i => verseResult(i)), focus: all[0], sensitive, polemic, pack: pack ? pack.id : null,
      suras: groupBySura(all, (i) => 1 / (rankOf.get(i) + 1)).slice(0, 12),
      paragraphBy: confirmed ? 'llm' : (packIdx.length ? 'context' : 'none') };
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
    addSource(id, payload) { src[id] = payload; fields.delete(id); },
    hasSource: (id) => !!src[id],
    topicSearch, verifyText, parseReference, findSura, sentencePool, context,
    tafsir: (lang, i) => (src[TAFSIR_FOR[lang]] || {}).text?.[i] || '',
    text: (id, i) => (src[id] || {}).text?.[i] || '',
    translation: (lang, i) => TRANSLATION_FOR[lang] ? ((src[TRANSLATION_FOR[lang]] || {}).text?.[i] || '') : '',
  };
}
