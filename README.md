# مِشكاة · Mishkat — The Quran Galaxy Guide

> ﴿…كَمِشْكَوٰةٍ فِيهَا مِصْبَاحٌ…﴾ (An-Nur 24:35) — a niche gathers the lamp’s light.
> Mishkat gathers, around your question, the light of vetted tafsir — inside a 3D galaxy whose 77,433 stars are the words of the Quran.

**Islamic AI Challenge 2026 · Track 1 — Knowledge dialogue & reliable answers**
Languages: العربية · English · Français · Cost to run: 0 (free tiers)

## What it does
Type **an idea, a question, a surah name, a verse number or part of a verse**:

| You type | Mishkat answers |
|---|---|
| `الصبر` · `how to deal with sadness` · `la patience` | An **explanatory paragraph made only of verbatim tafsir sentences** (Al-Muyassar in Arabic, Al-Mukhtasar in English/French), each tagged with its verse; then **surahs ranked by relevance**, each with **📖 Read surah** and **▶ Listen** |
| `2:255`, `البقرة 255`, `sourate 18 verset 10`, `Ayat al-Kursi` | The verse, its translation and three tafsirs (Muyassar, Mukhtasar, As-Sa‘di) |
| `Al-Kahf`, `سورة يس` | The whole surah in the reader |
| `إن الله مع الصابرين` / a pasted Uthmani verse | Exact verification: every place it appears |
| `هل هذه آية: النظافة من الإيمان` | “Not found in the Quran — do not attribute it” (hadith/sayings), or the *correct* wording when a verse is misquoted, or a warning when **two verses are merged** |
| `ما حكم الموسيقى؟` / `is music haram` | **Abstains** and refers to qualified scholars (no fatwas, no personal rulings, no dream interpretation) |

The **reader** shows the surah in Uthmani script, navigates verse by verse, and plays Sheikh Alafasy’s recitation with **word-by-word synchronised highlighting** — while the camera flies through the galaxy and the recited word glows.

## The golden rule — how “zero hallucination” is enforced by architecture
| Content | Produced by | Guarantee |
|---|---|---|
| Quran text | `core.json` = byte-exact Tanzil text (SHA-256 checked in tests) | the model never writes a verse |
| Explanation | sentences **sliced verbatim** from Al-Muyassar / Al-Mukhtasar | test: every quote is a substring of its source |
| Glue text | hand-written templates (3 languages) | no free text |
| Everything else | — | abstain & refer |

The LLM (open models on Groq’s free tier) has three narrow jobs, all returning JSON that is **verified twice** (server + browser):
1. `expand` — classify intent (ruling → abstain) and propose **search keywords** (used only for retrieval, never displayed);
2. `select` — pick **verse ids** from a closed candidate list and **sentence ids** from a closed numbered list of tafsir sentences;
3. nothing else. Out-of-list ids are dropped; a failure, timeout or quota error falls back to the deterministic engine, which always works.

**Verified AI recall.** `expand` may also propose verse references it considers central (e.g. 17:23 for *kindness to parents*). A proposed verse enters the candidate list only if it exists **and** its real text (verse, tafsir or translation) contains a word of the query; hallucinated or off-topic references are silently discarded (tested). When the LLM selects ≥ 3 verses, only its selection is shown (precision first).

**Pre-computed answers.** `eval/precompute_cache.mjs` stores the LLM outputs for ~140 frequent questions (all interface examples, 3 languages) in `public/data/llm_cache.json`. The browser uses them first — they are re-verified by the engine exactly like live outputs — so the demo stays fully AI-augmented even when the free API quota is exhausted.

```
query ─► famous names / references / surah names (deterministic)
      ─► guard: fatwa · personal case · dream  → abstain + referral
      ─► quote verification (imla'i + Uthmani, exact / misquote / merged verses / translated quotes)
      ─► [LLM expand: intent + keywords] ─► BM25 over Quran + Mukhtasar + Muyassar (+ translations) with a
         trilingual thesaurus ─► [LLM select: verse ids + sentence ids from closed lists] ─► verifier
      ─► paragraph (verbatim sentences) + surahs ranked by relevance + galaxy flight
```

## Results (synthetic benchmark, `eval/`)
See [`eval/results/REPORT.md`](eval/results/REPORT.md) — 338 seeded synthetic questions across 16 categories (references, surah names, exact/misquoted/merged verses, sayings wrongly attributed to the Quran, fatwa/personal/dream questions, 30 topics × 3 languages), compared with a “Ctrl+F” baseline, plus the AI-augmented mode and a model comparison (`eval/results/bench_llm.json`).

## Run it
```bash
npm test                 # 24 unit/integration tests (node ≥ 18, no dependencies)
npm start                # http://127.0.0.1:8787  (LLM on if GROQ_API_KEY is set in .dev.vars)
npm run eval             # benchmark → eval/results/REPORT.md
python data_build/fetch_sources.py && python data_build/fetch_extra.py && npm run build:data   # rebuild data
```
Deployment (Cloudflare Pages + Functions, free): see [DEPLOY.md](DEPLOY.md).

## Repository map
| Path | Content |
|---|---|
| `public/` | the web app (no build step): `index.html`, `js/engine.js` (engine), `js/app.js` (UI), `js/galaxy.js` (WebGL galaxy), `js/i18n.js`, `data/` |
| `functions/` | Cloudflare Pages Functions: `/api/expand`, `/api/select`, `/api/health` (LLM calls, key server-side) |
| `data_build/` | scripts that download, freeze (SHA-256 manifest) and build every source |
| `tests/` | `node --test` suite (data integrity, routing, verification, guard, hostile-LLM tests) |
| `eval/` | golden set generator, evaluation, model benchmark |
| `server.mjs` | zero-dependency local server with the same API |

## Documentation
[SOURCES.md](SOURCES.md) (sources registry & licences) · [TOOLS.md](TOOLS.md) (tools & components) · [BASELINE.md](BASELINE.md) (pre-existing work disclosure) · [DEPLOY.md](DEPLOY.md) · [LICENSE](LICENSE)

---
### بالعربية
«مشكاة» محرك بحث قرآني مُعزَّز بالذكاء الاصطناعي: تكتب فكرة أو سؤالًا أو سورة أو آية، فيأتيك **بيانٌ مؤلَّف من جمل منقولة حرفيًّا من التفسير الميسر** (أو المختصر)، كل جملة موسومة بآيتها، ثم **السور مرتبة حسب صلتها** مع زر لقراءة السورة آيةً آية وزر للاستماع بتلاوة **متزامنة كلمةً كلمة**، والكاميرا تطير في مجرّة كلمات القرآن. لا يكتب النموذج اللغوي حرفًا يُعرض عليك؛ إنما يختار من قوائم مغلقة، ويتحقق المدقق من كل اختيار، وتمتنع «مشكاة» عن الفتوى والحالات الشخصية.

### En français
Mishkat est un moteur de recherche coranique augmenté par l’IA : une idée, une question, une sourate ou un verset donne **un paragraphe explicatif composé uniquement de phrases citées mot pour mot du tafsir** (Al-Muyassar / Al-Mukhtasar), chacune avec sa référence, puis **les sourates classées par pertinence**, avec lecture verset par verset et **récitation synchronisée mot à mot**, dans une galaxie 3D des mots du Coran. Le modèle n’écrit rien de ce que vous lisez : il choisit dans des listes fermées, un vérificateur contrôle tout, et Mishkat s’abstient sur les fatwas et cas personnels.
