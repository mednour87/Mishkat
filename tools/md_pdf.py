# Any Markdown file of the deliverables → HTML + PDF with the styles of the project file (tools/make_dossier.py):
#   python tools/md_pdf.py <file.md> [ar|en|fr] …   (pairs: file then language)
# Every ﴿…﴾ fragment is checked against the Tanzil text, as in the project file.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_dossier import build

args = sys.argv[1:]
for k in range(0, len(args), 2):
    path = os.path.abspath(args[k]); lang = args[k + 1] if k + 1 < len(args) else 'en'
    build(os.path.basename(path), lang, os.path.dirname(path))
