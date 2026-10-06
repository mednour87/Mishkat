# Arabic presentation «المشكلة والحل وآلية العمل» (PDF, 16:9) for the challenge portal (PDF/PPT/PPTX ≤ 10 MB).
# Built as HTML slides (the site's fonts, real screenshots) and printed by headless Chrome. Every figure is read
# from a results file of the repository; every ﴿…﴾ fragment is checked against the Tanzil text.
#   python tools/make_deck_ar.py
import io, os, re, sys, json, base64, subprocess
from PIL import Image
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LIV = os.path.join(os.path.dirname(ROOT), '04_LIVRABLES')
CAPS = os.path.join(LIV, 'captures')
OUT = os.path.join(LIV, 'presentation_ar')
os.makedirs(OUT, exist_ok=True)
CHROME = os.environ.get('CHROME', r'C:\Program Files\Google\Chrome\Application\chrome.exe')
FONTS = 'file:///' + os.path.join(ROOT, 'public', 'fonts').replace('\\', '/') + '/'
J = lambda *p: json.load(open(os.path.join(ROOT, *p), encoding='utf-8'))

# ------------------------------------------------------------------ figures (from the results files)
auto = J('eval', 'human', 'auto_metrics.json')
qv = auto['chatbot_quotes_by_verdict']
quotes, exact, notfound, altered = auto['reading']['quotes'], qv['exact'], qv['notfound'], qv['near'] + qv['merged']
qq = J('eval', 'qqa23', 'ci_free3.json'); qm, pb = qq['mean_of_runs'], qq['published_best']
mp = J('eval', 'map1000', 'map.json')['summary']['expectations']
over = len(J('eval', 'overrefusal.json')['questions'])
world = J('eval', 'world', 'check_world_2026-10-06.json')
rag = io.open(os.path.join(ROOT, 'eval', 'rag1000', 'README.md'), encoding='utf-8').read()
first_direct = re.search(r'First verse answers directly \(judge\) \| [^|]+\| ([\d.]+) % \[([\d.]+)–([\d.]+)\]', rag).groups()
not_verbatim = re.search(r'not found word for word in their source \| [^|]+\| (0 / [\d,]+)', rag).group(1)
critical = re.search(r'Critical cases[^|]*\| (\d+) \| (\d+)', rag).groups()
t = subprocess.run('npm test', cwd=ROOT, shell=True, capture_output=True, text=True, encoding='utf-8', timeout=900).stdout
n_tests, n_fail = int(re.search(r'# pass (\d+)', t).group(1)), int(re.search(r'# fail (\d+)', t).group(1))
assert n_fail == 0, 'the test suite must be green before building the deck'
n_window = int(subprocess.run('git rev-list --count --since=2026-10-04T06:00:00Z HEAD', cwd=ROOT, shell=True, capture_output=True, text=True).stdout.strip() or 0)

AR = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
def n(x): return str(x).translate(AR).replace(',', '٬')
def pct(a, b): return n(round(100 * a / b)) + '٪'

core = json.load(open(os.path.join(ROOT, 'public', 'data', 'core.json'), encoding='utf-8'))
ALLV = '\n'.join(core['verses'])
v2435 = core['verses'][core['suras'][23]['first'] + 34]
MISHKAT = ' '.join(v2435.split(' ')[4:9])          # مَثَلُ نُورِهِۦ كَمِشْكَوٰةٍ فِيهَا مِصْبَاحٌ
NUR = ' '.join(v2435.split(' ')[32:40])             # نُّورٌ عَلَىٰ نُورٍ يَهْدِى ٱللَّهُ لِنُورِهِۦ مَن يَشَآءُ
print('fragments:', MISHKAT, '|', NUR)

def img(name, w=1400, q=80):
    p = os.path.join(CAPS, name) if not os.path.isabs(name) else name
    im = Image.open(p).convert('RGB')
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=q, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
logo = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(ROOT, 'docs', 'logo.png'), 'rb').read()).decode()

S = []
def slide(title, kicker, body, cls=''):
    S.append(f'<section class="s {cls}"><header><span class="k">{kicker}</span><h2>{title}</h2></header><div class="b">{body}</div>'
             f'<footer><span>مِشكاة · Mishkat</span><span>{n(len(S) + 1)}</span></footer></section>')
