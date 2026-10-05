# Mishkat (مِشكاة) — fonctionnement détaillé du moteur de recherche et du RAG

*Version du 5 octobre 2026. Tout ce qui est décrit ici renvoie à un fichier du dépôt. Les chiffres viennent des fichiers de résultats cités et ne sont pas recopiés de mémoire.*
Planche illustrée du pipeline : [`pipeline_rag.png`](pipeline_rag.png) (source : `tools/make_pipeline.mjs`).

---

## 0. L'idée en une phrase

**L'IA ne rédige jamais un mot religieux.** Elle comprend la question, propose des pistes de recherche, puis **choisit des numéros dans une liste fermée** de textes authentiques que le moteur a lui‑même rassemblés. Ces textes sont le Coran (Tanzil), les tafsirs reconnus, les hadiths jugés et l'encyclopédie de fiqh. Un **second modèle** vérifie ce choix, et des **règles fixes** (R1–R13) le vérifient encore. Ce qui s'affiche est la **copie exacte** du texte source, avec sa référence. S'il manque une preuve, Mishkat s'abstient.

C'est un **RAG extractif à preuves** (*evidence‑bound extractive RAG*). La partie « génération » d'un RAG classique est remplacée par une **sélection d'identifiants**. On garde le bénéfice de la compréhension par un modèle de langue, sans le risque d'hallucination dans le contenu.

---

## 1. Vue d'ensemble : 7 étages

| # | Étage | Où | IA ? | Ce qui en sort |
|---|---|---|---|---|
| 1 | **Carte de la question** (portée, crise, enfant, outils) | `public/js/scope.js`, `tools.js`, `app.js › run()` | non | réponse fixe, outil ouvert, ou passage à l'étage 2 |
| 2 | **Garde et routage** (verset/sourate, mots exacts du Coran, fatwa, cas personnel, injection) | `engine.js › guardCheck`, `injection.js`, `ask0()` | non | route : `verse`, `sura`, `verify`, `topic`, `abstain`… |
| 3 | **Compréhension** : intention + mots‑clés + versets proposés | `functions/_lib/selector.js › expand` (`POST /api/expand`) | oui (sortie vérifiée) | intention, mots‑clés ar/en, références « s:a » à vérifier |
| 4 | **Récupération hybride** : lexical BM25 + sens (bge‑m3) + index thématique + versets proposés | `engine.js › topicSearch`, `dense-rank.js`, `search-worker.js` | embedding seulement | **liste fermée de 36 versets candidats** |
| 5 | **Sélection en liste fermée** (score 2 = répond, 1 = lié) | `selector.js › select` (`POST /api/select`) + `engine.verifyLLM` | oui (identifiants seulement) | versets confirmés, ordonnés |
| 6 | **« الجواب باختصار »** : compositeur + juge sur des phrases numérotées | `rag.js`, `functions/_lib/answer.js` (`POST /api/answer`) | oui (2 modèles, identifiants seulement) | 1 à 3 points, chacun 1–2 phrases **verbatim** |
| 7 | **Sources complémentaires** : Sunna (HadeethEnc), fiqh (Dorar), objections (Bayenat), hadith cité (Dorar) | `app.js › loadSunnah / loadFiqh`, `fiqh.js`, `sources.js`, `/api/pick` | sélection seulement | cartes citées mot pour mot avec lien |

Tout le moteur tourne **dans le navigateur, dans un Web Worker** (`search-worker.js`), pour que l'interface ne gèle pas. Le serveur (Cloudflare Pages Functions) fait seulement trois choses : appeler les modèles, calculer l'embedding de la question, et relayer les sources en direct. Il applique la même‑origine, une limite de débit par IP et une limite de taille (`_lib/guard.js`, `_lib/handler.js`).

---

## 2. Étage 1 — la carte de la question (avant toute recherche)

`app.js › run()` regarde d'abord la question, **sans IA**.
- **Personne en détresse** (`isCrisis`) : elle va toujours au moteur, jamais vers un refus. Les versets de sérénité font toujours partie des candidats (`COMFORT_REFS`).
- **Mode enfant** (âge < 18 ans choisi au premier accès) : aucune fatwa, aucun sujet sensible. L'enfant est redirigé avec douceur vers la mémorisation (tekrar) et la khatma.
- **Hors sujet** (recette, prix, météo, code, devoirs…) : une réponse fixe écrite à la main, sans IA. L'API refuse aussi les mêmes textes. Mesure : sur 1 498 questions du projet, 13 sont classées hors sujet et elles le sont toutes vraiment ; aucun sur‑refus sur 50 cas (`eval/overrefusal.json`).
- **Date et heure** : réponse donnée par l'horloge (grégorien et hégire Umm al‑Qura).
- **Demande pratique** (« متى رمضان », « خطة لختم القرآن في شهر », « أريد أن أحفظ سورة الملك ») : l'outil correspondant s'ouvre (calendrier, khatma, tekrar, statistiques). Aucun appel d'IA.

