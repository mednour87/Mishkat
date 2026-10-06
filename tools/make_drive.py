# The folder to upload to Google Drive: everything that does not belong on GitHub (videos, archive ZIP, PDFs of the
# presentations and of the results, journal, progress log, git log, test output, screenshots) plus copies of the
# results files, sorted by theme, with an index in Arabic and in English.
#   python tools/make_drive.py   → ../04_LIVRABLES/DRIVE_Mishkat/
# Never copied: secrets (.dev.vars), the blind-rating key (eval/human/rating_key.json), third-party benchmark data
# (Qur'an QA 2023 is CC BY-NC-ND: not redistributed).
import os, io, shutil, subprocess, sys, glob, datetime
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); CH = os.path.dirname(ROOT)
LIV = os.path.join(CH, '04_LIVRABLES'); OUT = os.path.join(LIV, 'DRIVE_Mishkat')
if os.path.isdir(OUT): shutil.rmtree(OUT)
FOLDERS = {
  'pres': '01_العرض_التقديمي_Presentation', 'video': '02_الفيديو_Video', 'stats': '03_النتائج_الإحصائية_Statistical_results',
  'trace': '04_التتبع_Traceability', 'file': '05_الملف_الكامل_Project_file', 'src': '06_المصادر_والتراخيص_Sources_and_licences',
  'jury': '07_نقد_لجنة_التحكيم_Jury_critique', 'shots': '08_لقطات_الشاشة_Screenshots', 'brand': '09_الهوية_والشبكات_Brand_and_social',
}
listing = []
def cp(src, key, sub='', name=None):
    if not os.path.exists(src): print('MISSING', src); return
    d = os.path.join(OUT, FOLDERS[key], sub); os.makedirs(d, exist_ok=True)
    dst = os.path.join(d, name or os.path.basename(src))
    (shutil.copytree if os.path.isdir(src) else shutil.copy2)(src, dst)
    listing.append(os.path.relpath(dst, OUT))
R = lambda *p: os.path.join(ROOT, *p); L = lambda *p: os.path.join(LIV, *p)

# 01 presentations
cp(L('presentation_ar', 'Mishkat_Presentation_AR.pdf'), 'pres')
cp(L('Mishkat_presentation.pdf'), 'pres', name='Mishkat_Presentation_EN.pdf')
cp(L('Mishkat_presentation.pptx'), 'pres', name='Mishkat_Presentation_EN.pptx')
# 02 videos
for v in ['Mishkat_video_2min_fusha.mp4', 'Mishkat_video_2min_saudi.mp4', 'Mishkat_video_2min_fusha_light.mp4']: cp(L('video', v), 'video')
cp(L('SCRIPT_VIDEO_2min.md'), 'video')
# 03 statistical results (copies of the repository files + the bilingual summary)
for f in ['RESULTS_SUMMARY_AR.pdf', 'RESULTS_SUMMARY_EN.pdf', 'RESULTS_SUMMARY_AR.md', 'RESULTS_SUMMARY_EN.md']: cp(L('CRITIQUE_JURY', f), 'stats')
for f in glob.glob(R('eval', 'rag1000', '*')):
    if os.path.isfile(f) and not f.endswith('.mjs'): cp(f, 'stats', 'rag1000_1000_questions')
