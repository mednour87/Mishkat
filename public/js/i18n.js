// UI strings (hand-written; no machine translation of religious content).
export const UI = {
  ar: {
    dir: 'rtl', brand: 'مِشكاة', tagline: 'دليل مجرّة القرآن الذكي',
    placeholder: 'اكتب فكرة أو سؤالًا أو سورة أو آية… مثل: الصبر، يوسف، 2:255',
    lead: 'اسأل عن أي معنى أو قصة أو آية: يأتيك البيان من التفسير المعتمد بنصّه، وتُرتَّب لك السور حسب صلتها، ثم تطير إلى الموضع في مجرّة كلمات القرآن.',
    search: 'ابحث', home: 'العودة إلى المجرّة كاملة', layoutMushaf: 'ترتيب المصحف', layoutNuzul: 'ترتيب النزول',
    legend: 'المفتاح', about: 'عن مشكاة', close: 'إغلاق', tabResults: 'النتائج', tabReader: 'القارئ',
    chips: ['الصبر', 'كيف أتعامل مع الحزن', 'بر الوالدين', 'قصة يوسف', 'آية الكرسي', 'سورة الكهف', 'إن الله مع الصابرين', 'هل هذه آية: النظافة من الإيمان', 'ما حكم الموسيقى؟'],
    loading: ['تحميل نص المصحف…', 'بناء المجرّة: 77,433 كلمة…', 'تحميل التفسير المعتمد…', 'جاهز'],
    thinking: 'أبحث في المصحف والتفاسير المعتمدة…',
    paraTitle: 'البيان من التفسير', surasTitle: 'الآيات في سورها (حسب الصلة)', surasNote: 'تظهر كل سورة هنا لأنها تحتوي آية أو أكثر من النتائج؛ الكلمات المظلَّلة هي كلمات بحثك.', moreV: (n) => `عرض ${n} آيات أخرى`, versesTitle: 'المواضع',
    paraBy: { llm: 'تفسير كامل لكل آية، اختار الذكاء الاصطناعي الآيات من قائمة مغلقة', context: 'آيات سياق مختارة ومراجَعة', index: 'الآيات من الفهرس الموضوعي للموسوعة القرآنية، والبيان من التفسير المعتمد', none: '' },
    matched: (n) => n === 1 ? 'آية واحدة ذات صلة' : n === 2 ? 'آيتان ذواتا صلة' : `${n} آيات ذات صلة`,
    meccan: 'مكية', medinan: 'مدنية', ayas: (n) => `${n} آية`,
    readSura: '📖 اقرأ السورة', listen: '▶ استمع', play: '▶', pause: '❚❚', prevA: 'السابقة', nextA: 'التالية', auto: 'متتابعة',
    ayaN: 'الآية', copy: 'نسخ', copied: 'تم النسخ', verifyExt: 'تحقّق في Quran.com', report: 'أبلغ عن خطأ',
    translation: 'ترجمة المعاني', tafsirTitle: 'التفسير',
    srcNames: { muyassar_ar: 'الميسر', mukhtasar_ar: 'المختصر', saadi_ar: 'السعدي', tabari: 'الطبري', ibnkathir: 'ابن كثير', baghawi: 'البغوي', qurtubi: 'القرطبي', mukhtasar_en: 'المختصر (إنجليزي)', ibnkathir_en: 'ابن كثير (إنجليزي)' },
    saadiGroup: 'تفسير السعدي لهذه الآية مجمل مع ما قبلها:', loadingTafsir: 'جارٍ التحميل…',
    badges: { story: 'الجمهرة + الفهرس الموضوعي + نص المصحف', hadith: 'الموسوعة الحديثية', term: 'قاموس المصطلحات', khilaf: 'مسألة اجتهادية', verse: 'نص المصحف ✓', sura: 'نص المصحف ✓', range: 'نص المصحف ✓', topic: 'اختارها الذكاء الاصطناعي من قائمة مغلقة · التفسير المعتمد ✓', topicIndex: 'فهرس موضوعي — لم يؤكده الذكاء الاصطناعي', topicContext: 'سياق موثَّق ✓', topicWord: 'مواضع اللفظ في المصحف ✓', topicLexical: 'بحث بالكلمات (دون تأكيد الذكاء الاصطناعي)',
      exact: 'مطابق لنص المصحف ✓', near: 'نص محرَّف — راجع اللفظ الصحيح', merged: 'خلط بين آيتين', notfound: 'ليس من القرآن',
      notverse: 'ليس آية', translation: 'موجود في ترجمة المعاني', unverified: 'لا يمكن التأكيد', abstain: 'امتناع وإحالة', notfoundTopic: 'امتناع: لا مرجع كافٍ', invalid_ref: 'مرجع غير موجود' },
    asTopic: (q) => `ابحث عن «${q}» كموضوع في الآيات ←`, asSura: (n) => `📖 افتح سورة ${n}`,
    asPerson: (n) => `الآيات عن «${n}» (الشخصية لا السورة) ←`,
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
    menu: 'اهتماماتي', viewLabel: 'العرض', themeLabel: 'الوضع الفاتح/الداكن',
    vG0: 'مجرّة · ترتيب المصحف', vG1: 'مجرّة · ترتيب النزول', vQm: '«قرآن» · ترتيب المصحف', vQn: '«قرآن» · ترتيب النزول', vQl: '«قرآن» · حسب طول السورة', vQp: '«قرآن» · مكي ثم مدني',
    ord_mushaf: 'ترتيب المصحف', ord_nuzul: 'ترتيب النزول', ord_length: 'من أطول سورة إلى أقصرها', ord_place: 'السور المكية ثم المدنية',
    viewNote: (o) => `كلمة «قرآن» مكوَّنة من كلمات القرآن كلها: لكل سورة جزءٌ من الحروف بقدر عدد كلماتها، تلتفّ كلماتها حلزونيًّا داخل الحرف، وبين كل سورتين فاصل صغير. يسير الترتيب من اليمين إلى اليسار: ${o}. (اضغط V للتبديل)`,
    restartA: 'من بداية الآية', playAya: (a) => `استمع إلى الآية ${a}`,
    wTitle: 'أهلًا بك في مِشكاة', wLead: 'تفسيرٌ موثَّق، وتلاوةٌ متزامنة، وبحثٌ يجيبك من القرآن نفسه. اختر ما يهمّك لنهيّئ لك صفحة البداية — يمكنك تغيير اختيارك متى شئت.', wSkip: 'تخطَّ الآن', wGo: 'ابدأ', wQ: 'ما الذي يهمّك؟ (يمكنك اختيار أكثر من أمر)', gateCopy: 'انسخ البسملة', gateFoot: 'نص المصحف من Tanzil · التفسير من مصادر موثّقة · بلا إعلانات ولا تتبّع',
    vTitle: 'تكلّم الآن…', vHint: 'اطرح سؤالك بوضوح؛ يتوقف التسجيل تلقائيًا عندما تسكت.', vProc: 'جارٍ تحويل كلامك إلى نص…', vHeard: 'هذا ما سمعته — يمكنك تعديله قبل البحث:', vSearch: 'ابحث', vRetry: 'أعد التسجيل', vStop: 'انتهيت', vCancel: 'إلغاء', vLang: 'لغة الكلام', vNoSpeech: 'لم أسمع كلامًا. اقترب من الميكروفون وأعد المحاولة.', vDenied: 'لم يُسمح بالوصول إلى الميكروفون؛ فعّله من إعدادات المتصفح ثم أعد المحاولة.', vFail: 'تعذّر تحويل الصوت إلى نص الآن؛ أعد المحاولة أو اكتب سؤالك.',
    levels: { A: ['أ', 'المستوى (أ): معلومة أصلية مستقرة، مع مصدرها'], B: ['ب', 'المستوى (ب): شرح من المادة المعتمدة، مع إظهار المرجع'], C: ['ج', 'المستوى (ج): مسألة خلافية أو عالية الحساسية — إجابة مقيدة بالمعتمد أو إحالة'], D: ['د', 'المستوى (د): فتوى أو حالة شخصية — لا حكم مستقل، وإحالة إلى جهة مؤهلة'] },
    termTitle: 'قاموس المصطلحات', termEn: 'المقابل الإنجليزي المعتمد', termTr: 'نطقه', termRule: 'التعريف وضابط الاستخدام', termSrc: 'المصدر', termMore: 'المزيد في موسوعة الجمهرة',
    ragLoading: 'أُعِدّ الجواب باختصار من نصوص التفسير والسنة المعروضة…', ragNone: 'لم أجد في التفاسير والأحاديث المعروضة جملةً تجيب عن سؤالك مباشرةً؛ اقرأ الآيات أدناه مع تفسيرها كاملًا.',
    ragUnavailable: 'تعذّر إعداد الجواب باختصار الآن؛ الآيات وتفسيرها كاملًا أدناه.', ragGap: (cs) => `لم أجد في المصادر المعروضة ما يجيب مباشرةً عن: ${cs.map(c => '«' + c + '»').join('، ')}.`, ragGapPart: 'لم أجد في المصادر المعروضة ما يجيب عن جزء من سؤالك.',
    ragNoFatwa: 'لم أجد فتوى منشورة في المسألة نفسها؛ راجع نتائج البحث في الفتاوى أدناه أو اسأل أهل العلم.', ragFatwaTitle: 'من الفتاوى المنشورة في المسألة',
    ragFatwaNote: 'نصّ فتوى منشورة لسماحة الشيخ عبد العزيز بن باز رحمه الله في مسألة مماثلة، منقول بحروفه مع رابطه. «مشكاة» لا تُفتي، وهذه ليست فتوى لحالتك الخاصة؛ اقرأ الفتوى كاملة، وللحالات الخاصة راجع أهل العلم.',
    crisisLink: 'دليل مجاني لخطوط المساندة النفسية في كل بلد', ragQuranSrc: 'نص المصحف (تنزيل)', ragFatwaArabicOnly: '',
    ragHadith: 'حديث', ragExpl: 'شرح الحديث', ragHadithSrc: 'موسوعة الأحاديث النبوية (HadeethEnc)',
    ragNote: (src) => `جُمَلٌ منقولة بنصّها من: ${src}. اختارها الذكاء الاصطناعي من قائمة مغلقة، ثم تحقّق نموذج ثانٍ من أن كل جملة تجيب عن السؤال — ليس فيها كلام مولَّد.`,
    briefTitle: 'الجواب باختصار', briefNote: (src) => `جُمَلٌ منقولة بنصّها من «${src}» في تفسير الآيات المبيَّنة أدناه — ليست كلامًا مولَّدًا.`,
    sunnahTitle: 'من السنة النبوية', sunnahNoteAi: 'أحاديث مختارة من «موسوعة الأحاديث النبوية» بنصّها ودرجتها؛ اختار الذكاء الاصطناعي الأقرب إلى سؤالك من قائمة مغلقة دون أن يكتب شيئًا.', sunnahNote: 'أحاديث من «موسوعة الأحاديث النبوية» تحتوي كلمات سؤالك، بنصّها ودرجتها.', sunnahGrade: 'الدرجة', sunnahExpl: 'الشرح والفوائد (من الموسوعة)', sunnahOpen: 'الحديث في الموسوعة', sunnahSrc: 'موسوعة الأحاديث النبوية المترجمة',
    fatwaTitle: 'فتاوى منشورة في المسألة — الموقع الرسمي لسماحة الشيخ ابن باز', fatwaNote: 'فتاوى عامة منشورة لسماحة الشيخ عبد العزيز بن باز رحمه الله (مفتي عام المملكة العربية السعودية ورئيس هيئة كبار العلماء واللجنة الدائمة للبحوث العلمية والإفتاء سابقًا)، تُعرض بنصّها ومصدرها. «مشكاة» لا تُفتي، وهذه ليست جوابًا عن حالتك الخاصة؛ للحالات الخاصة راجع الرئاسة العامة للبحوث العلمية والإفتاء.',
    fatwaLoading: 'جارٍ البحث في فتاوى سماحة الشيخ ابن باز…', fatwaNone: 'لم أجد فتوى منشورة تطابق سؤالك؛ ابحث مباشرة في الموقع الرسمي أو راجع الرئاسة العامة للبحوث العلمية والإفتاء.', fatwaFail: 'تعذّر الوصول إلى موقع الشيخ ابن باز الآن.',
    fatwaRead: 'اقرأ الفتوى كاملة', fatwaSite: 'في موقع الشيخ', fatwaOpen: 'كل نتائج البحث في binbaz.org.sa', fatwaQ: 'السؤال:', fatwaA: 'الجواب:', fatwaByAi: 'رتّب الذكاء الاصطناعي نتائج الموقع نفسه دون أن يكتب شيئًا',
    hadithTitle: 'الموسوعة الحديثية — الدرر السنية', hadithCheckTitle: 'هل هو حديث؟ — نتائج الموسوعة الحديثية (الدرر السنية)', hadithLoading: 'جارٍ البحث في الموسوعة الحديثية…',
    hadithNone: 'لم أعثر في الموسوعة الحديثية على رواية تطابق هذا الكلام؛ فلا يُنسب إلى النبي ﷺ دون مصدر وحكم معتمد.', hadithFail: 'تعذّر الوصول إلى الموسوعة الحديثية الآن؛ افتح البحث مباشرة من الرابط.',
    hadithRawi: 'الراوي', hadithMuh: 'المحدّث', hadithSrc: 'المصدر', hadithPage: 'الصفحة أو الرقم', hadithGrade: 'خلاصة حكم المحدّث', hadithOpen: 'افتح البحث في الدرر السنية', hadithNote: 'تُعرض الروايات وأحكام المحدّثين بنصّها من الموسوعة، دون اختيار أو ترجيح من «مشكاة».',
    tixTitle: 'الفهرس الموضوعي — الموسوعة القرآنية', tixSub: (n) => `الموضوعات الفرعية (${n})`,
    storySummary: 'ملخص القصة — موسوعة الجمهرة (علوم السور)', storyArabicOnly: '', storySrc: (s) => `سورة ${s} في موسوعة الجمهرة (islamic-content.com)`,
    storyEpisodes: (n) => `مراحل القصة بآياتها (${n})`, storyEpSrc: 'تقسيم الموضوعات منقول من موسوعة الجمهرة',
    storyNoSummary: 'لا يوجد في المراجع المعتمدة لديّ ملخّص لهذه القصة؛ هذه الآيات التي تذكره باسمه أو تتحدث عنه بحسب الفهرس الموضوعي.',
    storyNamed: 'باسمه', storyIndexed: 'إشارة إليه (الفهرس الموضوعي)',
    bayTitle: 'أسئلة مجاب عنها في «موسوعة بينات» (مركز أصول)', bayNote: 'الجواب الكامل المحرَّر يُقرأ على موقع بينات؛ اختارته «مشكاة» بمطابقة ألفاظ سؤالك.',
    aboutSura: 'عن السورة', sInfoIntro: 'نبذة عن السورة', sInfoTopics: 'موضوعاتها', sInfoPurposes: 'مقاصدها', sInfoNames: 'أسماؤها', sInfoSrc: 'الموسوعة القرآنية — Quranpedia.net',
    tafPages: 'صفحات الكتاب التي تقع فيها الآية (قد تتضمن تفسير ما يجاورها):', tafFail: 'تعذّر جلب هذا التفسير الآن (يتطلب اتصالًا بالإنترنت).', tafMore: 'أكمل القراءة في الموسوعة القرآنية', tafEmpty: 'لا يوجد نص لهذه الآية في هذا الكتاب.',
    dorarTafsir: 'موسوعة التفسير (الدرر)', vol: 'ج', pg: 'ص',
    disclosure: '«مشكاة» أداة بحث مدعومة بالذكاء الاصطناعي، تعرض النصوص من مصادرها كما هي؛ وليست عالمًا ولا مفتيًا.',
    repeat: 'تكرار', repeatTitle: 'كرّر الآية للحفظ', fullSura: 'نص السورة كاملًا', readTafsir: 'استمع إلى التفسير', ttsUnavailable: 'القراءة الصوتية غير متاحة في هذا المتصفح.', ttsNoVoice: 'لا يوجد صوت لهذه اللغة في متصفحك، وصوت الخادم غير متاح الآن. ثبّت صوتًا عربيًّا في إعدادات النظام (الوقت واللغة ← الكلام) أو افتح الموقع في متصفح Edge.', audioError: 'تعذّر تشغيل التلاوة؛ تحقّق من الاتصال بالإنترنت.',
    zGalaxy: 'المجرّة', zReader: 'المصحف', zAnswers: 'الإجابات', zTafsir: 'التفسير', gTools: 'أدوات المجرّة',
    zoomIn: 'تقريب', zoomOut: 'إبعاد', rotate: 'الدوران التلقائي', suraNames: 'أسماء السور على المجرّة', expandG: 'تكبير المجرّة / إرجاعها', resize: 'غيّر حجم المنطقتين (اسحب)', clearRes: 'مسح الإجابة والعودة إلى البداية',
    menuTitle: 'اختر اهتماماتك لتخصيص صفحة البداية', suraPick: 'اختر السورة', autoTitle: 'الانتقال تلقائيًا إلى الآية التالية', speed: 'السرعة',
    fontSmaller: 'تصغير الخط', fontLarger: 'تكبير الخط', translit: 'النطق', translationBtn: 'الترجمة', copyVerse: 'نسخ الآية', shareVerse: 'نسخ رابط الآية', linkCopied: 'تم نسخ رابط الآية',
    groupWithPrev: 'يفسّر هذا الكتاب الآية مع ما قبلها في موضع واحد:', tafGroup: (r) => `يفسّر هذا الكتاب الآيات ${r} معًا في موضع واحد:`,
    bookAbout: { muyassar_ar: 'التفسير الميسر — نخبة من العلماء (مجمع الملك فهد)', mukhtasar_ar: 'المختصر في تفسير القرآن الكريم — مركز تفسير', saadi_ar: 'تيسير الكريم الرحمن — عبد الرحمن السعدي (ت 1376هـ)', mukhtasar_en: 'Al-Mukhtasar in Interpreting the Noble Quran — Tafsir Center' },
    ttsLoading: 'جارٍ تجهيز الصوت…', ttsStop: 'إيقاف القراءة', ttsNote: 'قراءة آلية لنص التفسير المعروض — وليست تلاوة للقرآن.', ttsTrimmed: 'يُقرأ أول النص فقط لطوله.',
    ttsTerms: 'صوت القراءة على الخادم غير مفعَّل بعد (يلزم قبول شروط نموذج الصوت في حساب Groq). يمكنك أيضًا تثبيت صوت عربي في نظامك أو فتح الموقع في متصفح Edge.',
    ttsQuota: 'بلغت القراءة الصوتية حدّها المؤقت؛ أعد المحاولة بعد دقيقة.', ttsFail: 'تعذّرت القراءة الصوتية الآن؛ أعد المحاولة.',
    firstA: 'إلى أول السورة', playOne: 'الآية', playOneT: 'استمع إلى هذه الآية وحدها', playAll: 'متتابعة', playAllT: 'استمع بدءًا من هذه الآية ثم ما بعدها', closeReader: 'إغلاق القارئ والعودة',
    closeSuggest: 'إغلاق الاقتراحات', suggestTitle: 'اقتراحات', noAiBadge: 'بحث بالكلمات (دون تأكيد الذكاء الاصطناعي)',
    shapeLabel: 'الشكل', orderLabel: 'الترتيب', shapeKey: 'شكل العرض ثلاثي الأبعاد (مفتاح V)', orderKey: 'ترتيب السور على الشكل (مفتاح O)',
    correctedTo: (q, w) => `عرضتُ نتائج «${q}» — أقرب لفظ قرآني إلى «${w}».`, searchAsTyped: (w) => `ابحث عن «${w}» كما كُتب`,
    notQuranWord: (w) => `لم أجد «${w}» بين ألفاظ القرآن. هل تقصد:`, maybeAlso: 'قد تقصد أيضًا:', inVerses: (n) => n === 1 ? 'في آية' : `في ${n} آيات`,
    wordTitle: (w) => `«${w}» في القرآن الكريم`, keyTitle: 'الآيات الأقرب إلى سؤالك، مع تفسيرها كاملًا', moreEx: (n) => `بيان ${n} آيات أخرى`, otherVerses: 'آيات أخرى ذات صلة، سورةً سورة',
    hoverAya: (s, a) => `سورة ${s} · الآية ${a}`,
    camera: 'تحريك الكاميرا', camUp: 'إمالة إلى الأعلى', camDown: 'إمالة إلى الأسفل', camLeft: 'تدوير إلى اليسار', camRight: 'تدوير إلى اليمين',
    // hover-dwell (3 s on a word, or a long press): under the lamp, three short lines
    dwellInfo: (ref, kV, nV, kS, occ) => {
      const n = (x) => String(x).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
      const times = occ === 1 ? 'مرة واحدة' : occ === 2 ? 'مرتين' : occ % 100 >= 3 && occ % 100 <= 10 ? `${n(occ)} مرات` : `${n(occ)} مرة`;
      return `${ref}\nالكلمة ${n(kV)} من ${n(nV)} في الآية · ${n(kS)} في السورة\nترد هذه الصيغة في القرآن ${times}`;
    },
  },
  en: {
    dir: 'ltr', brand: 'Mishkat', tagline: 'The Quran Galaxy Guide',
    placeholder: 'Type an idea, a question, a surah or a verse… e.g. patience, Joseph, 2:255',
    lead: 'Ask about any meaning, story or verse: the explanation comes verbatim from vetted tafsir, surahs are ranked by relevance, and you fly to the place in the galaxy of the Quran’s words.',
    search: 'Search', home: 'Back to the whole galaxy', layoutMushaf: 'Mushaf order', layoutNuzul: 'Revelation order',
    legend: 'Legend', about: 'About', close: 'Close', tabResults: 'Results', tabReader: 'Reader',
    chips: ['patience', 'how to deal with sadness', 'kindness to parents', 'Moses and Pharaoh', 'Maryam', 'Ayat al-Kursi', 'Al-Kahf', 'Is this a verse: «النظافة من الإيمان»', 'is music haram?'],
    loading: ['Loading the Mushaf text…', 'Building the galaxy: 77,433 words…', 'Loading vetted tafsir…', 'Ready'],
    thinking: 'Searching the Mushaf and vetted tafsir…',
    paraTitle: 'Explanation from tafsir', surasTitle: 'The verses, surah by surah (by relevance)', surasNote: 'Each surah appears because it contains one or more of the verses found; highlighted words are your search words.', moreV: (n) => `Show ${n} more verse${n === 1 ? '' : 's'}`, versesTitle: 'Locations',
    paraBy: { llm: 'Full tafsir of each verse; verses chosen by AI from a closed list', context: 'Curated, reviewed context verses', index: 'Verses from the Quranic Encyclopedia’s subject index; explanation from vetted tafsir', none: '' },
    matched: (n) => `${n} related verse${n === 1 ? '' : 's'}`,
    meccan: 'Meccan', medinan: 'Medinan', ayas: (n) => `${n} verses`,
    readSura: '📖 Read surah', listen: '▶ Listen', play: '▶', pause: '❚❚', prevA: 'Prev', nextA: 'Next', auto: 'Continuous',
    ayaN: 'Verse', copy: 'Copy', copied: 'Copied', verifyExt: 'Verify on Quran.com', report: 'Report an error',
    translation: 'Translation of the meanings', tafsirTitle: 'Tafsir',
    srcNames: { mukhtasar_en: 'Al-Mukhtasar', ibnkathir_en: 'Ibn Kathir', muyassar_ar: 'Al-Muyassar (ar)', mukhtasar_ar: 'Al-Mukhtasar (ar)', saadi_ar: 'As-Sa‘di (ar)', tabari: 'At-Tabari (ar)', ibnkathir: 'Ibn Kathir (ar)', baghawi: 'Al-Baghawi (ar)', qurtubi: 'Al-Qurtubi (ar)' },
    saadiGroup: 'As-Sa‘di explains this verse together with the previous one(s):', loadingTafsir: 'Loading…',
    badges: { story: 'Al-Jamhara + subject index + Mushaf text', hadith: 'Hadith Encyclopedia', term: 'Glossary', khilaf: 'Matter of ijtihad', verse: 'Mushaf text ✓', sura: 'Mushaf text ✓', range: 'Mushaf text ✓', topic: 'Chosen by AI from a closed list · vetted tafsir ✓', topicIndex: 'Subject index — not confirmed by AI', topicContext: 'Verified context ✓', topicWord: 'Occurrences of the word in the Mushaf ✓', topicLexical: 'Keyword search (not confirmed by AI)',
      exact: 'Matches the Mushaf ✓', near: 'Misquoted — see exact wording', merged: 'Two verses merged', notfound: 'Not from the Quran',
      notverse: 'Not a verse', translation: 'Found in a translation', unverified: 'Cannot be confirmed', abstain: 'Abstained & referred', notfoundTopic: 'Abstained: no sufficient source', invalid_ref: 'Reference does not exist' },
    asTopic: (q) => `Search “${q}” as a topic in the verses →`, asSura: (n) => `📖 Open surah ${n}`,
    asPerson: (n) => `The verses about ${n} (the person, not the surah) →`,
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
    menu: 'My interests', viewLabel: 'View', themeLabel: 'Light/dark mode',
    vG0: 'Galaxy · Mushaf order', vG1: 'Galaxy · revelation order', vQm: '“Qur’an” · Mushaf order', vQn: '“Qur’an” · revelation order', vQl: '“Qur’an” · by surah length', vQp: '“Qur’an” · Meccan then Medinan',
    ord_mushaf: 'Mushaf order', ord_nuzul: 'revelation order', ord_length: 'longest to shortest surah', ord_place: 'Meccan surahs, then Medinan',
    viewNote: (o) => `The word “قرآن” is built from all the words of the Quran: each surah fills a part of the letters proportional to its number of words, its words coiling like a snail inside the letter, with a small gap between surahs. Order, right to left: ${o}. (Press V to switch)`,
    restartA: 'From the start of the verse', playAya: (a) => `Listen to verse ${a}`,
    wTitle: 'Welcome to Mishkat', wLead: 'Vetted tafsir, synchronised recitation, and answers drawn from the Quran itself. Tell us what interests you and we will prepare your home page — you can change it anytime.', wSkip: 'Skip for now', wGo: 'Start', wQ: 'What interests you? (several choices possible)', gateCopy: 'Copy the basmala', gateFoot: 'Quran text from Tanzil · tafsir from vetted sources · no ads, no tracking',
    vTitle: 'Speak now…', vHint: 'Ask your question clearly; recording stops by itself when you pause.', vProc: 'Turning your voice into text…', vHeard: 'This is what I heard — you can edit it before searching:', vSearch: 'Search', vRetry: 'Record again', vStop: 'Done', vCancel: 'Cancel', vLang: 'Spoken language', vNoSpeech: 'I heard no speech. Move closer to the microphone and try again.', vDenied: 'Microphone access was not allowed; enable it in the browser settings and try again.', vFail: 'Speech could not be transcribed right now; try again or type your question.',
    levels: { A: ['A', 'Level A: stable foundational information, with its source'], B: ['B', 'Level B: explanation from approved material, with the reference shown'], C: ['C', 'Level C: disputed or highly sensitive — answer limited to approved material, or referral'], D: ['D', 'Level D: fatwa or personal case — no independent ruling; referral to a qualified body'] },
    termTitle: 'Glossary', termEn: 'Approved English equivalent', termTr: 'Pronunciation', termRule: 'Definition and usage rule (Arabic)', termSrc: 'Source', termMore: 'More in Al-Jamhara encyclopedia',
    ragLoading: 'Preparing the short answer from the tafsir and Sunnah texts shown…', ragNone: 'None of the tafsir or hadith texts shown answers your question directly; read the verses below with their full tafsir.',
    ragUnavailable: 'The short answer cannot be prepared right now; the verses and their full tafsir are below.', ragGap: (cs) => `The sources shown do not directly answer: ${cs.map(c => '“' + c + '”').join(', ')}.`, ragGapPart: 'The sources shown do not answer part of your question.',
    ragNoFatwa: 'No published fatwa on this very matter was found; see the fatwa search results below or ask a scholar.', ragFatwaTitle: 'From the published fatwas on this matter',
    ragFatwaNote: 'Text of a fatwa published by Sheikh Abd al-Aziz ibn Baz on a similar matter, quoted word for word with its link. Mishkat does not issue fatwas and this is not a ruling on your own case; read the whole fatwa, and ask a scholar for personal cases.',
    crisisLink: 'free directory of emotional-support lines in every country', ragQuranSrc: 'Text of the Mushaf (Tanzil)', ragFatwaArabicOnly: 'The fatwa is published in Arabic only: it is shown in its original words; Mishkat does not translate rulings.',
    ragHadith: 'hadith', ragExpl: 'explanation of the hadith', ragHadithSrc: 'Encyclopedia of Translated Prophetic Hadiths (HadeethEnc)',
    ragNote: (src) => `Sentences copied word for word from: ${src}. Chosen by AI from a closed list, then a second model checked that each one answers the question — nothing is generated.`,
    briefTitle: 'In short', briefNote: (src) => `Sentences copied word for word from “${src}” on the verses shown below — nothing is generated.`,
    sunnahTitle: 'From the Sunnah', sunnahNoteAi: 'Hadiths from the Encyclopedia of Translated Prophetic Hadiths, verbatim with their grade; the AI only picked the closest ones from a closed list, writing nothing.', sunnahNote: 'Hadiths from the Encyclopedia of Translated Prophetic Hadiths containing the words of your question, verbatim with their grade.', sunnahGrade: 'Grade', sunnahExpl: 'Explanation and lessons (from the encyclopedia)', sunnahOpen: 'This hadith on HadeethEnc', sunnahSrc: 'Encyclopedia of Translated Prophetic Hadiths',
    fatwaTitle: 'Published fatwas on this question — official site of Sheikh Ibn Baz (Arabic)', fatwaNote: 'General fatwas published by Sheikh Abd al-Aziz ibn Baz (former Grand Mufti of Saudi Arabia, head of the Council of Senior Scholars and of the Permanent Committee for Scholarly Research and Ifta), shown verbatim with their source. Mishkat does not issue fatwas, and these are not an answer to your own case; for a personal case, ask the General Presidency of Scholarly Research and Ifta.',
    fatwaLoading: 'Searching the fatwas of Sheikh Ibn Baz…', fatwaNone: 'No published fatwa matching your question was found; search the official site directly or ask the General Presidency of Scholarly Research and Ifta.', fatwaFail: 'The site of Sheikh Ibn Baz cannot be reached right now.',
    fatwaRead: 'Read the full fatwa', fatwaSite: 'On the Sheikh’s site', fatwaOpen: 'All search results on binbaz.org.sa', fatwaQ: 'Question:', fatwaA: 'Answer:', fatwaByAi: 'the AI only ordered the site’s own results, writing nothing',
    hadithTitle: 'Hadith Encyclopedia — Dorar.net', hadithCheckTitle: 'Is it a hadith? — Hadith Encyclopedia (Dorar.net)', hadithLoading: 'Searching the Hadith Encyclopedia…',
    hadithNone: 'No narration matching these words was found in the Hadith Encyclopedia; nothing should be attributed to the Prophet ﷺ without a source and an authoritative grading.', hadithFail: 'The Hadith Encyclopedia cannot be reached right now; open the search directly with the link.',
    hadithRawi: 'Narrator', hadithMuh: 'Muhaddith', hadithSrc: 'Source', hadithPage: 'Page / number', hadithGrade: 'Verdict of the muhaddith', hadithOpen: 'Open the search on Dorar.net', hadithNote: 'Narrations and verdicts are shown as published by the encyclopedia (Arabic), with no selection or weighting by Mishkat.',
    tixTitle: 'Subject index — Quranic Encyclopedia (Quranpedia)', tixSub: (n) => `Sub-topics (${n})`,
    storySummary: 'Summary of the story — Al-Jamhara encyclopedia (sciences of the surahs)', storyArabicOnly: 'The approved summary is published in Arabic only; it is quoted as published.', storySrc: (s) => `Surah ${s} in the Al-Jamhara encyclopedia (islamic-content.com)`,
    storyEpisodes: (n) => `Episodes of the story with their verses (${n})`, storyEpSrc: 'division into topics quoted from Al-Jamhara',
    storyNoSummary: 'The approved references I hold have no summary of this story; here are the verses that name him or speak of him according to the subject index.',
    storyNamed: 'by name', storyIndexed: 'speaks of him (subject index)',
    bayTitle: 'Questions answered in the “Bayyinat” encyclopedia (Osoul Center, Arabic)', bayNote: 'The full reviewed answer is read on bayenat.net; Mishkat matched it on the words of your question.',
    aboutSura: 'About the surah', sInfoIntro: 'Introduction', sInfoTopics: 'Topics', sInfoPurposes: 'Purposes', sInfoNames: 'Names', sInfoSrc: 'Quranic Encyclopedia — Quranpedia.net (Arabic)',
    tafPages: 'Pages of the book where the verse occurs (may include the neighbouring verses):', tafFail: 'This tafsir cannot be fetched right now (internet connection needed).', tafMore: 'Continue reading on Quranpedia', tafEmpty: 'This book has no text for this verse.',
    dorarTafsir: 'Tafsir encyclopedia (Dorar)', vol: 'vol.', pg: 'p.',
    disclosure: 'Mishkat is an AI-assisted search tool that shows texts as published by their sources; it is not a scholar or a mufti.',
    repeat: 'Repeat', repeatTitle: 'Repeat the verse to memorise it', fullSura: 'Full text of the surah', readTafsir: 'Listen to the tafsir', ttsUnavailable: 'Speech is not available in this browser.', ttsNoVoice: 'Your browser has no voice for this language and the server voice is unavailable right now. Install a voice in your system settings (Time & language → Speech) or open the site in Microsoft Edge.', audioError: 'The recitation could not start; check your internet connection.',
    zGalaxy: 'Galaxy', zReader: 'Mushaf', zAnswers: 'Answers', zTafsir: 'Tafsir', gTools: 'Galaxy tools',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', rotate: 'Auto-rotate', suraNames: 'Surah names on the galaxy', expandG: 'Enlarge / restore the galaxy', resize: 'Resize the two zones (drag)', clearRes: 'Clear the answer and go back home',
    menuTitle: 'Choose your interests to personalise the home page', suraPick: 'Choose a surah', autoTitle: 'Go on to the next verse automatically', speed: 'Speed',
    fontSmaller: 'Smaller text', fontLarger: 'Larger text', translit: 'Transliteration', translationBtn: 'Translation', copyVerse: 'Copy the verse', shareVerse: 'Copy a link to the verse', linkCopied: 'Link to the verse copied',
    groupWithPrev: 'This book explains the verse together with the previous one(s):', tafGroup: (r) => `This book explains verses ${r} together:`,
    bookAbout: { muyassar_ar: 'At-Tafsir Al-Muyassar — a committee of scholars (King Fahd Complex)', mukhtasar_ar: 'Al-Mukhtasar fi Tafsir Al-Quran — Tafsir Center', saadi_ar: 'Taysir Al-Karim Ar-Rahman — Abd Ar-Rahman As-Sa‘di (d. 1376 AH)', mukhtasar_en: 'Al-Mukhtasar in Interpreting the Noble Quran — Tafsir Center' },
    ttsLoading: 'Preparing the voice…', ttsStop: 'Stop reading', ttsNote: 'Machine reading of the tafsir shown — not a recitation of the Quran.', ttsTrimmed: 'Only the beginning is read (long text).',
    ttsTerms: 'The server voice is not enabled yet (the voice model’s terms must be accepted in the Groq account). You can also install a voice for this language in your system, or open the site in Microsoft Edge.',
    ttsQuota: 'The reading voice reached its temporary limit; try again in a minute.', ttsFail: 'The tafsir cannot be read aloud right now; try again.',
    firstA: 'To the first verse of the surah', playOne: 'Verse', playOneT: 'Listen to this verse only', playAll: 'Continuous', playAllT: 'Listen from this verse onwards', closeReader: 'Close the reader and go back',
    closeSuggest: 'Close the suggestions', suggestTitle: 'Suggestions', noAiBadge: 'Keyword search (not confirmed by AI)',
    shapeLabel: 'Shape', orderLabel: 'Order', shapeKey: 'Shape of the 3D view (key V)', orderKey: 'Order of the surahs along the shape (key O)',
    correctedTo: (q, w) => `Showing results for “${q}”, the closest word of the Quran to “${w}”.`, searchAsTyped: (w) => `Search “${w}” as typed`,
    notQuranWord: (w) => `“${w}” is not among the words of the Quran. Did you mean:`, maybeAlso: 'You may also mean:', inVerses: (n) => `in ${n} verse${n === 1 ? '' : 's'}`,
    wordTitle: (w) => `“${w}” in the Quran`, keyTitle: 'The verses closest to your question, with their full tafsir', moreEx: (n) => `Explanation of ${n} more verse${n === 1 ? '' : 's'}`, otherVerses: 'Other related verses, surah by surah',
    hoverAya: (s, a) => `Surah ${s} · verse ${a}`,
    camera: 'Move the camera', camUp: 'Tilt up', camDown: 'Tilt down', camLeft: 'Turn left', camRight: 'Turn right',
    dwellInfo: (ref, kV, nV, kS, occ) => `${ref}\nword ${kV} of ${nV} in the verse · ${kS.toLocaleString('en')} in the surah\nthis form occurs ${occ === 1 ? 'once' : occ === 2 ? 'twice' : occ.toLocaleString('en') + ' times'} in the Quran`,
  },

};

