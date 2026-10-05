// Social-media kit (profile pictures, covers, share image) drawn by headless Chrome from public/img/logo.svg and the
// site's own fonts — no AI image, no stock picture:
//   node tools/make_social.mjs <out-dir>
// Background: a golden Fermat spiral of 77,433 points (one per word of the Quran, as in the galaxy of the site),
// thinned for the small formats. Texts: the name, the tagline and the address; never a verse.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const OUT = resolve(process.argv[2] || '../04_LIVRABLES/reseaux_sociaux');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(OUT, { recursive: true });
const fonts = 'file:///' + resolve('public/fonts').replace(/\\/g, '/') + '/';
const logo = readFileSync('public/img/logo.svg', 'utf8').replace(/width="120" height="120"/, 'width="100%" height="100%"');
const dir = mkdtempSync(join(tmpdir(), 'mishkat-social-'));

// kind: 'avatar' (square, the lamp alone, circle-safe), 'cover' (wide, lamp + name + tagline + address), 'og'
const JOBS = [
  { file: 'profil_1080_instagram_facebook.png', w: 1080, h: 1080, kind: 'avatar' },
  { file: 'profil_800_youtube.png', w: 800, h: 800, kind: 'avatar' },
  { file: 'couverture_facebook_1640x624.png', w: 1640, h: 624, kind: 'cover', safe: 0.72 },
  { file: 'couverture_x_twitter_1500x500.png', w: 1500, h: 500, kind: 'cover', safe: 0.8, avatarLeft: true },
  { file: 'banniere_youtube_2560x1440.png', w: 2560, h: 1440, kind: 'cover', safe: 0.6, ytSafe: true },
  { file: 'partage_og_1200x630.png', w: 1200, h: 630, kind: 'cover', safe: 0.9 },
  { file: 'story_instagram_1080x1920.png', w: 1080, h: 1920, kind: 'story' },
];

