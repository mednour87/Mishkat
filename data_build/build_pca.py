"""Compact verse vectors for the semantic search run IN THE BROWSER (audit I1, 2026-10-03).

The free Cloudflare plan allows 10 ms of CPU per request; a top-k over 6,236 x 1024 int8 vectors
costs 26-63 ms. So the server now only embeds the question (bge-m3, Workers AI) and projects it
on D principal axes (D x 1024 multiply-adds, < 1 ms); the page's Web Worker holds the projected
verse vectors and ranks them.

Projection: uncentred SVD of the L2-normalised verse vectors (it keeps dot products best in the
least-squares sense), then each projected verse vector is re-normalised and quantised to int8.

Inputs : public/data/vec/bge_m3_int8.bin (6236 x 1024 int8, scale 127)
Outputs: public/data/vec/bge_m3_p{D}_int8.bin   (6236 x D int8, browser)
         public/data/vec/bge_m3_p{D}_proj.bin   (1024 x D float32, server: query projection)
         public/data/vec/meta_p{D}.json
Also prints the overlap of the top-40 neighbours (full 1024 vs projected) on 400 verses used as
queries, the recall check behind the choice of D.
"""
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'data' / 'vec'
X = np.fromfile(ROOT / 'bge_m3_int8.bin', dtype=np.int8).astype(np.float32).reshape(-1, 1024) / 127.0
X /= np.linalg.norm(X, axis=1, keepdims=True)
n = X.shape[0]
_, _, Vt = np.linalg.svd(X, full_matrices=False)

rng = np.random.default_rng(42)
probe = rng.choice(n, 400, replace=False)
full_top = np.argsort(-(X[probe] @ X.T), axis=1)[:, 1:41]

dims = [int(a) for a in sys.argv[1:]] or [128, 256, 384]
for D in dims:
    P = Vt[:D].T.astype(np.float32)               # 1024 x D
    Y = X @ P
    Y /= np.linalg.norm(Y, axis=1, keepdims=True)
    Yq = np.clip(np.round(Y * 127), -127, 127).astype(np.int8)
    Yd = Yq.astype(np.float32)
    top = np.argsort(-((X[probe] @ P) @ Yd.T), axis=1)[:, 1:41]
    overlap = np.mean([len(set(a) & set(b)) / 40 for a, b in zip(full_top, top)])
    print(f'D={D}: top-40 overlap with full 1024-d = {overlap:.3f}; size {Yq.nbytes/1e6:.2f} MB')
    Yq.tofile(ROOT / f'bge_m3_p{D}_int8.bin')
    P.tofile(ROOT / f'bge_m3_p{D}_proj.bin')
    (ROOT / f'meta_p{D}.json').write_text(json.dumps({
        'model': '@cf/baai/bge-m3', 'n': n, 'dim': D, 'from_dim': 1024, 'dtype': 'int8', 'scale': 127,
        'projection': 'uncentred SVD of L2-normalised verse vectors; query q -> q @ P (P is 1024 x D, float32, row-major)',
        'top40_overlap_with_full': round(float(overlap), 3), 'built': '2026-10-03'}, indent=1))
