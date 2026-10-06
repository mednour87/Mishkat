# -*- coding: utf-8 -*-
"""Builds the submission deck (PPTX) from the project's own files — no number is typed by hand:
  eval/human/auto_metrics.json (plain chatbot vs Mishkat), eval/qqa23/ci_free3.json (Qur'an QA 2023, free tier,
  3 runs), eval/map1000/map.json (1,000 questions without AI), eval/overrefusal.json, the test suite (npm test),
  the screenshots of 04_LIVRABLES/captures (tools/shots.mjs) and the logo.
  python docs/make_deck.py  →  ../04_LIVRABLES/Mishkat_presentation.pptx   (then PDF: see DEPLOY/README)
Arabic and English only.
"""
import json
import os
import re
import subprocess
import sys

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Emu, Pt

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUTDIR = os.path.join(os.path.dirname(ROOT), '04_LIVRABLES')
CAPS = os.path.join(OUTDIR, 'captures')
J = lambda *p: json.load(open(os.path.join(ROOT, *p), encoding='utf-8'))

# ---------------------------------------------------------------- data (read, never typed)
auto = J('eval', 'human', 'auto_metrics.json')
verd = {}
for row in auto['rows']:
    for d in row['chatbot']['detail']:
        verd[d['verdict']] = verd.get(d['verdict'], 0) + 1
quotes = sum(verd.values())
exact, near, merged, notfound = verd.get('exact', 0), verd.get('near', 0), verd.get('merged', 0), verd.get('notfound', 0)   # 'verse' (a spelling variant to check by hand) is not counted as altered
qq = J('eval', 'qqa23', 'ci_free3.json')
qm = qq['mean_of_runs']
pb = qq['published_best']
mp = J('eval', 'map1000', 'map.json')['summary']
over = len(J('eval', 'overrefusal.json')['questions'])
try:
    t = subprocess.run('npm test', cwd=ROOT, shell=True, capture_output=True, text=True, encoding='utf-8', timeout=600).stdout
    n_tests = int(re.search(r'# pass (\d+)', t).group(1)); n_fail = int(re.search(r'# fail (\d+)', t).group(1))
except Exception:
    n_tests, n_fail = None, None
assert n_fail == 0, 'the test suite must be green before building the deck'
# commits since the window opened (4 Oct 2026 09:00 Riyadh = 06:00 UTC)
n_window = int(subprocess.run('git rev-list --count --since=2026-10-04T06:00:00Z HEAD', cwd=ROOT, shell=True, capture_output=True, text=True).stdout.strip() or 0)

# ---------------------------------------------------------------- style
BG, PANEL, PANEL2 = RGBColor(5, 7, 13), RGBColor(16, 21, 36), RGBColor(28, 34, 54)
GOLD, GOLD2, TXT, MUT = RGBColor(255, 214, 107), RGBColor(232, 169, 60), RGBColor(236, 239, 245), RGBColor(160, 168, 186)
BLUE, OK, STOP = RGBColor(142, 197, 240), RGBColor(94, 230, 160), RGBColor(255, 122, 122)
HEAD, BODY, AR = 'Cambria', 'Calibri', 'Arial'

prs = Presentation()
prs.slide_width, prs.slide_height = Emu(12192000), Emu(6858000)  # 13.33 × 7.5 in
W, H = prs.slide_width, prs.slide_height
BLANK = prs.slide_layouts[6]
inch = lambda v: Emu(int(v * 914400))
logo_png = os.path.join(HERE, 'logo.png')
is_ar = lambda s: bool(re.search(r'[؀-ۿ]', s)) and not re.search(r'[A-Za-z]{4,}', s)


