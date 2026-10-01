// Word-level 3D layouts of the whole Quran, chosen with two independent keys:
//   SHAPE — the figure the 77,433 words draw;
//   ORDER — the order in which the surahs are laid along that figure.
// Inside a surah, words always stay in Mushaf order.
//
// Shapes are ported from the author's earlier atlas (Quran_Cartography/07_الأطلس):
//   galaxy — data_build/build_data.py `spiral_layout` (the default galaxy), any order
//   quran  — letters3d.js (the word «قرآن» filled by the Quran); needs a canvas
//   rose   — IT5/IT6 «وردة السور»: one ring per surah; ring width ∝ its words (tree rings)
//   dome   — IT6 «قبّة الكلمات» + «طواف»: one ascending circuit over a hemisphere,
//            each surah a band whose area ∝ its words (Archimedes' equal-area bands)
//   petals — IT5 «بتلات السور» + I6 «شمسية السور» (sunburst): each surah a petal whose
//            angular width ∝ its words; petals open upward like a cup
//
// Coordinates share the galaxy's frame and scale (the galaxy spans ≈ ±580 in x/y,
// "up" is +z for the disc-like shapes), so morphs between shapes stay smooth.
// Pure data, deterministic (seeded PRNG). Only 'quran' touches the DOM (via letters3d.js).

import { quranWordLayout } from './letters3d.js';

export const SHAPES = [
  { id: 'galaxy', ar: 'مجرّة', en: 'Galaxy' },
  { id: 'quran', ar: '«قرآن»', en: '“Qur’an”' },
  { id: 'rose', ar: 'وردة السور', en: 'Rose of surahs' },
  { id: 'dome', ar: 'قبّة الطواف', en: 'Dome' },
  { id: 'petals', ar: 'بتلات السور', en: 'Petals' },
];

export const ORDERS = [
  { id: 'mushaf', ar: 'ترتيب المصحف', en: 'Mushaf order' },
  { id: 'nuzul', ar: 'ترتيب النزول', en: 'Revelation order' },
  { id: 'place', ar: 'المكي ثم المدني', en: 'Meccan, then Medinan' },
  { id: 'length', ar: 'عدد الكلمات', en: 'Number of words' },
  { id: 'letters', ar: 'عدد الحروف', en: 'Number of letters' },
  { id: 'ayas', ar: 'عدد الآيات', en: 'Number of verses' },
  { id: 'versel', ar: 'متوسط طول الآية', en: 'Average verse length' },
];

// longer phrase used in the note
const ORDER_NOTE = {
  mushaf: { ar: 'بترتيب المصحف', en: 'in Mushaf order' },
  nuzul: { ar: 'بترتيب النزول', en: 'in revelation order' },
  place: { ar: 'المكية أولًا ثم المدنية، كلٌّ بترتيب نزوله', en: 'Meccan surahs first, then Medinan, each in revelation order' },
  length: { ar: 'من الأكثر كلماتٍ إلى الأقل', en: 'from the most words to the fewest' },
  letters: { ar: 'من الأكثر حروفًا إلى الأقل', en: 'from the most letters to the fewest' },
  ayas: { ar: 'من الأكثر آياتٍ إلى الأقل', en: 'from the most verses to the fewest' },
  versel: { ar: 'من أطول الآيات متوسطًا إلى أقصرها', en: 'from the longest average verse to the shortest' },
};

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- helpers
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rand) {
  let spare = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0; while (u === 0) u = rand();
    const v = rand(), m = Math.sqrt(-2 * Math.log(u));
    spare = m * Math.sin(TAU * v);
    return m * Math.cos(TAU * v);
  };
}
// stable per-word jitter in [-0.5, 0.5) (same hash as the atlas IT5/IT6)
const jit = (q) => (((q * 2654435761) >>> 0) % 1000) / 1000 - 0.5;
const jit2 = (q) => ((((q + 7919) * 2246822519) >>> 0) % 1000) / 1000 - 0.5;

// Arabic letters of the Uthmani text: hamza..ghayn, fa..ya, alif wasla.
// Excluded: tatweel, harakat/tanwin/shadda/sukun, superscript alif, small Quranic marks.
export function countLetters(word) {
  let n = 0;
  for (let i = 0; i < word.length; i++) {
    const c = word.charCodeAt(i);
    if ((c >= 0x0621 && c <= 0x063A) || (c >= 0x0641 && c <= 0x064A) || c === 0x0671) n++;
  }
  return n;
}

