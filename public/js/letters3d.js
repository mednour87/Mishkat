// «قرآن» in 3D: the whole Quran fills the letters of its own name.
// The glyphs are rasterised; inside each letter the words run on ONE thread made of contours parallel to the
// letter's outline (like the rings of a tree, from the outline inward), every contour turning the same way round,
// each starting where the previous one ended. The letters are read from right to left. Depth: the further a
// contour is from the outline, the more it stands out (an embossed letter, a «cushion» of light).
// Each surah receives a stretch of the thread proportional to its number of words, with a small gap before the next.
// The order of the surahs along the word is selectable:
//   mushaf · nuzul (revelation order) · length (longest first) · place (Meccan, then Medinan)

export const ORDERS = ['mushaf', 'nuzul', 'length', 'place'];

// marching squares on a scalar field f (gw × gh, >0 inside) at level 0: closed loops of [x, y] in grid units
export function isoLoops(f, gw, gh) {
  const segs = [];                         // [edgeA, edgeB, ax, ay, bx, by]
  const H = (x, y) => (y * gw + x) * 2, V = (x, y) => (y * gw + x) * 2 + 1;   // edge ids (horizontal from (x,y), vertical from (x,y))
  const at = (x, y) => f[y * gw + x];
  const ip = (a, b) => a / (a - b);
  for (let y = 0; y < gh - 1; y++) for (let x = 0; x < gw - 1; x++) {
    const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);
    const k = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
    if (k === 0 || k === 15) continue;
    const top = [H(x, y), x + ip(a, b), y], right = [V(x + 1, y), x + 1, y + ip(b, c)];
    const bot = [H(x, y + 1), x + ip(d, c), y + 1], left = [V(x, y), x, y + ip(a, d)];
    const add = (p, q) => segs.push([p[0], q[0], p[1], p[2], q[1], q[2]]);
    switch (k) {
      case 1: case 14: add(left, bot); break;
      case 2: case 13: add(bot, right); break;
      case 3: case 12: add(left, right); break;
      case 4: case 11: add(top, right); break;
      case 6: case 9: add(top, bot); break;
      case 7: case 8: add(left, top); break;
      case 5: case 10: {
        const m = (a + b + c + d) / 4;
        if ((m > 0) === (k === 5)) { add(left, top); add(bot, right); } else { add(left, bot); add(top, right); }
        break;
      }
    }
  }
  const byEdge = new Map();
  segs.forEach((s, k) => { for (const e of [s[0], s[1]]) { const l = byEdge.get(e); if (l) l.push(k); else byEdge.set(e, [k]); } });
  const used = new Uint8Array(segs.length), loops = [];
  for (let k0 = 0; k0 < segs.length; k0++) {
    if (used[k0]) continue;
    used[k0] = 1;
    const s0 = segs[k0], pts = [[s0[2], s0[3]], [s0[4], s0[5]]];
    let edge = s0[1];
    for (;;) {
      const next = (byEdge.get(edge) || []).find(k => !used[k]);
      if (next == null) break;
      used[next] = 1;
      const s = segs[next];
      if (s[0] === edge) { pts.push([s[4], s[5]]); edge = s[1]; } else { pts.push([s[2], s[3]]); edge = s[0]; }
    }
    if (pts.length > 6) loops.push(pts);
  }
  return loops;
}

// the letters rasterised in the page (a worker has no fonts): { raster, W, H }
export async function glyphRaster() {
  try { await document.fonts.load('700 300px Amiri'); } catch (e) { /* fallback font */ }
  const W = 1500, H = 620, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  g.font = "700 340px Amiri, 'Amiri Quran', serif";
  g.fillText('قرآن', W / 2, H * 0.52);
  return { raster: g.getImageData(0, 0, W, H).data, W, H };
}
let pathCache = null;
async function glyphPath() {
  if (!pathCache) { const r = await glyphRaster(); pathCache = contourPath(r.raster, r.W, r.H); }
  return pathCache;
}

