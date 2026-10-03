# Measuring the benefit of Mishkat — protocol

Two measures done by people (the challenge scores *measured* benefit), and one automatic measure.
No personal data is collected: no names, no recordings, no questions stored by the site.

## 1. Blind rating of answers (2 raters, ≈ 1 h each)

File: `rating_sheet.csv` (made by `node eval/human/make_sheet.mjs 60`). 60 questions (30 Arabic, 30 English
real question titles), two answers per question shown as **A** and **B** in random order: one is Mishkat,
the other the same AI model answering directly like a general chatbot. Raters do **not** know which is which
(`rating_key.json` is kept by the organiser).

For each answer:
| Column | Scale |
|---|---|
| relevance | 0 = off topic or wrong sense · 1 = partly answers · 2 = answers the question |
| religious error | 1 if the answer contains a wrong verse, a misquotation, a wrong reference, an invented hadith, or a ruling stated as certain without source; else 0 |
| preferred | A, B or = |

Raters: people able to read Arabic and check a verse in a Mushaf (e.g. a Quran teacher and a student).
Disagreements: discussed, then the agreed value is kept; report Cohen's κ before discussion.
Report: mean relevance per system, % answers with a religious error per system, preference counts, with
95 % bootstrap confidence intervals (`node eval/human/score_sheet.mjs` once the sheet is filled).

## 2. User test (5–8 people, 20 min each)

Profiles: mixed ages, at least 2 non-specialists, at least 2 English speakers. Anonymous; oral consent.
Tasks (on the live site, phone or computer, without help):
1. Find what the Quran says about patience and gratitude.
2. Check whether «النظافة من الإيمان» is a verse.
3. Ask a question that worries you about sadness or anxiety, and read the short answer.
4. Open a verse in the Mushaf and listen to it.
5. Ask whether music is halal or haram (expected: referral to published fatwas, no ruling).
Record for each task: success (yes/partly/no), time, and one remark. Then the SUS questionnaire.

### SUS questionnaire — 1 (strongly disagree) to 5 (strongly agree)
| # | English | العربية |
|---|---|---|
| 1 | I think that I would like to use this system frequently. | أظن أنني سأستخدم هذا الموقع كثيرًا. |
| 2 | I found the system unnecessarily complex. | وجدت الموقع معقّدًا بلا داعٍ. |
| 3 | I thought the system was easy to use. | وجدت الموقع سهل الاستخدام. |
| 4 | I think that I would need the support of a technical person to be able to use this system. | أظن أنني سأحتاج إلى مساعدة شخص تقني لأستخدمه. |
| 5 | I found the various functions in this system were well integrated. | وجدت وظائف الموقع متكاملة جيدًا. |
| 6 | I thought there was too much inconsistency in this system. | وجدت في الموقع تناقضًا كثيرًا. |
| 7 | I would imagine that most people would learn to use this system very quickly. | أتوقع أن يتعلّم أكثر الناس استخدامه بسرعة. |
| 8 | I found the system very cumbersome to use. | وجدت استخدامه مرهقًا. |
| 9 | I felt very confident using the system. | شعرت بثقة كبيرة وأنا أستخدمه. |
| 10 | I needed to learn a lot of things before I could get going with this system. | احتجت إلى تعلّم أشياء كثيرة قبل أن أبدأ استخدامه. |

Score: odd items (score − 1), even items (5 − score), sum × 2.5 → 0–100 (68 = average usability).
Report the mean and the range; quote 2–3 remarks verbatim.

## 3. Automatic measure (no human needed)

`auto_metrics.json`: for every chatbot answer, the references that do not exist and the Quran quotations that are
not word for word in the Mushaf (checked by Mishkat's own verifier against the Tanzil text). For Mishkat this is
0 by construction (every verse is read from the Tanzil file; tested byte for byte).
