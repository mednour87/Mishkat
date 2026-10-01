// UI strings (hand-written; no machine translation of religious content).
export const UI = {
  ar: {
    dir: 'rtl', brand: 'مِشكاة', tagline: 'دليل مجرّة القرآن الذكي',
    placeholder: 'اكتب فكرة أو سؤالًا أو سورة أو آية… مثل: الصبر، يوسف، 2:255',
    lead: 'اسأل عن أي معنى أو قصة أو آية: يأتيك البيان من التفسير المعتمد بنصّه، وتُرتَّب لك السور حسب صلتها، ثم تطير إلى الموضع في مجرّة كلمات القرآن.',
    search: 'ابحث', home: 'العرض الكامل', layoutMushaf: 'ترتيب المصحف', layoutNuzul: 'ترتيب النزول',
    legend: 'المفتاح', about: 'عن مشكاة', close: 'إغلاق', tabResults: 'النتائج', tabReader: 'القارئ',
    chips: ['الصبر', 'كيف أتعامل مع الحزن', 'بر الوالدين', 'قصة يوسف', 'آية الكرسي', 'سورة الكهف', 'إن الله مع الصابرين', 'هل هذه آية: النظافة من الإيمان', 'ما حكم الموسيقى؟'],
    loading: ['تحميل نص المصحف…', 'بناء المجرّة: 77,433 كلمة…', 'تحميل التفسير المعتمد…', 'جاهز'],
    thinking: 'أبحث في المصحف والتفاسير المعتمدة…',
    paraTitle: 'البيان من التفسير', surasTitle: 'السور حسب الصلة', versesTitle: 'المواضع',
    paraBy: { llm: 'تفسير كامل لكل آية، اختار الذكاء الاصطناعي الآيات من قائمة مغلقة', context: 'آيات سياق مختارة ومراجَعة', none: '' },
    matched: (n) => n === 1 ? 'آية واحدة ذات صلة' : n === 2 ? 'آيتان ذواتا صلة' : `${n} آيات ذات صلة`,
    meccan: 'مكية', medinan: 'مدنية', ayas: (n) => `${n} آية`,
    readSura: '📖 اقرأ السورة', listen: '▶ استمع', play: '▶', pause: '❚❚', prevA: 'السابقة', nextA: 'التالية', auto: 'متتابعة',
    ayaN: 'الآية', copy: 'نسخ', copied: 'تم النسخ', verifyExt: 'تحقّق في Quran.com', report: 'أبلغ عن خطأ',
    translation: 'ترجمة المعاني', tafsirTitle: 'التفسير',
    srcNames: { muyassar_ar: 'الميسر', mukhtasar_ar: 'المختصر', saadi_ar: 'السعدي', mukhtasar_en: 'Al-Mukhtasar', mukhtasar_fr: 'Al-Mukhtasar' },
    saadiGroup: 'تفسير السعدي لهذه الآية مجمل مع ما قبلها:', loadingTafsir: 'جارٍ التحميل…',
    badges: { verse: 'نص المصحف ✓', sura: 'نص المصحف ✓', range: 'نص المصحف ✓', topic: 'مسند إلى التفسير المعتمد ✓',
      exact: 'مطابق لنص المصحف ✓', near: 'نص محرَّف — راجع اللفظ الصحيح', merged: 'خلط بين آيتين', notfound: 'ليس من القرآن',
      notverse: 'ليس آية', translation: 'موجود في ترجمة المعاني', unverified: 'لا يمكن التأكيد', abstain: 'امتناع وإحالة', notfoundTopic: 'امتناع: لا مرجع كافٍ', invalid_ref: 'مرجع غير موجود' },
    asTopic: (q) => `ابحث عن «${q}» كموضوع في الآيات ←`, asSura: (n) => `📖 افتح سورة ${n}`,
    yourText: 'النص المُدخل (الألفاظ المظللة غير مطابقة):',
    ai: (m) => m ? `بحث معزَّز بالذكاء الاصطناعي · ${m}` : 'وضع حتمي (بلا نموذج لغوي)',
    legendItems: [['#F3D9A4', 'كلمات السور المكية'], ['#8EC5F0', 'كلمات السور المدنية'], ['#FFD66B', 'اسم الجلالة والأسماء الحسنى'],
      ['#5EE6A0', 'أسماء الأنبياء'], ['#8FD3FF', 'الملائكة'], ['#B98CFF', 'الشيطان وإبليس']],
    gateTitle: 'سَمِّ الله', gateHint: 'اكتب البسملة أو انسخها والصقها أو قُلها بصوتك للدخول', gatePh: 'اكتب البسملة هنا…',
    enter: 'دخول', micLabel: 'تحدّث', gateOk: 'بسم الله نبدأ…', gateWrong: 'لم أتعرّف على البسملة؛ جرّب نسخها ولصقها.',
    listening: 'أستمع… تكلّم الآن', processing: 'أحوّل الصوت إلى نص…', voiceError: 'تعذّر استعمال الميكروفون؛ اكتب بدلًا من ذلك.',
    contextTitle: 'سياق ضروري لفهم السؤال (آيات وتفسيرها كاملًا)', ctxBtn: 'السياق', ctxTitle: 'ما قبل الآية وما بعدها مع تفسيرها:', readHere: 'اقرأ في السورة',
    relatedNotFatwa: 'آيات ذات صلة بالموضوع — للاطلاع، وليست فتوى',
    links: { binbaz: 'ابحث في فتاوى الشيخ ابن باز (binbaz.org.sa)', alifta: 'الرئاسة العامة للبحوث العلمية والإفتاء (alifta.gov.sa)' },
    hoverAya: (s, a) => `سورة ${s} · الآية ${a}`,
  },
  en: {
    dir: 'ltr', brand: 'Mishkat', tagline: 'The Quran Galaxy Guide',
    placeholder: 'Type an idea, a question, a surah or a verse… e.g. patience, Joseph, 2:255',
    lead: 'Ask about any meaning, story or verse: the explanation comes verbatim from vetted tafsir, surahs are ranked by relevance, and you fly to the place in the galaxy of the Quran’s words.',
    search: 'Search', home: 'Full view', layoutMushaf: 'Mushaf order', layoutNuzul: 'Revelation order',
    legend: 'Legend', about: 'About', close: 'Close', tabResults: 'Results', tabReader: 'Reader',
    chips: ['patience', 'how to deal with sadness', 'kindness to parents', 'Moses and Pharaoh', 'Maryam', 'Ayat al-Kursi', 'Al-Kahf', 'Is this a verse: «النظافة من الإيمان»', 'is music haram?'],
    loading: ['Loading the Mushaf text…', 'Building the galaxy: 77,433 words…', 'Loading vetted tafsir…', 'Ready'],
    thinking: 'Searching the Mushaf and vetted tafsir…',
    paraTitle: 'Explanation from tafsir', surasTitle: 'Surahs by relevance', versesTitle: 'Locations',
    paraBy: { llm: 'Full tafsir of each verse; verses chosen by AI from a closed list', context: 'Curated, reviewed context verses', none: '' },
    matched: (n) => `${n} related verse${n === 1 ? '' : 's'}`,
    meccan: 'Meccan', medinan: 'Medinan', ayas: (n) => `${n} verses`,
    readSura: '📖 Read surah', listen: '▶ Listen', play: '▶', pause: '❚❚', prevA: 'Prev', nextA: 'Next', auto: 'Continuous',
    ayaN: 'Verse', copy: 'Copy', copied: 'Copied', verifyExt: 'Verify on Quran.com', report: 'Report an error',
    translation: 'Translation of the meanings', tafsirTitle: 'Tafsir',
    srcNames: { muyassar_ar: 'Al-Muyassar (ar)', mukhtasar_ar: 'Al-Mukhtasar (ar)', saadi_ar: 'As-Sa‘di (ar)', mukhtasar_en: 'Al-Mukhtasar', mukhtasar_fr: 'Al-Mukhtasar (fr)' },
    saadiGroup: 'As-Sa‘di explains this verse together with the previous one(s):', loadingTafsir: 'Loading…',
    badges: { verse: 'Mushaf text ✓', sura: 'Mushaf text ✓', range: 'Mushaf text ✓', topic: 'Grounded in vetted tafsir ✓',
      exact: 'Matches the Mushaf ✓', near: 'Misquoted — see exact wording', merged: 'Two verses merged', notfound: 'Not from the Quran',
      notverse: 'Not a verse', translation: 'Found in a translation', unverified: 'Cannot be confirmed', abstain: 'Abstained & referred', notfoundTopic: 'Abstained: no sufficient source', invalid_ref: 'Reference does not exist' },
    asTopic: (q) => `Search “${q}” as a topic in the verses →`, asSura: (n) => `📖 Open surah ${n}`,
    yourText: 'Your text (highlighted words do not match):',
    ai: (m) => m ? `AI-augmented search · ${m}` : 'Deterministic mode (no LLM)',
    legendItems: [['#F3D9A4', 'Words of Meccan surahs'], ['#8EC5F0', 'Words of Medinan surahs'], ['#FFD66B', 'Allah & His Beautiful Names'],
      ['#5EE6A0', 'Names of prophets'], ['#8FD3FF', 'Angels'], ['#B98CFF', 'Satan / Iblis']],
    gateTitle: 'Say the name of Allah', gateHint: 'Type, copy-paste or say the basmala to enter', gatePh: 'Type the basmala here…',
    enter: 'Enter', micLabel: 'Speak', gateOk: 'Bismillah — welcome…', gateWrong: 'Basmala not recognised; try copy and paste.',
    listening: 'Listening… speak now', processing: 'Transcribing…', voiceError: 'Microphone unavailable; please type instead.',
    contextTitle: 'Essential context (verses with their full tafsir)', ctxBtn: 'Context', ctxTitle: 'Verses before and after, with tafsir:', readHere: 'Read in surah',
    relatedNotFatwa: 'Related verses — for reading, not a fatwa',
    links: { binbaz: 'Search Sheikh Ibn Baz’s fatwas (binbaz.org.sa)', alifta: 'General Presidency of Scholarly Research and Ifta (alifta.gov.sa)' },
    hoverAya: (s, a) => `Surah ${s} · verse ${a}`,
  },
  fr: {
    dir: 'ltr', brand: 'Mishkat', tagline: 'Le guide de la galaxie du Coran',
    placeholder: 'Écrivez une idée, une question, une sourate ou un verset… ex. patience, Joseph, 2:255',
    lead: 'Interrogez un sens, un récit ou un verset : l’explication vient mot pour mot d’un tafsir vérifié, les sourates sont classées par pertinence, puis vous volez vers l’endroit dans la galaxie des mots du Coran.',
    search: 'Rechercher', home: 'Vue complète', layoutMushaf: 'Ordre du Mushaf', layoutNuzul: 'Ordre de révélation',
    legend: 'Légende', about: 'À propos', close: 'Fermer', tabResults: 'Résultats', tabReader: 'Lecteur',
    chips: ['la patience', 'comment surmonter la tristesse', 'les parents', 'Moïse et Pharaon', 'Marie', 'verset du trône', 'sourate Al-Kahf', 'Est-ce un verset : « النظافة من الإيمان »', 'la musique est-elle haram ?'],
    loading: ['Chargement du texte du Mushaf…', 'Construction de la galaxie : 77 433 mots…', 'Chargement du tafsir vérifié…', 'Prêt'],
    thinking: 'Recherche dans le Mushaf et les tafsirs vérifiés…',
    paraTitle: 'Explication d’après le tafsir', surasTitle: 'Sourates par pertinence', versesTitle: 'Emplacements',
    paraBy: { llm: 'Tafsir complet de chaque verset ; versets choisis par l’IA dans une liste fermée', context: 'Versets de contexte choisis et vérifiés', none: '' },
    matched: (n) => `${n} verset${n === 1 ? '' : 's'} lié${n === 1 ? '' : 's'}`,
    meccan: 'mecquoise', medinan: 'médinoise', ayas: (n) => `${n} versets`,
    readSura: '📖 Lire la sourate', listen: '▶ Écouter', play: '▶', pause: '❚❚', prevA: 'Préc.', nextA: 'Suiv.', auto: 'Continu',
    ayaN: 'Verset', copy: 'Copier', copied: 'Copié', verifyExt: 'Vérifier sur Quran.com', report: 'Signaler une erreur',
    translation: 'Traduction des sens', tafsirTitle: 'Tafsir',
    srcNames: { muyassar_ar: 'Al-Muyassar (ar)', mukhtasar_ar: 'Al-Mukhtasar (ar)', saadi_ar: 'As-Sa‘di (ar)', mukhtasar_en: 'Al-Mukhtasar (en)', mukhtasar_fr: 'Al-Mukhtasar' },
    saadiGroup: 'As-Sa‘di explique ce verset avec le(s) précédent(s) :', loadingTafsir: 'Chargement…',
    badges: { verse: 'Texte du Mushaf ✓', sura: 'Texte du Mushaf ✓', range: 'Texte du Mushaf ✓', topic: 'Fondé sur un tafsir vérifié ✓',
      exact: 'Conforme au Mushaf ✓', near: 'Citation déformée — voir le texte exact', merged: 'Deux versets mélangés', notfound: 'Absent du Coran',
      notverse: 'Pas un verset', translation: 'Trouvé dans une traduction', unverified: 'Non confirmable', abstain: 'Abstention et renvoi', notfoundTopic: 'Abstention : source insuffisante', invalid_ref: 'Référence inexistante' },
    asTopic: (q) => `Chercher « ${q} » comme thème dans les versets →`, asSura: (n) => `📖 Ouvrir la sourate ${n}`,
    yourText: 'Votre texte (les mots surlignés ne correspondent pas) :',
    ai: (m) => m ? `Recherche augmentée par l’IA · ${m}` : 'Mode déterministe (sans LLM)',
    legendItems: [['#F3D9A4', 'Mots des sourates mecquoises'], ['#8EC5F0', 'Mots des sourates médinoises'], ['#FFD66B', 'Allah et Ses beaux Noms'],
      ['#5EE6A0', 'Noms des prophètes'], ['#8FD3FF', 'Les anges'], ['#B98CFF', 'Satan / Iblis']],
    gateTitle: 'Prononcez le nom d’Allah', gateHint: 'Écrivez, copiez-collez ou dites la basmala pour entrer', gatePh: 'Écrivez la basmala ici…',
    enter: 'Entrer', micLabel: 'Parler', gateOk: 'Bismillah — bienvenue…', gateWrong: 'Basmala non reconnue ; essayez le copier-coller.',
    listening: 'J’écoute… parlez', processing: 'Transcription…', voiceError: 'Micro indisponible ; écrivez plutôt.',
    contextTitle: 'Contexte essentiel (versets avec leur tafsir complet)', ctxBtn: 'Contexte', ctxTitle: 'Versets avant et après, avec leur tafsir :', readHere: 'Lire dans la sourate',
    relatedNotFatwa: 'Versets liés au sujet — à lire, ce n’est pas une fatwa',
    links: { binbaz: 'Chercher dans les fatwas du cheikh Ibn Baz (binbaz.org.sa)', alifta: 'Présidence générale de la recherche et de l’ifta (alifta.gov.sa)' },
    hoverAya: (s, a) => `Sourate ${s} · verset ${a}`,
  },
};

