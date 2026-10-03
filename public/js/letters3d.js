// «قرآن» in 3D: the whole Quran fills the letters of its own name.
// The glyphs are rasterised, the filled area is swept right-to-left (reading
// direction) into one continuous path, and each surah receives a stretch of
// that path proportional to its number of words (its "volume"), with a small
// empty gap before the next surah. Inside its stretch, a surah's words fill the letter evenly through its
// thickness (the word is a solid, extruded volume of light).
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
  // fine grid and narrow bands: the sweep fills the letters evenly (wide bands showed as vertical stripes)
  const STEP = 3, BAND = 2;
  const cols = new Map();
  for (let y = 0; y < H; y += STEP) for (let x = 0; x < W; x += STEP) {
    if (img[(y * W + x) * 4 + 3] > 140) {
      const b = Math.floor(x / (STEP * BAND));
      if (!cols.has(b)) cols.set(b, []);
      cols.get(b).push([x, y]);
    }
  }
  // right-to-left bands, each read from top to bottom (always the same way: an up-and-down serpentine made the
  // view go back and forth while reading)
  const bands = [...cols.keys()].sort((a, b) => b - a);
  const pts = [];
  bands.forEach((b) => {
    const list = cols.get(b).sort((p, q) => (p[1] - q[1]) || (q[0] - p[0]));
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
  // small gaps between surahs (7 % of the path left empty strips across the letters)
  const GAP_FRAC = 0.015, gap = (M * GAP_FRAC) / (seq.length - 1), usable = M * (1 - GAP_FRAC);
  const out = new Float32Array(N * 3);
  const DEPTH = 26, CELL = 3 * 1100 / 1500;   // letters extruded in depth; CELL = one grid step in scene units
  const hash = (q) => (((q * 2654435761) >>> 0) % 1000) / 1000 - 0.5;
  let done = 0;
  seq.forEach((sn, k) => {
    const ws = bySura[sn], n = ws.length;
    const start = (done / N) * usable + k * gap, len = (n / N) * usable;
    for (let j = 0; j < n; j++) {
      const f = n > 1 ? j / (n - 1) : 0.5;
      const u = Math.min(M - 1, start + f * len);
      let i0 = Math.floor(u), i1 = Math.min(M - 1, i0 + 1), t = u - i0;
      // two consecutive points of the sweep far apart (a jump to the next band or letter): no word in between,
      // or dotted lines would cross the empty space between the letters
      if (Math.abs(path[i1][0] - path[i0][0]) + Math.abs(path[i1][1] - path[i0][1]) > 2.5 * CELL) { if (t >= 0.5) i0 = i1; t = 0; }
      const x = path[i0][0] * (1 - t) + path[i1][0] * t, y = path[i0][1] * (1 - t) + path[i1][1] * t;
      const w = ws[j] * 3, q = ws[j];
      // inside its grid cell (no lateral blur), spread through the thickness of the letter (a solid, extruded word)
      out[w] = x + hash(q) * CELL;
      out[w + 1] = y + hash(q + 7919) * CELL;
      out[w + 2] = hash(q + 104729) * DEPTH * 2 + (k % 2 ? 1.5 : -1.5);
    }
    done += n;
  });
  // the camera frames the word: it fills about three quarters of a wide view, seen slightly from below
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of path) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  // the whole word in view: 70 % of a 16:10 frame in width, 60 % in height
  const tan = Math.tan(27.5 * Math.PI / 180), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const d = Math.max(300, (x1 - x0) / (0.7 * 2 * tan * 1.6), (y1 - y0) / (0.6 * 2 * tan));
  return { positions: out, sequence: seq, view: { pos: [cx, cy - d * 0.3, d * 0.95], target: [cx, cy, 0] } };
}
