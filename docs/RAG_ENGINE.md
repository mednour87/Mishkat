# Mishkat (مِشكاة) — how the search engine and its RAG work

*Version of 5 October 2026, translated on 6 October. Everything described here points to a file of the repository. The figures come from the results files cited, never from memory.*
Illustrated plate of the pipeline: [`pipeline_rag.png`](pipeline_rag.png) (source: `tools/make_pipeline.mjs`).

---

## 0. The idea in one sentence

**The AI never writes a religious word.** It understands the question, proposes search leads, then **picks numbers from a closed list** of authentic texts that the engine gathered itself: the Quran (Tanzil), recognised tafsirs, graded hadiths and the fiqh encyclopedia. A **second model** checks the choice, and **fixed rules** (R1–R13) check it again. What is shown is the **exact copy** of the source text, with its reference. When evidence is missing, Mishkat abstains.

It is an **evidence-bound extractive RAG**. The "generation" part of a classic RAG is replaced by a **selection of identifiers**: the benefit of understanding by a language model is kept, without the risk of a hallucinated content.

---

## 1. Overview: 7 stages

| # | Stage | Where | AI? | Output |
|---|---|---|---|---|
| 0 | **Voice** (optional): speech to text, then the visitor corrects the text | `voice.js` → `POST /api/transcribe` (ElevenLabs Scribe v2 + vocabulary, then Whisper turbo / large v3) | speech model | the question as text |
| 1 | **Map of the question** (verified answers, scope, crisis, child, tools) | `public/js/facts.js` (worker op `fact`), `scope.js`, `tools.js`, `app.js › run()` | no | a **verified answer** (counted from the Mushaf data or stated by an authentic hadith), a fixed answer, a tool opened, or stage 2 |
| 2 | **Guard and routing** (verse/surah, exact Quran words, fatwa, personal case, injection) | `engine.js › guardCheck`, `injection.js`, `ask0()` | no | route: `verse`, `sura`, `verify`, `topic`, `abstain`… |
| 3 | **Understanding**: intent + keywords + proposed verses | `functions/_lib/selector.js › expand` (`POST /api/expand`) | yes (checked output) | intent, ar/en keywords, «s:a» references to verify |
| 4 | **Hybrid retrieval**: lexical BM25 + meaning (bge-m3) + subject index + proposed verses | `engine.js › topicSearch`, `dense-rank.js`, `search-worker.js` | embedding only | **closed list of 36 candidate verses** |
| 5 | **Closed-list selection** (score 2 = answers, 1 = related) | `selector.js › select` (`POST /api/select`) + `engine.verifyLLM` | yes (identifiers only) | confirmed verses, in order |
| 6 | **«الجواب باختصار»**: composer + judge over numbered sentences | `rag.js`, `functions/_lib/answer.js` (`POST /api/answer`) | yes (2 models, identifiers only) | 1 to 3 points, each 1–2 **verbatim** sentences |
| 7 | **Further sources**: Sunnah (HadeethEnc), fiqh, **creed and history** (Dorar encyclopedias), objections (Bayenat), quoted hadith (Dorar) | `app.js › loadSunnah / loadFiqh / loadEncyc`, `fiqh.js`, `history.js`, `encyc.js`, `sources.js`, `/api/pick` | selection only | cards quoted word for word, with a link |

The whole engine runs **in the browser, in a Web Worker** (`search-worker.js`), so that the interface never freezes. The server (Cloudflare Pages Functions) does only three things: call the models, compute the embedding of the question, and relay the live sources. It enforces same-origin requests, a per-IP rate limit and a size limit (`_lib/guard.js`, `_lib/handler.js`).

When the selection keeps no candidate at all, a model of another family reads the same closed list once before Mishkat abstains (the «second opinion», 6 October).

---

## 2. Stage 1 — the map of the question (before any search)