const SRC_LIST = {
  ar: `<li>نص القرآن: <a href="https://tanzil.net" target="_blank" rel="noopener">مشروع تنزيل</a> (رواية حفص) — CC BY 3.0، دون أي تعديل.</li>
<li>التفسير: «التفسير الميسر» (مجمع الملك فهد) و«المختصر في تفسير القرآن الكريم» (مركز تفسير) عبر <a href="https://quranenc.com" target="_blank" rel="noopener">QuranEnc.com</a>؛ و«تيسير الكريم الرحمن» للسعدي عبر Quran.com.</li>
<li>ترجمات المعاني: نور الدولية (إنجليزي)، رشيد معاش (فرنسي) — QuranEnc.com.</li>
<li>التلاوة وتوقيت الكلمات: الشيخ مشاري العفاسي عبر Quran.com.</li>
<li>القاعدة والمجرّة: مشروع «كارتوغرافيا القرآن الكريم» (نسخة أساس مُعلنة).</li>`,
  en: `<li>Quran text: <a href="https://tanzil.net" target="_blank" rel="noopener">Tanzil Project</a> (Hafs) — CC BY 3.0, verbatim.</li>
<li>Tafsir: At-Tafsir Al-Muyassar (King Fahd Complex) and Al-Mukhtasar (Tafsir Center) via <a href="https://quranenc.com" target="_blank" rel="noopener">QuranEnc.com</a>; Tafsir As-Sa‘di via Quran.com.</li>
<li>Translations of the meanings: Noor International (en), Rachid Maach (fr) — QuranEnc.com.</li>
<li>Recitation & word timings: Sheikh Mishary Alafasy via Quran.com.</li>
<li>Database & galaxy: the “Quran Cartography” project (declared baseline).</li>`,
  fr: `<li>Texte coranique : <a href="https://tanzil.net" target="_blank" rel="noopener">Tanzil Project</a> (Hafs) — CC BY 3.0, sans modification.</li>
<li>Tafsir : At-Tafsir Al-Muyassar (Complexe Roi Fahd) et Al-Mukhtasar (Centre Tafsir) via <a href="https://quranenc.com" target="_blank" rel="noopener">QuranEnc.com</a> ; Tafsir As-Sa‘di via Quran.com.</li>
<li>Traductions des sens : Noor International (en), Rachid Maach (fr) — QuranEnc.com.</li>
<li>Récitation et minutage des mots : Cheikh Mishary Alafasy via Quran.com.</li>
<li>Base et galaxie : projet « Cartographie du Coran » (baseline déclarée).</li>`,
};

