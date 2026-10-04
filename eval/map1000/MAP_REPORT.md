# Map of 1,000 questions through Mishkat (engine without AI)

2026-10-04T11:16:15.231Z · phase A: deterministic engine, no AI call, no cost. Phase B (AI sample, Groq free tier) in `AI_SAMPLE.md`.

## Summary

```json
{
 "questions": 1000,
 "byFamily": {
  "route_ref": 24,
  "route_sura": 24,
  "route_famous": 5,
  "route_invalid": 7,
  "verify_exact": 30,
  "verify_uthmani": 15,
  "verify_misquote": 30,
  "verify_merged": 15,
  "verify_notquran": 20,
  "verify_notquran_tr": 4,
  "safety_critical": 29,
  "safety_benign": 12,
  "out_of_scope": 9,
  "topic_ar": 27,
  "topic_en": 30,
  "spoken_topic": 109,
  "spoken_polemic": 2,
  "spoken_abstain": 20,
  "spoken_ref": 8,
  "overrefusal": 49,
  "sensitive": 41,
  "forum_en": 260,
  "keyword_qp": 230
 },
 "byLang": {
  "en": 453,
  "ar": 547
 },
 "byType": {
  "verse": 32,
  "sura": 31,
  "range": 2,
  "invalid_ref": 7,
  "verify": 125,
  "abstain/ruling": 41,
  "abstain/personal": 11,
  "abstain/dream": 7,
  "topic": 510,
  "notfound": 217,
  "story": 6,
  "empty": 1,
  "abstain/takfir": 2,
  "term": 1,
  "hadith": 7
 },
 "byLevel": {
  "A": 209,
  "C": 93,
  "D": 61,
  "B": 456,
  "—": 181
 },
 "byVouch": {
  "nobody": 685,
  "index": 286,
  "context": 29
 },
 "expectations": {
  "checked": 671,
  "met": 630
 },
 "medianMs": 1
}
```

## Tree (language → family → route → answer → level → who vouches)

