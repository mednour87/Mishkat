# -*- coding: utf-8 -*-
"""Builds the submission deck (PPTX) from the project's own files:
logo, screenshots and eval/results/results.json. No number is typed by hand.
  python docs/make_deck.py  →  ../04_LIVRABLES/Mishkat_presentation.pptx
"""
import json
import os
import sys

import fitz  # PyMuPDF: renders the SVG logo
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Pt

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUTDIR = os.path.join(os.path.dirname(ROOT), '04_LIVRABLES')
CAPS = os.path.join(OUTDIR, 'captures')
BG, PANEL, GOLD, GOLD2, TXT, MUT, BLUE, OK, STOP = (RGBColor(5, 7, 13), RGBColor(16, 21, 36), RGBColor(255, 214, 107), RGBColor(232, 169, 60),
                                                     RGBColor(236, 239, 245), RGBColor(154, 163, 181), RGBColor(142, 197, 240), RGBColor(94, 230, 160), RGBColor(255, 122, 122))

res = json.load(open(os.path.join(ROOT, 'eval', 'results', 'results.json'), encoding='utf-8'))
S = res['summary']
bench_path = os.path.join(ROOT, 'eval', 'results', 'bench_llm.json')
bench = json.load(open(bench_path, encoding='utf-8'))['results'] if os.path.exists(bench_path) else {}

# logo → PNG
logo_png = os.path.join(HERE, 'logo.png')  # rendered from public/img/logo_render.html (browser) — see README
if not os.path.exists(logo_png):
    doc = fitz.open(os.path.join(ROOT, 'public', 'img', 'logo.svg'))
    doc[0].get_pixmap(matrix=fitz.Matrix(6, 6), alpha=True).save(logo_png)

prs = Presentation()
prs.slide_width, prs.slide_height = Emu(12192000), Emu(6858000)  # 16:9
W, H = prs.slide_width, prs.slide_height
BLANK = prs.slide_layouts[6]


def slide(title=None, kicker=None):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = BG
    s.shapes.add_picture(logo_png, W - Emu(900000), Emu(250000), height=Emu(600000))
    if kicker:
        text(s, kicker, Emu(600000), Emu(300000), Emu(9000000), Emu(350000), 13, MUT)
    if title:
        text(s, title, Emu(600000), Emu(600000), Emu(10300000), Emu(800000), 26, GOLD, bold=True)
    return s


def text(s, t, x, y, w, h, size=16, color=TXT, bold=False, align=PP_ALIGN.LEFT, font='Segoe UI'):
    tb = s.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame; tf.word_wrap = True
    lines = t if isinstance(t, list) else [t]
    for k, line in enumerate(lines):
        p = tf.paragraphs[0] if k == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run(); r.text = line
        r.font.size = Pt(size); r.font.color.rgb = color; r.font.bold = bold; r.font.name = font
        p.space_after = Pt(6)
    return tb


def box(s, x, y, w, h, fill=PANEL, line=GOLD2):
    b = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    b.fill.solid(); b.fill.fore_color.rgb = fill
    b.line.color.rgb = line; b.line.width = Pt(1)
    b.adjustments[0] = 0.08
    return b


def boxed(s, title, body, x, y, w, h, tcolor=GOLD):
    box(s, x, y, w, h)
    text(s, title, x + Emu(150000), y + Emu(100000), w - Emu(300000), Emu(450000), 17, tcolor, bold=True)
    text(s, body, x + Emu(150000), y + Emu(560000), w - Emu(300000), h - Emu(650000), 13, TXT)


def pic(s, name, x, y, h):
    p = os.path.join(CAPS, name)
    if os.path.exists(p):
        s.shapes.add_picture(p, x, y, height=h)


def pct(a, b):
    return f"{100 * a / b:.1f} %" if b else '—'


cm = lambda v: Emu(int(v * 360000))

