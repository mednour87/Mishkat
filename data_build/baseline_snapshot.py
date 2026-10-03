# -*- coding: utf-8 -*-
"""Writes BASELINE.md: honest disclosure of pre-existing work with SHA-256 fingerprints.

Covers everything that exists before the challenge window (4 October 2026, 09:00 Riyadh):
the repository at HEAD, its dated commit history, and the planning files and code drafts kept
next to the repository (01_PLAN/, 05_EXECUTION/). Run it on the last commit before the window,
then tag that commit `baseline-2026-10-03`.
"""
import datetime
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTSIDE = ROOT.parent   # IslamicAI_Challenge/
SKIP_DIRS = {'cache', 'node_modules', '.git', 'saadi', 'timing', '.wrangler'}
EXT = ('.js', '.mjs', '.py', '.html', '.css', '.json', '.bin', '.svg', '.md', '.txt', '.toml', '.jsonl')


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


rows = []
for p in sorted(ROOT.rglob('*')):
    rel = p.relative_to(ROOT)
    if not p.is_file() or set(rel.parts) & SKIP_DIRS or p.name in ('.dev.vars', 'BASELINE.md') or not p.name.endswith(EXT):
        continue
    rows.append(f"| `{rel.as_posix()}` | {p.stat().st_size:,} | `{sha(p)[:16]}…` |")

prep = []
for d in ('01_PLAN', '05_EXECUTION'):
    for p in sorted((OUTSIDE / d).rglob('*')):
        if p.is_file():
            prep.append(f"| `{p.relative_to(OUTSIDE).as_posix()}` | {p.stat().st_size:,} | `{sha(p)[:16]}…` |")

def git(*a):
    return subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout.strip()

head = git('rev-parse', '--short', 'HEAD')
log = git('log', '--reverse', '--format=| `%h` | %ad | %s |', '--date=short')
log = '\n'.join(l if len(l) < 260 else l[:255] + '… |' for l in log.splitlines())
n_commits = len(log.splitlines())

md = f"""# Baseline disclosure · الإفصاح عن نسخة الأساس

The challenge rules allow pre-existing work if its baseline is disclosed before 4 October 2026; only work done during the challenge (4 October 09:00 – 6 October 23:59, Riyadh time) is evaluated. This file documents, honestly and with fingerprints, **everything** that existed before the window.

**Last commit before this disclosure: `{head}`**; the git tag `baseline-2026-10-03` is placed on the commit that adds this file. Every commit after that tag is challenge work.

## 1. Pre-existing project: “Quran Cartography” (author’s own, July–August 2026)
- A letter- and word-level database of the Quran (`quran.db`: 6,236 verses, 77,433 words, 326,159 letters) built from the Tanzil text, with a semantic colour layer (names of Allah, prophets, angels, Satan).
- An atlas of static figures and 14 interactive Plotly 3D “galaxies” with audio, served as a local static website.
- **No AI component, no search, no tafsir, no translations, no online deployment.**
- Fingerprints: `quran.db` SHA-256 `28a57cd5d6a12d443745c71a33bd6a93c6b0797032e112bcc78feeac812f5309`; Tanzil text `bf4f57b968d03f4131c070b1e285da9be0e0a108a21c910e872801ca273312c8`.

## 2. Mishkat, written before the challenge window (28 September – 3 October 2026)
For full transparency: this repository was written and deployed (private preview) **before** the window, while preparing the application and after its acceptance. All of it is part of the declared baseline and is not presented as challenge work:
- 28–29 Sep: engine (routing, BM25, guard, closed-list AI selection, quote verifier), WebGL galaxy, reader with synchronised recitation, tests, evaluation, documentation (v2).
- 1–2 Oct: v3–v8 interface (three moments, Mushaf + tafsir study, logo), spoken queries, reference-pack integration (answer levels A–D, Quranpedia subject index, glossary), Web Worker search, published fatwas (binbaz.org.sa), Sunnah section (HadeethEnc), hybrid semantic search (bge-m3), Qur'an QA 2023 benchmark, deck, OpenRouter provider, private deployment on Cloudflare Pages.
- 3 Oct: audit of errors (`01_PLAN/CARTOGRAPHIE_ERREURS_ET_AMELIORATIONS.md`), plan v5, execution files and code drafts (`05_EXECUTION/`), and the first corrections of that audit (tasks T010–T020: AI selection always runs, status questions without «هل», over-refusal bench, short answer only when AI-confirmed, circuit breakers, semantic ranking moved to the browser, sensitivity levels, spelling suggestions, Origin check, single confidence badge); later the same day, at the author's request: the **extractive evidence-bound short answer (RAG)** — closed list of tafsir/hadith sentences, `/api/answer` composer + judge, verbatim display; tool modules not yet wired into the page (Hijri calendar, khatma plan with .ics, panels, local preferences); bootstrap confidence intervals of the public benchmark; the benefit-measurement kit (blind rating sheet vs a general chatbot, automatic check of chatbot quotations, user-test protocol with SUS).

### 2.1 Dated commits before the window ({n_commits})
| Commit | Date | Message |
|---|---|---|
{log}

### 2.2 Repository files at the baseline commit ({len(rows)} files, snapshot {datetime.date.today().isoformat()})
| File | Bytes | SHA-256 (prefix) |
|---|---|---|
""" + "\n".join(rows) + f"""

### 2.3 Planning documents and code drafts kept next to the repository ({len(prep)} files)
Plans and drafts written before the window. Draft code in `05_EXECUTION/code_drafts/` is **not** integrated in the repository at the baseline commit; when parts of it are integrated during the window, the commit says so.

| File | Bytes | SHA-256 (prefix) |
|---|---|---|
""" + "\n".join(prep) + """

## 3. Work during 4–6 October 2026 (evaluated)
Recorded in `CHANGELOG.md` and in dated git commits after the tag `baseline-2026-10-03` (`git log baseline-2026-10-03..HEAD`).
"""
(ROOT / 'BASELINE.md').write_text(md, encoding='utf-8')
print(len(rows), 'repository files,', len(prep), 'planning files,', n_commits, 'commits fingerprinted at', head)
