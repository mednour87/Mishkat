# -*- coding: utf-8 -*-
"""Surah sciences from Al-Jamhara (islamic-content.com, «علوم السور»), a source of the challenge's
reference pack (topics of da'wah and Islamic content).

For each of the 114 surahs (page /t/{14+n}) it keeps, verbatim:
  - intro   : the opening paragraph (what the surah is about)
  - topics  : «موضوعاتها» — numbered topics with their verse ranges (data-ayah-from / data-ayah-to)
              and the work the page cites for them («ينظر: …»)
  - aims    : «مقاصدها» — the aims of the surah, with its citation
Quran quotations inside these texts are replaced by markers {{Q:s:a}}: the page shows the verse from
Tanzil (rule: a verse is always the Tanzil text). Nothing else is kept (no hadith sections: a hadith is
shown only with a grade from the reference pack's hadith sources).

robots.txt of islamic-content.com allows /t/ (only /admin/, /api/, /config/ are disallowed);
one request every 3 seconds, cached in data_build/cache/jamhara/.

usage: python data_build/build_surah_sciences.py   → public/data/surah_sciences.json
"""
import html
import json
import os
import re
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'data_build', 'cache', 'jamhara')
OUT = os.path.join(ROOT, 'public', 'data', 'surah_sciences.json')
UA = 'Mishkat/1.0 (Islamic AI Challenge - Quran search; contact: mohamednourbouali87@gmail.com)'
os.makedirs(CACHE, exist_ok=True)


def fetch(n):
    path = os.path.join(CACHE, f't{14 + n}.html')
    if os.path.exists(path) and os.path.getsize(path) > 5000:
        return open(path, encoding='utf-8').read()
    req = urllib.request.Request(f'https://islamic-content.com/t/{14 + n}', headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        s = r.read().decode('utf-8')
    open(path, 'w', encoding='utf-8').write(s)
    time.sleep(3)
    return s


def quran_markers(h):
    # <span data-quranpedia='surah=12&ayah=67'> … ﴿…﴾ … </span> [يوسف: 67] → {{Q:12:67}}
    h = re.sub(r"<span[^>]*data-quranpedia='surah=(\d+)&(?:amp;)?ayah=(\d+)'[^>]*>.*?﴾\s*(?:</span>\s*)+(?:<span>)?\s*\[[^\]]{2,30}\]\s*(?:</span>)?",
               lambda m: f' {{{{Q:{m.group(1)}:{m.group(2)}}}}} ', h, flags=re.S)
    return h


def plain(h):
    h = re.sub(r"<span class='font-0'>(.*?)</span>", r'\1', h)          # «عليه السلام», «ﷺ» written for screen readers
    h = re.sub(r'<[^>]+>', ' ', h)
    h = html.unescape(h).replace('​', '')
    return re.sub(r'\s+', ' ', h).strip()


def card(s, title):
    m = re.search(r'<h4[^>]*>\s*' + title + r'\s*</h4>(.*?)(?=<h4[^>]*>|<a href="https://quranpedia\.net/surah|<footer)', s, flags=re.S)
    return m.group(1) if m else ''


def parse(n, s):
    out = {'sura': n, 'url': f'https://islamic-content.com/t/{14 + n}'}
    m = re.search(r'author-description[^>]*>(.*?)</div>', s, flags=re.S)
    out['intro'] = plain(quran_markers(m.group(1))) if m else ''
    t = card(s, 'موضوعاتها')
    topics, lead, cite = [], '', ''
    for p in re.findall(r'<p>(.*?)</p>', t, flags=re.S):
        rng = re.findall(r"data-ayah-from='(\d+)' data-ayah-to='(\d+)'", p)
        txt = plain(quran_markers(p))
        if rng:
            title = re.sub(r'^\s*\d+\s*[.\-–]\s*', '', re.sub(r'\(\s*[\d\s\-–،,]+\)\s*\.?\s*$', '', txt)).strip(' .')
            topics.append({'title': title, 'ranges': [[int(a), int(b)] for a, b in rng]})
        elif txt.startswith('ينظر'):
            cite = txt
        elif txt and not topics:
            lead = txt
    out['topics'] = topics
    out['topicsLead'] = lead
    out['topicsCite'] = cite
    a = card(s, 'مقاصدها')
    paras = [plain(quran_markers(p)) for p in re.findall(r'<p>(.*?)</p>', a, flags=re.S)]
    paras = [p for p in paras if p]
    out['aimsCite'] = next((p for p in paras if p.startswith('ينظر')), '')
    out['aims'] = [p for p in paras if not p.startswith('ينظر')]
    return out


def main():
    res = []
    for n in range(1, 115):
        s = fetch(n)
        d = parse(n, s)
        if not d['intro'] and not d['topics']:
            print('WARNING empty', n)
        res.append(d)
        print(n, len(d['topics']), 'topics', len(d['aims']), 'aims', flush=True)
    json.dump({'source': 'موسوعة الجمهرة — علوم السور (islamic-content.com)',
               'sourceEn': 'Al-Jamhara encyclopedia — sciences of the surahs (islamic-content.com)',
               'note': 'verbatim; Quran quotations as {{Q:s:a}} markers shown from Tanzil',
               'built': time.strftime('%Y-%m-%d'), 'suras': res},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('written', OUT)


if __name__ == '__main__':
    main()
