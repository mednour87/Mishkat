# Counts the characters of every text block of 04_LIVRABLES/reseaux_sociaux/NOM_ET_DESCRIPTION_MISHKAT.md against
# the limit written in the heading just above it («(≤ N caractères)»), and appends the result to the file.
#   python tools/check_social.py
import io, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
F = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '04_LIVRABLES', 'reseaux_sociaux', 'NOM_ET_DESCRIPTION_MISHKAT.md')
s = io.open(F, encoding='utf-8').read().split('\n<!-- check -->')[0].rstrip('\n')
rows, bad, section = [], 0, ''
for m in re.finditer(r'(?:^## ([^\n]+)$)|(?:^\*\*([^*\n]+)\*\*\n```\n(.*?)\n```)', s, re.S | re.M):
    if m.group(1): section = m.group(1); continue
    head, text = m.group(2), m.group(3)
    lim = re.search(r'≤ ([\d ]+) caract', head)
    n = len(text)
    ok = '—' if not lim else ('✅' if n <= int(lim.group(1).replace(' ', '')) else '❌')
    bad += ok == '❌'
    rows.append(f'| {section} — {head} | {n} | {lim.group(1) if lim else "—"} | {ok} |')
out = s + '\n<!-- check -->\n\n---\n\n## Vérification des longueurs (automatique)\n| Texte | Caractères | Limite | |\n|---|---|---|---|\n' + '\n'.join(rows) + '\n'
io.open(F, 'w', encoding='utf-8', newline='').write(out)
print('\n'.join(rows)); print('over the limit:', bad)
sys.exit(1 if bad else 0)