stat = lambda big, lab, c='': f'<div class="st {c}"><b>{big}</b><span>{lab}</span></div>'

# 1 — cover
S.append(f'''<section class="s cover"><img class="logo" src="{logo}" alt="">
<h1>مِشكاة</h1><p class="sub">دليل مجرّة القرآن الذكي</p>
<p class="tag">بحث قرآني معزَّز بالذكاء الاصطناعي… لا يكتب الذكاءُ الاصطناعي فيه حرفًا دينيًّا</p>
<p class="q">﴿…{MISHKAT}…﴾ <small>[النور: ٣٥]</small></p>
<p class="meta">المشكلة · الحل · آلية العمل<br>تحدّي الذكاء الاصطناعي في خدمة المحتوى الإسلامي ٢٠٢٦ — المسار ٠١: الحوار المعرفي والإجابات الموثوقة<br>
محمد نور بو علي · <span dir="ltr">mishkatquran.org</span> · العربية والإنجليزية</p></section>''')

# 2 — problem, measured
slide('روبوتات المحادثة تخترع آيات', 'المشكلة (١): مقيسة',
      f'''<p class="lead">طرحنا {n(auto["questions"])} سؤالًا على روبوت محادثة عام (النموذج المفتوح نفسه <span dir="ltr">{auto["chatbot_model"]}</span>، دون بحث)، ثم فحصنا بأداة التحقق في «مشكاة» كلَّ ما قدّمه هو نفسه على أنه قرآن بين ﴿ ﴾.</p>
<div class="stats">{stat(n(quotes), "اقتباسًا قدّمها على أنها قرآن")}{stat(pct(exact, quotes), f"صحيحة حرفيًّا ({n(exact)})", "ok")}{stat(pct(notfound, quotes), f"لا تطابق أي آية ({n(notfound)})", "bad")}{stat(n(altered), "محرَّفة أو تدمج آيتين", "warn")}</div>
<div class="box">«مشكاة»: <b>صفر اقتباس مختلَق، بحكم البناء</b> — كل آية تُقرأ من ملف Tanzil المطابق بايتًا ببايت، والذكاء الاصطناعي لا يُرجع إلا أرقامًا من قوائم مغلقة.</div>
<p class="note">عدٌّ آلي دون حكم بشري، تشغيل واحد، ٣ أكتوبر ٢٠٢٦ (<span dir="ltr">eval/human/auto_metrics.json</span>).</p>''')

# 3 — problem: why it matters
slide('الحاجة حقيقية، والأدوات الموثوقة بعيدة', 'المشكلة (٢)',
      '''<div class="cols3">
<div class="card"><h3>من يسأل؟</h3><p>من يكتب «ماذا يقول القرآن عن الحزن؟» أو «how to deal with anxiety» يلجأ اليوم إلى روبوت محادثة يجيب بثقة… وقد يخترع الآية.</p></div>
<div class="card"><h3>الأدوات الموثوقة صعبة</h3><p>المعاجم المفهرسة ومكتبات التفسير ممتازة، لكنها تتطلّب الكلمة الدقيقة، والعربية، والصبر على التنقّل بين الكتب.</p></div>
<div class="card"><h3>الأسئلة الحساسة</h3><p>الأحكام، ومن هو في ضيق شديد، والجدل، والأسئلة المفخّخة: تحتاج حذرًا وإحالةً لا يملكهما روبوت عام.</p></div></div>
<div class="box big">السؤال: كيف ننتفع بفهم النماذج اللغوية للسؤال، <b>دون</b> أن نترك لها كتابة كلمة واحدة في الدين؟</div>''')

# 4 — the solution
slide('شريط بحث واحد فوق مجرّة القرآن', 'الحل',
      f'''<div class="split"><img class="shot" src="{img('03_reponse_courte_ar.jpg')}" alt="">
<ul class="pts"><li>تكتب أو تقول <b>فكرةً أو سؤالًا أو سورةً أو آية</b>، بالعربية أو الإنجليزية.</li>
<li>① <b>«الجواب باختصار»</b>: جمل منقولة بحروفها من الآية والتفسير المعتمد والأحاديث المحكوم عليها، لكلٍّ مرجعها.</li>
<li>② <b>الآيات الرئيسة</b> بتفسيرها كاملًا، ثم <b>السور مرتّبة حسب الصلة</b>.</li>
<li>③ <b>قارئ</b> آيةً آية بتلاوة الشيخ العفاسي متزامنة كلمةً كلمة.</li>
<li>④ الكاميرا تطير في <b>{n("77,433")} نجمة هي كلمات القرآن</b> إلى آيات الجواب.</li>
<li>⑤ للأحكام والضيق الشديد والأسئلة المفخّخة <b>مسارات ثابتة آمنة</b>.</li></ul></div>''')

