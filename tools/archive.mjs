// Timestamped archive of the project (proof of date and of content, «All rights reserved»):
//   node tools/archive.mjs [label]
// 1. ARCHIVE.md: the commit, its date, and the SHA-256 of every file tracked by git (the fingerprint of this version);
// 2. a ZIP of that commit (git archive) in ../04_LIVRABLES/archive/, with its own SHA-256 written next to it;
// 3. the annotated tag to create and push (printed): GitHub stores the push date of the tag and of every commit.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 }).trim();
const label = process.argv[2] || 'archive';
const commit = git('rev-parse', 'HEAD'), date = git('show', '-s', '--format=%cI', 'HEAD');
const files = git('ls-files', '-z').split('\0').filter(Boolean).sort();
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const rows = files.map(f => { const b = readFileSync(f); return `| \`${f}\` | ${b.length} | \`${sha(b)}\` |`; });
const all = sha(rows.join('\n'));
const out = resolve('../04_LIVRABLES/archive'); mkdirSync(out, { recursive: true });
const zip = join(out, `mishkat-${label}-${commit.slice(0, 7)}.zip`);
execFileSync('git', ['archive', '--format=zip', '-o', zip, 'HEAD']);
const zsha = sha(readFileSync(zip));
writeFileSync(zip + '.sha256', `${zsha}  ${zip.split(/[\\/]/).pop()}\n`);
writeFileSync('ARCHIVE.md', `# Archive · أرشيف مؤرَّخ

**Mishkat · مِشكاة** — © 2026 Mohamed Nour Bou Ali. All Rights Reserved · جميع الحقوق محفوظة (see [LICENSE](LICENSE)).

This file fingerprints one version of the project. With the dated git history (commit dates, GitHub push records and tags),
it proves what existed and when.

| | |
|---|---|
| Label | \`${label}\` |
| Commit | \`${commit}\` |
| Commit date | ${date} |
| Files | ${files.length} |
| SHA-256 of the table below | \`${all}\` |
| ZIP of this commit (\`git archive\`) | \`${zip.split(/[\\/]/).pop()}\` — SHA-256 \`${zsha}\` (kept by the author) |

Check: \`git checkout ${commit.slice(0, 12)} && node tools/archive.mjs check\` gives the same fingerprints, and
\`sha256sum\` of a file must match its line below.

| File | Bytes | SHA-256 |
|---|---|---|
${rows.join('\n')}
`);
console.log(JSON.stringify({ commit, date, files: files.length, table: all, zip, zsha }, null, 1));
console.log(`\nthen: git add ARCHIVE.md && git commit -m "Archive ${label}" && git tag -a ${label} -m "Mishkat ${label} — all rights reserved" && git push origin main --tags`);
