// I1 (audit 2026-10-03): the server only embeds + projects the question; the browser ranks the verses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { embedQuery, project, topK as fullTopK } from '../functions/_lib/dense.js';
import { topK } from '../public/js/dense-rank.js';

const V = (f) => new URL(`../public/data/vec/${f}`, import.meta.url);
const full = new Int8Array(readFileSync(V('bge_m3_int8.bin')).buffer.slice(0));
const P = new Float32Array(readFileSync(V('bge_m3_p256_proj.bin')).buffer.slice(0));
const small = new Int8Array(readFileSync(V('bge_m3_p256_int8.bin')).buffer.slice(0));

test('projected files have the expected shapes', () => {
  assert.equal(full.length, 6236 * 1024);
  assert.equal(P.length, 1024 * 256);
  assert.equal(small.length, 6236 * 256);
});

test('embedQuery returns only a 256-d vector, with the projection of the model output', async () => {
  const qv = Array.from({ length: 1024 }, (_, j) => full[5000 * 1024 + j] / 127);   // a verse vector as the "question"
  const env = {
    AI: { run: async () => ({ data: [qv] }) },
    ASSETS: { fetch: async () => new Response(readFileSync(V('bge_m3_p256_proj.bin'))) },
  };
  const r = await embedQuery({ query: 'الصبر' }, env);
  assert.equal(r.ok, true); assert.equal(r.dim, 256); assert.equal(r.qv.length, 256);
  assert.ok(!('ids' in r));
  // the browser ranking of that projected vector finds the verse itself first
  assert.equal(topK(small, r.qv, 256, 5)[0].i, 5000);
});

test('projected ranking agrees with the full 1024-d ranking (top-40 overlap ≥ 0.8 on 50 verses)', () => {
  let ov = 0;
  for (let k = 0; k < 50; k++) {
    const i = (k * 127 + 13) % 6236;
    const qv = Array.from(full.subarray(i * 1024, (i + 1) * 1024), x => x / 127);
    const a = new Set(fullTopK(full, qv, 41).map(x => x.i));
    const b = topK(small, project(qv, P), 256, 41).map(x => x.i);
    ov += b.filter(x => a.has(x)).length / 41;
  }
  assert.ok(ov / 50 >= 0.8, `overlap ${(ov / 50).toFixed(3)}`);
});

test('server work stays far below the 10 ms CPU limit (projection) ', () => {
  const qv = Array.from({ length: 1024 }, () => Math.random() - 0.5);
  project(qv, P);  // warm-up
  const t0 = performance.now();
  for (let k = 0; k < 20; k++) project(qv, P);
  const ms = (performance.now() - t0) / 20;
  assert.ok(ms < 5, `projection ${ms.toFixed(2)} ms`);
});

test('topK: partial selection equals a full sort', () => {
  const qv = Array.from({ length: 256 }, (_, j) => Math.sin(j));
  const got = topK(small, qv, 256, 60).map(x => x.i);
  const n = 6236, s = new Float32Array(n);
  for (let i = 0; i < n; i++) { let t = 0; for (let j = 0; j < 256; j++) t += small[i * 256 + j] * qv[j]; s[i] = t; }
  const ref = Array.from({ length: n }, (_, i) => i).sort((a, b) => s[b] - s[a]).slice(0, 60);
  assert.deepEqual(got, ref);
  assert.deepEqual(topK(small, [1, 2], 256), []);   // wrong dimension → nothing
});
