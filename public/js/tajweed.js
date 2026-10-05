// T099 — tajweed colours in the reader (optional), from the open annotation of cpfair/quran-tajweed (CC BY 4.0),
// re-aligned and CHECKED on our Tanzil text by data_build/build_tajweed.py (a verse whose annotations do not all land
// on a letter of their rule keeps no colour). Colours only: the text is the Tanzil text, unchanged.
export const RULES = ['ghunnah', 'idghaam_ghunnah', 'idghaam_no_ghunnah', 'idghaam_mutajanisayn', 'idghaam_mutaqaribayn', 'idghaam_shafawi',
  'ikhfa', 'ikhfa_shafawi', 'iqlab', 'madd_2', 'madd_246', 'madd_munfasil', 'madd_muttasil', 'madd_6', 'qalqalah',
  'hamzat_wasl', 'lam_shamsiyyah', 'silent'];
// grouped for the legend (one colour per group, as in the coloured Mushafs)
export const GROUPS = [
  { id: 'madd6', rules: [13], ar: 'مدّ لازم (٦ حركات)', en: 'Necessary madd (6)' },
  { id: 'maddw', rules: [12, 11], ar: 'مدّ واجب متصل / جائز منفصل (٤–٥)', en: 'Connected / separated madd (4–5)' },
  { id: 'madd2', rules: [9, 10], ar: 'مدّ طبيعي / عارض (٢–٦)', en: 'Natural / optional madd (2–6)' },
  { id: 'ghunna', rules: [0, 6, 7, 8], ar: 'غنّة، إخفاء، إقلاب', en: 'Ghunna, ikhfa, iqlab' },
  { id: 'idgham', rules: [1, 2, 3, 4, 5], ar: 'إدغام', en: 'Idgham (merging)' },
  { id: 'qalqala', rules: [14], ar: 'قلقلة', en: 'Qalqala' },
  { id: 'silent', rules: [15, 16, 17], ar: 'لا يُنطق (همزة وصل، لام شمسية، حرف ساكن)', en: 'Not pronounced (hamzat al-wasl, solar lam, silent letter)' },
];
const GROUP_OF = (() => { const g = []; GROUPS.forEach(G => G.rules.forEach(r => { g[r] = G.id; })); return g; })();

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// one token (offset `at` in the verse string) as HTML with coloured runs; ann = [[start, end, rule], …] of the verse
export function colourToken(tok, at, ann) {
  if (!ann || !ann.length) return esc(tok);
  const chars = [...tok];       // code points, as the offsets
  const g = new Array(chars.length).fill(null);
  for (const [s, e, r] of ann) for (let k = Math.max(s, at); k < Math.min(e, at + chars.length); k++) g[k - at] = r;
  let html = '', run = '', cur = null;
  // each coloured run carries its rule (data-r): a tap or a hover tells its name and its definition
  const flush = () => { if (run) html += cur != null ? `<span class="tj tj-${GROUP_OF[cur]}" data-r="${cur}">${esc(run)}</span>` : esc(run); run = ''; };
  chars.forEach((c, k) => { if (g[k] !== cur) { flush(); cur = g[k]; } run += c; });
  flush();
  return html;
}
// code-point offsets of the tokens of a verse string split on single spaces
export function tokenOffsets(verse) {
  const out = []; let at = 0;
  for (const tok of verse.split(' ')) { out.push(at); at += [...tok].length + 1; }
  return out;
}
export const TJ_S = {
  ar: { btn: 'ألوان التجويد', all: 'كل أحكام التجويد', legend: 'مفتاح ألوان التجويد', rules: 'الأحكام وحروفها (مفاتيحها)', here: 'أحكام هذه الآية', none: 'لا ألوان لهذه الآية (لم يُتحقق من مطابقتها).', tap: 'اضغط حرفًا ملوَّنًا لترى حكمه.', keys: 'الحروف', inWord: 'في',
    srcRules: 'التعريفات مختصرة من متن «تحفة الأطفال» للجمزوري و«المقدمة الجزرية» لابن الجزري (رواية حفص عن عاصم).', src: 'التلوين من مشروع quran-tajweed المفتوح (رواية حفص، رخصة CC BY 4.0)، مطابق على نص Tanzil آيةً آية؛ الآيات التي لم يُتحقق من تطابقها تُعرض بلا ألوان.' },
  en: { btn: 'Tajweed colours', all: 'All the tajweed rules', legend: 'Tajweed colour key', rules: 'The rules and their letters (keys)', here: 'Rules in this verse', none: 'No colours for this verse (its annotation could not be checked).', tap: 'Tap a coloured letter to see its rule.', keys: 'Letters', inWord: 'in',
    srcRules: 'Short definitions after the classical poems Tuḥfat al-Aṭfāl (al-Jamzūrī) and al-Muqaddima al-Jazariyya (Ibn al-Jazarī), riwāyat Ḥafṣ ʿan ʿĀṣim.', src: 'Colours from the open quran-tajweed project (Hafs, CC BY 4.0), checked on the Tanzil text verse by verse; verses that could not be checked are shown without colours.' },
};

