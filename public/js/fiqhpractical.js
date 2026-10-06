// T123 — practical fiqh («شروط الصلاة», «كيف أتوضأ», «نواقض الوضوء», «مفسدات الصيام», «how to perform wudu»).
//
// Such a question has no «حكم» in it: before, the search of the Fiqh Encyclopedia returned neighbouring sections and
// the Creed Encyclopedia answered «شروط» with the conditions of the shahada (author's report: off topic).
// Now the question is matched with the encyclopedia's OWN headings (public/data/feqhia_toc.json, data_build/
// build_feqhia_toc.mjs): the section whose heading names both the subject (الصلاة، الوضوء…) and the aspect asked
// (شروط، أركان، صفة…) is shown with its sub-headings, as written, each linked to dorar.net/feqhia. Mishkat writes
// nothing: the headings are the encyclopedia's, the statements stay on its pages (one tap away).
// Source: dorar.net/feqhia, named by the challenge pack for general fiqh. No section found → nothing is shown.

const bare = (s) => String(s || '').normalize('NFC').replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[^ء-ي a-z0-9]/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

// the subject: question words → the stem the encyclopedia's headings use
const SUBJECTS = [
  { k: 'wudu', re: /(^| )(و|ف|ب|ل)?(ال)?(وضوء|وضو|اتوضا|اتوضي|يتوضا|نتوضا|توضا|توضيء)( |$)|\b(wudu|wudhu|wuzu|ablution)\b/, h: /الوضوء|الوضو/ },
  { k: 'ghusl', re: /(^| )(و|ف|ب|ل)?(ال)?(غسل|اغتسل|يغتسل|الاغتسال|اغتسال)( |$)|\bghusl\b/, h: /الغسل/ },
  { k: 'tayammum', re: /(^| )(و|ف|ب|ل)?(ال)?(تيمم|اتيمم|يتيمم)( |$)|\btayamm?um\b/, h: /التيمم/ },
  { k: 'khuff', re: /المسح علي الخفين|المسح علي الجوارب|\bwiping over (the )?(socks|khuffs?)\b/, h: /المسح علي الخفين/ },
  { k: 'adhan', re: /(^| )(ال)?(اذان|الاقامه|اقامه الصلاه)( |$)|\b(adhan|azan|iqamah?)\b/, h: /الاذان|الاقامه/ },
  { k: 'sahw', re: /سجود السهو|\bsujud (as-)?sahw\b|\bprostration of forgetfulness\b/, h: /سجود السهو/ },
  { k: 'tilawa', re: /سجود التلاوه|\bprostration of recitation\b/, h: /سجود التلاوه/ },
  { k: 'jumua', re: /(^| )(ال)?(جمعه)( |$)|\b(jumu.?ah?|friday prayer)\b/, h: /الجمعه/ },
  { k: 'eid', re: /صلاه العيد|صلاه العيدين|\beid prayer\b/, h: /العيدين|العيد/ },
  { k: 'janaza', re: /(^| )(ال)?(جنازه|جنائز|الميت)( |$)|\b(janazah?|funeral)\b/, h: /الجنائز|الجنازه/ },
  { k: 'witr', re: /(^| )(ال)?(وتر)( |$)|\bwitr\b/, h: /الوتر/ },
  { k: 'tarawih', re: /تراويح|قيام رمضان|\btarawee?h\b/, h: /التراويح|قيام رمضان/ },
  { k: 'kusuf', re: /كسوف|خسوف|\beclipse\b/, h: /الكسوف/ },
  { k: 'istisqa', re: /استسقاء|استسقا|\bistisqa\b/, h: /الاستسقاء|الاستسقا/ },
  { k: 'travel', re: /صلاه المسافر|القصر|الجمع بين الصلاتين|\b(shorten(ing)? (the )?prayer|traveller.?s prayer)\b/, h: /المسافر|القصر|الجمع/ },
  { k: 'fitr', re: /زكاه الفطر|صدقه الفطر|\bzakat al.?fitr\b/, h: /زكاه الفطر/ },
  { k: 'zakat', re: /(^| )(و|ف|ب|ل)?(ال)?(زكاه|زكوات|ازكي|يزكي)( |$)|\b(zakat|zakah)\b/, h: /الزكاه/ },
  { k: 'itikaf', re: /اعتكاف|\bi.?tikaf\b/, h: /الاعتكاف/ },
  { k: 'sawm', re: /(^| )(و|ف|ب|ل)?(ال)?(صوم|صيام|اصوم|يصوم|الصائم|صائم)( |$)|\b(fast|fasting|sawm|siyam)\b/, h: /الصوم|الصيام|الصائم/ },
  { k: 'umra', re: /(^| )(و|ف|ب|ل)?(ال)?(عمره|اعتمر|يعتمر)( |$)|\bumrah?\b/, h: /العمره/ },
  { k: 'ihram', re: /(^| )(ال)?(احرام|محرم)( |$)|\bihram\b/, h: /الاحرام/ },
  { k: 'tawaf', re: /(^| )(ال)?(طواف)( |$)|\btawaf\b/, h: /الطواف/ },
  { k: 'hajj', re: /(^| )(و|ف|ب|ل)?(ال)?(حج|احج|يحج)( |$)|\bhajj\b/, h: /الحج/ },
  // last: «الصلاة» is in many other subjects («صلاة الجمعة», «صلاة العيد»)
  { k: 'salat', re: /(^| )(و|ف|ب|ل)?(ال)?(صلاه|صلوات|اصلي|يصلي|نصلي|المصلي)( |$)|\b(prayer|pray|salah|salat)\b/, h: /الصلاه/ },
];
// the aspect asked: question words → the words of the headings
const ASPECTS = [
  { k: 'shurut', re: /(^| )(و|ب)?(ال)?(شروط|شرط|شرائط)( |$)|\b(conditions?|prerequisites?|requirements?)\b/, h: /شروط|شرائط/ },
  { k: 'arkan', re: /(^| )(و|ب)?(ال)?(اركان|ركن)( |$)|\b(pillars?|essentials?|integrals?)\b/, h: /اركان/ },
  { k: 'wajibat', re: /(^| )(و|ب)?(ال)?(واجبات)( |$)|\b(obligations|obligatory acts|wajibat)\b/, h: /واجبات/ },
  { k: 'furud', re: /(^| )(و|ب)?(ال)?(فروض|فرائض)( |$)|\b(obligatory parts|fard acts|furud)\b/, h: /فروض|فرائض/ },
  { k: 'sunan', re: /(^| )(و|ب)?(ال)?(سنن|مستحبات|اداب)( |$)|\b(sunnahs|sunan|recommended acts|etiquettes?)\b/, h: /سنن|مستحبات|اداب/ },
  { k: 'mubtilat', re: /(^| )(و|ب)?(ال)?(مبطلات|يبطل|تبطل|بطلان)( |$)|\b(invalidat\w*|nullif\w*|break(s)? the prayer)\b/, h: /مبطلات|يبطل/ },
  { k: 'nawaqid', re: /(^| )(و|ب)?(ال)?(نواقض|ينقض|تنقض|ناقض)( |$)|\b(invalidators?|break(s)? (the )?wudu|nullifiers?)\b/, h: /نواقض/ },
  { k: 'mufsidat', re: /(^| )(و|ب)?(ال)?(مفسدات|يفسد|مفطرات|يفطر|تفطر|يبطل الصيام|يبطل الصوم)( |$)|\b(break(s)? (the )?fast|invalidat\w* (the )?fast)\b/, h: /مفسدات|المفطرات|يفسد/ },
  { k: 'mahzurat', re: /(^| )(ال)?(محظورات)( |$)|\bprohibitions of ihram\b/, h: /محظورات/ },
  { k: 'makruhat', re: /(^| )(ال)?(مكروهات)( |$)|\bdisliked acts\b/, h: /مكروهات|ما يكره/ },
  { k: 'mawaqit', re: /(^| )(ال)?(مواقيت|اوقات)( |$)|\b(times of|miqats?)\b/, h: /مواقيت|اوقات|وقت/ },
  { k: 'nisab', re: /(^| )(ال)?(نصاب|مقدار)( |$)|\bnisab\b/, h: /نصاب/ },
  { k: 'masarif', re: /(^| )(ال)?(مصارف|مستحقي|من يستحق)( |$)|\b(who receives|recipients)\b/, h: /مصارف|اهل الزكاه/ },
  { k: 'mujibat', re: /(^| )(ال)?(موجبات|يوجب)( |$)|\bwhat requires\b/, h: /موجبات/ },
  // «how»: the description of the act («صفة الصلاة», «صفة الغسل»)
  { k: 'sifa', re: /(^| )(كيف|كيفيه|صفه|طريقه)( |$)|\b(how (do|to|should|can) (i|we|you|one)?|how is|description of|method of|way to)\b/, h: /صفه|كيفيه/ },
];
const RULING_Q = /(^| )(ما|هل)? ?(حكم|يجوز|حرام|حلال)( |$)|\b(is it (allowed|permissible|haram|halal)|ruling)\b/;

