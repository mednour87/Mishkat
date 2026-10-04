// App icons for the installable app (T097), drawn from public/img/logo.svg by headless Chrome:
//   node tools/make_icons.mjs        → public/img/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
// "any" icons: the lamp on the night-blue ground with rounded corners; "maskable": the lamp inside the 80 % safe zone.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const svg = readFileSync('public/img/logo.svg', 'utf8');
const dir = mkdtempSync(join(tmpdir(), 'mishkat-icons-'));
const jobs = [
  { out: 'public/img/icon-192.png', size: 192, pad: 0.08, round: 0 },
  { out: 'public/img/icon-512.png', size: 512, pad: 0.08, round: 0 },
  { out: 'public/img/icon-maskable-512.png', size: 512, pad: 0.2, round: 0 },
  { out: 'public/img/apple-touch-icon.png', size: 180, pad: 0.1, round: 0 },
];
for (const j of jobs) {
  const html = `<!doctype html><html><head><style>html,body{margin:0;width:${j.size}px;height:${j.size}px;overflow:hidden;background:transparent}
    .b{width:${j.size}px;height:${j.size}px;border-radius:${j.round * 100}%;background:radial-gradient(circle at 50% 45%,#16244a 0%,#070b18 72%);display:grid;place-items:center}
    .b svg{width:${Math.round(j.size * (1 - 2 * j.pad))}px;height:${Math.round(j.size * (1 - 2 * j.pad))}px}</style></head><body><div class="b">${svg}</div></body></html>`;
  const f = join(dir, `i${j.size}${j.pad}.html`);
  writeFileSync(f, html);
  const r = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000', `--window-size=${j.size},${j.size}`, `--screenshot=${resolve(j.out)}`, 'file:///' + f.replace(/\\/g, '/')], { stdio: 'pipe', timeout: 60000 });
  console.log(j.out, r.status === 0 ? 'ok' : String(r.stderr).slice(0, 300));
}
