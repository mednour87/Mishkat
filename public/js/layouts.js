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

// ---------------------------------------------------------------- the reading thread (4 Oct, refonte)
// Every shape is ONE continuous thread on which the words follow each other in reading order: the recited word
// only ever moves forward, along a curve that turns smoothly (no back-and-forth across an arm or a petal).
// The relation that draws it is taken from the text itself:
//   · one verse = one full turn (2π) of a small helix around the thread's axis, its words equally spaced on
//     the turn; the turn's radius grows with √(words of the verse) — long Medinan verses make wide rings,
//     short Meccan verses narrow ones;
//   · the axis advances by the same length for every word (equal reading pace);
//   · the galaxy's axis is a Fermat spiral r = R·√u read in one stroke through the centre: every word gets the
//     same area of the disc (equal-area spiral, the law of the sunflower's seeds).
// Gaps of GAP words separate the surahs.

// a helix of one turn per verse around an axis given per word (ax, frames N and B): fills out[]
function helixAroundAxis(N, order, wordVerse, axis, frameN, frameB, radius, out, flat = () => 1) {
  // order: word indices in reading order; radius(k, nw) → turn radius of the verse (k = position in order).
  // The phase never jumps: a verse of nw ≥ 8 words makes one full turn; a shorter verse a part of a turn
  // (2π/8 per word), so the step from word to word never turns by more than 45°.
  let prevR = null, k = 0, phi = 0;
  while (k < order.length) {
    const v = wordVerse[order[k]];
    let e = k; while (e < order.length && wordVerse[order[e]] === v) e++;
    const nw = e - k, R = radius(k, nw), dphi = 2 * Math.PI / Math.max(8, nw);
    if (prevR == null) prevR = R;
    for (let j = 0; j < nw; j++) {
      const i = order[k + j], f = (j + 0.5) / nw;
      phi += dphi;
      const s = Math.min(1, f / 0.5), sm = s * s * (3 - 2 * s), r = prevR + (R - prevR) * sm;   // smooth change of radius
      const c = Math.cos(phi) * r, d = Math.sin(phi) * r * flat(k + j);
      out[i * 3] = axis[i * 3] + c * frameN[i * 3] + d * frameB[i * 3];
      out[i * 3 + 1] = axis[i * 3 + 1] + c * frameN[i * 3 + 1] + d * frameB[i * 3 + 1];
      out[i * 3 + 2] = axis[i * 3 + 2] + c * frameN[i * 3 + 2] + d * frameB[i * 3 + 2];
    }
    prevR = R; k = e;
  }
}
const readingOrder = (seq, st) => { const o = []; for (const s of seq) for (const i of st.bySura[s]) o.push(i); return o; };