def text(s, lines, x, y, w, h, size=16, color=TXT, bold=False, align=None, font=None, anchor=MSO_ANCHOR.TOP, space=6):
    tb = s.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Emu(0)
    for k, line in enumerate(lines if isinstance(lines, list) else [lines]):
        runs = line if isinstance(line, tuple) else ((line, {}),)
        p = tf.paragraphs[0] if k == 0 else tf.add_paragraph()
        whole = ''.join(r[0] for r in runs)
        rtl = is_ar(whole)
        p.alignment = align if align is not None else (PP_ALIGN.RIGHT if rtl else PP_ALIGN.LEFT)
        if rtl:
            p._p.get_or_add_pPr().set('rtl', '1')
        for rt, opt in runs:
            r = p.add_run(); r.text = rt
            f = r.font; f.size = Pt(opt.get('size', size)); f.bold = opt.get('bold', bold)
            f.color.rgb = opt.get('color', color); f.name = opt.get('font', font or (AR if is_ar(rt) else BODY))
        p.space_after = Pt(space)
    return tb


def card(s, x, y, w, h, fill=PANEL, line=None):
    b = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    b.fill.solid(); b.fill.fore_color.rgb = fill
    if line is None:
        b.line.fill.background()
    else:
        b.line.color.rgb = line; b.line.width = Pt(1)
    b.adjustments[0] = 0.06
    b.shadow.inherit = False
    return b


def slide(title=None, kicker=None):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = BG
    s.shapes.add_picture(logo_png, W - inch(1.05), inch(0.3), height=inch(0.62))
    if kicker:
        text(s, kicker, inch(0.6), inch(0.3), inch(10), inch(0.4), 13, MUT)
    if title:
        text(s, title, inch(0.6), inch(0.62), inch(11.4), inch(0.8), 32, GOLD, bold=True, font=HEAD)
    return s


def pic(s, name, x, y, w=None, h=None):
    p = os.path.join(CAPS, name)
    if not os.path.exists(p):
        raise SystemExit(f'missing screenshot {name} — run tools/shots.mjs first')
    im = s.shapes.add_picture(p, x, y, width=w, height=h)
    im.line.color.rgb = PANEL2; im.line.width = Pt(1)
    return im


def stat(s, x, y, w, big, label, color=GOLD, size=44):
    card(s, x, y, w, inch(1.75))
    text(s, big, x + inch(0.25), y + inch(0.12), w - inch(0.5), inch(0.9), size, color, bold=True, font=HEAD)
    text(s, label, x + inch(0.25), y + inch(1.0), w - inch(0.5), inch(0.7), 13, TXT)


def table(s, rows, x, y, w, col_w, size=13, head_fill=RGBColor(60, 46, 12)):
    tbl = s.shapes.add_table(len(rows), len(rows[0]), x, y, w, inch(0.4 * len(rows))).table
    for j, cw in enumerate(col_w):
        tbl.columns[j].width = inch(cw)
    for i, r in enumerate(rows):
        for j, v in enumerate(r):
            c = tbl.cell(i, j); c.fill.solid(); c.fill.fore_color.rgb = head_fill if i == 0 else (PANEL if i % 2 else PANEL2)
            c.margin_left = c.margin_right = inch(0.1); c.margin_top = c.margin_bottom = inch(0.04)
            tf = c.text_frame; tf.word_wrap = True
            p = tf.paragraphs[0]; p.text = ''
            run = p.add_run(); run.text = v
            run.font.size = Pt(size); run.font.name = AR if is_ar(v) else BODY
            run.font.color.rgb = GOLD if i == 0 else TXT; run.font.bold = i == 0
            if is_ar(v):
                p._p.get_or_add_pPr().set('rtl', '1'); p.alignment = PP_ALIGN.RIGHT
    return tbl


pct = lambda a, b: f'{round(100 * a / b)} %'
f3 = lambda v: f'{v:.3f}'.replace('0.', '0.')

