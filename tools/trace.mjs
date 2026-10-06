#!/usr/bin/env node
// Mishkat traceability tool — أداة التتبّع
//   node tools/trace.mjs
// Scans the repository and regenerates, from the files themselves (no hand-typed numbers):
//   docs/TRACEABILITY.md     (Markdown, for GitHub / the jury)
//   docs/traceability.html   (single self-contained page: inline CSS/JS, no external resource, works offline)
// Covered: external services & APIs, internal /api endpoints, AI models and what they may do,
// data files (size + SHA-256 + source), code inventory (lines, last commit, exports),
// tools & libraries, tests & evaluation, git history (baseline vs challenge window).
// Node >= 18, no dependencies. Secrets: `.dev.vars` and `.env*` are never opened.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, extname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_MD = join(ROOT, 'docs', 'TRACEABILITY.md');
const OUT_HTML = join(ROOT, 'docs', 'traceability.html');
const WINDOW_START = '2026-10-04', WINDOW_END = '2026-10-06'; // challenge build window (inclusive)
const COMMITS_SHOWN = 30;

// ------------------------------------------------------------------ safety: never read secrets
const FORBIDDEN = /(^|\/)(\.dev\.vars|\.env(\.[^/]*)?)$/i;
const SKIP_DIRS = new Set(['.git', 'node_modules', '.wrangler']);
const rel = (p) => relative(ROOT, p).split(sep).join('/');
function assertAllowed(p) { if (FORBIDDEN.test(rel(p))) throw new Error(`refusing to read a secrets file: ${rel(p)}`); }
const readBuf = (p) => { assertAllowed(p); return readFileSync(p); };
const readText = (p) => readBuf(p).toString('utf8');
const R = (...parts) => join(ROOT, ...parts);
const exists = (...parts) => existsSync(R(...parts));
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (SKIP_DIRS.has(name)) continue;
    let st; try { st = statSync(p); } catch (e) { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (!FORBIDDEN.test(rel(p))) out.push(p);
  }
  return out;
}
const ALL = walk(ROOT);
const ALL_REL = ALL.map(rel);

// ------------------------------------------------------------------ git
function git(args, raw = false) {
  try { const o = execFileSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }); return raw ? o.replace(/\s+$/, '') : o.trim(); }
  catch (e) { return null; }
}
const HEAD = git(['rev-parse', 'HEAD']);
const HEAD_SHORT = HEAD ? HEAD.slice(0, 7) : null;
const BRANCH = git(['rev-parse', '--abbrev-ref', 'HEAD']);
const HEAD_DATE = git(['log', '-1', '--format=%cI']);
const STATUS = new Map();
const TRACKED = new Set((git(['ls-files']) || '').split('\n').filter(Boolean));
for (const line of (git(['status', '--porcelain=v1', '-uall'], true) || '').split('\n').filter(Boolean)) {
  const code = line.slice(0, 2).trim() || '?';
  let path = line.slice(3);
  if (path.includes(' -> ')) path = path.split(' -> ')[1];
  STATUS.set(path.replace(/^"|"$/g, ''), code);
}
const LAST_COMMIT = new Map(); // file → { h, d }
{
  const log = git(['log', '--format=@@%h|%cs', '--name-only']) || '';
  let cur = null;
  for (const line of log.split('\n')) {
    if (line.startsWith('@@')) { const [h, d] = line.slice(2).split('|'); cur = { h, d }; continue; }
    const f = line.trim();
    if (f && cur && !LAST_COMMIT.has(f)) LAST_COMMIT.set(f, cur);
  }
}
const phaseOf = (d) => d < WINDOW_START ? 'baseline (declared)' : d <= WINDOW_END ? 'challenge window' : 'after the window';
const ALL_COMMITS = (git(['log', '--format=%h%x1f%cs%x1f%cI%x1f%an%x1f%s']) || '').split('\n').filter(Boolean)
  .map(l => { const [h, d, iso, author, subject] = l.split('\x1f'); return { h, d, iso, author, subject, phase: phaseOf(d) }; });
const gitCell = (f) => { const c = LAST_COMMIT.get(f); return c ? `${c.h} · ${c.d}` : '— (never committed)'; };
const statusCell = (f) => { const s = STATUS.get(f); if (!s) return TRACKED.has(f) ? 'committed' : 'not in git (ignored)'; return s === '??' ? 'untracked' : s.includes('M') ? 'modified' : s.includes('A') ? 'added' : s.includes('D') ? 'deleted' : s; };

