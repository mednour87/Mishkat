# Map of 1,000 questions — before / after T021 (engine without AI, cost 0)

Same 1,000 questions, same runner (`node eval/map1000/run_map.mjs`), engine only (no AI call). Before = report of
3 October 2026 16:21 UTC (`MAP_REPORT.md` at commit `689d01f`); after = this commit (`MAP_REPORT.md`, `map.json`).

| Measure | Before | After |
|---|---|---|
| Expectations met | 628 / 671 | **630 / 671** |
| W1 known expectation not met | 43 | 41 |
| W2 no verse at all | 219 | 218 |
| W3 answer vouched by nobody (keyword match only) | 128 | **112** |
| W5 English question with no verse | 194 | 193 |
| W8 slow (> 400 ms) | 1 | 0 |
| W9 sensitive subject not flagged | 10 | 10 |
| Answers vouched by the human-curated subject index | 261 | **281** |

**What changed (T021).** English questions without AI now reach the Quranpedia subject index through a reviewed
table of English names of its topics (`EN_TOPICS` in `public/js/engine.js`), after the frame of the question is set
aside («what does the Quran say about…», "how do I stay…"); the sense of homographs is chosen explicitly (الجنة not
الجِنة, الإيمان not الأيمان, العفو not العفوَ of 2:219, ذكر الله, السحر as magic) and sub-topics of another sense are
dropped. Topics where the index mixes senses (الحجاب with the barrier of 7:46, الأذان = a proclamation) and sensitive
subjects (Jews, Christians, jihad, punishments) are deliberately **not** in the table: left to the AI with its context.
«What should I say when…» is a supplication, not a topic. A tiny index entry (< 3 verses) gives way to a full keyword
match (backbiting → 49:12).

**Fixed:** «kindness to parents» (4:36, 17:23, 29:8, 31:14), «what does the quran say about trusting god», «… seeking
knowledge», «how can i become more patient»; «how do i stay steadfast» now answered (topic الثبات).

**Not better (honest):** «day of resurrection» and «what does the quran say about marriage» now show the index's
verses of the topic (on topic, vouched by the index) but not the expected key verses in the first five (ranking).
W5 stays high on purpose: 184 of its 193 questions are long forum questions («How was the order of the Qur'an
decided?») that only the AI with its closed list should answer; forcing a topic on them would give answers «à côté».

**Maryam.** A surah named after a person («Maryam», «Joseph», «Noah», «يوسف»…) still opens the surah and now offers
the person explicitly: «The verses about Mary (the person, not the surah)» → index topic مريم (3:42, 19:16…).
