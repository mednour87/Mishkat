# -*- coding: utf-8 -*-
"""Build the static data consumed by the Mishkat web app (public/data/).

Inputs
  --db      quran.db from the Quran Cartography baseline (words, suras)
  --tanzil  quran-uthmani.txt (Tanzil, verbatim, CC BY 3.0)
  cache/    frozen QuranEnc + Quran.com downloads (fetch_sources.py)

Outputs (public/data/)
  core.json        suras (names ar/en/fr, type, order), verse texts (Uthmani, verbatim)
  search_ar.json   imla'i text of every verse (search index only, never displayed)
  tafsir_<k>.json  6236 strings per source, verbatim
  words.json       display form of the 77,433 words (mushaf order) + verse index
  galaxy.bin       Int16 positions of each word for 2 layouts + Uint8 colour class
  build_info.json  hashes, counts, source versions

Every verse text shown in the app comes from core.json, which is a byte-exact
copy of the Tanzil lines (checked below).
"""
import argparse
import hashlib
import json
import math
import os
import sqlite3
import sys

import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'public', 'data')
BASE = r'F:\القران الكريم\القرآن الكريم\Othmany_Quran\Quran_Cartography\المحرك'

TAFSIR_KEYS = {  # public name -> QuranEnc key
    'mukhtasar_ar': 'arabic_mokhtasar',
    'mukhtasar_en': 'english_mokhtasar',
    'muyassar_ar': 'arabic_moyassar',
    'saheeh_en': 'english_saheeh',
}

# Tafsir works are not in QuranEnc's /translations/list; titles set by hand
# from the QuranEnc browse pages (version = frozen download date, see manifest).
TAFSIR_TITLES = {
    'arabic_mokhtasar': 'المختصر في تفسير القرآن الكريم — مركز تفسير للدراسات القرآنية',
    'english_mokhtasar': 'Al-Mukhtasar in Interpreting the Noble Quran — Tafsir Center for Quranic Studies',
    'french_mokhtasar': 'Al-Mukhtasar dans l’exégèse du Noble Coran — Centre Tafsir des études coraniques',
    'arabic_moyassar': 'التفسير الميسر — مجمع الملك فهد لطباعة المصحف الشريف',
}

# Colour classes of the galaxy (0 = ordinary word)
CLS_ALLAH, CLS_PROPHET, CLS_ANGEL, CLS_SHAYTAN = 1, 2, 3, 4


def dump(name, obj):
    path = os.path.join(OUT, name)
    data = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    with open(path, 'wb') as f:
        f.write(data)
    return hashlib.sha256(data).hexdigest(), len(data)


def load_cache(name):
    with open(os.path.join(CACHE, name), encoding='utf-8') as f:
        return json.load(f)


def load_manifest():
    return load_cache('manifest.json')


def read_tanzil(path):
    verses = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n').rstrip('\r')
            if not line or line.startswith('#'):
                continue
            s, a, t = line.split('|', 2)
            verses.append((int(s), int(a), t))
    assert len(verses) == 6236, len(verses)
    return verses