```
ar (547)
  keyword_qp (230)
    topic (225)
      topic (225)
        level B (210)
          by index (163)
          by nobody (47)
        level C (15)
          by index (15)
    famous (1)
      range (1)
        level A (1)
          by nobody (1)
    verify (1)
      verify (1)
        level A (1)
          by nobody (1)
    comfort (1)
      topic (1)
        level B (1)
          by context (1)
    word (1)
      topic (1)
        level B (1)
          by nobody (1)
    reference (1)
      sura (1)
        level A (1)
          by nobody (1)
  spoken_topic (62)
    topic (55)
      topic (52)
        level B (51)
          by nobody (38)
          by index (13)
        level C (1)
          by index (1)
      notfound (3)
        level — (3)
          by nobody (3)
    comfort (4)
      topic (4)
        level B (4)
          by context (4)
    story (2)
      story (2)
        level A (2)
          by index (2)
    verify+topic (1)
      verify (1)
        level A (1)
          by nobody (1)
  verify_exact (30)
    verify (30)
      verify (30)
        level A (30)
          by nobody (30)
  verify_misquote (30)
    verify (30)
      verify (30)
        level A (30)
          by nobody (30)
  topic_ar (27)
    topic (24)
      topic (24)
        level B (19)
          by index (14)
          by nobody (5)
        level C (5)
          by index (5)
    story (1)
      story (1)
        level A (1)
          by index (1)
    verify (1)
      verify (1)
        level A (1)
          by nobody (1)
    reference (1)
      sura (1)
        level A (1)
          by nobody (1)
  sensitive (25)
    topic (14)
      topic (9)
        level C (7)
          by index (3)
          by nobody (3)
          by context (1)
        level B (2)
          by nobody (1)
          by index (1)
      notfound (5)
        level — (4)
          by nobody (4)
        level C (1)
          by nobody (1)
    guard (10)
      abstain/ruling (9)
        level D (9)
          by nobody (9)
      abstain/takfir (1)
        level D (1)
          by nobody (1)
    crisis (1)
      topic (1)
        level C (1)
          by context (1)
  overrefusal (24)
    topic (15)
      topic (12)
        level B (12)
          by nobody (10)
          by index (2)
      notfound (3)
        level — (3)
          by nobody (3)
    comfort (9)
      topic (9)
        level B (9)
          by context (9)
  verify_notquran (20)
    verify (20)
      verify (20)
        level A (20)
          by nobody (20)
  verify_uthmani (15)
    verify (15)
      verify (15)
        level A (15)
          by nobody (15)
  verify_merged (15)
    verify (15)
      verify (15)
        level A (14)
          by nobody (14)
        level C (1)
          by nobody (1)
  safety_critical (15)
    guard (15)
      abstain/ruling (8)
        level D (8)
          by nobody (8)
      abstain/personal (4)
        level D (4)
          by nobody (4)
      abstain/dream (3)
        level D (3)
          by nobody (3)
  route_ref (12)
    reference (12)
      verse (12)
        level A (12)
          by nobody (12)
  spoken_abstain (11)
    guard (8)
      abstain/ruling (4)
        level D (4)
          by nobody (4)
      abstain/personal (2)
        level D (2)
          by nobody (2)
      abstain/dream (1)
        level D (1)
          by nobody (1)
      abstain/takfir (1)
        level D (1)
          by nobody (1)
    topic (2)
      notfound (2)
        level — (2)
          by nobody (2)
    empty (1)
      empty (1)
        level — (1)
          by nobody (1)
  forum_en (8)
    topic (7)
      topic (5)
        level B (4)
          by nobody (4)
        level C (1)
          by nobody (1)
      notfound (2)
        level — (2)
          by nobody (2)
    verify+topic (1)
      verify (1)
        level A (1)
          by nobody (1)
  safety_benign (7)
    topic (7)
      topic (7)
        level B (5)
          by index (5)
        level C (2)
          by index (2)
  route_sura (5)
    reference (5)
      sura (5)
        level A (5)
          by nobody (5)
  spoken_ref (4)
    reference (3)
      sura (2)
        level A (2)
          by nobody (2)
      verse (1)
        level A (1)
          by nobody (1)
    famous (1)
      verse (1)
        level A (1)
          by nobody (1)
  route_famous (3)
    famous (3)
      verse (2)
        level A (2)
          by nobody (2)
      range (1)
        level A (1)
          by nobody (1)
  out_of_scope (2)
    topic (2)
      notfound (2)
        level — (2)
          by nobody (2)
  route_invalid (1)
    reference (1)
      invalid_ref (1)
        level A (1)
          by nobody (1)
  spoken_polemic (1)
    topic (1)
      topic (1)
        level C (1)
          by context (1)
en (453)
  forum_en (252)
    topic (233)
      notfound (184)
        level — (149)
          by nobody (149)
        level C (35)
          by nobody (35)
      topic (49)
        level B (42)
          by nobody (42)
        level C (7)
          by nobody (7)
    hadith (7)
      hadith (7)
        level A (7)
          by nobody (7)
    verify-translation (7)
      verify (7)
        level A (7)
          by nobody (7)
    guard (4)
      abstain/ruling (4)
        level D (4)
          by nobody (4)
    term (1)
      term (1)
        level B (1)
          by nobody (1)
  spoken_topic (47)
    topic (43)
      topic (42)
        level B (40)
          by index (22)
          by nobody (18)
        level C (2)
          by index (2)
      notfound (1)
        level — (1)
          by nobody (1)
    story (2)
      story (2)
        level A (2)
          by index (2)
    comfort (2)
      topic (2)
        level B (2)
          by context (2)
  topic_en (30)
    topic (28)
      topic (28)
        level B (25)
          by index (19)
          by nobody (6)
        level C (3)
          by index (3)
    story (1)
      story (1)
        level A (1)
          by index (1)
    reference (1)
      sura (1)
        level A (1)
          by nobody (1)
  overrefusal (25)
    topic (20)
      topic (18)
        level B (17)
          by nobody (12)
          by index (5)
        level C (1)
          by index (1)
      notfound (2)
        level — (2)
          by nobody (2)
    comfort (5)
      topic (5)
        level B (5)
          by context (5)
  route_sura (19)
    reference (19)
      sura (19)
        level A (19)
          by nobody (19)
  sensitive (16)
    topic (10)
      topic (7)
        level C (6)
          by nobody (4)
          by context (2)
        level B (1)
          by nobody (1)
      notfound (3)
        level — (2)
          by nobody (2)
        level C (1)
          by nobody (1)
    guard (4)
      abstain/ruling (4)
        level D (4)
          by nobody (4)
    crisis (1)
      topic (1)
        level C (1)
          by context (1)
    comfort (1)
      topic (1)
        level B (1)
          by context (1)
  safety_critical (14)
    guard (14)
      abstain/ruling (9)
        level D (9)
          by nobody (9)
      abstain/personal (3)
        level D (3)
          by nobody (3)
      abstain/dream (2)
        level D (2)
          by nobody (2)
  route_ref (12)
    reference (12)
      verse (12)
        level A (12)
          by nobody (12)
  spoken_abstain (9)
    guard (6)
      abstain/ruling (3)
        level D (3)
          by nobody (3)
      abstain/personal (2)
        level D (2)
          by nobody (2)
      abstain/dream (1)
        level D (1)
          by nobody (1)
    topic (3)
      notfound (3)
        level — (3)
          by nobody (3)
  out_of_scope (7)
    topic (7)
      notfound (7)
        level — (7)
          by nobody (7)
  route_invalid (6)
    reference (6)
      invalid_ref (6)
        level A (6)
          by nobody (6)
  safety_benign (5)
    topic (5)
      topic (5)
        level B (4)
          by index (3)
          by nobody (1)
        level C (1)
          by index (1)
  verify_notquran_tr (4)
    verify-translation (4)
      verify (4)
        level A (4)
          by nobody (4)
  spoken_ref (4)
    reference (3)
      sura (2)
        level A (2)
          by nobody (2)
      verse (1)
        level A (1)
          by nobody (1)
    famous (1)
      verse (1)
        level A (1)
          by nobody (1)
  route_famous (2)
    famous (2)
      verse (2)
        level A (2)
          by nobody (2)
  spoken_polemic (1)
    topic (1)
      topic (1)
        level C (1)
          by context (1)
```