// ------------------------------------------------------------------ small helpers
const fmtBytes = (n) => n == null ? '—' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KiB` : `${(n / 1048576).toFixed(2)} MiB`;
const nf = (n) => Number(n).toLocaleString('en-US');
const lineOf = (src, index) => src.slice(0, index).split('\n').length;
const uniq = (a) => [...new Set(a)];
const CODE_EXT = new Set(['.js', '.mjs', '.py', '.html', '.css']);
const LANG = { '.js': 'JavaScript', '.mjs': 'JavaScript (ESM)', '.py': 'Python', '.html': 'HTML', '.css': 'CSS' };

// ------------------------------------------------------------------ 1. external services & APIs
// Role / licence table maintained here (from SOURCES.md, TOOLS.md, README.md, ../02_SOURCES/REFERENTIEL_DU_DEFI.md).
const HOSTS = {
  'tanzil.net': { name: 'Tanzil Project', ar: 'مشروع تنزيل', ref: 'S1', role: 'Quran text (Uthmani, Hafs ‘an ‘Asim) — the only source of displayed verse text; frozen in data_build/quran-uthmani.txt', licence: 'CC BY 3.0 — verbatim copies only, cite and link tanzil.net' },
  'quranenc.com': { name: 'QuranEnc.com API v1', ar: 'موسوعة القرآن الكريم', ref: 'S2–S5', role: 'At-Tafsir Al-Muyassar, Al-Mukhtasar (ar/en/fr), Noor International (en) and Rachid Maach (fr) translations — downloaded once, frozen with SHA-256', licence: 'redistribution without modification, with a clear reference to the publisher and QuranEnc.com' },
  'api.quran.com': { name: 'Quran.com API v4', ar: 'Quran.com', ref: 'S6–S9', role: 'build: Tafsir As-Sa‘di (91), imla’i search index, chapter names, word timings (recitation 7), word transliteration; live: Ibn Kathir (14), Al-Baghawi (94), Al-Qurtubi (90), Ibn Kathir EN (169) via /api/tafsir', licence: 'public API — attribution to the author and Quran.com' },
  'verses.quran.com': { name: 'Quran.com audio CDN', ar: 'تلاوة العفاسي', ref: 'S9', role: 'Sheikh Mishary Alafasy recitation, streamed by the browser (allowed in CSP media-src)', licence: 'streamed, not redistributed; attribution to the reciter and Quran.com' },
  'quran.com': { name: 'Quran.com website', ar: 'Quran.com', ref: 'S6–S9', role: 'outbound “verify on Quran.com” links and tafsir page links', licence: 'link only' },
  'api.quranpedia.net': { name: 'Quranpedia API v1 + official dumps', ar: 'الموسوعة القرآنية', ref: 'S11–S13', role: 'live At-Tabari tafsir page by page (book 4) via /api/tafsir; versioned dumps for the subject index and surah information', licence: 'free in apps; 120 req/min and 10,000/day per IP; republishing data needs credit + link + version; translations remain their authors’ property' },
  'quranpedia.net': { name: 'Quranpedia.net', ar: 'الموسوعة القرآنية', ref: 'S11–S13', role: 'source attribution links', licence: 'link only' },
  'dorar.net': { name: 'Dorar.net', ar: 'الدرر السنية — الموسوعة الحديثية', ref: 'S14', role: 'hadith search API (dorar_api.json) via /api/hadith — results shown verbatim with the muhaddith’s verdict; links to the tafsir encyclopedia', licence: 'API offered by Dorar to websites to display search results; never selected, graded or generated by Mishkat' },
  'bayenat.net': { name: 'Bayyinat — Osoul Center', ar: 'موسوعة بيّنات — مركز أصول', ref: 'S15', role: 'objection (shubuhat) index: question titles + URLs only (data_build/fetch_bayenat_index.py, 10 s between requests)', licence: 'public site; only titles/links stored, no answer text copied' },
  'islamic-content.com': { name: 'Al-Jamhara', ar: 'الجمهرة — موسوعة المصطلحات الإسلامية', ref: 'S16', role: 'terminology links from the glossary (public/js/glossary.js)', licence: 'copied word for word, linked' },
  'binbaz.org.sa': { name: 'Official site of Sheikh Ibn Baz', ar: 'موقع الشيخ ابن باز', ref: 'S20', role: 'published fatwas, verbatim with link (level D: Mishkat never rules); referral link', licence: 'public site, attribution + link' },
  'files.zadapps.info': { name: 'Audio files of binbaz.org.sa', ar: 'ملفات صوتية لموقع الشيخ ابن باز', ref: 'S20', role: "the Sheikh's recorded answer, streamed in the fatwa card", licence: 'streamed, not stored' },
  'hadeethenc.com': { name: 'HadeethEnc — Encyclopedia of Translated Prophetic Hadiths', ar: 'موسوعة الأحاديث النبوية المترجمة', ref: 'S21', role: 'Sunnah section (verbatim hadiths with grade); links', licence: 'free project, public API, attribution' },
  'api.cloudflare.com': { name: 'Cloudflare Workers AI (bge-m3)', ar: 'نموذج المتجهات الدلالية', ref: 'S22', role: 'meaning vectors of verses (build) and questions (live)', licence: 'model MIT; Workers AI terms' },
  'assets.local': { name: 'Static files of the site (internal)', ar: 'ملفات الموقع', ref: '—', role: 'the API function reads the verse vectors from the site itself', licence: '—' },
  'gitlab.com': { name: "Qur'an QA 2023 (bigIR)", ar: 'مسابقة أسئلة القرآن 2023', ref: 'S23', role: 'public benchmark for evaluation only (downloaded, not shipped)', licence: 'CC BY-NC-ND 4.0' },
  'openrouter.ai': { name: 'OpenRouter (paid, pay per token)', ar: 'مزوّد الذكاء الاصطناعي المدفوع', ref: 'TOOLS', role: 'primary LLM provider for expansion, closed-list selection and relevance filters', licence: 'OpenRouter terms; open-weight models' },
  'alifta.gov.sa': { name: 'General Presidency of Scholarly Research and Ifta', ar: 'الرئاسة العامة للبحوث العلمية والإفتاء', ref: '—', role: 'fatwa referral link (level D questions: no ruling given)', licence: 'link only, not ingested' },
  'api.groq.com': { name: 'Groq API (OpenAI-compatible)', ar: 'Groq', ref: 'TOOLS.md', role: 'LLM chat completions (intent, retrieval keywords, closed-list selection), Whisper speech-to-text, Orpheus text-to-speech — server side only, key never sent to the browser', licence: 'Groq terms, free tier; open-weight model licences' },
  'llm.chutes.ai': { name: 'Chutes (optional endpoint)', ar: 'Chutes', ref: 'TOOLS.md', role: 'optional OpenAI-compatible PRIMARY_URL example (comment); used only if PRIMARY_URL/KEY/MODELS are set', licence: 'provider terms' },
  'nodejs.org': { name: 'Node.js', ar: 'Node.js', ref: 'TOOLS.md', role: 'download link in the offline PC bundle instructions', licence: 'MIT' },
  'www.w3.org': { name: 'W3C SVG namespace', ar: 'فضاء أسماء SVG', ref: '—', role: 'xmlns attribute of the Mishkat lamp SVG (public/js/lamp.js, img/logo.svg) — an identifier, never fetched', licence: '—' },
  'api.stackexchange.com': { name: 'Stack Exchange API (Islam Stack Exchange)', ar: 'Islam Stack Exchange', ref: 'eval', role: 'evaluation only: public question titles for eval/forum_questions.json (eval/collect_forum.py); never used by the app', licence: 'CC BY-SA 4.0 — titles only, no user names or bodies' },
  'islamicaich.org': { name: 'Islamic AI Challenge', ar: 'تحدي الذكاء الاصطناعي الإسلامي', ref: 'pack', role: 'challenge organiser / reference pack', licence: 'link only' },
  'api.aladhan.com': { name: 'Aladhan API v1', ar: 'مواقيت الصلاة — Aladhan', ref: 'S27', role: 'prayer times called by the browser (month cached locally); method and authority shown; the holidays field is never used', licence: 'free public API' },
  'www.ncei.noaa.gov': { name: 'NOAA NCEI — World Magnetic Model', ar: 'النموذج المغناطيسي العالمي WMM2025', ref: 'S34', role: 'source of the WMM2025 coefficients copied into public/js/geomag.js (cited in a comment, never called by the page)', licence: 'U.S. Government work, public domain' },
  'aladhan.com': { name: 'Aladhan', ar: 'Aladhan', ref: 'S27', role: 'link to the calculation methods of the prayer-time service', licence: 'public site' },
  'overpass-api.de': { name: 'Overpass API (OpenStreetMap)', ar: 'خريطة الشارع المفتوحة', ref: 'S28', role: 'nearby mosques: called by Mishkat’s server /api/mosques (place rounded to ~100 m, not stored, identified User-Agent), mirrors tried two at a time', licence: 'ODbL data, OSM usage policy' },
  'z.overpass-api.de': { name: 'Overpass API (z. instance)', ar: 'خريطة الشارع المفتوحة', ref: 'S28', role: 'first mirror of /api/mosques; the browser’s fallback if Mishkat’s server cannot answer', licence: 'ODbL data, OSM usage policy' },
  'lz4.overpass-api.de': { name: 'Overpass API (lz4 instance)', ar: 'خريطة الشارع المفتوحة', ref: 'S28', role: 'second mirror of /api/mosques', licence: 'ODbL data, OSM usage policy' },
  'overpass.private.coffee': { name: 'Overpass mirror (private.coffee)', ar: 'خريطة الشارع المفتوحة', ref: 'S28', role: 'last mirror of /api/mosques', licence: 'ODbL data' },
  'maps.google.com': { name: 'Google Maps (embed)', ar: 'خرائط Google', ref: 'S28', role: 'the map of the nearby mosques inside the panel (iframe, no key; allowed by the CSP frame-src)', licence: 'Google Maps terms' },
  'github.com': { name: 'GitHub', ar: 'غيت هب', ref: '—', role: 'links to the public source code and to open data projects (no call at run time)', licence: '—' },
  'mishkatquran.org': { name: 'Mishkat (own domain, Cloudflare Pages)', ar: 'مشكاة', ref: '—', role: 'the site itself (canonical address, share card, www redirect)', licence: 'All Rights Reserved' },
  'mishkat-4m1.pages.dev': { name: 'Mishkat (Cloudflare Pages)', ar: 'مشكاة', ref: '—', role: 'the site itself (named in the User-Agent of server calls and in links)', licence: '—' },
  'overpass.kumi.systems': { name: 'Overpass mirror (kumi.systems)', ar: 'خريطة الشارع المفتوحة', ref: 'S28', role: 'mirror of Overpass when the main instance is busy', licence: 'ODbL data' },
  'nominatim.openstreetmap.org': { name: 'Nominatim (OpenStreetMap)', ar: 'خريطة الشارع المفتوحة', ref: 'S28', role: 'city search for prayer / qibla / mosques', licence: 'ODbL data, Nominatim usage policy' },
  'www.openstreetmap.org': { name: 'OpenStreetMap', ar: 'خريطة الشارع المفتوحة', ref: 'S28', role: 'attribution link of the mosque map', licence: 'ODbL' },
  'www.geonames.org': { name: 'GeoNames', ar: 'GeoNames', ref: 'S29', role: 'build: cities15000 → public/data/places.json (country → city picker); attribution link', licence: 'CC BY 4.0' },
  'www.hisnmuslim.com': { name: 'Hisn al-Muslim API', ar: 'حصن المسلم', ref: 'S26', role: 'build: adhkar ar/en + audio; each dhikr kept only with a Dorar صحيح/حسن verdict', licence: 'public API' },
  'commons.wikimedia.org': { name: 'Wikimedia Commons', ar: 'ويكيميديا كومنز', ref: 'S30', role: 'source of the optional adhan recording (public/audio/adhan.mp3)', licence: 'CC BY-SA 4.0' },
  'www.google.com': { name: 'Google Maps (links)', ar: 'خرائط Google', ref: 'S28', role: 'links that open the nearby mosques in Google Maps (no API call, nothing sent by Mishkat)', licence: 'link only' },
  'dawa.center': { name: 'Digital Da‘wah Repository', ar: 'المستودع الدعوي الرقمي', ref: 'reference pack', role: 'useful links panel', licence: 'link only' },
  'findahelpline.com': { name: 'Find A Helpline', ar: 'Find A Helpline', ref: 'crisis route', role: 'link shown first to a visitor in crisis', licence: 'link only' },
  'qurancomplex.gov.sa': { name: 'King Fahd Glorious Quran Printing Complex', ar: 'مجمع الملك فهد لطباعة المصحف الشريف', ref: 'S2', role: 'publisher of At-Tafsir Al-Muyassar; attribution link', licence: 'link only' },
  'shamela.ws': { name: 'Al-Maktaba Ash-Shamila', ar: 'المكتبة الشاملة', ref: 'reference pack', role: 'useful links panel (no public API, not ingested)', licence: 'link only' },
  'quranpedia': { name: 'Quranpedia (short form in code comments)', ar: 'قرآنبيديا', ref: 'S11–S13', role: 'same as quranpedia.net', licence: 'see S11' },
};
const PLACEHOLDER = (h) => /[${}<>]/.test(h) || ['x', 'localhost', '127.0.0.1', '0.0.0.0', 'example.com'].includes(h);
const SCAN_SCOPES = [
  [/^public\/js\//, 'app (browser)'], [/^public\/(index\.html|_headers)$/, 'app (browser)'], [/^public\/css\//, 'app (browser)'],
  [/^functions\//, 'server (Functions)'], [/^server\.mjs$/, 'server (local)'],
  [/^data_build\/(?!cache\/)[^/]+$/, 'data build'], [/^eval\/[^/]+\.(mjs|js|py)$/, 'evaluation'], [/^wrangler\.toml$/, 'hosting'],
];
const scopeOf = (f) => (SCAN_SCOPES.find(([re]) => re.test(f)) || [])[1];
const URL_RE = /https?:\/\/(?:[^\s'"`<>()[\]\\|^{}$]|\$?\{[^}\s]*\})+/g;

