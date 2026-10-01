// Entry gate: accept the basmala (or the short tasmiya "بسم الله") in any common
// written or spoken form: with/without diacritics, Uthmani or simple script,
// dialect spellings produced by speech recognition, and Latin transliterations.
import { normAr, normLatin } from './engine.js';

const AR_FULL = 'بسماللهالرحمنالرحيم';
const AR_SHORT = 'بسمالله';
const LAT_FULL = 'bismillahirrahmanirrahim';
const LAT_SHORT = 'bismillah';

function lev(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return dp[b.length];
}

export function isBasmala(input) {
  const raw = String(input || '').trim();
  if (!raw) return false;
  // Arabic: remove diacritics/Quranic marks, unify alef forms, drop spaces and punctuation
  let a = normAr(raw).replace(/\s+/g, '')
    .replace(/^و/, '')                    // "وبسم الله"
    .replace(/^باسم/, 'بسم')              // "باسم الله" (common spelling / speech)
    .replace(/رحمان/g, 'رحمن')            // "الرحمان" (imla'i / speech)
    .replace(/الرحمنالرحيم.*$/, 'الرحمنالرحيم');
  if (a.length >= 5) {
    if (a === AR_FULL || a === AR_SHORT) return true;
    if (lev(a, AR_FULL) <= 2) return true;
    if (a.length <= 9 && lev(a, AR_SHORT) <= 1) return true;
  }
  // Latin transliterations: "Bismillah", "Bismillahi r-Rahmani r-Rahim", "bismi Allah"…
  const l = normLatin(raw).replace(/[^a-z]/g, '').replace(/aa/g, 'a').replace(/ee/g, 'i').replace(/ii/g, 'i');
  if (l.length >= 7) {
    if (lev(l, LAT_SHORT) <= 2 || lev(l, LAT_SHORT + 'i') <= 2) return true;
    if (lev(l, LAT_FULL) <= 4) return true;
    if (/^b[iu]?sm[iu]?l+ah?i?(ar|er|ir)?r?ah?m[ae]?n[iu]?(ar|er|ir)?r?ah?[iy]+m$/.test(l)) return true;
  }
  return false;
}