// { subject, aspect } of a practical question, or null
export function practicalTopic(q) {
  const s = bare(q);
  if (!s || s.length > 120 || RULING_Q.test(s)) return null;
  const subject = SUBJECTS.find(x => x.re.test(s));
  const aspect = ASPECTS.find(x => x.re.test(s));
  if (!subject || !aspect) return null;
  return { subject: subject.k, aspect: aspect.k };
}

// the encyclopedia's section for a practical question → { node, path: [nodes], kids: [{ node, kids: [nodes] }] } or null
export function findSection(toc, q) {
  const topic = practicalTopic(q);
  if (!topic || !toc || !Array.isArray(toc.nodes)) return null;
  const S = SUBJECTS.find(x => x.k === topic.subject), A = ASPECTS.find(x => x.k === topic.aspect);
  const byId = new Map(toc.nodes.map(n => [n.id, n]));
  const kidsOf = new Map();
  for (const n of toc.nodes) { if (!kidsOf.has(n.p)) kidsOf.set(n.p, []); kidsOf.get(n.p).push(n); }
  const pathOf = (n) => { const out = []; for (let x = byId.get(n.p); x; x = byId.get(x.p)) out.unshift(x); return out; };
  // the subject in the heading itself or in a heading above it (the chapter «الوضوء» › «الفصل الثاني: شروط الوضوء»);
  // a subject named by a more specific one above it is another subject («صلاة الجمعة» is not «الصلاة»)
  const subjectOf = (n) => [n, ...pathOf(n).reverse()].map(x => bare(x.t)).find(t => SUBJECTS.some(y => y.h.test(t)));
  const ofSubject = (n) => { const t = subjectOf(n); return !!t && S.h.test(t) && !SUBJECTS.some(y => y !== S && y.h.test(t) && SUBJECTS.indexOf(y) < SUBJECTS.indexOf(S)); };
  // the heading itself names the subject: «صفة مسح الرأس» (inside the chapter on wudu) is not «how to make wudu»
  let hits = toc.nodes.filter(n => A.h.test(bare(n.t)) && S.h.test(bare(n.t)) && ofSubject(n));
  // «how» without a «صفة» heading: the subject's own chapter
  if (!hits.length && topic.aspect === 'sifa') hits = toc.nodes.filter(n => S.h.test(bare(n.t)) && n.d <= 2 && ofSubject(n));
  if (!hits.length) return null;
  // the heading that names the subject itself first, then the most precise one (the fewest words after «الباب …:»:
  // «أركان الصيام» before the chapter «تعريف الصوم، وأقسامه، … وأركانه»), then the highest one
  const words = (n) => bare(n.t.includes(':') ? n.t.slice(n.t.indexOf(':') + 1) : n.t).split(' ').filter(Boolean).length;
  hits.sort((a, b) => (S.h.test(bare(b.t)) - S.h.test(bare(a.t))) || words(a) - words(b) || a.d - b.d || a.id - b.id);
  const node = hits[0];
  const kids = (kidsOf.get(node.id) || []).map(k => ({ node: k, kids: (kidsOf.get(k.id) || []).slice(0, 20) })).slice(0, 25);
  return { node, path: pathOf(node), kids, topic };
}