# 5 — golden rule
slide('القاعدة الذهبية: الآلة لا تكتب نصًّا دينيًّا', 'الحل: الضمان',
      '''<table><tr><th>المحتوى</th><th>مصدره</th><th>الضمان</th></tr>
<tr><td>نص القرآن</td><td>ملف Tanzil مطابق بايتًا ببايت (بصمة SHA-256 في الاختبارات)</td><td>النموذج لا يكتب آية، ولا يقرأ القرآنَ صوتٌ آليّ</td></tr>
<tr><td>التفسير، الحديث، الذكر</td><td>الميسّر والمختصر (QuranEnc)، HadeethEnc، حصن المسلم بعد التحقق في الدرر</td><td>منقول بحروفه مع المصدر والدرجة والرابط</td></tr>
<tr><td>الأحكام</td><td>الموسوعة الفقهية — الدرر السنية (في المرجعية العلمية للتحدّي)</td><td>نصّها بحروفه؛ «مشكاة» لا تُفتي</td></tr>
<tr><td>قصص الأنبياء</td><td>«علوم السور» في الجمهرة + فهرس موضوعات Quranpedia</td><td>ملخّص منقول ونطاقات الآيات</td></tr>
<tr><td>نصوص الواجهة</td><td>قوالب مكتوبة باليد</td><td>لا نصّ حرّ</td></tr>
<tr><td>غير ذلك</td><td>—</td><td>امتناع وإحالة</td></tr></table>
<div class="box">للذكاء الاصطناعي مهام ضيقة، ولا يُرجع إلا <b>أرقامًا</b>: فهم النية وكلمات البحث ← أرقام آيات من قائمة مغلقة ← أرقام جمل للجواب ← حَكَم مستقلّ يُبقي ما يجيب. وكل رقم خارج القائمة يُحذف في الخادم ثم في المتصفح.</div>''')

# 6 — how it works: 7 stages
steps = [('خريطة السؤال', 'ضيق شديد · طفل · خارج الموضوع · التاريخ والساعة · طلب أداة', 'لا'),
         ('الحراسة والتوجيه', 'مرجع «2:255» · التحقق من اقتباس · حقن الأوامر · فتوى شخصية · موضوع حساس', 'لا'),
         ('الفهم', 'النية + كلمات البحث + آيات مقترحة (لا تُعرض، وكلها يُتحقَّق منها) — gpt-oss-20b', 'نعم'),
         ('استرجاع هجين', 'BM25 على الآية والتفسير والترجمة + معنى bge-m3 في المتصفح + فهرس Quranpedia ← قائمة مغلقة ≤ ٣٦ آية', 'متجه'),
         ('الاختيار', 'أرقام آيات من القائمة بدرجة (٢ = تجيب، ١ = ذات صلة) — gpt-oss-120b', 'أرقام'),
         ('الجواب باختصار', 'جمل مرقّمة ← المؤلِّف يختار الأرقام ← حَكَم مستقلّ ← قواعد ثابتة R1–R13', 'أرقام'),
         ('مصادر مكمِّلة', 'السنة (HadeethEnc) · الحكم (الموسوعة الفقهية) · الحديث المقتبس (الدرر) · الشبهات (بيّنات)', 'اختيار')]
slide('رحلة السؤال في سبع مراحل', 'آلية العمل',
      '<div class="flow">' + ''.join(f'<div class="stp"><i>{n(k + 1)}</i><b>{a}</b><span>{b}</span><em>{c}</em></div>' for k, (a, b, c) in enumerate(steps)) +
      '</div><p class="note">يعمل المحرّك في المتصفح داخل Web Workers، والخادم (Cloudflare Pages Functions) يستدعي النماذج فقط. ودون ذكاء اصطناعي يجيب المحرّك الحتمي، موثَّقًا دائمًا، مع عبارة «غير مؤكَّد بالذكاء الاصطناعي».</p>')

