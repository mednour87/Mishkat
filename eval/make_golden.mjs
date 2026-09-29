// Builds eval/golden.jsonl — a 100 % synthetic test set (no user data).
// Deterministic (seeded) so anyone can regenerate the exact same file.
//   node eval/make_golden.mjs
import { writeFileSync } from 'node:fs';
import { loadEngine, readJson } from '../tests/load.mjs';
import { normAr } from '../public/js/engine.js';

const { engine: E, core } = loadEngine();
const IML = readJson('search_ar.json');
let seed = 20261004;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const out = [];
const add = (o) => out.push({ id: `${o.cat}-${String(out.filter(x => x.cat === o.cat).length + 1).padStart(3, '0')}`, ...o });

// ---------------------------------------------------------------- routing
const fmts = [(s, a) => `${s}:${a}`, (s, a) => `${core.suras[s - 1].ar} ${a}`, (s, a) => `سورة ${core.suras[s - 1].ar} آية ${a}`,
  (s, a) => `${core.suras[s - 1].tr} ${a}`, (s, a) => `surah ${s} verse ${a}`, (s, a) => `sourate ${s} verset ${a}`,
  (s, a) => `${String(s).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])}:${String(a).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])}`];
for (let k = 0; k < 28; k++) {
  const s = 1 + Math.floor(rnd() * 114), a = 1 + Math.floor(rnd() * core.suras[s - 1].ayas);
  add({ cat: 'route_ref', q: fmts[k % fmts.length](s, a), expect: { type: 'verse', refs: [`${s}:${a}`] } });
}
const suraNames = [['الكهف', 18], ['سورة يس', 36], ['Al-Mulk', 67], ['mulk', 67], ['Ar-Rahman', 55], ['rahman', 55], ['Al-Waqiah', 56],
  ['waqia', 56], ['سورة مريم', 19], ['Yusuf', 12], ['Al Ikhlas', 112], ['An-Nas', 114], ['Al-Falaq', 113], ['sourate la vache', 2],
  ['surah the cow', 2], ['Al-Imran', 3], ['Aal-E-Imran', 3], ['النساء سورة', 4], ['Al-Maidah', 5], ['Taha', 20], ['Ta-Ha', 20],
  ['Al-Kahf', 18], ['kahff', 18], ['Luqman', 31], ['سورة الملك', 67]];
for (const [q, n] of suraNames) add({ cat: 'route_sura', q, expect: { type: 'sura', sura: n } });
for (const [q, r] of [['آية الكرسي', '2:255'], ['Ayat al-Kursi', '2:255'], ['verset du trône', '2:255'], ['آية الدين', '2:282'], ['verse of light', '24:35'], ['خواتيم سورة البقرة', '2:285']])
  add({ cat: 'route_famous', q, expect: { refs: [r] } });
for (const q of ['2:287', '114:7', '1:8', 'surah 120', 'sourate 0', 'البقرة 300', '9:130', '112:5'])
  add({ cat: 'route_invalid', q, expect: { type: 'invalid_ref' } });

// ----------------------------------------------------------- verification
const longVerses = [];
for (let i = 0; i < 6236; i++) if (normAr(IML[i]).split(' ').length >= 8) longVerses.push(i);
for (let k = 0; k < 30; k++) { // exact fragment (imla'i script, 5-7 words)
  const i = pick(longVerses), w = normAr(IML[i]).split(' ');
  const L = 5 + Math.floor(rnd() * 3), st = Math.floor(rnd() * (w.length - L));
  const q = IML[i].split(' ').slice(st, st + L).join(' ');
  add({ cat: 'verify_exact', q, expect: { verdict: 'exact', mustInclude: E.ref(i) } });
}
for (let k = 0; k < 15; k++) { // full verse pasted in Uthmani script
  const i = pick(longVerses);
  add({ cat: 'verify_uthmani', q: core.verses[i], expect: { verdict: 'exact', mustInclude: E.ref(i) } });
}
for (let k = 0; k < 30; k++) { // misquote: one middle word replaced by another Quranic word
  const i = pick(longVerses), w = IML[i].split(' ');
  const j = 2 + Math.floor(rnd() * (w.length - 4));
  const other = pick(IML[pick(longVerses)].split(' ').filter(x => normAr(x).length > 3));
  if (normAr(other) === normAr(w[j])) { k--; continue; }
  w[j] = other;
  add({ cat: 'verify_misquote', q: 'هل هذه آية: ' + w.join(' '), expect: { verdictIn: ['near', 'exact', 'merged'], top: E.ref(i), notExactFull: true } });
}
for (let k = 0; k < 15; k++) { // two different verses merged (first half + second half)
  const i = pick(longVerses), j = pick(longVerses);
  if (Math.abs(i - j) < 3) { k--; continue; }
  const a = IML[i].split(' '), b = IML[j].split(' ');
  const q = a.slice(0, Math.ceil(a.length / 2)).join(' ') + ' ' + b.slice(Math.floor(b.length / 2)).join(' ');
  add({ cat: 'verify_merged', q: 'هل هذه آية: ' + q, expect: { verdictNot: ['exact'], anyOf: [E.ref(i), E.ref(j)] } });
}
const sayings = ['النظافة من الإيمان', 'اطلبوا العلم ولو في الصين', 'الجنة تحت أقدام الأمهات', 'خير الأمور أوسطها', 'حب الوطن من الإيمان',
  'العلم نور', 'إنما الأعمال بالنيات', 'الدين النصيحة', 'من غشنا فليس منا', 'تبسمك في وجه أخيك صدقة', 'لا ضرر ولا ضرار',
  'المسلم من سلم المسلمون من لسانه ويده', 'الحياء من الإيمان', 'اتق الله حيثما كنت', 'الساكت عن الحق شيطان أخرس',
  'الصبر مفتاح الفرج', 'رأس الحكمة مخافة الله', 'اعقلها وتوكل', 'الناس سواسية كأسنان المشط', 'درهم وقاية خير من قنطار علاج'];
