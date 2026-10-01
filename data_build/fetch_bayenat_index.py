# -*- coding: utf-8 -*-
"""Index of the questions of «موسوعة بينات» (bayenat.net, Osoul Center) — the
source the challenge reference pack designates for objections (الشبهات).

Only the question TITLES and their URLs are collected (from the category
listings), so Mishkat can point the reader to the full, reviewed answer on
bayenat.net. No answer text is copied. robots.txt asks for 10 s between
requests; this script waits 10 s.

  python data_build/fetch_bayenat_index.py   →  public/data/bayenat_index.json
"""
import html
import json
import os
import re
import sys
import time
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'public', 'data', 'bayenat_index.json')
UA = 'Mishkat/1.0 (Islamic AI Challenge research index; contact: mohamednourbouali87@gmail.com)'
BASE = 'https://bayenat.net/ar'
DELAY = 10


def get(url):
    time.sleep(DELAY)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8', 'ignore')


def clean(t):
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', t))).strip()


home = get(BASE + '/categories')
cats = {}
for cid, name in re.findall(r'href="https://bayenat.net/ar/categories/(\d+)"[^>]*>(.*?)</a>', home, re.S):
    cats[int(cid)] = re.sub(r'\s*\(\d+\)\s*$', '', clean(name))
print('categories', len(cats))

questions = {}
for cid, cname in sorted(cats.items()):
    page = 1
    while True:
        url = f'{BASE}/categories/{cid}' + (f'?page={page}' if page > 1 else '')
        try:
            s = get(url)
        except Exception as e:  # keep going: a missing page must not stop the index
            print('  !', url, e)
            break
        main = s[s.find('<main'):s.find('</main>')] if '<main' in s else s
        found = 0
        for href, title in re.findall(r'href="(https://bayenat.net/ar/category/(?:articles/)?[\d/]+)"[^>]*>(.*?)</a>', main, re.S):
            t = clean(title)
            if len(t) < 6 or href in questions:
                continue
            questions[href] = {'q': t, 'url': href, 'cat': cname, 'catId': cid}
            found += 1
        print(f'  {cid} {cname} p{page}: +{found} (total {len(questions)})')
        if found == 0 or f'page={page + 1}' not in s:
            break
        page += 1

data = {
    'source': 'موسوعة بينات — مركز أصول (bayenat.net)',
    'url': 'https://bayenat.net/ar',
    'note': 'Question titles and links only; answers are read on bayenat.net.',
    'fetched': time.strftime('%Y-%m-%d'),
    'items': sorted(questions.values(), key=lambda x: (x['catId'], x['url'])),
}
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
print('saved', OUT, len(data['items']))
