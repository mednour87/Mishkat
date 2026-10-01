// «قرآن» in 3D: the whole Quran fills the letters of its own name.
// The glyphs are rasterised, the filled area is swept right-to-left (reading
// direction) into one continuous path, and each surah receives a stretch of
// that path proportional to its number of words (its "volume"), with a small
// empty gap before the next surah. Inside its stretch, a surah's words coil
// like a snail shell through the depth of the letter (a helix around the path).
// The order of the surahs along the word is selectable:
//   mushaf · nuzul (revelation order) · length (longest first) · place (Meccan, then Medinan)

export const ORDERS = ['mushaf', 'nuzul', 'length', 'place'];

let maskCache = null;
async function glyphPath() {
  if (maskCache) return maskCache;
  try { await document.fonts.load('700 300px Amiri'); } catch (e) { /* fallback font */ }
  const W = 1500, H = 620, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  g.font = "700 340px Amiri, 'Amiri Quran', serif";
  g.fillText('قرآن', W / 2, H * 0.52);
  const img = g.getImageData(0, 0, W, H).data;
  const STEP = 4, BAND = 4;
  const cols = new Map();
  for (let y = 0; y < H; y += STEP) for (let x = 0; x < W; x += STEP) {
    if (img[(y * W + x) * 4 + 3] > 140) {
      const b = Math.floor(x / (STEP * BAND));
      if (!cols.has(b)) cols.set(b, []);
      cols.get(b).push([x, y]);
    }
  }
  // right-to-left bands, serpentine inside each band → a continuous sweep
  const bands = [...cols.keys()].sort((a, b) => b - a);
  const pts = [];
  bands.forEach((b, k) => {
    const list = cols.get(b).sort((p, q) => (k % 2 ? q[1] - p[1] : p[1] - q[1]) || (q[0] - p[0]));
    for (const p of list) pts.push(p);
  });
  const s = 1100 / W;
  maskCache = pts.map(([x, y]) => [(x - W / 2) * s, -(y - H / 2) * s]);
  return maskCache;
}

export async function quranWordLayout({ wordVerse, suraOf, suras, order = 'mushaf' }) {
  const path = await glyphPath();
  const M = path.length, N = wordVerse.length;
  // words of each surah (mushaf order inside the surah)
  const bySura = Array.from({ length: 115 }, () => []);
  for (let w = 0; w < N; w++) bySura[suraOf[wordVerse[w]]].push(w);
  let seq = suras.map(s => s.n);
  if (order === 'nuzul') seq.sort((a, b) => suras[a - 1].order - suras[b - 1].order);
  else if (order === 'length') seq.sort((a, b) => bySura[b].length - bySura[a].length || a - b);
  else if (order === 'place') seq.sort((a, b) => (suras[a - 1].type === suras[b - 1].type ? suras[a - 1].order - suras[b - 1].order : suras[a - 1].type === 'meccan' ? -1 : 1));
  const GAP_FRAC = 0.07, gap = (M * GAP_FRAC) / (seq.length - 1), usable = M * (1 - GAP_FRAC);
  const out = new Float32Array(N * 3);
  const DEPTH = 34, R = 9;
  let done = 0;
  seq.forEach((sn, k) => {
    const ws = bySura[sn], n = ws.length;
    const start = (done / N) * usable + k * gap, len = (n / N) * usable;
    const turns = Math.max(1.5, n / 220);
    for (let j = 0; j < n; j++) {
      const f = n > 1 ? j / (n - 1) : 0.5;
      const u = Math.min(M - 1, start + f * len);
      const i0 = Math.floor(u), i1 = Math.min(M - 1, i0 + 1), t = u - i0;
      const x = path[i0][0] * (1 - t) + path[i1][0] * t, y = path[i0][1] * (1 - t) + path[i1][1] * t;
      const a = f * turns * Math.PI * 2;
      const w = ws[j] * 3;
      out[w] = x + R * Math.cos(a) * 0.35;
      out[w + 1] = y + R * Math.sin(a) * 0.35;
      out[w + 2] = DEPTH * Math.sin(a) + (k % 2 ? 4 : -4);
    }
    done += n;
  });
  return { positions: out, sequence: seq, view: { pos: [0, -230, 700], target: [0, -40, 0] } };
}