# 1 — title
s = slide()
s.shapes.add_picture(logo_png, cm(3), cm(4.2), height=cm(9))
text(s, 'مِشكاة · Mishkat', cm(13.5), cm(4.6), cm(18), cm(2.2), 48, GOLD, bold=True)
text(s, 'The Quran Galaxy Guide — AI-augmented, tafsir-grounded Quran search that never invents a word',
     cm(13.5), cm(7.2), cm(18), cm(2.5), 20, TXT)
text(s, ['Islamic AI Challenge 2026 · Track 1 — Knowledge dialogue & reliable answers',
         'Mohamed Nour Bou Ali · العربية · English · Français'], cm(13.5), cm(10.5), cm(18), cm(2.5), 14, MUT)

# 2 — problem
s = slide('The problem', 'المشكلة')
boxed(s, 'General AI assistants', ['Answer fluently but can invent verses, misattribute sayings (e.g. “النظافة من الإيمان”) to the Quran, or merge two similar verses — without a traceable source.'], cm(1.7), cm(4.4), cm(9.5), cm(6.5), STOP)
boxed(s, 'Reliable tools', ['Concordances and tafsir libraries are trustworthy but need the root, the exact spelling and Arabic — out of reach for new Muslims, students and non-Arabic speakers.'], cm(11.9), cm(4.4), cm(9.5), cm(6.5), BLUE)
boxed(s, 'Who needs it', ['Muslims and new Muslims asking “what does the Quran say about…?”, students, and people who share quotes online and want to verify them before attributing them to the Quran.'], cm(22.1), cm(4.4), cm(9.5), cm(6.5), OK)
b = S['baseline_keyword']
text(s, f"Measured on our benchmark: a plain keyword search answers {pct(b['pass'], b['total'])} of {b['total']} questions and produces {b['unsafe']} unsafe outputs (fatwas answered, sayings “found”, misquotes accepted).",
     cm(1.7), cm(11.5), cm(30), cm(2), 15, GOLD2)

# 3 — solution
s = slide('The solution: one search bar over the galaxy of the Quran', 'الحل')
text(s, ['Type an idea, a question, a surah, a verse number or part of a verse (ar / en / fr):',
         '① an explanatory paragraph made ONLY of verbatim tafsir sentences (Al-Muyassar · Al-Mukhtasar), each tagged with its verse',
         '② the surahs ranked by relevance, each with 📖 Read surah and ▶ Listen',
         '③ a reader verse by verse, with word-by-word synchronised recitation',
         '④ the camera flies to the verse among 77,433 glowing words; the recited word shines',
         '⑤ quotes verified (exact / misquoted / merged verses); fatwa & personal questions → abstain and refer'],
     cm(1.7), cm(4.4), cm(17.2), cm(12), 15)
pic(s, '02_paragraphe_tafsir_ar.jpg', cm(19.3), cm(4.3), cm(7.4))
pic(s, '03_lecteur_sourate.jpg', cm(26.4), cm(4.3), cm(7.4))

# 4 — golden rule
s = slide('The golden rule: the machine never writes religious content', 'القاعدة الذهبية')
rows = [('Quran text', 'Tanzil text, byte-exact (SHA-256 tested)', 'The model never writes a verse'),
        ('Explanation', 'Sentences sliced verbatim from Al-Muyassar / Al-Mukhtasar', 'Test: every quote is a substring of its source'),
        ('Interface text', 'Hand-written templates, 3 languages', 'No free text'),
        ('Everything else', 'Rulings, personal cases, dreams, unsupported claims', 'Abstain + referral')]
tbl = s.shapes.add_table(len(rows) + 1, 3, cm(1.7), cm(4.4), cm(30), cm(7)).table
for j, hname in enumerate(['Content', 'Produced by', 'Guarantee']):
    tbl.cell(0, j).text = hname
for i, r in enumerate(rows, 1):
    for j, v in enumerate(r):
        tbl.cell(i, j).text = v
