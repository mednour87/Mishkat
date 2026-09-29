# -*- coding: utf-8 -*-
"""Second batch of frozen sources (Quran.com API v4, verbatim):
  - Tafsir As-Sa'di (tafsir id 91, Arabic) — تيسير الكريم الرحمن في تفسير كلام المنان
  - Word-level timing segments of Sheikh Mishary Alafasy's recitation (recitation 7)
    used for word-synchronised reading.
Appends to cache/manifest.json like fetch_sources.py.
"""
import datetime
import hashlib
import json
import os
import sys
import time

import requests

sys.stdout.reconfigure(encoding='utf-8')
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cache')
S = requests.Session()
S.headers['User-Agent'] = 'Mishkat-build/1.0 (Islamic AI Challenge 2026)'


def get_json(url, tries=5):
    for k in range(tries):
        try:
            r = S.get(url, timeout=60)
            if r.status_code == 200:
                return r.json()
            print('  HTTP', r.status_code, url)
        except Exception as e:
            print('  retry', k + 1, e)
        time.sleep(2 * (k + 1))
    raise RuntimeError(url)


def save(name, obj, manifest, url):
    data = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    with open(os.path.join(CACHE, name), 'wb') as f:
        f.write(data)
    manifest[name] = {'url': url, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data),
                      'fetched': datetime.datetime.now(datetime.timezone.utc).isoformat()}


def main():
    mpath = os.path.join(CACHE, 'manifest.json')
    manifest = json.load(open(mpath, encoding='utf-8'))

    name = 'qurancom_tafsir_saadi.json'
    if not os.path.exists(os.path.join(CACHE, name)):
        rows = []
        for s in range(1, 115):
            page = 1
            while True:
                d = get_json(f'https://api.quran.com/api/v4/tafsirs/91/by_chapter/{s}?per_page=50&page={page}')
                for t in d['tafsirs']:
                    a, b = t['verse_key'].split(':')
                    rows.append({'s': int(a), 'a': int(b), 't': t['text']})
                nxt = d['pagination'].get('next_page')
                if not nxt:
                    break
                page = nxt
            time.sleep(0.1)
        save(name, rows, manifest, 'https://api.quran.com/api/v4/tafsirs/91/by_chapter/<1..114>')
        print('OK saadi', len(rows))

    name = 'qurancom_segments_alafasy.json'
    if not os.path.exists(os.path.join(CACHE, name)):
        rows = []
        for s in range(1, 115):
            page = 1
            while True:
                d = get_json(f'https://api.quran.com/api/v4/verses/by_chapter/{s}?audio=7&per_page=50&page={page}&words=false')
                for v in d['verses']:
                    a, b = v['verse_key'].split(':')
                    au = v.get('audio') or {}
                    rows.append({'s': int(a), 'a': int(b), 'url': au.get('url'),
                                 'seg': [[x[1], x[2], x[3]] for x in (au.get('segments') or []) if len(x) >= 4]})
                nxt = d['pagination'].get('next_page')
                if not nxt:
                    break
                page = nxt
            time.sleep(0.1)
        assert len(rows) == 6236, len(rows)
        save(name, rows, manifest, 'https://api.quran.com/api/v4/verses/by_chapter/<1..114>?audio=7')
        print('OK segments', len(rows))

    with open(mpath, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