function page({ w, h, kind, safe = 0.8, ytSafe, avatarLeft }) {
  const short = Math.min(w, h);
  // YouTube shows only the middle 1546×423 on every device: everything important goes there
  const box = ytSafe ? { w: 1546, h: 423 } : { w: w * safe, h: h * 0.8 };
  const lampS = kind === 'avatar' ? short * 0.74 : kind === 'story' ? w * 0.62 : Math.min(box.h * 0.92, box.w * 0.3);
  const nameS = kind === 'story' ? w * 0.2 : Math.min(box.h * 0.42, box.w * 0.13);
  const text = kind === 'avatar' ? '' : `
    <div class="t">
      <div class="name">مِشكاة</div>
      <div class="en">MISHKAT</div>
      <div class="tag">دليل مجرّة القرآن الذكي</div>
      <div class="tag" dir="ltr">The smart guide to the Quran galaxy</div>
      <div class="url">mishkatquran.org</div>
    </div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Amiri; src: url(${fonts}Amiri-700-arabic.woff2); font-weight: 700; }
  @font-face { font-family: Amiri; src: url(${fonts}Amiri-400-arabic.woff2); font-weight: 400; }
  @font-face { font-family: Plex; src: url(${fonts}IBMPlexSansArabic-500-arabic.woff2); }
  @font-face { font-family: Plex; src: url(${fonts}IBMPlexSansArabic-500-latin.woff2); unicode-range: U+0000-00FF; }
  @font-face { font-family: Inter; src: url(${fonts}Inter-600-latin.woff2); }
  html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: #05070d; }
  canvas { position: absolute; inset: 0; }
  .wrap { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: ${box.w}px; height: ${box.h}px;
    display: flex; align-items: center; justify-content: center; gap: ${box.w * 0.05}px; direction: rtl; ${kind === 'story' ? 'flex-direction: column; height: 80%;' : ''}
    ${avatarLeft ? `padding-inline-end: ${w * 0.18}px; box-sizing: border-box;` : ''} }
  .lamp { width: ${lampS}px; height: ${lampS}px; filter: drop-shadow(0 0 ${short * 0.05}px rgba(255, 214, 107, .55)); flex: none; }
  .t { display: grid; justify-items: ${kind === 'story' ? 'center' : 'start'}; gap: ${nameS * 0.06}px; color: #fff3cf; ${kind === 'story' ? 'text-align: center;' : ''} }
  .name { font: 700 ${nameS}px/1.3 Amiri, serif; margin-bottom: ${nameS * 0.12}px; color: #ffd66b; text-shadow: 0 0 ${nameS * 0.25}px rgba(255, 200, 90, .45); }
  .en { font: 600 ${nameS * 0.2}px/1 Inter, sans-serif; letter-spacing: .5em; color: #f0d79a; direction: ltr; }
  .tag { font: 500 ${nameS * 0.17}px/1.5 Plex, sans-serif; color: #e9e3d2; max-width: ${kind === 'story' ? w * 0.86 : box.w * 0.62}px; }
  .url { font: 600 ${nameS * 0.17}px/1 Inter, sans-serif; color: #ffd66b; direction: ltr; letter-spacing: .04em; margin-top: ${nameS * 0.08}px;
    padding: ${nameS * 0.05}px ${nameS * 0.14}px; border: 1px solid rgba(255, 214, 107, .5); border-radius: 999px; }
  </style></head><body><canvas id="c" width="${w}" height="${h}"></canvas>
  <div class="wrap"><div class="lamp">${logo}</div>${text}</div>
  <script>
    const c = document.getElementById('c'), g = c.getContext('2d'), W = ${w}, H = ${h};
    const bg = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 1.6);
    bg.addColorStop(0, '#16244a'); bg.addColorStop(.55, '#0a1024'); bg.addColorStop(1, '#04060c');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // a Fermat spiral of points, as the galaxy of the site (one point per word, thinned)
    const N = 77433, step = ${kind === 'avatar' ? 7 : 3}, R = Math.hypot(W, H) * 0.62, ga = Math.PI * (3 - Math.sqrt(5));
    for (let k = 0; k < N; k += step) {
      const r = R * Math.sqrt(k / N), a = k * ga, x = W / 2 + r * Math.cos(a), y = H / 2 + r * Math.sin(a) * ${kind === 'cover' ? 0.62 : 1};
      const t = k / N, gold = (k * 2654435761 % 97) < 9;
      g.fillStyle = gold ? 'rgba(255, 214, 107,' + (0.55 - t * 0.35) + ')' : 'rgba(150, 185, 255,' + (0.32 - t * 0.22) + ')';
      const s = gold ? 1.8 : 1.1;
      g.fillRect(x - s / 2, y - s / 2, s, s);
    }
    // a soft light behind the lamp
    const lr = ${lampS} * 1.1, lb = document.querySelector('.lamp').getBoundingClientRect();
    const lg = g.createRadialGradient(lb.x + lb.width / 2, lb.y + lb.height / 2, 0, lb.x + lb.width / 2, lb.y + lb.height / 2, lr);
    lg.addColorStop(0, 'rgba(255, 220, 140, .28)'); lg.addColorStop(1, 'rgba(255, 220, 140, 0)');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
  </script></body></html>`;
}

for (const j of JOBS) {
  const html = join(dir, j.file + '.html');
  writeFileSync(html, page(j));
  const out = join(OUT, j.file).replace(/\\/g, '/');
  const r = spawnSync(CHROME, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${j.w},${j.h}`,
    '--virtual-time-budget=4000', '--allow-file-access-from-files', `--screenshot=${out}`, 'file:///' + html.replace(/\\/g, '/')], { encoding: 'utf8' });
  console.log(j.file, r.status === 0 ? 'ok' : r.stderr.slice(0, 300));
}
// Chrome cannot open a window narrower than ~500 px: the 400 px picture for X is the 1080 px one, scaled down
spawnSync('python', ['-c', `from PIL import Image; Image.open(r'${join(OUT, 'profil_1080_instagram_facebook.png')}').resize((400, 400), Image.LANCZOS).save(r'${join(OUT, 'profil_400_x_twitter.png')}')`]);
console.log('profil_400_x_twitter.png ok (scaled)');
