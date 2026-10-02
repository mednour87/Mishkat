# Sources registry · سجل المصادر

Every religious text shown by Mishkat comes verbatim from one of these sources. All downloads are frozen in `data_build/cache/` with a SHA-256 manifest (`manifest.json`) so the build is reproducible and any upstream change is detected.

| # | Content level | Source | Used for | Access | Licence / conditions | How we comply |
|---|---|---|---|---|---|---|
| S1 | Quran text | **Tanzil Project — Quran Uthmani**, Hafs ‘an ‘Asim, Kufan count (6,236 verses) | the only source of displayed verse text | `data_build/quran-uthmani.txt` (tanzil.net) | CC BY 3.0 — verbatim copies only, cite and link tanzil.net | byte-exact copy (test `data: verse texts are the Tanzil text`), SHA-256 `bf4f57b9…12c8`, attribution in the app (About) and here. The basmala that Tanzil prefixes to verse 1 is *displayed* as a header line (presentation only; text unchanged) |
| S2 | Tafsir (ar) | **At-Tafsir Al-Muyassar** — King Fahd Glorious Quran Printing Complex (`arabic_moyassar`) | Arabic explanatory paragraph; search index; reader | QuranEnc.com API v1 | redistribution allowed with no modification, clear reference to the publisher and QuranEnc.com | verbatim sentences only; source + link shown under every paragraph |
| S3 | Tafsir (ar/en) | **Al-Mukhtasar fi Tafsir al-Quran al-Karim** — Tafsir Center for Quranic Studies (`arabic_mokhtasar`, `english_mokhtasar`) | English explanations; search index; reader | QuranEnc.com API v1 | same as S2 | same as S2 |
| S4 | Translation (en) | **Noor International Center** translation (`english_saheeh`, v1.1.2) | translation line in lists and reader; English search index | QuranEnc.com | same as S2 | footnote markers removed for display only |
| S5 | *(removed 1 Oct 2026)* | French was removed from the product (Arabic + English only); the French translation and tafsir files are no longer loaded or served | — | — | — | — |
| S6 | Tafsir (ar) | **Tafsir As-Sa‘di** — «تيسير الكريم الرحمن في تفسير كلام المنان» (Quran.com tafsir 91) | third tafsir tab in the reader (per-surah files, lazy-loaded) | Quran.com API v4 | public API; attribution to the author and Quran.com | HTML tags stripped (format conversion only); where Sa‘di comments several verses together the reader says so |
| S7 | Search index | Quran.com **imla'i script** of the verses | normalised search/verification index only — **never displayed** | Quran.com API v4 | public API | used only to match what users type |
| S8 | Metadata | Quran.com chapter names (ar/en) | surah names & aliases | Quran.com API v4 | public API | — |
| S9 | Audio + timings | Sheikh **Mishary Rashid Alafasy**, Quran.com recitation 7: audio files and **word-level timing segments** | recitation and word-synchronised highlighting (6,230/6,236 verses synced; 6 verses fall back to verse-level) | streamed from `verses.quran.com`; timings frozen in `public/data/timing/` | public API, attribution to the reciter and Quran.com | streamed, not redistributed |
| S10 | Baseline | **Quran Cartography** (author’s own pre-existing project): word database, semantic colour layer, galaxy geometry | galaxy points & colours | `quran.db` (not shipped; build input) | author’s own work | disclosed in [BASELINE.md](BASELINE.md) |

### Sources named by the challenge’s scientific reference pack (added 1 Oct 2026)
The pack «المرجعية والحزمة العلمية والبيانات» (islamicaich.org) lists the approved references; full study in `../02_SOURCES/REFERENTIEL_DU_DEFI.md`.

