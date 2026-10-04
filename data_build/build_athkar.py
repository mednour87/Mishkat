# -*- coding: utf-8 -*-
"""Adhkar by theme (T062) — only remembrances whose grade is known to be صحيح or حسن.

Two sources of the challenge's reference pack / Mishkat's sources:
  1. HadeethEnc (hadeethenc.com, already downloaded in data_build/hadeeth_raw/): its adhkar and
     supplication categories; a hadith is kept only when its grade is صحيح/حسن without reservation
     (no «ضعيف», no «دون …» / «إلا …» partial grade, no «موقوف»: a companion's saying is not a dhikr of the
     Prophet ﷺ).
  2. Hisn al-Muslim (hisnmuslim.com/api, ar + en, audio): the API has NO takhrij, so EVERY dhikr is looked
     up in the Hadith Encyclopedia of Dorar (dorar.net/dorar_api.json, listed in the reference pack for
     hadith); it is kept only if a Dorar result (a) quotes the dhikr (most of its words, in order of
     appearance not required) and (b) carries a muhaddith's verdict containing صحيح or حسن and nothing
     weaker. The verdict, muhaddith, source and number are stored with it. Otherwise it is EXCLUDED
     (the list of excluded items is written to data_build/cache/athkar_excluded.json for review).

Polite: cached responses, 1.2 s between Dorar requests.
usage: python data_build/build_athkar.py   → public/data/athkar.json
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'data_build', 'cache', 'athkar')
OUT = os.path.join(ROOT, 'public', 'data', 'athkar.json')
EXCL = os.path.join(ROOT, 'data_build', 'cache', 'athkar_excluded.json')
UA = 'Mishkat/1.0 (Islamic AI Challenge - Quran search; contact: mohamednourbouali87@gmail.com)'
os.makedirs(CACHE, exist_ok=True)

MARKS = re.compile('[ؐ-ًؚ-ٰٟۖ-ۭـ]')


def norm(s):
    s = MARKS.sub('', s or '')
    s = re.sub('[أإآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    s = re.sub(r'[^ء-ي\s]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def get(url, binary=False):
    key = re.sub(r'[^A-Za-z0-9]+', '_', url)[-150:]
    path = os.path.join(CACHE, key)
    if os.path.exists(path):
        return open(path, encoding='utf-8-sig').read()
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                s = r.read().decode('utf-8-sig')
            open(path, 'w', encoding='utf-8').write(s)
            return s
        except Exception as e:
            if attempt == 2:
                raise
            time.sleep(3)


# ------------------------------------------------------------------ themes
THEMES = [
    ('morning', 'أذكار الصباح والمساء', 'Morning and evening'),
    ('sleep', 'أذكار النوم والاستيقاظ', 'Sleep and waking up'),
    ('prayer', 'أذكار الصلاة والأذان والمسجد', 'Prayer, adhan and mosque'),
    ('home', 'المنزل والخلاء واللباس والطعام', 'Home, clothing, food'),
    ('travel', 'السفر والركوب', 'Travel'),
    ('distress', 'الكرب والهم والمرض والمصيبة', 'Distress, illness, affliction'),
    ('istighfar', 'الاستغفار والتسبيح والذكر المطلق', 'Seeking forgiveness, glorification'),
    ('dua', 'أدعية مأثورة', 'Supplications from the Sunnah'),
    ('other', 'مناسبات أخرى', 'Other occasions'),
]
THEME_RULES = [
    ('morning', r'الصباح|المساء'),
    ('sleep', r'النوم|نام|الاستيقاظ|استيقظ|تقلب|الفزع|رؤيا|الرؤيا|حلم'),
    ('prayer', r'الصلاه|الصلاة|الاذان|الأذان|المسجد|الوضوء|التشهد|الركوع|السجود|الاستفتاح|القنوت|الوتر|الاستخاره|الاستخارة|التكبير|السلام من الصلاه|تشهد|سجود|ركوع'),
    ('home', r'المنزل|الخلاء|الثوب|اللباس|الطعام|الأكل|الاكل|الشرب|الفطر|افطر|أفطر|الضيف|العطاس|المجلس|كفاره المجلس|كفارة المجلس'),
    ('travel', r'السفر|الركوب|الدابه|الدابة|المسافر|القريه|القرية|السوق'),
    ('distress', r'الكرب|الهم|الحزن|المريض|المرض|المصيبه|المصيبة|الدين|العدو|الشيطان|الغضب|الخوف|الوسوسه|الوسوسة|الشده|الشدة|الميت|التعزيه|التعزية|القبر|الجنازه|الجنازة|الوجع|الألم|الالم'),
    ('istighfar', r'الاستغفار|التسبيح|التهليل|التحميد|التكبير|فضل الذكر|الذكر المطلق|الأذكار المطلقة|فضائل الذكر'),
    ('dua', r'الدعاء|الأدعية|الادعيه|المأثوره|المأثورة'),
]


def theme_of(*names):
    t = norm(' '.join(names))
    for tid, pat in THEME_RULES:
        if any(norm(a) and norm(a) in t for a in pat.split('|')):
            return tid
    return 'other'


# ------------------------------------------------------------------ 1. HadeethEnc
HE_CATS = {'أذكار الصباح والمساء', 'الأذكار المطلقة', 'أذكار الدخول والخروج من المنزل', 'أذكار الدخول والخروج من الخلاء',
           'أذكار الدخول والخروج من المسجد', 'الأذكار التي تقال في أوقات الشدة', 'الأذكار للأمور العارضة', 'الأدعية المأثورة',
           'أذكار الصلاة', 'فضائل الذكر', 'هدي النبي صلى الله عليه وسلم في الذكر'}
GOOD_GRADE = re.compile(r'^(صحيح|حسن|صحيحان|الحديثان صحيحان|صحيحة|إسناده صحيح|إسناده حسن|حسن صحيح|صحيح لغيره|حسن لغيره|صحيح بشواهده|حسن بشواهده|صحيح بمجموع طرقه|حسن بمجموع طرقه|صحيح بطرقه وشواهده)\.?$')


def hadeethenc():
    ar = json.load(open(os.path.join(ROOT, 'data_build', 'hadeeth_raw', 'hadeeth_ar.json'), encoding='utf-8'))['items']
    en = {h['id']: h for h in json.load(open(os.path.join(ROOT, 'data_build', 'hadeeth_raw', 'hadeeth_en.json'), encoding='utf-8'))['items']}
    out, skipped = [], []
    for h in ar:
        cats = [c for c in h.get('cats', []) if c in HE_CATS]
        if not cats:
            continue
        g = (h.get('grade') or '').strip()
        if not GOOD_GRADE.match(g):
            skipped.append({'source': 'hadeethenc', 'id': h['id'], 'grade': g, 'why': 'grade not plainly صحيح/حسن'})
            continue
        e = en.get(h['id']) or {}
        out.append({'id': f"he:{h['id']}", 'src': 'hadeethenc', 'theme': theme_of(*cats, h.get('title', '')),
                    'title': h.get('title', ''), 'text': h.get('text', ''), 'by': h.get('by', ''), 'grade': g,
                    'en': {'title': e.get('title', ''), 'text': e.get('text', ''), 'by': e.get('by', ''), 'grade': e.get('grade', '')} if e else None,
                    'url': f"https://hadeethenc.com/ar/browse/hadith/{h['id']}", 'cats': cats})
    return out, skipped


# ------------------------------------------------------------------ 2. Hisn al-Muslim, each dhikr checked on Dorar
WEAK = re.compile(r'ضعيف|منكر|موضوع|لا يصح|ليس بصحيح|لا أصل|باطل|شاذ|مرسل|لا يثبت|فيه نظر|غريب جدا|لولا|مدلس|عنعن|منقطع|انقطاع|مجهول|فيه ضعف|إلا أن|الا ان|لكن|موقوف|ضعف')
OK = re.compile(r'صحيح|حسن')


def dorar(q):
    s = get('https://dorar.net/dorar_api.json?skey=' + urllib.parse.quote(q))
    time.sleep(1.2)
    html = (json.loads(s).get('ahadith') or {}).get('result') or ''
    out = []
    for part in re.split(r'<div class="hadith"[^>]*>', html)[1:]:
        text_part, _, info = part.partition('<div class="hadith-info"')
        text = re.sub(r'<[^>]+>', ' ', text_part.split('</div>')[0])
        text = re.sub(r'\s+', ' ', re.sub(r'^\s*\d+\s*-\s*', '', text)).strip()

        def field(label):
            m = re.search(r'<span class="info-subtitle">\s*' + label + r':?\s*</span>(.*?)(?=<span class="info-subtitle">|</div>|$)', info, flags=re.S)
            return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', m.group(1))).strip() if m else ''
        out.append({'text': text, 'rawi': field('الراوي'), 'muhaddith': field('المحدث'), 'source': field('المصدر'),
                    'page': field('الصفحة أو الرقم'), 'grade': field('خلاصة حكم المحدث')})
    return out


def core_query(text):
    # the dhikr without the Quran quotations and the formulas around it; Dorar matches words
    t = re.sub(r'﴿[^﴾]*﴾', ' ', text)
    # Hisn al-Muslim wraps the words of the dhikr in ((…)): keep them; drop only bracketed notes and numbers
    t = t.replace('((', ' ').replace('))', ' ')
    t = re.sub(r'\[[^\]]*\]|\(\s*[\d٠-٩]+\s*\)', ' ', t)
    w = [x for x in norm(t).split() if len(x) > 1]
    return w


def matches(dhikr_words, hadith_text):
    hw = set(norm(hadith_text).split())
    key = [w for w in dhikr_words if len(w) >= 3]
    if len(key) < 2:
        return False
    hit = sum(1 for w in key if w in hw)
    return hit / len(key) >= 0.8


def hisn():
    idx_ar = json.loads(get('https://www.hisnmuslim.com/api/ar/husn_ar.json'))['العربية']
    idx_en = {c['ID']: c for c in json.loads(get('https://www.hisnmuslim.com/api/en/husn_en.json'))['English']}
    kept, excluded = [], []
    for ch in idx_ar:
        cid = ch['ID']
        body = json.loads(get(f'https://www.hisnmuslim.com/api/ar/{cid}.json'))
        items = next(iter(body.values()))
        en_items = {}
        if cid in idx_en:
            try:
                eb = json.loads(get(f'https://www.hisnmuslim.com/api/en/{cid}.json'))
                en_items = {x['ID']: x for x in next(iter(eb.values()))}
            except Exception:
                en_items = {}
        title_en = idx_en.get(cid, {}).get('TITLE', '')
        for d in items:
            text = (d.get('ARABIC_TEXT') or '').strip()
            words = core_query(text)
            # a dhikr that is mostly Quran (Ayat al-Kursi, al-Mu'awwidhat…) with a short formula around it: the
            # formula alone («أعوذ بالله من الشيطان الرجيم») matches unrelated hadiths — excluded rather than
            # vouched for by the wrong hadith (relevance ≠ authenticity)
            key = [w for w in words if len(w) >= 3]
            if len(key) < 4 or ('﴿' in text and len(key) < 8):
                excluded.append({'id': d['ID'], 'chapter': ch['TITLE'], 'why': 'Quran only or too short to look up', 'text': text[:120]})
                continue
            found = None
            for q in (' '.join(words[:7]), ' '.join(words[1:8]), ' '.join(words[:4])):
                try:
                    res = dorar(q)
                except Exception as e:
                    res = []
                good = [r for r in res if OK.search(r['grade']) and not WEAK.search(r['grade']) and matches(words[:24], r['text'])]
                # the strongest attribution first: al-Bukhari, Muslim, then the other imams and verifiers
                rank = lambda r: next((k for k, n in enumerate(['البخاري', 'مسلم', 'الألباني', 'ابن باز', 'ابن حجر', 'النووي', 'الترمذي']) if n in r['muhaddith']), 9)
                if good:
                    found = sorted(good, key=rank)[0]
                if found:
                    break
            if not found:
                excluded.append({'id': d['ID'], 'chapter': ch['TITLE'], 'why': 'no صحيح/حسن verdict found on Dorar for this wording', 'text': text[:160]})
                continue
            e = en_items.get(d['ID'], {})
            kept.append({'id': f"hm:{d['ID']}", 'src': 'hisn', 'theme': theme_of(ch['TITLE']), 'chapter': ch['TITLE'], 'chapterEn': title_en,
                         'text': text, 'repeat': d.get('REPEAT') or 1, 'audio': (d.get('AUDIO') or '').replace('http://', 'https://'),
                         'en': {'text': (e.get('TRANSLATED_TEXT') or '').strip(), 'translit': (e.get('LANGUAGE_ARABIC_TRANSLATED_TEXT') or '').strip()} if e else None,
                         'dorar': {'grade': found['grade'], 'muhaddith': found['muhaddith'], 'source': found['source'], 'page': found['page'], 'rawi': found['rawi'],
                                   'url': 'https://dorar.net/hadith/search?q=' + urllib.parse.quote(' '.join(words[:7]))}})
        print(cid, ch['TITLE'], 'kept', sum(1 for k in kept if k['chapter'] == ch['TITLE']), 'of', len(items), flush=True)
    return kept, excluded


def main():
    he, he_skip = hadeethenc()
    hm, hm_excl = hisn()
    themes = [{'id': t, 'ar': a, 'en': e} for t, a, e in THEMES]
    json.dump({'built': time.strftime('%Y-%m-%d'),
               'sources': {'hadeethenc': 'HadeethEnc — موسوعة الأحاديث النبوية المترجمة (hadeethenc.com)',
                           'hisn': 'حصن المسلم (hisnmuslim.com) — كل ذكر مُثبت بحكم صحيح/حسن من الموسوعة الحديثية في الدرر السنية (dorar.net)'},
               'themes': themes, 'items': he + hm},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump({'hadeethenc_skipped': he_skip, 'hisn_excluded': hm_excl}, open(EXCL, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('HadeethEnc kept', len(he), 'skipped', len(he_skip), '| Hisn kept', len(hm), 'excluded', len(hm_excl))


if __name__ == '__main__':
    main()
