// The tajweed page (5 Oct, author's request): in the reader the tajweed box stays brief (the rules of the verse being
// read and the colour key); every rule — its name, its letters («keys»), its short definition and examples from the
// Mushaf — is on this dedicated page. Text of the rules: RULE_INFO (written by hand after Tuḥfat al-Aṭfāl and
// al-Muqaddima al-Jazariyya); examples: the Tanzil text with the checked colours of data/tajweed (CC BY 4.0).
import { GROUPS, RULE_INFO, TJ_S, colourToken, tokenOffsets, verseRules } from './tajweed.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d = null) { try { const v = localStorage.getItem('mishkat.' + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mishkat.' + k, String(v)); } catch (e) { /* private mode */ } },
};
const arNum = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const S = {
  ar: { back: 'العودة إلى المصحف', brand: 'مِشكاة', title: 'أحكام التجويد', lead: 'أحكام التلاوة برواية حفص عن عاصم، بألوانها في مصحف «مشكاة»: لكل حكمٍ حروفُه (مفاتيحه كما جمعها الناظمون) وتعريفٌ مختصر وأمثلةٌ من المصحف. اضغط مثالًا لتفتح آيته وتستمع إليها.',
    srcTitle: 'المصادر', srcEx: 'الأمثلة: نص المصحف من Tanzil، والألوان مطابقة حرفًا حرفًا على النص؛ اضغط مثالًا لفتح آيته في المصحف.', examples: 'أمثلة من المصحف', loading: 'جارٍ جمع الأمثلة…', none: 'لا مثال في السور المختارة.', open: (r) => `افتح ${r}` },
  en: { back: 'Back to the Mushaf', brand: 'Mishkat', title: 'Tajweed rules', lead: 'The rules of recitation in the riwāya of Ḥafṣ from ʿĀṣim, with their colours in Mishkat’s Mushaf: for each rule, its letters (its «keys» as the classical poems gather them), a short definition and examples from the Mushaf. Tap an example to open its verse and listen to it.',
    srcTitle: 'Sources', srcEx: 'Examples: the Tanzil text, with colours checked letter by letter on it; tap an example to open its verse in the Mushaf.', examples: 'Examples from the Mushaf', loading: 'Gathering examples…', none: 'No example in the chosen surahs.', open: (r) => `Open ${r}` },
};
// surahs searched for examples (short and well known first)
const EX_SURAS = [1, 112, 113, 114, 108, 103, 97, 110, 105, 106, 107, 109, 111, 99, 100, 101, 102, 104, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 67, 36];

const params = new URL(location.href).searchParams;
let lang = params.get('lang') === 'en' || params.get('lang') === 'ar' ? params.get('lang') : store.get('lang', 'ar') === 'en' ? 'en' : 'ar';
const from = params.get('from');   // «s:a» of the verse the reader came from
const theme = (th) => { document.documentElement.dataset.theme = th; store.set('theme', th); $('#theme').textContent = th === 'light' ? '☀' : '☾'; };
theme(store.get('theme', 'dark') === 'light' ? 'light' : 'dark');
$('#theme').onclick = () => theme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');

let examples = null;   // rule index → [{ html, s, a }]
async function gather() {
  const core = await (await fetch('data/core.json')).json();
  const out = RULE_INFO.map(() => []);
  for (const n of EX_SURAS) {
    if (out.every(x => x.length >= 3)) break;
    let file;
    try { file = await (await fetch(`data/tajweed/${n}.json`)).json(); } catch (e) { continue; }
    const Sx = core.suras[n - 1];
    file.forEach((ann, k) => {
      if (!ann || !ann.length) return;
      const i = Sx.first + k, verse = core.verses[i], toks = verse.split(' '), offs = tokenOffsets(verse);
      const skip = (k === 0 && n !== 1 && n !== 9) ? 4 : 0;   // the basmala Tanzil puts before verse 1
      for (const { r, word } of verseRules(verse, ann)) {
        if (word < skip || out[r].length >= 3 || out[r].some(x => x.tok === toks[word])) continue;
        // only the run of this rule is coloured in the example word
        const only = ann.filter(x => x[2] === r);
        out[r].push({ tok: toks[word], html: colourToken(toks[word], offs[word], only), s: n, a: k + 1, sura: lang === 'ar' ? Sx.ar : Sx.tr });
      }
    });
  }
  return out;
}

function render() {
  const t = S[lang], L = lang, X = TJ_S[L];
  document.documentElement.lang = L; document.documentElement.dir = L === 'ar' ? 'rtl' : 'ltr';
  document.title = L === 'ar' ? 'أحكام التجويد — مشكاة' : 'Tajweed rules — Mishkat';
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t[el.dataset.t]; });
  document.querySelectorAll('.langs button').forEach(b => b.classList.toggle('on', b.dataset.lang === L));
  $('#back').querySelector('[aria-hidden]').textContent = L === 'ar' ? '→' : '←';
  const [fs, fa] = (from || '').split(':').map(Number);
  $('#back').href = fs ? `./?s=${fs}&a=${fa || 1}` : './';
  $('#src1').textContent = X.srcRules; $('#src2').textContent = X.src;
  $('#toc').innerHTML = GROUPS.map(g => `<a href="#g-${g.id}"><span class="tj tj-${g.id}">●</span> ${esc(g[L])}</a>`).join('');
  $('#groups').innerHTML = GROUPS.map(g => `<section class="tjp-group" id="g-${g.id}">
      <h2><span class="tj tj-${g.id}">■</span> ${esc(g[L])}</h2>
      ${g.rules.map(r => {
        const R = RULE_INFO[r], ex = examples ? examples[r] : null;
        return `<article class="tjp-rule">
          <h3 class="tj tj-${g.id}">${esc(R[L])}</h3>
          <p class="tjp-def">${esc(L === 'ar' ? R.dar : R.den)}</p>
          <p class="tjp-keys"><small>${esc(X.keys)}:</small> <b dir="rtl" lang="ar">${esc(L === 'ar' ? R.kar : R.ken)}</b></p>
          <div class="tjp-ex"><small>${esc(t.examples)}</small>
            ${ex == null ? `<span class="muted">${esc(t.loading)}</span>` : ex.length ? ex.map(x => `<a class="tjp-word" href="./?s=${x.s}&a=${x.a}" title="${esc(t.open(`${x.sura} ${x.s}:${x.a}`))}"><span class="q" dir="rtl" lang="ar">${x.html}</span><small>${esc(x.sura)} ${L === 'ar' ? arNum(x.a) : x.a}</small></a>`).join('') : `<span class="muted">${esc(t.none)}</span>`}
          </div></article>`;
      }).join('')}</section>`).join('');
}
document.querySelectorAll('.langs button').forEach(b => b.onclick = () => { lang = b.dataset.lang; store.set('lang', lang); render(); });
render();
gather().then(ex => { examples = ex; render(); if (location.hash) document.querySelector(location.hash)?.scrollIntoView(); }).catch(() => { examples = RULE_INFO.map(() => []); render(); });