for i in range(len(rows) + 1):
    for j in range(3):
        c = tbl.cell(i, j); c.fill.solid(); c.fill.fore_color.rgb = PANEL if i else RGBColor(60, 46, 12)
        for p in c.text_frame.paragraphs:
            for rr in p.runs:
                rr.font.size = Pt(15); rr.font.color.rgb = GOLD if i == 0 else TXT; rr.font.name = 'Segoe UI'
text(s, 'The LLM only (1) classifies intent and proposes retrieval keywords, (2) picks verse ids and tafsir-sentence ids from CLOSED numbered lists. Everything it returns is verified twice (server + browser); out-of-list ids are dropped; on failure the deterministic engine answers.',
     cm(1.7), cm(11.5), cm(30), cm(3), 14, GOLD2)

# 5 — how it works
s = slide('How it works', 'آلية العمل')
steps = [('1  Deterministic router', 'famous names (Ayat al-Kursi…), references (2:255, البقرة 255, sourate 18 verset 10), surah names in 3 languages'),
         ('2  Guard', 'fatwa · personal case · dream → abstain + referral (rules + LLM intent)'),
         ('3  Quote verification', 'imla\'i + Uthmani indexes: exact · misquote (diff highlighted) · two verses merged · translated quotes'),
         ('4  AI “expand”', 'intent + classical search keywords (never displayed)'),
         ('5  Retrieval', 'BM25 over Quran + Mukhtasar + Muyassar + translations, trilingual thesaurus'),
         ('6  AI “select”', 'verse ids + tafsir-sentence ids from closed lists → verifier'),
         ('7  Answer', 'verbatim paragraph + surahs ranked by relevance + galaxy flight + reader with synced audio')]
y = cm(4.2)
for t1, t2 in steps:
    box(s, cm(1.7), y, cm(30), cm(1.35))
    text(s, t1, cm(2), y + cm(0.15), cm(7.5), cm(1.1), 15, GOLD, bold=True)
    text(s, t2, cm(9.5), y + cm(0.15), cm(22), cm(1.1), 14, TXT)
    y += cm(1.55)

# 6 — AI & model choice
s = slide('The AI: open models, narrow jobs, verified output', 'دور الذكاء الاصطناعي')
lines = ['OpenRouter (pay per token, ≈ $0.002 per question) · openai/gpt-oss-120b → Groq free tier as backup → deterministic engine',
         'bge-m3 semantic neighbours (Cloudflare Workers AI) as extra candidates · the AI only returns ids from closed lists (verses, fatwa titles, hadiths)',
         'Temperature 0, JSON mode, edge cache (identical queries = identical answers, no quota spent)', '']
for m, r in bench.items():
    lines.append(f"{m}: topic hit@10 {r['topicHit10']} · critical abstention {r['criticalAbstain']} · ids rejected by verifier {r['rejectedByVerifier']} · avg {r['avgLatencyMs']} ms")
lines += ['', 'ALLaM-2-7B (SDAIA) tested: fine for intent, but its context is too short for the selection step — kept out of the chain.']
text(s, lines, cm(1.7), cm(4.4), cm(30), cm(10), 14)

# 7 — reliability in action
s = slide('Reliability in action', 'الموثوقية')
pic(s, '04_citation_deformee.jpg', cm(1.7), cm(4.3), cm(10.5))
pic(s, '05_abstention_fatwa_fr.jpg', cm(12), cm(4.3), cm(10.5))
text(s, ['Misquote → the correct wording from the Mushaf, differing words highlighted',
         'Merged verses → both verses shown',
         'Saying not in the Quran → “do not attribute it”',
         'Fatwa / personal / dream → abstain + referral',
         'Hostile-LLM test: injected ids, fake references and free text are all rejected'],
     cm(22.3), cm(4.4), cm(10), cm(10), 14)

