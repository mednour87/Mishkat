// T122 (6 Oct 2026) — which approved encyclopedia of Ad-Durar As-Saniyyah completes an answer:
//   aqeeda  (dorar.net/aqeeda)  a question of creed: tawhid, faith, the unseen, the Last Day, the Companions…
//   history (dorar.net/history) a question of Sira or history: a battle, a caliph, a date, a birth, a death…
// A question for which the Quran search found no verse («من هو أول الخلفاء الراشدين», «من هي خديجة») asks both —
// before, Mishkat answered such questions «I found nothing». Rulings keep the Fiqh Encyclopedia (T081); a person in
// crisis, a polemic with its context pack, a surah or a verse asked by reference get no encyclopedia box.
import { normQ } from './scope.js';
import { practicalTopic } from './fiqhpractical.js?v=t123';

const CREED = /(^| )(و|ف|ب|ل)?(ال)?(توحيد|شرك|ايمان|عقيده|عقائد|قضاء|ملائكه|جن|سحر|حسد|قبر|الساعه|ساعه|اشراط|دجال|مهدي|ياجوج|ماجوج|شفاعه|صراط|ميزان|حوض|بعث|حشر|نشور|صحابه|السنه والجماعه|بدعه|بدع|كفر|نفاق|ولاء|براء|اسماء الله|صفات الله|الاسماء والصفات|نبوه|معجزه|معجزات|كرامات|اولياء|نواقض|شروط|اركان|شهادتين|عرش|كرسي|لوح|روح|رؤيه الله|اليوم الاخر|القدر خيره)( |$)/;
const CREED_EN = /\b(tawhid|tawheed|monotheism|shirk|polytheism|faith|belief|creed|aqeedah|aqida|angels?|jinn|magic|sorcery|evil eye|grave|hour|dajjal|antichrist|mahdi|gog|magog|intercession|sirat|resurrection|companions|sahabah|innovation|bid.?ah|disbelief|kufr|hypocrisy|attributes of allah|names of allah|prophethood|miracles?|predestination|divine decree|qadar|last day|throne|soul)\b/;
const HIST = /(^| )(و|ف|ب|ل)?(ال)?(غزوه|غزوات|معركه|سريه|فتح|صلح|بيعه|هجره|خلافه|خليفه|خلفاء|دوله|متي|تاريخ|وفاه|توفي|توفيت|مات|ولد|ولدت|مولد|ولاده|استشهد|مقتل|زواج|تزوج|حجه الوداع|اسراء|معراج|سيره|صحابي|صحابيه|ام المومنين|امهات المومنين|ابو بكر|ابي بكر|عمر بن الخطاب|عثمان بن عفان|علي بن ابي طالب|خديجه|عائشه|فاطمه|حمزه|خالد بن الوليد|صلاح الدين|امويه|عباسيه|عثمانيه|اندلس|حطين|اليرموك|القادسيه|الخندق|احد|بدر|تبوك|حنين|خيبر|الحديبيه)( |$)/;
const HIST_EN = /\b(battle|caliph|caliphate|companion|when (was|did|is)|who was|who were|born|birth of|died|death of|hijra|hijrah|migration|conquest|dynasty|history|historical|treaty|pledge|abu bakr|umar|uthman|ali ibn|khadijah?|aisha|fatimah?|hamza|khalid|seerah|sirah|badr|uhud|khandaq|trench|hudaybiyyah|tabuk|khaybar|hunayn|umayyad|abbasid|ottoman|andalus|saladin)\b/;
const NO = new Set(['sura', 'verse', 'range', 'verify', 'hadith', 'card', 'empty', 'abstain', 'khilaf']);

export function encycKinds(res, query) {
  if (!res || NO.has(res.type) || res.crisis || res.polemic || res.pack === 'crisis') return [];
  const q = normQ(query || res.query || '');
  if (!q) return [];
  if (/^(قصه|قصة) /.test(q) || /\bstory of\b/.test(q)) return [];   // a story is told by its verses in order
  // T123: a practical fiqh question («شروط الصلاة», «نواقض الوضوء») is answered by the Fiqh Encyclopedia's own section
  // (js/fiqhpractical.js); the Creed Encyclopedia answered «شروط» with the conditions of the shahada (off topic)
  if (practicalTopic(query || res.query || '')) return [];
  const creed = CREED.test(q) || CREED_EN.test(q), hist = HIST.test(q) || HIST_EN.test(q);
  // a question about a battle carries the context pack of war verses: the history encyclopedia (an event, its date and
  // its course, quoted) is kept, the creed one is not needed
  if (res.pack === 'violence') return hist && ['topic', 'term', 'notfound'].includes(res.type) ? ['history'] : [];
  if (res.type === 'notfound') return ['aqeeda', 'history'];
  if (!['topic', 'term'].includes(res.type)) return [];
  return [...(creed ? ['aqeeda'] : []), ...(hist ? ['history'] : [])];
}

export const ENC_S = {
  ar: { title: 'من الموسوعات المعتمدة (الدرر السنية)', aqeeda: 'الموسوعة العقدية', history: 'الموسوعة التاريخية', loading: 'أبحث في الموسوعات المعتمدة…',
    read: 'اقرأ القسم في الموسوعة', readEvent: 'اقرأ الحدث كاملًا في الموسوعة', cut: 'مقتطف من نص الحدث؛ تتمته في الموسوعة.',
    date: (x) => [x.hijri ? `العام الهجري: ${x.hijri}` : '', x.month ? `الشهر: ${x.month}` : '', x.greg ? `الميلادي: ${x.greg}` : ''].filter(Boolean).join(' · '),
    byAi: 'اختار الذكاء الاصطناعي من نتائج بحث الموسوعة نفسها (قائمة مغلقة)؛ النص منقول كما هو بلا تعديل.', bySearch: 'من نتائج بحث الموسوعة نفسها؛ النص منقول كما هو بلا تعديل.',
    searchSite: 'ابحث في الموسوعة', arabicOnly: '' },
  en: { title: 'From the approved encyclopedias (Ad-Durar As-Saniyyah)', aqeeda: 'Creed Encyclopedia', history: 'History Encyclopedia', loading: 'Searching the approved encyclopedias…',
    read: 'Read the section in the encyclopedia', readEvent: 'Read the whole event in the encyclopedia', cut: 'An excerpt of the event; the rest is in the encyclopedia.',
    date: (x) => [x.hijri ? `Hijri year: ${x.hijri}` : '', x.month ? `month: ${x.month}` : '', x.greg ? `CE: ${x.greg}` : ''].filter(Boolean).join(' · '),
    byAi: 'The AI chose among the encyclopedia’s own search results (closed list); the text is quoted as it is.', bySearch: 'From the encyclopedia’s own search results; the text is quoted as it is.',
    searchSite: 'Search the encyclopedia', arabicOnly: 'The encyclopedias are in Arabic; their text is shown as written.' },
};
