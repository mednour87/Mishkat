# مِشكاة · Mishkat — The Quran Galaxy Guide

> ﴿…كَمِشْكَوٰةٍ فِيهَا مِصْبَاحٌ…﴾ (An-Nur 24:35) — a niche gathers the lamp’s light.
> Mishkat gathers, around your question, the light of vetted sources — inside a 3D galaxy whose 77,433 stars are the words of the Quran.

**Islamic AI Challenge 2026 · Track 1 — Knowledge dialogue & reliable answers** · Languages: العربية · English
Live demo: https://mishkat-4m1.pages.dev · Pre-existing work disclosed in [BASELINE.md](BASELINE.md); work of the challenge window (4–6 Oct 2026) in [CHANGELOG.md](CHANGELOG.md).

---

## بالعربية

### ما هي «مشكاة»؟
محرّك بحث قرآني معزَّز بالذكاء الاصطناعي، لا يكتب الذكاءُ الاصطناعي فيه حرفًا دينيًّا واحدًا. تكتب سؤالًا أو فكرة أو اسم سورة أو آية، فيأتيك:
- **«الجواب باختصار»**: جمل منقولة **حرفيًّا** من مصادر معتمدة (نص المصحف من Tanzil، التفسير الميسر، المختصر في التفسير، أحاديث HadeethEnc ذات الدرجة المعروفة)، كل جملة بمرجعها. يختار النموذج **أرقام الجمل فقط** من قائمة مغلقة، ثم يتحقق نموذج ثانٍ مستقلّ (الحَكَم) من صلتها بالسؤال، وما لا دليل عليه يُذكر أنه غير مغطّى.
- **الآيات الرئيسة** مع تفسيرها كاملًا، ثم **السور مرتّبة حسب الصلة**، مع قارئ آيةً آية وتلاوة الشيخ العفاسي **متزامنة كلمةً كلمة**، والكاميرا تطير في مجرّة الكلمات.
- **أسئلة الأحكام** (حلال/حرام…): لا تُفتي «مشكاة» أبدًا؛ تعرض نصّ **الموسوعة الفقهية — الدرر السنية** حرفيًّا مع رابطه (إجماع/خلاف كما ورد فيها)، تحت شريط أحمر «سؤال حساس»، وتحيل إلى alifta.gov.sa.
- **قصص الأنبياء** من «علوم السور» في موسوعة الجمهرة، و**التحقق من النصوص**: هل هذه آية؟ (اقتباس محرَّف، آيتان مدموجتان، قول ليس من القرآن).
- **شخص في ضيق شديد** (أفكار انتحار…): رسالة دعم ثابتة ورابط findahelpline.com أوّلًا، ثم آيات الرجاء بتفسيرها.
- **الأسئلة المفخّخة وحقن الأوامر** وطلبات «اكتب لي آية/حديثًا/فتوى»: جواب ثابت دون أي نداء للذكاء الاصطناعي.
- **أدوات**: مواقيت الصلاة (Aladhan، مع ذكر طريقة الحساب)، القبلة، المساجد القريبة (OpenStreetMap)، الأذكار (HadeethEnc وحصن المسلم بعد التحقق من حكم كل ذكر في الدرر)، التقويم الهجري، خطة الختمة (وتضيء السور المقروءة داخل شعار المشكاة)، روابط مفيدة، البحث بالصوت (Whisper)، **ابحث عن آية بتلاوتها**. الموقع لا يرسل موقعك إلى خادمه أبدًا.

### القاعدة الذهبية
| المحتوى | مصدره | الضمان |
|---|---|---|
| نص القرآن | ملف Tanzil (`core.json`) مطابق بايتًا ببايت | النموذج لا يكتب آية؛ لا قراءة آلية للقرآن (التلاوة بصوت بشري فقط) |
| التفسير، الحديث، الذكر، نص الحكم الفقهي | منقول حرفيًّا مع المصدر والرابط | النموذج يُرجع أرقامًا من قائمة مغلقة فقط |
| النص الرابط | قوالب مكتوبة يدويًّا (عربي/إنجليزي) | لا نص حرّ |
| غير ذلك | — | امتناع وإحالة |