# 7 — the pipeline plate
slide('خط المعالجة كاملًا: RAG استخراجي مقيَّد بالأدلة', 'آلية العمل: اللوحة',
      f'<img class="plate" src="{img(os.path.join(ROOT, "docs", "pipeline_rag.png"), 2000, 82)}" alt=""><p class="note">الوصف الكامل: <span dir="ltr">docs/RAG_ENGINE.md</span> — كل صندوق يسمّي الملف الذي يقوم بالعمل.</p>')

# 8 — sensitive questions
slide('الأسئلة الحساسة: مسارات ثابتة مراجَعة', 'آلية العمل: الموثوقية',
      f'''<div class="two"><figure><img class="shot" src="{img('04_hukm_mawsua_ar.jpg')}" alt=""><figcaption>سؤال حكم ← شريط «سؤال حساس»، ونصّ الموسوعة الفقهية بحروفه مع رابطه، وإحالة إلى alifta.gov.sa</figcaption></figure>
<figure><img class="shot" src="{img('05_citation_deformee_ar.jpg')}" alt=""><figcaption>اقتباس محرَّف ← تُبرَز الكلمة التي ليست في المصحف، وتُعرض الآية الصحيحة</figcaption></figure></div>
<p class="pts1">من هو في ضيق شديد: رسالة دعم ثابتة و<span dir="ltr">findahelpline.com</span> أوّلًا، ثم آيات الرجاء بتفسيرها، ولا آية عذاب · حقن الأوامر و«اكتب لي حديثًا»: جواب ثابت دون أي نداء للذكاء الاصطناعي · وضع الطفل: لا فتوى.</p>''')

# 9 — reader and galaxy
slide('القارئ والمجرّة: القرآن نفسه في ثلاثة أبعاد', 'الحل: التجربة',
      f'''<div class="split"><img class="shot" src="{img('12_rose_accueil_ar.jpg')}" alt="">
<ul class="pts"><li><b>{n("77,433")} نقطة = {n("77,433")} كلمة</b>؛ ٦ أشكال × ٧ ترتيبات، و<b>«وردة السور»</b> هي الشكل عند فتح الموقع.</li>
<li>كل شكل <b>خيط قراءة واحد</b>: تتبع الكاميرا الكلمة المتلوّة دون ذهاب وإياب.</li>
<li><b>٨ تفاسير</b>: الميسّر، المختصر، السعدي، الطبري، ابن كثير، البغوي، القرطبي، وابن كثير المختصر بالإنجليزية.</li>
<li>الختمة «اختر لي»، والتكرار للحفظ مع اختبار، والأذكار المحقَّقة، والتسبيح، وألوان التجويد.</li>
<li>تطبيق يُثبَّت على الهاتف والحاسوب، دون حساب ودون تتبّع.</li></ul></div>''')

# 10 — worldwide tools
places = world['places']
slide('أدوات يومية صالحة في كل مكان من العالم', 'الحل: الأدوات',
      f'''<div class="split rev"><img class="shot phone" src="{img('13_qibla_auckland_ar.jpg', 700)}" alt="">
<ul class="pts"><li><b>القبلة</b>: الدائرة العظمى إلى الكعبة؛ قورنت بواجهة القبلة في Aladhan في <b>{n(len(places))} مكانًا في كل القارات: الفرق {n(f"{world['worstQiblaDiff']:.3f}")}°</b>.</li>
<li><b>البوصلة</b> تُصحَّح بالانحراف المغناطيسي للمكان من <b>النموذج المغناطيسي العالمي WMM2025</b> (NOAA وBGS)، مُتحقَّقًا منه على ١٠٠ قيمة اختبار رسمية — يبلغ الفرق ٢٠° في نيوزيلندا (الصورة: أوكلاند).</li>
<li><b>مواقيت الصلاة</b> (Aladhan) بمنطقة المكان الزمنية وشهره، وطريقة الحساب مذكورة، وقاعدة العروض العالية مشروحة — من سفالبارد إلى كيريتيماتي (UTC+14).</li>
<li><b>المساجد القريبة</b> (OpenStreetMap + خريطة Google)، <b>التقويم الهجري</b> (أم القرى)، والساعة من الجهاز.</li></ul></div>''')