export const ABOUT = {
  ar: `<h2>مِشكاة — دليل مجرّة القرآن الذكي</h2>
<p class="ayah" style="text-align:center">﴿{{V24_35}}﴾ <small>[النور: 35]</small></p><p>المشكاة كُوّة يوضع فيها المصباح فتجمع نوره. وكذلك «مشكاة»: تجمع لك نور البيان من التفاسير المعتمدة حول سؤالك، في مجرّة من 77,433 نجمة هي كلمات القرآن.</p>
<h3>القاعدة الذهبية: لا محتوى ديني من إنشاء الآلة</h3>
<ul><li>نص الآيات يُعرض حصرًا من نص مشروع تنزيل، بلا أي تعديل، مع بصمة SHA-256.</li>
<li>فقرة البيان مؤلَّفة من جمل منقولة حرفيًّا من «التفسير الميسر» أو «المختصر»، وكل جملة موسومة بآيتها ومصدرها.</li>
<li>الذكاء الاصطناعي يفهم السؤال ويقترح كلمات بحث، ثم يختار آيات وجملًا من قوائم مغلقة مرقّمة؛ ويرفض المدقق كل ما هو خارجها. ولا يكتب النموذج حرفًا يُعرض عليك.</li>
<li>تمتنع مشكاة عند غياب المرجع الكافي، وفي أسئلة الفتوى والحالات الشخصية وتعبير الرؤى، وتحيل إلى أهل العلم.</li></ul>
<h3>المصادر</h3><ul>${SRC_LIST.ar}</ul>
<h3>حدود معلنة</h3>
<ul><li>البحث الموضوعي قد يفوته موضع عُبِّر عنه بغير ألفاظه؛ لذلك نقول «مواضع ذات صلة» لا «كل المواضع».</li>
<li>ترتيب النزول ترتيب اجتهادي مشهور، يُعرض للاستكشاف البصري فقط.</li>
<li>لا تُحفظ أسئلتك؛ ويُرسل نص السؤال وحده إلى نموذج الترتيب، دون أي بيانات شخصية.</li></ul>`,
  en: `<h2>Mishkat — The Quran Galaxy Guide</h2>
<p class="ayah" style="text-align:center">﴿{{V24_35}}﴾ <small>[24:35]</small></p><p>“Mishkāt” is the word used in verse 24:35 for the niche that holds the lamp. A niche gathers the lamp’s light — likewise Mishkat gathers, around your question, the light of vetted tafsir, inside a galaxy of 77,433 stars: the words of the Quran.</p>
<h3>Golden rule: no religious content is written by the machine</h3>
<ul><li>Verse text is rendered only from the Tanzil text, unmodified and SHA-256-checked.</li>
<li>The explanatory paragraph is made of verbatim sentences from Al-Muyassar or Al-Mukhtasar, each labelled with its verse and source.</li>
<li>The AI understands the question and proposes search keywords, then picks verses and sentences from closed numbered lists; a verifier drops anything else. The model never writes a word you read.</li>
<li>Mishkat abstains when evidence is insufficient, and for rulings, personal cases and dream interpretation, referring you to scholars.</li></ul>
<h3>Sources</h3><ul>${SRC_LIST.en}</ul>
<h3>Stated limits</h3>
<ul><li>Topic search may miss a passage expressed with other words: results are “related locations”, not “all locations”.</li>
<li>Revelation order is a well-known scholarly ordering, shown for visual exploration only.</li>
<li>Your questions are not stored; only the query text is sent to the ranking model, with no personal data.</li></ul>`,
  fr: `<h2>Mishkat — Le guide de la galaxie du Coran</h2>
<p class="ayah" style="text-align:center">﴿{{V24_35}}﴾ <small>[24:35]</small></p><p>« Mishkāt » est le mot du verset 24:35 qui désigne la niche où se trouve la lampe. La niche rassemble la lumière de la lampe : de même, Mishkat rassemble autour de votre question la lumière des tafsirs vérifiés, dans une galaxie de 77 433 étoiles — les mots du Coran.</p>
<h3>Règle d’or : aucun contenu religieux n’est rédigé par la machine</h3>
<ul><li>Le texte des versets provient uniquement du texte Tanzil, sans modification, avec empreinte SHA-256.</li>
<li>Le paragraphe explicatif est composé de phrases citées mot pour mot d’Al-Muyassar ou d’Al-Mukhtasar, chacune avec son verset et sa source.</li>
<li>L’IA comprend la question et propose des mots de recherche, puis choisit versets et phrases dans des listes fermées numérotées ; un vérificateur rejette le reste. Le modèle n’écrit aucun mot que vous lisez.</li>
<li>Mishkat s’abstient faute de preuve suffisante, et pour les avis juridiques, cas personnels ou rêves, en renvoyant vers les savants.</li></ul>
<h3>Sources</h3><ul>${SRC_LIST.fr}</ul>
<h3>Limites déclarées</h3>
<ul><li>La recherche thématique peut manquer un passage formulé autrement : on parle d’« emplacements liés », pas de « tous les emplacements ».</li>
<li>L’ordre de révélation est un ordre savant répandu, montré pour l’exploration visuelle seulement.</li>
<li>Vos questions ne sont pas conservées ; seul le texte de la requête est envoyé au modèle de classement, sans donnée personnelle.</li></ul>`,
};