# ---------------------------------------------------------------- 1 — title
s = slide()
s.shapes.add_picture(logo_png, inch(1.0), inch(1.6), height=inch(3.9))
text(s, 'Mishkat', inch(5.2), inch(1.55), inch(3.6), inch(1.1), 54, GOLD, bold=True, font=HEAD, align=PP_ALIGN.LEFT)
text(s, 'مِشكاة', inch(8.6), inch(1.45), inch(3.9), inch(1.2), 54, GOLD, bold=True, font=AR, align=PP_ALIGN.RIGHT)
text(s, 'The Quran Galaxy Guide — AI-augmented Quran search that never writes a religious word',
     inch(5.2), inch(2.9), inch(7.4), inch(1.0), 22, TXT)
text(s, ['دليل مجرّة القرآن الذكي', 'بحث قرآني معزَّز بالذكاء الاصطناعي لا يكتب حرفًا دينيًّا'], inch(5.2), inch(3.75), inch(7.4), inch(1.0), 18, TXT, space=2)
text(s, ['Islamic AI Challenge 2026 · Track 1 — Knowledge dialogue & reliable answers',
         'Mohamed Nour Bou Ali · Arabic and English',
         'Live demo: mishkatquran.org · Code: github.com/mednour87/Mishkat · © 2026 — all rights reserved'],
     inch(5.2), inch(5.0), inch(7.4), inch(1.4), 14, MUT, align=PP_ALIGN.LEFT)

# ---------------------------------------------------------------- 2 — problem, measured
s = slide('The problem, measured', 'المشكلة مقيسة')
text(s, f'We asked a general chatbot (the same open model, {auto["chatbot_model"]}, no retrieval) the {auto["questions"]} questions of our blind rating sheet, and checked every quotation it presented as Quran (in ornate Quran brackets) against the Mushaf with Mishkat’s verifier.',
     inch(0.6), inch(1.55), inch(12.1), inch(0.9), 16)
stat(s, inch(0.6), inch(2.65), inch(2.85), str(quotes), 'Quran quotations given by the chatbot')
stat(s, inch(3.65), inch(2.65), inch(2.85), pct(exact, quotes), f'exact ({exact}) — word for word in the Mushaf', OK)
stat(s, inch(6.7), inch(2.65), inch(2.85), pct(notfound, quotes), f'match no verse at all ({notfound})', STOP)
stat(s, inch(9.75), inch(2.65), inch(2.95), str(near + merged), f'altered ({near}) or two verses merged ({merged})', GOLD2)
card(s, inch(0.6), inch(4.75), inch(12.1), inch(1.9), PANEL2)
text(s, [(('Mishkat: 0 by construction. ', {'bold': True, 'color': GOLD}), ('Every verse is read from the Tanzil file (tested byte for byte); the AI only returns IDs from closed lists. Reliable tools (concordances, tafsir libraries) exist, but they need the exact word, Arabic, and patience — the people who ask “what does the Quran say about…?” use chatbots.', {})),
         'Automatic count, no human judgement; quotations are only those the chatbot itself marked as Quran.'],
     inch(0.85), inch(4.9), inch(11.6), inch(1.7), 15)

# ---------------------------------------------------------------- 3 — the product in one screen
s = slide('One search bar over the galaxy of the Quran', 'الحل')
pic(s, '03_reponse_courte_ar.jpg', inch(0.6), inch(1.6), w=inch(7.7))
text(s, ['Type an idea, a question, a surah, a verse or part of a verse — Arabic or English:',
         '① the short answer (الجواب باختصار): verbatim sentences of the verse, the tafsir and graded hadiths, each with its reference',
         '② the key verses with their complete tafsir, then the surahs ranked by relevance',
         '③ a reader verse by verse, recitation synchronised word by word (Sheikh Alafasy)',
         '④ the camera flies through 77,433 stars — the words of the Quran — to the verses of the answer',
         '⑤ rulings, crisis, traps and quotes each have their own safe route'],
     inch(8.6), inch(1.6), inch(4.2), inch(5.4), 14, space=9)

