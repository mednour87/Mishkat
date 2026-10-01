# -*- coding: utf-8 -*-
"""Collects real public question titles from Islam Stack Exchange (official API,
content licensed CC BY-SA 4.0). Only the title text is kept — no user names,
no ids of people, no bodies — so the test set contains no personal data.
  python eval/collect_forum.py → eval/forum_questions.json
"""
import json
import os
import sys
import time

import requests

sys.stdout.reconfigure(encoding='utf-8')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'forum_questions.json')
TAGS = ['quran', 'tafsir', 'quran-interpretation', 'prophets', 'afterlife', 'women', 'jihad', 'aqeedah', 'jesus', 'interfaith', 'salah', 'fasting']
seen, rows = set(), []
for tag in TAGS:
    url = ('https://api.stackexchange.com/2.3/questions?order=desc&sort=votes&site=islam'
           f'&tagged={tag}&pagesize=40&filter=!-MOiNm40F1U019gR)UUjNV-IQScciBJZ0')
    r = requests.get(url, timeout=60)
    if r.status_code != 200:
        print('HTTP', r.status_code, tag); continue
    for q in r.json().get('items', []):
        t = q.get('title', '').replace('&#39;', "'").replace('&quot;', '"').replace('&amp;', '&').strip()
        if t and t.lower() not in seen:
            seen.add(t.lower()); rows.append({'tag': tag, 'q': t})
    time.sleep(1.2)
json.dump({'source': 'Islam Stack Exchange (api.stackexchange.com), titles only, CC BY-SA 4.0',
           'questions': rows}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(rows), 'questions')
