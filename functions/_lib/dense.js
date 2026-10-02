// Semantic neighbours of a question among the 6,236 verses.
// Verse vectors: bge-m3 on «verse — Al-Mukhtasar tafsir», L2-normalised, int8 (data_build/build_vectors.py),
// read once per worker isolate from the static file. The question is embedded with the same model
// (Workers AI binding `AI`, or the REST API with CF_ACCOUNT + CF_AI_TOKEN for local runs).
// Only verse REFERENCES and scores are returned — candidates for the closed-list AI selection.
const MODEL = '@cf/baai/bge-m3';
const DIM = 1024;
const VEC_PATH = '/data/vec/bge_m3_int8.bin';
let VEC = null, REFS = null;

export function setVectors(int8, refs) { VEC = int8; REFS = refs; }   // tests / local server

async function vectors(env) {
  if (VEC) return VEC;
  if (!env.ASSETS) throw new Error('vectors unavailable');
  const r = await env.ASSETS.fetch(new Request('https://assets.local' + VEC_PATH));
  if (!r.ok) throw new Error('vectors HTTP ' + r.status);
  VEC = new Int8Array(await r.arrayBuffer());
  return VEC;
}

async function embed(text, env, fetchImpl) {
  if (env.AI && env.AI.run) {
    const out = await env.AI.run(MODEL, { text: [text] });
    return out.data[0];
  }
  if (env.CF_ACCOUNT && env.CF_AI_TOKEN) {
    const r = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT}/ai/run/${MODEL}`, {
      method: 'POST', headers: { authorization: `Bearer ${env.CF_AI_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ text: [text] }),
    });
    const j = await r.json();
    if (!j.success) throw new Error('embedding failed');
    return j.result.data[0];
  }
  throw new Error('no embedding model configured');
}

// refs: verse index → "s:a" (built from core.json's surah table by the caller once)
export function topK(int8, qv, k = 60) {
  const n = int8.length / DIM;
  let norm = 0; for (let j = 0; j < DIM; j++) norm += qv[j] * qv[j];
  norm = Math.sqrt(norm) || 1;
  const scores = new Float32Array(n);
  for (let i = 0, o = 0; i < n; i++, o += DIM) {
    let s = 0;
    for (let j = 0; j < DIM; j++) s += int8[o + j] * qv[j];
    scores[i] = s / (127 * norm);
  }
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => scores[b] - scores[a]).slice(0, k);
  return idx.map(i => ({ i, s: scores[i] }));
}

let SURA_FIRST = null;
async function refsOf(env) {
  if (REFS) return REFS;
  const r = await env.ASSETS.fetch(new Request('https://assets.local/data/core.json'));
  const core = await r.json();
  REFS = [];
  for (const s of core.suras) for (let a = 1; a <= s.ayas; a++) REFS[s.first + a - 1] = `${s.n}:${a}`;
  return REFS;
}

export async function denseSearch(body, env, fetchImpl = fetch) {
  const q = String(body && body.query || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (q.length < 2) return { ok: false, error: 'query too short' };
  const [int8, refs, qv] = await Promise.all([vectors(env), refsOf(env), embed(q, env, fetchImpl)]);
  const top = topK(int8, qv, 60);
  return { ok: true, model: MODEL, ids: top.map(x => refs[x.i]), scores: top.map(x => Math.round(x.s * 1000) / 1000) };
}
