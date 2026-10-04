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
import { storyQuery, storyOf } from './stories.js';
import { injectionKind } from './injection.js';

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
  // English only (French was removed): plural first, then -ing, so that the stem of a word and of
  // its plural agree ("patients" → patient = "patient"; "blessings" → bless = "blessing")
  if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.length > 4 && w.endsWith('es') && !w.endsWith('ses')) w = w.slice(0, -1);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 6 && w.endsWith('ing')) {
    w = w.slice(0, -3);
    if (w.length >= 5 && /([bdfglmnprt])\1$/.test(w)) w = w.slice(0, -1); // controlling → control
  }
  return w;
}

const STOP = {
  ar: new Set('في من على الى إلى عن ما ماذا متى اين أين كيف لماذا هل هو هي هم انا أنا انت نحن ذلك هذه هذا التي الذي الذين ان أن إن او أو ثم قد لا لم لن كل بعض عند مع يا الا إلا قال ايه اية ايات آية آيات القران القرآن سوره سورة يقول تحدث لو ولو كان كانت اذا إذا حتى بل لكن ولكن فيه فيها به بها له لها لهم منه منهم عليه عليهم كما غير بين اريد أريد اعرف أعرف معنى شرح اذكر وش ايش شو شنو اللي الي و'.split(' ').map(normAr)),
  en: new Set('the a an of and or in on at to for from about with by is are was were be been being what which who whom whose when where why how does do did say says said quran koran verse verses ayah ayat surah sura chapter tell me show find please that this these those it its as into there their them they he she his her i you we us our your can could would should will explain meaning mean my mine im someone somebody something anyone anything really very more much many get got happen happens happened describe during while'.split(' ')),
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

// ------------------------------------------------------- spoken questions
// Voice search sends Whisper transcriptions: politeness, fillers, dialect question
// frames («طيب ابغى اعرف وش قال القرآن عن الصبر», "um what does the quran say about…").
// cleanSpoken() removes them before the lexical search and the subject-index lookup.
// It only removes words of a fixed list (never a topic word) and never runs inside a
// quoted verse. kind → whether it proves the text is a spoken question (not a pasted verse).
const SPOKEN_KIND = { polite: true, filler: true, want: true, ask: true, read: true, story: true, frame: true, dq: true, q: false, honor: false };
const SPOKEN = {
  ar: {
    phrases: [
      ['polite', 'السلام عليكم ورحمة الله وبركاته|السلام عليكم ورحمة الله|السلام عليكم|وعليكم السلام|لو سمحت|لو سمحتي|لو سمحتو|لو سمحتم|من فضلك|من فضلكم|الله يعافيك|الله يخليك|الله يحفظك|الله يجزاك خير|جزاك الله خير|جزاك الله خيرا|يا شيخ|يا شيخنا|يا اخي|يا اخوي|يا اختي|يا جماعة|يا جماعه|يا مشكاة|يا مشكاه|يا استاذ|لو ممكن|اذا ممكن|ان امكن|اذا تكرمت|عندي سوال|عندي سؤال'],
      ['honor', 'عليه الصلاة والسلام|عليه الصلاه والسلام|صلى الله عليه وسلم|صلي الله عليه وسلم|عليه السلام|عليها السلام|عليهم السلام'],
      ['frame', 'في القران الكريم|في القرآن الكريم|في القران|في القرآن|في كتاب الله|في الاسلام|في الإسلام|في الدين|من القران|من القرآن|بالقران|بالقرآن|بالنسبة ل'],
      ['q', 'ما هو|ما هي|ما هم|من هو|من هي|من هم|ما الذي|ما هي|ماهو|ماهي'],
      ['dq', 'ايش هي|ايش هو|وش هي|وش هو|شو هي|شو هو|شنو هي|شنو هو|ايه هي|ايه هو'],
      ['ask', 'ايات عن|آيات عن|اية عن|آية عن|ايه عن|ايات تتكلم عن|ايات تتحدث عن|اية تتكلم عن|ايات فيها|ايات في|اشرح لي|قل لي|قول لي|اقرا لي|اقرأ لي|افتح لي|شغل لي|تقرا لي|تقرأ لي|اعرض لي'],
    ],
    words: {
      polite: 'لوسمحت ياشيخ ممكن مرحبا اهلا هلا بليز رجاء سوال سؤال سوالي سؤالي',
      filler: 'طيب يعني بس والله شوف طب خلاص احم اوكي اوك يلا هاه ايوه ايوا ايوة اه اها ااه امم اممم ممم مم انا احنا',
      want: 'ابغى ابغي ابغا بدي ودي عايز عاوز عايزه حابب حابه اريد نريد نبغى نبغي نبي بغيت نحب احب',
      ask: 'اعرف نعرف افهم نفهم قولي قلي كلمني احكيلي حدثني اخبرني خبرني علمني عطني اعطني اعطيني هات هاتلي ابحث ابحثلي دورلي اعرضلي وريني ورني فرجيني جيبلي ذكرني اذكرلي اشرحلي تعطيني تقولي تقلي تكلمني تحكيلي تشرحلي تذكرلي تجيبلي توريني تفهمني اتعلم',
      read: 'اقرا اقرأ اقرالي اقرألي تقرالي تقرألي تقرا قرالي اسمع اسمعني تسمعني شغل شغلي شغللي تشغل تشغلي افتح افتحلي تفتح تفتحلي اعرض اتلو رتل',
      story: 'قصة قصه حكاية حكايه قصص سيرة سيره',
      dq: 'وش ايش شو شنو شنهو ايه شلون فين وين',
      q: 'ماذا ما ماهو ماهي كيف حول بخصوص سيدنا سيدتنا مولانا',
    },
    // «قال / يقول …» only as a frame: next to «القرآن / ربنا / الله…» or after a question word
    frameVerbs: 'قال قالت يقول تقول يقوله قاله ذكر يذكر ذكرت ورد وردت جاء جات اخبر يخبر حكى يحكي تكلم يتكلم تحدث يتحدث',
    frameSubj: 'القران القرآن ربنا ربي الله الرب الاسلام الإسلام الدين المصحف الكريم تعالى سبحانه وتعالى لنا',
    lone: 'لي',
    prep: 'عن على علي حول بخصوص',
  },
  en: {
    phrases: [
      ['polite', 'assalamu alaikum|as salamu alaykum|assalamu alaykum|salam alaikum|i have a question|quick question|excuse me'],
      ['want', 'i want to know about|i want to know|i wanna know|i would like to know|i d like to know|i want to learn about|i want to learn|i want to understand|i need to know|i was wondering|i m wondering|do you know|let me know|i want|i need'],
      ['ask', 'can you tell me about|can you tell me|could you tell me|can you show me|could you show me|can you give me|can you find|can you explain|could you explain|can you|could you|would you|will you|tell me about|tell me more about|tell me|tell us|show me|give me|find me|explain to me|teach me|verses about|verse about|ayat about|ayahs about|verses on|verses regarding|verses for'],
      ['read', 'read me|play me|recite for me|listen to|put on'],
      ['frame', 'what does the holy quran say about|what does the quran say about|what does the koran say about|what does allah say about|what does god say about|what does islam say about|what did allah say about|what do the quran say about|what the quran says about|what is said in the quran about|what is in the quran about|in the holy quran|in the quran|in the koran|in islam|according to the quran|according to islam|from the quran|the quran s view on|the quran s'],
      ['frame', 'what does the quran say on|what does the quran tell us about|what does the quran teach about|what does the quran mention about|does the quran say anything about|does the quran talk about|does the quran mention'],
      ['story', 'the story of|story of|stories of|the stories of|tell the story of'],
      ['q', 'how do i deal with|how to deal with|how do i cope with|how to cope with|how can i deal with|how do i handle|how to handle|how do i|how can i|how should i|how to|how do we|how can we|what is|what are|what s|whats|who is|who was|who were|who are'],
    ],
    words: {
      filler: 'um umm ummm uh uhh uhm erm er ah ahh hmm hmmm mm mmm like so okay ok well basically actually just please hey hi hello yeah yes alright right salam salaam mishkat sheikh brother sister',
      read: 'read play open recite',
      story: 'story stories tale',
      q: 'what about regarding concerning',
    },
    frameVerbs: '',
    frameSubj: '',
    lone: 'me',
    prep: 'about on regarding',
  },
};
const SPOKEN_IDX = {};
for (const lang of ['ar', 'en']) {
  const S = SPOKEN[lang], n = (w) => lang === 'ar' ? normAr(w) : normLatin(w);
  const phrases = [];
  for (const [kind, list] of S.phrases) for (const p of list.split('|')) { const ws = n(p).split(' ').filter(Boolean); if (ws.length) phrases.push([ws, kind]); }
  phrases.sort((a, b) => b[0].length - a[0].length);
  const words = new Map();
  for (const [kind, list] of Object.entries(S.words)) for (const w of list.split(' ')) if (n(w)) words.set(n(w), kind);
  SPOKEN_IDX[lang] = { prep: new Set(S.prep.split(' ').map(n)), phrases, words, fv: new Set(S.frameVerbs.split(' ').filter(Boolean).map(n)), fs: new Set(S.frameSubj.split(' ').filter(Boolean).map(n)), lone: n(S.lone) };
}
// sounds and stretched fillers: «اممم», «ااه», "ummm", "hmmm"
const FILLER_RE = { ar: /^(ا*م{2,}|ا{2,}ه*|اه{2,}|ه+م{2,}|م{2,}|ه{2,})$/, en: /^(u+m+|u+h+|h+m+|e+r+m*|a+h+|m{2,})$/ };

export function cleanSpoken(q, lang) {
  const L = lang === 'ar' ? 'ar' : 'en';
  const X = SPOKEN_IDX[L];
  const raw = String(q || '').replace(/[«»"“”()[\]{}.,!?؟،؛:;…_\-–—]/g, ' ').split(/\s+/).filter(Boolean);
  const words = [], surface = [];
  for (const w of raw) { const nw = L === 'ar' ? normAr(w) : normLatin(w); for (const p of nw.split(' ').filter(Boolean)) { words.push(p); surface.push(nw.includes(' ') ? p : w); } }
  const gone = words.map(() => null);
  const wordKind = (w, i) => {
    let kind = X.words.get(w) || (FILLER_RE[L].test(w) ? 'filler' : null);
    // Gulf «ابي» = "I want" only at the start («ابي اعرف…»); elsewhere it can be «أبي» (my father, Abu Lahab)
    if (!kind && L === 'ar' && w === 'ابي' && gone.slice(0, i).every(Boolean)) kind = 'want';
    return kind;
  };
  // 1) fillers and politeness first, so that «what does uh the quran say» still reads as a frame
  for (let i = 0; i < words.length; i++) { const k = wordKind(words[i], i); if (k === 'filler' || k === 'polite') gone[i] = k; }
  // 2) phrases, over the words that are left
  const live = () => words.map((_, i) => i).filter(i => !gone[i]);
  let idx = live();
  for (let j = 0; j < idx.length; j++) {
    if (gone[idx[j]]) continue;
    for (const [ph, kind] of X.phrases) {
      if (j + ph.length > idx.length) continue;
      let ok = true;
      for (let k = 0; k < ph.length && ok; k++) ok = words[idx[j + k]] === ph[k] && !gone[idx[j + k]];
      if (ok) { for (let k = 0; k < ph.length; k++) gone[idx[j + k]] = kind; j += ph.length - 1; break; }
    }
  }
  // 3) single words
  // («ما» / «كيف» only open a question: inside a sentence «ما» is a negation)
  for (let i = 0; i < words.length; i++) {
    if (gone[i]) continue;
    const k = wordKind(words[i], i);
    if (k && (k !== 'q' || gone.slice(0, i).every(Boolean))) gone[i] = k;
  }
  // «وش قال القرآن عن…»: a speech verb next to its subject or after a question word
  if (X.fv.size) {
    const QK = ['q', 'dq', 'polite', 'filler', 'want', 'ask'];
    for (let i = 0; i < words.length; i++) {
      if (gone[i] || !X.fv.has(words[i])) continue;
      const prevQ = i > 0 && gone[i - 1] && QK.includes(gone[i - 1]);
      const nextQ = i + 1 < words.length && ['q', 'dq', 'ask'].includes(gone[i + 1]);
      // «ذكر الله» (remembrance of Allah) is a topic: «الله» alone is not a frame subject
      const nextS = i + 1 < words.length && X.fs.has(words[i + 1]) && words[i + 1] !== 'الله';
      if (prevQ || nextQ || nextS) {
        gone[i] = 'frame';
        for (let k = i + 1; k < words.length && X.fs.has(words[k]) && !gone[k]; k++) gone[k] = 'frame';
      }
    }
    // «ربنا قال ايه عن …», «القرآن وش يقول عن …» (subject before the verb / question word)
    for (let i = words.length - 2; i >= 0; i--) if (!gone[i] && X.fs.has(words[i]) && ['frame', 'dq', 'q'].includes(gone[i + 1])) gone[i] = 'frame';
  }
  // the preposition that introduced the topic («… عن الصبر», "… about patience")
  for (let i = 1; i < words.length; i++) if (!gone[i] && X.prep.has(words[i]) && gone[i - 1] && gone[i - 1] !== 'honor' && i + 1 < words.length) gone[i] = 'frame';
  // «لي» / "me" left alone after a removed verb («افتح لي»)
  for (let i = 1; i < words.length; i++) if (!gone[i] && words[i] === X.lone && gone[i - 1]) gone[i] = gone[i - 1];
  const kinds = new Set(gone.filter(Boolean));
  const keep = words.map((w, i) => gone[i] ? null : i).filter(i => i != null);
  // a question made only of frame words («ما هو؟») is kept as it was: nothing is invented
  const spoken = [...kinds].some(k => SPOKEN_KIND[k]);
  return {
    text: keep.map(i => words[i]).join(' '),
    display: keep.map(i => surface[i]).join(' '),
    kinds, spoken, changed: keep.length !== words.length, empty: keep.length === 0 && words.length > 0,
  };
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
    wordFound: (n, w, k) => `ورد «${w}» في القرآن الكريم في ${n === 1 ? 'آية واحدة' : n + ' آيات'}${k > 1 ? ` من ${k} سور` : ''}، وهذه مواضعه بترتيب المصحف:`,
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
    ruling: 'هذا سؤال عن حكم شرعي، والفتوى لأهل العلم؛ فلا تُصدر «مشكاة» أحكامًا. يُعرض أعلاه الحكم كما نصّت عليه «الموسوعة الفقهية» في الدرر السنية — من المراجع المعتمدة في التحدي — بحروفه ورابطه إن وُجد، وأدناه آيات ذات صلة للاطلاع (وليست فتوى).',
    crisis: 'إن كنت تفكّر في إنهاء حياتك أو إيذاء نفسك فلست وحدك، وحياتك غالية عند الله. تحدّث الآن إلى شخص تثق به، أو اتصل بخدمة الطوارئ في بلدك أو بخط للمساندة النفسية (تجد خطوط المساعدة المجانية والسرية في كل بلد على موقع findahelpline.com). وهذه آيات من كتاب الله تذكّر برحمته، مع تفسيرها كاملًا:',
    comfort: 'آيات من كتاب الله فيها السكينة والطمأنينة، مع تفسيرها كاملًا (اختيار مراجَع يُعرض حين يتعذّر تأكيد الآيات الخاصة بسؤالك):',
    blood: 'هذه مسألة تتعلّق بالدماء والأنفس؛ وتطبيق أحكامها من شأن القضاء الشرعي وولي الأمر وحده، والفتوى فيها لأهل العلم. ما يُعرض أعلاه من «الموسوعة الفقهية» نصٌّ علمي منقول بحروفه للبيان لا للتطبيق، وهذه آيات في حرمة النفس مع تفسيرها كاملًا.',
    personal: 'هذه مسألة شخصية تحتاج إلى عالم أو مختص يسمع تفاصيلها. لا تقدّم «مشكاة» نصائح أو أحكامًا في الحالات الخاصة. يمكنك البحث عن موضوع عام (مثل: الصبر، بر الوالدين).',
    dream: 'تعبير الرؤى لا يدخل في عمل «مشكاة»، ولا يُبنى على آلة. يمكنك البحث عن ذكر الرؤيا في القرآن بكلمة «الرؤيا».',
    invalidRef: (s, n) => `سورة ${s} عدد آياتها ${n} فقط؛ هذا الرقم غير موجود.`,
    invalidSura: 'رقم السورة يجب أن يكون بين 1 و114.',
    empty: 'اكتب فكرة أو سؤالًا أو اسم سورة أو رقم آية أو جزءًا من آية.',
    story: (name, nNamed, nIdx) => `قصة ${name} كما وردت في القرآن الكريم: ملخّص منقول بحروفه من موسوعة الجمهرة، ثم مراحل القصة بآياتها. ذُكر اسمه في ${arCount(nNamed, 'آية واحدة', 'آيتين', 'آيات', 'آية')}${nIdx ? `، ووردت الإشارة إليه دون ذكر اسمه في ${arCount(nIdx, 'آية أخرى', 'آيتين أخريين', 'آيات أخرى', 'آية أخرى')} بحسب الفهرس الموضوعي للموسوعة القرآنية` : ''}.`,
    storyNote: 'لا يُكتب شيء من القصة بالذكاء الاصطناعي: الملخّص والمراحل منقولة من مرجع معتمد، والآيات من نص المصحف.',
    injection: 'هذا الطلب يحاول تغيير طريقة عمل «مشكاة» أو الاطلاع على تعليماتها، فلا يُنفَّذ. «مشكاة» تبحث في القرآن الكريم ومصادره المعتمدة فقط: اكتب سؤالًا أو موضوعًا أو آية.',
    fabricate: '«مشكاة» لا تكتب آية ولا حديثًا ولا فتوى ولا تنسب إلى الشرع نصًّا من عندها؛ تعرض النصوص من مصادرها كما هي. ابحث عن موضوعك لتجد الآيات والأحاديث الثابتة فيه.',
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
    wordFound: (n, w, k) => `“${w}” occurs in ${n} verse${n === 1 ? '' : 's'} of the Quran${k > 1 ? ` in ${k} surahs` : ''}; here they are in Mushaf order:`,
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
    ruling: 'This asks for a religious ruling, which belongs to qualified scholars; Mishkat does not issue rulings. Above is the ruling as stated by the Fiqh Encyclopedia of Ad-Durar As-Saniyyah — an approved reference of the challenge — quoted word for word with its link when it exists (Arabic); below are related verses for reading (not a fatwa).',
    crisis: 'If you are thinking of ending your life or harming yourself, you are not alone, and your life is precious to Allah. Please speak now to someone you trust, or call the emergency services of your country or a support line (findahelpline.com lists free, confidential lines in every country). Here are verses of the Book of Allah reminding of His mercy, with their full tafsir:',
    comfort: 'Verses of tranquillity from the Book of Allah, with their full tafsir (a reviewed selection, shown when the verses for your exact question could not be confirmed):',
    blood: 'This question concerns life and blood. Such rulings are applied only by the courts and those in authority, and fatwas on them belong to scholars. The text of the Fiqh Encyclopedia shown above is quoted word for word to inform, not to be applied; below are the verses on the sanctity of life, with their full tafsir.',
    personal: 'This is a personal matter that needs a scholar or specialist who can hear the details. Mishkat gives no advice or rulings on individual cases. You can search a general topic instead (e.g. patience, parents).',
    dream: 'Dream interpretation is outside Mishkat’s scope and should not be done by a machine. You can search for dreams mentioned in the Quran with the word “dream”.',
    invalidRef: (s, n) => `Surah ${s} has only ${n} verses; this verse number does not exist.`,
    invalidSura: 'The surah number must be between 1 and 114.',
    empty: 'Type an idea, a question, a surah name, a verse number or part of a verse.',
    story: (name, nNamed, nIdx) => `The story of ${name} as told in the Quran: a summary quoted word for word from the Al-Jamhara encyclopedia (Arabic), then the episodes of the story with their verses. He is named in ${nNamed} verse${nNamed === 1 ? '' : 's'}${nIdx ? `, and spoken of without his name in ${nIdx} more according to the subject index of Quranpedia` : ''}.`,
    storyNote: 'No part of the story is written by AI: the summary and the episodes are quoted from an approved reference, the verses from the Mushaf.',
    injection: 'This request tries to change how Mishkat works or to see its instructions, so it is not carried out. Mishkat only searches the Quran and its approved sources: type a question, a topic or a verse.',
    fabricate: 'Mishkat never writes a verse, a hadith or a fatwa, and never attributes its own text to the religion; it shows texts from their sources as they are. Search your subject to find the established verses and hadiths about it.',
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
// English side: spellings heard in speech (Whisper writes "Musa", "Firaun", "Yousef"…)
// are added to the group of the translation's own word.
const THESAURUS = [
  ['موسى', 'moses musa'], ['عيسى المسيح', 'jesus messiah isa'], ['مريم', 'mary maryam mariam'],
  ['ابراهيم', 'abraham ibrahim'], ['نوح', 'noah nuh'], ['يوسف', 'joseph yusuf yousef yusef yousuf'],
  ['يعقوب', 'jacob yaqub'], ['اسحاق', 'isaac ishaq'], ['اسماعيل', 'ishmael ismail'], ['داود', 'david dawud dawood'],
  ['سليمان', 'solomon sulaiman sulayman suleiman'], ['يونس', 'jonah yunus younus'], ['ايوب', 'job ayyub'], ['زكريا', 'zechariah zakariya'],
  ['يحيي', 'john yahya'], ['هارون', 'aaron harun'], ['لوط', 'lot lut'], ['هود', 'hud'],
  ['صالح', 'salih'], ['شعيب', 'shuayb shoaib'], ['ادم', 'adam'], ['محمد', 'muhammad'],
  ['فرعون', 'pharaoh firaun firawn firon pharoah'], ['ابليس الشيطان', 'satan iblees iblis shaitan shaytan devil'], ['جبريل', 'gabriel jibril'],
  ['الجنة', 'paradise jannah'], ['النار جهنم', 'hell hellfire jahannam'],
  ['الصلاة', 'prayer salah salat'], ['الصيام الصوم', 'fasting fast sawm'], ['الزكاة', 'zakah zakat'],
  ['الحج', 'hajj pilgrimage'], ['الصبر', 'patience patient sabr'],
  ['الوالدين', 'parent'], ['الرحمة', 'mercy merciful'], ['التوبة', 'repentance repent tawbah'],
  ['الكعبة', 'kaaba'], ['القران', 'quran'], ['الملائكة', 'angel'], ['اليتيم اليتامى', 'orphan'],
  ['الوضوء توضؤوا فتوضؤوا', 'ablution wudu'], ['الربا', 'usury riba'], ['الخمر', 'intoxicant wine alcohol khamr'],
  ['الحسد', 'envy jealousy jealous'], ['الكذب', 'lie lying liar falsehood'], ['الصدق الصادقين', 'truthful truthfulness honesty honest'],
  ['التكبر المتكبرين مختال', 'arrogance arrogant pride'], ['الشكر', 'gratitude grateful thankful'], ['التوكل', 'reliance rely tawakkul'],
  ['الغيبة يغتب يغتاب مغتاب', 'backbiting backbite'], ['النفاق المنافقين', 'hypocrisy hypocrite'], ['الغيظ', 'anger angry'],
  ['الحزن', 'sadness sad grief sorrow'], ['بر الاحسان', 'kindness dutiful'], ['الجن', 'jinn'], ['السحر', 'magic sorcery'], ['الرزق', 'provision sustenance'],
  ['العفو', 'forgive forgiveness pardon'],
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

// ---------------------------------------- English names of the topics of the subject index (W5, T021)
// An English question answered WITHOUT AI («patience», "what does the quran say about repentance", "how do i
// stay steadfast") reaches the human-curated Quranpedia subject index through this table — only to FIND the
// topic: never used as search keywords, never shown. [words naming the topic (one must be present), other words
// allowed with them, Arabic topic, senses kept when the index has homographs (names without tashkil; default:
// the names without a «[qualifier]»)]. Topics of punishments, fighting or polemics are left to the AI + context.
const EN_TOPICS = [
  ['patience patient sabr perseverance persevere', '', 'الصبر'], ['repentance repent tawbah tawba', '', 'التوبة'],
  ['prayer prayers salah salat', 'daily obligatory', 'الصلاة', null, /صلاة الله على/], ['fasting fast sawm', '', 'الصوم'],
  ['charity sadaqah alms almsgiving', '', 'الصدقة'], ['zakat zakah', '', 'الزكاة'], ['hajj pilgrimage', '', 'الحج'],
  ['paradise jannah heaven', 'garden gardens', 'الجنة'], ['tawakkul reliance rely relying trust', 'god allah upon', 'التوكل على الله'], ['hell hellfire jahannam', 'fire', 'النار'],
  ['angel angels', '', 'الملائكة'], ['jinn djinn', '', 'الجن'], ['satan shaytan shaitan devil iblis', '', 'الشيطان'],
  ['death dying die', '', 'الموت', null, /الميتة/], ['judgment judgement qiyamah resurrection', 'day last', 'يوم القيامة'],
  ['mercy merciful compassion', 'god allah', 'الرحمة'], ['forgiveness forgive pardon', 'seeking god allah', 'العفو', ['=العفو'], /فضل المال/],
  ['istighfar', 'seeking forgiveness', 'الاستغفار'], ['gratitude grateful thankful thankfulness shukr', '', 'الشكر'],
  ['justice fairness', '', 'العدل'], ['oppression injustice tyranny wrongdoing zulm', '', 'الظلم'],
  ['honesty truthfulness truthful honest', '', 'الصدق'], ['lying lie lies liar falsehood', '', 'الكذب'],
  ['envy jealousy envious', '', 'الحسد'], ['humility humble', '', 'التواضع'], ['arrogance arrogant pride', '', 'التكبر'],
  ['backbiting gossip', '', 'الغيبة'], ['anger angry', '', 'الغضب'],
  ['parent parents', 'kindness honoring honouring respect obedience dutiful duty mother father', 'بر الوالدين'],
  ['mother mothers', '', 'الأم'], ['orphan orphans', '', 'اليتامى'], ['marriage marry wedding nikah', '', 'النكاح'],
  ['divorce talaq', '', 'الطلاق'], ['inheritance inherit', '', 'الميراث', null, /يرثها|ميراث السموات|ورثة الجنة|ميراث الكتاب/], ['usury riba', '', 'الربا'],
  ['alcohol wine intoxicant intoxicants khamr', '', 'الخمر'], ['gambling', '', 'الميسر'], ['modesty haya shyness', '', 'الحياء'],
  ['knowledge learning', 'seeking', 'العلم'], ['steadfastness steadfast firmness', '', 'الثبات'],
  ['sickness illness disease sick ill', '', 'المرض'], ['healing cure', '', 'الشفاء'], ['supplication dua duaa', '', 'الدعاء'],
  ['remembrance dhikr zikr', 'god allah', 'الذكر', ['الذكر [ذكر الله]']], ['ramadan ramadhan', 'month', 'رمضان'],
  ['kindness goodness ihsan excellence', '', 'الإحسان'], ['faith iman belief', '', 'الإيمان', ['الإيمان', 'الايمان [عقيدة والتزام]']],
  ['disbelief kufr unbelief', '', 'الكفر'], ['polytheism shirk idolatry', '', 'الشرك'], ['idols idol', '', 'الأصنام'],
  ['revelation wahy', '', 'الوحي'], ['rain', '', 'المطر'], ['water', '', 'الماء'], ['moon', '', 'القمر'], ['stars star', '', 'النجوم'],
  ['mountains mountain', '', 'الجبال'], ['night', '', 'الليل'], ['sea seas ocean', '', 'البحر'], ['bees bee', '', 'النحل'],
  ['cattle livestock', '', 'الأنعام'], ['embryo fetus foetus', '', 'الجنين'], ['children offspring', '', 'الأولاد'],
  ['family families', '', 'الأسرة'], ['wealth money riches property', '', 'المال'], ['poverty', '', 'الفقر'], ['poor', '', 'الفقراء'],
  ['food', '', 'الطعام'], ['sleep', '', 'النوم'], ['fear', '', 'الخوف'], ['hope', '', 'الرجاء'], ['intercession shafaah', '', 'الشفاعة'],
  ['hereafter afterlife akhirah', '', 'الآخرة'], ['grave barzakh', '', 'القبر'], ['tranquility tranquillity serenity', '', 'الطمأنينة'],
  ['sakinah', '', 'السكينة'], ['sadness grief sorrow', '', 'الحزن'], ['brotherhood', '', 'الأخوة', ['الأخوة']],
  ['unity', '', 'الاعتصام'], ['consultation shura', '', 'الشورى'], ['covenant covenants pledge', '', 'العهد'],
  ['ablution wudu wudhu', '', 'الوضوء'], ['purity purification cleanliness', '', 'الطهارة'], ['mosques mosque masjid', '', 'المساجد'],
  ['kaaba kabah', '', 'الكعبة'], ['qibla qiblah', '', 'القبلة'], ['pork swine pig', '', 'الخنزير'], ['trust trustworthiness amanah', '', 'الأمانة'],
  ['provision sustenance rizq', '', 'الرزق'], ['extravagance wastefulness', '', 'الإسراف'], ['stinginess miserliness', '', 'البخل'],
  ['piety taqwa righteousness', '', 'التقوى'], ['ostentation riya', 'showing', 'الرياء'], ['wisdom hikmah', '', 'الحكمة'],
  ['intellect reason', '', 'العقل'], ['reflection contemplation pondering', '', 'التفكر'], ['unseen ghayb', '', 'الغيب'],
  ['magic sorcery witchcraft', '', 'السحر', ['السحر [ما يؤدي إلى أمور خارقة للمألوف]']], ['trade commerce business', '', 'التجارة'],
  ['desires lust', '', 'الهوى'], ['world worldly dunya', 'life', 'الدنيا'], ['certainty yaqin', '', 'اليقين'],
  ['humbleness khushu', '', 'الخشوع'], ['recitation', '', 'تلاوة القرآن'], ['glorification tasbih', '', 'التسبيح'],
  ['prostration sujud', '', 'السجود'], ['bowing ruku', '', 'الركوع'], ['adornment', '', 'الزينة'], ['gold', '', 'الذهب'], ['iron', '', 'الحديد'],
  // not here, on purpose: adhan (the index's «الأذان» is a proclamation), hijab (the index mixes in the barrier
  // of 7:46), Jews / Christians, jihad, punishments — answered with the AI and the reviewed context only
];
// surahs named after a person: [Arabic, English] name of the person (searched as a topic, T021)
const PERSON_SURAS = { 10: ['يونس', 'Jonah'], 11: ['هود', 'Hud'], 12: ['يوسف', 'Joseph'], 14: ['إبراهيم', 'Abraham'], 19: ['مريم', 'Mary'],
  31: ['لقمان', 'Luqman'], 47: ['محمد', 'Muhammad'], 71: ['نوح', 'Noah'] };
// words that frame an English question without naming its subject («what does the quran say about…», "how do i stay…")
const EN_FRAME = new Set(tokens('islam islamic muslim muslims religion say says talk talks speak speaks mention mentions teach teaches teaching teachings ' +
  'importance important concept view stay remain become keep get be am being regarding concerning related topic subject virtue virtues ' +
  'benefit benefits holy the of in on about', 'en', { stop: false }));
// (a 5th element drops the sub-topics of another sense listed under the same entry: «العفو: فضل المال…»)
const EN_TOPIC_INDEX = EN_TOPICS.map(([need, opt, ar, senses, drop]) => ({
  need: new Set(tokens(need, 'en', { stop: false })), all: new Set(tokens(need + ' ' + opt, 'en', { stop: false })), ar, senses, drop }));
// the entry named by the question: every remaining word belongs to it and one of its naming words is there
export function englishTopicOf(text) {
  // «what should i say when it rains», "what do i do if…": what to SAY or DO (a supplication, an act), not a topic
  if (/\b(say|recite|read|do|pray)\b.*\b(when|before|after|if|while|during)\b/i.test(text)) return null;
  const toks = [...new Set(tokens(text, 'en'))].filter(t => !EN_FRAME.has(t));
  if (!toks.length || toks.length > 3) return null;
  return EN_TOPIC_INDEX.find(e => toks.every(t => e.all.has(t)) && toks.some(t => e.need.has(t))) || null;
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
  ['ruling', /^(is|are|was)\b.{1,60}\b(halal|haram|permissible|forbidden|lawful|unlawful|sinful|a sin)\s*\??$/im],
  ['ruling', /(^|\s)و?ما\s+حكم|حكم\s+(ال)?\S+\s+في\s+الإسلام|هل\s+(يجوز|يحل|يحرم|يصح|تجوز|تصح|يباح)|هل\s+\S*\s*(حرام|حلال|مكروه|جائز|بدعة)|(حرام|حلال)\s+(أم|او|أو)\s+(حلال|حرام)|فتو[ىي]|أفتوني|ما\s+الحكم|\bfatwa\b|\bruling (on|about|of)\b|\bis (it|this|that|\w+ing|\w+) (\w+ )?(halal|haram|permissible|allowed|forbidden|lawful|unlawful|sinful|a sin)\b|\b(halal|haram) or (halal|haram)\b|\bam i allowed\b|\best[ -](ce|il) (que )?(\w+ )?(permis|licite|illicite|haram|halal|interdit|autoris[eé]|un p[eé]ch[eé])\b|\bai[ -]je le droit\b|\bavis juridique\b|\b(est|sont|serait)[- ](il |elle )?(haram|halal|licite|illicite|interdite?s?|permise?s?|autoris[eé]e?s?)\b|\b(is|are) (it |this |that )?(halal|haram)\b/i],
  ['takfir', /هل\s+(ال)?\S+\s+(كفار|كافر|كافرة|مرتد|مرتدون|مشركون|مشرك)\s*[؟?]?$|\bis\s+\S+(\s+\S+)?\s+(a\s+)?(kafir|kaffir|infidel|apostate|disbeliever)s?\b|\bare\s+\S+(\s+\S+)?\s+(kafirs?|infidels?|apostates?|disbelievers)\b|\best[- ]ce que\s+.{1,40}\s+(est|sont)\s+(un |des )?(mécréants?|mecreants?|apostats?|kafirs?)\b/i],
  ['violence', /كيف\s+(اقتل|أقتل|نقتل|أفجر|افجر|اصنع\s+قنبلة|أصنع\s+قنبلة)|\bhow (to|do i|can i) (kill|murder|attack|make a bomb|build a bomb)\b|\bcomment (tuer|fabriquer une bombe|attaquer)\b/i],
  ['ruling', /^\s*(\S+\s+){1,3}(halal|haram)(\s+or\s+(halal|haram))?\s*\??\s*$/im],
  // «can i pray sitting», "may i fast while travelling": a question of status, not a personal case
  ['ruling', /\b(can|may) i (pray|fast|eat|drink|marry|wear|shave|smoke|listen|celebrate|combine|shorten|break my fast)\b/i],
  // E3: «personal» only when a decision about a relative, spouse or employer is asked — never
  // «ماذا أفعل إذا شعرت بالحزن», "should i be patient", "what should i read when i feel anxious"
  ['personal', /(زوجي|زوجتي|طليقي|طليقتي|أبي|أمي|ابني|ابنتي|مديري|أخي|أختي)\s+(يضرب|تضرب|يمنع|تمنع|تمنعني|يمنعني|طلق|طلقني|يريد|تريد|لا\s+يصلي|لا\s+تصلي|ترفض|يرفض|يظلمني|تظلمني|يهددني|تهددني|خانني|خانتني)|هل\s+(أطلق|أترك|أتزوج|أسامح|أخلع)\s|ماذا\s+أفعل\s+(مع|في|بـ?)\s*(زوجي|زوجتي|أبي|أمي|ابني|ابنتي|مديري|أخي|أختي|أهلي|طليقي|طليقتي)|\bshould i (divorce|marry|leave|forgive|cut off|report|quit|sue)\b|\bwhat should i do (about|with) my (husband|wife|father|mother|son|daughter|boss|family|brother|sister|parents)\b|\bmy (husband|wife|father|mother|son|daughter|boss|brother|sister) (hits|beats|forbids|wants|refuses|does not pray|doesn t pray|cheated|cheats|abuses|threatens)\b/i],
];
// + spoken dialect forms (tested on normAr text): «وش حكم…», «حرام ولا حلال», «وش اسوي», «حلمت…»
const GUARD_EXTRA = [
  ['ruling', /^هل\s+.{1,60}\s(حرام|حلال|مكروه|مكروهة|جايز|جايزة|بدعة|مباح|مباحة|واجب|واجبة|فرض|شرك)\s*$/],
  // «حكم المرتد», «حكم قتل غير المسلم», «حكم الحجاب»: «حكم» + a subject is a ruling question
  ['ruling', /^حكم\s+(ال)?\S+(\s+\S+){0,4}\s*$/],
  // E2: a status word without «هل» («الموسيقى حرام؟», «التدخين حلال ولا حرام», «الاحتفال بالمولد بدعة»)
  ['ruling', /^(\S+\s+){1,3}(حرام|حلال|مكروه|مكروهة|جايز|جايزة|جائز|جائزة|مباح|مباحة|بدعة)(\s+(ولا|والا|او|ام)\s+(حرام|حلال))?\s*[؟?]?$/],
  ['ruling', /(^|\s)(ايش|وش|شو|شنو|ايه|اش)\s+(حكم|الحكم)(\s|$)|(حرام|حلال)\s+(ولا|والا|او|ام|وله)\s+(حلال|حرام)|(^|\s)(يجوز|يحل|يحرم)\s+(لي|اني|نسوي|اسوي)(\s|$)/],
  ['dream', /(^|\s)(حلمت|حلمتو|احلم|شفت\s+في\s+(المنام|منامي|الحلم|حلمي)|رايت\s+في\s+(المنام|منامي|حلمي)|رايت\s+حلما?|تفسير\s+(حلمي|منامي|المنام|الاحلام|رويا|الرويا))(\s|$)/],
  ['personal', /(^|\s)(وش|ايش|شو|شنو|ماذا)\s+(اسوي|افعل|اعمل|ندير|نعمل|بعمل|نسوي|اتصرف)\s+(مع|في|ب)\s*(زوجي|زوجتي|جوزي|مراتي|ابوي|ابويا|ابي|امي|اخوي|اختي|ولدي|بنتي|ابني|ابنتي|مديري|اهلي)(\s|$)|(^|\s)(زوجي|زوجتي|جوزي|مراتي|ابوي|ابويا|امي|اخوي|اختي|ولدي|بنتي|مديري)\s+(ما|مش|مو|لا)\s+\S+|(^|\s)(يضربني|تضربني|يهددني|تهددني|يظلمني|تظلمني|طلقني|خانني|خانتني)(\s|$)/],
  ['takfir', /^هل\s+(اللي|الذي|من|الي)\s+(ما|لا|مش)\s+\S+\s+(كافر|كفار|مرتد|مشرك)\s*$/],
];
// A person who speaks of ending their life or harming themselves gets, before anything else, a fixed
// message of support with where to find help now, and verses of hope with their full tafsir — never a
// verse list chosen by keywords (which gave 17:33, on killing others, to «I want to kill myself»).
const CRISIS = /(انتحر|انتحار|الانتحار|اقتل\s+نفسي|أقتل\s+نفسي|نقتل\s+روحي|انهي\s+حياتي|أنهي\s+حياتي|انهاء\s+حياتي|إنهاء\s+حياتي|اريد\s+ان\s+اموت|أريد\s+أن\s+أموت|ابي\s+اموت|ابغى\s+اموت|ودي\s+اموت|نفسي\s+اموت|ما\s+ابي\s+اعيش|لا\s+اريد\s+ان\s+اعيش|لا\s+أريد\s+أن\s+أعيش|اؤذي\s+نفسي|أؤذي\s+نفسي|ايذاء\s+نفسي|إيذاء\s+نفسي)|\b(suicid\w*|kill(ing)? (myself|my self)|end (my life|it all)|take my (own )?life|want(ed)? to die|wish i (was|were) dead|don ?t want to (live|be alive)|no reason to live|self[- ]?harm|hurt(ing)? myself|cut(ting)? myself)\b/i;
export function isCrisis(q) { return CRISIS.test(q) || CRISIS.test(normLatin(q)) || CRISIS.test(normAr(q)); }
export const CRISIS_REFS = ['4:29', '39:53', '12:87', '94:5', '94:6', '2:286', '13:28'];
// a distressed visitor (sadness, anxiety, fear, grief…) when no AI confirms the verses: these verses of
// tranquillity with their full tafsir, instead of a keyword list (which gave the terror of the Last Day
// to «anxiety»)
const COMFORT = /(^|\s)(و|ف|ب|ل)?(ال)?(حزن|حزين|حزينه|حزينة|قلق|خوف|خايف|خايفه|اكتئاب|ضيق|غم|كرب|هموم|ياس|يأس|وحده|وحيد|مصيبه|مصيبة|ابتلاء|بلاء|فراق|تطمن|تطمئن|تريح)(ي|ه|ها|نا)?(\s|$)|ضاق(ت)?\s+(صدري|فيني|علي)|(^|\s)(و|ف|ب)?الهم(\s|$)|\b(sad|sadness|grief|grieving|anxious|anxiety|depress\w*|afraid|lonely|hopeless|worried|worry|stress\w*)\b/i;
const GOD_FEAR = /(خوف|الخوف|خشيه|خشية)\s+(من\s+)?(الله|عذاب|النار)|\bfear(ing)? (of )?(allah|god|hell)\b/i;
export function isComfortQ(q) { return (COMFORT.test(q) || COMFORT.test(normAr(q)) || COMFORT.test(normLatin(q))) && !GOD_FEAR.test(q) && !GOD_FEAR.test(normAr(q)); }
export const COMFORT_REFS = ['13:28', '94:5', '94:6', '2:153', '2:286', '39:53', '65:2', '65:3'];
// rulings about blood (killing, apostasy, fighting, attacks): no extract of a fatwa is shown; the verses
// on the sanctity of life with their full tafsir, and a referral to scholars and the courts
const BLOOD = /(قتل|اقتل|يقتل|نقتل|القتل|دم|دماء|الدماء|اغتيال|تفجير|ارهاب|إرهاب|جهاد|الجهاد|مرتد|المرتد|الردة|ردة|حرابة|الحرابة|القصاص|قصاص|اعدام|إعدام)|\b(kill\w*|murder\w*|blood|assassinat\w*|bomb\w*|terror\w*|jihad|apostat\w*|execut\w*|death penalty)\b/i;
export function isBloodRuling(q) { return BLOOD.test(q) || BLOOD.test(normLatin(q)); }
export const BLOOD_REFS = ['6:151', '17:33', '5:32', '4:93'];

export function guardCheck(q) {
  if (/\bhalal\s*(\/|and|&)\s*haram\b|حلال\s*(\/|و)\s*حرام|الحلال\s+والحرام/i.test(q) && /^(why|what|how|لماذا|ما|كيف)\b/i.test(String(q).trim())) return null;
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
// E9: penalties and family-law subjects (level C), whatever the wording («ما عقوبة الزنا» like «حد السرقة»)
const SENSITIVE = /(الحدود|حد\s+(السرقة|الزنا|القذف|الردة|الحرابة)|قطع\s+اليد|الرجم|الجلد|القصاص|الزنا|الزاني|القذف|عقوبة|عقوبات|تعدد\s+الزوجات|ضرب\s+الزوجة|ضرب\s+النساء|الميراث|stoning|amputation|flogging|lashes|adultery|fornication|punishment for|penalt(y|ies)|polygamy|beat(ing)? (his |the |their )?wi(fe|ves)|wife beating|inheritance)/i;
// «حدّ الزّنى», «حد الحرابة»: any «حد + subject» (a legal penalty), whatever the spelling (ى/ا, diacritics)
const HADD = /(^|\s)(حد|حدود)\s+(ال)?\S+|الزني|الزنى/;
export function isSensitiveText(q) { return SENSITIVE.test(q) || SENSITIVE.test(normLatin(q)) || SENSITIVE.test(normAr(q)) || HADD.test(normAr(q)); }
export function isSensitive(q) { return isSensitiveText(q) || !!packFor(q); }
// E11: verses about fighting, often quoted cut from their context — wherever they appear in an answer,
// it is flagged sensitive (level C) and the reader opens the surrounding verses
const WAR_VERSES = new Set(['2:190', '2:191', '2:192', '2:193', '2:216', '4:76', '4:89', '4:91', '8:12', '8:39', '8:60', '9:5', '9:29', '9:36', '9:73', '9:123', '47:4', '66:9']);

// Words that turn a subject into a fatwa request; removed to search the related verses.
const RULING_WORDS = /(ما\s+حكم|حكم|هل\s+يجوز|يجوز|هل|حلال|حرام|مكروه|جائز|بدعة|فتوى|أفتوني|is it|is|are|haram|halal|permissible|allowed|forbidden|ruling on|ruling|fatwa|est[- ]ce que|est[- ]il|est[- ]elle|permis|licite|illicite|interdit|avis juridique|\?|؟)/gi;
export function fatwaLinks(q) {
  const enc = encodeURIComponent(q.trim().slice(0, 80));
  return [
    // only sources of the challenge's reference pack and the official Saudi authority for fatwas (T081)
    { id: 'dorarFiqh', url: `https://dorar.net/feqhia/search?q=${enc}` },
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
  const res = { intent: 'topic', ids: [], scores: {}, sentences: [], confidence: 'low', rejected: 0 };
  if (!out || typeof out !== 'object') return res;
  if (INTENTS.has(out.intent)) res.intent = out.intent;
  if (out.confidence === 'high') res.confidence = 'high';
  const sc = out.scores && typeof out.scores === 'object' ? out.scores : {};
  for (const id of Array.isArray(out.ids) ? out.ids : []) {
    const s = String(id).trim();
    if (allowed.has(s) && !res.ids.includes(s)) { res.ids.push(s); res.scores[s] = +sc[s] === 1 ? 1 : 2; } else res.rejected++;
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
  // Built on first use only (verification of quotes): keeps createEngine() cheap where it
  // only serves display (the main thread when search runs in a Web Worker).
  let VX = null;
  function vx() {
    if (VX) return VX;
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
    return (VX = { vtokS, tokPost, suraTextS });
  }

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
    // spoken spellings: "yaseen" → yasin, "rahmaan" → rahman
    const cands = [normAr(nameStr).replace(/\s/g, ''), lat.replace(/\s/g, '').replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/aa/g, 'a')];
    // a doubled consonant typed by mistake («kahff», «baqarra»): the same name with single consonants
    if (cands[1]) cands.push(cands[1].replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, '$1'));
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
    let hadSuraWord = false, ayaFirst = null;   // "verse 255 of surah 2": the verse number comes first
    for (const p of parts) {
      if (/^\d{1,3}$/.test(p)) nums.push(+p);
      else {
        const pa = normAr(p), pl = normLatin(p);
        if (SURA_WORDS.test(pa) || SURA_WORDS.test(pl)) { if (ayaFirst == null) ayaFirst = false; hadSuraWord = true; continue; }
        if (AYA_WORDS.test(pa) || AYA_WORDS.test(pl)) { if (ayaFirst == null) ayaFirst = true; continue; }
        if (/^(رقم|number|numero|no|n)$/.test(pl || pa)) continue;
        // «آية 255 من سورة البقرة», "verse 10 of surah 18"
        if (/^(من|في|of|from|in)$/.test(pl || pa)) continue;
        words.push(p);
      }
    }
    if (words.length === 0) {
      if (nums.length === 1 && (hadSuraWord || parts.length === 1)) return { s: nums[0], a: null };
      if (nums.length === 2) return ayaFirst && hadSuraWord ? { s: nums[1], a: nums[0] } : { s: nums[0], a: nums[1] };
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
    for (const suraText of vx().suraTextS) suras.forEach((s, si) => {
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
    for (const vtok of vx().vtokS) {
      const r = align1(qt, vtok[i].concat(i + 1 < NV && suraOf[i + 1] === suraOf[i] ? vtok[i + 1] : []));
      if (!best || r.sim > best.sim) best = r;
    }
    return best;
  }
  function nearMatch(qt) {
    const count = new Map();
    for (const t of new Set(qt)) for (const i of vx().tokPost.get(t) || []) count.set(i, (count.get(i) || 0) + 1);
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
  // segments: «الحزن والضيقة», "envy and jealousy" — covering one side fully is enough.
  // Very frequent words («الناس», "people") are optional when a rarer word is present.
  const weakCache = new Map();
  function weakTok(t, lang) {
    const k = lang + '|' + t;
    if (!weakCache.has(k)) {
      let mx = 0;
      for (const [name] of FIELDS[lang]) { const f = field(name); const p = f && f.post.get(t); if (p) mx = Math.max(mx, p.length / 2 / f.N); }
      weakCache.set(k, mx > 0.1);
    }
    return weakCache.get(k);
  }
  function topicSearch(q, lang, limit = 30, extra = [], { segments = false } = {}) {
    let qtoks = [...new Set(tokens(q, lang))];
    if (!qtoks.length) qtoks = [...new Set(tokens(q, lang, { stop: false }))]; // e.g. "القرآن" alone
    if (qtoks.length > 1) { const k = qtoks.filter(t => !UBIQ[lang].has(t)); if (k.length) qtoks = k; }
    const extraToks = [...new Set(extra.flatMap(w => tokens(w, lang)))].filter(t => !UBIQ[lang].has(t));
    if (!qtoks.length && !extraToks.length) return { qtoks, ranked: [] };
    const groups = qtoks.map(t => [t, ...new Set(expandTokens([t], lang, lang))]);
    const all = groups.map((_, gi) => gi);
    let segs = [all];
    if (segments && qtoks.length > 1) {
      const parts = lang === 'ar' ? normAr(q).split(/ و (?=\S)| (?=وال)/) : normLatin(q).split(/ (?:and|or) /);
      if (parts.length > 1) {
        segs = parts.map(p => { const s = new Set(tokens(p, lang)); return all.filter(gi => s.has(qtoks[gi])); }).filter(x => x.length);
        if (!segs.length) segs = [all];
      }
    }
    const weak = qtoks.map(t => weakTok(t, lang) || (lang === 'ar' && SOFT.ar.has(t)));
    const req = segs.map(sg => { const st = sg.filter(gi => !weak[gi]); return st.length ? st : sg; });
    const minReq = Math.min(...req.map(x => x.length));
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
      const full = req.some(sg => sg.every(gi => hitsByGroup[gi].has(d)));
      return { idx: d, score: s * (0.4 + 0.6 * cov * cov), cov, full, ext: extraHits.has(d) };
    });
    if (!ranked.length) return { qtoks, ranked: [], kwTop, fullSet: new Set() };
    const full = ranked.filter(r => r.full);
    let kept;
    if (!full.length && uq >= 2 && !extraToks.length) return { qtoks, ranked: [], topScore: 0, nFull: 0, fullSet: new Set() };
    if (full.length >= 5 || (minReq === 1 && full.length)) {
      const top = Math.max(0, ...full.map(r => r.score));
      kept = full.filter(r => r.score >= 0.3 * top);
      if (extraToks.length) kept = kept.concat(ranked.filter(r => !r.full && r.ext).sort((a, b) => b.score - a.score).slice(0, 20));
    } else {
      const top = Math.max(...ranked.map(r => r.score));
      kept = ranked.filter(r => (r.full || r.cov >= 0.5 || r.ext) && r.score >= 0.3 * top);
    }
    kept.sort((a, b) => (b.full - a.full) || b.cov - a.cov || b.score - a.score || a.idx - b.idx);
    return { qtoks: qtoks.concat(extraToks), ranked: kept.slice(0, limit), topScore: kept.length ? kept[0].score : 0, nFull: full.length, kwTop,
      fullSet: new Set(full.map(r => r.idx)) };
  }

  function topicSearchAuto(q, lang, uiLang, limit, extra = {}, opts = {}) {
    return { lang, ...topicSearch(q, lang, limit, extra[lang] || [], opts) };
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
    TOPICS = { list, kids, byKey, size: new Map(), source: data.source, url: data.url, version: data.version, raw: data };
  }
  // «علوم السور» of Al-Jamhara (stories of the prophets)
  let SCI = null;
  function addSurahSciences(data) { SCI = data && Array.isArray(data.suras) ? data : null; }
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
    if (res.type === 'abstain') return ['injection', 'fabricate'].includes(res.reason) ? null : 'D';
    if (res.type === 'khilaf' || res.polemic || res.sensitive) return 'C';
    if (['verse', 'range', 'sura', 'verify', 'invalid_ref', 'hadith', 'story'].includes(res.type)) return 'A';
    if (res.type === 'topic' || res.type === 'term') return 'B';
    return null;
  }

  // ---------------------------------------------- exact words of the Quran & spelling help
  // A word typed or pasted (e.g. «مشكاة», "mishkat") is looked up among the WORDS of the
  // Quran, whatever their proclitics (و ف ب ك ل س ال) and attached pronouns, so that the
  // verse where it occurs comes FIRST. A word that does not occur gets the closest words
  // of the Quran as suggestions («هل تقصد…؟»). Only references are produced, never text.
  const PROCLITICS = ['وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ك', 'ل', 'س'];
  const ENCLITICS = ['هما', 'كما', 'ها', 'هم', 'هن', 'كم', 'كن', 'نا', 'ه', 'ي', 'ك'];
  let WIDX = null;   // Map<form, Set<verse>>  (forms of every Quran word)
  let WFREQ = null;  // Map<base form, number of verses>  (for suggestions)
  const tmarbuta = (w) => w.replace(/ه$/, 'ة');
  function baseForms(t) {
    const out = new Set([t]);
    const strip = (w, depth) => {
      for (const p of PROCLITICS) if (w.startsWith(p) && w.length - p.length >= 2) {
        const r = w.slice(p.length); out.add(r);
        if (depth < 1) strip(r, depth + 1);
      }
    };
    strip(t, 0);
    for (const f of [...out]) for (const s of ENCLITICS) if (f.endsWith(s) && f.length - s.length >= 3) out.add(f.slice(0, -s.length));
    // ة → ت before a pronoun («رحمته» → «رحمة»)
    for (const f of [...out]) if (/ت$/.test(f) && f.length >= 4) out.add(f.slice(0, -1) + 'ة');
    return out;
  }
  function wordIndex() {
    if (WIDX) return WIDX;
    WIDX = new Map(); WFREQ = new Map();
    // both spellings: imla'i (how people type) and Uthmani (pasted from a Mushaf: «مشكوة»)
    searchAr.forEach((txt, v) => {
      const seen = new Set();
      for (const t of (normAr(txt) + ' ' + normAr(verses[v])).split(' ')) {
        if (!t) continue;
        for (const f of baseForms(t)) {
          if (seen.has(f)) continue;
          seen.add(f);
          if (!WIDX.has(f)) WIDX.set(f, new Set());
          WIDX.get(f).add(v);
        }
      }
      for (const f of seen) WFREQ.set(f, (WFREQ.get(f) || 0) + 1);
    });
    return WIDX;
  }
  let LATIN = null;   // Map<collapsed Latin form, Set<verse>>
  const latinKey = (w) => w.replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/(.)\1+/g, '$1');
  const caseless = (k) => k.length > 5 ? k.replace(/(in|un|an|i|u|a)$/, '') : k;
  function addLatinIndex(data) {
    if (!data || !data.forms) return;
    LATIN = new Map();
    for (const [k, vs] of Object.entries(data.forms)) {
      const c = latinKey(k);
      if (!LATIN.has(c)) LATIN.set(c, new Set());
      for (const v of vs) LATIN.get(c).add(v);
    }
  }
  const latinForms = (w) => {
    const out = [w];
    for (const p of ['al', 'wa', 'fa', 'bi', 'li', 'ka']) if (w.startsWith(p) && w.length - p.length >= 3) out.push(w.slice(p.length));
    return out;
  };
  // verses containing the word(s); every word of the query must occur in the verse
  function wordLookup(q) {
    const isAr = AR_RANGE.test(q);
    const toks = isAr ? normAr(q).split(' ').filter(w => w.length >= 2) : normLatin(q).split(' ').filter(w => w.length >= 3);
    if (!toks.length || toks.length > 3) return null;
    const sets = [];
    for (const t of toks) {
      let hit = null;
      if (isAr) {
        const idx = wordIndex();
        // the word as typed, then without its own clitics (the index holds every bare form)
        const cands = /^ال/.test(t) ? [t, tmarbuta(t)] : [t, tmarbuta(t), ...baseForms(t)];
        for (const f of cands) { const s = idx.get(f); if (s && s.size) { hit = s; break; } }
      } else if (LATIN) {
        const acc = new Set();
        for (const f0 of latinForms(t)) {
          const f = latinKey(f0);
          for (const [k, vs] of LATIN) if (k === f || (k.startsWith(f) && k.length - f.length <= 3) || (k.length >= 5 && f.startsWith(k) && f.length - k.length <= 1)) vs.forEach(v => acc.add(v));
        }
        if (acc.size) hit = acc;
      }
      if (!hit) return { toks, verses: [], missing: t, isAr };
      sets.push(hit);
    }
    let verses = [...sets[0]].filter(v => sets.every(s => s.has(v))).sort((a, b) => a - b);
    return { toks, verses, isAr };
  }
  const editDist = (a, b, max) => {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let best = i;
      for (let j = 1; j <= b.length; j++) {
        // ة / ت / ه are interchangeable only as the LAST letter («الزكات» = «الزكاة»)
        const sub = a[i - 1] === b[j - 1] || (i === a.length && j === b.length && 'ةته'.includes(a[i - 1]) && 'ةته'.includes(b[j - 1])) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + sub);
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  };
  // the closest words of the Quran to a misspelt one (1–2 letters missing, added or wrong)
  function suggestWords(word, { min = 0 } = {}) {
    const isAr = AR_RANGE.test(word);
    if (!isAr) {
      if (!LATIN) return [];
      const w = latinKey(normLatin(word));
      if (w.length < 4) return [];
      const max = w.length >= 7 ? 2 : 1, out = [];
      for (const [k, vs] of LATIN) {
        if (Math.abs(k.length - w.length) > max + 3) continue;
        const d = Math.min(editDist(w, k, max), editDist(w, caseless(k), max));
        if (k !== w && d <= max && vs.size > min) out.push({ w: caseless(k), d, n: vs.size, v: [...vs][0] });
      }
      return out.sort((a, b) => a.d - b.d || b.n - a.n).slice(0, 4).map(x => ({ word: x.w, q: x.w, count: x.n, first: x.v }));
    }
    wordIndex();
    const hadAl = /^ال/.test(normAr(word));
    const w = normAr(word).replace(/^(ال)/, '');
    if (w.length < 3) return [];
    const max = w.length >= 7 ? 2 : 1, out = [];
    for (const [f, n] of WFREQ) {
      if (n <= min || Math.abs(f.length - w.length) > max || f.length < 3) continue;
      const d = editDist(w, f, max);
      if (f !== w && d <= max) out.push({ f, d, n });
    }
    const subseq = (a, b) => { let i = 0; for (const c of b) if (c === a[i]) i++; return i === a.length; };
    const rank = (x) => x.d * 10 - (subseq(w, x.f) || subseq(x.f, w) ? 4 : 0) - (x.f[0] === w[0] ? 2 : 0) - Math.log2(1 + x.n) * 0.6;
    out.sort((a, b) => rank(a) - rank(b));
    // keep the bare forms, best first, without near-duplicates
    const seen = new Set(), res = [];
    for (const x of out) {
      if (seen.has(x.f)) continue;
      seen.add(x.f);
      if (res.some(r => normAr(r.word) === normAr(surface(x.f)))) continue;
      const shown = surface(hadAl && WIDX.has('ال' + x.f) ? 'ال' + x.f : x.f);
      // «sure»: one letter missing, added or changed in a word the Quran uses often — safe to correct
      res.push({ word: shown, q: normAr(shown), count: x.n, first: [...WIDX.get(x.f)][0], sure: res.length === 0 && x.d <= 1 && x.n >= 3 && (x.d === 0 || subseq(w, x.f) || subseq(x.f, w)) });
      if (res.length >= 4) break;
    }
    return res;
  }
  const refOf = (v) => `${suraOf[v]}:${ayaOf[v]}`;
  // positions (among the words with letters) of a verse's words that match the given forms,
  // found on the imla'i text and valid on the Uthmani text when both have the same words
  function wordPositions(v, forms) {
    const F = new Set(forms), hasL = (t) => /[ء-ي]/.test(normAr(t));
    const im = String(searchAr[v]).split(/\s+/).filter(hasL), ut = String(verses[v]).split(/\s+/).filter(hasL);
    if (im.length !== ut.length) return [];
    const out = [];
    im.forEach((t, k) => { const n = normAr(t); if (F.has(n) || [...baseForms(n)].some(f => F.has(f))) out.push(k); });
    return out;
  }
  // how a word form is actually written in the Quran (imla'i), for display: «يتام» → «اليتامى»
  function surface(f) {
    const vs = WIDX.get(f);
    if (!vs) return f;
    for (const v of vs) for (const t of String(searchAr[v]).split(/\s+/)) {
      const n = normAr(t);
      if (n === f || (baseForms(n).has(f) && !/^[وفبكلس]/.test(n.replace(/^ال/, '')) === !/^[وفبكلس]/.test(f.replace(/^ال/, '')))) return t.replace(/^[وف](?=ال)/, '');
    }
    return f;
  }

  // result for a word of the Quran: its verses first, grouped by surah, in Mushaf order
  function wordResult(base, wl, lang) {
    const M = MSG[lang] || MSG.ar;
    const verses = wl.verses.slice(0, 60).map(i => ({ idx: i, ref: refOf(i), word: true }));
    const by = new Map();
    for (const v of verses) { const s = suraOf[v.idx]; if (!by.has(s)) by.set(s, []); by.get(s).push(v.idx); }
    return { ...base, type: 'topic', lang, wordQuery: wl.toks.join(' '),
      answer: [{ kind: 'text', text: M.wordFound(wl.verses.length, wl.toks.join(' '), by.size) }],
      verses, suras: [...by.entries()].map(([sura, vs]) => ({ sura, verses: vs })), focus: verses.length === 1 ? verses[0].idx : null,
      terms: wl.isAr ? [...new Set(wl.toks.flatMap(t => [...baseForms(t)]))] : [], paragraphBy: 'none', meta: { ...(base.meta || {}), route: 'word' } };
  }

  // ---------------------------------------------------------------- ask()
  // ask(): the routes below, then the reference-pack additions (level, glossary card,
  // links to the objections encyclopedia).
  // the words of the query in the Quran: a rare word's own verses come first; a word that is
  // not in the Quran gets the closest words as suggestions
  const WORD_SKIP = new Set(['verse', 'range', 'sura', 'abstain', 'invalid_ref', 'hadith', 'khilaf']);
  function withWords(res, query, opts) {
    const q = String(query || '').trim();
    if (!q || q.length > 60 || /\d/.test(q) || /[؟?:]/.test(q) || WORD_SKIP.has(res.type)) return res;
    if (res.type === 'verify' && res.verdict === 'exact') return res;
    const wl = wordLookup(q);
    if (!wl) return res;
    const lang = wl.isAr ? 'ar' : 'en';
    if (wl.verses.length) {
      const weak = ['notfound', 'empty'].includes(res.type) || (res.type === 'verify' && res.verdict !== 'exact') || (res.type === 'topic' && !res.verses.length);
      if (weak) return wordResult({ query: q, lang, meta: res.meta || {} }, wl, lang);
      if (wl.verses.length <= 12) { res.wordHits = wl.verses; res.wordQuery = wl.toks.join(' '); res.wordTerms = wl.isAr ? [...new Set(wl.toks.flatMap(t => [...baseForms(t)]))] : []; }
      // a rare word next to a much more common one: maybe a typo («اليتم» / «اليتيم»)
      // E12: not for a word the vetted tafsirs use often («الحجاب», «الغضب», «الجار», «الأمانة»)
      if (wl.isAr && wl.toks.length === 1 && wl.verses.length <= 3 && !res.topicIndex && (res.verses || []).length <= wl.verses.length && !(wl.isAr && [normAr(wl.toks[0]), normAr(wl.toks[0]).replace(/^(وال|فال|بال|لل|ال)/, "")].reduce((a, f) => a + (vocab().get(f) || 0), 0) >= 5)) { const sg = suggestWords(wl.toks[0], { min: Math.max(6, wl.verses.length * 4) }); if (sg.length) res.suggest = sg.slice(0, 2); }
      return res;
    }
    // every word exists but never in the same verse: nothing to correct
    if (!wl.missing) return res;
    // a real word that is simply not in the Quran («الجهاد», «الموسيقى») is not a typo:
    // it is found in the vetted tafsirs, so no correction is offered
    if (wl.isAr) {
      const V = vocab(), m = normAr(wl.missing);
      // E13: a rare spelling next to a frequent Quran word one letter away («الزكات» → «الزكاة»):
      // corrected, even though «زكاة» is among its base forms
      // how often the word or its base forms («التوكل» → «توكل») occur in the Quran and the tafsirs — but not
      // the ت→ة variant, which is exactly the misspelling to correct («الزكات» → «الزكاة»)
      const own = (V.get(m) || 0) + [...baseForms(m)].filter(f => f !== m && f.length >= 3 && !(f.endsWith('ة') && !m.endsWith('ة'))).reduce((n, f) => n + (V.get(f) || 0), 0);
      if (own < 3 && wl.toks.length === 1 && !res.crisis && !['abstain', 'term', 'khilaf', 'hadith'].includes(res.type)) { const sg0 = suggestWords(wl.missing); if (sg0.length && sg0[0].sure && sg0[0].count >= 5 * Math.max(1, own)) { res.suggest = sg0; res.suggestFor = wl.missing; return res; } }
      if (V.has(m) || [...baseForms(m)].some(f => f.length >= 3 && V.has(f))) return res;
    }
    // a question that already has an answer gets no «did you mean» (map W4: «أفكر في الانتحار» → «افك»)
    if ((res.verses && res.verses.length) || res.crisis || ['abstain', 'term', 'khilaf', 'hadith'].includes(res.type)) return res;
    const sg = suggestWords(wl.missing);
    if (sg.length) { res.suggest = sg; res.suggestFor = wl.missing; }
    return res;
  }

  async function ask(query, opts = {}) {
    let res = await ask0(query, opts);
    if (!res) return res;
    res = withWords(res, query, opts);
    // a single misspelt word with a sure correction: answer for the corrected word, and say so
    if (res.suggestFor && res.suggest && res.suggest[0].sure && normAr(query).split(' ').length === 1 && ['topic', 'notfound', 'verify'].includes(res.type) && !opts.noCorrect) {
      const fixed = await ask(res.suggest[0].q, { ...opts, noCorrect: true });
      if (fixed && fixed.type !== 'notfound' && fixed.type !== 'empty') { fixed.correctedFrom = String(query).trim(); delete fixed.suggest; delete fixed.suggestFor; return fixed; }
    }
    if (res.type === 'empty') return res;
    const q = res.query || '';
    const g = termFor(q);
    if (g && !res.term && (isBareTerm(q, g) || (TERM_CUE.test(q) && termIsSubject(q, g)))) res.term = g;
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
    if (!res.sensitive && ['topic', 'verify', 'term'].includes(res.type) && (res.verses || []).some(v => WAR_VERSES.has(v.ref))) {
      res.sensitive = true; res.pack = res.pack || 'violence';
      if (Array.isArray(res.answer) && !res.answer.some(a => a.kind === 'note' && a.text === MSG[res.lang === 'en' ? 'en' : 'ar'].sensitiveNote))
        res.answer.push({ kind: 'note', text: MSG[res.lang === 'en' ? 'en' : 'ar'].sensitiveNote });
    }
    res.brief = briefOf(res);
    res.level = levelOf(res);
    return res;
  }

  // «الجواب باختصار»: 2–3 sentences copied word for word from the vetted tafsir (Al-Muyassar in Arabic,
  // Al-Mukhtasar in English) of the verses that ANSWER the question — only when someone vouches for
  // those verses (the AI's closed-list selection, the curated subject index or the reviewed context
  // pack). Each sentence keeps its verse and source; a sentence must contain a word of the question
  // (or of the AI's search keywords), except the first one of the first verse. Nothing is generated.
  function briefOf(res) {
    // E4/E5: only when the AI's closed-list selection vouches for the verses — a subject-index entry
    // may carry another sense of the word («الحجاب» → 7:46), a context pack is not an answer
    if (!['topic', 'term'].includes(res.type) || res.confirmedBy !== 'ai') return null;
    const lang = res.lang === 'en' ? 'en' : 'ar';
    let keyIdx = res.answer.filter(a => a.kind === 'quote' && a.role !== 'context' && a.idx != null).map(a => a.idx).slice(0, 3);
    // no explained verse (e.g. the subject index lists the verses): the first listed verses, and then
    // every sentence must contain a word of the question
    const strict = !keyIdx.length;
    if (strict) keyIdx = (res.verses || []).filter(v => !v.closestOnly && !v.relatedOnly).map(v => v.idx).slice(0, 8);
    if (!keyIdx.length) return null;
    const pool = sentencePool(lang, keyIdx, 4);
    if (!pool.length) return null;
    const kw = lang === 'ar' ? ((res.meta && res.meta.kwAr) || []) : [];
    const qt = [...new Set([...tokens(res.query || '', lang), ...kw.flatMap(w => tokens(String(w).replace(/_/g, ' '), lang))])];
    const qset = new Set(qt);
    const hit = (p) => tokens(p.text, lang).some(t => qset.has(t));
    const out = [];
    for (const i of keyIdx) {
      const mine = pool.filter(p => p.idx === i);
      const best = mine.find(hit);   // never a sentence without a word of the question
      if (best && best.text.length >= 12) out.push(best);
      if (out.length >= 3) break;
    }
    if (!out.length) return null;
    const S = src[PARAGRAPH_FOR[lang]] || src[TAFSIR_FOR[lang]] || {};
    return { lang, by: res.confirmedBy, source: S.id, sourceTitle: S.title,
      items: out.map(p => { let t = p.text; if (t.length > 320) { const c = t.lastIndexOf(' ', 300); t = t.slice(0, c > 120 ? c : 300) + ' …'; } return { text: t, ref: ref(p.idx), idx: p.idx }; }) };
  }

  // ------------------------------------------------ spoken-query helpers
  const MAX_CANDIDATES = 36;   // closed list sent to the AI selection
  const DET_MAX = 8;           // verses shown without any confirmation (keyword match only)
  // Whisper repairs (Arabic), checked against the words of the Quran and its tafsir:
  // final ه written for ة («الصلاه» → «الصلاة», «المصيبه» → «المصيبة»), a particle glued to the word («عنالصبر»)
  let VOCAB = null, vocabKey = '';
  function vocab() {
    const key = Object.keys(src).sort().join(',');
    if (VOCAB && key === vocabKey) return VOCAB;
    VOCAB = new Map(); vocabKey = key;
    const add = (t) => { for (const w of normAr(t || '').split(' ')) if (w) VOCAB.set(w, (VOCAB.get(w) || 0) + 1); };
    searchAr.forEach(add);
    for (const id of ['muyassar_ar', 'mukhtasar_ar']) if (src[id]) src[id].text.forEach(add);
    return VOCAB;
  }
  // words that begin with «و» as a root letter (not the conjunction)
  const W_KEEP = new Set('والدين والد والدة والده والدي والدته وحي وعد وعيد ولد ولي وزر وقت وسط وصف وصية وطن ودود وكيل وارث وهم وجه وجوه ورق وادي'.split(' ').map(normAr));
  const repairWord = (w, f) => (w.length >= 3 && w.endsWith('ه') && f(w.slice(0, -1) + 'ة') >= 1 && f(w) === 0) ? w.slice(0, -1) + 'ة' : w;
  function repairTranscript(text, lang) {
    if (lang !== 'ar' || !text) return text;
    const V = vocab(), f = (w) => V.get(w) || 0;
    return text.split(' ').map(w => {
      if (w.length >= 3 && w.endsWith('ه')) {
        const alt = w.slice(0, -1) + 'ة';
        if ((f(alt) >= 1 && f(w) === 0) || (f(alt) >= 3 && f(alt) > 3 * f(w))) return alt;
      }
      if (w.length >= 6 && f(w) === 0) {
        const m = w.match(/^(عن|في|من|علي|يا|وش|ايش|لو)(ال.{2,})$/);
        if (m && f(m[2]) >= 3) return m[2];
      }
      return w;
    }).map((w, k) => {
      if (k === 0 || w.length < 4 || w[0] !== 'و' || W_KEEP.has(w)) return w;
      const rest = repairWord(w.slice(1), f);
      return f(rest) >= 3 && f(rest) > f(w) ? 'و ' + rest : w;
    }).join(' ');
  }
  // the topic of the subject index that the cleaned query names exactly («الصبر», «الصدق وفضله», "patience")
  const SOFT = { ar: new Set(['فضل', 'وصف', 'اهوال', 'جزاء', 'عقوبة', 'عاقبة', 'حكمة', 'اهمية', 'معنى', 'طريقة', 'طريقه', 'كيفية', 'كيفيه'].map(w => stemAr(normAr(w)))) };
  function arabicTopicOf(text) {
    const toks = tokens(text, 'en');
    if (!toks.length || toks.length > 3) return null;
    const out = [];
    for (const t of toks) { const gi = THES_INDEX.en.get(t); if (gi == null) return null; out.push(THESAURUS[gi][0].split(' ')[0]); }
    return [...new Set(out)].join(' ');
  }
  // English: the topic named through EN_TOPICS, with the sense chosen among homographs (الجنة ≠ الجِنة, الإيمان ≠ الأيمان)
  const bare = (s) => String(s).replace(/[ً-ْٰ]/g, '').replace(/\s+/g, ' ').trim();
  function englishIndexTopic(text) {
    const e = englishTopicOf(text);
    if (!e) return null;
    const hit = TOPICS.byKey.get([...new Set(tokens(e.ar, 'ar'))].sort().join(' ')) || [];
    // a sense written «=name» must match the name exactly, tashkil included («=العفو» ≠ «العفوَ», the surplus of 2:219)
    const keep = hit.filter(t => e.senses ? e.senses.some(s => s[0] === '=' ? s.slice(1) === t.name : s === bare(t.name)) : !/\[/.test(t.name));
    if (!keep.length || !treeSize(keep)) return null;
    const t = topicTree(keep, 60);
    if (e.drop) {
      t.groups = t.groups.filter(g => !e.drop.test(bare(g.name)));
      const ok = new Set(t.groups.flatMap(g => g.ids));
      t.ids = t.ids.filter(i => ok.has(i)); t.total = ok.size;
    }
    return t.ids.length ? { mode: 'exact', via: 'en', name: keep[0].name, ...t } : null;
  }
  function indexTopicOf(text, L) {
    if (!TOPICS || !text) return null;
    if (L !== 'ar') { const en = englishIndexTopic(text); if (en) return en; }
    const tries = [];
    if (L === 'ar') {
      tries.push(text);
      const hard = text.split(' ').filter(w => !tokens(w.replace(/^و(?=..)/, ''), 'ar').every(t => SOFT.ar.has(t))).join(' ');
      if (hard && hard !== text) tries.push(hard);
    } else if (tokens(text, 'en').length <= 2) { const ar = arabicTopicOf(text); if (ar) tries.push(ar); } // "patience", not a whole question
    for (const t of tries) {
      const k = [...new Set(tokens(t, 'ar'))].sort().join(' ');
      const hit = k && TOPICS.byKey.get(k);
      if (hit && treeSize(hit) > 0) return { mode: 'exact', name: hit[0].name, ...topicTree(hit, 60) };
    }
    return null;
  }
  // words of the question once the pack's own words and «Islam / Muslims / religion» are set aside
  const GENERIC = { ar: new Set(tokens('الاسلام الإسلام المسلمين المسلمون مسلم دين الدين القران', 'ar', { stop: false })),
    en: new Set(tokens('islam islamic muslim muslims religion quran', 'en', { stop: false })) };
  function packRest(text, L, pack) {
    const pt = new Set(pack.words.flatMap(w => tokens(w, AR_RANGE.test(w) ? 'ar' : 'en', { stop: false })));
    return tokens(text, L).filter(t => !pt.has(t) && !GENERIC[L].has(t));
  }

  async function ask0(query, { uiLang = 'ar', llm = null, limit = 30, llmTimeoutMs = 9500, mode = 'auto' } = {}) {
    const q = (query || '').trim().slice(0, 500);
    const lang = q ? detectLang(q, uiLang) : uiLang;
    const M = MSG[lang];
    const base = { query: q, lang, meta: { route: null, llm: { used: false } } };
    if (!q) return { ...base, type: 'empty', answer: [{ kind: 'text', text: MSG[uiLang].empty }], verses: [], focus: null };
    // T082: an attempt to change how Mishkat works, or a request to WRITE a verse/hadith/fatwa: fixed answer, no AI
    const inj = isCrisis(q) ? null : injectionKind(q);   // a person in crisis gets help first (crisis route below)
    if (inj) { base.meta.route = 'guard'; return { ...base, type: 'abstain', reason: inj, answer: [{ kind: 'text', text: M[inj] }], verses: [], focus: null }; }
    // spoken question (voice search): fillers, politeness and question frames are set aside for the search
    const sp = cleanSpoken(q, lang);
    if (sp.changed) base.meta.spoken = sp.display;
    if (sp.empty && sp.spoken) return { ...base, type: 'empty', answer: [{ kind: 'text', text: M.empty }], verses: [], focus: null };
    const cq = sp.empty ? sp.display || q : repairTranscript(sp.text, lang);   // normalised search text
    const shown = sp.changed && !sp.empty ? sp.display : q;                      // what the answer quotes back
    // «افتح لي سورة الكهف», "uh play surah yaseen": the reference routes also try the cleaned text
    const refLike = sp.changed && !sp.empty && (sp.kinds.has('read') ||
      /(^| )(سوره|سورة|سورت|اية|ايه|الاية|الايه|surah|surat|sura|verse|ayah|aya|ayat|ayatul|ayatal)( |$)|\d/.test(sp.text));

    // 0. well-known verse names
    const fam = mode === 'topic' ? null : (famousLookup(q) || (refLike ? famousLookup(sp.display) : null));
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

    // 0b. the story of a prophet («قصة يوسف», "story of Moses", «النبي يونس»): an approved summary, the
    //     episodes with their verse ranges, the verses that name him and those that speak of him (index)
    const prophet = mode === 'topic' ? null : (storyQuery(q) || (sp.changed && !sp.empty ? storyQuery(sp.display) : null));
    if (prophet) {
      base.meta.route = 'story';
      const st = storyOf(prophet, { sci: SCI, topics: TOPICS && TOPICS.raw, searchAr, idxOf });
      const named = new Set(st.named);
      const order = [...new Set([...st.named, ...st.indexed])].sort((a, b) => a - b);
      const vs = order.map(i => verseResult(i, named.has(i) ? { named: true } : { indexed: true }));
      const name = lang === 'ar' ? prophet.ar : prophet.en;
      return { ...base, type: 'story', story: st, answer: [{ kind: 'text', text: M.story(name, st.named.length, st.indexed.length) }, { kind: 'note', text: M.storyNote }],
        verses: vs, focus: vs.length ? vs[0].idx : null, suras: groupBySura(order, (i) => named.has(i) ? 1 : 0.5).sort((a, b) => a.sura - b.sura),
        confirmedBy: 'index', aiConfirmed: false, sensitive: false, polemic: false };
    }

    // 1. references & surah names
    const r = mode === 'topic' ? null : (parseReference(q) || (refLike ? parseReference(sp.display) : null));
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
          // a surah named after a person («Maryam», «يوسف», "Noah"): the surah, and the person as the other reading
          const P = r.bare && PERSON_SURAS[S.n];
          return { ...base, type: 'sura', sura: S.n, answer: [{ kind: 'text', text: M.sura(S) }], verses: vs, focus: S.first,
            suras: [{ sura: S.n, verses: vs.map(v => v.idx), score: 1 }],
            alt: P ? { mode: 'topic', query: P[uiLang === 'ar' ? 0 : 1], person: P[uiLang === 'ar' ? 0 : 1] } : r.bare ? { mode: 'topic', query: q } : null };
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
    if (term && TERM_CUE.test(q) && termIsSubject(q, term)) {
      base.meta.route = 'term';
      const tix = topicIndexFor(term.ar, 'ar', [], 12);
      // no topic with verses in the index: the verses where the word itself occurs
      const ids = tix ? tix.ids : (topicSearch(term.ar, 'ar', 12).ranked || []).filter(x => x.full).map(x => x.idx);
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

    // 1e. a person in crisis (suicide, self-harm): support first, before any other route
    if (isCrisis(q)) {
      base.meta.route = 'crisis';
      const ids = CRISIS_REFS.map(r0 => { const [a, b] = r0.split(':').map(Number); return idxOf(a, b); }).filter(i => i >= 0);
      const cards = ids.map(i => cardOf(lang, i, 'context')).filter(Boolean);
      return { ...base, type: 'topic', crisis: true, sensitive: true, pack: 'crisis', answer: [{ kind: 'text', text: M.crisis }, ...cards],
        verses: ids.map(i => verseResult(i)), focus: ids[0], suras: groupBySura(ids), aiConfirmed: false, confirmedBy: 'context', paragraphBy: 'context', terms: [] };
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
      // a spoken question («طيب ابغى اعرف وش قال القرآن عن الصبر») is not a pasted verse:
      // only an exact quotation inside it is reported, never «this is not a verse»
      const isQuestion = (/^(ما|ماذا|من|متى|اين|كيف|لماذا|لم|كم|هل|اذكر|اعطني|ابحث)\s/.test(normAr(q)) || sp.spoken) && !explicit;
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

    // 4. topic. Order of evidence:
    //    a) the human-curated subject index when the (cleaned) query IS a topic («الصبر», "patience") — no AI call needed;
    //    b) AI: expand (intent + keywords + central refs) → BM25 on the cleaned query + keywords → candidates
    //       (lexical ∪ verified AI refs ∪ subject-index hits) → AI selection from that closed list → only those verses;
    //    c) no AI: only verses covering every word of the question (or of one side of «X و Y»), at most 8, no
    //       explanation — or abstain. Never verses that share only part of the question.
    base.meta.route = softPrefix ? 'verify+topic' : 'topic';
    const L = lang;
    const ML = MSG[L];
    // «لماذا…», «هل…», "why…", "is…": a real question, which a bare topic list does not answer
    const WHY = /^(لماذا|لم|ليش|ليه|هل|اليس|الم|why|is|are|does|do|did|was|were)( |$)/.test(L === 'ar' ? normAr(shown) : normLatin(shown));
    const polemic0 = isPolemic(q);
    const pack = packFor(q);
    let sensitive = isSensitiveText(q);
    const direct = softPrefix || WHY || sp.kinds.has('story') ? null : indexTopicOf(cq, L);
    let expansion = null, rulingAfter = false;
    const nWords = q.trim().split(/\s+/).length;   // a bare topic word flagged «ruling» stays a topic
    // … unless the query itself carries a word of status («الموسيقى حرام», "music haram")
    const rulingHint = /(حكم|حرام|حلال|يجوز|جائز|جايز|مكروه|بدعة|فتو|\bhalal\b|\bharam\b|\bpermissible\b|\ballowed\b|\bruling\b|\bfatwa\b)/i.test(q);
    // semantic neighbours (bge-m3 vectors of «verse — tafsir», computed by the server), started now so
    // they arrive with the expansion; used only as CANDIDATES and to confirm AI-proposed references
    const denseP = (llm && llm.dense) ? withTimeout(llm.dense({ query: q, lang: L }), llmTimeoutMs).catch(() => null) : null;
    if (llm && llm.expand && !(direct && tokens(cq, L).length <= 3)) {
      try {
        expansion = verifyExpansion(await withTimeout(llm.expand({ query: q, lang }), llmTimeoutMs));
        base.meta.llm = { used: true, stage: 'expand', intent: expansion.intent };
        // a bare topic word ("الخمر", "usury") is a topic, not a fatwa request
        if (expansion.intent === 'ruling' && nWords < 3 && !rulingHint) expansion.intent = 'topic';
        // a fatwa request: no ruling, but the AI still selects the verses on the subject (shown as «not a fatwa»)
        if (expansion.intent === 'ruling') rulingAfter = true;
        // the LLM recognised a question (not a pasted quote): answer it as a topic
        if (softPrefix && expansion.intent !== 'other') { softPrefix = null; base.meta.route = 'topic'; }
        // not a question about the Quran at all (weather, prices, a microphone test…)
        if (expansion.intent === 'other' && !softPrefix && !direct && !(polemic0 && pack)) {
          return { ...base, type: 'notfound', answer: [{ kind: 'text', text: ML.noTopic }], verses: [], focus: null, polemic: false, sensitive, aiConfirmed: false, confirmedBy: null };
        }
      } catch (e) { base.meta.llm = { used: false, error: String(e && e.message || e) }; }
    } else if (llm && direct) base.meta.llm = { used: false, skipped: 'subject-index' };
    const ts = topicSearchAuto(cq, L, uiLang, 40, expansion ? expansion.keywords : {}, { segments: true });
    const { qtoks, ranked } = ts;
    // trap / hostile questions and sensitive subjects get verified context
    const polemic = polemic0 || !!(expansion && expansion.intent === 'polemic');
    // the context pack comes first for a trap question, or when the pack's subject IS the question
    // («الجهاد», "slavery") — not when it is only mentioned («قصة امرأة فرعون»)
    const usePack = !!pack && (polemic || packRest(cq, L, pack).length === 0);
    sensitive = sensitive || usePack || !!(pack && ['violence', 'religions', 'freedom', 'slavery'].includes(pack.id));
    const kwAr = expansion && expansion.keywords ? (expansion.keywords.ar || []) : [];
    // kept for the post-processing only (never serialised: LLM keywords are not content)
    Object.defineProperty(base.meta, 'kwAr', { value: kwAr, enumerable: false });
    // The subject index answers a query that IS a topic. A real question («لماذا يعبد المسلمون الكعبة؟»)
    // keeps the normal selection: the verses of topic «الكعبة» (e.g. 5:95, hunting expiation) do not answer it.
    let tix = direct;
    // through the AI's keywords, only a query that is itself a topic («patience», «بر الوالدين»):
    // a real question («patience when you lose someone») keeps the AI selection, whose candidates
    // include the index verses — the index alone would list the whole topic, not the answer
    // E1: a subject-index topic reached only through ONE of the AI's keywords is never the answer
    // (it can be one facet — «الصبر» for «الصبر والشكر» — or another sense — «الحرام» for «الموسيقى حرام»):
    // its verses are only candidates (tixK below) for the AI's closed-list selection.
    let tixUse = !!tix;
    if (altSura) base.alt = { mode: 'sura', sura: altSura, name: L === 'ar' ? suras[altSura - 1].ar : suras[altSura - 1].tr };
    let order = [];
    let confirmed = false, personalNote = false, llmOk = false, aiNone = false, relatedOnly = new Set();
    // E1/E4: when the AI is available it ALWAYS selects, also for a subject-index topic: an index entry
    // may carry another sense of the word («الحجاب» → the barrier of al-A'raf, 7:46), so its verses
    // come first in the closed list and the AI keeps only those that answer
    if (llm && llm.select && !(expansion == null && llm.expand && base.meta.llm && base.meta.llm.error)) {
      // candidates (closed list): verses proposed by the LLM — kept only if they exist AND their text
      // (verse, tafsir or translation) contains a word of the query or of its keywords —, the lexical
      // ranking, the keyword ranking and the subject-index topics named by the keywords
      const qset = new Set(qtoks);
      const dense = denseP ? await denseP : null;
      const dn = (dense && Array.isArray(dense.ids) ? dense.ids : []).map(r0 => { const [a, b] = String(r0).split(':').map(Number); return idxOf(a, b); }).filter(i => i >= 0);
      const dnTop = new Set(dn.slice(0, 40));
      base.meta.dense = dn.length;
      // an AI-proposed reference is kept if it exists AND either shares a word with the question
      // or is among the 40 nearest verses by meaning (two independent checks)
      const proposed = (expansion ? expansion.refs : []).map(r0 => { const [a, b] = r0.split(':').map(Number); return idxOf(a, b); })
        .filter(i => i >= 0 && (dnTop.has(i) || FIELDS[L].some(([name]) => {
          const txt = name === 'quran' ? searchAr[i] : (src[name] && src[name].text[i]);
          return txt && tokens(txt, L).some(t => qset.has(t));
        })));
      base.meta.proposedKept = proposed.length;
      const tixK = softPrefix ? null : topicIndexFor(cq, L, kwAr, 12);
      // English question: the AI's Arabic keywords also search the Arabic text and tafsir
      const arK = [];
      if (L !== 'ar') for (const k of kwAr.slice(0, 3)) for (const x of topicSearch(k.replace(/_/g, ' '), 'ar', 8).ranked) if (!arK.includes(x.idx)) arK.push(x.idx);
      const lex = ranked.map(x => x.idx), kw = (ts.kwTop || []).concat(arK.filter(i => !(ts.kwTop || []).includes(i))), ix = [...new Set((tix ? tix.ids : []).concat(tixK ? tixK.ids : []))];
      const seen = new Set(), candIdx = [];
      for (const i of proposed) if (!seen.has(i)) { seen.add(i); candIdx.push(i); }
      // round robin (reciprocal-rank style fusion): words, meaning, AI keywords, subject index
      for (let k = 0; candIdx.length < MAX_CANDIDATES && (k < lex.length || k < dn.length || k < kw.length || k < ix.length); k++) {
        for (const i of [lex[k], dn[k], kw[k], ix[k]]) if (i != null && !seen.has(i) && candIdx.length < MAX_CANDIDATES) { seen.add(i); candIdx.push(i); }
      }
      const cands = candIdx.map(i => ({ id: ref(i), text: snippet(L, i) }));
      if (cands.length) {
        try {
          const out = await withTimeout(llm.select({ query: q, lang: L, candidates: cands }), llmTimeoutMs);
          const v = verifyLLM(out, cands);
          base.meta.llm = { ...base.meta.llm, used: true, model: out && out.model, rejected: v.rejected, intent: v.intent, candidates: cands.length };
          if (v.intent === 'ruling' && nWords < 3 && !rulingHint) v.intent = 'topic';
          if (v.intent === 'ruling') rulingAfter = true;
          if (v.intent === 'personal' || (expansion && expansion.intent === 'personal')) personalNote = true;
          if (v.ids.length) {
            // only the verses the AI confirmed: those that answer directly (score 2) first, in its
            // order of relevance, then the merely related ones (score 1)
            const ord = (id) => { const [s, a] = id.split(':').map(Number); return idxOf(s, a); };
            const dIds = v.ids.filter(id => v.scores[id] !== 1), rIds = v.ids.filter(id => v.scores[id] === 1);
            order = dIds.concat(rIds).map(ord);
            relatedOnly = new Set(rIds.map(ord));
            llmOk = true;
            confirmed = order.some(i => !relatedOnly.has(i)) && (v.confidence === 'high' || order.length >= 2);
          } else if (out && typeof out === 'object' && Array.isArray(out.ids)) aiNone = true; // the AI found no candidate that answers
        } catch (e) { base.meta.llm = { ...base.meta.llm, error: String(e && e.message || e) }; }
      }
    }
    if (rulingAfter) return rulingAnswer(q, lang, uiLang, base, order);
    if (llmOk && tixUse) { base.meta.indexCandidates = tix.name; tixUse = false; }
    let evid = null;
    if (tixUse) {
      // the subject index (human-curated) gives the verses; the tafsir explains them. Verses whose own
      // text or tafsir also contains the words of the question come first, and only they get an
      // explanation card; an index entry with no such verse gives way to the keyword match (if any).
      const fs = ts.fullSet || new Set();
      const lexRank = new Map(ranked.map((x, k) => [x.idx, k]));
      const byRank = (a, b) => (lexRank.has(a) ? lexRank.get(a) : 1e6) - (lexRank.has(b) ? lexRank.get(b) : 1e6);
      const withE = tix.ids.filter(i => fs.has(i)).sort(byRank), without = tix.ids.filter(i => !fs.has(i));
      // (not for an English topic named through EN_TOPICS: its sense was chosen there, and the words of the
      // English question need not be those of the translation — «kindness to parents», 17:23 «be good to»)
      if (!withE.length && ranked.some(x => x.full) && !llmOk && (tix.via !== 'en' || tix.total < 3)) { tixUse = false; tix = null; }
      else { order = withE.concat(without); evid = new Set(withE); confirmed = false; }
    }
    if (!llmOk && !softPrefix && isComfortQ(q)) {
      base.meta.route = 'comfort';
      const ids = COMFORT_REFS.map(r0 => { const [a, b] = r0.split(':').map(Number); return idxOf(a, b); }).filter(i => i >= 0);
      const cards = ids.slice(0, 5).map(i => cardOf(L, i, 'context')).filter(Boolean);
      return { ...base, type: 'topic', pack: 'comfort', answer: [{ kind: 'text', text: ML.comfort }, ...cards], verses: ids.map(i => verseResult(i)), focus: ids[0],
        suras: groupBySura(ids), sensitive: false, polemic: false, aiConfirmed: false, confirmedBy: 'context', paragraphBy: 'context', terms: qtoks };
    }
    if (tixUse) { /* order set above */ } else if (!llmOk && !aiNone) {
      // no AI confirmation: only verses that cover the whole question, no explanation
      order = ranked.filter(x => x.full).map(x => x.idx).slice(0, Math.min(limit, DET_MAX));
      if (!order.length && !softPrefix && !WHY && L === 'ar') {
        // last resort: a multi-word topic of the subject index named inside the question
        const t = topicIndexFor(cq, L, []);
        if (t && t.mode === 'subset') { tix = t; tixUse = true; order = t.ids.slice(); }
      }
    } else order = order.slice(0, limit);
    // context pack (verified, curated) first for trap questions / sensitive subjects
    const packIdx = usePack ? pack.refs.map(r0 => { const [a, b] = r0.split(':').map(Number); return idxOf(a, b); }).filter(i => i >= 0) : [];
    const all = packIdx.concat(order.filter(i => !packIdx.includes(i)));
    if (!all.length) {
      if (softPrefix) return { ...base, type: 'verify', verdict: 'notverse', answer: softPrefix.answer, verses: [], focus: null };
      return { ...base, type: 'notfound', answer: [{ kind: 'text', text: ML.noTopic }], verses: [], focus: null, polemic, sensitive,
        aiConfirmed: false, confirmedBy: null, terms: qtoks };
    }
    const nSuras = new Set(all.map(i => suraOf[i])).size;
    const answer = [];
    if (softPrefix) answer.push(...softPrefix.answer, { kind: 'text', text: ML.related });
    else if (polemic) answer.push({ kind: 'text', text: ML.polemic });
    else if (tixUse) answer.push({ kind: 'text', text: (tix.mode === 'exact' ? ML.topicIndex : ML.topicSubset)(tix.total, shown, nSuras, tix.name) });
    else answer.push({ kind: 'text', text: confirmed || llmOk ? ML.topic(all.length, shown, nSuras) : ML.topicLexical(all.length, shown, nSuras) });
    for (const i of packIdx) { const c = cardOf(L, i, 'context'); if (c) answer.push(c); }
    if (confirmed) for (const i of order.filter(i => !packIdx.includes(i) && (!evid || evid.has(i)) && !relatedOnly.has(i)).slice(0, 3)) { const c = cardOf(L, i, 'answer'); if (c) answer.push(c); }
    if (!llmOk && !softPrefix && !tixUse && order.length) answer.push({ kind: 'note', text: ML.lexicalOnly });
    if (sensitive) answer.push({ kind: 'note', text: ML.sensitiveNote });
    if (personalNote) answer.push({ kind: 'note', text: ML.personalNote });
    const rankOf = new Map(all.map((i, k) => [i, k]));
    return { ...base, type: softPrefix ? 'verify' : 'topic', verdict: softPrefix ? 'notverse' : undefined,
      answer, verses: all.map(i => verseResult(i, llmOk && !packIdx.includes(i) ? { ai: true, ...(relatedOnly.has(i) ? { aiRelated: true } : {}) } : {})), focus: all[0], sensitive, polemic, pack: pack ? pack.id : null,
      suras: groupBySura(all, (i) => 1 / (rankOf.get(i) + 1)), terms: qtoks,
      topicIndex: tixUse ? { mode: tix.mode, name: tix.name, total: tix.total, groups: tix.groups } : null,
      // who vouches for the relevance of the verses: the AI (closed-list selection), the human-curated
      // subject index, the verified context pack only, or nobody (keyword match → the UI shows a warning)
      aiConfirmed: llmOk, confirmedBy: llmOk ? 'ai' : tixUse ? 'index' : (packIdx.length && !order.length ? 'context' : null),
      paragraphBy: tixUse ? 'index' : confirmed ? 'llm' : (packIdx.length ? 'context' : 'none') };
  }

  // the glossary term is what is asked about — not a word that only frames another question
  // («what is the punishment for theft in Islam», «ما حكم … في الإسلام», "according to Islam")
  const RX_ESC = /[.*+?^${}()|[\]\\]/g;
  function termIsSubject(q, term) {
    const lat = (term.latin || []).map(x => normLatin(x)).filter(Boolean).map(x => x.replace(RX_ESC, '\\$&'));
    const nl = normLatin(q), na = normAr(q);
    if (lat.length && new RegExp('\\b(in|according to|under|by|for|of)\\s+(the\\s+)?(' + lat.join('|') + ')\\b').test(nl)) return false;
    const ar = normAr(term.ar || '').replace(/^ال/, '');
    if (ar && new RegExp('(^|\\s)(في|حسب|عند|بحسب|وفق)\\s+(ال)?' + ar + '(\\s|$)').test(na)) return false;
    return true;
  }

  // Full tafsir unit of one verse (never a fragment).
  function cardOf(lang, i, role) {
    const s = src[PARAGRAPH_FOR[lang]] || src[TAFSIR_FOR[lang]];
    const text = s && s.text[i] ? s.text[i].replace(/^\d+\.\s*/, '').trim() : '';
    if (!text) return null;
    return { kind: 'quote', role, text, source: s.id, sourceTitle: s.title, ref: ref(i), idx: i };
  }

  // Fatwa requests: no ruling, but related verses (labelled "not a fatwa") and links to official sources.
  function rulingAnswer(q, lang, uiLang, base, aiIdx = []) {
    const M = MSG[lang];
    const stripped0 = q.replace(RULING_WORDS, ' ').replace(/\s+/g, ' ').trim();
    const stripped = (cleanSpoken(stripped0, lang).text || stripped0).trim();
    const ts = stripped ? topicSearchAuto(stripped, lang, uiLang, 8) : { ranked: [] };
    // verses confirmed by the AI's closed-list selection first, then the full keyword matches
    const ids = [...new Set([...aiIdx.slice(0, 6), ...(ts.ranked || []).filter(x => x.full).map(x => x.idx)])].slice(0, 8);
    base.meta.route = base.meta.route || 'guard';
    if (isBloodRuling(q)) {
      const life = BLOOD_REFS.map(r0 => { const [a, b] = r0.split(':').map(Number); return idxOf(a, b); }).filter(i => i >= 0);
      const cards = life.map(i => cardOf(lang, i, 'context')).filter(Boolean);
      const vs = life.concat(ids.filter(i => !life.includes(i))).slice(0, 8).map(i => verseResult(i, { relatedOnly: !life.includes(i) }));
      return { ...base, type: 'abstain', reason: 'ruling', blood: true, sensitive: true, answer: [{ kind: 'text', text: M.ruling }, { kind: 'text', text: M.blood }, ...cards],
        verses: vs, focus: vs.length ? vs[0].idx : null, links: fatwaLinks(stripped || q) };
    }
    const related = ids.map(i => verseResult(i, { relatedOnly: true }));
    return { ...base, type: 'abstain', reason: 'ruling', answer: [{ kind: 'text', text: M.ruling }], verses: related,
      focus: related.length ? related[0].idx : null, links: fatwaLinks(stripped || q) };
  }

  // Neighbouring verses of the same surah (context view).
  function context(i, n = 2) {
    const out = [];
    for (let k = i - n; k <= i + n; k++) if (k >= 0 && k < NV && suraOf[k] === suraOf[i]) out.push(k);
    return out;
  }

  // what the AI reads about each candidate: the verse itself (its translation in English) and the
  // beginning of a vetted tafsir — the verse often says it more directly than the tafsir's first words
  function snippet(lang, i) {
    const cut = (t, n) => { t = String(t || '').replace(/^\d+\.\s*/, '').replace(/\[\d+\]/g, '').trim(); if (t.length <= n) return t; const c = t.lastIndexOf(' ', n); return t.slice(0, c > n * 0.6 ? c : n); };
    const s = src[TAFSIR_FOR[lang]] || src[TAFSIR_FOR.ar];
    const verse = lang === 'ar' ? searchAr[i] : ((src[TRANSLATION_FOR[lang]] || {}).text || [])[i];
    const v = cut(verse, 110), t = cut(s && s.text[i], 232 - v.length);
    return v && t ? `${v} — ${t}` : (v || t);
  }

  return {
    ask, ref, idxOf, suraOf, ayaOf, suras, verses, sources: src, cardOf, wordLookup, suggestWords, addLatinIndex, wordPositions,
    warm() { vx(); wordIndex(); for (const n of ['quran', ...Object.keys(src)]) field(n); },
    addTopicIndex, addBayenat, addSurahSciences, hasSurahSciences: () => !!SCI, topicIndexFor, bayenatFor, hasTopics: () => !!TOPICS, hasBayenat: () => !!BAY,
    addSource(id, payload) { src[id] = payload; fields.delete(id); },
    hasSource: (id) => !!src[id],
    topicSearch, verifyText, parseReference, findSura, sentencePool, context,
    tafsir: (lang, i) => (src[TAFSIR_FOR[lang]] || {}).text?.[i] || '',
    text: (id, i) => (src[id] || {}).text?.[i] || '',
    translation: (lang, i) => TRANSLATION_FOR[lang] ? ((src[TRANSLATION_FOR[lang]] || {}).text?.[i] || '') : '',
  };
}