export const PF = {
  ar: { title: 'من الموسوعة الفقهية (الدرر السنية)', lead: 'هذا القسم من الموسوعة يتناول سؤالك؛ عناوينه منقولة كما هي، واضغط أي عنوان لتقرأ نصّه وأدلّته في الموسوعة.',
    read: 'اقرأ القسم كاملًا في الموسوعة', note: 'العناوين من فهرس الموسوعة الفقهية (dorar.net/feqhia)، أحد المراجع المعتمدة في حزمة التحدي؛ لم يكتب «مشكاة» شيئًا منها. للحالة الشخصية: اسأل أهل العلم.' },
  en: { title: 'From the Fiqh Encyclopedia (Ad-Durar As-Saniyyah)', lead: 'This section of the encyclopedia covers your question; its headings are quoted as written (Arabic). Tap a heading to read its text and evidence in the encyclopedia.',
    read: 'Read the whole section in the encyclopedia', note: 'Headings from the index of the Fiqh Encyclopedia (dorar.net/feqhia), an approved reference of the challenge pack; Mishkat wrote none of them. For a personal case, ask a scholar.' },
};
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const link = (id) => `https://dorar.net/feqhia/${id}`;
export function practicalHtml(hit, lang = 'ar') {
  const t = PF[lang] || PF.ar;
  const a = (n) => `<a href="${link(n.id)}" target="_blank" rel="noopener">${esc(n.t)}</a>`;
  // a long index (a whole chapter: «كيف أتوضأ») shows its sections folded, each opening on its sub-headings
  const fold = hit.kids.reduce((n, k) => n + k.kids.length, 0) > 24;
  return `<h3 class="sec">${esc(t.title)}</h3><p class="note">${esc(t.lead)}</p>
    <article class="fiqh pf" dir="rtl"><h4>${a(hit.node)}</h4>${hit.path.length ? `<p class="fq-path">${esc(hit.path.map(n => n.t).join(' › '))}</p>` : ''}
    ${hit.kids.length ? `<ol class="pf-list">${hit.kids.map(k => `<li>${!k.kids.length ? a(k.node) : fold
      ? `<details><summary>${esc(k.node.t)}</summary><p class="pf-open">${a(k.node)}</p><ol>${k.kids.map(g => `<li>${a(g)}</li>`).join('')}</ol></details>`
      : `${a(k.node)}<ol>${k.kids.map(g => `<li>${a(g)}</li>`).join('')}</ol>`}</li>`).join('')}</ol>` : ''}
    <footer><small><a href="${link(hit.node.id)}" target="_blank" rel="noopener">${esc(t.read)}</a></small></footer></article>
    <p class="note">${esc(t.note)}</p>`;
}