# 11 — measured
slide('النتائج المقيسة', 'آلية العمل: القياس',
      f'''<div class="stats">{stat(n(first_direct[0]) + '٪', f"الآية الأولى تجيب مباشرة — ١٬٠٠٠ سؤال، مجال ٩٥٪: {n(first_direct[1])}–{n(first_direct[2])}")}
{stat(n(not_verbatim.replace(' / ', ' من ')), "مقطع غير مطابق حرفيًّا لمصدره", "ok")}
{stat(n(critical[0]) + ' ← ' + n(critical[1]), "حالات حرجة قبل التصحيحات وبعدها", "warn")}
{stat(n(f"{mp['met']}/{mp['checked']}"), "توقّعًا متحقّقًا على خريطة ١٬٠٠٠ سؤال دون ذكاء اصطناعي")}</div>
<div class="stats">{stat(n(f"{qm['mrr10']:.3f}"), f"MRR@10 على معيار Qur'an QA 2023 (مجال ٩٥٪: {n(qm['mrr10_ci'][0])}–{n(qm['mrr10_ci'][1])})")}
{stat(n(f"{qm['map10']:.3f}"), f"MAP@10 (مجال ٩٥٪: {n(qm['map10_ci'][0])}–{n(qm['map10_ci'][1])})")}
{stat(n(f"{over}/{over}"), "سؤالًا مشروعًا يشبه الحساس لم يُرفض", "ok")}
{stat(n(n_tests), "اختبارًا آليًّا ناجحًا", "ok")}</div>
<p class="note">أفضل نظام منشور ({n(f"{pb['mrr10']:.3f}")} / {n(f"{pb['map10']:.3f}")}) يقع داخل مجالاتنا: <b>مُكافئ، لا أفضل</b>. الحَكَم في اختبار الألف سؤال نموذج مستقلّ من عائلة أخرى (DeepSeek-V3.2)؛ والتقييم البشري معدّ ولم يُنفَّذ بعد. وبعد الإطلاق: «هل أفادك هذا الجواب؟» و«أبلغ عن خطأ» تحت كل جواب، بتقرير بفواصل ويلسون.</p>''')

# 12 — cost and scale
slide('الكلفة والتوسّع', 'آلية العمل: الواقعية التشغيلية',
      '''<div class="two"><div class="card"><h3>اليوم: نحو ٠ دولار شهريًّا</h3><ul class="pts"><li>Cloudflare Pages: الخطة المجانية</li><li>Groq: الشريحة المجانية أوّلًا</li><li>OpenRouter احتياطًا: نحو ٠٫٠٠١٤ دولار للسؤال (مقيسة)، بسقف يومي</li><li>bge-m3 على Workers AI: ضمن الحصة المجانية</li><li>+ رسم النطاق السنوي</li></ul></div>
<div class="card"><h3>للأمة: ما نرفعه</h3><table class="sm"><tr><th>أسئلة/يوم</th><th>سقف الكلفة الشهرية</th></tr><tr><td>١٬٠٠٠</td><td>≈ ٤٧ دولارًا</td></tr><tr><td>١٠٬٠٠٠</td><td>≈ ٤٢٥ دولارًا</td></tr><tr><td>١٠٠٬٠٠٠</td><td>تخزين مؤقت مشترك + عقد</td></tr></table>
<p>Workers Paid، حدّ طلبات وسقف عامّان في KV، تخزين مؤقت مشترك للأجوبة، خوادم خاصة لـ Overpass/Nominatim، هيئة علمية للمراجعة.</p></div></div>
<p class="note">سقوف محسوبة إذا مرّ كل سؤال بالاحتياط المدفوع؛ الأسئلة الشائعة محسوبة مسبقًا. الأسعار من صفحات Cloudflare وOpenRouter الرسمية (٦ أكتوبر ٢٠٢٦).</p>''')