def spiral_layout(order_keys, n_words, word_sura, word_verse, seed):
    """Two-armed spiral galaxy. Suras are visited in `order_keys` order and
    laid along alternating arms; a small gap separates consecutive suras and
    the words of one verse share a common offset, so suras and verses read as
    distinct clusters."""
    rng = np.random.default_rng(seed)
    pos = np.zeros((n_words, 3), np.float64)
    idx_by_sura = {}
    for i, s in enumerate(word_sura):
        idx_by_sura.setdefault(s, []).append(i)
    GAP = 260  # "virtual words" between suras
    seq, virt = [], 0
    for s in order_keys:
        for i in idx_by_sura[s]:
            seq.append((i, virt)); virt += 1
        virt += GAP
    total = virt
    arm_of_sura = {s: k % 2 for k, s in enumerate(order_keys)}
    verse_off = {}
    for i, v in seq:
        t = v / total
        vv = int(word_verse[i])
        spread = 5 + 24 * t
        if vv not in verse_off:
            verse_off[vv] = (rng.normal(0, spread, 2), rng.normal(0, 3 + 10 * (1 - t) ** 2))
        (dx, dy), dz = verse_off[vv]
        ex, ey, ez = rng.normal(0, 0.9 + 1.6 * t, 3)
        arm = arm_of_sura[word_sura[i]]
        radius = 22 + 540 * math.sqrt(t)
        theta = 5.6 * math.pi * math.sqrt(t) + arm * math.pi
        pos[i, 0] = radius * math.cos(theta) + dx + ex
        pos[i, 1] = radius * math.sin(theta) + dy + ey
        pos[i, 2] = dz + ez * 0.6
    return pos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--db', default=os.path.join(BASE, 'quran.db'))
    ap.add_argument('--tanzil', default=os.path.join(BASE, 'quran-uthmani.txt'))
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    info = {'files': {}}

    tanzil_sha = hashlib.sha256(open(args.tanzil, 'rb').read()).hexdigest()
    con = sqlite3.connect(args.db)
    ref_sha = dict(con.execute('SELECT key, value FROM meta'))['source_sha256']
    assert tanzil_sha == ref_sha, 'Tanzil file differs from the baseline source hash'
    info['tanzil_sha256'] = tanzil_sha

    verses = read_tanzil(args.tanzil)
    vidx = {(s, a): k for k, (s, a, _) in enumerate(verses)}

    # ---- suras -----------------------------------------------------------
    ch = {lang: {c['id']: c for c in load_cache(f'qurancom_chapters_{lang}.json')}
          for lang in ('en', 'fr', 'ar')}
    db_suras = {m: (name, typ, nz, n) for nz, m, name, typ, n in
                con.execute('SELECT nuzul, mushaf, name, type, n_ayas FROM suras')}
    suras = []
    first = 0
    for m in range(1, 115):
        name, typ, nz, n = db_suras[m]
        assert n == ch['en'][m]['verses_count'], m
        suras.append({
            'n': m, 'ar': name, 'tr': ch['en'][m]['name_simple'],
            'en': ch['en'][m]['translated_name']['name'],
            'fr': ch['fr'][m]['translated_name']['name'],
            'type': 'meccan' if typ.startswith('مك') else 'medinan',
            'order': nz, 'ayas': n, 'first': first})
        first += n
    core = {'suras': suras, 'verses': [t for _, _, t in verses],
            'source': 'Tanzil Project — Quran Uthmani text (tanzil.net), CC BY 3.0, verbatim'}
    info['files']['core.json'] = dump('core.json', core)

    # ---- imla'i search text ------------------------------------------------
    iml = load_cache('qurancom_imlaei.json')
    arr = [''] * 6236
    for r in iml:
        arr[vidx[(r['s'], r['a'])]] = r['t']
    assert all(arr)
    info['files']['search_ar.json'] = dump('search_ar.json', arr)

    # ---- tafsir & translations (verbatim) ----------------------------------
    meta = load_cache('quranenc_meta.json')
    info['sources'] = {}
    for pub, key in TAFSIR_KEYS.items():
        rows = load_cache(f'quranenc_{key}.json')
        arr = [''] * 6236
        notes = [''] * 6236
        for r in rows:
            k = vidx[(r['s'], r['a'])]
            arr[k] = r['t']
            notes[k] = r['f']
        assert sum(1 for x in arr if x) >= 6200, (pub, sum(1 for x in arr if x))
        m = meta.get(key) or {'title': TAFSIR_TITLES[key],
                              'version': 'api-v1@' + load_manifest()[f'quranenc_{key}.json']['fetched'][:10]}
        payload = {'id': pub, 'key': key, 'title': m.get('title'),
                   'version': m.get('version'), 'source': 'QuranEnc.com',
                   'url': f'https://quranenc.com/en/browse/{key}',
                   'text': arr, 'notes': notes if any(notes) else None}
        info['files'][f'tafsir_{pub}.json'] = dump(f'tafsir_{pub}.json', payload)
        info['sources'][pub] = {'key': key, 'title': m.get('title'), 'version': m.get('version'),
                                'empty_verses': sum(1 for x in arr if not x)}

    # ---- As-Sa'di (per sura, lazy-loaded by the reader) + word timings -------
    import re as _re
    sa = load_cache('qurancom_tafsir_saadi.json')
    saadi = {}
    for r in sa:
        txt = _re.sub(r'<[^>]+>', ' ', r['t'])
        txt = _re.sub(r'\s+', ' ', txt.replace('&nbsp;', ' ')).strip()
        saadi[(r['s'], r['a'])] = txt
    seg = load_cache('qurancom_segments_alafasy.json')
    os.makedirs(os.path.join(OUT, 'saadi'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'timing'), exist_ok=True)
    n_sync = 0
    for s_ in suras:
        m = s_['n']
        arr = [saadi.get((m, a), '') for a in range(1, s_['ayas'] + 1)]
        dump(os.path.join('saadi', f'{m}.json'), {'id': 'saadi_ar', 'title': 'تيسير الكريم الرحمن في تفسير كلام المنان — عبد الرحمن السعدي',
             'source': 'Quran.com API v4 (tafsir 91)', 'text': arr})
        tim = []
        for a in range(1, s_['ayas'] + 1):
            k = vidx[(m, a)]
            g = seg[k]
            assert g['s'] == m and g['a'] == a
            toks = [w for w in verses[k][2].split(' ') if _re.search('[ء-يٱ]', w)]
            skip = 4 if (a == 1 and m not in (1, 9)) else 0
            nw = len(toks) - skip
            pos = sorted(g['seg'])
            ok = pos and max(x[0] for x in pos) == nw
            if ok:
                flat = [0] * (2 * nw)
                for w, st, en in pos:
                    flat[2 * (w - 1)] = st; flat[2 * (w - 1) + 1] = en
                tim.append({'u': g['url'], 'skip': skip, 't': flat}); n_sync += 1
            else:
                tim.append({'u': g['url'], 'skip': skip, 't': None})
        dump(os.path.join('timing', f'{m}.json'), tim)
    info['saadi_verses'] = sum(1 for v in saadi.values() if v)
    info['synced_verses'] = n_sync

    # ---- words + galaxy ----------------------------------------------------
    sys.path.insert(0, BASE)
    from color_excel_build import sem_category  # baseline semantic layer
    W = con.execute('SELECT mushaf, aya, w_idx, disp, key FROM words '
                    'ORDER BY mushaf, aya, w_idx').fetchall()
    assert len(W) == 77433
    word_verse = np.array([vidx[(w[0], w[1])] for w in W], np.uint16)
    word_sura = [w[0] for w in W]
    cls = np.zeros(len(W), np.uint8)
    cmap = {'الله': CLS_ALLAH, 'نبي': CLS_PROPHET, 'ملك': CLS_ANGEL, 'شيطان': CLS_SHAYTAN}
    for i, w in enumerate(W):
        c = sem_category(w[4])
        if c:
            cls[i] = cmap[c]
    mushaf_order = list(range(1, 115))
    nuzul_order = sorted(range(1, 115), key=lambda m: db_suras[m][2])
    L1 = spiral_layout(mushaf_order, len(W), word_sura, word_verse, 42)
    L2 = spiral_layout(nuzul_order, len(W), word_sura, word_verse, 43)
    scale = 32767 / max(np.abs(L1).max(), np.abs(L2).max())
    q = np.concatenate([np.round(L1 * scale), np.round(L2 * scale)]).astype('<i2')
    header = np.array([len(W), 2], '<u4').tobytes() + np.array([1 / scale], '<f4').tobytes()
    blob = header + q.tobytes() + word_verse.astype('<u2').tobytes() + cls.tobytes()
    with open(os.path.join(OUT, 'galaxy.bin'), 'wb') as f:
        f.write(blob)
    info['files']['galaxy.bin'] = (hashlib.sha256(blob).hexdigest(), len(blob))
    info['files']['words.json'] = dump('words.json', [w[3] for w in W])
    info['counts'] = {'verses': 6236, 'words': len(W), 'suras': 114,
                      'class_counts': {int(k): int((cls == k).sum()) for k in range(5)}}
    with open(os.path.join(OUT, 'build_info.json'), 'w', encoding='utf-8') as f:
        json.dump(info, f, ensure_ascii=False, indent=1)
    for k, (h, n) in info['files'].items():
        print(f'{k:28s} {n/1e6:6.2f} MB  {h[:12]}')
    print(json.dumps(info['sources'], ensure_ascii=False, indent=1))
    print(info['counts'])


if __name__ == '__main__':
    main()