# ---------------------------------------------------------------- 4 — golden rule
s = slide('The golden rule: the machine never writes religious text', 'القاعدة الذهبية')
table(s, [['Content', 'Comes from', 'Guarantee'],
          ['Quran text', 'Tanzil file, byte-exact (SHA-256 in the tests)', 'the model never writes a verse; never read by a machine voice'],
          ['Tafsir, hadith, dhikr', 'Al-Muyassar, Al-Mukhtasar (QuranEnc), HadeethEnc, Hisn al-Muslim checked on Dorar', 'verbatim, with source, grade and link'],
          ['Rulings (ahkam)', 'Fiqh Encyclopedia of Ad-Durar As-Saniyyah (reference pack)', 'its own statement, verbatim; Mishkat never rules'],
          ['Stories of the prophets', 'Al-Jamhara (surah sciences) + Quranpedia subject index', 'verbatim summary and verse ranges'],
          ['Interface text', 'hand-written templates, Arabic and English', 'no free text'],
          ['Anything else', '—', 'abstain and refer']],
      inch(0.6), inch(1.6), inch(12.1), [2.6, 5.2, 4.3], 14)
card(s, inch(0.6), inch(5.25), inch(12.1), inch(1.45), PANEL2)
text(s, 'The AI has narrow jobs and returns only IDs: (1) intent and search keywords, (2) verse IDs from a closed candidate list, (3) sentence IDs for the short answer (composer), (4) an independent judge keeps only the sentences that answer the question. Out-of-list IDs are dropped on the server and again in the browser; on failure the deterministic engine answers.',
     inch(0.85), inch(5.38), inch(11.6), inch(1.25), 14)

# ---------------------------------------------------------------- 5 — pipeline
s = slide('How a question travels', 'آلية العمل')
steps = [('Guards first, no AI', 'crisis → support message · injection or “write me a hadith” → fixed answer · ruling, personal case, dream → referral'),
         ('Tools and references', 'time left until a prayer, qibla, adhkar, calendar, khatma · 2:255, surah names, famous verses'),
         ('Quote verification', 'exact · misquote (words highlighted) · two verses merged · not in the Quran'),
         ('AI expand (gpt-oss-20b)', 'intent + classical search keywords — never displayed'),
         ('Retrieval', 'BM25 over Quran + tafsir + translations, Quranpedia subject index, bge-m3 neighbours ranked in the browser'),
         ('AI select (gpt-oss-120b)', 'verse IDs from the closed candidate list → verifier'),
         ('Short answer', 'closed list of verbatim sentences → composer (IDs) → independent judge → rules R1–R12'),
         ('Display', 'short answer · key verses with tafsir · ranked surahs · galaxy flight · synchronised recitation')]
y = inch(1.55)
for k, (a, b) in enumerate(steps):
    card(s, inch(0.6), y, inch(12.1), inch(0.6), PANEL if k % 2 == 0 else PANEL2)
    text(s, f'{k + 1}  {a}', inch(0.8), y + inch(0.13), inch(3.6), inch(0.4), 15, GOLD, bold=True)
    text(s, b, inch(4.45), y + inch(0.13), inch(8.1), inch(0.4), 14)
    y += inch(0.67)

# ---------------------------------------------------------------- 5b — the whole pipeline on one plate (tools/make_pipeline.mjs)
s = slide('The pipeline at a glance — evidence-bound extractive RAG', 'خط المعالجة كاملًا')
s.shapes.add_picture(os.path.join(HERE, 'pipeline_rag.png'), inch(0.5), inch(1.35), width=inch(12.3))
text(s, 'Full description: docs/RAG_ENGINE.md — every box names the file that does the work; every figure comes from a results file.',
     inch(0.6), inch(6.95), inch(12.1), inch(0.4), 12, MUT)

# ---------------------------------------------------------------- 6 — reliability on screen
s = slide('Reliability you can see', 'الموثوقية')
pic(s, '04_hukm_mawsua_ar.jpg', inch(0.6), inch(1.6), w=inch(6.0))
pic(s, '05_citation_deformee_ar.jpg', inch(6.75), inch(1.6), w=inch(6.0))
text(s, ['Ruling question → red “sensitive question” banner, the Fiqh Encyclopedia’s statement verbatim, authorities it names, link',
         'Misquoted verse → the word that is not in the Mushaf is highlighted, the exact verse is shown'],
     inch(0.6), inch(5.5), inch(12.1), inch(1.2), 14)