# 13 — security, rules
slide('الأمان والخصوصية والمواءمة مع الشروط', 'الشفافية',
      f'''<div class="two"><div class="card"><h3>الأمان والخصوصية</h3><ul class="pts"><li>سياسة أمان محتوى صارمة، لا سكربت خارجي، HSTS</li><li>طلبات من الأصل نفسه فقط، حدّ لكل IP، حجم أقصى</li><li>الحقن وخارج الموضوع يرفضهما الخادم قبل أي نموذج</li><li>المفاتيح أسرار، واختبار يمنع تسرّبها</li><li>لا حساب، لا إعلان، لا تتبّع؛ الأسئلة لا تُحفظ إلا تقييمًا يرسله الزائر بنفسه، بلا معرّف</li></ul></div>
<div class="card"><h3>شروط التحدّي</h3><ul class="pts"><li>العمل السابق مُصرَّح به (<span dir="ltr">BASELINE.md</span>)، و{n(n_window)} إيداعًا مؤرَّخًا في النافذة</li><li>مصادر المرجعية العلمية: الدرر (الفقه)، الجمهرة (القصص)</li><li>سجلّ المصادر والتراخيص والأدوات (البند ٩/١٥)</li><li>«جميع الحقوق محفوظة» وفق البند ١٣/٧</li><li>بيانات اصطناعية أو عامة فقط</li></ul></div></div>''')

# 14 — closing
S.append(f'''<section class="s cover end"><img class="logo" src="{logo}" alt="">
<h1>هدية للأمة</h1>
<p class="tag">«مشكاة» مجانية للمسلمين جميعًا، وتبقى كذلك: بلا إعلانات، وبلا حساب، وبلا تتبّع.<br>نجمع لك نور البيان، ولا نكتب عن الله ما لم يُنقل.</p>
<p class="q">﴿…{NUR}…﴾ <small>[النور: ٣٥]</small></p>
<p class="meta"><span dir="ltr">mishkatquran.org</span> · <span dir="ltr">github.com/mednour87/Mishkat</span><br>دليل التحقّق للمحكّمين: <span dir="ltr">mishkatquran.org/judges.html</span><br>يوتيوب <span dir="ltr">@mishketquran</span> · فيسبوك: صفحة «مشكاة»<br>© ٢٠٢٦ محمد نور بو علي — جميع الحقوق محفوظة</p></section>''')

for m in re.finditer(r'﴿…?([^﴾…]+)…?﴾', ''.join(S)):
    assert m.group(1).strip() in ALLV, 'not a Tanzil slice: ' + m.group(1)

