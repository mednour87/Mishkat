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
  for (const [s, e, r] of ann) for (let k = Math.max(s, at); k < Math.min(e, at + chars.length); k++) g[k - at] = GROUP_OF[r];
  let html = '', run = '', cur = null;
  const flush = () => { if (run) html += cur ? `<span class="tj tj-${cur}">${esc(run)}</span>` : esc(run); run = ''; };
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
  ar: { btn: 'ألوان التجويد', legend: 'مفتاح ألوان التجويد', src: 'التلوين من مشروع quran-tajweed المفتوح (رواية حفص، رخصة CC BY 4.0)، مطابق على نص Tanzil آيةً آية؛ الآيات التي لم يُتحقق من تطابقها تُعرض بلا ألوان.' },
  en: { btn: 'Tajweed colours', legend: 'Tajweed colour key', src: 'Colours from the open quran-tajweed project (Hafs, CC BY 4.0), checked on the Tanzil text verse by verse; verses that could not be checked are shown without colours.' },
};