// galaxy — a Fermat spiral read in one stroke: from the rim of one arm to the centre, then out along the other arm
// (s from −1 to 1, u = |s|, r = R·√u, θ = Θ·u; the second arm is the first turned by π). A bulge at the core.
function galaxy(N, seq, st, wordVerse) {
  const out = new Float32Array(N * 3), spine = new Float32Array(N * 3), nf = new Float32Array(N * 3), bf = new Float32Array(N * 3);
  const GAP = 40, R = 575, TH = 2.75 * 2 * Math.PI, order = readingOrder(seq, st);
  const total = order.length + GAP * (seq.length - 1);
  const P = (s) => { const u = Math.abs(s), r = R * Math.sqrt(u), th = TH * u + (s < 0 ? Math.PI : 0); return [r * Math.cos(th), r * Math.sin(th), 0]; };
  let virt = 0, k = 0;
  const sOf = new Float32Array(order.length);
  for (const s of seq) { for (let j = 0; j < st.bySura[s].length; j++, virt++) sOf[k++] = -1 + 2 * (virt + 0.5) / total; virt += GAP; }
  for (k = 0; k < order.length; k++) {
    const i = order[k], s = sOf[k], a = P(s), h = 1e-4, b = P(Math.min(1, s + h)), c = P(Math.max(-1, s - h));
    let tx = b[0] - c[0], ty = b[1] - c[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    spine[i * 3] = a[0]; spine[i * 3 + 1] = a[1]; spine[i * 3 + 2] = 0;
    nf[i * 3] = -ty; nf[i * 3 + 1] = tx; nf[i * 3 + 2] = 0;       // in the disc, across the arm
    bf[i * 3 + 2] = 1;                                             // up
  }
  // the turn's radius: √(words of the verse), larger at the core (the bulge), thinner at the rim
  const radius = (kk, nw) => { const u = Math.abs(sOf[kk]); return Math.min(34, 2.4 + 2.6 * Math.sqrt(nw)) * (0.75 + 0.9 * Math.exp(-u * 5)); };
  const flat = (kk) => { const u = Math.abs(sOf[kk]); return 0.38 + 0.9 * Math.exp(-u * 6); };   // a flat disc, a round bulge
  helixAroundAxis(N, order, wordVerse, spine, nf, bf, radius, out, flat);
  return { positions: out, view: { pos: [0, -860, 640], target: [0, -60, 0] }, spine };
}

// rose — one continuous spiral: each surah coils inside its ring (ring width ∝ its words), and starts exactly where
// the previous one ended (a whole number of laps is no longer forced, so there is no seam and no jump)
function rose(N, seq, st, wordVerse) {
  const out = new Float32Array(N * 3);
  const R0 = 80, SPAN = 500, BASE = 2.6;
  const raw = seq.map((s) => BASE + st.count[s] * 0.0034);
  const sum = raw.reduce((a, b) => a + b, 0), kk = SPAN / sum;
  let r0 = R0, ang = Math.PI / 2;
  seq.forEach((s, idx) => {
    const ws = st.bySura[s], n = ws.length, w = raw[idx] * kk;
    const laps = Math.max(1, (w - 1.2) / 2.6);
    const u = (idx + 0.5) / seq.length;
    const lift = 150 * Math.pow(u, 1.5);
    for (let j = 0; j < n; j++) {
      const i = ws[j], f = (j + 0.5) / n;
      const th = ang - f * laps * TAU; // clockwise
      const ruf = Math.cos(5 * th + Math.PI * u * 3);
      const r = (r0 + 0.6 + (w - 1.2) * f) * (1 + 0.18 * (0.3 + 0.7 * u) * ruf);
      out[i * 3] = r * Math.cos(th);
      out[i * 3 + 1] = r * Math.sin(th);
      out[i * 3 + 2] = lift + 9 * u * ruf;
    }
    ang -= laps * TAU;
    r0 += w;
  });
  return { positions: out, view: { pos: [0, -820, 760], target: [0, -30, 60] } };
}

// petals — each surah a petal (angular room ∝ its words, length ∝ √words): its words run on nested ellipses that all
// leave from and come back to the petal's base, growing lap after lap (the petal opens); then the thread moves on,
// clockwise, to the base of the next petal. Always the same way round, no stroke goes back.
function petals(N, seq, st) {
  const out = new Float32Array(N * 3);
  const R0 = 34, GAPF = 0.05, H = 240, SP = 1.8;
  const usable = TAU * (1 - GAPF), gapA = (TAU * GAPF) / seq.length;
  const nmax = Math.max(...seq.map(s => st.bySura[s].length));
  let acc = gapA / 2;
  seq.forEach((s) => {
    const ws = st.bySura[s], n = ws.length;
    const width = (usable * n) / N, mid = acc + width / 2;
    const L = 40 + 380 * Math.sqrt(n / nmax);
    // round petals (width 0.8 × length): an even curvature, no sharp tip; neighbouring petals overlap like a real flower's
    const a = L * 0.4;
    const th = Math.PI / 2 - mid, ux = Math.cos(th), uy = Math.sin(th), px = Math.sin(th), py = -Math.cos(th);
    const per = Math.PI * (a + L / 2) * 1.05;                       // perimeter of the outer ellipse (approx.)
    const laps = Math.max(1, Math.min(48, Math.round(2 * n * SP / per - 1)));
    // words per lap ∝ the lap's size (scale √((l+1)/laps))
    const sc = Array.from({ length: laps }, (_, l) => Math.sqrt((l + 1) / laps)), tot = sc.reduce((x, y) => x + y, 0);
    // each word at its own place along the laps, laps sharing the words in proportion to their size
    const cum = [0]; for (let l = 0; l < laps; l++) cum.push(cum[l] + sc[l]);
    let l = 0;
    for (let j = 0; j < n; j++) {
      const u = (j + 0.5) / n * tot;
      while (l < laps - 1 && cum[l + 1] <= u) l++;
      const t = (u - cum[l]) / sc[l], al = L * sc[l] * (1 - Math.cos(TAU * t)) / 2, ac = -a * sc[l] * Math.sin(TAU * t);
      const x = (R0 + al) * ux + ac * px, y = (R0 + al) * uy + ac * py, rr = Math.hypot(x, y), i = ws[j];
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = H * Math.pow(rr / 600, 1.8) - 60;
    }
    acc += width + gapA;
  });
  return { positions: out, view: { pos: [0, -800, 740], target: [0, -40, 60] } };
}

// dome — one continuous ascending circuit (tawaf) on a hemisphere; height ∝ cumulative
// words, which by Archimedes' theorem gives every surah a band of area ∝ its words.
function dome(N, seq, st, wordVerse) {
  const out = new Float32Array(N * 3);
  // 150 turns (was 46): the circuit's lines are ~3 units apart and read as one luminous surface, not as stripes
  const R = 470, TURNS = 150, GAP = 160, TOP = 0.992;
  const total = N + GAP * (seq.length - 1);
  const th0 = Math.PI / 2 - 0.227; // start angle from the atlas (Black Stone direction, IT6 KAABA.ROT)
  let virt = 0;
  seq.forEach((s, k) => {
    const ws = st.bySura[s], side = k % 2 ? 1.006 : 0.994;
    for (let j = 0; j < ws.length; j++, virt++) {
      const i = ws[j], c = (virt / total) * TOP;
      const z = R * c, rr = Math.sqrt(Math.max(0, R * R - z * z)) * side;   // no random jitter: the circuit is a smooth line
      const th = th0 - c * TURNS * TAU; // clockwise seen from above
      out[i * 3] = rr * Math.cos(th);
      out[i * 3 + 1] = rr * Math.sin(th);
      out[i * 3 + 2] = z - 150;
    }
    virt += GAP;
  });
  return { positions: out, view: { pos: [0, -1010, 330], target: [0, 0, 70] } };
}

// ---------------------------------------------------------------- notes
const SHAPE_NOTE = {
  galaxy: {
    ar: (o, a, b) => `خيط واحد يُقرأ دون رجوع: من طرف الذراع الأولى إلى القلب ثم إلى طرف الذراع الثانية (حلزون فِرما: لكل كلمة المساحة نفسها)، وكل آية لفّة واحدة يتّسع قطرها بطولها؛ السور ${o}: ${a} في البداية و${b} في النهاية.`,
    en: (o, a, b) => `One thread read without turning back: from the tip of one arm to the core, then out to the tip of the other (a Fermat spiral: every word gets the same area); each verse is one turn whose width grows with its length; surahs ${o}: ${a} first, ${b} last.`,
  },
  quran: {
    ar: (o, a, b) => `القرآن كلّه يملأ حروف اسمه من اليمين إلى اليسار، وطول كل سورة بقدر كلماتها ${o}: من ${a} إلى ${b}.`,
    en: (o, a, b) => `The whole Quran fills the letters of its own name from right to left, each surah's stretch sized by its words, ${o}: from ${a} to ${b}.`,
  },
  rose: {
    ar: (o, a, b) => `حلزون واحد متّصل: كل سورة حلقة يزداد عرضها بزيادة كلماتها، وتبدأ حيث انتهت التي قبلها ${o}: ${a} في الداخل و${b} في الخارج.`,
    en: (o, a, b) => `One continuous spiral: each surah a ring as wide as its word count, starting where the previous one ended, ${o}: ${a} innermost, ${b} outermost.`,
  },
  dome: {
    ar: (o, a, b) => `مسار واحد يصعد القبّة طائفًا، ولكل سورة نطاق مساحته بقدر كلماتها ${o}: ${a} عند القاعدة و${b} عند القمّة.`,
    en: (o, a, b) => `One circuit climbs the dome, each surah taking a band whose area matches its word count, ${o}: ${a} at the base, ${b} at the summit.`,
  },
  petals: {
    ar: (o, a, b) => `كل سورة بتلة طولها بقدر كلماتها، تُقرأ في حلقات متداخلة تتّسع، ثم ينتقل الخيط مع عقارب الساعة إلى البتلة التالية ${o}: من ${a} إلى ${b}.`,
    en: (o, a, b) => `Each surah is a petal as long as its word count, read on nested loops that open outward; then the thread moves clockwise to the next petal, ${o}: from ${a} to ${b}.`,
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
export async function buildLayout({ shape = 'galaxy', order = 'mushaf', wordVerse, suras, words, quranPath = null }) {
  if (!SHAPES.some((s) => s.id === shape)) throw new Error('unknown shape: ' + shape);
  if (!ORDERS.some((o) => o.id === order)) throw new Error('unknown order: ' + order);
  const st = stats(wordVerse, suras, order === 'letters' ? words : null);
  const N = wordVerse.length;
  const seq = suraSequence(order, { suras, count: st.count, letters: st.letters });
  let res;
  if (shape === 'quran') {
    // letters3d lays surahs in `suras` array order when order = 'mushaf'
    const sorted = seq.map((n) => suras[n - 1]);
    const lay = await quranWordLayout({ wordVerse, suraOf: st.suraOf, suras: sorted, order: 'mushaf', path: quranPath });
    res = { positions: lay.positions, view: lay.view };
  } else if (shape === 'galaxy') {
    res = galaxy(N, seq, st, wordVerse);
  } else if (shape === 'rose') res = rose(N, seq, st, wordVerse);
  else if (shape === 'dome') res = dome(N, seq, st, wordVerse);
  else res = petals(N, seq, st);
  return { positions: res.positions, view: res.view, sequence: seq.slice(), note: makeNote(shape, order, seq, suras), ...(res.arms ? { arms: res.arms } : {}), ...(res.spine ? { spine: res.spine } : {}) };
}
