"""95 % confidence intervals of MAP@10 / MRR@10 for every run (audit V2, 2026-10-03).

Per-question scores are computed exactly like the official scorer QQA23_TaskA_eval.py (pytrec_eval for the
questions with answers; 1/0 for the no-answer questions), then resampled: 2,000 bootstrap samples of the
52 questions, seed 42, percentile intervals. Also paired differences between runs (same questions).
Writes ci_<split>.json and prints a Markdown table.
"""
import json, os, sys
import numpy as np
import pandas as pd
import pytrec_eval

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import QQA23_TaskA_eval as off   # official helpers (reading files, zero-answer rule)

split = sys.argv[1] if len(sys.argv) > 1 else 'test'
qrels = off.read_qrels_file(os.path.join(HERE, f'QQA23_TaskA_ayatec_v1.2_qrels_{split}.gold'))
zero = set(qrels.loc[qrels['docid'] == '-1', 'qid'].values)
qn = qrels.loc[~qrels['qid'].isin(zero)]
qids = sorted(set(qrels['qid'].values))
qd = off.convert_to_dict(qn, 'qid', 'docid', 'relevance')
ev = pytrec_eval.RelevanceEvaluator(qd, {'map_cut_10', 'recip_rank'})


def per_question(run_path):
    run = off.read_run_file(run_path)
    out = {}
    for q in qids:
        rows = run.loc[run['qid'] == q]
        if q in zero:
            ok = len(rows) == 1 and rows['docid'].values[0] == '-1'
            out[q] = (float(ok), float(ok))
    res = ev.evaluate(off.convert_to_dict(run.loc[~run['qid'].isin(zero)], 'qid', 'docid', 'score'))
    for q in qids:
        if q in zero:
            continue
        r = res.get(q)
        out[q] = (r['map_cut_10'], r['recip_rank']) if r else (0.0, 0.0)   # question missing from the run → 0
    return out


runs = {}
for f in sorted(os.listdir(os.path.join(HERE, 'runs', split))):
    if f.endswith('.tsv'):
        runs[f[:-4]] = per_question(os.path.join(HERE, 'runs', split, f))

rng = np.random.default_rng(42)
B = 2000
idx = rng.integers(0, len(qids), size=(B, len(qids)))
ci = lambda v: [float(np.percentile(v, 2.5)), float(np.percentile(v, 97.5))]
out = {'split': split, 'questions': len(qids), 'bootstrap': B, 'seed': 42, 'runs': {}, 'paired': {}}
print(f'| Run | MAP@10 [95 % CI] | MRR@10 [95 % CI] |\n|---|---|---|')
for name, pq in runs.items():
    m = np.array([pq[q][0] for q in qids]); r = np.array([pq[q][1] for q in qids])
    bm, br = m[idx].mean(1), r[idx].mean(1)
    out['runs'][name] = {'map10': float(m.mean()), 'map10_ci': ci(bm), 'mrr10': float(r.mean()), 'mrr10_ci': ci(br)}
    print(f'| {name} | {m.mean():.3f} [{ci(bm)[0]:.3f}–{ci(bm)[1]:.3f}] | {r.mean():.3f} [{ci(br)[0]:.3f}–{ci(br)[1]:.3f}] |')
names = list(runs)
for a in names:
    for b in names:
        if a >= b:
            continue
        d = np.array([runs[a][q][1] - runs[b][q][1] for q in qids])
        out['paired'][f'{a} - {b} (MRR)'] = {'diff': float(d.mean()), 'ci': ci(d[idx].mean(1))}
pub = {'map10': 0.3128, 'mrr10': 0.5763}
for name, v in out['runs'].items():
    v['published_best_inside_ci'] = {'map10': v['map10_ci'][0] <= pub['map10'] <= v['map10_ci'][1], 'mrr10': v['mrr10_ci'][0] <= pub['mrr10'] <= v['mrr10_ci'][1]}
json.dump(out, open(os.path.join(HERE, f'ci_{split}.json'), 'w'), indent=1)
print(json.dumps(out['paired'], indent=1))