## 3. Étage 2 — garde et routage déterministes

`engine.js › ask0()` reconnaît, sans modèle :
- une **référence** (« 2:255 », « آية الكرسي », « سورة الكهف ») → ouverture directe ;
- une **citation** : on vérifie si la phrase est un verset, avec la forme exacte ou proche (`verify`). Si elle n'est pas dans le Coran, on cherche si c'est un hadith dans la Dorar (le résultat est affiché tel quel) ;
- les **mots exacts du Coran** (`latin_index.json`, vocabulaire du Mushaf) et la **correction d'orthographe** sûre (« الزكات » → « الزكاة ») ;
- une **injection de consigne** ou une demande d'écrire un texte religieux (« اكتب لي حديثًا… ») → réponse fixe, sans IA (`injection.js`) ;
- une demande de **fatwa personnelle**, un **rêve**, l'**excommunication** : niveau د du référentiel, abstention et renvoi (alifta.gov.sa) ;
- un **sujet sensible** (peines, sang, polémique de violence) : bandeau rouge « سؤال حساس » et **paquet de contexte relu** (`packFor`).

## 4. Étage 3 — compréhension (IA, sortie vérifiée)

`POST /api/expand` → `selector.js`. Le modèle reçoit des règles strictes (le texte est en JSON seulement et il ne doit jamais écrire de contenu religieux). Il renvoie :
- `intent` : `topic`, `ruling`, `personal`, `polemic`, `other`… ;
- `keywords.ar` / `keywords.en` : des mots **tels qu'ils figurent dans le Coran ou dans le Muyassar ou le Mukhtasar**. Ils servent à la recherche seulement et ne sont jamais affichés ;
- `keywords.fatwa` : le sujet en vocabulaire de fiqh (pour l'encyclopédie) ;
- `refs` : jusqu'à 8 versets connus (« 17:23 »). Ils seront vérifiés.

`engine.verifyExpansion()` rejette tout ce qui n'a pas la bonne forme. Une référence proposée n'est gardée que si **le verset existe** et qu'il **partage un mot avec la question**, ou qu'il est **parmi les 40 voisins de sens** (deux contrôles indépendants). Sinon elle reste « libre ». Elle n'entre alors dans la liste qu'en fin de liste, et seule une sélection de score 2 peut la retenir.

## 5. Étage 4 — récupération hybride → liste fermée

Quatre classements indépendants :
1. **Lexical BM25** sur plusieurs champs (texte du verset en écriture imla'ie, Muyassar, Mukhtasar, traduction). Il y a un thésaurus bilingue, la racine légère, les mots trop fréquents rendus facultatifs, et le découpage « X et Y » (`topicSearch`).
2. **Sens (dense)** : le serveur calcule le vecteur **bge‑m3** de la question (Cloudflare Workers AI) et le projette en **256 dimensions (ACP)**. Le **navigateur** classe ensuite les 6 236 vecteurs « verset — Mukhtasar » en int8 (`public/data/vec/bge_m3_p256_int8.bin`, 1,6 Mo, 4 à 13 ms). Ce choix tient dans la limite CPU gratuite de Cloudflare. Recouvrement du top‑10 avec 1024 dimensions : 8 à 9 sur 10 sur des requêtes réelles.
3. **Mots‑clés de l'IA** : un BM25 séparé sur les mots de l'étage 3. Pour une question en anglais, les mots‑clés arabes cherchent aussi dans le texte arabe.
4. **Index thématique humain** : Quranpedia, « الموضوعات القرآنية », 6 100 thèmes.

**Fusion** en tourniquet de rangs (dans l'esprit de la fusion réciproque des rangs, *RRF*). On prend d'abord les versets proposés et ancrés, puis, rang par rang, un candidat de chaque classement. Le résultat est une **liste fermée de 36 versets au plus** (`MAX_CANDIDATES = 36`). Chacun est envoyé avec l'**identifiant « s:a »** et le **début de son tafsir**.

## 6. Étage 5 — sélection dans la liste fermée (IA, identifiants seulement)

`POST /api/select`. Le modèle lit les tafsirs des candidats et renvoie au plus 12 identifiants **de la liste**, chacun avec un score :
- **2** : le verset répond directement ou énonce le sujet demandé ;
- **1** : il est seulement lié.

Le prompt nomme les **homonymes** à rejeter, par exemple « الجاريات » = navires, pas « الجار » = voisin, ou « حجاب » = la barrière d'al‑A'raf (7:46), pas le voile. Il impose aussi de **juger sur le sens du tafsir**, pas sur les mots communs.
`engine.verifyLLM()` élimine tout identifiant hors liste et les doublons. On affiche d'abord les versets de score 2, dans l'ordre de l'IA, puis ceux de score 1 (marqués « lié »). La réponse est **confirmée** seulement si au moins un verset de score 2 existe, avec une confiance haute ou au moins deux versets.

## 7. Étage 6 — « الجواب باختصار » (le RAG extractif à preuves)

### 7.1 Construction de la liste fermée de phrases (navigateur, `rag.js`)
À partir des versets **confirmés**, le worker découpe en phrases entières (règle R8) :
- `V:s:a` : le **texte du verset** (Tanzil) ;
- `Q:s:a#n` : les **phrases du tafsir** de ce verset (Muyassar en arabe, Mukhtasar en anglais) ;
- `H:id#t / #e` : le texte et l'explication des **hadiths HadeethEnc jugés صحيح ou حسن**, retenus par `/api/pick` ;
- (`F:…` : passages de fatwas publiées. Ils ne sont plus envoyés depuis le 4 octobre, car le fiqh passe par l'encyclopédie de la Dorar, voir l'étage 7.)

Limites (`LIMITS`) : 8 versets, 4 phrases par verset, 4 hadiths, 600 caractères par unité, **48 phrases au plus**.

### 7.2 Deux modèles indépendants (`functions/_lib/answer.js`)
1. **Compositeur** (grand modèle, gpt‑oss‑120b) : il dégage 1 à 3 **concepts** de la question et dit si la liste répond (`yes`, `partial` ou `no`). Pour chaque concept couvert, il donne **1 ou 2 identifiants** de phrases qui énoncent la réponse. Il reçoit une consigne par **type de question** (statut, réconfort, mérite, comment, pourquoi, définition, histoire, thème).
2. **Juge** (modèle plus petit, gpt‑oss‑20b, avec son propre prompt, phrases renumérotées) : il garde seulement les phrases qui répondent **dans le même sens des mots**.

Un concept sans preuve est renvoyé comme **« non couvert »** et affiché comme tel. Il n'est jamais comblé.

### 7.3 Règles fixes appliquées après les modèles (`rag.js`)
| Règle | Effet |
|---|---|
| R1 | identifiants de la liste seulement, chaque passage une fois, quasi‑doublons retirés |
| R2 | pas de juge → pas de réponse courte |
| R3 | une question de statut ne reçoit jamais une phrase de tafsir présentée comme un statut |
| R4 | un passage d'un verset seulement « lié » doit partager un mot avec la question |
| R5 | personne en détresse : pas de passage sur le châtiment, sauf si elle en parle |
| R6 | plafonds : 3 points, 2 passages par point, 1 200 caractères |
| R7 | les étiquettes de concepts ne s'affichent que si ce sont des mots de la question |
| R8 | des phrases entières seulement, coupées à la fin d'une phrase |
| R10 | polémique de violence : jamais un verset de combat seul ; le contexte relu vient d'abord |
| R11 | sujet sensible : la réponse commence par un passage de contexte relu, sinon pas de réponse courte |
| R12 | verrou de sens pour les homonymes connus (عيد الميلاد, فوائد…) |
| R13 | unités groupées du Muyassar : une phrase doit partager un mot avec son propre verset |

Ce qui s'affiche : **la copie du navigateur** de chaque phrase choisie (jamais un texte renvoyé par un modèle), avec son verset, sa source et son lien.

## 8. Étage 7 — sources complémentaires (citées, jamais générées)
- **Sunna** (`loadSunnah`) : BM25 sur 3 572 hadiths arabes et 2 328 anglais de HadeethEnc, puis un **choix de l'IA en liste fermée** (`/api/pick`). Le texte, le degré et le lien sont donnés tels quels.
- **Statut (حكم)** (`loadFiqh`, `functions/_lib/fiqh.js`) : l'**encyclopédie de fiqh de la Dorar** (dorar.net/feqhia, dans le référentiel du défi). La section est choisie sur le sujet entier, en préférant les sections « feuilles » « حكم ». La descente dans les sous‑sections est vérifiée par le fil d'Ariane, puis on contrôle strictement la liste fermée. On affiche le texte de l'encyclopédie mot pour mot, avec l'accord ou la divergence et les autorités saoudiennes citées, sous le **bandeau rouge**. Mishkat ne tranche jamais.
- **Hadith cité** (« هل هذا حديث؟ ») : recherche dans la Dorar. Le verdict du muhaddith est donné tel quel.
- **Objections** : liens vers les réponses relues de **Bayenat** (Markaz Osoul).

## 9. Fournisseurs, coûts, pannes
- **Ordre « gratuit d'abord »** (`selector.providers`) : Groq gratuit (gpt‑oss‑120b ; tâches légères sur gpt‑oss‑20b), puis OpenRouter payant en secours (gpt‑oss‑120b, prix plafonné par `PRIMARY_MAX_PRICE`), puis les autres modèles.
- **Disjoncteurs** par fournisseur et modèle (401/402 → 30 min), un budget serveur de 7,5 s, et côté page, 3 échecs → l'IA est coupée 60 s. **Sans IA, le moteur déterministe répond quand même** (étages 1, 2, 4, avec la mention « non confirmé par l'IA »).
- Coût mesuré : environ **0,0014 $ par question** quand le secours payant est utilisé (`eval/cost_per_question.mjs`). Cache des réponses de l'IA (Cache API) et plafond journalier (`DAILY_AI_CALLS`).

## 10. Mesures (fichiers de résultats)
| Banc | Résultat | Fichier |
|---|---|---|
| RAG sur **1 000 questions** ar/en, juge indépendant d'une autre famille (DeepSeek‑V3.2), IC bootstrap 95 % | 1er verset répond directement **84,5 % [81,9–87,1]** ; réponse courte dans le sujet **99,5 %** ; **0 / 1 058** passage non verbatim ; cas critiques **15 → 2** ; encyclopédie, bonne section **73,3 %** (n = 45) | `eval/rag1000/README.md`, `REPORT_v1-v1j2_v4-v4j2.md` |
| Banc public **Qur'an QA 2023 tâche A** (palier gratuit, 3 exécutions) | MRR@10 **0,616 [0,490–0,742]**, MAP@10 **0,300 [0,210–0,402]** : **comparable** au meilleur publié (0,576 / 0,313), **pas meilleur** | `eval/qqa23/RESULTS.md` |
| Sur‑refus | 50/50 questions légitimes non refusées | `eval/overrefusal.json` |

Limites, dites franchement : il n'y a qu'un juge automatique, la notation humaine est préparée (`eval/human/`) mais pas encore faite ; les questions de forum (histoire, sectes, critique du hadith) restent la famille la plus faible ; une recherche thématique peut manquer un passage formulé autrement. Mishkat dit donc « versets liés » et jamais « tous les versets ».

## 11. Exemple suivi de bout en bout : « ماذا يقول القرآن عن الصبر؟ »
1. Carte : ce n'est pas hors sujet, ni un outil, ni une crise → moteur.
2. Garde : ce n'est pas une référence, ni une fatwa → route `topic`.
3. Compréhension : intent `topic`, mots‑clés « الصبر، الصابرين، اصبروا… », refs proposées → vérifiées (existence + mot commun ou voisin de sens).
4. Récupération : BM25 + bge‑m3 + mots‑clés + thème « الصبر » de l'index → 36 candidats.
5. Sélection : l'IA rend des identifiants de la liste avec leur score (vérifié en direct le 3 octobre : 2:153 vient en tête pour la patience) → versets confirmés, sourates allumées dans la galaxie 3D.
6. Réponse courte : 48 phrases numérotées → le compositeur choisit `Q:2:153#1`… → le juge garde ou retire → R1–R13 → phrases du Muyassar affichées **mot pour mot**, avec leur verset.
7. Sunna : des hadiths HadeethEnc sur la patience, choisis par numéro, avec leur degré.

## 12. Où lire le code
`public/js/app.js › run()` (orchestration) · `public/js/search-worker.js` (worker) · `public/js/engine.js` (`ask`, `ask0`, `topicSearch`, `verifyLLM`, `briefOf`) · `public/js/rag.js` · `public/js/dense-rank.js` · `functions/_lib/selector.js` · `functions/_lib/answer.js` · `functions/_lib/fiqh.js` · `functions/_lib/sources.js` · tests : `tests/answer.test.mjs`, `tests/fixes_v5.test.mjs`, `tests/dense_client.test.mjs`…

---
© 2026 Mohamed Nour Bou Ali — Mishkat. Tous droits réservés.
