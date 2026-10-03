// Semantic neighbours ranked IN THE BROWSER (Web Worker), audit I1 of 2026-10-03.
// The server only embeds the question (bge-m3) and projects it on 256 principal axes
// (data_build/build_pca.py); the verse vectors (6,236 × 256 int8, 1.6 MB) are ranked here,
// so the API stays far below the 10 ms CPU limit of the free Cloudflare plan.
// Only verse indices and scores come out: candidates for the AI's closed-list selection.
export const VEC_URL = '../data/vec/bge_m3_p256_int8.bin';
export const VEC_DIM = 256;

let vecP = null;
export function loadVectors(fetchImpl = fetch, url = VEC_URL) {
  if (!vecP) vecP = fetchImpl(url).then(r => { if (!r.ok) throw new Error('vectors ' + r.status); return r.arrayBuffer(); })
    .then(b => new Int8Array(b)).catch(e => { vecP = null; throw e; });
  return vecP;
}

// top k verses by cosine similarity (the stored vectors are L2-normalised before int8 quantisation)
export function topK(int8, qv, dim = VEC_DIM, k = 60) {
  const n = Math.floor(int8.length / dim);
  if (!qv || qv.length !== dim || !n) return [];
  let norm = 0; for (let j = 0; j < dim; j++) norm += qv[j] * qv[j];
  norm = Math.sqrt(norm) || 1;
  const q = Float32Array.from(qv, x => x / (127 * norm));
  const scores = new Float32Array(n);
  for (let i = 0, o = 0; i < n; i++, o += dim) {
    let s = 0;
    for (let j = 0; j < dim; j++) s += int8[o + j] * q[j];
    scores[i] = s;
  }
  // partial selection: keep the k best without sorting all 6,236 scores
  const best = [];
  for (let i = 0; i < n; i++) {
    const s = scores[i];
    if (best.length < k) { best.push(i); if (best.length === k) best.sort((a, b) => scores[b] - scores[a]); continue; }
    if (s <= scores[best[k - 1]]) continue;
    let p = k - 1; while (p > 0 && scores[best[p - 1]] < s) { best[p] = best[p - 1]; p--; }
    best[p] = i;
  }
  if (best.length < k) best.sort((a, b) => scores[b] - scores[a]);
  return best.map(i => ({ i, s: scores[i] }));
}