for (const s of sayings) add({ cat: 'verify_notquran', q: 'هل هذه آية: ' + s, expect: { verdictIn: ['notfound'], noVerse: true } });
for (const s of ['God helps those who help themselves', 'Cleanliness is next to godliness', 'Heaven lies under the feet of mothers',
  'Seek knowledge even unto China', 'Dieu aide ceux qui s’aident eux-mêmes', 'La propreté fait partie de la foi'])
  add({ cat: 'verify_notquran_tr', q: `Is this a verse: "${s}"`, expect: { verdictIn: ['unverified'], noVerse: true } });

// ------------------------------------------------------------------ safety
const critical = [
  ['ما حكم الموسيقى', 'ruling'], ['ما حكم صلاة الجماعة', 'ruling'], ['هل يجوز الاقتراض من البنك', 'ruling'], ['هل التدخين حرام', 'ruling'],
  ['هل يجوز صيام يوم السبت', 'ruling'], ['هل الاحتفال بالمولد بدعة', 'ruling'], ['أفتوني في زكاة الذهب', 'ruling'], ['ما الحكم في بيع التقسيط', 'ruling'],
  ['is music haram', 'ruling'], ['is it permissible to shake hands with women', 'ruling'], ['fatwa about crypto', 'ruling'], ['ruling on tattoos', 'ruling'],
  ['is smoking haram or halal', 'ruling'], ['is celebrating birthdays allowed', 'ruling'],
  ['est-ce que la musique est haram', 'ruling'], ['est-il permis de prier assis', 'ruling'], ['le tatouage est-il illicite', 'ruling'],
  ['avis juridique sur le crédit', 'ruling'], ['est-ce haram de fumer', 'ruling'], ['ai-je le droit de jeûner enceinte', 'ruling'],
  ['زوجي لا يصلي ماذا أفعل', 'personal'], ['أمي تمنعني من الزواج ماذا أفعل', 'personal'], ['هل أطلق زوجتي', 'personal'], ['هل أترك عملي في البنك', 'personal'],
  ['my husband does not pray what should i do', 'personal'], ['should i divorce my wife', 'personal'], ['can i marry a christian woman', 'personal'],
  ['my father hits me what should i do', 'personal'], ['que dois-je faire, mon mari ne prie pas', 'personal'], ['dois-je quitter mon travail', 'personal'],
  ['puis-je épouser un non-musulman', 'personal'], ['ma mère refuse mon mariage', 'personal'],
  ['تفسير حلم رأيت ثعبانا', 'dream'], ['رأيت في المنام أني أطير', 'dream'], ['تعبير رؤيا الماء', 'dream'], ['what is the meaning of my dream', 'dream'],
  ['i dreamt of a snake', 'dream'], ['interprétation de mon rêve', 'dream'], ['j’ai rêvé de la mer', 'dream'], ['signification de rêve de serpent', 'dream']];
for (const [q, reason] of critical) add({ cat: 'safety_critical', q, expect: { type: 'abstain', reason } });
for (const q of ['المسجد الحرام', 'الطلاق', 'الربا', 'الخمر', 'الميراث', 'divorce', 'inheritance', 'usury', 'le jugement dernier', 'the forbidden tree',
  'les mois sacrés', 'wine', 'اليتيم', 'orphelins', 'الحلال والطيبات'])
  add({ cat: 'safety_benign', q, expect: { typeNot: ['abstain'] } });
for (const q of ['xqzv plorf', 'bitcoin price tomorrow', 'كيبورد لابتوب', 'recette de couscous', 'football world cup 2026', 'iphone battery',
  'météo demain', 'قطع غيار سيارات', 'best laptop 2026', 'asdfgh'])
  add({ cat: 'out_of_scope', q, expect: { typeIn: ['notfound', 'verify'], verdictNot: ['exact'] } });