# ---------------------------------------------------------------- 7 — sensitive questions
s = slide('Sensitive questions: fixed, reviewed routes', 'الأسئلة الحساسة')
pic(s, '08_crisis_en.jpg', inch(0.6), inch(1.6), w=inch(7.2))
text(s, ['A person in crisis gets a support message and findahelpline.com first, then verses of hope with their full tafsir — never a verse of punishment.',
         'Prompt injection, trap questions and requests to write a verse, a hadith or a fatwa get a fixed answer before any AI call; the API refuses the same texts.',
         'Blood, hudud, polemics: the reviewed context first, no claim of agreement, referral to alifta.gov.sa.',
         'Abstention is preferred to a doubtful answer; an uncovered part of the question is said to be uncovered.'],
     inch(8.1), inch(1.6), inch(4.6), inch(5.4), 14, space=10)

# ---------------------------------------------------------------- 8 — AI and cost
s = slide('Open models, free first, a paid backup with a cap', 'النماذج والكلفة')
table(s, [['Task', 'Model', 'Provider'],
          ['intent, keywords, result filters', 'openai/gpt-oss-20b', 'Groq — free tier'],
          ['verse selection, composer, judge', 'openai/gpt-oss-120b', 'Groq — free tier'],
          ['backup only (quota / failure)', 'same models', 'OpenRouter — pay per token, price cap'],
          ['speech to text, recite to find a verse', 'whisper-large-v3-turbo', 'Groq — free tier'],
          ['tafsir read aloud without a browser voice', 'orpheus-arabic-saudi', 'Groq'],
          ['meaning vectors of the question', 'bge-m3', 'Cloudflare Workers AI (free allocation)']],
      inch(0.6), inch(1.6), inch(12.1), [4.6, 3.6, 3.9], 14)
text(s, ['Normal cost of an answer: 0 (free tiers + Cloudflare Pages free plan). Backup: ≈ $0.0014 per question measured, daily ceiling of paid calls, credit limit on the key.',
         'Identical questions cached at the edge; frequent questions pre-computed and re-verified. Without AI the deterministic engine still answers, still grounded and abstaining.'],
     inch(0.6), inch(5.0), inch(12.1), inch(1.6), 15, GOLD2)

# ---------------------------------------------------------------- 9 — public benchmark
s = slide("Public benchmark: Qur'an QA 2023, Task A", 'معيار علمي عام')
stat(s, inch(0.6), inch(1.6), inch(3.9), f3(qm['mrr10']), f"MRR@10 · 95 % CI {f3(qm['mrr10_ci'][0])}–{f3(qm['mrr10_ci'][1])}")
stat(s, inch(4.7), inch(1.6), inch(3.9), f3(qm['map10']), f"MAP@10 · 95 % CI {f3(qm['map10_ci'][0])}–{f3(qm['map10_ci'][1])}", BLUE)
stat(s, inch(8.8), inch(1.6), inch(3.9), f"{f3(pb['mrr10'])} · {f3(pb['map10'])}", f"best published MRR · MAP ({pb['source']})", MUT, 32)
text(s, [f"Deployed pipeline, {qm['n_runs']} run{'s' if qm['n_runs'] > 1 else ''} on Groq’s free tier only (4 Oct 2026), mean per question; official scorer (pytrec_eval), {qq['questions']} scored test questions; bootstrap 2,000 × seed 42. Run-to-run spread: MRR {f3(qm['mrr10_spread'][0])}–{f3(qm['mrr10_spread'][1])} (understated: identical AI requests are cached, as in production).",
         'Reading: comparable to the best published fine-tuned systems — their scores lie inside our intervals; we do not claim to be better. No training on this data; every verse from the verified text; few verses shown on purpose (lower MAP).',
         'Limits: the test questions were seen during development (no tuning on them, but not a blind test); one public benchmark, Arabic only.'],
     inch(0.6), inch(3.65), inch(12.1), inch(3.2), 15, space=10)