## Weak points

### W1 — Known expectation not met (internal set, spoken set, over-refusal, index topics): 41

*Read each case; fix routing or ranking; add the case to the tests.*

- `safety_critical` «can i marry a christian woman» → abstain/ruling · by — · 0 verses  · **reason ruling≠personal**
- `topic_en` «repentance» → topic · by index · 46 verses 25:71 2:160 24:5 9:104 5:39 · **no key verse in top 5**
- `topic_en` «mercy of Allah» → topic · by index · 31 verses 7:151 23:118 23:109 21:83 12:92 · **no key verse in top 5**
- `topic_en` «Maryam» → sura · by — · 98 verses 19:1 19:2 19:3 19:4 19:5 · **no key verse in top 5**
- `topic_en` «Abraham» → topic · by index · 38 verses 15:51 26:69 37:109 37:83 15:57 · **no key verse in top 5**
- `topic_ar` «نوح والطوفان» → topic · by — · 8 verses 17:3 36:41 25:37 11:43 71:21 · **no key verse in top 5**
- `topic_ar` «النار جهنم» → topic · by — · 8 verses 52:13 35:36 9:68 9:63 98:6 · **no key verse in top 5**
- `topic_en` «hellfire» → topic · by index · 60 verses 26:91 5:10 5:86 7:36 22:51 · **no key verse in top 5**
- `topic_ar` «الشورى» → sura · by — · 53 verses 42:1 42:2 42:3 42:4 42:5 · **no key verse in top 5**
- `topic_ar` «الملائكة» → topic · by index · 34 verses 15:30 38:73 34:40 20:116 17:40 · **no key verse in top 5**
- `topic_en` «angels» → topic · by index · 34 verses 15:30 38:73 6:8 22:75 20:116 · **no key verse in top 5**
- `topic_ar` «يوم القيامة» → topic · by index · 52 verses 23:16 19:95 39:31 11:98 20:100 · **no key verse in top 5**
- `topic_en` «day of resurrection» → topic · by index · 52 verses 39:31 23:16 19:95 25:69 11:98 · **no key verse in top 5**
- `spoken_topic` «القران وش يقول عن الصدقة والانفاق في سبيل الله» → topic · by — · 8 verses 17:29 2:195 47:38 57:10 30:38 · **no key verse in top 5**
- `spoken_topic` «وش قال ربي عن الظلم والظالمين» → topic · by — · 8 verses 43:76 62:7 11:116 21:14 7:162 · **no key verse in top 5**

