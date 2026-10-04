"""T070 (4 Oct 2026): the deployed pipeline on Qur'an QA 2023 Task A (test), three runs on Groq's FREE tier only
(eval/qqa23/run_free3.sh). Per-question scores exactly as the official scorer (pytrec_eval; no-answer questions
1/0), for each run, then the mean of the three runs per question; 95 % bootstrap intervals (2,000 samples of the
52 questions, seed 42) for each run and for the 3-run mean; run-to-run spread. Writes ci_free3.json.
  python eval/qqa23/score_free3.py
"""
import json, os, re, sys
import numpy as np
import pytrec_eval

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import QQA23_TaskA_eval as off   # official helpers (reading files, zero-answer rule)

qrels = off.read_qrels_file(os.path.join(HERE, 'QQA23_TaskA_ayatec_v1.2_qrels_test.gold'))
zero = set(qrels.loc[qrels['docid'] == '-1', 'qid'].values)
qn = qrels.loc[~qrels['qid'].isin(zero)]
qids = sorted(set(qrels['qid'].values))
ev = pytrec_eval.RelevanceEvaluator(off.convert_to_dict(qn, 'qid', 'docid', 'relevance'), {'map_cut_10', 'recip_rank'})


def per_question(path):
    run = off.read_run_file(path)
    out = {}
    for q in zero:
        rows = run.loc[run['qid'] == q]
        ok = len(rows) == 1 and rows['docid'].values[0] == '-1'
        out[q] = (float(ok), float(ok))
    res = ev.evaluate(off.convert_to_dict(run.loc[~run['qid'].isin(zero)], 'qid', 'docid', 'score'))
    for q in qids:
        if q not in zero:
            r = res.get(q)
            out[q] = (r['map_cut_10'], r['recip_rank']) if r else (0.0, 0.0)
    abstain = sum(1 for q in qids if len(run.loc[run['qid'] == q]) == 1 and run.loc[run['qid'] == q]['docid'].values[0] == '-1')
    return out, abstain


D = os.path.join(HERE, 'runs', 'free3')
rng = np.random.default_rng(42)
B = 2000
idx = rng.integers(0, len(qids), size=(B, len(qids)))
ci = lambda v: [round(float(np.percentile(v, 2.5)), 3), round(float(np.percentile(v, 97.5)), 3)]
out = {'date': '2026-10-04', 'split': 'test', 'questions': len(qids), 'provider': 'Groq free tier only (FREE_ONLY=1)',
       'bootstrap': B, 'seed': 42, 'runs': {}, 'published_best': {'map10': 0.3128, 'mrr10': 0.5763, 'source': 'arXiv 2412.11431'}}
M, R = [], []
for k in (1, 2, 3):
    p = os.path.join(D, f'run{k}.tsv')
    if not os.path.exists(p):
        continue
    pq, ab = per_question(p)
    m = np.array([pq[q][0] for q in qids]); r = np.array([pq[q][1] for q in qids])
    log = os.path.join(D, f'run{k}.log')
    fails = None
    if os.path.exists(log):
        mm = re.search(r'failed AI calls: (\d+)', open(log, encoding='utf-8', errors='ignore').read())
        fails = int(mm.group(1)) if mm else None
    out['runs'][f'run{k}'] = {'map10': round(float(m.mean()), 3), 'map10_ci': ci(m[idx].mean(1)), 'mrr10': round(float(r.mean()), 3),
                              'mrr10_ci': ci(r[idx].mean(1)), 'abstentions': ab, 'failed_ai_calls': fails}
    M.append(m); R.append(r)
if M:
    m, r = np.mean(M, 0), np.mean(R, 0)
    out['mean_of_runs'] = {'n_runs': len(M), 'map10': round(float(m.mean()), 3), 'map10_ci': ci(m[idx].mean(1)),
                           'mrr10': round(float(r.mean()), 3), 'mrr10_ci': ci(r[idx].mean(1)),
                           'map10_spread': [round(float(min(x.mean() for x in M)), 3), round(float(max(x.mean() for x in M)), 3)],
                           'mrr10_spread': [round(float(min(x.mean() for x in R)), 3), round(float(max(x.mean() for x in R)), 3)]}
    pb = out['published_best']
    out['mean_of_runs']['published_best_inside_ci'] = {
        'map10': out['mean_of_runs']['map10_ci'][0] <= pb['map10'] <= out['mean_of_runs']['map10_ci'][1],
        'mrr10': out['mean_of_runs']['mrr10_ci'][0] <= pb['mrr10'] <= out['mean_of_runs']['mrr10_ci'][1]}
json.dump(out, open(os.path.join(HERE, 'ci_free3.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