const SRC_LIST = {
  ar: `<li>نص القرآن: <a href="https://tanzil.net" target="_blank" rel="noopener">مشروع تنزيل</a> (رواية حفص) — CC BY 3.0، دون أي تعديل.</li>
<li>التفسير: «التفسير الميسر» (مجمع الملك فهد) و«المختصر في تفسير القرآن الكريم» (مركز تفسير) عبر <a href="https://quranenc.com" target="_blank" rel="noopener">QuranEnc.com</a>؛ و«تيسير الكريم الرحمن» للسعدي عبر Quran.com.</li>
<li>ترجمة المعاني الإنجليزية: نور الدولية — QuranEnc.com؛ والنطق الحرفي كلمةً كلمة من Quran.com.</li>
<li>كتب التفسير في القارئ: الميسر، المختصر، السعدي (محفوظة في الموقع)، والطبري (الموسوعة القرآنية)، وابن كثير والبغوي والقرطبي (Quran.com) تُجلب عند الطلب.</li>
<li>القراءة الصوتية للتفسير: صوت المتصفح إن وُجد، وإلا صوت آلي من الخادم (Groq Orpheus) — قراءة آلية لنص التفسير، لا تلاوة.</li>
<li>التلاوة وتوقيت الكلمات: الشيخ مشاري العفاسي عبر Quran.com.</li>
<li>القاعدة والمجرّة: مشروع «كارتوغرافيا القرآن الكريم» (نسخة أساس مُعلنة).</li>
<li>من المرجعية العلمية للتحدي: <a href="https://quranpedia.net" target="_blank" rel="noopener">الموسوعة القرآنية</a> (الفهرس الموضوعي، معلومات السور، تفسير الطبري)، <a href="https://dorar.net/hadith" target="_blank" rel="noopener">الموسوعة الحديثية</a> و<a href="https://dorar.net/tafseer" target="_blank" rel="noopener">موسوعة التفسير</a> (الدرر السنية)، <a href="https://bayenat.net/ar" target="_blank" rel="noopener">موسوعة بينات</a> (مركز أصول) للشبهات، و<a href="https://islamic-content.com/dictionary" target="_blank" rel="noopener">الجمهرة</a> للمصطلحات.</li>`,
  en: `<li>Quran text: <a href="https://tanzil.net" target="_blank" rel="noopener">Tanzil Project</a> (Hafs) — CC BY 3.0, verbatim.</li>
<li>Tafsir: At-Tafsir Al-Muyassar (King Fahd Complex) and Al-Mukhtasar (Tafsir Center) via <a href="https://quranenc.com" target="_blank" rel="noopener">QuranEnc.com</a>; Tafsir As-Sa‘di via Quran.com.</li>
<li>English translation of the meanings: Noor International — QuranEnc.com; word-by-word transliteration from Quran.com.</li>
<li>Tafsir books in the reader: Al-Muyassar, Al-Mukhtasar, As-Sa‘di (stored on the site), At-Tabari (Quranpedia), Ibn Kathir, Al-Baghawi and Al-Qurtubi (Quran.com), fetched on demand.</li>
<li>Reading the tafsir aloud: the browser’s voice when there is one, otherwise a server voice (Groq Orpheus) — a machine reading of the tafsir text, never a recitation.</li>
<li>Recitation & word timings: Sheikh Mishary Alafasy via Quran.com.</li>
<li>Database & galaxy: the “Quran Cartography” project (declared baseline).</li>
<li>From the challenge’s scientific reference pack: <a href="https://quranpedia.net" target="_blank" rel="noopener">Quranpedia</a> (subject index, surah information, Tafsir At-Tabari), Dorar.net <a href="https://dorar.net/hadith" target="_blank" rel="noopener">Hadith</a> and <a href="https://dorar.net/tafseer" target="_blank" rel="noopener">Tafsir</a> encyclopedias, <a href="https://bayenat.net/ar" target="_blank" rel="noopener">Bayyinat</a> (Osoul Center) for objections, <a href="https://islamic-content.com/dictionary" target="_blank" rel="noopener">Al-Jamhara</a> for terminology.</li>`,

};

