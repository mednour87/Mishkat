# -*- coding: utf-8 -*-
"""Word-by-word Latin transliteration of the Quran (Quran.com API v4, word field
"transliteration"), frozen in cache/ and written per surah to public/data/translit/<n>.json
as [[word1, word2, …] per verse]. Verbatim, only the trailing verse-number marker dropped.
  python data_build/fetch_translit.py
"""
import datetime
import hashlib
import json
import os
import sys
import time

import requests

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
OUT = os.path.join(os.path.dirname(HERE), 'public', 'data', 'translit')
os.makedirs(OUT, exist_ok=True)
S = requests.Session()
S.headers['User-Agent'] = 'Mishkat-build/1.0 (Islamic AI Challenge 2026)'

name = os.path.join(CACHE, 'qurancom_translit_words.json')
if os.path.exists(name):
    rows = json.load(open(name, encoding='utf-8'))
else:
    rows = {}
    for s in range(1, 115):
        page = 1
        while True:
            for k in range(5):
                r = S.get(f'https://api.quran.com/api/v4/verses/by_chapter/{s}?words=true&word_fields=transliteration&per_page=50&page={page}', timeout=60)
                if r.status_code == 200:
                    break
                time.sleep(2 * (k + 1))
            d = r.json()
            for v in d['verses']:
                rows[v['verse_key']] = [w['transliteration']['text'] for w in v['words']
                                        if w.get('char_type_name') == 'word' and w.get('transliteration', {}).get('text')]
            if not d['pagination'].get('next_page'):
                break
            page = d['pagination']['next_page']
        time.sleep(0.1)
    data = json.dumps(rows, ensure_ascii=False).encode('utf-8')
    open(name, 'wb').write(data)
    mpath = os.path.join(CACHE, 'manifest.json')
    man = json.load(open(mpath, encoding='utf-8'))
    man['qurancom_translit_words.json'] = {'url': 'https://api.quran.com/api/v4/verses/by_chapter/<1..114>?words=true&word_fields=transliteration',
                                           'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data),
                                           'fetched': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    json.dump(man, open(mpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

core = json.load(open(os.path.join(os.path.dirname(OUT), 'core.json'), encoding='utf-8'))
n_ok = 0
for su in core['suras']:
    arr = [rows.get(f"{su['n']}:{a}", []) for a in range(1, su['ayas'] + 1)]
    n_ok += sum(1 for x in arr if x)
    json.dump({'source': 'Quran.com API v4 — word-by-word transliteration', 'words': arr},
              open(os.path.join(OUT, f"{su['n']}.json"), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('verses with transliteration:', n_ok, '/ 6236')