// per-dataset statistics (cached on the wordVerse array)
const statCache = new WeakMap();
function stats(wordVerse, suras, words) {
  let st = statCache.get(wordVerse);
  if (!st) {
    const NV = suras.reduce((m, s) => Math.max(m, s.first + s.ayas), 0);
    const suraOf = new Uint8Array(NV);
    for (const s of suras) for (let a = 0; a < s.ayas; a++) suraOf[s.first + a] = s.n;
    const N = wordVerse.length;
    const count = new Int32Array(115), start = new Int32Array(115).fill(-1);
    for (let w = 0; w < N; w++) {
      const s = suraOf[wordVerse[w]];
      if (start[s] < 0) start[s] = w;
      count[s]++;
    }
    // words are stored in Mushaf order → each surah is one contiguous run
    const bySura = Array.from({ length: 115 }, (_, s) => {
      const a = new Int32Array(count[s]);
      for (let j = 0; j < count[s]; j++) a[j] = start[s] + j;
      return a;
    });
    for (let w = 0; w < N; w++) {
      const s = suraOf[wordVerse[w]];
      if (w - start[s] >= count[s] || w < start[s]) throw new Error('words of surah ' + s + ' are not contiguous');
    }
    st = { suraOf, bySura, count, letters: null };
    statCache.set(wordVerse, st);
  }
  if (words && !st.letters) {
    const L = new Int32Array(115);
    for (let w = 0; w < wordVerse.length; w++) L[st.suraOf[wordVerse[w]]] += countLetters(words[w]);
    st.letters = L;
  }
  return st;
}

/** Sequence of surah numbers (1..114) for an order id. */
export function suraSequence(order, { suras, count, letters }) {
  const S = (n) => suras[n - 1];
  const seq = suras.map((s) => s.n);
  const by = (f) => seq.sort((a, b) => f(a, b) || a - b);
  switch (order) {
    case 'mushaf': return seq;
    case 'nuzul': return by((a, b) => S(a).order - S(b).order);
    case 'place': return by((a, b) => (S(a).type === S(b).type ? S(a).order - S(b).order : S(a).type === 'meccan' ? -1 : 1));
    case 'length': return by((a, b) => count[b] - count[a]);
    case 'letters':
      if (!letters) throw new Error("order 'letters' needs `words`");
      return by((a, b) => letters[b] - letters[a]);
    case 'ayas': return by((a, b) => S(b).ayas - S(a).ayas);
    case 'versel': return by((a, b) => count[b] / S(b).ayas - count[a] / S(a).ayas);
    default: throw new Error('unknown order: ' + order);
  }
}

// ---------------------------------------------------------------- shapes

// galaxy — port of build_data.py spiral_layout (same constants)
function galaxy(N, seq, st, wordVerse, seed) {
  const rand = mulberry32(seed), g = gaussian(rand);
  const out = new Float32Array(N * 3);
  const GAP = 260;
  const total = N + GAP * seq.length; // python: virt after the last surah too
  const vOff = new Map();
  let virt = 0;
  seq.forEach((s, k) => {
    const ws = st.bySura[s], arm = k % 2;
    for (let j = 0; j < ws.length; j++, virt++) {
      const i = ws[j], t = virt / total, vv = wordVerse[i];
      let o = vOff.get(vv);
      if (!o) {
        const spread = 5 + 24 * t, sz = 3 + 10 * (1 - t) ** 2;
        o = [g() * spread, g() * spread, g() * sz];
        vOff.set(vv, o);
      }
      const e = 0.9 + 1.6 * t;
      const ex = g() * e, ey = g() * e, ez = g() * e;
      const radius = 22 + 540 * Math.sqrt(t);
      const theta = 5.6 * Math.PI * Math.sqrt(t) + arm * Math.PI;
      out[i * 3] = radius * Math.cos(theta) + o[0] + ex;
      out[i * 3 + 1] = radius * Math.sin(theta) + o[1] + ey;
      out[i * 3 + 2] = o[2] + ez * 0.6;
    }
    virt += GAP;
  });
  return { positions: out, view: { pos: [0, -900, 780], target: [0, 0, 0] } };
}