export const ABOUT = {
  ar: `<h2>مِشكاة — دليل مجرّة القرآن الذكي</h2>
<p class="ayah" style="text-align:center">﴿{{V24_35}}﴾ <small>[النور: 35]</small></p><p>المشكاة كُوّة يوضع فيها المصباح فتجمع نوره. وكذلك «مشكاة»: تجمع لك نور البيان من التفاسير المعتمدة حول سؤالك، في مجرّة من 77,433 نجمة هي كلمات القرآن.</p>
<h3>القاعدة الذهبية: لا محتوى ديني من إنشاء الآلة</h3>
<ul><li>نص الآيات يُعرض حصرًا من نص مشروع تنزيل، بلا أي تعديل، مع بصمة SHA-256.</li>
<li>البيان تفسيرٌ كامل لكل آية من «التفسير الميسر» أو «المختصر» بنصّه، لا مقتطفات، موسومٌ بآيته ومصدره؛ ويمكنك التنقّل بين سبعة تفاسير في القارئ.</li>
<li>الذكاء الاصطناعي يفهم السؤال ويقترح كلمات بحث، ثم يختار الآيات من قائمة مغلقة مرقّمة ويقدّر صلة كلٍّ منها (تجيب مباشرة / ذات صلة)؛ ويرفض المدقق كل ما هو خارج القائمة. ولا يكتب النموذج حرفًا يُعرض عليك.</li>
<li>الكلمة القرآنية تُبحث كما هي (مع السوابق واللواحق، وبالرسم العثماني، وبالحروف اللاتينية)، ويُقترح أقرب لفظ قرآني عند الخطأ الإملائي.</li>
<li>تمتنع مشكاة عند غياب المرجع الكافي، وفي أسئلة الفتوى والحالات الشخصية وتعبير الرؤى، وتحيل إلى أهل العلم.</li></ul>
<h3>المصادر</h3><ul>${SRC_LIST.ar}</ul>
<h3>حدود معلنة</h3>
<ul><li>البحث الموضوعي قد يفوته موضع عُبِّر عنه بغير ألفاظه؛ لذلك نقول «مواضع ذات صلة» لا «كل المواضع».</li>
<li>ترتيب النزول ترتيب اجتهادي مشهور، يُعرض للاستكشاف البصري فقط.</li>
<li>لا تُحفظ أسئلتك؛ ويُرسل نص السؤال وحده إلى نموذج الترتيب، دون أي بيانات شخصية.</li></ul>
<h3>مستويات الإجابة (حسب مرجعية التحدي)</h3><ul><li><b>أ</b>: معلومة أصلية مستقرة — إجابة مباشرة موثّقة بالمصدر.</li><li><b>ب</b>: شرح وتعريف — من المادة المعتمدة مع إظهار المرجع.</li><li><b>ج</b>: مسائل خلافية أو حساسة — إجابة مقيدة بالمعتمد، أو بيان وجود الخلاف، أو إحالة.</li><li><b>د</b>: فتوى أو حالة شخصية — لا حكم مستقل، وإحالة إلى جهة مؤهلة.</li></ul>
<h3>الشفافية والخصوصية</h3><ul><li>«مشكاة» أداة بحث مدعومة بالذكاء الاصطناعي، وليست عالمًا ولا مفتيًا.</li><li>لا حساب ولا ملفات تعريف ولا إعلانات ولا تتبّع. تُحفظ تفضيلاتك (اللغة، المظهر، الاهتمامات) في متصفحك فقط.</li><li>يُرسل نص السؤال إلى نموذج الترتيب؛ ويُرسل التسجيل الصوتي (عند استعمال الميكروفون) لتحويله إلى نص ثم لا يُحفظ؛ ويُرسل نص الحديث المسؤول عنه إلى الموسوعة الحديثية، ورقم الآية إلى الموسوعة القرآنية.</li></ul>`,
  en: `<h2>Mishkat — The Quran Galaxy Guide</h2>
<p class="ayah" style="text-align:center">﴿{{V24_35}}﴾ <small>[24:35]</small></p><p>“Mishkāt” is the word used in verse 24:35 for the niche that holds the lamp. A niche gathers the lamp’s light — likewise Mishkat gathers, around your question, the light of vetted tafsir, inside a galaxy of 77,433 stars: the words of the Quran.</p>
<h3>Golden rule: no religious content is written by the machine</h3>
<ul><li>Verse text is rendered only from the Tanzil text, unmodified and SHA-256-checked.</li>
<li>Each explanation is the complete tafsir of the verse from Al-Muyassar or Al-Mukhtasar, verbatim (never excerpts), labelled with its verse and source; seven tafsirs can be browsed in the reader.</li>
<li>The AI understands the question and proposes search keywords, then picks verses from a closed numbered list and rates each one (answers directly / related); a verifier drops anything outside the list. The model never writes a word you read.</li>
<li>A word of the Quran is found as written (with its clitics, in Uthmani script, or in Latin letters), and the closest Quranic word is suggested for a misspelling.</li>
<li>Mishkat abstains when evidence is insufficient, and for rulings, personal cases and dream interpretation, referring you to scholars.</li></ul>
<h3>Sources</h3><ul>${SRC_LIST.en}</ul>
<h3>Stated limits</h3>
<ul><li>Topic search may miss a passage expressed with other words: results are “related locations”, not “all locations”.</li>
<li>Revelation order is a well-known scholarly ordering, shown for visual exploration only.</li>
<li>Your questions are not stored; only the query text is sent to the ranking model, with no personal data.</li></ul>
<h3>Answer levels (challenge reference pack)</h3><ul><li><b>A</b>: stable foundational information — direct answer documented with its source.</li><li><b>B</b>: explanation — from approved material with the reference shown.</li><li><b>C</b>: disputed or sensitive questions — answer limited to approved material, statement that scholars differ, or referral.</li><li><b>D</b>: fatwa or personal case — no independent ruling; referral to a qualified body.</li></ul>
<h3>Transparency & privacy</h3><ul><li>Mishkat is an AI-assisted search tool, not a scholar or a mufti.</li><li>No account, no profiling, no ads, no tracking. Your preferences (language, theme, interests) stay in your browser.</li><li>The question text is sent to the ranking model; a voice recording (when you use the microphone) is sent for transcription and not kept; the text of a hadith you ask about is sent to the Hadith Encyclopedia, and a verse number to Quranpedia.</li></ul>`,

};