| # | Content | Source | Used for | Access | Licence / conditions | How we comply |
|---|---|---|---|---|---|---|
| S11 | Subject index | **Quranpedia.net — «الموضوعات القرآنية»** (6,100 human-curated topics → verses), dump `topics-index.json.gz` v2026-10-01 | when the query *is* a topic («الصبر»): verses from the index, explained by S2/S3 tafsir units; sub-topics shown | official dump → `public/data/qp_topics.json` (`data_build/build_quranpedia_data.py`) | free in apps; republishing the data needs credit + version | source, URL and version inside the file and in the app; every reference checked against S1 (0 invalid of 6,100 topics); never used for a real question (test) |
| S12 | Surah information | **Quranpedia.net — «معلومات السور»** (introduction, topics, purposes, names), dump `surahs.json.gz` v2026-09-26 | «عن السورة» in surah cards and reader | official dump → `public/data/qp_surahs.json` | same as S11 | HTML reduced to text, shown verbatim with source + version |
| S13 | Tafsir of the first centuries | **جامع البيان — At-Tabari (d. 310 AH)**, Quranpedia book 4 | «الطبري» tab in the reader | live, `POST /api/tafsir` → `api.quranpedia.net/v1/ayah/{s}/{a}/book/4` (cached) | free live API, 120 req/min/IP | page by page with volume/page reference; starts at the verse’s own heading and stops at the next one; otherwise labelled «pages where the verse occurs». Ibn Abi Hatim (book 149) was tested and **left out**: no per-verse headings |
| S14 | Hadith | **الموسوعة الحديثية — Dorar.net** public API (`dorar_api.json`) | «give me a hadith…», «is this a hadith?», and every Arabic saying not found in the Quran | live, `POST /api/hadith` (server-side, cached, 30 req/min) | API offered by Dorar to websites to display search results | results shown verbatim: text, narrator, muhaddith, source, page and **verdict**; Mishkat never selects, grades or generates a hadith; no match → «لا يُنسب إلى النبي ﷺ دون مصدر وحكم معتمد» |
| S15 | Objections (الشبهات) | **موسوعة بينات — Osoul Center** (bayenat.net) | links to the reviewed answer for objection-type questions | 933 question **titles + URLs** collected from the category pages, 10 s between requests (robots.txt) | public site; only titles/links stored | no answer text copied; matching calibrated on the pack’s test questions (exact question first, weak overlaps refused) |
| S16 | Terminology | Pack glossary (10 terms, p. 8) + **الجمهرة** (islamic-content.com) for «الاجتهاد» | term card: Arabic term, approved English equivalent, usage rule | `public/js/glossary.js` | copied word for word | no French equivalent invented; link to the Jamhara entry |

Also linked (not ingested): **موسوعة التفسير — Dorar** (`dorar.net/tafseer/{surah}`, organised by sections, not verses), **binbaz.org.sa** and **alifta.gov.sa** (fatwa referral), **shamela.ws** (no public API).

### Added 1–2 Oct 2026 (preparation, declared baseline)

| # | Kind | Source | Used for | Access | Licence / terms | Integrity rule |
|---|---|---|---|---|---|---|
| S17 | Classical tafsirs | **Tafsir Ibn Kathir** (d. 774 AH, Quran.com 14), **Tafsir Ibn Kathir abridged, English** (Darussalam, Quran.com 169), **Ma‘alim at-Tanzil — Al-Baghawi** (d. 516 AH, Quran.com 94), **Al-Jami‘ li-Ahkam al-Quran — Al-Qurtubi** (d. 671 AH, Quran.com 90) | tabs of the tafsir zone, next to S2, S3, S6, S13 | live, `POST /api/tafsir` → `api.quran.com/api/v4/tafsirs/{id}/by_ayah/{s}:{a}` (cached) | public API; attribution to the author and Quran.com | HTML reduced to text on the server (no markup reaches the browser); book, author and death date shown; when the book explains several verses together, the reader says which |
| S18 | Word-by-word transliteration | Quran.com word-by-word transliteration | English reader (under each Arabic word, synchronised with the recitation); **Latin search index** `public/data/latin_index.json` (`data_build/build_latin_index.py`) to find a word typed in Latin letters ("mishkat") | frozen in `public/data/translit/` | public API, attribution | shown only in English mode; the index is never displayed |
| S19 | Reading the tafsir aloud | **Groq — Orpheus TTS** (`canopylabs/orpheus-arabic-saudi`, `canopylabs/orpheus-v1-english`), only when the visitor’s browser has no voice for the language | 🔊 in the tafsir zone | `POST /api/tts` (≤ 200 characters per request, cached) | Groq terms; the account owner must accept the models’ terms once in the Groq console | reads only a tafsir text already on the screen; labelled «قراءة آلية لنص التفسير — ليست تلاوة»; never used for Quran recitation (always S9) |

