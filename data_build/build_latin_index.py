"""Latin word index: the word-by-word transliteration of Quran.com (public/data/translit/*.json)
-> public/data/latin_index.json  {"v": 1, "forms": {"mishkatin": [verse indices...], ...}}

Used only to FIND verses when a visitor types an Arabic word in Latin letters ("mishkat",
"sabr", "kawthar"); nothing of it is shown. A form is the transliterated word in lower
case, without diacritics, apostrophes or hyphens, with the article and the one-letter
proclitics removed (al-, wa-, fa-, bi-, li-, ka-).
"""
import json, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / 'public' / 'data'
core = json.loads((D / 'core.json').read_text(encoding='utf-8'))


def norm(w):
    w = unicodedata.normalize('NFD', w.lower())
    w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    w = w.replace('ʿ', '').replace('ʾ', '').replace("'", '').replace('`', '')
    return re.sub(r'[^a-z\-]', '', w)


def forms(w):
    w = norm(w)
    out = set()
    parts = [p for p in w.split('-') if p]
    if not parts:
        return out
    base = parts[-1]                      # "wal-arḍi" -> "ardi", "l-samāwāti" -> "samawati"
    out.add(base)
    joined = ''.join(parts)
    out.add(joined)
    for pre in ('wa', 'fa', 'bi', 'li', 'ka', 'la', 'sa'):
        if joined.startswith(pre) and len(joined) - len(pre) >= 3:
            out.add(joined[len(pre):])
    return {f for f in out if len(f) >= 3}


index = {}
for s in core['suras']:
    t = json.loads((D / 'translit' / f"{s['n']}.json").read_text(encoding='utf-8'))
    for a, words in enumerate(t['words']):
        v = s['first'] + a
        for w in words:
            for f in forms(w):
                lst = index.setdefault(f, [])
                if not lst or lst[-1] != v:
                    lst.append(v)

out = {'v': 1, 'source': 'Quran.com word-by-word transliteration (public/data/translit)', 'forms': dict(sorted(index.items()))}
(D / 'latin_index.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(len(index), 'forms', (D / 'latin_index.json').stat().st_size // 1024, 'KiB')
