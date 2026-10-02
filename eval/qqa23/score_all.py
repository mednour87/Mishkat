"""Score every run of runs/<split>/ with the official scorer and write scores_<split>.json (read by the deck)."""
import json, os, subprocess, sys, re
HERE = os.path.dirname(os.path.abspath(__file__))
split = sys.argv[1] if len(sys.argv) > 1 else 'test'
out = {}
for f in sorted(os.listdir(os.path.join(HERE, 'runs', split))):
    if not f.endswith('.tsv'):
        continue
    r = subprocess.run([sys.executable, 'QQA23_TaskA_eval.py', '-r', f'runs/{split}/{f}', '-q', f'QQA23_TaskA_ayatec_v1.2_qrels_{split}.gold'],
                       cwd=HERE, capture_output=True, text=True)
    m = re.findall(r'^\s*([0-9.]+)\s+([0-9.]+)\s*$', r.stdout, re.M)
    if m:
        lines = open(os.path.join(HERE, 'runs', split, f), encoding='utf-8').read().split('\n')
        out[f[:-4]] = {'map10': float(m[-1][0]), 'mrr10': float(m[-1][1]), 'abstain': sum(1 for l in lines if l.split('\t')[2:3] == ['-1'])}
json.dump({'split': split, 'questions': 52 if split == 'test' else None, 'runs': out,
           'published_best': {'map10': 0.3128, 'mrr10': 0.5763, 'source': 'arXiv 2412.11431'}}, open(os.path.join(HERE, f'scores_{split}.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