// Welcome screen: the features a visitor can tick (several at once).
export const WELCOME = {
  ar: {
    sura: 'السورة', aya: 'الآية', verifyPrefix: 'هل هذه آية:',
    tafsir: { title: 'تفسير آية', desc: 'اختر سورة وآية لتقرأ تفسيرها (الميسر، المختصر، السعدي).', go: 'اعرض التفسير' },
    goto: { title: 'الذهاب إلى سورة أو آية', desc: 'افتح المصحف عند الموضع الذي تريد، وتنقّل آيةً آية.', go: 'اذهب' },
    listen: { title: 'الاستماع إلى التلاوة', desc: 'تلاوة الشيخ العفاسي مع إبراز كل كلمة عند قراءتها.', go: 'استمع' },
    learn: { title: 'تعلّم: مسار قصار السور', desc: 'ابدأ بسورة قصيرة: تلاوة متتابعة مع التفسير آيةً آية.' },
    ask: { title: 'اسأل وشاهد مراجعك من القرآن', desc: 'سؤال أو فكرة → الآيات وتفسيرها، والسور مرتبة حسب الصلة.', go: 'ابحث', ph: 'مثال: الصبر، بر الوالدين، قصة يوسف…' },
    verify: { title: 'تحقّق: هل هذا النص آية؟', desc: 'الصق نصًّا منسوبًا إلى القرآن لتعرف هل هو آية، وأين هي.', go: 'تحقّق', ph: 'الصق النص هنا…' },
  },
  en: {
    sura: 'Surah', aya: 'Verse', verifyPrefix: 'Is this a verse:',
    tafsir: { title: 'Tafsir of a verse', desc: 'Pick a surah and a verse to read its explanation (Al-Mukhtasar, Al-Muyassar, As-Sa‘di).', go: 'Show tafsir' },
    goto: { title: 'Go to a surah or verse', desc: 'Open the Mushaf where you want and move verse by verse.', go: 'Go' },
    listen: { title: 'Listen to the recitation', desc: 'Sheikh Alafasy’s recitation, each word lighting up as it is recited.', go: 'Listen' },
    learn: { title: 'Learn: the short-surah path', desc: 'Start with a short surah: continuous recitation with tafsir verse by verse.' },
    ask: { title: 'Ask and see your references in the Quran', desc: 'A question or idea → the verses and their tafsir, with surahs ranked by relevance.', go: 'Search', ph: 'e.g. patience, parents, story of Joseph…' },
    verify: { title: 'Check: is this text a verse?', desc: 'Paste a text attributed to the Quran to know whether it is a verse, and where.', go: 'Check', ph: 'Paste the text here…' },
  },

};