`app.js › run()` looks at the question first, **without AI**.
- **A factual question gets its exact answer** (T122, `public/js/facts.js`): «كم عدد آيات القرآن», «كم سورة», a surah's verses / words / letters / type / order / juz, juz, hizb, pages, sajdas, the surah without basmala, the longest and shortest surah and verse, occurrences of a word («كم مرة ذكر اسم موسى» → 136), the 25 prophets named (each with a verse that names him) — **computed** from the Tanzil data shipped with the site; the pillars of Islam and of faith, ihsan, the greatest surah and verse, the surah equal to a third of the Quran, the first revelation, the 99 Names, the five daily prayers — **stated by an authentic hadith** of HadeethEnc, shown in full with its grade and link. Dialect forms of «how many / what» are understood (كام، قداش، شحال، شكد، شنو، واش…). Before, these questions met «I found no sufficient source». `tests/facts.test.mjs`.
- **A person in distress** (`isCrisis`): always goes to the engine, never to a refusal. The verses of tranquillity are always among the candidates (`COMFORT_REFS`).
- **Child mode** (age under 18 chosen at the first visit): no fatwa, no sensitive subject. The child is gently led to memorisation (tekrar) and the khatma.
- **Off topic** (recipe, prices, weather, code, homework…): a fixed answer written by hand, no AI. The API refuses the same texts. Measure: of the project's 1,498 questions, 13 are mapped off topic and all of them really are; no over-refusal on 50 cases (`eval/overrefusal.json`).
- **Date and time**: answered by the clock (Gregorian and Umm al-Qura Hijri).
- **A practical request** («متى رمضان», «خطة لختم القرآن في شهر», «أريد أن أحفظ سورة الملك»): the matching tool opens (calendar, khatma, tekrar, statistics). No AI call.

## 3. Stage 2 — deterministic guard and routing

`engine.js › ask0()` recognises, without a model:
- a **reference** («2:255», «آية الكرسي», «سورة الكهف») → opened directly;
- a **quotation**: is the sentence a verse, exactly or nearly (`verify`)? If it is not in the Quran, the Dorar Hadith Encyclopedia is searched (its result is shown as it is);
- the **exact words of the Quran** (`latin_index.json`, vocabulary of the Mushaf) and a safe **spelling correction** («الزكات» → «الزكاة»);
- an **instruction injection** or a request to write a religious text («اكتب لي حديثًا…») → a fixed answer, no AI (`injection.js`);
- a request for a **personal fatwa**, a **dream**, **excommunication**: level D of the reference pack, abstention and referral (alifta.gov.sa);
- a **sensitive subject** (penalties, blood, violence polemics): red «سؤال حساس» banner and a **reviewed context pack** (`packFor`).

## 4. Stage 3 — understanding (AI, checked output)

`POST /api/expand` → `selector.js`. The model receives strict rules (JSON only, never any religious content). It returns:
- `intent`: `topic`, `ruling`, `personal`, `polemic`, `other`…;
- `keywords.ar` / `keywords.en`: words **as they appear in the Quran or in Al-Muyassar / Al-Mukhtasar**, used for searching only and never shown;
- `keywords.fatwa`: the subject in fiqh vocabulary (for the encyclopedia);
- `refs`: up to 8 known verses («17:23»), to be verified.

`engine.verifyExpansion()` rejects anything badly formed. A proposed reference is kept only if **the verse exists** and **shares a word with the question**, or is **among its 40 nearest neighbours in meaning** (two independent checks). Otherwise it stays «loose»: it enters the list only at its end, and only a selection score of 2 can keep it.

## 5. Stage 4 — hybrid retrieval → closed list

Four independent rankings:
1. **Lexical BM25** over several fields (verse text in standard spelling, Muyassar, Mukhtasar, translation), with a bilingual thesaurus, a light root, very frequent words made optional, and «X and Y» split in two (`topicSearch`).
2. **Meaning (dense)**: the server computes the **bge-m3** vector of the question (Cloudflare Workers AI) and projects it to **256 dimensions (PCA)**; the **browser** ranks the 6,236 «verse — Mukhtasar» vectors in int8 (`public/data/vec/bge_m3_p256_int8.bin`, 1.6 MB, 4–13 ms). This fits within Cloudflare's free CPU limit. Overlap of the top 10 with the full 1,024 dimensions: 8–9 of 10 on real queries.
3. **The AI's keywords**: a separate BM25 over the words of stage 3; for an English question the Arabic keywords also search the Arabic text.
4. **The human subject index**: Quranpedia, «الموضوعات القرآنية», 6,100 subjects.

**Fusion** by a round robin of ranks (in the spirit of reciprocal rank fusion, *RRF*): first the proposed and anchored verses, then, rank by rank, one candidate from each ranking. The result is a **closed list of at most 36 verses** (`MAX_CANDIDATES = 36`), each sent with its **«s:a» identifier** and the **start of its tafsir**.

