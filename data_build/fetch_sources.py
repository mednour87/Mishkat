# -*- coding: utf-8 -*-
"""Download and freeze every external source used by Mishkat.

All files go to data_build/cache/ verbatim (no modification), together with
a manifest (URL, date, SHA-256, version) so the build is reproducible and any
upstream change is detected.

Sources:
  - QuranEnc.com API v1 (tafsir / translations, verbatim redistribution allowed
    with attribution and without modification)
  - Quran.com API v4: chapter names (en/fr) and the imla'i script of the verses
    (used ONLY as a search index; never displayed)
"""
import hashlib
import json
import os
import sys
import time
import datetime

import requests

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
os.makedirs(CACHE, exist_ok=True)

QURANENC_KEYS = ['arabic_mokhtasar', 'arabic_moyassar', 'english_mokhtasar',
                 'french_mokhtasar', 'english_saheeh', 'french_rashid']
S = requests.Session()
S.headers['User-Agent'] = 'Mishkat-build/1.0 (Islamic AI Challenge 2026)'


def get_json(url, tries=5):
    for k in range(tries):
        try:
            r = S.get(url, timeout=60)
            if r.status_code == 200:
                return r.json()
            print('  HTTP', r.status_code, url)
        except Exception as e:  # network hiccup
            print('  retry', k + 1, e)
        time.sleep(2 * (k + 1))
    raise RuntimeError('failed: ' + url)


def save(name, obj, manifest, url):
    path = os.path.join(CACHE, name)
    data = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    with open(path, 'wb') as f:
        f.write(data)
    manifest[name] = {'url': url, 'sha256': hashlib.sha256(data).hexdigest(),
                      'bytes': len(data),
                      'fetched': datetime.datetime.now(datetime.timezone.utc).isoformat()}


def main():
    mpath = os.path.join(CACHE, 'manifest.json')
    manifest = json.load(open(mpath, encoding='utf-8')) if os.path.exists(mpath) else {}

    # translation metadata (versions)
    lst = get_json('https://quranenc.com/api/v1/translations/list')
    meta = {t['key']: t for t in lst['translations'] if t['key'] in QURANENC_KEYS}
    save('quranenc_meta.json', meta, manifest, 'https://quranenc.com/api/v1/translations/list')
    print('QuranEnc versions:', {k: v.get('version') for k, v in meta.items()})

    for key in QURANENC_KEYS:
        name = f'quranenc_{key}.json'
        if os.path.exists(os.path.join(CACHE, name)):
            print('skip', name)
            continue
        rows = []
        for s in range(1, 115):
            url = f'https://quranenc.com/api/v1/translation/sura/{key}/{s}'
            res = get_json(url)['result']
            for r in res:
                rows.append({'s': int(r['sura']), 'a': int(r['aya']),
                             't': r.get('translation') or '',
                             'f': r.get('footnotes') or ''})
            time.sleep(0.15)
        assert len(rows) == 6236, (key, len(rows))
        save(name, rows, manifest, f'https://quranenc.com/api/v1/translation/sura/{key}/<1..114>')
        print('OK', key, len(rows))

    for lang in ('en', 'fr', 'ar'):
        name = f'qurancom_chapters_{lang}.json'
        url = f'https://api.quran.com/api/v4/chapters?language={lang}'
        save(name, get_json(url)['chapters'], manifest, url)

    name = 'qurancom_imlaei.json'
    if not os.path.exists(os.path.join(CACHE, name)):
        rows = []
        for s in range(1, 115):
            url = f'https://api.quran.com/api/v4/quran/verses/imlaei?chapter_number={s}'
            for v in get_json(url)['verses']:
                a, b = v['verse_key'].split(':')
                rows.append({'s': int(a), 'a': int(b), 't': v['text_imlaei']})
            time.sleep(0.1)
        assert len(rows) == 6236, len(rows)
        save(name, rows, manifest, 'https://api.quran.com/api/v4/quran/verses/imlaei?chapter_number=<1..114>')
        print('OK imlaei')

    with open(mpath, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print('manifest written:', len(manifest), 'files')


if __name__ == '__main__':
    main()
