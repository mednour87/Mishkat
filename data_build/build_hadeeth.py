"""HadeethEnc → light files for the site (run after fetch_hadeethenc.py).

  public/data/hadeeth/idx_{lang}.json   search text per hadith (title + text + start of the
                                        explanation, without diacritics) — loaded by the search
                                        worker only when a question needs the Sunnah section
  public/data/hadeeth/{lang}/{k}.json   full records (verbatim), 100 per file, loaded on display

Only hadiths graded authentic or good are kept (grades containing ضعيف / موضوع / منكر are dropped —
HadeethEnc selects authentic hadiths, this is a second safeguard).
The raw downloads are moved to data_build/hadeeth_raw/ (not deployed).
"""
import json, os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public', 'data')
OUT = os.path.join(PUB, 'hadeeth')
RAW = os.path.join(ROOT, 'data_build', 'hadeeth_raw')
CHUNK = 100
WEAK = re.compile(r'ضعيف|موضوع|منكر|باطل|لا أصل')
HARAKAT = re.compile(r'[ً-ْٰـ]')


def strip(s):
    return re.sub(r'\s+', ' ', HARAKAT.sub('', s or '')).strip()


def build(lang):
    src = os.path.join(PUB, f'hadeeth_{lang}.json')
    if not os.path.exists(src):
        src = os.path.join(RAW, f'hadeeth_{lang}.json')
    if not os.path.exists(src):
        print('missing', lang)
        return
    with open(src, encoding='utf-8') as fh:
        d = json.load(fh)
    items = [x for x in d['items'] if x.get('text') and not WEAK.search(x.get('grade', ''))]
    items.sort(key=lambda x: x['id'])
    os.makedirs(os.path.join(OUT, lang), exist_ok=True)
    idx = {'source': d['source'], 'url': d['url'], 'fetched': d['fetched'], 'chunk': CHUNK, 'ids': [], 'doc': []}
    for k in range(0, len(items), CHUNK):
        part = items[k:k + CHUNK]
        with open(os.path.join(OUT, lang, f'{k // CHUNK}.json'), 'w', encoding='utf-8') as fh:
            json.dump(part, fh, ensure_ascii=False, separators=(',', ':'))
    for x in items:
        idx['ids'].append(x['id'])
        idx['doc'].append(' | '.join([strip(x['title']), strip(x['text']), strip(x.get('expl', ''))[:350]]))
    with open(os.path.join(OUT, f'idx_{lang}.json'), 'w', encoding='utf-8') as fh:
        json.dump(idx, fh, ensure_ascii=False, separators=(',', ':'))
    os.makedirs(RAW, exist_ok=True)
    if os.path.dirname(src) == PUB:
        shutil.move(src, os.path.join(RAW, os.path.basename(src)))
    print(lang, len(items), 'hadiths; index', os.path.getsize(os.path.join(OUT, f'idx_{lang}.json')) // 1024, 'KB')


if __name__ == '__main__':
    for lang in ('ar', 'en'):
        build(lang)
