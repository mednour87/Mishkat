// T082: questions that try to change how Mishkat works (prompt injection), or that ask it to WRITE religious
// text (a verse, a hadith, a fatwa). Both get a fixed answer and never reach an AI model. Shared by the page,
// the search worker, the local server and the Cloudflare functions (defence in depth: the server refuses the
// same texts even when a script calls the API directly).
// Kept narrow on purpose: «قل هو الله أحد», "say: he is Allah", «ما حكم كتابة آية على الجدار», "how many verses"
// are ordinary questions.

const AR_MARKS = /[ً-ْٰـ]/g;
const ar = (s) => String(s || '').replace(AR_MARKS, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي');

const INJECTION = [
  // English: override / reveal / role-play / fake chat roles
  /\b(ignore|disregard|forget|override|bypass|drop)\b[^.?!]{0,40}\b(previous|prior|above|earlier|all|any|your|the|these|system)\b[^.?!]{0,30}\b(instructions?|rules?|prompts?|guidelines|constraints|restrictions|directives)\b(?!\s+of\s+(tajw[ei]e?d|recitation|reading|grammar|arabic|fiqh|islam|prayer|sal[aā]h|fasting|inheritance|hajj|zakat|the (quran|prayer|fast|mosque)))/i,
  /\b(system prompt|developer mode|dev mode|jailbreak|do anything now|\bDAN\b|god mode|unfiltered mode)\b/i,
  /\b(you are now|from now on,? you|pretend (to be|you are|that you)|role-?play as|you must now)\b|(^|\b(you|please|now)\s+)act as (a|an|my|if)\b/i,
  /\b(reveal|print|show|repeat|output|tell me|display|leak)\b[^.?!]{0,30}\b(your|the|system|hidden|initial)\b[^.?!]{0,20}\b(prompt|instructions|rules|guidelines|configuration)\b/i,
  /<\/?(system|assistant|user|instructions?|im_start|im_end)>|\[\/?(INST|SYS)\]|<\|im_(start|end)\|>|^\s*(system|assistant)\s*:/im,
  /"(intent|keywords|refs|keep|ids|sentences|points|verdict)"\s*:/,
  // French
  /\b(ignore|oublie|contourne)\b[^.?!]{0,40}\b(instructions?|consignes|r[eè]gles)\b/i,
  /\b(tu es maintenant|fais semblant d.?[eê]tre|agis comme)\b/i,
];
const INJECTION_AR = [
  /(تجاهل|انس|انسي|تخط|تخطي|تجاوز|الغ|الغي|اهمل|اترك)\S*\s+(كل\s+|جميع\s+)?(ال)?(تعليمات|اوامر|قواعد|قيود|توجيهات|ضوابط|برمجتك|نظامك)/,
  /(انت|انتي)\s+(الان|من\s+الان)\s+(مفتي|شيخ|عالم|نموذج|مساعد|بوت|حر)/,
  /(تصرف|تقمص|مثل|العب)\s+(دور|كانك|كأنك)/,
  /(اظهر|اكشف|اعرض|اطبع|اعطني|ارسل)\s+(لي\s+)?(ال)?(تعليمات|البرومبت|الموجه|اعداداتك|نظامك|برمجتك)/,
  /(وضع\s+المطور|برومبت\s+النظام)/,
];

// asks Mishkat to compose religious text (never done: rule 1 of the project)
const FABRICATE = [
  /\b(compose|invent|make up|fabricate|forge)\b[^.?!]{0,25}\b(a |an |new |some |me a |me an |me some )?(quran(ic)? )?(verse|verses|ayah|ayat|surah|sura|hadith|hadiths|fatwa)\b/i,
  /\b(write|generate|create)\b[^.?!]{0,12}\b(a |an |new |some |me a |me an |me some |your own )(quran(ic)? )?(verse|ayah|surah|sura|hadith|fatwa)\b(?! (in|on) (calligraphy|the wall|a wall|paper))/i,
  /\b([eé]cris|invente|compose|g[eé]n[eè]re)\b[^.?!]{0,25}\b(un |une |des )?(verset|sourate|hadith|fatwa)\b/i,
];
const FABRICATE_AR = [
  // a NAMED passage («اكتب آية الكرسي», «اكتب لي سورة الإخلاص», «اكتب سورة يس», «اكتب الآية 255») is a request to
  // show it, not to compose one: only «اكتب (لي) آية/حديثا/فتوى» without a name is refused
  /(اكتب|اكتبي)\s+(لي\s+|لنا\s+)?(اية|ايه|ايات|سوره|سورة)(?!\s+(ال\S|يس|طه|ص|ق|ن|رقم|[0-9٠-٩]))(\s|$)/,
  /(اكتب|اكتبي)\s+(لي\s+|لنا\s+)?(حديثا|حديث|احاديث|فتوي|فتوى)(\s|$)/,
  /(اخترع|اختلق|ولد|انشئ|اصنع|ركب|زور)\s+(لي\s+|لنا\s+)?(اية|ايه|ايات|سوره|سورة|حديثا|حديث|احاديث|فتوي|فتوى)(\s|$)/,
  /(ألّف|ألِّف|الّف)\s+(لي\s+)?(اية|آية|سورة|حديثا|حديث|فتوى)/,
];

export function injectionKind(text) {
  const s = String(text || '');
  if (!s.trim()) return null;
  const a = ar(s);
  if (FABRICATE.some(re => re.test(s)) || FABRICATE_AR.some(re => re.test(a) || re.test(s))) return 'fabricate';
  if (INJECTION.some(re => re.test(s)) || INJECTION_AR.some(re => re.test(a))) return 'injection';
  return null;
}
