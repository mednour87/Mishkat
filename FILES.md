# دليل ملفات المستودع · Repository file guide

**مِشكاة — Mishkat** · https://mishkatquran.org · © 2026 محمد نور بو علي — Mohamed Nour Bou Ali. جميع الحقوق محفوظة / All rights reserved (`LICENSE`).

[العربية](#العربية) · [English](#english)

---

## العربية

هذا الملف يشرح كل مجلد وكل ملف مهم في المستودع، ولماذا وُجد. القاعدة التي بُني عليها كل شيء: **الذكاء الاصطناعي لا يكتب نصًّا دينيًّا أبدًا**؛ يفهم السؤال ثم يختار أرقامًا من قائمة مغلقة من نصوص موثّقة تُعرض بحروفها مع مصدرها، وإذا غاب الدليل امتنع «مشكاة» عن الجواب.

### ١. المستندات (للقراءة أولًا)

| الملف | ما فيه |
|---|---|
| `README.md` | تقديم المشروع بالعربية والإنجليزية، وطريقة التشغيل، والأرقام المقيسة. |
| `FILES.md` | هذا الدليل. |
| `docs/deliverables/Mishkat_Dossier_AR.pdf` · `_EN.pdf` | **الملف الكامل للمشروع**: المشكلة، الحل، الرحلة، الشيفرة، خط البحث، الخدمات السبع والعشرون، الأمان، الكلفة، الإطلاق، المواءمة مع شروط التحدي. |
| `docs/deliverables/Mishkat_Presentation_AR.pdf` · `_EN.pdf` · `_EN.pptx` | العرض التقديمي للجنة التحكيم. |
| `docs/deliverables/DESIGN_3D_AR.pdf` · `DESIGN_3D.pdf` (ومصدرهما `docs/DESIGN_3D_AR.md` · `docs/DESIGN_3D.md`) | **تبرير التصميم ثلاثي الأبعاد**: لماذا رُسمت كلمات القرآن الـ٧٧٤٣٣ نجومًا، ولماذا وردة السور، وزهرة التحدي، وكيف يخدم كل شكل الفهم لا الزينة. |
| `docs/deliverables/RESULTS_SUMMARY_AR.pdf` · `_EN.pdf` | ملخص النتائج الإحصائية (مع فترات الثقة). |
| `docs/RAG_ENGINE.md` · `docs/pipeline_rag.png` | شرح محرك البحث (RAG استخراجي مقيَّد بالأدلة) مرحلةً مرحلة، مع لوحة مصوّرة. |
| `docs/GUIDE.md` | دليل المستخدم والمطوّر. |
| `docs/TRACEABILITY.md` · `docs/traceability.html` | تتبّع كل ميزة إلى ملفها واختبارها. |
| `SOURCES.md` | سجل المصادر: كل نص ديني وكل بيانات، مع الترخيص والرابط. |
| `TOOLS.md` | الأدوات والخدمات الخارجية المصرَّح بها (البند ٩/١٥ من شروط التحدي). |
| `BASELINE.md` | ما كان موجودًا قبل نافذة البناء (٤–٦ أكتوبر)، للتمييز بين القديم والجديد. |
| `CHANGELOG.md` | كل مهمة مؤرخة (T0xx–T123) وما غيّرته. |
| `ARCHIVE.md` | بصمات SHA-256 لكل ملف في كل نسخة مؤرخة (إثبات الأسبقية). |
| `DEPLOY.md` | طريقة النشر على Cloudflare Pages. |
| `LICENSE` · `NOTICE.md` | الترخيص (جميع الحقوق محفوظة، وفق البند ١٣/٧) وحقوق أصحاب البيانات. |

### ٢. الموقع: `public/`

- `index.html` الصفحة الواحدة؛ `judges.html` صفحة مختصرة للجنة؛ `tajweed.html` أحكام التجويد؛ `sw.js` و`manifest.webmanifest` للتطبيق القابل للتثبيت (PWA)؛ `_headers` سياسة الأمان (CSP).
- `css/` الأنماط: `app.css` (الأساس)، `refonte.css` (تخطيط الهاتف والحاسوب)، `features.css`، `worship.css` (العبادات، العرض الصافي).
- `js/` الشيفرة (تعمل كلها في المتصفح):

| الملف | الدور |
|---|---|
| `app.js` | المنسّق: البحث، عرض الأجوبة، القارئ، اللوحات. |
| `engine.js` · `search-worker.js` · `dense-rank.js` | محرك البحث (معجمي + دلالي + فهرس الموضوعات) في Web Worker. |
| `rag.js` | «الجواب باختصار»: جمل منقولة بحروفها من التفسير، كلٌّ بآيتها. |
| `scope.js` · `injection.js` · `tools.js` | خريطة السؤال قبل البحث: خارج الموضوع، حقن الأوامر، طلب أداة. |
| `facts.js` | أجوبة موثَّقة دون ذكاء اصطناعي (أعداد محسوبة، أحاديث صحيحة). |
| `encyc.js` · `fiqhpractical.js` | الموسوعات المعتمدة: العقدية والتاريخية، والفقه العملي من فهرس الموسوعة الفقهية. |
| `glossary.js` · `stories.js` | المصطلحات (من حزمة التحدي بحروفها) وقصص الأنبياء (الجمهرة + Quranpedia). |
| `galaxy.js` · `layouts.js` · `layout-worker.js` · `letters3d.js` · `readcam.js` · `dwell.js` | المجرّة ثلاثية الأبعاد (three.js): ٧٧٤٣٣ كلمة، الأشكال والترتيبات، كاميرا القراءة. |
| `lamp.js` · `lampmap.js` · `glow.js` · `engage3d.js` · `progress.js` | القنديل (الشعار، مولَّد من `img/logo.svg`)، خريطة الختمة، نور الشهر، التقدّم. |
| `khatma.js` · `tekrar.js` · `hifztest.js` | الختمة، التكرار للحفظ، اختبار الحفظ. |
| `practical.js` · `prayerbreak.js` · `geomag.js` · `hijri.js` · `notify.js` | المواقيت، القبلة (مع الانحراف المغناطيسي)، المساجد، التقويم الهجري، **التنبيهات على الهاتف والحاسوب**. |
| `athkar.js` · `tasbih.js` · `asma.js` | الأذكار (صحيحة أو حسنة فقط)، التسبيح، الأسماء الحسنى. |
| `tajweed.js` · `tajweed-page.js` · `stats.js` | ألوان التجويد، الإحصاءات (عدٌّ فقط). |
| `voice.js` · `speech.js` · `basmala.js` | الصوت، القراءة الصوتية للتفسير، بوابة البسملة. |
| `intro.js` · `i18n.js` · `panels.js` · `toolpanels.js` · `prefs.js` · `pwa.js` · `wake.js` · `social.js` | الفيلم التعريفي، النصوص (عربي/إنجليزي)، اللوحات، الإعدادات، التثبيت، إبقاء الشاشة مضاءة. |

- `data/` البيانات (نصوص مصدرها مذكور في `SOURCES.md`): `core.json` نص المصحف (Tanzil)، التفاسير `tafsir_*.json` و`saadi/`، `hadeeth/` (HadeethEnc)، `timing/` (توقيت كلمات تلاوة العفاسي)، `vec/` (المتجهات الدلالية)، `galaxy.bin`، `asma.json`، `athkar.json`، `feqhia_toc.json` (عناوين الموسوعة الفقهية)، `places.json` (المدن).
- `audio/` تسجيلات برخص مفتوحة (الأذان، الأسماء الحسنى، تعليق الفيلم).

### ٣. الخادم: `functions/` (Cloudflare Pages Functions)

- `_lib/selector.js` **المكان الوحيد الذي يُستدعى فيه نموذج لغوي** (اختيار من قائمة مغلقة، والتفريغ الصوتي).
- `_lib/answer.js` المركِّب والحَكَم للجواب المختصر؛ `_lib/fiqh.js` الموسوعة الفقهية والعقدية؛ `_lib/history.js` الموسوعة التاريخية؛ `_lib/sources.js` المصادر الحية؛ `_lib/guard.js` · `_lib/handler.js` · `_lib/csp.js` الحماية (نفس الأصل، حدّ الطلبات، الحجم)؛ `_lib/feedback.js` «هل أفادك؟» دون أي معرّف.
- `api/*.js` نقاط الواجهة: `expand`، `select`، `answer`، `fatwa`، `encyc`، `hadith`، `tafsir`، `transcribe`، `mosques`، `feedback`، `health`…
- `_middleware.js` تحويل www وسياسة الأمان. **المفاتيح السرية لا توجد في المستودع**: تُحفظ في أسرار Cloudflare فقط (`.dev.vars` محليًّا ومستثنى من Git).

### ٤. الاختبارات والتقييم

- `tests/` **٣٠٠ اختبار** (`npm test`): كل تصحيح له اختبار، وكل آية تُقارن بنص Tanzil، وكل حديث يُتحقق من وجوده ودرجته.
- `eval/` التقييمات: `rag1000` (١٠٠٠ سؤال)، `qqa23` (مقارنة مرجعية)، `map1000`، `human` (عدّة التقييم البشري)، `stt` (البحث الصوتي ٣٠/٣٠)، `t122` (٤٩ سؤالًا)، `world` (٣٣ مكانًا في العالم)، `overrefusal.json`.

### ٥. بناء البيانات والأدوات

- `data_build/` سكربتات بناء البيانات من مصادرها (Tanzil، QuranEnc، HadeethEnc، Quranpedia، الدرر…)، ومنها `build_feqhia_toc.mjs` (فهرس الموسوعة الفقهية) و`build_asma.mjs` · `asma_scribe.mjs` (الأسماء الحسنى).
- `tools/` أدوات: لقطات الشاشة (`ui_shots.mjs`)، الفيديو (`video/`)، العرض (`make_deck_ar.py`)، الملف الكامل (`make_dossier.py`)، الأيقونات والشعار، التتبع (`trace.mjs`)، الأرشيف المؤرخ (`archive.mjs`).
- `server.mjs` خادم محلي للتطوير (`node server.mjs 8790`)؛ `wrangler.toml` إعداد Cloudflare.

---

## English

This file explains every folder and every important file of the repository, and why it is there. The rule behind everything: **the AI never writes religious text**; it understands the question, then picks numbers from a closed list of authenticated texts that are shown word for word with their source — and when evidence is missing, Mishkat abstains.

### 1. Documents (read these first)

| File | Contents |
|---|---|
| `README.md` | The project in Arabic and English, how to run it, the measured figures. |
| `FILES.md` | This guide. |
| `docs/deliverables/Mishkat_Dossier_AR.pdf` · `_EN.pdf` | **The full project file**: problem, solution, journey, code, search pipeline, the 27 services, security, cost, launch, fit with the challenge rules. |
| `docs/deliverables/Mishkat_Presentation_AR.pdf` · `_EN.pdf` · `_EN.pptx` | The presentation for the jury. |
| `docs/deliverables/DESIGN_3D_AR.pdf` · `DESIGN_3D.pdf` (sources `docs/DESIGN_3D_AR.md` · `docs/DESIGN_3D.md`) | **Why the 3D design**: why the 77,433 words of the Quran are drawn as stars, why the rose of surahs and the flower of the challenge, how each shape serves understanding rather than decoration. |
| `docs/deliverables/RESULTS_SUMMARY_AR.pdf` · `_EN.pdf` | Summary of the statistical results (with confidence intervals). |
| `docs/RAG_ENGINE.md` · `docs/pipeline_rag.png` | The search engine (evidence-bound extractive RAG) stage by stage, with an illustrated plate. |
| `docs/GUIDE.md` | User and developer guide. |
| `docs/TRACEABILITY.md` · `docs/traceability.html` | Each feature traced to its file and its test. |
| `SOURCES.md` | Registry of sources: every religious text and dataset, with licence and link. |
| `TOOLS.md` | External tools and services, declared (clause 9/15 of the challenge rules). |
| `BASELINE.md` | What existed before the build window (4–6 October), to separate old from new work. |
| `CHANGELOG.md` | Every dated task (T0xx–T123) and what it changed. |
| `ARCHIVE.md` | SHA-256 fingerprints of every file of every dated version (proof of precedence). |
| `DEPLOY.md` | How to deploy on Cloudflare Pages. |
| `LICENSE` · `NOTICE.md` | Licence (all rights reserved, per clause 13/7) and the rights of data owners. |

### 2. The site: `public/`

- `index.html` the single page; `judges.html` a short page for the jury; `tajweed.html` tajweed rules; `sw.js` and `manifest.webmanifest` for the installable app (PWA); `_headers` security policy (CSP).
- `css/` styles: `app.css` (base), `refonte.css` (phone and computer layout), `features.css`, `worship.css` (worship tools, pure view).
- `js/` the code (all of it runs in the browser) — see the Arabic table above for the role of each module: search engine (`engine.js`, `search-worker.js`, `dense-rank.js`, `rag.js`), question map (`scope.js`, `injection.js`, `tools.js`), verified answers (`facts.js`), approved encyclopedias and practical fiqh (`encyc.js`, `fiqhpractical.js`), the 3D galaxy (`galaxy.js`, `layouts.js`, `layout-worker.js`, `letters3d.js`, `readcam.js`, `dwell.js`), the lamp and progress (`lamp.js`, `lampmap.js`, `glow.js`, `engage3d.js`, `progress.js`), khatma and memorisation (`khatma.js`, `tekrar.js`, `hifztest.js`), prayer, qibla, mosques, Hijri calendar and **phone/computer reminders** (`practical.js`, `prayerbreak.js`, `geomag.js`, `hijri.js`, `notify.js`), adhkar, tasbih and the Names (`athkar.js`, `tasbih.js`, `asma.js`), tajweed and statistics (`tajweed.js`, `tajweed-page.js`, `stats.js`), voice and the basmala gate (`voice.js`, `speech.js`, `basmala.js`), and the interface (`app.js`, `intro.js`, `i18n.js`, `panels.js`, `toolpanels.js`, `prefs.js`, `pwa.js`, `wake.js`, `social.js`).
- `data/` data (each source in `SOURCES.md`): `core.json` the Mushaf text (Tanzil), tafsirs `tafsir_*.json` and `saadi/`, `hadeeth/` (HadeethEnc), `timing/` (word timings of Alafasy's recitation), `vec/` (semantic vectors), `galaxy.bin`, `asma.json`, `athkar.json`, `feqhia_toc.json` (headings of the Fiqh Encyclopedia), `places.json` (cities).
- `audio/` openly licensed recordings (adhan, the Names, film narration).

### 3. The server: `functions/` (Cloudflare Pages Functions)

- `_lib/selector.js` **the only place where a language model is called** (closed-list selection, transcription).
- `_lib/answer.js` composer and judge of the short answer; `_lib/fiqh.js` Fiqh and Creed encyclopedias; `_lib/history.js` History encyclopedia; `_lib/sources.js` live sources; `_lib/guard.js` · `_lib/handler.js` · `_lib/csp.js` protection (same origin, rate limit, size); `_lib/feedback.js` «was this useful?» with no identifier.
- `api/*.js` the endpoints: `expand`, `select`, `answer`, `fatwa`, `encyc`, `hadith`, `tafsir`, `transcribe`, `mosques`, `feedback`, `health`…
- `_middleware.js` www redirect and security headers. **No secret key is in the repository**: keys live only in Cloudflare secrets (`.dev.vars` locally, excluded from Git).

### 4. Tests and evaluation

- `tests/` **300 tests** (`npm test`): every fix has a test, every verse is compared with the Tanzil text, every hadith is checked for existence and grade.
- `eval/` evaluations: `rag1000` (1,000 questions), `qqa23` (reference benchmark), `map1000`, `human` (human evaluation kit), `stt` (voice search 30/30), `t122` (49 questions), `world` (33 places worldwide), `overrefusal.json`.

### 5. Data building and tools

- `data_build/` scripts that build the data from its sources (Tanzil, QuranEnc, HadeethEnc, Quranpedia, Ad-Durar…), including `build_feqhia_toc.mjs` (Fiqh Encyclopedia index) and `build_asma.mjs` · `asma_scribe.mjs` (the Names).
- `tools/` screenshots (`ui_shots.mjs`), video (`video/`), deck (`make_deck_ar.py`), project file (`make_dossier.py`), icons and logo, traceability (`trace.mjs`), dated archive (`archive.mjs`).
- `server.mjs` local development server (`node server.mjs 8790`); `wrangler.toml` Cloudflare configuration.