CSS = f'''
@font-face {{ font-family: Plex; src: url({FONTS}IBMPlexSansArabic-400-arabic.woff2); }}
@font-face {{ font-family: Plex; font-weight: 600; src: url({FONTS}IBMPlexSansArabic-600-arabic.woff2); }}
@font-face {{ font-family: Plex; src: url({FONTS}IBMPlexSansArabic-400-latin.woff2); unicode-range: U+0000-00FF; }}
@font-face {{ font-family: Amiri; font-weight: 700; src: url({FONTS}Amiri-700-arabic.woff2); }}
@font-face {{ font-family: AmiriQuran; src: url({FONTS}AmiriQuran-400-arabic.woff2); }}
@page {{ size: 1280px 720px; margin: 0; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; font-family: Plex, sans-serif; background: #05070d; color: #eceff5; }}
.s {{ width: 1280px; height: 720px; position: relative; overflow: hidden; page-break-after: always; padding: 34px 54px 40px;
     background: radial-gradient(ellipse at 85% 0%, rgba(255,214,107,.10), transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(80,120,220,.10), transparent 50%), #070a13; }}
header {{ border-bottom: 1px solid rgba(255,214,107,.35); padding-bottom: 8px; margin-bottom: 16px; }}
.k {{ color: #e8a93c; font-size: 17px; }} h2 {{ font-family: Amiri, Plex; font-size: 40px; margin: 0; color: #ffd66b; line-height: 1.25; }}
.b {{ font-size: 21px; line-height: 1.6; }}
footer {{ position: absolute; bottom: 12px; left: 54px; right: 54px; display: flex; justify-content: space-between; color: #8b93a7; font-size: 14px; }}
.cover {{ display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding-top: 20px; }}
.cover .logo {{ width: 150px; height: 150px; border-radius: 26px; }}
.cover h1 {{ font-family: Amiri; font-size: 84px; margin: 4px 0 0; color: #ffd66b; line-height: 1.2; }}
.sub {{ font-size: 30px; margin: 0; }} .tag {{ font-size: 24px; color: #dfe4ee; max-width: 1000px; }}
.q {{ font-family: AmiriQuran, Amiri; font-size: 34px; color: #ffe39a; margin: 8px 0; }} .q small {{ font-family: Plex; font-size: 17px; color: #b6bdcc; }}
.meta {{ font-size: 17px; color: #a8b0c2; line-height: 1.7; }}
.lead {{ margin: 0 0 14px; }}
.stats {{ display: flex; gap: 14px; margin: 10px 0 14px; }}
.st {{ flex: 1; background: #10152a; border: 1px solid #252d48; border-radius: 14px; padding: 12px 14px; }}
.st b {{ display: block; font-size: 46px; color: #ffd66b; line-height: 1.15; }} .st span {{ font-size: 16px; color: #c5cbd8; line-height: 1.4; display: block; }}
.st.ok b {{ color: #5ee6a0; }} .st.bad b {{ color: #ff7a7a; }} .st.warn b {{ color: #e8a93c; }}
.box {{ background: #1c2236; border-inline-start: 5px solid #ffd66b; border-radius: 10px; padding: 12px 18px; margin: 12px 0; }}
.box.big {{ font-size: 26px; margin-top: 26px; }}
.note {{ font-size: 15px; color: #9aa3b6; margin: 8px 0 0; line-height: 1.5; }}
.cols3 {{ display: flex; gap: 16px; }} .card {{ flex: 1; background: #10152a; border: 1px solid #252d48; border-radius: 14px; padding: 14px 18px; }}
.card h3 {{ margin: 0 0 6px; color: #ffd66b; font-size: 24px; }} .card p {{ margin: 0; font-size: 19px; }}
.split {{ display: flex; gap: 26px; align-items: flex-start; }} .split .shot {{ width: 640px; }} .split.rev .shot.phone {{ width: 250px; }}
.shot {{ border-radius: 12px; border: 1px solid #2a3350; display: block; }}
.pts {{ margin: 0; padding-inline-start: 22px; font-size: 19px; }} .pts li {{ margin: 0 0 8px; }}
.pts1 {{ font-size: 17px; margin: 8px 0 0; }}
table {{ width: 100%; border-collapse: collapse; font-size: 18px; }} th, td {{ border: 1px solid #2a3350; padding: 7px 10px; text-align: start; vertical-align: top; }}
th {{ background: #3c2e0c; color: #ffd66b; }} td {{ background: #0e1324; }}
table.sm {{ font-size: 18px; margin: 4px 0 8px; }}
.flow {{ display: flex; flex-direction: column; gap: 7px; }}
.stp {{ display: grid; grid-template-columns: 44px 210px 1fr 80px; align-items: center; gap: 10px; background: #10152a; border: 1px solid #252d48; border-radius: 10px; padding: 6px 12px; font-size: 17px; }}
.stp i {{ font-style: normal; background: #ffd66b; color: #111; border-radius: 50%; width: 34px; height: 34px; display: grid; place-items: center; font-weight: 600; }}
.stp b {{ color: #ffd66b; font-size: 20px; }} .stp em {{ font-style: normal; color: #8ec5f0; font-size: 15px; text-align: center; border: 1px solid #2f4d6e; border-radius: 8px; padding: 2px 4px; }}
.plate {{ width: 100%; max-height: 545px; object-fit: contain; border-radius: 10px; background: #fff; }}
.two {{ display: flex; gap: 20px; }} .two figure {{ flex: 1; margin: 0; }} .two figure img {{ width: 100%; }}
figcaption {{ font-size: 16px; color: #c5cbd8; margin-top: 6px; }}
'''
html_doc = f'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مشكاة — العرض التقديمي</title><style>{CSS}</style></head><body>{"".join(S)}</body></html>'
h = os.path.join(OUT, 'Mishkat_Presentation_AR.html')
io.open(h, 'w', encoding='utf-8').write(html_doc)
pdf = os.path.join(OUT, 'Mishkat_Presentation_AR.pdf')
subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--allow-file-access-from-files',
                f'--print-to-pdf={pdf}', 'file:///' + h.replace('\\', '/')], check=True, capture_output=True, timeout=240)
size = os.path.getsize(pdf)
print('slides:', len(S), '·', pdf, f'{size / 1e6:.2f} MB')
assert size < 10 * 1024 * 1024, 'the portal accepts 10 MB at most'