// (4 Oct, refonte) the name of each rule, its short definition and its «keywords» — the letters that trigger it as
// the classical poems gather them (تحفة الأطفال للجمزوري: «ينمو»، «يرملون»، «صِفْ ذا ثنا…»؛ المقدمة الجزرية لابن
// الجزري: «قُطْبُ جَدٍّ»). Riwayat Hafs from Asim (ṭarīq al-Shāṭibiyya), as the colours. Text written by hand, never generated.
export const RULE_INFO = [
  { ar: 'غُنّة', en: 'Ghunna (nasal sound)', kar: 'نّ · مّ', ken: 'nūn or mīm with shadda',
    dar: 'النون والميم المشدّدتان: صوت من الخيشوم مقداره حركتان.', den: 'A doubled nūn or mīm: a nasal sound held for two counts.' },
  { ar: 'إدغام بغُنّة', en: 'Idgham with ghunna', kar: 'ينمو', ken: 'ي ن م و (yanmū)',
    dar: 'النون الساكنة أو التنوين قبل أحد حروف «ينمو» من كلمة أخرى: تُدغم مع غُنّة.', den: 'Silent nūn or tanwīn before one of «ي ن م و» in the next word: merged, with a nasal sound.' },
  { ar: 'إدغام بلا غُنّة', en: 'Idgham without ghunna', kar: 'ل · ر', ken: 'lām, rāʾ',
    dar: 'النون الساكنة أو التنوين قبل اللام أو الراء: تُدغم إدغامًا كاملًا بلا غُنّة.', den: 'Silent nūn or tanwīn before lām or rāʾ: fully merged, without a nasal sound.' },
  { ar: 'إدغام المتجانسَين', en: 'Idgham of kindred letters', kar: 'تْ ط · دْ ت · طْ ت · ذْ ظ · ثْ ذ · بْ م', ken: 'same articulation point',
    dar: 'حرفان اتّفقا في المخرج واختلفا في الصفة، الأول ساكن، فيُدغم في الثاني (مثل: قد تبيّن).', den: 'Two letters from the same point of articulation, the first silent, merged into the second (e.g. qad tabayyana).' },
  { ar: 'إدغام المتقاربَين', en: 'Idgham of close letters', kar: 'لْ ر · قْ ك', ken: 'close articulation points',
    dar: 'حرفان تقاربا في المخرج أو الصفة، الأول ساكن، فيُدغم في الثاني (مثل: قل ربّ، ألم نخلقكم).', den: 'Two letters close in articulation, the first silent, merged into the second (e.g. qul rabbi).' },
  { ar: 'إدغام شفوي', en: 'Labial idgham', kar: 'مْ م', ken: 'silent mīm before mīm',
    dar: 'الميم الساكنة قبل ميم: تُدغم فيها مع غُنّة.', den: 'A silent mīm before a mīm: merged, with a nasal sound.' },
  { ar: 'إخفاء', en: 'Ikhfa (hiding)', kar: 'صِفْ ذا ثنا كم جاد شخصٌ قد سما دُمْ طيّبًا زِدْ في تُقًى ضَعْ ظالما', ken: 'the 15 letters of «ṣif dhā thanā…»',
    dar: 'النون الساكنة أو التنوين قبل أحد الحروف الخمسة عشر في أوائل كلمات هذا البيت: تُخفى مع غُنّة.', den: 'Silent nūn or tanwīn before one of the fifteen letters opening the words of this line: hidden, with a nasal sound.' },
  { ar: 'إخفاء شفوي', en: 'Labial ikhfa', kar: 'مْ ب', ken: 'silent mīm before bāʾ',
    dar: 'الميم الساكنة قبل الباء: تُخفى مع غُنّة.', den: 'A silent mīm before bāʾ: hidden, with a nasal sound.' },
  { ar: 'إقلاب', en: 'Iqlab (turning)', kar: 'ب', ken: 'bāʾ',
    dar: 'النون الساكنة أو التنوين قبل الباء: تُقلب ميمًا مخفاة مع غُنّة.', den: 'Silent nūn or tanwīn before bāʾ: turned into a hidden mīm, with a nasal sound.' },
  { ar: 'مدّ طبيعي', en: 'Natural madd', kar: 'ا · و · ي', ken: 'alif, wāw, yāʾ of prolongation',
    dar: 'حرف المدّ بلا همز ولا سكون بعده: يُمدّ حركتين.', den: 'A letter of prolongation with no hamza or sukūn after it: two counts.' },
  { ar: 'مدّ عارض للسكون', en: 'Madd before a pause', kar: 'وقف', ken: 'stopping',
    dar: 'حرف مدّ بعده حرف يُسكَّن للوقف: يجوز ٢ أو ٤ أو ٦ حركات.', den: 'A letter of prolongation before a letter made silent by stopping: 2, 4 or 6 counts.' },
  { ar: 'مدّ جائز منفصل', en: 'Separated madd', kar: 'مدّ + ء (كلمتان)', ken: 'madd letter, hamza in the next word',
    dar: 'حرف المدّ في آخر كلمة والهمزة في أول التي بعدها: ٤ أو ٥ حركات لحفص.', den: 'The letter of prolongation ends a word, the hamza opens the next: 4 or 5 counts for Hafs.' },
  { ar: 'مدّ واجب متّصل', en: 'Connected madd', kar: 'مدّ + ء (كلمة واحدة)', ken: 'madd letter and hamza in one word',
    dar: 'حرف المدّ والهمزة بعده في كلمة واحدة: ٤ أو ٥ حركات.', den: 'Letter of prolongation and hamza in the same word: 4 or 5 counts.' },
  { ar: 'مدّ لازم', en: 'Necessary madd', kar: 'مدّ + سكون أصلي', ken: 'madd letter before an original sukūn',
    dar: 'حرف المدّ بعده سكون أصلي أو تشديد: يُمدّ ستّ حركات.', den: 'A letter of prolongation before an original sukūn or a shadda: six counts.' },
  { ar: 'قلقلة', en: 'Qalqala (echo)', kar: 'قُطْبُ جَدٍّ', ken: 'ق ط ب ج د (quṭbu jad)',
    dar: 'أحد حروف «قطب جد» إذا سكن: يُنطق بنبرة خفيفة.', den: 'One of the letters of «quṭbu jad» when silent: pronounced with a light echo.' },
  { ar: 'همزة الوصل', en: 'Hamzat al-wasl', kar: 'ٱ', ken: 'connecting alif',
    dar: 'تُنطق عند الابتداء بها، وتسقط في درج الكلام.', den: 'Pronounced when starting with it, dropped when joined to what comes before.' },
  { ar: 'اللام الشمسية', en: 'Solar lām', kar: 'ال + حرف شمسي', ken: 'al- before a solar letter',
    dar: 'لام «ال» قبل حرف شمسي: تُكتب ولا تُنطق، ويُشدَّد الحرف بعدها.', den: 'The lām of al- before a solar letter: written, not pronounced; the next letter is doubled.' },
  { ar: 'حرف لا يُنطق', en: 'Silent letter', kar: '—', ken: '—',
    dar: 'حرف يُكتب في المصحف ولا يُقرأ في الوصل.', den: 'A letter written in the Mushaf and not read when joined.' },
];
// the rules of one verse, in reading order: [{ r, word }], word = index of the token in the verse string
export function verseRules(verse, ann) {
  if (!ann || !ann.length) return [];
  const offs = tokenOffsets(verse), out = [];
  for (const [s, , r] of [...ann].sort((a, b) => a[0] - b[0])) {
    let k = 0; while (k + 1 < offs.length && offs[k + 1] <= s) k++;
    out.push({ r, word: k });
  }
  return out;
}