### Added 2 Oct 2026 (preparation, declared baseline)

| # | Kind | Source | Used for | Access | Licence / terms | Integrity rule |
|---|---|---|---|---|---|---|
| S20 | Published fatwas (level D) | **Official site of Sheikh Abd al-Aziz ibn Baz** (binbaz.org.sa) — former Grand Mufti of Saudi Arabia, head of the Council of Senior Scholars and of the Permanent Committee for Scholarly Research and Ifta | «فتاوى منشورة في المسألة» under every fatwa request (Arabic) | live, `POST /api/fatwa` → the site's own search service `binbaz.org.sa/api/search?type=fatwa`, then the fatwa page (cached 7 days, 30 req/min) | public site; each fatwa shown with its link and attribution | Mishkat never rules: published fatwas only, verbatim (question, answer, the Sheikh's audio when published); the AI may only filter the site's own result list (numbers from a closed list); notice «ليست جوابًا عن حالتك الخاصة» + referral to the General Presidency of Scholarly Research and Ifta |
| S21 | Sunnah | **HadeethEnc — موسوعة الأحاديث النبوية المترجمة** (hadeethenc.com, sister project of QuranEnc): 3,572 hadiths (ar), 2,328 (en), each with attribution, grade, explanation, lessons and references | «من السنة النبوية» under topic answers | official API v1 → `data_build/fetch_hadeethenc.py` → `public/data/hadeeth/` (`build_hadeeth.py`) | free project, offered through a public API; attribution + link to each hadith | verbatim; hadiths whose grade mentions ضعيف/موضوع/منكر are dropped (second safeguard); chosen by keyword search + AI filter on a closed list (or, without AI, only when every query word occurs) |
| S22 | Semantic index | **bge-m3** (BAAI, MIT licence) via **Cloudflare Workers AI** — vectors of «verse (S7) — Al-Mukhtasar (S3)» for the 6,236 verses, int8 | candidates for the AI's closed-list selection; second check of AI-proposed references | `data_build/build_vectors.py` → `public/data/vec/` (read by the API only); question embedded live, `POST /api/dense` | model MIT; Workers AI terms | returns verse **references** only; never decides alone what is shown |
| S23 | Evaluation only | **Qur'an QA 2023, Task A** (bigIR, Qatar University): questions, thematic passages, gold answers, official scorer | public benchmark of the search (MAP@10, MRR@10) — `eval/run_qqa23.mjs`, results in `eval/qqa23/RESULTS.md` | `eval/qqa23/get_data.sh` (downloaded, not committed) | CC BY-NC-ND 4.0 — used unmodified, not redistributed | — |

## What is deliberately NOT used
- No machine translation of the Quran or of tafsir, ever.
- No hadith text is ever produced or chosen by the machine: hadith only appear as Dorar search results, verbatim, with the muhaddith’s verdict.
- No answer text from Bayyinat is copied: only question titles and links.
- No numerology / “numerical miracle” claims from the baseline project.
- No user data: the benchmark is 100 % synthetic (`eval/make_golden.mjs`, seeded); queries are not stored.

## Answer levels (defined by the challenge’s reference pack) and behaviour
Every answer shows its level in the interface.

| Level | Scope in the pack | Mishkat behaviour |
|---|---|---|
| A — stable foundational information | Quran, authentic hadith, … | verse / range / surah display (S1), verse verification, Dorar hadith results (S14) |
| B — explanation, definition | concepts, general questions | complete tafsir units (S2/S3/S6/S13) for verses chosen by the AI from a closed list or by the subject index (S11); glossary (S16) |
| C — disputed or highly sensitive | juristic differences, polemics | verified context packs first, «scholars may differ» template (no claim of agreement), ijtihad defined from S16, referral links, Bayyinat answers (S15) |
| D — fatwa or personal case | ruling on an individual case | no ruling: fixed template + official fatwa links + published fatwas of Sheikh Ibn Baz verbatim (S20) + related verses chosen by the AI, labelled «not a fatwa» |
