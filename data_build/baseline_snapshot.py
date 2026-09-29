# -*- coding: utf-8 -*-
"""Writes BASELINE.md: honest disclosure of pre-existing work with SHA-256 fingerprints."""
import datetime
import hashlib
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {'cache', 'node_modules', '.git', 'saadi', 'timing', '.wrangler'}
EXT = ('.js', '.mjs', '.py', '.html', '.css', '.json', '.bin', '.svg', '.md', '.txt', '.toml')

rows = []
for p in sorted(ROOT.rglob('*')):
    rel = p.relative_to(ROOT)
    if not p.is_file() or set(rel.parts) & SKIP_DIRS or p.name in ('.dev.vars', 'BASELINE.md') or not p.name.endswith(EXT):
        continue
    h = hashlib.sha256(p.read_bytes()).hexdigest()
    rows.append(f"| `{rel.as_posix()}` | {p.stat().st_size:,} | `{h[:16]}…` |")

md = f"""# Baseline disclosure · الإفصاح عن نسخة الأساس

The challenge rules allow pre-existing work if its baseline is disclosed before 4 October 2026; only work done during the challenge (4–6 October 2026) is evaluated. This file documents, honestly and with fingerprints, what existed before.

## 1. Pre-existing project: “Quran Cartography” (author’s own, July–August 2026)
- A letter- and word-level database of the Quran (`quran.db`: 6,236 verses, 77,433 words, 326,159 letters) built from the Tanzil text, with a semantic colour layer (names of Allah, prophets, angels, Satan).
- An atlas of static figures and 14 interactive Plotly 3D “galaxies” with audio, served as a local static website.
- **No AI component, no search, no tafsir, no translations, no online deployment.**
- Fingerprints: `quran.db` SHA-256 `28a57cd5d6a12d443745c71a33bd6a93c6b0797032e112bcc78feeac812f5309`; Tanzil text `bf4f57b968d03f4131c070b1e285da9be0e0a108a21c910e872801ca273312c8`.

## 2. Mishkat prototype written before the challenge window (28–29 September 2026)
For full transparency: a first version of this repository (engine, WebGL galaxy, UI, tests, evaluation, documentation) was written on 28–29 September 2026 while preparing the application. It is part of the declared baseline. Snapshot generated {datetime.date.today().isoformat()} ({len(rows)} files):

| File | Bytes | SHA-256 (prefix) |
|---|---|---|
""" + "\n".join(rows) + """

## 3. Work during 4–6 October 2026 (evaluated)
Recorded in `CHANGELOG.md` and in dated git commits from 4 October 2026.
"""
(ROOT / 'BASELINE.md').write_text(md, encoding='utf-8')
print(len(rows), 'files fingerprinted')
