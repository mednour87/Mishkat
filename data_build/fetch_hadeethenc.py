"""Download HadeethEnc (موسوعة الأحاديث النبوية المترجمة, hadeethenc.com — sister project of
QuranEnc) through its public API, for the Sunnah section of Mishkat.

Every hadith keeps its text, attribution («متفق عليه», «رواه مسلم»…), grade, the encyclopedia's
explanation, its benefits and its references (book/volume/number), verbatim.
Polite: one request at a time, a pause between requests, resumable cache.

Output: public/data/hadeeth_ar.json, public/data/hadeeth_en.json
        data_build/cache/hadeethenc/  (raw responses, git-ignored)
"""
import json, os, sys, time, urllib.request, urllib.error, urllib.parse, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'data_build', 'cache', 'hadeethenc')
OUT = os.path.join(ROOT, 'public', 'data')
API = 'https://hadeethenc.com/api/v1'
UA = 'Mishkat/1.0 (Quran study site; contact via GitHub mednour87)'
PAUSE = 0.05
os.makedirs(CACHE, exist_ok=True)


def get(path, **params):
    url = f'{API}/{path}/?' + urllib.parse.urlencode(params)
    key = hashlib.sha1(url.encode()).hexdigest()
    f = os.path.join(CACHE, key + '.json')
    if os.path.exists(f):
        with open(f, encoding='utf-8') as fh:
            return json.load(fh)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=40) as r:
                data = json.loads(r.read().decode('utf-8'))
            with open(f, 'w', encoding='utf-8') as fh:
                json.dump(data, fh, ensure_ascii=False)
            time.sleep(PAUSE)
            return data
        except urllib.error.HTTPError as e:
            if e.code == 404:  # no such hadith in this language: remember it, do not retry
                with open(f, 'w', encoding='utf-8') as fh:
                    json.dump({}, fh)
                return {}
            print('retry', attempt, url, e, file=sys.stderr)
            time.sleep(2 + 3 * attempt)
        except Exception as e:  # network hiccup: back off and retry
            print('retry', attempt, url, e, file=sys.stderr)
            time.sleep(2 + 3 * attempt)
    raise RuntimeError('failed ' + url)


def list_lists(x):
    if isinstance(x, list):
        return x
    try:
        v = json.loads(x.replace("'", '"')) if isinstance(x, str) else []
        return v if isinstance(v, list) else []
    except Exception:
        return [s.strip(" '") for s in str(x).strip('[]').split("', '") if s.strip(" '")]


def main():
    cats = get('categories/list', language='ar')
    names = {c['id']: c['title'] for c in cats}
    roots = [c for c in cats if not c.get('parent_id')]
    ids = {}
    for c in roots:
        page = 1
        while True:
            d = get('hadeeths/list', language='ar', category_id=c['id'], page=page, per_page=100)
            for h in d.get('data', []):
                ids.setdefault(h['id'], set()).add(c['id'])
            if page >= int(d['meta']['last_page']):
                break
            page += 1
    print('hadith ids:', len(ids))
    for lang in ('ar', 'en'):
        out = []
        for k, hid in enumerate(sorted(ids, key=int)):
            try:
                h = get('hadeeths/one', language=lang, id=hid)
            except Exception as e:
                print('skip', lang, hid, e, file=sys.stderr)
                continue
            if not isinstance(h, dict) or not h.get('hadeeth'):
                continue
            cat_ids = list_lists(h.get('categories', '[]'))
            out.append({
                'id': int(h['id']),
                'title': h.get('title', ''),
                'text': h.get('hadeeth', ''),
                'by': h.get('attribution', ''),
                'grade': h.get('grade', ''),
                'expl': h.get('explanation', ''),
                'hints': list_lists(h.get('hints', '[]')),
                'ref': h.get('reference', '') if lang == 'ar' else '',
                'cats': [names.get(str(c), '') for c in cat_ids if names.get(str(c))][:3],
            })
            if k % 200 == 0:
                print(lang, k, file=sys.stderr)
        payload = {'source': 'HadeethEnc — موسوعة الأحاديث النبوية المترجمة', 'url': 'https://hadeethenc.com',
                   'lang': lang, 'fetched': time.strftime('%Y-%m-%d'), 'items': out}
        p = os.path.join(OUT, f'hadeeth_{lang}.json')
        with open(p, 'w', encoding='utf-8') as fh:
            json.dump(payload, fh, ensure_ascii=False, separators=(',', ':'))
        print(lang, len(out), 'hadiths →', p, os.path.getsize(p) // 1024, 'KB')


if __name__ == '__main__':
    main()