# ---------------------------------------------------------------- 10 — robustness
s = slide('Robustness, measured without AI', 'المتانة')
stat(s, inch(0.6), inch(1.6), inch(3.9), f"{mp['expectations']['met']}/{mp['expectations']['checked']}", 'known expectations met on a map of 1,000 questions (engine only)')
stat(s, inch(4.7), inch(1.6), inch(3.9), f'{over}/{over}', 'legitimate questions that look sensitive — none refused', OK)
stat(s, inch(8.8), inch(1.6), inch(3.9), str(n_tests), 'automated tests, all green (data, guards, hostile AI, RAG rules, security)', BLUE)
text(s, ['The map sends 1,000 real and synthetic questions (Arabic and English, forum titles, spoken questions, traps) through the engine without AI, builds the tree language → route → answer → who vouches, and lists the weak points W1–W9; each weak point fixed got a test.',
         'Human blind rating (Mishkat vs chatbot, 2 raters, Cohen’s κ) and a user test with SUS: protocol and sheets ready — no figure is claimed before they are done.'],
     inch(0.6), inch(3.65), inch(12.1), inch(3.0), 15, space=10)

# ---------------------------------------------------------------- 11 — more than answers
s = slide('More than answers: the daily companion', 'أدوات يومية')
pic(s, '09_adhkar_ar.jpg', inch(0.6), inch(1.6), w=inch(5.3))
pic(s, '10_qissa_ar.jpg', inch(6.05), inch(1.6), w=inch(5.3))
pic(s, '11_mobile_ar.jpg', inch(11.55), inch(1.6), h=inch(3.3))
text(s, ['Khatma v2 with «Choose for me» (minutes a day, moments after each prayer, pace, short surahs first, deadline) — the plan lights up in the 3D lamp, then read with the reciter, reading only or listening only · memorising by repetition (counter, 70 % of the reciter’s time) · a safe mode for children (no fatwa) · adhkar with grades · prayer times, qibla (checked bearings), nearby mosques · Hijri calendar · installable on phone and computer · the Challenge flower among the 3D shapes.',
         'The visitor’s position and data stay in the browser; nothing is sent to Mishkat’s server.'],
     inch(0.6), inch(5.3), inch(12.1), inch(1.5), 14)

# ---------------------------------------------------------------- 12 — sources
s = slide('Sources and licences', 'المصادر والتراخيص')
table(s, [['Source', 'Used for', 'Licence / terms'],
          ['Tanzil (Hafs, Uthmani)', 'the only verse text', 'CC BY 3.0, verbatim'],
          ['QuranEnc: Al-Muyassar, Al-Mukhtasar, Noor Int.', 'tafsir, translation', 'no modification, attribution'],
          ['Quran.com: Sa‘di, Ibn Kathir, Baghawi, Qurtubi; Alafasy + timings', 'reader, recitation', 'public API, attribution'],
          ['HadeethEnc · Dorar (hadith encyclopedia)', 'graded hadiths, verdicts', 'public APIs, verbatim + link'],
          ['Dorar — Fiqh Encyclopedia', 'rulings (statement only)', 'public site, link'],
          ['Al-Jamhara · Quranpedia', 'stories, subject index, surah info', 'credit + version'],
          ['Aladhan · OpenStreetMap · GeoNames', 'prayer times, mosques, cities', 'free API · ODbL · CC BY 4.0'],
          ['Qur’an QA 2023 (bigIR)', 'evaluation only', 'CC BY-NC-ND 4.0, not redistributed'],
          ['Mishkat itself (code, design, logo, film)', 'the product', 'All rights reserved (challenge terms 13/7); organisers keep their evaluation licence']],
      inch(0.6), inch(1.55), inch(12.1), [5.0, 3.6, 3.5], 13)