function usageOf(line, idx, f) {
  const before = line.slice(0, idx);
  if (f.endsWith('_headers') || /Content-Security-Policy|src '/.test(line)) return 'CSP allow-list';
  if (/(^|[^:'"`])\/\/|^\s*(#|\*|\/\*)/.test(before) && !/['"`]\s*$/.test(before)) return 'comment';
  if (/href|<a\s|window\.open|\bmore:/.test(line)) return 'link';
  if (/\b(fetch|fetchImpl|get_json|urlopen|requests\.(get|post)|S\.get|session\.get)\s*\(|\|\|\s*['"`]https?:|\b[A-Z_]*BASE\s*=|\burl\s*=\s*f?['"`]https?:|url:\s*['"`]https?:\/\/api\./.test(line)) return 'call';
  return f.startsWith('public/') ? 'link' : 'reference'; // browser code only displays links (its only fetches are same-origin /api and the audio base)
}

const occurrences = []; // { host, url, file, line, scope, usage }
for (const f of ALL_REL) {
  const scope = scopeOf(f);
  if (!scope || f.startsWith('tools/')) continue;
  const src = readText(R(f));
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(URL_RE)) {
      const url = m[0].replace(/[.,;:]+$/, '');
      const host = url.replace(/^https?:\/\//, '').split(/[/?#:]/)[0].toLowerCase();
      occurrences.push({ host, url, file: f, line: i + 1, scope, usage: usageOf(line, m.index, f) });
    }
  });
}
const hostGroups = new Map();
for (const o of occurrences) {
  const key = PLACEHOLDER(o.host) ? '(local / placeholder)' : o.host;
  if (!hostGroups.has(key)) hostGroups.set(key, []);
  hostGroups.get(key).push(o);
}
const hostOrder = [...hostGroups.keys()].sort((a, b) => (a.startsWith('(') - b.startsWith('(')) || ((!!HOSTS[b]) - (!!HOSTS[a])) || hostGroups.get(b).length - hostGroups.get(a).length || a.localeCompare(b));
const unclassified = hostOrder.filter(h => !h.startsWith('(') && !HOSTS[h]);
const usageSummary = (list) => Object.entries(list.reduce((a, o) => (a[o.usage] = (a[o.usage] || 0) + 1, a), {})).map(([k, v]) => `${k} ×${v}`).join(', ');

// live tafsir books served through /api/tafsir (TAFSIR_BOOKS in functions/_lib/sources.js)
const VIA_HOST = { quranpedia: 'api.quranpedia.net', qurancom: 'api.quran.com' };
const tafsirBooks = [];
if (exists('functions', '_lib', 'sources.js')) {
  const s = readText(R('functions', '_lib', 'sources.js'));
  for (const m of s.matchAll(/^\s*(\w+):\s*\{\s*via:\s*'(\w+)',\s*ref:\s*(\d+),\s*lang:\s*'(\w+)',\s*short:\s*'([^']*)',\s*name:\s*'([^']*)',\s*author:\s*'([^']*)',\s*died:\s*(\d+)/gm))
    tafsirBooks.push([m[1], `${m[6]} (${m[5]})`, m[7], `${m[8]} AH`, m[4], VIA_HOST[m[2]] || m[2], `book/tafsir id ${m[3]}`, `functions/_lib/sources.js:${lineOf(s, m.index + m[0].indexOf(m[1]))}`]);
}

// CSP: which external origins the browser may contact at all
const cspSrc = exists('functions', '_lib', 'csp.js') ? readText(R('functions', '_lib', 'csp.js')) : '';
const cspLine = (cspSrc.match(/Content-Security-Policy["']?\s*:\s*(["'])((?:(?!\1).)+)\1/) || [])[2] || '';
const cspDirectives = cspLine.split(';').map(s => s.trim()).filter(Boolean).map(s => { const [k, ...v] = s.split(/\s+/); return [k, v]; });
const cspExternal = cspDirectives.map(([k, v]) => [k, v.filter(x => /^https?:/.test(x))]).filter(([, v]) => v.length);

// ------------------------------------------------------------------ 2. internal API endpoints
const guardSrc = exists('functions', '_lib', 'guard.js') ? readText(R('functions', '_lib', 'guard.js')) : '';
const LIMITS = {};
{
  const body = (guardSrc.match(/export\s+const\s+LIMITS\s*=\s*\{([^}]*)\}/) || [])[1] || '';
  for (const m of body.matchAll(/(\w+)\s*:\s*([\d\s*+]+)/g)) LIMITS[m[1]] = m[2].trim().split('*').reduce((a, x) => a * +x.trim(), 1);
}
const windowMs = +((guardSrc.match(/windowMs\s*=\s*(\d+)/) || [])[1] || 60000);
const handlerSrc = exists('functions', '_lib', 'handler.js') ? readText(R('functions', '_lib', 'handler.js')) : '';
const handlerDefault = +((handlerSrc.match(/LIMITS\[name\]\s*\|\|\s*(\d+)/) || [])[1] || NaN);

// top-level blocks of a JS module (for a small call graph: which external hosts a route can reach)
const moduleCache = new Map();
function jsModule(f) {
  if (moduleCache.has(f)) return moduleCache.get(f);
  const src = exists(f) ? readText(R(f)) : '';
  const lines = src.split('\n'), blocks = new Map(), imports = new Map();
  let cur = null;
  lines.forEach((line) => {
    const m = line.match(/^(?:export\s+)?(?:async\s+)?function\s*\*?\s*(\w+)|^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/);
    if (m) { cur = m[1] || m[2]; blocks.set(cur, ''); }
    if (cur) blocks.set(cur, blocks.get(cur) + line + '\n');
    const im = line.match(/^import\s*\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/);
    if (im) {
      const target = rel(join(R(f), '..', im[2]));
      for (const n of im[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) imports.set(n, target);
    }
  });
  const mod = { src, blocks, imports };
  moduleCache.set(f, mod);
  return mod;
}
function reach(f, name, seen = new Set()) {
  const out = { hosts: new Set(), envUrls: new Set(), fetches: false };
  const key = f + '#' + name;
  if (seen.has(key)) return out;
  seen.add(key);
  const mod = jsModule(f);
  const text = mod.blocks.get(name);
  if (text == null) { if (mod.imports.has(name)) return reach(mod.imports.get(name), name, seen); return out; }
  const codeOnly = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
  if (/\b(fetch|fetchImpl)\s*\(/.test(codeOnly)) out.fetches = true;
  for (const m of codeOnly.matchAll(URL_RE)) { const h = m[0].replace(/^https?:\/\//, '').split(/[/?#:]/)[0]; if (!PLACEHOLDER(h)) out.hosts.add(h); }
  for (const m of codeOnly.matchAll(/env\.([A-Z_]*URL)\b/g)) out.envUrls.add(m[1]);
  for (const other of new Set([...mod.blocks.keys(), ...mod.imports.keys()])) {
    if (other === name || !new RegExp(`\\b${other}\\b`).test(text)) continue;
    const sub = reach(mod.blocks.has(other) ? f : mod.imports.get(other), other, seen);
    sub.hosts.forEach(h => out.hosts.add(h)); sub.envUrls.forEach(h => out.envUrls.add(h)); if (sub.fetches) out.fetches = true;
  }
  return out;
}

const serverSrc = exists('server.mjs') ? readText(R('server.mjs')) : '';
const serverRoutes = new Set(((serverSrc.match(/\[((?:\s*'[a-z]+'\s*,?)+)\]\.includes\(name\)/) || [])[1] || '').match(/[a-z]+/g) || []);
for (const m of serverSrc.matchAll(/pathname\s*===\s*'\/api\/(\w+)'/g)) serverRoutes.add(m[1]);
const callers = {};
for (const f of ALL_REL.filter(f => /^public\/js\/.*\.js$/.test(f))) {
  readText(R(f)).split('\n').forEach((line, i) => { for (const m of line.matchAll(/['"`]\/?api\/(\w+)['"`]/g)) (callers[m[1]] ||= []).push(`${f}:${i + 1}`); });
}
const endpoints = [];
for (const f of ALL_REL.filter(f => /^functions\/api\/[^/]+\.js$/.test(f))) {
  const src = readText(R(f));
  const name = basename(f, '.js');
  const methods = uniq([...src.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+onRequest(Get|Post|Put|Delete|Patch)?\b/g)].map(m => (m[1] || 'ANY').toUpperCase()));
  const mh = src.match(/makeHandler\(\s*(\w+)\s*,\s*['"](\w+)['"]\s*\)/);
  const libFns = [];
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"](\.\.\/_lib\/[^'"]+)['"]/g)) {
    const lib = rel(join(R(f), '..', m[2]));
    if (/guard\.js|handler\.js/.test(lib)) continue;
    for (const n of m[1].split(',').map(s => s.trim()).filter(Boolean)) if (new RegExp(`\\b${n}\\s*\\(`).test(src) || (mh && mh[1] === n)) libFns.push([lib, n]);
  }
  const hosts = new Set(), envUrls = new Set();
  for (const [lib, n] of libFns) { const r = reach(lib, n); if (!r.fetches) continue; r.hosts.forEach(h => hosts.add(h)); r.envUrls.forEach(h => envUrls.add(h)); }
  const usesLimit = mh || /rateLimited\(/.test(src);
  const limitKey = mh ? mh[2] : (src.match(/rateLimited\([^,]+,\s*'(\w+)'/) || [])[1];
  const rate = !usesLimit ? 'none' : LIMITS[limitKey] != null ? `${LIMITS[limitKey]} / ${windowMs / 1000} s per IP` : `${handlerDefault} / ${windowMs / 1000} s per IP (default)`;
  let size = '—';
  if (mh) size = fmtBytes(LIMITS.maxJsonBytes);
  else { const lm = src.match(/LIMITS\.(max\w+)/); const nm = src.match(/>\s*(\d{3,})\)/); if (lm) size = fmtBytes(LIMITS[lm[1]]); else if (nm) size = fmtBytes(+nm[1]); }
  const sameOrigin = /foreignOrigin\(/.test(src) || (mh && /foreignOrigin\(/.test(handlerSrc));
  endpoints.push({
    route: `/api/${name}`, methods, file: f, fn: libFns.map(([l, n]) => `${n} (${l})`).join(', ') || '—',
    rate, size, sameOrigin: sameOrigin ? 'yes' : 'no', edgeCache: mh || /caches\.default/.test(src) ? 'yes' : 'no',
    external: [...hosts].sort(), envUrls: [...envUrls].sort(), local: serverRoutes.has(name) ? 'yes' : 'NO', callers: callers[name] || [],
  });
}
const serverOnly = [...serverRoutes].filter(n => !endpoints.some(e => e.route === `/api/${n}`));

// ------------------------------------------------------------------ 3. AI models
const selSrc = exists('functions', '_lib', 'selector.js') ? readText(R('functions', '_lib', 'selector.js')) : '';
const ttsSrc = exists('functions', '_lib', 'tts.js') ? readText(R('functions', '_lib', 'tts.js')) : '';
const where = (src, needle, f) => { const i = src.indexOf(needle); return i < 0 ? f : `${f}:${lineOf(src, i)}`; };
const models = [];
{
  const m = selSrc.match(/export\s+const\s+DEFAULT_MODELS\s*=\s*\[([^\]]*)\]/);
  const ids = m ? [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]) : [];
  ids.forEach((id, i) => models.push({ id, kind: 'LLM (chat, JSON mode)', provider: 'Groq', order: i === 0 ? 'primary' : `fallback ${i}`, allowed: 'selection only — intent label, retrieval keywords (never displayed), verse ids and tafsir-sentence ids taken from CLOSED numbered lists; every output validated on the server and again in the browser', override: 'GROQ_MODELS · PRIMARY_MODELS · FALLBACK_MODEL', at: where(selSrc, 'DEFAULT_MODELS', 'functions/_lib/selector.js') }));
  const stt = selSrc.match(/env\.STT_MODEL\s*\|\|\s*['"]([^'"]+)['"]/);
  if (stt) models.push({ id: stt[1], kind: 'speech-to-text', provider: 'Groq', order: '—', allowed: 'transcription only — turns the visitor’s spoken query into text, shown and editable before searching', override: 'STT_MODEL · STT_URL · STT_KEY', at: where(selSrc, stt[0], 'functions/_lib/selector.js') });
  const tb = ttsSrc.match(/export\s+const\s+TTS_MODELS\s*=\s*\{([\s\S]*?)\n\};/);
  if (tb) for (const x of tb[1].matchAll(/(\w+)\s*:\s*\{\s*model\s*:\s*['"]([^'"]+)['"]/g)) models.push({ id: x[2], kind: `text-to-speech (${x[1]})`, provider: 'Groq', order: '—', allowed: 'reading aloud only — a verbatim tafsir passage already on screen (≤ 200 characters per request); writes nothing', override: `TTS_MODEL_${x[1].toUpperCase()} · TTS_URL · TTS_KEY`, at: where(ttsSrc, `model: '${x[2]}'`, 'functions/_lib/tts.js') });
}
const MODEL_RE = /['",]\s*((?:openai|qwen|canopylabs|meta-llama|moonshotai|deepseek|google|mistralai)\/[\w.\-]+|whisper-[\w.\-]+|allam-[\w.\-]+|llama-[\w.\-]+)/gi;
const otherModels = new Map();
for (const f of ALL_REL.filter(f => /\.(m?js|py)$/.test(f) && !f.startsWith('tools/') && !f.startsWith('public/vendor/'))) {
  readText(R(f)).split('\n').forEach((line, i) => {
    for (const m of line.matchAll(MODEL_RE)) {
      if (models.some(x => x.id === m[1])) continue;
      (otherModels.get(m[1]) || otherModels.set(m[1], []).get(m[1])).push(`${f}:${i + 1}`);
    }
  });
}
const ruleEvidence = [];
for (const f of ALL_REL.filter(f => /^(functions|public\/js)\/.*\.js$/.test(f) || f === 'README.md')) {
  readText(R(f)).split('\n').forEach((line, i) => {
    if (/never writes|NEVER write|writes nothing|never writes a verse|never produced or chosen by the machine|ne\s+l?écrit rien|لا يكتب النموذج/i.test(line))
      ruleEvidence.push([`${f}:${i + 1}`, line.trim().replace(/^(\/\/|\*|#)\s*/, '').slice(0, 220)]);
  });
}

// ------------------------------------------------------------------ 4. data files
const buildInfo = exists('public', 'data', 'build_info.json') ? JSON.parse(readText(R('public', 'data', 'build_info.json'))) : {};
const BUILD_SCRIPTS = ALL_REL.filter(f => /^(data_build\/[^/]+\.py|eval\/[^/]+\.(mjs|py))$/.test(f));
const buildSrc = Object.fromEntries(BUILD_SCRIPTS.map(f => [f, readText(R(f))]));
const docDescr = {};
for (const src of Object.values(buildSrc)) for (const m of src.matchAll(/^\s{2,}([\w.<>\-]+\.(?:json|bin))\s{2,}(.+)$/gm)) docDescr[m[1]] ||= m[2].trim();
const DATA_SOURCES = [
  [/^tafsir_muyassar_ar\.json$/, 'QuranEnc (S2) — At-Tafsir Al-Muyassar, arabic_moyassar'],
  [/^tafsir_mukhtasar_(ar|en|fr)\.json$/, 'QuranEnc (S3) — Al-Mukhtasar fi Tafsir al-Quran, *_mokhtasar'],
  [/^tafsir_saheeh_en\.json$/, 'QuranEnc (S4) — Noor International translation, english_saheeh'],
  [/^tafsir_rashid_fr\.json$/, 'QuranEnc (S5) — Rachid Maach translation, french_rashid'],
  [/^tafsir_/, 'QuranEnc / Quran.com tafsir'],
  [/^saadi\/?$/, 'Quran.com API v4 (S6) — Tafsir As-Sa‘di (tafsir 91), one file per surah'],
  [/^timing\/?$/, 'Quran.com API v4 (S9) — recitation 7 (Alafasy) word-timing segments'],
  [/^translit\/?$/, 'Quran.com API v4 — word-by-word transliteration'],
  [/^qp_topics\.json$/, 'Quranpedia official dump (S11) — topics-index.json.gz'],
  [/^qp_surahs\.json$/, 'Quranpedia official dump (S12) — surahs.json.gz'],
  [/^qp_/, 'Quranpedia exports'],
  [/^bayenat_index\.json$/, 'bayenat.net (S15) — question titles + URLs only'],
  [/^(galaxy\.bin|words\.json)$/, 'Tanzil (S1) + Quran Cartography baseline (S10, quran.db) — build_data.py'],
  [/^core\.json$/, 'Tanzil (S1, byte-exact verse text) + Quran.com chapter names (S8) — build_data.py'],
  [/^search_ar\.json$/, 'Quran.com imla’i script (S7) — search index only, never displayed — build_data.py'],
  [/^llm_cache\.json$/, 'pre-computed LLM selections (ids/keywords only, re-verified by the engine) — eval/precompute_cache.mjs'],
  [/^build_info\.json$/, 'build metadata (hashes, counts, source versions) — build_data.py'],
];
const sourceOf = (name) => (DATA_SOURCES.find(([re]) => re.test(name)) || [, 'unmapped'])[1];
const writtenBy = (name) => {
  let hits = BUILD_SCRIPTS.filter(f => buildSrc[f].includes(`'${name}'`) || buildSrc[f].includes(`"${name}"`) || buildSrc[f].includes(`/${name}`));
  if (!hits.length) { const stem = name.replace(/\.[^.]+$/, ''); const pre = stem.split('_')[0]; hits = BUILD_SCRIPTS.filter(f => new RegExp(`['"/]${stem}['"/]|['"]${pre}_|f['"]${pre}_`).test(buildSrc[f])); }
  return hits.join(', ') || '—';
};
const dataTop = [], dataDirs = [];
if (exists('public', 'data')) {
  for (const name of readdirSync(R('public', 'data')).sort()) {
    const p = R('public', 'data', name), st = statSync(p);
    if (st.isDirectory()) {
      const files = walk(p);
      const lines = files.map(x => `${rel(x).slice(`public/data/${name}/`.length)} ${sha256(readBuf(x))}`).sort();
      dataDirs.push({ name: name + '/', count: files.length, bytes: files.reduce((a, x) => a + statSync(x).size, 0), tree: sha256(lines.join('\n')), source: sourceOf(name), by: writtenBy(name), git: gitCell(`public/data/${name}/${basename(files[0] || '')}`) });
    } else {
      const h = sha256(readBuf(p));
      const bi = buildInfo.files && buildInfo.files[name];
      dataTop.push({ name, bytes: st.size, sha: h, match: bi ? (bi[0] === h ? 'matches' : 'DIFFERS') : '—', source: sourceOf(name), by: writtenBy(name), descr: docDescr[name] || docDescr[name.replace(/^tafsir_.*/, 'tafsir_<k>.json')] || '', git: gitCell(`public/data/${name}`), status: statusCell(`public/data/${name}`) });
    }
  }
}
// download manifests (data_build/cache/**manifest*)
const manifests = [];
for (const f of ALL_REL.filter(f => /^data_build\/cache\/.*manifest[^/]*\.json$/i.test(f))) {
  const j = JSON.parse(readText(R(f)));
  const dir = f.replace(/[^/]+$/, '');
  if (Array.isArray(j.files)) { // upstream dump manifest (e.g. Quranpedia): keep the entries we actually hold
    const local = new Set(ALL_REL.filter(x => x.startsWith(dir)).map(x => x.slice(dir.length)));
    const rows = j.files.filter(e => local.has(e.name)).map(e => {
      const h = sha256(readBuf(R(dir + e.name)));
      return [e.name, e.title || e.dataset || '', fmtBytes(e.bytes), (e.sha256 || '').slice(0, 16) + '…', e.sha256 ? (e.sha256 === h ? 'matches' : 'DIFFERS') : '—', e.built_at || ''];
    });
    const unlisted = [...local].filter(n => !j.files.some(e => e.name === n) && !/manifest|LICENSE/i.test(n));
    manifests.push({ f, kind: 'upstream', meta: { version: j.version, generated_at: j.generated_at, source: j.source, attribution: j.license && j.license.attribution, files: j.files.length }, rows, unlisted, tracked: !!LAST_COMMIT.get(f) });
  } else {
    const rows = Object.entries(j).map(([name, e]) => {
      const p = dir + name;
      const h = ALL_REL.includes(p) ? sha256(readBuf(R(p))) : null;
      return [name, e.url || '', fmtBytes(e.bytes), (e.sha256 || '').slice(0, 16) + '…', h ? (h === e.sha256 ? 'matches' : 'DIFFERS') : 'not present locally', e.fetched || ''];
    });
    manifests.push({ f, kind: 'downloads', rows, tracked: !!LAST_COMMIT.get(f) });
  }
}
const tanzil = exists('data_build', 'quran-uthmani.txt') ? sha256(readBuf(R('data_build', 'quran-uthmani.txt'))) : null;

// ------------------------------------------------------------------ 5. code inventory
const code = [];
for (const f of ALL_REL) {
  const ext = extname(f);
  if (!CODE_EXT.has(ext) || /^(public\/vendor|data_build\/cache)\//.test(f) || f === 'docs/traceability.html') continue;
  const src = readText(R(f));
  const lines = src.split('\n');
  const total = src.endsWith('\n') ? lines.length - 1 : lines.length;
  const loc = lines.filter(l => l.trim()).length;
  let exports = [];
  if (ext === '.js' || ext === '.mjs') {
    for (const m of src.matchAll(/^export\s+(?:default\s+)?(?:async\s+)?(?:function\s*\*?\s*(\w+)|(?:const|let|var|class)\s+(\w+))/gm)) exports.push(m[1] || m[2]);
    for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) exports.push(...m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()).filter(Boolean));
  } else if (ext === '.py') {
    for (const m of src.matchAll(/^def\s+([A-Za-z]\w*)/gm)) exports.push(m[1] + '()');
  }
  const segs = f.split('/');
  const area = segs.length === 1 ? '(root)' : segs.slice(0, (f.startsWith('public/') || f.startsWith('functions/')) && segs.length > 2 ? 2 : 1).join('/');
  code.push({ f, area, lang: LANG[ext], total, loc, exports: uniq(exports), git: gitCell(f), status: statusCell(f) });
}
const areaTotals = Object.entries(code.reduce((a, c) => { const x = a[c.area] ||= { files: 0, loc: 0 }; x.files++; x.loc += c.loc; return a; }, {}));

// ------------------------------------------------------------------ 6. tools & libraries
const tools = [];
{
  const three = 'public/vendor/three/three.module.min.js';
  if (exists(three)) {
    const s = readText(R(three));
    const rev = (s.match(/REVISION\s*=\s*["'](\d+)["']/) || s.match(/const \w+="(\d+)",\w+=\{LEFT:0/) || [])[1];
    const licLine = exists('public', 'vendor', 'three', 'LICENSE') ? readText(R('public', 'vendor', 'three', 'LICENSE')).split('\n').find(l => l.trim()) : '';
    const spdx = (s.match(/SPDX-License-Identifier:\s*([\w.-]+)/) || [])[1];
    tools.push(['three.js', rev ? `r${rev} (0.${rev}.0)` : '?', 'WebGL galaxy and 3D views (vendored, no CDN)', spdx || licLine.trim(), `${three} · ${fmtBytes(statSync(R(three)).size)} · sha256 ${sha256(readBuf(R(three))).slice(0, 16)}…`]);
    for (const a of ALL_REL.filter(f => f.startsWith('public/vendor/three/addons/'))) tools.push([`three.js addon ${basename(a, '.js')}`, rev ? `r${rev}` : '?', 'camera controls', spdx || 'MIT', `${a} · sha256 ${sha256(readBuf(R(a))).slice(0, 16)}…`]);
  }
  if (exists('public', 'fonts', 'fonts.css')) {
    const css = readText(R('public', 'fonts', 'fonts.css'));
    const lic = exists('public', 'fonts', 'LICENSE-FONTS.txt') ? readText(R('public', 'fonts', 'LICENSE-FONTS.txt')).split('\n') : [];
    const fam = {};
    for (const b of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
      const name = (b[1].match(/font-family:\s*['"]?([^'";]+)/) || [])[1], w = (b[1].match(/font-weight:\s*(\d+)/) || [])[1], file = (b[1].match(/url\(([^)]+)\)/) || [])[1];
      if (!name) continue;
      const x = fam[name] ||= { w: new Set(), files: new Set() }; x.w.add(w); x.files.add(file);
    }
    for (const [name, x] of Object.entries(fam)) {
      const files = [...x.files].filter(Boolean);
      const bytes = files.reduce((a, fl) => a + (exists('public', 'fonts', fl) ? statSync(R('public', 'fonts', fl)).size : 0), 0);
      const l = lic.find(line => line.includes(name) && /Licen/i.test(line)) || lic.find(line => line.includes(name.split(' ')[0]) && /Licen/i.test(line)) || '';
      tools.push([`font: ${name}`, `weights ${[...x.w].sort().join(', ')}`, 'typography (self-hosted, CSP font-src self)', (l.match(/SIL Open Font License [\d.]+|OFL[\d. ]*/) || ['see LICENSE-FONTS.txt'])[0], `${files.length} woff2 · ${fmtBytes(bytes)} · public/fonts/`]);
    }
  }
  const pkg = exists('package.json') ? JSON.parse(readText(R('package.json'))) : {};
  tools.push(['Node.js', (pkg.engines && pkg.engines.node) || '?', `runtime for tests, evaluation, local server, this tool (generated with ${process.version})`, 'MIT', `package.json engines · npm dependencies: ${Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }).length || 'none'}`]);
  for (const [k, v] of Object.entries(pkg.scripts || {})) tools.push([`npm run ${k}`, '—', 'project script', '—', v]);
  if (exists('wrangler.toml')) {
    const kv = Object.fromEntries([...readText(R('wrangler.toml')).matchAll(/^(\w+)\s*=\s*"([^"]*)"/gm)].map(m => [m[1], m[2]]));
    tools.push(['Cloudflare Pages + Pages Functions', `compatibility_date ${kv.compatibility_date || '?'}`, `hosting of ${kv.pages_build_output_dir || '?'}/ + serverless /api (project “${kv.name || '?'}”)`, 'Cloudflare terms', 'wrangler.toml']);
  }
  // Python scripts and their third-party imports
  const STD = new Set('argparse base64 collections csv datetime functools glob gzip hashlib html io itertools json math os pathlib random re shutil sqlite3 struct subprocess sys time typing unicodedata urllib zipfile textwrap string statistics copy tempfile __future__ dataclasses'.split(' '));
  // pip names of imports whose module name differs, and modules that live outside this repository
  const PY_PKG = { fitz: 'PyMuPDF (fitz)', pptx: 'python-pptx', color_excel_build: 'color_excel_build (Quran Cartography baseline module, outside this repo)' };
  const pyRows = [];
  for (const f of ALL_REL.filter(f => f.endsWith('.py') && !f.startsWith('data_build/cache/'))) {
    const s = readText(R(f));
    const mods = uniq([...s.matchAll(/^\s*(?:import\s+([\w.]+)|from\s+([\w.]+)\s+import)/gm)].map(m => (m[1] || m[2]).split('.')[0]));
    const third = mods.filter(m => !STD.has(m));
    const doc = ((s.match(/"""([^\n]*)/) || [])[1] || (s.split('\n').find(l => /^#\s*(?!-\*-)/.test(l)) || '').replace(/^#\s*/, '')).replace(/"""\s*$/, '');
    const pkg = (m) => PY_PKG[m] || (ALL_REL.includes(`${f.replace(/[^/]+$/, '')}${m}.py`) ? `${m} (local module)` : m);
    pyRows.push([f, doc.trim().slice(0, 140), mods.join(', '), third.map(pkg).join(', ') || '— (standard library only)']);
  }
  tools.python = pyRows;
}

// ------------------------------------------------------------------ 7. tests & evaluation
const tests = ALL_REL.filter(f => /^tests\/.*\.m?js$/.test(f)).map(f => {
  const s = readText(R(f));
  const titles = [...s.matchAll(/(?<![\w.])test\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)].map(m => m[2]);
  const count = [...s.matchAll(/(?<![\w.])test\(/g)].length;
  return { f, count, titles, loc: s.split('\n').filter(l => l.trim()).length, git: gitCell(f), status: statusCell(f) };
});
const evalScripts = ALL_REL.filter(f => /^eval\/[^/]+\.(mjs|js|py)$/.test(f)).map(f => {
  const s = readText(R(f));
  const first = (s.split('\n').find(l => /^(\/\/|#)\s*\S/.test(l) && !/-\*-|^#!/.test(l)) || (s.match(/"""([^\n]*)/) || [])[1] || '').replace(/^(\/\/|#)\s*/, '');
  return [f, first.slice(0, 160), nf(s.split('\n').filter(l => l.trim()).length), gitCell(f)];
});
const evalData = ALL_REL.filter(f => /^eval\/[^/]+\.(json|jsonl)$/.test(f)).map(f => {
  const s = readText(R(f));
  let n = '?', unit = 'entries';
  if (f.endsWith('.jsonl')) { n = s.trim().split('\n').length; unit = 'lines'; }
  else try { const j = JSON.parse(s); if (Array.isArray(j)) n = j.length; else { const arr = Object.entries(j).filter(([, v]) => Array.isArray(v)).sort((a, b) => b[1].length - a[1].length)[0]; if (arr) { n = arr[1].length; unit = `items in “${arr[0]}”`; } else n = Object.keys(j).length; } } catch (e) { /* not json */ }
  return [f, `${typeof n === 'number' ? nf(n) : n} ${unit}`, fmtBytes(Buffer.byteLength(s)), sha256(Buffer.from(s)).slice(0, 16) + '…', gitCell(f)];
});
const evalResults = ALL_REL.filter(f => f.startsWith('eval/results/')).map(f => {
  const b = readBuf(R(f));
  return [f, fmtBytes(b.length), sha256(b).slice(0, 16) + '…', gitCell(f), statusCell(f)];
});

// ------------------------------------------------------------------ assemble the document model
const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const dirty = [...STATUS.keys()].length;
const phaseCounts = ALL_COMMITS.reduce((a, c) => (a[c.phase] = (a[c.phase] || 0) + 1, a), {});
const code_ = (s) => ({ code: String(s) });
const S = []; // sections: { id, en, ar, intro: [para], blocks: [ {table|list|note} ] }

S.push({
  id: 'summary', en: 'Summary', ar: 'الملخص', intro: [
    'Every number on this page is computed from the repository by `tools/trace.mjs`; re-run it after any change. Files `.dev.vars` and `.env*` are never opened.',
  ], blocks: [{ table: { cols: ['Item', 'Count'], rows: [
    ['External hosts referenced (classified)', String(hostOrder.filter(h => HOSTS[h]).length)],
    ['External hosts unclassified', String(unclassified.length)],
    ['External URL occurrences', String(occurrences.filter(o => !PLACEHOLDER(o.host)).length)],
    ['Internal API endpoints (functions/api)', String(endpoints.length)],
    ['AI models wired in production code', String(models.length)],
    ['Data files in public/data (top level)', String(dataTop.length)],
    ['Data sub-folders (files)', dataDirs.map(d => `${d.name} ${d.count}`).join(' · ') || '0'],
    ['Data total size', fmtBytes(dataTop.reduce((a, d) => a + d.bytes, 0) + dataDirs.reduce((a, d) => a + d.bytes, 0))],
    ['Source files (js/mjs/py/html/css)', `${code.length} files · ${nf(code.reduce((a, c) => a + c.loc, 0))} non-blank lines`],
    ['Tests (`test(` calls)', `${tests.reduce((a, t) => a + t.count, 0)} in ${tests.filter(t => t.count).length} files`],
    ['Commits', `${ALL_COMMITS.length} — ${Object.entries(phaseCounts).map(([k, v]) => `${k}: ${v}`).join(' · ')}`],
    ['Uncommitted changes in the working tree', String(dirty)],
  ] } }],
});

S.push({
  id: 'external', en: 'External services & APIs', ar: 'الخدمات والواجهات الخارجية', intro: [
    'Every `http(s)://` URL in `public/js`, `public/index.html`, `public/_headers`, `functions/`, `server.mjs`, `data_build/` (scripts, not the frozen cache) and `eval/` scripts, grouped by host. Usage is a heuristic from the line: *call* (fetched by code), *link* (shown to the reader), *CSP allow-list*, *comment*, *reference*.',
    cspExternal.length ? `The browser itself may contact only these external origins (CSP in functions/_lib/csp.js): ${cspExternal.map(([k, v]) => `${k} → ${v.join(' ')}`).join('; ')}. Everything else goes through the same-origin /api.` : 'No external origin allowed by the CSP.',
  ], blocks: [
    { table: { caption: 'Hosts', cols: ['Host', 'Service', 'Ref.', 'Role in Mishkat', 'Licence / conditions', 'Usage', 'Files'], rows: hostOrder.filter(h => !h.startsWith('(')).map(h => {
      const k = HOSTS[h] || { name: 'unclassified', ar: '', ref: '—', role: 'unclassified — add it to HOSTS in tools/trace.mjs', licence: '?' };
      const list = hostGroups.get(h);
      return [code_(h), k.ar && k.ar !== k.name ? `${k.name} · ${k.ar}` : k.name, k.ref, k.role, k.licence, usageSummary(list), uniq(list.map(o => o.file)).join(', ')];
    }) } },
    { table: { caption: 'Every occurrence (file:line)', cols: ['Host', 'File:line', 'Scope', 'Usage', 'URL'], rows: occurrences.filter(o => !PLACEHOLDER(o.host)).map(o => [code_(o.host), `${o.file}:${o.line}`, o.scope, o.usage, code_(o.url.length > 140 ? o.url.slice(0, 137) + '…' : o.url)]) } },
    { table: { caption: 'Live tafsir books served through /api/tafsir (TAFSIR_BOOKS)', cols: ['Key', 'Book', 'Author', 'Died', 'Lang', 'Fetched from', 'Id', 'Defined at'], rows: tafsirBooks.map(r => [code_(r[0]), ...r.slice(1, 5), code_(r[5]), r[6], r[7]]) } },
    { note: `Local / placeholder URLs ignored (${(hostGroups.get('(local / placeholder)') || []).length}): ${uniq((hostGroups.get('(local / placeholder)') || []).map(o => `${o.file}:${o.line}`)).join(', ') || 'none'}.` },
    { note: unclassified.length ? `Unclassified hosts: ${unclassified.join(', ')}.` : 'Unclassified hosts: none — every host found is in the role table.' },
  ],
});

S.push({
  id: 'api', en: 'Internal API endpoints', ar: 'نقاط الواجهة الداخلية', intro: [
    `Routes are the files in functions/api/ (Cloudflare Pages Functions); the local server.mjs mirrors them. Rate limits are parsed from \`LIMITS\` in functions/_lib/guard.js (sliding window ${windowMs / 1000} s, per IP, per isolate). External services are found by following the route’s functions through the code (call graph inside functions/_lib).`,
  ], blocks: [
    { table: { cols: ['Route', 'Method', 'Implementation', 'Rate limit', 'Max body', 'Same-origin only', 'Edge cache', 'External services called', 'Configurable endpoints (env)', 'In server.mjs', 'Called from'], rows: endpoints.map(e => [code_(e.route), e.methods.join(', '), e.fn, e.rate, e.size, e.sameOrigin, e.edgeCache, e.external.join(', ') || 'none (no outbound request)', e.envUrls.join(', ') || '—', e.local, e.callers.join(', ') || '—']) } },
    { note: `LIMITS parsed: ${Object.entries(LIMITS).map(([k, v]) => `${k} = ${/max/.test(k) ? fmtBytes(v) : v}`).join(' · ')}.` },
    ...(serverOnly.length ? [{ note: `Routes only in server.mjs: ${serverOnly.join(', ')}.` }] : []),
  ],
});

S.push({
  id: 'models', en: 'AI models', ar: 'نماذج الذكاء الاصطناعي', intro: [
    '**Rule: the model never writes religious content.** No verse, translation, tafsir, hadith or ruling is ever produced by a model: the LLM only picks ids from closed lists (validated twice), speech-to-text only transcribes the visitor’s own query, and text-to-speech only reads a verbatim passage already on screen.',
  ], blocks: [
    { table: { caption: 'Models wired in the server code', cols: ['Model id', 'Kind', 'Provider', 'Order', 'Allowed to do', 'Env override', 'Defined at'], rows: models.map(m => [code_(m.id), m.kind, m.provider, m.order, m.allowed, m.override, m.at]) } },
    { table: { caption: 'Other model ids referenced (benchmarks, scripts)', cols: ['Model id', 'Where'], rows: [...otherModels].map(([id, w]) => [code_(id), uniq(w).join(', ')]) } },
    { table: { caption: 'Evidence of the rule in the code', cols: ['File:line', 'Text'], rows: ruleEvidence } },
  ],
});

S.push({
  id: 'data', en: 'Data files', ar: 'ملفات البيانات', intro: [
    `SHA-256 computed now; “build_info” compares with public/data/build_info.json written by the build. Tanzil source file data_build/quran-uthmani.txt: ${tanzil ? `sha256 ${tanzil}` : 'absent'}${buildInfo.tanzil_sha256 ? ` (build_info: ${buildInfo.tanzil_sha256 === tanzil ? 'matches' : 'DIFFERS — ' + buildInfo.tanzil_sha256})` : ''}.`,
  ], blocks: [
    { table: { caption: 'public/data — files', cols: ['File', 'Size', 'SHA-256', 'build_info', 'Source', 'Scripts referencing it', 'Description (build docstring)', 'Last commit', 'State'], rows: dataTop.map(d => [code_(d.name), fmtBytes(d.bytes), code_(d.sha), d.match, d.source, d.by, d.descr, d.git, d.status]) } },
    { table: { caption: 'public/data — sub-folders', cols: ['Folder', 'Files', 'Size', 'Tree SHA-256 (sorted name+hash)', 'Source', 'Scripts referencing it'], rows: dataDirs.map(d => [code_(d.name), String(d.count), fmtBytes(d.bytes), code_(d.tree), d.source, d.by]) } },
    ...manifests.map(m => m.kind === 'downloads'
      ? { table: { caption: `Download manifest ${m.f}${m.tracked ? '' : ' (not committed)'}`, cols: ['Cached file', 'Source URL', 'Size', 'SHA-256 (manifest)', 'Local copy', 'Fetched'], rows: m.rows.map(r => [code_(r[0]), code_(r[1]), r[2], code_(r[3]), r[4], r[5]]) } }
      : { table: { caption: `Upstream dump manifest ${m.f} (version ${m.meta.version}, generated ${m.meta.generated_at}, ${m.meta.files} files listed upstream; local copy kept out of git)`, cols: ['Dump held locally', 'Title', 'Size', 'SHA-256 (manifest)', 'Local copy', 'Built at'], rows: m.rows.map(r => [code_(r[0]), r[1], r[2], code_(r[3]), r[4], r[5]]) }, after: `${m.meta.attribution ? `Licence (from the manifest): ${m.meta.attribution}` : ''}${m.unlisted.length ? ` Local files not in this manifest: ${m.unlisted.join(', ')}.` : ''}` }),
  ],
});

S.push({
  id: 'code', en: 'Code inventory', ar: 'جرد الشيفرة', intro: [
    'Every js/mjs/py/html/css file outside public/vendor and the data cache. LOC = non-blank lines. “Last commit” is the last commit touching the file; “State” comes from `git status` at generation time.',
  ], blocks: [
    { table: { caption: 'By area', cols: ['Area', 'Files', 'Non-blank lines'], rows: areaTotals.map(([a, x]) => [a, String(x.files), nf(x.loc)]) } },
    { table: { caption: 'Files', cols: ['File', 'Language', 'Lines', 'LOC', 'Last commit', 'State', 'Exports (JS) / functions (Python)'], rows: code.map(c => [code_(c.f), c.lang, nf(c.total), nf(c.loc), c.git, c.status, c.exports.join(', ') || '—']) } },
  ],
});

S.push({
  id: 'tools', en: 'Tools & libraries', ar: 'الأدوات والمكتبات', intro: [
    'Vendored libraries are served from the site itself (no CDN). Versions are read from the files (three.js REVISION, fonts.css, package.json, wrangler.toml).',
  ], blocks: [
    { table: { cols: ['Component', 'Version', 'Role', 'Licence', 'Evidence'], rows: tools.map(t => t.map((x, i) => i === 4 ? code_(x) : x)) } },
    { table: { caption: 'Python scripts', cols: ['Script', 'Purpose (docstring)', 'Imports', 'Non-standard-library imports'], rows: tools.python.map(r => [code_(r[0]), r[1], r[2], r[3]]) } },
  ],
});

S.push({
  id: 'tests', en: 'Tests & evaluation', ar: 'الاختبارات والتقييم', intro: [
    `Run with \`npm test\` (node --test). Test count = number of \`test(\` calls per file.`,
  ], blocks: [
    { table: { caption: 'Test files', cols: ['File', 'Tests', 'LOC', 'Last commit', 'State', 'Test titles'], rows: tests.map(t => [code_(t.f), String(t.count), nf(t.loc), t.git, t.status, t.titles.join(' ‖ ') || '— (helper)']) } },
    { table: { caption: 'Evaluation scripts', cols: ['Script', 'Purpose (first comment)', 'LOC', 'Last commit'], rows: evalScripts.map(r => [code_(r[0]), r[1], r[2], r[3]]) } },
    { table: { caption: 'Evaluation data', cols: ['File', 'Items', 'Size', 'SHA-256', 'Last commit'], rows: evalData.map(r => [code_(r[0]), r[1], r[2], code_(r[3]), r[4]]) } },
    { table: { caption: 'Evaluation results (eval/results)', cols: ['File', 'Size', 'SHA-256', 'Last commit', 'State'], rows: evalResults.map(r => [code_(r[0]), r[1], code_(r[2]), r[3], r[4]]) } },
  ],
});

S.push({
  id: 'git', en: 'Git history', ar: 'سجل git', intro: [
    `The challenge evaluates only the work done in the build window (${WINDOW_START} → ${WINDOW_END}). Commits dated before ${WINDOW_START} are the declared baseline (see BASELINE.md). Phase uses the commit date. Showing the last ${Math.min(COMMITS_SHOWN, ALL_COMMITS.length)} of ${ALL_COMMITS.length} commits.`,
  ], blocks: [
    { table: { cols: ['Hash', 'Date', 'Time', 'Phase', 'Subject'], rows: ALL_COMMITS.slice(0, COMMITS_SHOWN).map(c => [code_(c.h), c.d, c.iso.slice(11, 19) + c.iso.slice(19), c.phase, c.subject]) } },
    ...(dirty ? [{ table: { caption: 'Uncommitted changes at generation time', cols: ['Path', 'git status'], rows: [...STATUS].map(([p, s]) => [code_(p), s]) } }] : []),
  ],
});

const META = { now, head: HEAD || 'no git', headShort: HEAD_SHORT || '—', branch: BRANCH || '—', headDate: HEAD_DATE || '—', dirty, node: process.version };

// ------------------------------------------------------------------ render: Markdown
const mdCell = (c) => {
  if (c && typeof c === 'object') { const s = String(c.code).replace(/\|/g, '\\|').replace(/\r?\n/g, ' '); return s.includes('`') ? s : '`' + s + '`'; }
  return String(c ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
};
function renderMd() {
  const o = [];
  o.push('# Mishkat — Traceability · مِشكاة — سجلّ التتبّع', '');
  o.push(`> Generated **${META.now}** by \`node tools/trace.mjs\` (Node ${META.node}) from git HEAD \`${META.head}\` (branch ${META.branch}, committed ${META.headDate})${META.dirty ? ` with **${META.dirty} uncommitted change(s)** in the working tree` : ', clean working tree'}.`);
  o.push('> Do not edit by hand: every value below is derived from the repository files. Re-run the tool to refresh it.', '');
  o.push(S.map(s => `[${s.en}](#${s.id})`).join(' · '), '');
  for (const s of S) {
    o.push(`<a id="${s.id}"></a>`, `## ${s.en} · ${s.ar}`, '');
    for (const p of s.intro) o.push(p, '');
    for (const b of s.blocks) {
      if (b.note) { o.push(`*${b.note}*`, ''); continue; }
      const t = b.table;
      if (t.caption) o.push(`**${t.caption}** (${t.rows.length})`, '');
      if (!t.rows.length) { o.push('_none_', ''); continue; }
      o.push('| ' + t.cols.join(' | ') + ' |', '|' + t.cols.map(() => '---').join('|') + '|');
      for (const r of t.rows) o.push('| ' + r.map(mdCell).join(' | ') + ' |');
      o.push('');
      if (b.after) o.push(`*${b.after.trim()}*`, '');
    }
  }
  return o.join('\n');
}

// ------------------------------------------------------------------ render: HTML (self-contained)
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
const htCell = (c) => c && typeof c === 'object' ? `<code>${esc(c.code)}</code>` : esc(c);
function renderHtml() {
  const nav = S.map(s => `<a href="#${s.id}">${esc(s.en)} <span lang="ar" dir="rtl">${esc(s.ar)}</span></a>`).join('');
  let tid = 0;
  const body = S.map(s => {
    const blocks = s.blocks.map(b => {
      if (b.note) return `<p class="note">${inline(b.note)}</p>`;
      const t = b.table; tid++;
      const head = t.caption ? `<h3>${esc(t.caption)} <span class="count" data-for="t${tid}">${t.rows.length}</span></h3>` : `<p class="tcount"><span class="count" data-for="t${tid}">${t.rows.length}</span> rows</p>`;
      if (!t.rows.length) return head + '<p class="empty">none</p>';
      const rows = t.rows.map(r => `<tr>${r.map((c, i) => `<td data-label="${esc(t.cols[i])}">${htCell(c)}</td>`).join('')}</tr>`).join('\n');
      return `${head}<div class="tw"><table id="t${tid}" data-total="${t.rows.length}"><thead><tr>${t.cols.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>\n${rows}\n</tbody></table></div>${b.after ? `<p class="note">${inline(b.after.trim())}</p>` : ''}`;
    }).join('\n');
    return `<section id="${s.id}"><h2>${esc(s.en)} <span lang="ar" dir="rtl">· ${esc(s.ar)}</span></h2>${s.intro.map(p => `<p>${inline(p)}</p>`).join('')}${blocks}</section>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:">
<meta name="generator" content="tools/trace.mjs">
<title>Mishkat Traceability</title>
<style>
:root{--bg:#faf8f3;--fg:#1d1b16;--muted:#6b665a;--card:#ffffff;--line:#e3ddcf;--accent:#8a6a1f;--code:#f1ece0;--hl:#fff3c4;--warn:#a33a1a}
@media (prefers-color-scheme: dark){:root{--bg:#121318;--fg:#e9e6dd;--muted:#a19c8f;--card:#1b1d24;--line:#30333d;--accent:#d9b45a;--code:#262833;--hl:#4a3f12;--warn:#ff8a65}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Noto Naskh Arabic","Segoe UI Arabic",Tahoma,sans-serif;overflow-wrap:anywhere}
header,main{max-width:1280px;margin:0 auto;padding:0 16px}
header{padding-top:20px}
h1{font-size:1.5rem;margin:.2em 0}
section{scroll-margin-top:96px}
h2{font-size:1.25rem;margin:1.6em 0 .4em;padding-top:.6em;border-top:2px solid var(--line);color:var(--accent)}
h3{font-size:1rem;margin:1.2em 0 .4em}
[lang=ar]{font-family:"Noto Naskh Arabic","Segoe UI Arabic","Arabic Typesetting",Tahoma,serif;unicode-bidi:isolate}
.meta{color:var(--muted);font-size:.9rem}
code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.85em;background:var(--code);padding:0 .25em;border-radius:3px;word-break:break-all}
nav{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}
nav a{color:var(--fg);text-decoration:none;border:1px solid var(--line);background:var(--card);border-radius:999px;padding:6px 12px;font-size:.85rem}
nav a:hover,nav a:focus-visible{border-color:var(--accent)}
.bar{position:sticky;top:0;z-index:2;background:var(--bg);padding:10px 0;border-bottom:1px solid var(--line)}
.bar label{display:block;font-size:.8rem;color:var(--muted);margin-bottom:4px}
.bar input{width:100%;font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg);min-height:44px}
.bar input:focus{outline:2px solid var(--accent);outline-offset:1px}
.tw{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:var(--card)}
table{border-collapse:collapse;width:100%;font-size:.85rem}
th,td{text-align:start;vertical-align:top;padding:6px 8px;border-bottom:1px solid var(--line)}
th{background:var(--code);position:sticky;top:0}
tr:last-child td{border-bottom:0}
tr.hit td{background:var(--hl)}
.count{display:inline-block;min-width:2em;text-align:center;font-size:.75rem;font-weight:600;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:0 .5em;margin-inline-start:.4em}
.tcount{margin:.6em 0 .3em;font-size:.8rem;color:var(--muted)}
.note{color:var(--muted);font-size:.88rem}
.empty{color:var(--muted);font-style:italic}
footer{max-width:1280px;margin:2em auto;padding:16px;color:var(--muted);font-size:.8rem;border-top:1px solid var(--line)}
@media (max-width:760px){
  .tw{overflow:visible;border:0;background:none}
  table,thead,tbody,tr,td{display:block;width:100%}
  thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  tr{background:var(--card);border:1px solid var(--line);border-radius:8px;margin:0 0 10px;padding:4px 0}
  td{display:grid;grid-template-columns:minmax(80px,34%) 1fr;gap:8px;border-bottom:1px dashed var(--line);padding:5px 10px}
  td:last-child{border-bottom:0}
  td::before{content:attr(data-label);font-weight:600;color:var(--muted);font-size:.78rem}
}
</style>
</head>
<body>
<header>
<h1>Mishkat — Traceability <span lang="ar" dir="rtl">· مِشكاة — سجلّ التتبّع</span></h1>
<p class="meta">Generated <strong>${esc(META.now)}</strong> by <code>node tools/trace.mjs</code> (Node ${esc(META.node)}) · git HEAD <code>${esc(META.head)}</code> (branch ${esc(META.branch)}, committed ${esc(META.headDate)}) · ${META.dirty ? `<strong>${META.dirty} uncommitted change(s)</strong>` : 'clean working tree'}. Every value is derived from the repository files — do not edit by hand.</p>
<nav aria-label="Sections">${nav}</nav>
</header>
<div class="bar"><div style="max-width:1280px;margin:0 auto;padding:0 16px"><label for="q">Filter all tables · <span lang="ar" dir="rtl">تصفية الجداول</span> <span id="qn"></span></label><input id="q" type="search" placeholder="host, file, model, hash… — e.g. groq, tafsir, 8955dff" autocomplete="off" spellcheck="false"></div></div>
<main>
${body}
</main>
<footer>Mishkat · traceability page generated from the repository · offline, no external resources.</footer>
<script>
(function(){
  var q=document.getElementById('q'),qn=document.getElementById('qn');
  var tables=[].slice.call(document.querySelectorAll('table[data-total]'));
  function norm(s){return (s||'').toLowerCase().replace(/[\\u064B-\\u065F\\u0670]/g,'');}
  tables.forEach(function(t){[].forEach.call(t.tBodies[0].rows,function(r){r._t=norm(r.textContent);});});
  function run(){
    var v=norm(q.value.trim()),shown=0,total=0;
    tables.forEach(function(t){
      var n=0,rows=t.tBodies[0].rows;
      for(var i=0;i<rows.length;i++){var ok=!v||rows[i]._t.indexOf(v)>=0;rows[i].hidden=!ok;rows[i].classList.toggle('hit',!!v&&ok);if(ok)n++;}
      shown+=n;total+=rows.length;
      var c=document.querySelector('.count[data-for="'+t.id+'"]');if(c)c.textContent=v?(n+' / '+rows.length):rows.length;
    });
    qn.textContent=v?('— '+shown+' / '+total+' rows'):'';
  }
  q.addEventListener('input',run);
  try{var h=new URLSearchParams(location.search).get('q');if(h){q.value=h;run();}}catch(e){}
})();
</script>
</body>
</html>
`;
}

// ------------------------------------------------------------------ write (with a last secret check)
const md = renderMd(), html = renderHtml();
const SECRET_RE = /\b(gsk_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|cpk_[A-Za-z0-9._-]{20,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._-]{24,})/;
for (const [name, text] of [['TRACEABILITY.md', md], ['traceability.html', html]]) {
  const m = text.match(SECRET_RE);
  if (m) { console.error(`ABORT: something that looks like a secret would be written to ${name} (${m[0].slice(0, 6)}…). Nothing written.`); process.exit(2); }
}
mkdirSync(R('docs'), { recursive: true });
writeFileSync(OUT_MD, md);
writeFileSync(OUT_HTML, html);
console.log(`traceability written: ${rel(OUT_MD)} (${fmtBytes(Buffer.byteLength(md))}), ${rel(OUT_HTML)} (${fmtBytes(Buffer.byteLength(html))})`);
console.log(`  HEAD ${META.headShort} · hosts ${hostOrder.filter(h => !h.startsWith('(')).length} (unclassified: ${unclassified.join(', ') || 'none'}) · endpoints ${endpoints.length} · models ${models.length} · data ${dataTop.length} files + ${dataDirs.length} folders · code ${code.length} files · tests ${tests.reduce((a, t) => a + t.count, 0)} · commits ${ALL_COMMITS.length}`);