## 6. Stage 5 — selection from the closed list (AI, identifiers only)

`POST /api/select`. The model reads the candidates' tafsir and returns at most 12 identifiers **from the list**, each with a score:
- **2**: the verse answers directly or states the subject asked;
- **1**: it is only related.

The prompt names the **homographs** to reject (e.g. «الجاريات» = ships, not «الجار» = neighbour; «حجاب» = the barrier of al-A'raf, 7:46, not the veil) and requires a judgement **on the meaning of the tafsir**, not on shared words.
`engine.verifyLLM()` removes any identifier outside the list and any duplicate. Verses scored 2 are shown first, in the AI's order, then those scored 1 (marked «related»). The answer is **confirmed** only if at least one verse scored 2 exists, with a high confidence or at least two verses.

## 7. Stage 6 — «الجواب باختصار» (the evidence-bound extractive RAG)

### 7.1 Building the closed list of sentences (browser, `rag.js`)
From the **confirmed** verses, the worker cuts whole sentences (rule R8):
- `V:s:a`: the **text of the verse** (Tanzil);
- `Q:s:a#n`: the **sentences of the tafsir** of that verse (Muyassar in Arabic, Mukhtasar in English);
- `H:id#t / #e`: the text and explanation of **HadeethEnc hadiths graded صحيح or حسن**, kept by `/api/pick`;
- (`F:…`: passages of published fatwas — no longer sent since 4 October: fiqh goes through the Dorar encyclopedia, see stage 7).

Limits (`LIMITS`): 8 verses, 4 sentences per verse, 4 hadiths, 600 characters per unit, **48 sentences at most**.

### 7.2 Two independent models (`functions/_lib/answer.js`)
1. **Composer** (large model, gpt-oss-120b): finds 1 to 3 **concepts** in the question, says whether the list answers (`yes`, `partial`, `no`) and, for each covered concept, gives **1 or 2 identifiers** of sentences that state the answer. It receives an instruction per **question type** (ruling, comfort, virtue, how-to, why, definition, story, topic).
2. **Judge** (smaller model, gpt-oss-20b, its own prompt, sentences renumbered): keeps only the sentences that answer **in the same sense of the words**.

A concept without evidence is returned as **«not covered»** and shown as such — never filled in.

### 7.3 Fixed rules applied after the models (`rag.js`)
| Rule | Effect |
|---|---|
| R1 | identifiers of the list only, each passage once, near-duplicates removed |
| R2 | no judge → no short answer |
| R3 | a ruling question never receives a tafsir sentence presented as a ruling |
| R4 | a passage of a verse that is only «related» must share a word with the question |
| R5 | a person in distress: no passage about punishment, unless they speak of it |
| R6 | caps: 3 points, 2 passages per point, 1,200 characters |
| R7 | concept labels are shown only when they are words of the question |
| R8 | whole sentences only, cut at the end of a sentence |
| R10 | violence polemic: never a verse of fighting alone; the reviewed context comes first |
| R11 | sensitive subject: the answer opens with a reviewed context passage, or there is no short answer |
| R12 | a sense lock for known homographs (عيد الميلاد, فوائد…) |
| R13 | grouped units of Al-Muyassar: a sentence must share a word with its own verse |

What is shown is **the browser's own copy** of each chosen sentence (never a text returned by a model), with its verse, source and link.

## 8. Stage 7 — further sources (quoted, never generated)
- **Sunnah** (`loadSunnah`): BM25 over 3,572 Arabic and 2,328 English HadeethEnc hadiths, then a **closed-list choice by the AI** (`/api/pick`); text, grade and link given as they are.
- **Ruling (حكم)** (`loadFiqh`, `functions/_lib/fiqh.js`): the **Fiqh Encyclopedia of Ad-Durar As-Saniyyah** (dorar.net/feqhia, in the challenge's reference pack). The section is chosen on the whole subject, preferring «حكم» leaf sections; going down into sub-sections is checked by the breadcrumb, then the closed list is checked strictly. The text of the encyclopedia is shown word for word, with the consensus or difference of opinion and the Saudi authorities it names, under the **red banner**. Mishkat never decides.
- **Creed and history** (T122, `loadEncyc`, `POST /api/encyc`): a question of creed (tawhid, faith, the unseen, the Last Day, the Companions…) gets the **Creed Encyclopedia** of Ad-Durar As-Saniyyah (dorar.net/aqeeda), a question of Sira or history (a battle, a caliph, a birth, a death, an event) the **History Encyclopedia** (dorar.net/history) — both named by the challenge's reference pack; and **any Islamic question for which no verse answers** gets both, plus the Sunnah. Texts verbatim with their link; the AI only keeps numbers from the encyclopedia's own results (closed list, strict prompt); a definition is searched as «تعريف X»; history events are searched in their titles with all the words. When an approved source answers, the «abstained» badge becomes «من المصادر المعتمدة».
- **A quoted hadith** («هل هذا حديث؟»): searched in the Dorar; the muhaddith's verdict is given as it is.
- **Objections**: links to the reviewed answers of **Bayenat** (Markaz Osoul).

## 9. Providers, costs, failures
- **Free first** (`selector.providers`): Groq free tier (gpt-oss-120b; light tasks on gpt-oss-20b), then paid OpenRouter as a backup (gpt-oss-120b, price capped by `PRIMARY_MAX_PRICE`), then the other models.
- **Circuit breakers** per provider and model (401/402 → 30 min), a server budget of 7.5 s, and on the page 3 failures → the AI is switched off for 60 s. **Without AI the deterministic engine still answers** (stages 1, 2, 4, labelled «not confirmed by the AI»).
- Measured cost: about **$0.0014 per question** when the paid backup is used (`eval/cost_per_question.mjs`). AI answers cached (Cache API) and a daily ceiling (`DAILY_AI_CALLS`).

## 10. Measures (results files)
| Bench | Result | File |
|---|---|---|
| RAG on **1,000 questions** ar/en, independent judge of another family (DeepSeek-V3.2), bootstrap 95 % CI | first verse answers directly **84.5 % [81.9–87.1]**; short answer on topic **99.5 %**; **0 / 1,058** passages not verbatim; critical cases **15 → 2**; encyclopedia right section **73.3 %** (n = 45) | `eval/rag1000/README.md`, `REPORT_v1-v1j2_v4-v4j2.md` |
| Public bench **Qur'an QA 2023 Task A** (free tier, 3 runs) | MRR@10 **0.616 [0.490–0.742]**, MAP@10 **0.300 [0.210–0.402]**: **comparable** to the best published (0.576 / 0.313), **not better** | `eval/qqa23/RESULTS.md` |
| Over-refusal | 50/50 legitimate questions not refused | `eval/overrefusal.json` |

Limits, stated plainly: one automatic judge only; the human grading is prepared (`eval/human/`) but not done yet; forum questions (history, sects, hadith criticism) remain the weakest family; a topic search may miss a passage expressed otherwise — so Mishkat says «related verses», never «all the verses».

## 11. One question followed end to end: «ماذا يقول القرآن عن الصبر؟»
1. Map: not off topic, not a tool, not a crisis → engine.
2. Guard: not a reference, not a fatwa → route `topic`.
3. Understanding: intent `topic`, keywords «الصبر، الصابرين، اصبروا…», proposed refs → verified (existence + shared word or neighbour in meaning).
4. Retrieval: BM25 + bge-m3 + keywords + the subject «الصبر» of the index → 36 candidates.
5. Selection: the AI returns identifiers of the list with their score (checked live on 3 October: 2:153 first for patience) → confirmed verses, surahs lit in the 3D galaxy.
6. Short answer: 48 numbered sentences → the composer picks `Q:2:153#1`… → the judge keeps or removes → R1–R13 → Muyassar sentences shown **word for word**, with their verse.
7. Sunnah: HadeethEnc hadiths on patience, chosen by number, with their grade.

## 12. Where to read the code
`public/js/app.js › run()` (orchestration) · `public/js/search-worker.js` (worker) · `public/js/engine.js` (`ask`, `ask0`, `topicSearch`, `verifyLLM`, `briefOf`) · `public/js/rag.js` · `public/js/dense-rank.js` · `functions/_lib/selector.js` · `functions/_lib/answer.js` · `functions/_lib/fiqh.js` · `functions/_lib/sources.js` · tests: `tests/answer.test.mjs`, `tests/fixes_v5.test.mjs`, `tests/dense_client.test.mjs`, `tests/second_opinion.test.mjs`…

---
© 2026 Mohamed Nour Bou Ali — Mishkat. All rights reserved.
