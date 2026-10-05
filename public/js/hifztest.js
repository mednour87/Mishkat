// (6 Oct, author's request) the memorisation test after a repetition session: each verse is hidden, the visitor writes
// it (or recites it: the voice is turned into text), and the answer is compared word by word with the verse.
// The comparison is on the simple (imla'i) spelling of the verse (data/search_ar.json), without vowels, and forgiving
// on spellings that do not change the word: hamza seats, alef forms, final ya/alif maqsura, ta marbuta, and the long
// alif itself (الكتاب / الكتب, الصلاة / الصلوة) — so a correct verse is never marked wrong for a spelling detail.
// Pure functions; nothing is generated: the verse shown after the check is the Tanzil text.

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;   // vowels, Quranic signs, tatweel
export function normWord(w) {
  return String(w || '').replace(/وٰ/g, 'ا').replace(MARKS, '')   // الصلوٰة (Mushaf) = الصلاة
    .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '')
    .replace(/ا/g, '')                                        // the long alif: written or not in the two spellings
    .replace(/[^ء-ي]/g, '');
}
export const words = (s) => String(s || '').split(/\s+/).map(normWord).filter(Boolean);

// longest common subsequence of two word lists → which verse words were found, in order
export function compare(answer, verse) {
  const a = words(answer), v = words(verse), n = a.length, m = v.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === v[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const found = new Array(m).fill(false);
  for (let i = 0, j = 0; i < n && j < m;) { if (a[i] === v[j]) { found[j] = true; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  const hit = found.filter(Boolean).length, extra = Math.max(0, n - hit);
  // a verse is known when (almost) every word is there, in order, with few extra words
  const score = m ? Math.max(0, (hit - extra * 0.5) / m) : 0;
  return { found, hit, total: m, extra, score, ok: score >= 0.9 };
}

// a hint: the first k words of the verse (as written in the Mushaf), the rest hidden
export function hint(verseTokens, k) {
  const toks = verseTokens.filter(Boolean);
  return toks.slice(0, Math.max(0, Math.min(k, toks.length))).join(' ') + (k < toks.length ? ' …' : '');
}

// the advice after the test
export function verdict(results) {
  const n = results.length, ok = results.filter(r => r.ok).length;
  const mean = n ? results.reduce((s, r) => s + r.score, 0) / n : 0;
  return { n, ok, mean, relearn: n > 0 && ok === 0, review: n > 0 && ok > 0 && ok < n, all: n > 0 && ok === n };
}