for f in ['RESULTS.md', 'ci_free3.json', 'ci_test.json', 'scores_test.json', 'bootstrap_ci.py', 'score_free3.py', 'README.md']: cp(R('eval', 'qqa23', f), 'stats', 'qqa23_public_benchmark')
cp(R('eval', 'qqa23', 'runs'), 'stats', 'qqa23_public_benchmark')
for f in glob.glob(R('eval', 'map1000', '*.md')) + glob.glob(R('eval', 'map1000', '*.json')): cp(f, 'stats', 'map1000_without_AI')
for f in ['PROTOCOL.md', 'rating_sheet.csv', 'usertest.csv', 'auto_metrics.json']: cp(R('eval', 'human', f), 'stats', 'human_evaluation_kit')
cp(R('eval', 'overrefusal.json'), 'stats', 'safety')
for f in ['SENSITIVE_REVIEW.md', 'REPORT.md']: cp(R('eval', 'results', f), 'stats', 'safety')
cp(R('eval', 'world'), 'stats', 'qibla_prayer_world_check')
cp(L('A_REMPLIR_EVALUATION_HUMAINE.md'), 'stats', 'human_evaluation_kit')
# 04 traceability
for f in ['BASELINE.md', 'CHANGELOG.md', 'ARCHIVE.md', 'LICENSE', 'NOTICE.md']: cp(R(f), 'trace')
cp(R('docs', 'TRACEABILITY.md'), 'trace')
cp(os.path.join(CH, '03_BASELINE', 'DECLARATION_BASELINE.md'), 'trace')
cp(os.path.join(CH, 'JOURNAL', 'JOURNAL.md'), 'trace', name='JOURNAL_journal_de_bord.md')
cp(os.path.join(CH, '05_EXECUTION', 'PROGRESSION.md'), 'trace', name='PROGRESSION_suivi_des_taches.md')
zips = sorted(glob.glob(L('archive', '*.zip')), key=os.path.getmtime)
if zips: cp(zips[-1], 'trace', 'archive'); cp(zips[-1] + '.sha256', 'trace', 'archive')
d = os.path.join(OUT, FOLDERS['trace']); os.makedirs(d, exist_ok=True)
io.open(os.path.join(d, 'git_log.txt'), 'w', encoding='utf-8').write(subprocess.run(['git', 'log', '--date=iso', '--pretty=format:%h %ad %s'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout)
io.open(os.path.join(d, 'git_tags.txt'), 'w', encoding='utf-8').write(subprocess.run(['git', 'tag', '-n1'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout)
t = subprocess.run('npm test', cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace', shell=True)
io.open(os.path.join(d, 'npm_test_output.txt'), 'w', encoding='utf-8').write(t.stdout[-60000:])
listing += ['04_…/git_log.txt', '04_…/git_tags.txt', '04_…/npm_test_output.txt']
# 05 project file
for f in ['Mishkat_Dossier_AR.pdf', 'Mishkat_Dossier_EN.pdf']: cp(L('dossier_complet', f), 'file')
cp(R('docs', 'RAG_ENGINE.md'), 'file'); cp(R('docs', 'pipeline_rag.png'), 'file')
for f in ['DESIGN_3D.pdf', 'DESIGN_3D_AR.pdf']: cp(L('CONCEPTION_3D', f), 'file')
cp(R('docs', 'GUIDE.md'), 'file')
# 06 sources and licences
for f in ['SOURCES.md', 'TOOLS.md', 'LICENSE', 'NOTICE.md', 'README.md', 'DEPLOY.md']: cp(R(f), 'src')
# 07 jury critique
for f in ['CRITIQUE_JURY_AR.pdf', 'CRITIQUE_JURY_EN.pdf', 'CRITIQUE_JURY_AR.md', 'CRITIQUE_JURY_EN.md']: cp(L('CRITIQUE_JURY', f), 'jury')
# 08 screenshots
for f in sorted(glob.glob(L('captures', '*.jpg'))): cp(f, 'shots')
for f in sorted(glob.glob(L('CRITIQUE_JURY', 'audit', '*.jpg'))): cp(f, 'shots', 'audit_phone_computer_2026-10-06')
# 09 brand
cp(L('logo_mishkat.png'), 'brand')
for f in sorted(glob.glob(L('reseaux_sociaux', '*'))): cp(f, 'brand')

def size(p):
    s = sum(os.path.getsize(os.path.join(a, f)) for a, _, fs in os.walk(p) for f in fs) if os.path.isdir(p) else os.path.getsize(p)
    return f'{s / 1e6:.1f} MB'
today = datetime.date.today().isoformat()
rows = '\n'.join(f'| `{FOLDERS[k]}` | {size(os.path.join(OUT, FOLDERS[k]))} |' for k in FOLDERS if os.path.isdir(os.path.join(OUT, FOLDERS[k])))
AR = f'''# مِشكاة — ملفات التحكيم (Google Drive)

هذا المجلد يجمع ما لا يُرفع إلى GitHub (الفيديو، الأرشيف، ملفات PDF، السجلات) ونسخًا من ملفات النتائج، مرتّبة حسب الموضوع. أُنشئ في {today} بالأداة `tools/make_drive.py`. المستودع: https://github.com/mednour87/Mishkat — الموقع: https://mishkatquran.org — دليل المحكّمين: https://mishkatquran.org/judges.html

| المجلد | الحجم |
|---|---|
{rows}

## ما في كل مجلد
- **01 العرض التقديمي**: المشكلة والحل وآلية العمل — بالعربية (14 شريحة) وبالإنجليزية (PDF وPPTX).
- **02 الفيديو**: الفيديو التوضيحي (أقل من دقيقتين) بالعربية الفصحى، وبنسخة باللهجة السعودية، ونسخة خفيفة 720p؛ ونصّ السيناريو.
- **03 النتائج الإحصائية**: ملخص بالعربية والإنجليزية (PDF)، ثم الملفات الأصلية: اختبار الألف سؤال (تقارير، درجات الحَكَم لكل سؤال)، المعيار العام Qur'an QA 2023 (فواصل الثقة وملفات التشغيل — بيانات المعيار نفسها غير مُعاد توزيعها لترخيصها)، خريطة الألف سؤال دون ذكاء اصطناعي، السلامة والإفراط في الرفض، عُدّة التقييم البشري، فحص القبلة والمواقيت في 33 موضعًا.
- **04 التتبّع**: خط الأساس المعلن، سجل التغييرات لكل مهمة، سجل git كامل بالتواريخ، الوسوم، مخرجات الاختبارات، التتبّع (SHA-256 لكل ملف بيانات)، أحدث أرشيف ZIP مع بصمته، يوميات المشروع وجدول التقدّم.
- **05 الملف الكامل**: ملف المشروع بالعربية والإنجليزية، ووثيقة محرّك الاسترجاع الاستخراجي مع لوحته.
- **06 المصادر والتراخيص**: سجل المصادر، الأدوات والنماذج والكلفة، الترخيص (جميع الحقوق محفوظة) وتراخيص الأطراف الثالثة.
- **07 نقد لجنة التحكيم**: تقييم ذاتي صادق وفق معايير التحكيم النهائي، وما صُحّح بناءً عليه.
- **08 لقطات الشاشة**: الحاسوب والهاتف، بالعربية والإنجليزية.
- **09 الهوية والشبكات**: الشعار وصور الصفحات الرسمية (يوتيوب ‎@mishketquran، فيسبوك).

لا يحتوي المجلد على أي مفتاح سرّي، ولا مفتاح التقييم المعمّى، ولا بيانات شخصية.

© 2026 مِشكاة — محمد نور بو علي. جميع الحقوق محفوظة. للاطلاع والتحكيم فقط.
'''
EN = f'''# Mishkat — judging files (Google Drive)

This folder gathers what does not go on GitHub (videos, archive, PDFs, logs) and copies of the results files, sorted by theme. Built on {today} by `tools/make_drive.py`. Repository: https://github.com/mednour87/Mishkat — site: https://mishkatquran.org — judges' guide: https://mishkatquran.org/judges.html

| Folder | Size |
|---|---|
{rows}

## What each folder holds
- **01 Presentation**: problem, solution and mechanism — Arabic (14 slides) and English (PDF and PPTX).
- **02 Video**: the demo video (under two minutes) in Modern Standard Arabic, a Saudi-dialect version, a light 720p version; the script.
- **03 Statistical results**: a summary in Arabic and English (PDF), then the original files: the 1,000-question test (reports, the judge's grades per question), the public benchmark Qur'an QA 2023 (confidence intervals and run files — the benchmark data itself is not redistributed, per its licence), the 1,000-question map without AI, safety and over-refusal, the human-evaluation kit, the qibla and prayer-time check in 33 places.
- **04 Traceability**: declared baseline, changelog by task, full dated git log, tags, test output, traceability (SHA-256 of every data file), latest ZIP archive with its fingerprint, project journal and progress table.
- **05 Project file**: the project file in Arabic and English, and the document of the extractive retrieval engine with its plate.
- **06 Sources and licences**: sources registry, tools, models and cost, the licence (all rights reserved) and third-party licences.
- **07 Jury critique**: an honest self-assessment against the final judging criteria, and what was fixed from it.
- **08 Screenshots**: computer and phone, Arabic and English.
- **09 Brand and social**: logo and images of the official pages (YouTube @mishketquran, Facebook).

No secret key, no blind-rating key and no personal data are in this folder.

© 2026 Mishkat — Mohamed Nour Bou Ali. All rights reserved. For viewing and judging only.
'''
for name, txt in [('00_اقرأني_README_AR.md', AR), ('00_README_EN.md', EN)]:
    io.open(os.path.join(OUT, name), 'w', encoding='utf-8').write(txt)
sys.path.insert(0, HERE)
from make_dossier import build
build('00_اقرأني_README_AR.md', 'ar', OUT); build('00_README_EN.md', 'en', OUT)
for h in glob.glob(os.path.join(OUT, '*.html')): os.remove(h)
io.open(os.path.join(OUT, 'files_list.txt'), 'w', encoding='utf-8').write('\n'.join(sorted(listing)))
print('files', len(listing), 'total', size(OUT))
