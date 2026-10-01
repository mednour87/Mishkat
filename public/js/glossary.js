// Glossary of core terms. The ten first entries are copied word for word from the
// challenge's scientific reference pack («نماذج لقاموس المصطلحات الأساسية»,
// المرجعية والحزمة العلمية والبيانات، ص 8): Arabic term, approved English
// equivalent and usage rule. «الاجتهاد» comes from الجمهرة (islamic-content.com),
// the dictionary the pack designates for terminology.
// The pack gives English equivalents only; no French equivalent is invented.
import { normAr, normLatin } from './engine.js';

const PACK = 'المرجعية والحزمة العلمية — تحدي الذكاء الاصطناعي في خدمة المحتوى الإسلامي (ص 8)';
const JAM = (q) => `https://islamic-content.com/search?query=${encodeURIComponent(q)}`;

export const GLOSSARY = [
  { ar: 'الإسلام', en: 'Islam', rule: 'دين الاستسلام لله بالتوحيد والانقياد له بالطاعة، ويشرح بحسب السياق ولا يختزل في معنى ثقافي عام.',
    latin: ['islam'], src: PACK, more: JAM('الإسلام') },
  { ar: 'التوحيد', en: 'Tawhid / Oneness of God', rule: 'يفضل إبقاء المصطلح مع شرح معناه إفراد الله بالربوبية والألوهية ووصفه بما جاء الوحي به من أسمائه الحسنى؛ ولا يختزل في ترجمة قد توحي بمجرد الوحدانية العددية.',
    latin: ['tawhid', 'tawheed', 'tauhid', 'oneness of god', 'unicite'], src: PACK, more: 'https://islamic-content.com/t/1795' },
  { ar: 'العبادة', en: 'Worship', rule: 'تشمل أعمال القلب والقول والعمل التي يتقرب بها العبد إلى الله، ولا تحصر في الشعائر فقط.',
    latin: ['worship', 'ibadah', 'ibada', 'ibadat', 'adoration'], src: PACK, more: JAM('العبادة') },
  { ar: 'النبوة', en: 'Prophethood', rule: 'تستخدم للدلالة على اصطفاء الأنبياء بالوحي، مع التمييز بينها وبين القيادة الدينية البشرية.',
    latin: ['prophethood', 'nubuwwah', 'nubuwwa', 'prophetie'], src: PACK, more: JAM('النبوة') },
  { ar: 'الوحي', en: 'Revelation', rule: 'يشرح بوصفه ما أوحاه الله إلى أنبيائه، مع تجنب استعمالات فضفاضة قد توهم الإلهام الشخصي.',
    latin: ['revelation', 'wahy', 'wahi'], src: PACK, more: JAM('الوحي') },
  { ar: 'الشريعة', en: 'Sharia / Islamic law and guidance', rule: 'يشرح بحسب السياق، ولا يختزل في العقوبات أو القانون الجنائي.',
    latin: ['sharia', 'shariah', 'shari a', 'charia', 'islamic law'], src: PACK, more: JAM('الشريعة') },
  { ar: 'الحديث', en: 'Hadith', rule: 'ما نُقل عن النبي ﷺ من قول أو فعل أو تقرير ونحو ذلك، مع بيان درجة الثبوت عند الاستدلال.',
    latin: ['hadith', 'hadeeth'], src: PACK, more: JAM('الحديث') },
  { ar: 'السنة', en: 'Sunnah', rule: 'هدي النبي ﷺ وطريقته، ويحدد المقصود بحسب السياق العلمي.',
    latin: ['sunnah', 'sunna'], src: PACK, more: JAM('السنة') },
  { ar: 'الفتوى', en: 'Fatwa', rule: 'جواب شرعي يصدره مؤهل في واقعة أو سؤال؛ ولا يساوى بالمعلومة العامة.',
    latin: ['fatwa', 'fatwah', 'fatawa'], src: PACK, more: JAM('الفتوى') },
  { ar: 'الدعوة', en: 'Da‘wah / Invitation to Islam', rule: 'التعريف بالإسلام والدعوة إليه بالحكمة، ويختار المقابل بحسب السياق والجمهور.',
    latin: ['dawah', 'da wah', 'dawa', 'da wa'], src: PACK, more: JAM('الدعوة') },
  { ar: 'الاجتهاد', en: null, translit: 'ijtihād',
    rule: 'بذل الوسع للنظر في الأدلة ممن هو أهل لذلك لمعرفة الحكم الشرعي. وعند الإطلاق ينصرف إلى الاجتهاد الفردي دون الجماعي.',
    latin: ['ijtihad'], src: 'الجمهرة — موسوعة المصطلحات الإسلامية (islamic-content.com)', more: 'https://islamic-content.com/dictionary/word/196' },
];

const bare = (w) => normAr(w).replace(/^ال/, '');
let KEYS = null; // built on first use (engine.js imports this module: no work at load time)
const keys = () => KEYS || (KEYS = GLOSSARY.map(g => ({ g, ar: bare(g.ar), latin: g.latin.map(normLatin) })));

// A question asking what a term means or how to translate it.
export const TERM_CUE = /(ترجم|ترجمة|ترجمه|معنى|معني|ما\s+هو|ما\s+هي|ماذا\s+يعني|تعريف|مصطلح|مفهوم|بالانجليزي|بالإنجليزي|بالفرنسي)|\b(translat\w*|meaning|mean|means|define|definition|what is|what's|term|tradui\w*|signifi\w*|qu ?est[- ]ce que|definition|veut dire|terme)\b/i;

// The glossary entry named in the question (Arabic word with or without «ال», or Latin form).
export function termFor(q) {
  const words = normAr(q).split(/\s+/).map(w => w.replace(/^(و|ف)?(بال|كال|لل|ال|ب|ل|ك)?/, ''));
  const nl = ' ' + normLatin(q) + ' ';
  for (const k of keys()) {
    if (words.includes(k.ar)) return k.g;
    if (k.latin.some(l => nl.includes(' ' + l + ' '))) return k.g;
  }
  return null;
}

// True when the question is nothing but the term itself («التوحيد», "tawhid").
export function isBareTerm(q, g) {
  const t = normAr(q).replace(/[؟?!.]/g, '').trim();
  return bare(t) === bare(g.ar) || g.latin.includes(normLatin(q).replace(/[?!.]/g, '').trim());
}