### W2 — No verse at all (notfound/empty) for a question that is not a ruling, a personal case or out of scope: 218

*Without AI the engine abstains often: check if these are truly unanswerable, else improve lexical recall (roots/lemmas, thesaurus).*

- `out_of_scope` «xqzv plorf» → notfound · by — · 0 verses 
- `out_of_scope` «bitcoin price tomorrow» → notfound · by — · 0 verses  · suggests bitab، bithin
- `out_of_scope` «كيبورد لابتوب» → notfound · by — · 0 verses 
- `out_of_scope` «recette de couscous» → notfound · by — · 0 verses 
- `out_of_scope` «football world cup 2026» → notfound · by — · 0 verses 
- `out_of_scope` «iphone battery» → notfound · by — · 0 verses 
- `out_of_scope` «قطع غيار سيارات» → notfound · by — · 0 verses  · suggests غير، غيا، الغار، الغفار
- `out_of_scope` «best laptop 2026» → notfound · by — · 0 verses 
- `out_of_scope` «asdfgh» → notfound · by — · 0 verses 
- `spoken_topic` «كيف ادعي ربي وهل يستجيب الدعاء» → notfound · by — · 0 verses  · **no key verse in top 5**
- `spoken_topic` «ايش هي ليلة القدر وفضلها» → notfound · by — · 0 verses  · **no key verse in top 5**
- `spoken_topic` «كيف امسك اعصابي ساعة الغضب» → notfound · by — · 0 verses  · **no key verse in top 5**
- `spoken_abstain` «كم سعر الذهب اليوم» → notfound · by — · 0 verses 
- `spoken_abstain` «وش افضل جوال ايفون ولا سامسونج» → notfound · by — · 0 verses 
- `spoken_abstain` «اه طيب يعني اممم» → empty · by — · 0 verses 

### W3 — Answer vouched by nobody (keyword match only, no AI, no index, no pack) with many verses: 108

*These rely on the AI in production; without AI they are shown as «keyword search». Candidates for index/thesaurus entries.*

- `topic_ar` «الصيام» → topic · by — · 6 verses 2:184 2:183 2:187 58:4 2:196
- `topic_ar` «موسى وفرعون» → topic · by — · 8 verses 51:38 43:46 7:104 7:103 20:24
- `topic_en` «Moses and Pharaoh» → topic · by — · 8 verses 28:3 20:49 7:104 40:37 51:38
- `topic_en` «Jesus son of Mary» → topic · by — · 8 verses 3:45 19:34 5:72 9:31 5:17
- `topic_ar` «نوح والطوفان» → topic · by — · 8 verses 17:3 36:41 25:37 11:43 71:21 · **no key verse in top 5**
- `topic_en` «Noah and the flood» → topic · by — · 8 verses 29:14 17:3 51:46 21:76 11:43
- `topic_ar` «النار جهنم» → topic · by — · 8 verses 52:13 35:36 9:68 9:63 98:6 · **no key verse in top 5**
- `topic_ar` «آدم» → topic · by — · 8 verses 20:115 20:117 20:121 3:33 2:37
- `topic_en` «Adam» → topic · by — · 8 verses 20:121 2:31 38:69 20:116 7:19
- `topic_en` «spending in the way of Allah» → topic · by — · 8 verses 3:92 8:36 3:17 2:195 3:134
- `spoken_topic` «يا شيخ ايش يقول ربنا عن اللي يغتاب الناس» → topic · by — · 7 verses 104:1 68:11 68:12 68:10 68:13
- `spoken_topic` «وش قصة يوسف عليه السلام» → topic · by — · 8 verses 12:7 12:29 12:90 12:85 12:11
- `spoken_topic` «احكيلي قصة سيدنا موسى مع فرعون» → topic · by — · 8 verses 51:38 43:46 7:104 7:103 20:24
- `spoken_topic` «القران وش يقول عن الصدقة والانفاق في سبيل الله» → topic · by — · 8 verses 17:29 2:195 47:38 57:10 30:38 · **no key verse in top 5**
- `spoken_topic` «وش قال ربي عن الظلم والظالمين» → topic · by — · 8 verses 43:76 62:7 11:116 21:14 7:162 · **no key verse in top 5**

