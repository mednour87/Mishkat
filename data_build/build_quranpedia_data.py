# -*- coding: utf-8 -*-
"""Quranpedia.net official dumps → compact files for Mishkat.

Sources (official versioned dumps, https://api.quranpedia.net/dumps — the
alternative to scraping that Quranpedia asks for; licence in LICENSE.md):
  topics-index.json.gz  الموضوعات القرآنية (6,100 human-curated topics → ayahs)
  surahs.json.gz        معلومات السور (introduction, topics, purposes …)

Outputs:
  public/data/qp_topics.json  {source, version, url, items: [[id, name, parentId|0, [verse idx…]], …]}
  public/data/qp_surahs.json  {source, version, url, items: {n: {intro, topics, purposes, names, descent, words}}}

Every verse reference is checked against the Tanzil text (core.json); a
reference that does not exist is dropped and reported.
  python data_build/build_quranpedia_data.py
"""
import gzip
import html
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, 'cache', 'quranpedia')
DATA = os.path.join(ROOT, 'public', 'data')

core = json.load(open(os.path.join(DATA, 'core.json'), encoding='utf-8'))
SURAS = core['suras']


def idx(ref):
    s, a = (int(x) for x in ref.split(':'))
    if 1 <= s <= 114 and 1 <= a <= SURAS[s - 1]['ayas']:
        return SURAS[s - 1]['first'] + a - 1
    return None


def load(name):
    with gzip.open(os.path.join(CACHE, name), 'rt', encoding='utf-8') as f:
        return json.load(f)


def text(h):
    """HTML → plain text with paragraph breaks (no markup is shipped)."""
    if not h:
        return ''
    h = re.sub(r'(?i)<br\s*/?>|</p>|</li>|</h\d>', '\n', h)
    t = html.unescape(re.sub(r'<[^>]+>', '', h))
    t = re.sub(r'[ \t ]+', ' ', t)
    return re.sub(r'\n\s*\n+', '\n', t).strip()


# ------------------------------------------------------------------ topics
T = load('topics-index.json.gz')
version = T['license'].get('version')
bad = 0
items = []
for t in T['data']:
    refs = [r.strip() for r in (t.get('ayahs') or '').split(',') if r.strip()]
    ids = []
    for r in refs:
        try:
            i = idx(r)
        except ValueError:
            i = None
        if i is None:
            bad += 1
            continue
        if i not in ids:
            ids.append(i)
    items.append([t['id'], re.sub(r'\s+', ' ', t['name']).strip(), t.get('parent_id') or 0, ids])
out = {'source': 'الموسوعة القرآنية — Quranpedia.net (الموضوعات القرآنية)', 'url': 'https://quranpedia.net',
       'dump': 'https://api.quranpedia.net/dumps/topics-index.json.gz', 'version': version, 'items': items}
with open(os.path.join(DATA, 'qp_topics.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
print('topics', len(items), 'with verses', sum(1 for x in items if x[3]), 'dropped refs', bad, 'version', version)

# ------------------------------------------------------------------ surah information
S = load('surahs.json.gz')
sv = S['license'].get('version')
info = {}
for row in S['data']:
    I = row['information']
    g = lambda k: text((I.get(k) or {}).get('value')) if isinstance(I.get(k), dict) else ''
    info[row['surah']] = {'intro': g('introduction'), 'topics': g('topics'), 'purposes': g('purposes'),
                          'names': g('asmaoha'), 'descent': g('descent'), 'words': g('words_count')}
assert len(info) == 114
out = {'source': 'الموسوعة القرآنية — Quranpedia.net (معلومات السور)', 'url': 'https://quranpedia.net',
       'dump': 'https://api.quranpedia.net/dumps/surahs.json.gz', 'version': sv, 'items': info}
with open(os.path.join(DATA, 'qp_surahs.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
print('surahs', len(info), 'version', sv, 'empty intros', sum(1 for v in info.values() if not v['intro']))
for n in (1, 12):
    print(n, info[n]['intro'][:120], '|', info[n]['purposes'][:80])