// the thread of contours from an RGBA raster (alpha > 140 = inside), in scene units, centred
export function contourPath(img, W, H, { G = 2, STEP = 1.1 } = {}) {
  const gw = Math.floor(W / G), gh = Math.floor(H / G), M = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) M[y * gw + x] = img[((y * G) * W + x * G) * 4 + 3] > 140 ? 1 : 0;
  // chamfer distance to the outside (3-4), in grid units
  const D = new Float32Array(gw * gh), BIG = 1e9;
  for (let k = 0; k < D.length; k++) D[k] = M[k] ? BIG : 0;
  for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) { const k = y * gw + x; if (!M[k]) continue;
    D[k] = Math.min(D[k], D[k - 1] + 3, D[k - gw] + 3, D[k - gw - 1] + 4, D[k - gw + 1] + 4); }
  for (let y = gh - 2; y > 0; y--) for (let x = gw - 2; x > 0; x--) { const k = y * gw + x; if (!M[k]) continue;
    D[k] = Math.min(D[k], D[k + 1] + 3, D[k + gw] + 3, D[k + gw + 1] + 4, D[k + gw - 1] + 4); }
  for (let k = 0; k < D.length; k++) D[k] = D[k] >= BIG ? 0 : D[k] / 3;
  // connected components (the letters, their dots and the madda)
  const comp = new Int32Array(gw * gh).fill(-1), compInfo = [];
  for (let k0 = 0; k0 < M.length; k0++) {
    if (!M[k0] || comp[k0] >= 0) continue;
    const id = compInfo.length, st = [k0]; comp[k0] = id;
    let maxX = 0, maxD = 0;
    while (st.length) {
      const k = st.pop(), x = k % gw;
      maxX = Math.max(maxX, x); maxD = Math.max(maxD, D[k]);
      for (const n of [k - 1, k + 1, k - gw, k + gw]) if (n >= 0 && n < M.length && M[n] && comp[n] < 0) { comp[n] = id; st.push(n); }
    }
    compInfo.push({ maxX, maxD });
  }
  // contours at 0.8, 0.8 + STEP, … grid units from the outline
  const all = [];
  const f = new Float32Array(gw * gh);
  const top = Math.max(...compInfo.map(c => c.maxD));
  for (let lv = 0.8; lv < top; lv += STEP) {
    for (let k = 0; k < f.length; k++) f[k] = D[k] - lv;
    for (const L of isoLoops(f, gw, gh)) {
      // same turning way for every contour (signed area)
      let A = 0; for (let k = 0; k < L.length; k++) { const p = L[k], q = L[(k + 1) % L.length]; A += p[0] * q[1] - q[0] * p[1]; }
      if (A > 0) L.reverse();
      // its letter: the component under its first point (rounded inward)
      let id = -1;
      for (const p of L) { const k = Math.round(p[1]) * gw + Math.round(p[0]); if (comp[k] >= 0) { id = comp[k]; break; } }
      if (id < 0) continue;
      let mx = -Infinity; for (const p of L) mx = Math.max(mx, p[0]);
      all.push({ L, id, lv, mx, depth: lv / Math.max(1, compInfo[id].maxD) });
    }
  }
  // letters from right to left; inside a letter, from the outline inward
  all.sort((a, b) => (compInfo[b.id].maxX - compInfo[a.id].maxX) || (a.lv - b.lv) || (b.mx - a.mx));
  // each contour starts at its point nearest to where the previous one ended
  const s = 1100 / W * G, pts = [];
  let end = null;
  for (const c of all) {
    let L = c.L, j0 = 0;
    if (end) { let best = Infinity; L.forEach((p, j) => { const d = (p[0] - end[0]) ** 2 + (p[1] - end[1]) ** 2; if (d < best) { best = d; j0 = j; } }); L = L.slice(j0).concat(L.slice(0, j0)); }
    L.forEach((p, j) => pts.push([(p[0] - gw / 2) * s, -(p[1] - gh / 2) * s, c.depth, j === 0]));
    end = L[L.length - 1];
  }
  return pts;
}

export async function quranWordLayout({ wordVerse, suraOf, suras, order = 'mushaf', path: given }) {
  const path = given || await glyphPath();
  const N = wordVerse.length;
  // arc length along the thread; a move to the next contour (first point) adds no length: no word in the void
  const cum = new Float64Array(path.length);
  for (let k = 1; k < path.length; k++) cum[k] = cum[k - 1] + (path[k][3] ? 0 : Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]));
  const Ltot = cum[path.length - 1];
  const bySura = Array.from({ length: 115 }, () => []);
  for (let w = 0; w < N; w++) bySura[suraOf[wordVerse[w]]].push(w);
  let seq = suras.map(s => s.n);
  if (order === 'nuzul') seq.sort((a, b) => suras[a - 1].order - suras[b - 1].order);
  else if (order === 'length') seq.sort((a, b) => bySura[b].length - bySura[a].length || a - b);
  else if (order === 'place') seq.sort((a, b) => (suras[a - 1].type === suras[b - 1].type ? suras[a - 1].order - suras[b - 1].order : suras[a - 1].type === 'meccan' ? -1 : 1));
  const GAP_FRAC = 0.012, gap = (Ltot * GAP_FRAC) / (seq.length - 1), usable = Ltot * (1 - GAP_FRAC);
  const out = new Float32Array(N * 3);
  const DEPTH = 34;
  let done = 0, k = 0;
  seq.forEach((sn, idx) => {
    const ws = bySura[sn], n = ws.length;
    const start = (done / N) * usable + idx * gap, len = (n / N) * usable;
    for (let j = 0; j < n; j++) {
      const u = start + ((j + 0.5) / n) * len;
      while (k < path.length - 2 && cum[k + 1] < u) k++;
      const a = path[k], b = path[k + 1], seg = cum[k + 1] - cum[k], t = b[3] || seg <= 0 ? 0 : Math.min(1, Math.max(0, (u - cum[k]) / seg));
      const w = ws[j] * 3;
      out[w] = a[0] + (b[0] - a[0]) * t;
      out[w + 1] = a[1] + (b[1] - a[1]) * t;
      out[w + 2] = DEPTH * Math.sqrt(a[2] + (b[2] - a[2]) * t) - DEPTH / 2;
    }
    done += n;
  });
  // the camera frames the word: it fills about three quarters of a wide view, seen slightly from below
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of path) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const tan = Math.tan(27.5 * Math.PI / 180), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const d = Math.max(300, (x1 - x0) / (0.7 * 2 * tan * 1.6), (y1 - y0) / (0.6 * 2 * tan));
  return { positions: out, sequence: seq, view: { pos: [cx, cy - d * 0.3, d * 0.95], target: [cx, cy, 0] } };
}
