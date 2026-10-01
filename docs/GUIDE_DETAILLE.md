# Mishkat (مِشكاة) — guide détaillé

*Version 7 · 1er octobre 2026 · préparation antérieure à la fenêtre du défi (4–6 octobre), à déclarer comme baseline.*

Mishkat est un moteur de recherche coranique « ancré » : il répond à une question par des **versets exacts** (texte Tanzil) et des **tafsirs cités mot pour mot**. Il les situe dans une **galaxie 3D des 77 433 mots du Coran** et propose une **récitation synchronisée mot à mot**. L'IA ne rédige jamais de contenu religieux : elle comprend la question et choisit parmi des listes fermées. Ce que Mishkat ne peut pas fonder sur une source, il le dit, et il s'abstient.

Langues de l'interface : **arabe** et **anglais**. Le français a été retiré à la demande du porteur du projet.

---

## 1. Le parcours en trois moments

L'interface est une seule surface de travail. Elle change de disposition selon ce que fait le visiteur, avec des transitions animées. Un seul **verset courant** relie toutes les zones.

| Moment | Ce que voit le visiteur | Comment on y arrive | Comment on en sort |
|---|---|---|---|
| **Accueil** | La galaxie seule, en plein écran, et au milieu une **barre de suggestions** (questions types, ou les centres d'intérêt choisis). La barre se ferme avec ✕ et se rouvre avec « اقتراحات ». | Ouverture du site, après le portail « سمِّ الله » | Poser une question (barre de recherche, micro, suggestion), ou cliquer une étoile |
| **Réponses** | Les réponses en **grand**, sans Mushaf ni tafsir. Dans la galaxie, les versets trouvés s'allument, **une couleur par sourate** (la même couleur que sur la carte de la sourate dans la liste). Une **étiquette cliquable** par sourate donne son nom et les numéros de ses versets. La caméra cadre l'ensemble. | Une question | Cliquer un verset (dans la liste ou sur une étiquette de la carte) → Étude ; ✕ → Accueil |
| **Étude** | Galaxie en haut. **Mushaf** en bas, aéré, avec la récitation. **Tafsir** agrandi sur le côté, sur fond sépia. Les réponses sont **repliées** en une barre au-dessus du tafsir : survol = aperçu, clic = elles se déplient et le tafsir se replie. Cliquer un autre résultat referme les réponses et rouvre le tafsir sur ce verset. | Un verset choisi | ✕ du lecteur ou Échap → retour aux réponses (ou à l'accueil s'il n'y a pas de question) |

Sur téléphone : la galaxie occupe le haut (30–34 % de l'écran). En mode Étude, trois onglets en bas permettent de passer de **Réponses** à **Mushaf** et à **Tafsir**.

---

## 2. Cartographie des fonctionnalités (sans redondance)

Chaque fonction a **une seule** place.

### 2.1 Barre d'en-tête (toujours visible)
- Recherche : idée, question, nom de sourate, référence (2:255), fragment de verset, citation à vérifier, hadith à vérifier.
- 🎤 Recherche vocale :
  - langue parlée choisie (ع / EN) ;
  - arrêt automatique au silence ;
  - texte corrigeable avant la recherche ;
  - Whisper côté serveur, sinon reconnaissance vocale du navigateur.
- ✦ Mes intérêts : fenêtre de bienvenue. Les 8 centres d'intérêt choisis personnalisent la barre de suggestions.
- ⓘ À propos : sources, règles, limites, niveaux de réponse, confidentialité.
- ☾/☀ thème sombre/clair · ع/EN langue.

### 2.2 Zone galaxie
- **Deux clés de vue**, combinables :

| Clé | Choix |
|---|---|
| **Forme** (touche V) | مجرّة (galaxie spirale), «قرآن» (le mot en 3D, rempli par le Coran), وردة السور (un anneau par sourate), قبّة الطواف (dôme), بتلات السور (pétales) |
| **Ordre** des sourates (touche O) | ترتيب المصحف, ترتيب النزول, المكي ثم المدني, عدد الكلمات, عدد الحروف, عدد الآيات, متوسط طول الآية |

  Chaque combinaison est calculée une fois puis atteinte par un **morphing** de 2,2 s. Une note d'une phrase explique ce que montre la vue, sans aucune spéculation numérologique.
- Outils : ⌂ vue d'ensemble · ＋/－ zoom · ⟲ rotation automatique · ﺱ noms des sourates · ◐ légende des couleurs · ⤢ galaxie agrandie à toute la surface.
- Survol d'une étoile : le mot, sa sourate et son verset. Clic : ouverture du verset en mode Étude.
- **La lampe Mishkat** (24:35) au bord de la galaxie : la flamme brûle au repos et le **mot récité prend sa place dans la fiole**. Sous la lampe : la référence du verset.
- Pendant la récitation :
  - la caméra **glisse** de mot en mot (suivi amorti, sans à-coups) et se rapproche jusqu'au zoom de lecture ;
  - **seul le mot récité est écrit**, dans un disque lumineux posé sur son étoile, qui glisse d'une étoile à l'autre avec un fondu ;
  - le reste du ciel s'assombrit ;
  - si le visiteur bouge la caméra, le suivi se met en pause pendant 5 s.
- Hors récitation, en vue rapprochée : les mots du verset courant sont écrits près de leurs étoiles et reliés par un fil doré.

### 2.3 Zone réponses
- Niveau de la réponse (أ/ب/ج/د, selon le référentiel du défi) et badge de vérification (conforme au Mushaf, citation déformée, pas un verset…). Badge « recherche par mots-clés » quand l'IA n'a pas confirmé.
- Explication : une carte par verset, avec le texte du verset et son **tafsir complet** (jamais un fragment). Bouton « السياق » : les versets d'avant et d'après, avec leur tafsir.
- Les sourates classées par pertinence, chacune dans sa couleur, avec ses versets et les mots cherchés surlignés. Dans chaque carte : « عن السورة » (fiche Quranpedia), 📖 lire, ▶ écouter.
- Selon la question :
  - **index thématique Quranpedia** (6 100 thèmes) ;
  - **glossaire officiel** du défi ;
  - **Encyclopédie du hadith (Dorar)** : résultats tels quels, avec le verdict de chaque spécialiste ;
  - **Bayyinat** : liens vers les réponses révisées aux objections ;
  - pour les fatwas : **liens officiels** (binbaz.org.sa, alifta.gov.sa) et versets marqués « pas une fatwa ».
- Mention de transparence sous chaque réponse : outil assisté par l'IA, ni savant ni mufti.

### 2.4 Zone Mushaf (lecteur)
- Choix de la sourate et de l'ayah ; méta (mecquoise/médinoise, nombre de versets) ; ℹ fiche de la sourate ; ✕ fermer.
- Boutons :
  - **⏮ première ayah de la sourate** ;
  - ‹ › ayah précédente / suivante ;
  - **▶ l'ayah seule** ;
  - **⏵⏵ lecture continue à partir de l'ayah** ;
  - تكرار ×1/3/5/10/∞ (mémorisation) ;
  - vitesse ×0,75–1,5 ;
  - A−/A+ taille du texte ;
  - ⧉ copier le verset (avec sa référence) ;
  - 🔗 copier le lien du verset.
- Récitation du cheikh **Mishary Alafasy**, synchronisée **mot à mot**. Le même mot s'allume dans le Mushaf, dans la galaxie et dans la lampe. La synchronisation suit aussi l'horloge audio, donc elle continue quand la fenêtre est en arrière-plan.
- **Arabe** : le texte du Mushaf seul, en page continue. Aucune lettre latine n'est affichée.
- **Anglais** : verset par verset, avec l'arabe, la **translittération mot à mot** (qui s'allume aussi pendant la récitation) et la **traduction** (Noor International). Les deux sont masquables.

### 2.5 Zone tafsir
- Référence du verset, ‹ › pour passer au verset voisin (le Mushaf et la galaxie suivent).
- **Onglets des tafsirs** :
  - arabe : الميسر · المختصر · السعدي (sur le site) · الطبري · ابن كثير · البغوي · القرطبي (↗ en direct) ;
  - anglais : Al-Mukhtasar, puis Ibn Kathir abrégé, puis les tafsirs arabes.
- Chaque texte porte son livre, son auteur et sa date de décès. Pour at-Tabari s'ajoutent le tome et la page, plus un avertissement quand la page couvre plusieurs versets. Quand un livre commente plusieurs versets d'un bloc, une mention l'indique.
- 🔊 **Écouter le tafsir** :
  - la voix du navigateur si elle existe, sinon une voix serveur (Groq Orpheus), phrase par phrase ;
  - mention « قراءة آلية للتفسير — ليست تلاوة » ;
  - texte limité à 3 000 caractères ;
  - messages clairs si aucune voix n'est disponible.
- A−/A+, copier avec la source, vérifier sur Quran.com, Encyclopédie du tafsir (Dorar).

### 2.6 Raccourcis clavier
`/` rechercher · `V` / `Maj+V` forme suivante/précédente · `O` / `Maj+O` ordre suivant/précédent · `←` `→` ayah suivante/précédente · `Espace` lecture/pause · `Échap` fermer le lecteur · séparateur galaxie/Mushaf redimensionnable à la souris ou avec ↑ ↓ (double-clic = 50/50).

---

## 3. Architecture

```
public/                      site statique (aucune étape de build)
  index.html                 squelette des zones + dialogues
  css/app.css                mise en page (3 moments), thèmes sombre/clair, mobile
  js/app.js                  orchestration : modes, recherche, réponses, lecteur, tafsir, voix
  js/engine.js               moteur de recherche ancré (routeur, vérification, BM25, garde-fous, niveaux)
  js/galaxy.js               rendu WebGL (three.js) : points, couleurs, étiquettes, caméra
  js/layouts.js              formes × ordres de la vue 3D
  js/letters3d.js            la forme «قرآن»
  js/speech.js               lecture du tafsir à voix haute (voix du navigateur → voix serveur)
  js/voice.js                saisie vocale (Whisper / Web Speech)
  js/lamp.js                 la lampe Mishkat animée
  js/i18n.js, glossary.js, basmala.js
  data/                      Coran, tafsirs, minutages, translittération, index (voir TRACEABILITY.md)
functions/                   API Cloudflare Pages (même code que le serveur local)
  _lib/selector.js           seul endroit où un LLM est appelé (intention, mots-clés, choix fermés)
  _lib/sources.js            Dorar (hadith), Quranpedia et Quran.com (tafsirs en direct)
  _lib/tts.js                voix serveur (Groq Orpheus)
  _lib/guard.js              même origine, limites de débit, tailles
server.mjs                   serveur local sans dépendance (mêmes routes)
tools/trace.mjs              outil de traçabilité → docs/TRACEABILITY.md + docs/traceability.html
tests/, eval/                tests automatiques et bancs d'évaluation
```

### 3.1 Routes de l'API (même origine uniquement)

| Route | Rôle | Service externe |
|---|---|---|
| `GET /api/health` | état (LLM, voix → texte, texte → voix) | — |
| `POST /api/expand` | intention et mots-clés de recherche | Groq (LLM) |
| `POST /api/select` | choix de versets dans une liste fermée | Groq (LLM) |
| `POST /api/transcribe` | voix → texte | Groq Whisper |
| `POST /api/hadith` | recherche de hadiths, verdicts tels quels | dorar.net |
| `POST /api/tafsir` | tafsirs en direct (Tabari, Ibn Kathir ar/en, Baghawi, Qurtubi) | Quranpedia, Quran.com |
| `POST /api/tts` | lecture d'un passage de tafsir affiché | Groq Orpheus |

Les limites de débit, les tailles et la carte complète des appels sont générées automatiquement dans `docs/TRACEABILITY.md`.

---

## 4. Règles de fiabilité (ligne rouge : aucun contenu religieux inventé)

1. **Texte coranique** : seulement `core.verses` (Tanzil, empreinte SHA-256 vérifiée), jamais retapé.
2. **Explications** : unités de tafsir **complètes**, citées mot pour mot, avec leur source.
3. **IA** : elle propose des mots-clés et une intention, puis **choisit des identifiants** dans une liste fermée. Tout ce qu'elle renvoie est validé deux fois, sur le serveur et dans le navigateur, et le reste est rejeté. Aucun mot écrit par un modèle n'est affiché.
4. **Abstention** : sans preuve suffisante, ou pour une fatwa personnelle, un cas privé ou un rêve, Mishkat s'abstient ou renvoie vers une instance qualifiée (niveau د).
5. **Hadith** : jamais produit. Seuls les résultats de la Dorar sont affichés, avec le verdict du spécialiste.
6. **Voix** : la voix serveur lit seulement un texte de tafsir déjà affiché. C'est une lecture **machine**, signalée comme telle, et jamais une récitation du Coran (la récitation est toujours celle d'Alafasy).
7. **Transparence et vie privée** : ni compte, ni pistage. Les préférences restent dans le navigateur. Ce qui est envoyé à chaque service est déclaré dans « À propos ».

---

## 5. Lancer, tester, déployer

- **PC (double-clic)** : `MISHKAT_PC/OUVRIR_MISHKAT.bat`. Après une modification, régénérer le dossier avec `python data_build/make_pc_bundle.py`.
- **Local** : `node server.mjs 8787`. La clé Groq se met dans `.dev.vars` (fichier ignoré par git).
- **Tests** : `npm test`. **Traçabilité** : `node tools/trace.mjs`. **Évaluation des requêtes parlées** : `node eval/run_spoken.mjs`.
- **Déploiement** : Cloudflare Pages (voir `DEPLOY.md`). Secret `GROQ_API_KEY`. Options : `TTS_VOICE_AR`, `TTS_VOICE_EN`, `TTS_OFF=1`.
- **À faire une fois par le titulaire du compte Groq** : accepter les conditions des modèles `canopylabs/orpheus-arabic-saudi` et `canopylabs/orpheus-v1-english` sur https://console.groq.com/playground?model=canopylabs%2Forpheus-arabic-saudi. Sans cela, la voix serveur répond « conditions à accepter » et Mishkat affiche un message clair.

---

## 6. Traçabilité

`node tools/trace.mjs` régénère `docs/TRACEABILITY.md` et `docs/traceability.html`, une page autonome hors ligne avec un filtre. Tout y est calculé à partir du dépôt :
- les hôtes externes, avec le fichier et la ligne de chaque usage, leur rôle et leur licence ;
- les routes internes et leurs limites ;
- les modèles d'IA et ce qu'ils ont le droit de faire ;
- les fichiers de données avec leur taille et leur SHA-256 ;
- l'inventaire du code, avec le dernier commit de chaque fichier ;
- les bibliothèques et les polices ;
- les tests ;
- l'historique git, chaque commit étant marqué « baseline déclarée » ou « fenêtre du défi ».

---

## 7. Limites connues

- La recherche thématique peut manquer un passage exprimé avec d'autres mots. On parle donc d'« emplacements liés », pas de « tous les emplacements ».
- Les tafsirs en direct, la Dorar, la voix serveur et la transcription dépendent d'Internet et des quotas des fournisseurs. Chaque échec est signalé, jamais masqué.
- L'ordre de révélation est un ordre savant répandu, montré pour l'exploration visuelle seulement.
- La voix serveur arabe (dialecte saoudien) peut mal prononcer certains mots du tafsir. Elle est présentée comme une aide, pas comme une lecture de référence.