// Interests chosen in the welcome screen → suggestions on the home page.
// Every query below was checked against the engine (ar/en) and returns relevant verses.
// Rulings ("أحكام") are VERSE searches with their tafsir, never fatwas.
export const INTEREST = {
  ar: {
    forYou: 'مقترحات لك', edit: 'تعديل الاهتمامات', personalise: '✦ خصِّص صفحتك', go: 'اذهب', show: 'اعرض', check: 'تحقّق', checkPh: 'الصق نصًّا منسوبًا إلى القرآن…',
    ahkam: { title: 'آيات الأحكام', desc: 'العبادات والمعاملات كما وردت في الآيات مع تفسيرها.', note: 'آيات وتفسيرها — وليست فتوى.', q: ['صيام رمضان', 'الحج', 'الزكاة', 'الربا', 'الخمر', 'الميراث', 'الطلاق', 'كتابة الدين', 'كفارة اليمين'] },
    stories: { title: 'قصص الأنبياء', desc: 'يوسف، موسى، نوح، أصحاب الكهف… من آيات القرآن.', q: ['قصة يوسف', 'موسى وفرعون', 'أصحاب الكهف', 'يونس', 'نوح', 'مريم'] },
    akhlaq: { title: 'القيم والأخلاق', desc: 'الصبر، البر، الصدق، العفو… وما قاله القرآن فيها.', q: ['الصبر', 'بر الوالدين', 'الصدق', 'العفو', 'الشكر', 'الجار'] },
    tafsir: { title: 'فهم آية وتفسيرها', desc: 'الميسر والمختصر والسعدي، آيةً آية.', labels: ['آية الكرسي', 'آية النور', 'خواتيم البقرة', 'الفاتحة', 'سورة العصر', 'من أسماء الله الحسنى'] },
    recite: { title: 'الاستماع إلى التلاوة', desc: 'تلاوة العفاسي مع إبراز كل كلمة.' },
    suras: { title: 'التنقّل بين السور', desc: 'افتح أي سورة وتنقّل آيةً آية.' },
    memorize: { title: 'الحفظ والتكرار', desc: 'قصار السور مع تكرار كل آية ثلاث مرات.' },
    verify: { title: 'التحقّق من النصوص', desc: 'هل هذا النص آية؟ وأين موضعه؟' },
  },
  en: {
    forYou: 'Suggested for you', edit: 'Edit interests', personalise: '✦ Personalise your page', go: 'Go', show: 'Show', check: 'Check', checkPh: 'Paste a text attributed to the Quran…',
    ahkam: { title: 'Verses of rulings', desc: 'Worship and dealings as stated in the verses, with tafsir.', note: 'Verses and their tafsir — not a fatwa.', q: ['fasting in Ramadan', 'pilgrimage', 'zakat', 'usury', 'wine and gambling', 'inheritance', 'divorce', 'writing down debts'] },
    stories: { title: 'Stories of the prophets', desc: 'Joseph, Moses, Noah, the people of the cave… from the Quran.', q: ['story of Joseph', 'Moses and Pharaoh', 'people of the cave', 'Jonah', 'Noah', 'Mary'] },
    akhlaq: { title: 'Values & character', desc: 'Patience, kindness, truthfulness, forgiveness… in the Quran.', q: ['patience', 'kindness to parents', 'truthfulness', 'forgiveness', 'gratitude', 'neighbours'] },
    tafsir: { title: 'Understand a verse', desc: 'Al-Mukhtasar, Al-Muyassar, As-Sa‘di — verse by verse.', labels: ['Ayat al-Kursi', 'The Light verse', 'End of Al-Baqarah', 'Al-Fatiha', 'Surah Al-Asr', 'Names of Allah'] },
    recite: { title: 'Listen to recitation', desc: 'Alafasy, each word lighting up as it is recited.' },
    suras: { title: 'Browse the surahs', desc: 'Open any surah and move verse by verse.' },
    memorize: { title: 'Memorise & repeat', desc: 'Short surahs, each verse repeated three times.' },
    verify: { title: 'Check a quote', desc: 'Is this text a verse? Where is it?' },
  },

};