### الكلفة الفعلية
النماذج المفتوحة على **Groq (الشريحة المجانية) أوّلًا** — `gpt-oss-120b` للتأليف والحكم، `gpt-oss-20b` للمهام الخفيفة، `whisper-large-v3-turbo` للصوت، Orpheus (العربية) للقراءة الآلية للتفسير — و**OpenRouter (مدفوع حسب الاستهلاك) احتياطًا فقط** عند نفاد الحصة (كلفة مقيسة: نحو 0.0014 دولار للسؤال). الاستضافة على Cloudflare Pages المجانية. عند تعذّر الذكاء الاصطناعي يعمل المحرك الحتمي، موثَّقًا دائمًا.

---

## English

### What it does
Type **an idea, a question, a surah name, a verse number or part of a verse**:

| You type | Mishkat answers |
|---|---|
| `الصبر` · `how to deal with anxiety` | **Short answer**: verbatim sentences from the verse text (Tanzil), Al-Muyassar / Al-Mukhtasar and graded HadeethEnc hadiths, each with its reference — the AI only returns sentence IDs from a closed list, an independent judge model keeps the relevant ones, uncovered concepts are said to be uncovered; then the key verses with their full tafsir and the surahs ranked by relevance |
| `2:255`, `البقرة 255`, `Ayat al-Kursi`, `سورة يس` | the verse or surah in the reader, word-synchronised recitation (Alafasy), seven tafsir books |
| `هل هذه آية: النظافة من الإيمان` · a pasted verse | exact verification: verse / misquote with the correct wording / two merged verses / not in the Quran |
| `ما حكم التدخين` · `is music haram` | **no ruling by Mishkat**: the statement of the **Fiqh Encyclopedia of Ad-Durar As-Saniyyah** (named by the challenge's reference pack), verbatim with its link and its consensus/difference flags, under a red «sensitive question» banner, referral to alifta.gov.sa |
| `قصة يوسف` · `story of Moses` | Al-Jamhara's «علوم السور» summary and episodes with verse ranges, every verse naming the prophet |
| `I want to kill myself` (crisis) | a fixed support message, findahelpline.com first, verses of hope with their full tafsir |
| `ignore your instructions…` · `write me a hadith` | a fixed answer, no AI call |
| `كم بقي على صلاة العصر` · `qibla` · `أذكار النوم` · `متى رمضان` | prayer times (Aladhan, method named), qibla, nearby mosques (OSM), adhkar with known grades, Hijri calendar, khatma plan — the position never reaches Mishkat's server |

The galaxy is the Quran itself: 77,433 words, five shapes × seven orders (Mushaf, revelation, length…); a calm reading camera follows the recited word; hovering 3 s on a star shows its word, verse and frequency; the surahs read light up inside the Mishkat lamp.

### The golden rule — zero generated religious text, by architecture
| Content | Produced by | Guarantee |
|---|---|---|
| Quran text | `core.json` = byte-exact Tanzil text (SHA-256 checked in tests) | the model never writes a verse; the Quran is never read by a machine voice |
| Tafsir, hadith, dhikr, ruling statement | verbatim from the sources of [SOURCES.md](SOURCES.md), with source and link | the AI returns IDs from closed lists only; out-of-list IDs are dropped (server **and** browser) |
| Glue text | hand-written templates (Arabic, English) | no free text |
| Everything else | — | abstain & refer |

```
query ─► crisis route · injection/trap guard · ruling/personal/dream guard (fixed answers, no AI)
      ─► tool router (prayer, qibla, mosques, adhkar, calendar, khatma) · references · surah names
      ─► quote verification (exact / misquote / merged verses / not Quran)
      ─► [AI expand: intent + search keywords] ─► BM25 (Quran + tafsir + translations, thesaurus)
         + Quranpedia subject index + bge-m3 semantic neighbours (ranked in the browser)
      ─► [AI select: verse IDs from a closed list] ─► verifier
      ─► closed list of verbatim sentences ─► [composer: sentence IDs] ─► [independent judge] ─► rules R1–R12
      ─► short answer + key verses with tafsir + surahs ranked + galaxy flight
```

### AI, providers and real cost
| Task | Model | Provider |
|---|---|---|
| intent, keywords, hadith filter | `openai/gpt-oss-20b` | Groq free tier |
| verse selection, composer, judge | `openai/gpt-oss-120b` | Groq free tier |
| backup on quota/failure only | same models | OpenRouter, pay per token (≈ $0.0014 per question measured; price cap; daily ceiling) |
| speech to text, «recite to find a verse» | `whisper-large-v3-turbo` | Groq free tier |
| reading a tafsir aloud when the browser has no voice; spoken Arabic welcome (generated once) | `canopylabs/orpheus-arabic-saudi` | Groq |
| question embedding | `@cf/baai/bge-m3` | Cloudflare Workers AI (free allocation) |

Hosting: Cloudflare Pages + Functions (free plan). Identical questions are cached at the edge. When the AI is unavailable, the deterministic engine still answers, still grounded, still abstaining. See [TOOLS.md](TOOLS.md).

### Measured results (honest figures)
| Measure | Result | Where |
|---|---|---|
| Qur'an QA 2023 Task A (public benchmark, official scorer, 51 scored test questions), deployed pipeline on Groq's free tier, mean of 3 runs (4 Oct) | MRR@10 **0.616** [0.490–0.742] · MAP@10 **0.300** [0.210–0.402] — best published 0.576 / 0.313 lies inside: **comparable, not better** | [eval/qqa23/RESULTS.md](eval/qqa23/RESULTS.md) |
| Over-refusal: 50 legitimate questions that look sensitive | 50/50 answered (none refused) | `eval/overrefusal.json`, `tests/fixes_v5.test.mjs` |
| Map of 1,000 questions, engine without AI (4 Oct) | 630/671 known expectations met; median 1 ms | [eval/map1000/MAP_REPORT.md](eval/map1000/MAP_REPORT.md) |
| Plain chatbot (same model, no retrieval) asked the same 60 questions | of 121 Arabic quotations it presented as Quran (﴿…﴾), only 26 are exact; 14 altered, 3 merged, 72 match no verse (Mishkat: 0 by construction) | `eval/human/auto_metrics.json` |
| Tests | 197 automated tests (data integrity, routing, guards, hostile-AI, RAG rules, security, tools) | `npm test` |
| Human blind rating (2 raters) and user test with SUS | protocol and sheets ready, **not yet done** — no figure claimed | [eval/human/PROTOCOL.md](eval/human/PROTOCOL.md) |

We do **not** claim to beat the state of the art: on 51 scored questions the differences with the best published systems are inside the 95 % confidence intervals.

### Run it
```bash
npm test                         # node ≥ 18, no dependencies
npm start                        # http://127.0.0.1:8787 (AI on when GROQ_API_KEY is in .dev.vars)
FREE_ONLY=1 node server.mjs 8791 # local API on the free tier only (evaluations)
```
Deployment (Cloudflare Pages + Functions): [DEPLOY.md](DEPLOY.md).

### Repository map
| Path | Content |
|---|---|
| `public/` | the web app, no build step: `js/engine.js` (engine), `js/app.js` (UI), `js/rag.js` (closed list + rules), `js/search-worker.js`, `js/galaxy.js` (WebGL), tool panels, `data/` |
| `functions/` | Cloudflare Pages Functions: `/api/expand`, `/api/select`, `/api/answer`, `/api/pick`, `/api/fatwa` (Fiqh Encyclopedia), `/api/hadith`, `/api/tafsir`, `/api/dense`, `/api/transcribe`, `/api/tts`, `/api/health` |
| `data_build/` | scripts that download, freeze (SHA-256 manifest) and build every source |
| `tests/` | `node --test` suite |
| `eval/` | Qur'an QA 2023, map of 1,000 questions, sensitive questions, over-refusal bench, human evaluation kit |
| `tools/` | traceability (`trace.mjs` → `docs/TRACEABILITY.md`), lamp drawing, TTS passages, spoken welcome |

### Documentation
[SOURCES.md](SOURCES.md) (sources registry & licences) · [TOOLS.md](TOOLS.md) (models, providers, costs) · [BASELINE.md](BASELINE.md) (pre-existing work) · [CHANGELOG.md](CHANGELOG.md) · [DEPLOY.md](DEPLOY.md) · [docs/TRACEABILITY.md](docs/TRACEABILITY.md) · [LICENSE](LICENSE)

### Known limits
- Thematic search can miss a passage worded differently; English questions without AI reach fewer verses (193 of the 1,000-question map get none without AI).
- Free AI quotas are limited (Groq: 200,000 tokens a day per model, a few dozen full answers on the large model); beyond them the paid backup (OpenRouter, capped) or the deterministic engine answers.
- Rulings appear only when the Fiqh Encyclopedia has a section naming the subject; otherwise none is shown (referral only).
- Prayer times are astronomical calculations (method shown); the official calendar of your country prevails.
- As-Sa‘di comments some verses in groups; 6 verses have no word-level recitation timing.
- The English Orpheus voice is not enabled: English is read by the browser's voice.
