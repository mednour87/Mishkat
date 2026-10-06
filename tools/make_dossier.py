# The project file (dossier) in Arabic, English and French: Markdown → HTML (fonts and logo of the site) → PDF
# with headless Chrome. Every ﴿…﴾ fragment must be a word-exact slice of the Tanzil text (checked here).
#   python tools/make_dossier.py
import io, os, re, sys, json, html, subprocess, base64
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(os.path.dirname(ROOT), '04_LIVRABLES', 'dossier_complet')
CHROME = os.environ.get('CHROME', r'C:\Program Files\Google\Chrome\Application\chrome.exe')
FONTS = 'file:///' + os.path.join(ROOT, 'public', 'fonts').replace('\\', '/') + '/'

core = json.load(open(os.path.join(ROOT, 'public', 'data', 'core.json'), encoding='utf-8'))
ALLV = '\n'.join(core['verses'])

def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<![*\w])\*([^*\n]+)\*(?![*\w])', r'<i>\1</i>', t)
    t = re.sub(r'(https?://[^\s)<,]+)', r'<a href="\1">\1</a>', t)
    t = re.sub(r'﴿([^﴾]+)﴾', r'<span class="q">﴿\1﴾</span>', t)
    return t

OL = re.compile(r'^\s*([0-9\u0660-\u0669]+)\.\s+(.*)$')
def md2html(md):
    out, i, L = [], 0, md.split('\n')
    while i < len(L):
        ln = L[i]
        if not ln.strip(): i += 1; continue
        if ln.startswith('#'):
            n = len(ln) - len(ln.lstrip('#'))
            out.append(f'<h{n}>{inline(ln[n:].strip())}</h{n}>'); i += 1; continue
        if ln.strip() == '---': out.append('<hr>'); i += 1; continue
        if ln.startswith('|'):
            rows = []
            while i < len(L) and L[i].startswith('|'):
                cells = [c.strip() for c in L[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{3,}:?', c) for c in cells): rows.append(cells)
                i += 1
            h = '<table><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in rows[0]) + '</tr></thead><tbody>'
            h += ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in rows[1:]) + '</tbody></table>'
            out.append(h); continue
        if ln.startswith('>'):
            q = []
            while i < len(L) and L[i].startswith('>'): q.append(L[i][1:].strip()); i += 1
            out.append('<blockquote>' + '<br>'.join(inline(x) for x in q) + '</blockquote>'); continue
        if re.match(r'^\s*- ', ln):
            items = []
            while i < len(L) and (re.match(r'^\s*- ', L[i]) or (L[i].startswith('  ') and L[i].strip())):
                if re.match(r'^\s*- ', L[i]):
                    items.append([L[i].strip()[2:], L[i].startswith('  ')])
                else:
                    items[-1][0] += ' ' + L[i].strip()
                i += 1
            h, sub = '<ul>', False
            for t, nested in items:
                if nested and not sub: h += '<ul>'; sub = True
                if not nested and sub: h += '</ul>'; sub = False
                h += f'<li>{inline(t)}</li>'
            out.append(h + ('</ul>' if sub else '') + '</ul>'); continue
        if OL.match(ln):
            h = '<ol>'
            while i < len(L) and (OL.match(L[i]) or (L[i].startswith('  ') and L[i].strip())):
                m = OL.match(L[i])
                if m: h += f'<li value="{int(m.group(1).translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")))}">{inline(m.group(2))}'
                else:
                    sub = L[i].strip()
                    h += ('<ul>' if not h.endswith('</li>') and '<ul>' not in h[-200:] else '') + f'<br>{inline(sub[2:] if sub.startswith("- ") else sub)}'
                i += 1
            out.append(h + '</ol>'); continue
        p = [ln.strip()]
        i += 1
        while i < len(L) and L[i].strip() and not re.match(r'^(#|\||>|\s*- |---)', L[i]) and not OL.match(L[i]): p.append(L[i].strip()); i += 1
        out.append('<p>' + inline(' '.join(p)) + '</p>')
    return '\n'.join(out)

def check_verses(md, name):
    for m in re.finditer(r'﴿([^﴾]+)﴾', md):
        frag = m.group(1).strip('…').strip()
        assert frag in ALLV, f'{name}: not a Tanzil slice: {frag}'

logo = base64.b64encode(open(os.path.join(ROOT, 'docs', 'logo.png'), 'rb').read()).decode()
CSS = f"""
@font-face {{ font-family: Amiri; src: url({FONTS}Amiri-400-arabic.woff2); unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF; }}
@font-face {{ font-family: Amiri; font-weight: 700; src: url({FONTS}Amiri-700-arabic.woff2); unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF; }}
@font-face {{ font-family: AmiriQuran; src: url({FONTS}AmiriQuran-400-arabic.woff2); }}
@font-face {{ font-family: Plex; src: url({FONTS}IBMPlexSansArabic-400-arabic.woff2); }}
@font-face {{ font-family: Plex; font-weight: 600; src: url({FONTS}IBMPlexSansArabic-600-arabic.woff2); }}
@font-face {{ font-family: Inter; src: url({FONTS}Inter-400-latin.woff2); }}
@font-face {{ font-family: Inter; src: url({FONTS}Inter-400-latin-ext.woff2); unicode-range: U+0100-024F, U+1E00-1EFF; }}
@font-face {{ font-family: Inter; font-weight: 700; src: url({FONTS}Inter-700-latin.woff2); }}
@page {{ size: A4; margin: 16mm 15mm 16mm 15mm; }}
:root {{ --gold: #b8860b; --ink: #1d2230; --mut: #5b6475; --line: #d9dde6; --band: #f6f3ea; }}
body {{ font-family: Inter, Plex, sans-serif; color: var(--ink); font-size: 10.2pt; line-height: 1.5; margin: 0; }}
body.ar {{ font-family: Plex, Inter, sans-serif; font-size: 11pt; line-height: 1.75; }}
.cover {{ display: flex; align-items: center; gap: 18px; border-bottom: 3px solid var(--gold); padding-bottom: 10px; margin-bottom: 8px; }}
.cover img {{ width: 78px; height: 78px; border-radius: 14px; background: #05070d; }}
h1 {{ font-size: 21pt; margin: 0; color: #0d1220; }}
h2 {{ font-size: 13.5pt; color: #6b4e00; border-bottom: 1px solid var(--line); padding-bottom: 3px; margin: 18px 0 8px; break-after: avoid; }}
h3 {{ font-size: 11.5pt; margin: 12px 0 6px; }}
p {{ margin: 6px 0; }} ul, ol {{ margin: 6px 0; padding-inline-start: 22px; }} li {{ margin: 3px 0; }}
table {{ border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9.2pt; break-inside: auto; }}
body.ar table {{ font-size: 9.8pt; }}
th, td {{ border: 1px solid var(--line); padding: 4px 6px; vertical-align: top; text-align: start; }}
th {{ background: var(--band); color: #5a4300; }}
tr {{ break-inside: avoid; }}
code {{ font-family: Consolas, monospace; font-size: 8.6pt; background: #f1f2f5; padding: 0 3px; border-radius: 3px; direction: ltr; unicode-bidi: embed; }}
blockquote {{ margin: 10px 0; padding: 8px 14px; background: var(--band); border-inline-start: 4px solid var(--gold); }}
.q {{ font-family: AmiriQuran, Amiri, serif; font-size: 1.18em; color: #5a3d00; }}
hr {{ border: 0; border-top: 1px solid var(--line); margin: 14px 0; }}
a {{ color: #0b5cad; text-decoration: none; word-break: break-all; }}
i {{ color: var(--mut); }}
"""

def build(md_name, lang):
    md = io.open(os.path.join(OUT, md_name), encoding='utf-8').read()
    check_verses(md, md_name)
    body = md2html(md)
    # the first h1 goes in the cover band with the logo
    body = re.sub(r'^<h1>(.*?)</h1>', lambda m: f'<div class="cover"><img src="data:image/png;base64,{logo}" alt=""><h1>{m.group(1)}</h1></div>', body, count=1)
    d = 'rtl' if lang == 'ar' else 'ltr'
    doc = f'<!doctype html><html lang="{lang}" dir="{d}"><head><meta charset="utf-8"><title>Mishkat</title><style>{CSS}</style></head><body class="{lang}">{body}</body></html>'
    h = os.path.join(OUT, md_name.replace('.md', '.html'))
    io.open(h, 'w', encoding='utf-8').write(doc)
    pdf = h.replace('.html', '.pdf')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--allow-file-access-from-files',
                    f'--print-to-pdf={pdf}', 'file:///' + h.replace('\\', '/')], check=True, capture_output=True, timeout=180)
    print(md_name, '→', os.path.basename(pdf), os.path.getsize(pdf) // 1024, 'KB')

for name, lang in [('Mishkat_Dossier_AR.md', 'ar'), ('Mishkat_Dossier_EN.md', 'en'), ('Mishkat_Dossier_FR.md', 'fr')]:
    build(name, lang)