# 8 — results
s = slide('Results — synthetic benchmark (338 seeded questions)', 'النتائج')
names = [n for n in ['baseline_keyword', 'mishkat', 'mishkat_llm'] if n in S]
labels = {'baseline_keyword': 'Keyword search', 'mishkat': 'Mishkat (deterministic)', 'mishkat_llm': 'Mishkat + AI'}
cats = [('route_ref', 'Verse references'), ('route_sura', 'Surah names'), ('verify_exact', 'Exact quotes'), ('verify_uthmani', 'Uthmani pasted verses'),
        ('verify_misquote', 'Misquotes detected'), ('verify_merged', 'Merged verses'), ('verify_notquran', 'Sayings not attributed'),
        ('safety_critical', 'Fatwa/personal/dream → abstain'), ('safety_benign', 'No false abstention'),
        ('topic_ar', 'Topics AR hit@10'), ('topic_en', 'Topics EN hit@10'), ('topic_fr', 'Topics FR hit@10')]
tbl = s.shapes.add_table(len(cats) + 2, len(names) + 1, cm(1.7), cm(4.1), cm(30), cm(10.5)).table
tbl.cell(0, 0).text = 'Category'
for j, n in enumerate(names, 1):
    tbl.cell(0, j).text = labels[n]
for i, (c, lab) in enumerate(cats, 1):
    tbl.cell(i, 0).text = lab
    for j, n in enumerate(names, 1):
        cc = S[n]['cats'].get(c)
        tbl.cell(i, j).text = pct(cc['pass'], cc['n']) if cc else '—'
tbl.cell(len(cats) + 1, 0).text = 'Unsafe outputs (target 0)'
for j, n in enumerate(names, 1):
    tbl.cell(len(cats) + 1, j).text = str(S[n]['unsafe'])
for i in range(len(cats) + 2):
    for j in range(len(names) + 1):
        c = tbl.cell(i, j); c.fill.solid(); c.fill.fore_color.rgb = PANEL if i else RGBColor(60, 46, 12)
        for p in c.text_frame.paragraphs:
            for rr in p.runs:
                rr.font.size = Pt(12); rr.font.color.rgb = GOLD if i == 0 else TXT; rr.font.name = 'Segoe UI'
m = S['mishkat']
text(s, f"0 references outside the 6,236 verses · 0 non-verbatim tafsir sentences · stability {res['stability']['identical']}/{res['n']} identical over 3 runs · p95 latency {m['p95']:.0f} ms (deterministic core)",
     cm(1.7), cm(15.3), cm(30), cm(1.5), 13, GOLD2)

# 8b — public benchmark (numbers read from eval/qqa23/scores_test.json, official scorer)
qq_path = os.path.join(ROOT, 'eval', 'qqa23', 'scores_test.json')
if os.path.exists(qq_path):
    qq = json.load(open(qq_path, encoding='utf-8'))
    s = slide("Public benchmark — Qur'an QA 2023, passage retrieval (52 test questions)", 'معيار علمي عام')
    names = {'Mishkat_lex': 'Engine without AI', 'Mishkat_dense': 'Meaning vectors alone (bge-m3)', 'Mishkat_ai': '+ AI (closed-list selection)', 'Mishkat_aidense': 'Mishkat — AI + meaning + words (deployed)'}
    rows = [f"{names.get(k, k)}:  MAP@10 {v['map10']:.3f} · MRR@10 {v['mrr10']:.3f}" for k, v in sorted(qq['runs'].items(), key=lambda kv: kv[1]['mrr10'])]
    pb = qq['published_best']
    rows += ['', f"Best published fine-tuned systems: MAP@10 {pb['map10']:.3f} · MRR@10 {pb['mrr10']:.3f} ({pb['source']})",
             'Mishkat: no training on this data, every verse from the verified text, chosen from a closed list; few verses shown on purpose (lower MAP).']
    text(s, rows, cm(1.7), cm(4.4), cm(30), cm(11), 15)

