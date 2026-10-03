# -*- coding: utf-8 -*-
"""Page and juz' boundaries of the Madina Mushaf (604 pages, 30 juz'), from the Tanzil metadata
(source S1, same project as the verse text): https://tanzil.net/res/text/metadata/quran-data.xml

Output: public/data/mushaf_meta.json
  { source, pages: [index of the first verse of page 1..604], juz: [index of the first verse of juz' 1..30] }
Verse index = position 0..6235 in core.json. Used by the khatma plan (public/js/khatma.js).
"""
import json
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://tanzil.net/res/text/metadata/quran-data.xml'
cache = ROOT / 'data_build' / 'cache' / 'tanzil_quran-data.xml'
if not cache.exists():
    req = urllib.request.Request(URL, headers={'User-Agent': 'Mishkat data build'})
    cache.write_bytes(urllib.request.urlopen(req, timeout=60).read())
root = ET.fromstring(cache.read_bytes())

core = json.loads((ROOT / 'public' / 'data' / 'core.json').read_text(encoding='utf-8'))
first = {s['n']: s['first'] for s in core['suras']}
idx = lambda e: first[int(e.get('sura'))] + int(e.get('aya')) - 1

pages = [idx(e) for e in root.find('pages').findall('page')]
juz = [idx(e) for e in root.find('juzs').findall('juz')]
assert len(pages) == 604 and len(juz) == 30, (len(pages), len(juz))
assert pages == sorted(pages) and juz == sorted(juz) and pages[0] == 0 and juz[0] == 0
out = {'source': 'Tanzil quran-data.xml (' + URL + ')', 'pages': pages, 'juz': juz}
(ROOT / 'public' / 'data' / 'mushaf_meta.json').write_text(json.dumps(out, separators=(',', ':')), encoding='utf-8')
print('pages', len(pages), 'juz', len(juz), 'juz 30 starts at verse index', juz[29])