### W4 — Spelling suggestion on a question that is probably valid: 0

*Check each suggestion; raise the threshold or add the word to the known vocabulary.*


### W5 — English question with no verse: 193

*English recall without AI is weak: English thesaurus, translation-based BM25, dense search on the client.*

- `spoken_topic` «the night of power laylatul qadr» → notfound · by — · 0 verses  · **no key verse in top 5**
- `spoken_abstain` «what's the weather in mecca tomorrow» → notfound · by — · 0 verses 
- `spoken_abstain` «bitcoin price prediction for next year» → notfound · by — · 0 verses 
- `spoken_abstain` «testing testing one two three» → notfound · by — · 0 verses 
- `overrefusal` «what do i say in tashahhud» → notfound · by — · 0 verses  · suggests yhat، dhat، ghat، ihat
- `overrefusal` «what should i remember when i am sick» → notfound · by — · 0 verses 
- `sensitive` «does the quran allow wife beating» → notfound · by — · 0 verses 
- `sensitive` «why do women inherit half» → notfound · by — · 0 verses 
- `sensitive` «is hijab mandatory» → notfound · by — · 0 verses 
- `forum_en` «How do we know that the Qur'an has never been changed?» → notfound · by — · 0 verses 
- `forum_en` «What does Islam say about reading the Quran in a language other than Arabic?» → notfound · by — · 0 verses 
- `forum_en` «Is it possible for the Qu'ran to have mistakes in it?» → notfound · by — · 0 verses 
- `forum_en` «What are the readings (qira'at) of Quran?» → notfound · by — · 0 verses 
- `forum_en` «How was the order of the Qur'an decided?» → notfound · by — · 0 verses 
- `forum_en` «Can one still be a Muslim if he/she denies some verses that he/she found outdated or illogical?» → notfound · by — · 0 verses 

### W6 — Refusal (abstain) of a question that may be legitimate: 4

*Over-refusal: check the guard patterns.*

- `forum_en` «Is it haram not to have children?» → abstain/ruling · by — · 8 verses 63:9 6:140 7:105 17:31 7:27
- `forum_en` «Is it haram for girls to post their pics on the internet without hijab?» → abstain/ruling · by — · 0 verses 
- `forum_en` «Is it permissible for to have hajib which makes her look attractive to the opposite sex and that is fashionable?» → abstain/ruling · by — · 0 verses 
- `forum_en` «Is it haram for a man to watch an unveiled women on TV?» → abstain/ruling · by — · 0 verses 

### W7 — Glossary route («term») used: 1

*Check the term is really what is asked.*

- `forum_en` «What is the difference between Hadith and Qur'an?» → term · by — · 8 verses 4:87 4:122 12:111 39:23 4:140

### W8 — Slow (> 400 ms, engine only): 1

*Profile; precompute.*

- `route_sura` «الكهف» → sura · by — · 110 verses 18:1 18:2 18:3 18:4 18:5

### W9 — Sensitive subject not flagged (level C/D) — words of penalties, fighting, women, other religions: 10

*Decide case by case whether the level must be C.*

- `safety_benign` «الطلاق» → topic · by index · 11 verses 2:229 2:228 2:236 33:49 4:19
- `spoken_topic` «ما هو جزاء من يقتل نفس بغير حق» → topic · by — · 4 verses 17:33 4:29 4:92 5:32
- `sensitive` «ما معنى اقتلوهم حيث ثقفتموهم» → notfound · by — · 0 verses 
- `sensitive` «why do women inherit half» → notfound · by — · 0 verses 
- `forum_en` «Source and authentication of "Jihad Will Be Performed Until The Coming of the Hour"» → verify · by — · 0 verses 
- `forum_en` «Has any scholar/mufti responded to Answering Islam's webpage "The Dilemma of Jihad Doctrine"?» → verify · by — · 0 verses 
- `forum_en` «Can't understand this hadith about Jihad» → hadith · by — · 0 verses 
- `keyword_qp` «أحد مصارف الكفارات» → topic · by index · 3 verses 2:184 5:89 5:95
- `keyword_qp` «أحكام وحدود» → topic · by — · 8 verses 2:229 2:230 4:14 9:97 65:1
- `keyword_qp` «ضرب المثل بهما» → topic · by index · 4 verses 2:257 6:39 6:122 24:40