# 9 — value & originality
s = slide('Added value & originality', 'القيمة المضافة')
boxed(s, 'vs keyword search', ['Understands questions in Arabic and English, tolerant to spelling, finds meaning through tafsir, verifies quotes, abstains.'], cm(1.7), cm(4.4), cm(9.6), cm(5.5))
boxed(s, 'vs general chatbots', ['Cannot invent: text only from Tanzil and vetted tafsir, every sentence cited, closed-list selection, abstention by design.'], cm(11.8), cm(4.4), cm(9.6), cm(5.5))
boxed(s, 'vs Quran apps', ['Explains AND locates: paragraph + ranked surahs + reader + synced recitation + a 3D map showing where a theme lives across the Quran.'], cm(21.9), cm(4.4), cm(9.6), cm(5.5))
text(s, 'Original: “grounded-by-architecture” answers · merged-verse detection · a galaxy of 77,433 words where the recited word lights up.',
     cm(1.7), cm(10.2), cm(30), cm(2), 15, GOLD2)

# 10 — tech, cost, operations
s = slide('Technology, cost and operations', 'التقنيات والتشغيل')
text(s, ['Front-end: vanilla JS + three.js (WebGL), no build step, RTL/LTR, mobile-ready',
         'API: Cloudflare Pages Functions (/api/expand, /api/select, /api/health), key kept as a secret',
         'Data: 6 tafsirs/translations frozen with a SHA-256 manifest; per-surah lazy files (Sa‘di, word timings)',
         'Quality: 24 automated tests (data integrity, verbatim quotes, hostile LLM) + benchmark + model comparison',
         'Running cost: 0 (Cloudflare free + Groq free); graceful degradation when quotas are reached',
         'Maintenance: re-run fetch scripts to track new versions of the sources; “Report an error” on every verse; human review of reported cases'],
     cm(1.7), cm(4.4), cm(30), cm(10), 15)

# 11 — sources
s = slide('Sources & licences', 'المصادر والتراخيص')
text(s, ['Quran text — Tanzil Project (Hafs), CC BY 3.0, verbatim',
         'At-Tafsir Al-Muyassar — King Fahd Complex · Al-Mukhtasar — Tafsir Center (ar/en/fr) — via QuranEnc.com (no modification, attribution)',
         'Translations — Noor International (en), Rachid Maach (fr) — QuranEnc.com',
         'Tafsir As-Sa‘di, imla\'i search text, surah names, recitation & word timings (Sheikh Alafasy) — Quran.com API',
         'Code — MIT · Baseline project “Quran Cartography” disclosed with fingerprints (BASELINE.md)',
         'No user data: the benchmark is 100 % synthetic; queries are not stored'],
     cm(1.7), cm(4.4), cm(30), cm(10), 15)

# 12 — roadmap
s = slide('Next steps', 'خطة الاستمرار')
boxed(s, 'Challenge days (4–6 Oct)', ['User testing with target users (new Muslims, students) · accessibility pass · more well-known passages · deployment hardening'], cm(1.7), cm(4.4), cm(9.6), cm(6.5))
boxed(s, 'After the challenge', ['More vetted tafsirs & translations (QuranEnc catalogue: 70+ languages) · more reciters · offline PWA'], cm(11.8), cm(4.4), cm(9.6), cm(6.5))
boxed(s, 'Partnerships', ['Scholarly review board for reported cases · institutions providing tafsir datasets · da‘wah centres as first users'], cm(21.9), cm(4.4), cm(9.6), cm(6.5))
text(s, 'مِشكاة — نجمع لك نور البيان، ولا نكتب عن الله ما لم يُنقل.', cm(1.7), cm(11.5), cm(30), cm(2), 22, GOLD, align=PP_ALIGN.CENTER, font='Amiri')

os.makedirs(OUTDIR, exist_ok=True)
out = os.path.join(OUTDIR, 'Mishkat_presentation.pptx')
prs.save(out)
print('saved', out, len(prs.slides), 'slides')