// rose — concentric rings (IT5/IT6), ring k at a radius growing with its rank;
// the ring's radial width ∝ the surah's words, its words coil inside it
// (an integer number of laps, so every surah starts on the same ray at 12 o'clock).
function rose(N, seq, st, wordVerse) {
  const out = new Float32Array(N * 3);
  const R0 = 34, SPAN = 540, BASE = 2.6;
  const raw = seq.map((s) => BASE + st.count[s] * 0.0034);
  const sum = raw.reduce((a, b) => a + b, 0), k = SPAN / sum;
  let r0 = R0;
  seq.forEach((s, idx) => {
    const ws = st.bySura[s], n = ws.length, w = raw[idx] * k;
    const laps = Math.max(1, Math.round((w - 1.2) / 2.6));
    const u = (idx + 0.5) / seq.length; // 0 centre → 1 rim
    const lift = 120 * u * u + (idx % 2 ? 2.5 : -2.5);
    let prevV = -1, vSide = 1;
    for (let j = 0; j < n; j++) {
      const i = ws[j], f = n > 1 ? j / n : 0;
      if (wordVerse[i] !== prevV) { prevV = wordVerse[i]; vSide = -vSide; }
      const th = Math.PI / 2 - f * laps * TAU; // clockwise from the top
      // gentle five-lobed ruffle whose phase turns slowly with the radius (a rose, not a target);
      // neighbouring rings share almost the same phase, so rings never cross.
      const ruf = Math.cos(5 * th + Math.PI * u * 1.6);
      const r = (r0 + 0.6 + (w - 1.2) * f + jit(i) * 1.1 + vSide * 0.35) * (1 + 0.055 * u * ruf);
      out[i * 3] = r * Math.cos(th);
      out[i * 3 + 1] = r * Math.sin(th);
      out[i * 3 + 2] = lift + 34 * u * ruf + jit2(i) * 2.4;
    }
    r0 += w;
  });
  return { positions: out, view: { pos: [0, -720, 820], target: [0, 0, 40] } };
}

// dome — one continuous ascending circuit (tawaf) on a hemisphere; height ∝ cumulative
// words, which by Archimedes' theorem gives every surah a band of area ∝ its words.
function dome(N, seq, st, wordVerse) {
  const out = new Float32Array(N * 3);
  const R = 470, TURNS = 46, GAP = 160, TOP = 0.985;
  const total = N + GAP * (seq.length - 1);
  const th0 = Math.PI / 2 - 0.227; // start angle from the atlas (Black Stone direction, IT6 KAABA.ROT)
  let virt = 0;
  seq.forEach((s, k) => {
    const ws = st.bySura[s], side = k % 2 ? 1.012 : 0.988;
    for (let j = 0; j < ws.length; j++, virt++) {
      const i = ws[j], c = (virt / total) * TOP;
      const z = R * c, rr = Math.sqrt(Math.max(0, R * R - z * z)) * side + jit(i) * 2.2;
      const th = th0 - c * TURNS * TAU; // clockwise seen from above
      out[i * 3] = rr * Math.cos(th);
      out[i * 3 + 1] = rr * Math.sin(th);
      out[i * 3 + 2] = z + jit2(i) * 2.2 - 150;
    }
    virt += GAP;
  });
  return { positions: out, view: { pos: [0, -1080, 430], target: [0, 0, 20] } };
}

// petals — sunburst sectors (IT5 petals, I6 sunburst): angular width ∝ words, clockwise
// from 12 o'clock; inside its sector a surah zigzags outward inside a leaf-shaped envelope.
function petals(N, seq, st) {
  const out = new Float32Array(N * 3);
  const R0 = 30, SPAN = 530, GAPF = 0.07, H = 240;
  const usable = TAU * (1 - GAPF), gapA = (TAU * GAPF) / seq.length;
  let acc = gapA / 2;
  seq.forEach((s, k) => {
    const ws = st.bySura[s], n = ws.length;
    const width = (usable * n) / N, mid = acc + width / 2, half = width / 2;
    const zig = Math.max(2, Math.min(80, n / 6)); // dense hatching fills the leaf
    for (let j = 0; j < n; j++) {
      const i = ws[j], f = (j + 0.5) / n;
      const env = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(f, 0.8))), 0.6);
      const a = mid + half * 0.92 * env * Math.sin(f * Math.PI * zig);
      const rf = Math.pow(f, 0.86), r = R0 + SPAN * rf + jit(i) * 1.6;
      const th = Math.PI / 2 - a;
      out[i * 3] = r * Math.cos(th);
      out[i * 3 + 1] = r * Math.sin(th);
      out[i * 3 + 2] = H * Math.pow(rf, 1.8) + (k % 2 ? 3 : -3) + jit2(i) * 2 - 60;
    }
    acc += width + gapA;
  });
  return { positions: out, view: { pos: [0, -760, 760], target: [0, 0, 30] } };
}