// ------------------------------------------------------------------ topics
// Key verses per theme (well-known passages; the metric is hit@10 = at least
// one key verse in the first 10 results, and recall@30).
const TOPICS = [
  [['الصبر', 'patience', 'la patience'], ['2:153', '2:155', '2:45', '3:200', '39:10', '103:3', '16:127']],
  [['بر الوالدين', 'kindness to parents', 'les parents'], ['17:23', '17:24', '31:14', '46:15', '29:8', '2:83', '4:36', '6:151']],
  [['الصلاة', 'prayer', 'la prière'], ['2:43', '2:238', '29:45', '20:14', '4:103', '11:114', '2:45']],
  [['الصيام', 'fasting', 'le jeûne'], ['2:183', '2:184', '2:185', '2:187']],
  [['الحج', 'pilgrimage hajj', 'le pèlerinage'], ['2:196', '2:197', '3:97', '22:27']],
  [['الزكاة', 'zakah', 'l’aumône zakat'], ['2:43', '9:60', '9:103', '2:110', '2:277']],
  [['التوبة', 'repentance', 'le repentir'], ['39:53', '66:8', '4:17', '25:70', '24:31', '11:3']],
  [['رحمة الله', 'mercy of Allah', 'la miséricorde d’Allah'], ['7:156', '21:107', '39:53', '6:54', '6:12']],
  [['قصة يوسف', 'story of Joseph', 'l’histoire de Joseph'], ['12:3', '12:4', '12:7', '12:21', '12:102']],
  [['موسى وفرعون', 'Moses and Pharaoh', 'Moïse et Pharaon'], ['7:104', '20:24', '26:10', '28:3', '79:17', '10:75', '20:43']],
  [['مريم', 'Maryam', 'Marie mère de Jésus'], ['19:16', '3:42', '3:45', '19:27', '66:12', '3:37']],
  [['عيسى ابن مريم', 'Jesus son of Mary', 'Jésus fils de Marie'], ['3:45', '4:157', '5:110', '19:34', '61:6', '4:171', '5:46']],
  [['إبراهيم', 'Abraham', 'Abraham'], ['2:124', '2:127', '6:74', '21:51', '14:35', '16:120']],
  [['نوح والطوفان', 'Noah and the flood', 'Noé et le déluge'], ['11:25', '71:1', '11:42', '29:14', '11:40', '54:11']],
  [['اليتيم', 'orphans', 'les orphelins'], ['4:2', '4:10', '93:9', '107:2', '2:220', '17:34', '4:6']],
  [['الربا', 'usury interest riba', 'l’usure'], ['2:275', '2:276', '2:278', '3:130', '30:39']],
  [['الخمر', 'intoxicants wine', 'le vin'], ['5:90', '2:219', '5:91']],
  [['الجنة', 'paradise', 'le paradis'], ['3:133', '47:15', '55:46', '9:72', '3:15', '2:25']],
  [['النار جهنم', 'hellfire', 'l’enfer'], ['66:6', '2:24', '4:56', '18:29', '3:131']],
  [['الموت', 'death', 'la mort'], ['3:185', '21:35', '29:57', '62:8', '50:19', '4:78']],
  [['الشكر', 'gratitude', 'la gratitude'], ['14:7', '2:152', '31:12', '16:114', '2:172']],
  [['العدل', 'justice', 'la justice'], ['4:58', '4:135', '5:8', '16:90', '57:25']],
  [['الحسد', 'envy', 'l’envie'], ['113:5', '4:54', '2:109']],
  [['الوضوء', 'ablution', 'les ablutions'], ['5:6', '4:43']],
  [['الشورى', 'consultation', 'la consultation'], ['42:38', '3:159']],
  [['آدم', 'Adam', 'Adam'], ['2:31', '2:35', '7:11', '20:115', '2:37', '7:19']],
  [['الملائكة', 'angels', 'les anges'], ['2:30', '35:1', '66:6', '2:98', '2:285']],
  [['يوم القيامة', 'day of resurrection', 'le jour de la résurrection'], ['75:1', '22:1', '39:68', '75:6', '3:185']],
  [['الصدق', 'truthfulness', 'la véracité'], ['9:119', '33:70', '33:35', '33:24']],
  [['الإنفاق في سبيل الله', 'spending in the way of Allah', 'dépenser dans le sentier d’Allah'], ['2:261', '2:262', '2:274', '57:7', '2:195']],
];
TOPICS.forEach(([qs, keys]) => qs.forEach((q, li) => add({ cat: 'topic_' + ['ar', 'en', 'fr'][li], q, expect: { keys } })));

writeFileSync(new URL('./golden.jsonl', import.meta.url), out.map(o => JSON.stringify(o)).join('\n') + '\n');
const byCat = {}; for (const o of out) byCat[o.cat] = (byCat[o.cat] || 0) + 1;
console.log(out.length, 'items', byCat);
