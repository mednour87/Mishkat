"""T099 — tajweed colours for the reader, from the open annotation of the Qur'an (riwayat Hafs) by cpfair/quran-tajweed
(data under CC BY 4.0; offsets in Unicode code points of the Tanzil Uthmani text).

The offsets were computed on a Tanzil copy of 2017; ours (core.json) may differ slightly in encoding. So every verse is
CHECKED before use: each annotation must start on a letter that the rule can start on (hamzat al-wasl on «ٱ», lam
shamsiyya on «ل», qalqala on ق ط ب ج د, ghunna/ikhfa/idgham/iqlab on ن م or a tanween…). A verse with a single
annotation that does not fit is left without colours (never a colour on the wrong letter).

  python data_build/build_tajweed.py <tajweed.hafs.uthmani-pause-sajdah.json>
  → public/data/tajweed/{1..114}.json : [[ [start, end, ruleIndex], ... ] per verse]  (offsets in the core.json verse)
  → public/data/tajweed/meta.json     : rules, coverage, source, licence
"""
import json, sys, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
core = json.load(open(os.path.join(ROOT, 'public/data/core.json'), encoding='utf-8'))
ann = json.load(open(sys.argv[1], encoding='utf-8'))

RULES = ['ghunnah', 'idghaam_ghunnah', 'idghaam_no_ghunnah', 'idghaam_mutajanisayn', 'idghaam_mutaqaribayn', 'idghaam_shafawi',
         'ikhfa', 'ikhfa_shafawi', 'iqlab', 'madd_2', 'madd_246', 'madd_munfasil', 'madd_muttasil', 'madd_6', 'qalqalah',
         'hamzat_wasl', 'lam_shamsiyyah', 'silent']
TANWEEN = set('ًࣰٌࣱٍࣲ')
NOON_MEEM = set('نم') | TANWEEN
MADD_LET = set('اويىٰۦۧـٓ') | {'ٰ', 'ۥ', 'ۦ', 'ٓ'}
OK_START = {
    'hamzat_wasl': set('ٱ'), 'lam_shamsiyyah': set('ل'), 'qalqalah': set('قطبجد'),
    'ghunnah': set('نم'), 'idghaam_ghunnah': NOON_MEEM, 'idghaam_no_ghunnah': NOON_MEEM, 'ikhfa': NOON_MEEM, 'iqlab': NOON_MEEM | {'ۢ', 'ۭ'},
    'idghaam_shafawi': set('م'), 'ikhfa_shafawi': set('م'),
}
def fits(text, a):
    s, e, r = a['start'], a['end'], a['rule']
    if r not in RULES or s < 0 or e > len(text) or s >= e: return False
    seg = text[s:e]
    if r in OK_START:
        return any(c in OK_START[r] for c in seg)
    if r.startswith('madd'):
        return any(c in MADD_LET for c in seg)
    return True   # idghaam_mutajanisayn / mutaqaribayn / silent: any letter

out = collections.defaultdict(dict)
stats = collections.Counter()
for row in ann:
    s, a = row['surah'], row['ayah']
    S = core['suras'][s - 1]
    text = core['verses'][S['first'] + a - 1]
    good = [x for x in row['annotations'] if fits(text, x)]
    stats['verses'] += 1
    stats['annotations'] += len(row['annotations'])
    if len(good) == len(row['annotations']):
        out[s][a] = sorted([[x['start'], x['end'], RULES.index(x['rule'])] for x in good])
        stats['verses_ok'] += 1
        stats['annotations_ok'] += len(good)
    else:
        stats['verses_dropped'] += 1

os.makedirs(os.path.join(ROOT, 'public/data/tajweed'), exist_ok=True)
for s in range(1, 115):
    S = core['suras'][s - 1]
    arr = [out[s].get(a) for a in range(1, S['ayas'] + 1)]
    json.dump(arr, open(os.path.join(ROOT, f'public/data/tajweed/{s}.json'), 'w', encoding='utf-8'), separators=(',', ':'))
meta = {'rules': RULES, 'coverage': {k: stats[k] for k in stats},
        'source': 'https://github.com/cpfair/quran-tajweed (tajweed.hafs.uthmani-pause-sajdah.json)', 'license': 'CC BY 4.0 (annotations); Tanzil.net terms (text)',
        'check': 'each annotation must start on a letter its rule can start on; a verse with one misfit keeps no colour'}
json.dump(meta, open(os.path.join(ROOT, 'public/data/tajweed/meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(meta['coverage']))