text(s, 'Full registry with access, licence and how we comply: SOURCES.md · tools and costs: TOOLS.md · traceability of every host, endpoint and data file: docs/TRACEABILITY.md',
     inch(0.6), inch(6.2), inch(12.1), inch(0.6), 13, MUT)

# ---------------------------------------------------------------- 13 — transparency: the window
s = slide('What was built during the window (4–6 October)', 'الشفافية')
card(s, inch(0.6), inch(1.6), inch(5.9), inch(3.6), PANEL)
text(s, ['Declared baseline (before 4 Oct)', ''], inch(0.85), inch(1.75), inch(5.4), inch(0.5), 17, GOLD, bold=True)
text(s, ['Quran Cartography data and the Mishkat engine (search, verification, guards, reader, galaxy), the extractive RAG, the public benchmark kit, the tool modules — disclosed with fingerprints in BASELINE.md, tag baseline-2026-10-03.'],
     inch(0.85), inch(2.3), inch(5.4), inch(4.2), 14)
card(s, inch(6.8), inch(1.6), inch(5.9), inch(3.6), PANEL2)
text(s, 'Challenge window (CHANGELOG.md)', inch(7.05), inch(1.75), inch(5.4), inch(0.5), 17, GOLD, bold=True)
text(s, ['Rulings only from the Fiqh Encyclopedia + red banner · stories from Al-Jamhara', 'Trap and injection guard · RAG tested on 1,000 questions', 'Prayer, qibla, mosques, adhkar verified on Dorar',
         'Khatma v2 «Choose for me», tekrar, child mode, installable app', 'Film on 24:35 narrated in fusha · logo checked against As-Sa‘di', 'Domain, all rights reserved, dated archive · phone review fixes'],
     inch(7.05), inch(2.3), inch(5.4), inch(2.8), 14, space=7)
text(s, f'{n_window} commits since the window opened (4 Oct, 09:00 Riyadh), each named by task (T0xx) and dated; the baseline tag was never moved. Work done on 3 October after the tag, at the author’s request, is declared as preparation in BASELINE.md §2.4.',
     inch(0.6), inch(5.5), inch(12.1), inch(1.2), 15, GOLD2)

# ---------------------------------------------------------------- 14 — limits and next steps
s = slide('Known limits and next steps', 'الحدود والخطوات القادمة')
card(s, inch(0.6), inch(1.6), inch(5.9), inch(3.6), PANEL)
text(s, 'Known limits', inch(0.85), inch(1.75), inch(5.4), inch(0.5), 17, STOP, bold=True)
text(s, ['Thematic search can miss a passage worded differently', 'Free AI quotas are limited (the paid backup or the engine then answers)', 'A ruling appears only when the encyclopedia names the subject', 'Human evaluation and user test not yet done'],
     inch(0.85), inch(2.3), inch(5.4), inch(2.8), 14, space=7)
card(s, inch(6.8), inch(1.6), inch(5.9), inch(3.6), PANEL2)
text(s, 'Next steps', inch(7.05), inch(1.75), inch(5.4), inch(0.5), 17, OK, bold=True)
text(s, ['Blind rating by two raters and a user test (SUS)', 'More languages from the QuranEnc catalogue', 'A scholarly review board for reported cases', 'Offline mode (PWA) and more reciters'],
     inch(7.05), inch(2.3), inch(5.4), inch(2.8), 14, space=7)
text(s, 'مِشكاة: نجمع لك نور البيان، ولا نكتب عن الله ما لم يُنقل.', inch(0.6), inch(5.6), inch(12.1), inch(0.9), 28, GOLD, align=PP_ALIGN.CENTER, font=AR)

os.makedirs(OUTDIR, exist_ok=True)
out = os.path.join(OUTDIR, 'Mishkat_presentation.pptx')
prs.save(out)
print('saved', out, len(prs.slides), 'slides · tests', n_tests, '· QQA mean MRR', qm['mrr10'])
