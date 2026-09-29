# Sources registry · سجل المصادر

Every religious text shown by Mishkat comes verbatim from one of these sources. All downloads are frozen in `data_build/cache/` with a SHA-256 manifest (`manifest.json`) so the build is reproducible and any upstream change is detected.

| # | Content level | Source | Used for | Access | Licence / conditions | How we comply |
|---|---|---|---|---|---|---|
| S1 | Quran text | **Tanzil Project — Quran Uthmani**, Hafs ‘an ‘Asim, Kufan count (6,236 verses) | the only source of displayed verse text | `data_build/quran-uthmani.txt` (tanzil.net) | CC BY 3.0 — verbatim copies only, cite and link tanzil.net | byte-exact copy (test `data: verse texts are the Tanzil text`), SHA-256 `bf4f57b9…12c8`, attribution in the app (About) and here. The basmala that Tanzil prefixes to verse 1 is *displayed* as a header line (presentation only; text unchanged) |
| S2 | Tafsir (ar) | **At-Tafsir Al-Muyassar** — King Fahd Glorious Quran Printing Complex (`arabic_moyassar`) | Arabic explanatory paragraph; search index; reader | QuranEnc.com API v1 | redistribution allowed with no modification, clear reference to the publisher and QuranEnc.com | verbatim sentences only; source + link shown under every paragraph |
| S3 | Tafsir (ar/en/fr) | **Al-Mukhtasar fi Tafsir al-Quran al-Karim** — Tafsir Center for Quranic Studies (`arabic_mokhtasar`, `english_mokhtasar`, `french_mokhtasar`) | English/French paragraph; search index; reader | QuranEnc.com API v1 | same as S2 | same as S2 |
| S4 | Translation (en) | **Noor International Center** translation (`english_saheeh`, v1.1.2) | translation line in lists and reader; English search index | QuranEnc.com | same as S2 | footnote markers removed for display only |
| S5 | Translation (fr) | **Rachid Maach** translation — Rowwad center (`french_rashid`, v1.0.3) | French translation; French search index | QuranEnc.com | same as S2 | same as S4 |
| S6 | Tafsir (ar) | **Tafsir As-Sa‘di** — «تيسير الكريم الرحمن في تفسير كلام المنان» (Quran.com tafsir 91) | third tafsir tab in the reader (per-surah files, lazy-loaded) | Quran.com API v4 | public API; attribution to the author and Quran.com | HTML tags stripped (format conversion only); where Sa‘di comments several verses together the reader says so |
| S7 | Search index | Quran.com **imla'i script** of the verses | normalised search/verification index only — **never displayed** | Quran.com API v4 | public API | used only to match what users type |
| S8 | Metadata | Quran.com chapter names (ar/en/fr) | surah names & aliases | Quran.com API v4 | public API | — |
| S9 | Audio + timings | Sheikh **Mishary Rashid Alafasy**, Quran.com recitation 7: audio files and **word-level timing segments** | recitation and word-synchronised highlighting (6,230/6,236 verses synced; 6 verses fall back to verse-level) | streamed from `verses.quran.com`; timings frozen in `public/data/timing/` | public API, attribution to the reciter and Quran.com | streamed, not redistributed |
| S10 | Baseline | **Quran Cartography** (author’s own pre-existing project): word database, semantic colour layer, galaxy geometry | galaxy points & colours | `quran.db` (not shipped; build input) | author’s own work | disclosed in [BASELINE.md](BASELINE.md) |

## What is deliberately NOT used
- No machine translation of the Quran or of tafsir, ever.
- No hadith corpus (out of scope): quotes that are not verses are reported as “not found in the Quran”, never labelled as hadith by the machine.
- No numerology / “numerical miracle” claims from the baseline project.
- No user data: the benchmark is 100 % synthetic (`eval/make_golden.mjs`, seeded); queries are not stored.

## Content levels and behaviour
| Level | Example | Behaviour |
|---|---|---|
| A — Quran text | verse display | S1 only |
| B — Vetted explanation | paragraph | verbatim sentences from S2/S3, each with verse reference and source link |
| C — Interface text | “I found 7 verses…” | fixed human-written templates |
| D — Everything else (rulings, personal advice, dreams, unsupported claims) | “ما حكم…؟” | abstain + referral to the official fatwa authority / a scholar |