// ---------------------------------------------------------------- notes
const SHAPE_NOTE = {
  galaxy: {
    ar: (o, a, b) => `ذراعان حلزونيّتان تحملان السور بالتناوب من القلب إلى الأطراف ${o}: ${a} في القلب و${b} في الحافة.`,
    en: (o, a, b) => `Two spiral arms carry the surahs alternately from the core outward ${o}: ${a} at the core, ${b} at the rim.`,
  },
  quran: {
    ar: (o, a, b) => `القرآن كلّه يملأ حروف اسمه من اليمين إلى اليسار، وطول كل سورة بقدر كلماتها ${o}: من ${a} إلى ${b}.`,
    en: (o, a, b) => `The whole Quran fills the letters of its own name from right to left, each surah's stretch sized by its words, ${o}: from ${a} to ${b}.`,
  },
  rose: {
    ar: (o, a, b) => `كل سورة حلقة يزداد عرضها بزيادة كلماتها، والحلقات تتّسع من المركز ${o}: ${a} في الداخل و${b} في الخارج.`,
    en: (o, a, b) => `Each surah is a ring whose width grows with its word count, rings widening from the centre ${o}: ${a} innermost, ${b} outermost.`,
  },
  dome: {
    ar: (o, a, b) => `مسار واحد يصعد القبّة طائفًا، ولكل سورة نطاق مساحته بقدر كلماتها ${o}: ${a} عند القاعدة و${b} عند القمّة.`,
    en: (o, a, b) => `One circuit climbs the dome, each surah taking a band whose area matches its word count, ${o}: ${a} at the base, ${b} at the summit.`,
  },
  petals: {
    ar: (o, a, b) => `كل سورة بتلة يتناسب عرضها مع عدد كلماتها، تدور مع عقارب الساعة من الأعلى ${o}: من ${a} إلى ${b}.`,
    en: (o, a, b) => `Each surah is a petal whose width matches its word count, placed clockwise from the top ${o}: from ${a} to ${b}.`,
  },
};

function makeNote(shape, order, seq, suras) {
  const S = (n) => suras[n - 1];
  const a = S(seq[0]), b = S(seq[seq.length - 1]);
  const t = SHAPE_NOTE[shape], o = ORDER_NOTE[order];
  return {
    ar: t.ar(o.ar, `${a.ar} (${a.n})`, `${b.ar} (${b.n})`),
    en: t.en(o.en, `${a.tr} (${a.n})`, `${b.tr} (${b.n})`),
  };
}

// ---------------------------------------------------------------- API
/**
 * @param {{shape:string, order:string, wordVerse:Uint16Array|number[], suras:object[], words?:string[]}} p
 * @returns {Promise<{positions:Float32Array, view:{pos:number[],target:number[]}, sequence:number[], note:{ar:string,en:string}}>}
 */
export async function buildLayout({ shape = 'galaxy', order = 'mushaf', wordVerse, suras, words }) {
  if (!SHAPES.some((s) => s.id === shape)) throw new Error('unknown shape: ' + shape);
  if (!ORDERS.some((o) => o.id === order)) throw new Error('unknown order: ' + order);
  const st = stats(wordVerse, suras, order === 'letters' ? words : null);
  const N = wordVerse.length;
  const seq = suraSequence(order, { suras, count: st.count, letters: st.letters });
  let res;
  if (shape === 'quran') {
    // letters3d lays surahs in `suras` array order when order = 'mushaf'
    const sorted = seq.map((n) => suras[n - 1]);
    const lay = await quranWordLayout({ wordVerse, suraOf: st.suraOf, suras: sorted, order: 'mushaf' });
    res = { positions: lay.positions, view: lay.view };
  } else if (shape === 'galaxy') {
    const seed = order === 'mushaf' ? 42 : order === 'nuzul' ? 43 : 42 + ORDERS.findIndex((o) => o.id === order);
    res = galaxy(N, seq, st, wordVerse, seed);
  } else if (shape === 'rose') res = rose(N, seq, st, wordVerse);
  else if (shape === 'dome') res = dome(N, seq, st, wordVerse);
  else res = petals(N, seq, st);
  return { positions: res.positions, view: res.view, sequence: seq.slice(), note: makeNote(shape, order, seq, suras) };
}
