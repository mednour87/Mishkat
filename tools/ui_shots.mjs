// UI review captures in headless Chrome (DevTools protocol), phone and computer, dark and light:
//   node tools/ui_shots.mjs http://localhost:8790 <out-dir> [scenario…]
// Scenarios: home, read, tafsir, light, menu, stats, engage, tajweed, desk, desk-light, shapes. Writes JPEG frames + console.txt.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = process.argv[3] || 'shots_ui';
const WANT = process.argv.slice(4);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(OUT, { recursive: true });
const port = 9336;
const prof = mkdtempSync(join(tmpdir(), 'mishkat-ui-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ws, id = 0;
const pending = new Map(), logs = [];
const send = (method, params = {}) => new Promise((res, rej) => { const k = ++id; pending.set(k, { res, rej }); ws.send(JSON.stringify({ id: k, method, params })); });
async function connect() {
  for (let k = 0; k < 40; k++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
        ws.onmessage = (m) => {
          const d = JSON.parse(m.data);
          if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); }
          if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(d.params.exceptionDetails).slice(0, 400));
          if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') logs.push('ERR ' + d.params.args.map(a => a.value || a.description).join(' ').slice(0, 300));
        };
        return;
      }
    } catch (e) { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('chrome did not start');
}
export const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
const size = (w, h, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const PLACE = JSON.stringify({ id: 'gn:TN:Mahdia', en: 'Mahdia', ar: 'المهدية', lat: 35.5047, lon: 11.0622, cc: 'TN', tz: 'Africa/Tunis' });
const day = (k) => { const d = new Date(); d.setDate(d.getDate() - k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ACTIVE = { log: Object.fromEntries([0, 1, 2, 3, 5, 6, 8].map(k => [day(k), 25 + k * 3])), khatmas: 2, tk: { log: Object.fromEntries([0, 1, 2, 4].map(k => [day(k), { reps: 35, ayas: 5, sec: 600, units: 5, calm: 35 }])) } };
async function open(path = '', { lang = 'ar', prefs = {}, theme = 'dark' } = {}) {
  await send('Page.navigate', { url: BASE + '/' });
  await sleep(1000);
  const P = JSON.stringify({ intro: true, remindDay: new Date().toISOString().slice(0, 10), ...prefs });
  await evalJs(`localStorage.clear(); localStorage.setItem('mishkat.bismillah','1'); localStorage.setItem('mishkat.welcomed','1'); localStorage.setItem('mishkat.lang','${lang}'); localStorage.setItem('mishkat.theme','${theme}'); localStorage.setItem('mishkat.place', ${JSON.stringify(PLACE)}); localStorage.setItem('mishkat.prefs.v1', ${JSON.stringify(P)}); 1`);
  await send('Page.navigate', { url: BASE + '/' + path });
  for (let k = 0; k < 80; k++) { if (await evalJs(`!!document.querySelector('#loader.done')`)) break; await sleep(250); }
}
async function shot(name, waitMs = 0) {
  if (waitMs) await sleep(waitMs);
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
  writeFileSync(join(OUT, name), Buffer.from(data, 'base64'));
  console.log('shot', name);
}
const run = (name) => !WANT.length || WANT.includes(name);
const click = (sel) => evalJs(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(e){e.click(); return 1} return 0})()`);

try {
  await connect();
  await send('Page.enable'); await send('Runtime.enable');
  const phone = () => size(390, 844, true), desk = () => size(1366, 800);
  if (WANT.includes('probe')) { await desk(); await open('?s=24&a=35'); for (const t of [500, 2000, 5000]) { await sleep(t); console.log(t, await evalJs(`JSON.stringify([document.querySelector('#rSel')?.value, document.querySelector('#rdBody')?.scrollTop, document.querySelector('#lampRef')?.textContent, location.search])`)); } }
  if (WANT.includes('intro')) {
    await desk(); await open('', { prefs: { intro: false } });
    let at = 0; for (const t of [3, 6, 10, 24, 86]) { await shot(`intro_${t}s.jpg`, (t - at) * 1000); at = t; }
  }
  if (WANT.includes('contrast')) {
    const probe = (await import('node:fs')).readFileSync(new URL('./contrast_probe.js', import.meta.url), 'utf8');
    const check = async (tag) => { const r = await evalJs(probe); console.log(`[${tag}] ${r.length} low-contrast`); for (const x of r.slice(0, 12)) console.log('   ', x); };
    // the probe must see a planted fault
    await desk(); await open('');
    await evalJs(`(()=>{const d=document.createElement('div'); d.textContent='planted fault'; d.style.cssText='position:fixed;top:120px;left:10px;z-index:99;background:#fff;color:#f4f4f4;padding:10px'; document.body.appendChild(d); return 1})()`);
    await check('self-test (expects 1)');
    for (const theme of ['light', 'dark']) for (const [dev, sz] of [['m', phone], ['d', desk]]) {
      await sz();
      await open('?s=24&a=35', { theme, prefs: ACTIVE }); await sleep(2500);
      await check(`${theme}/${dev}/study`);
      await click('#mtabs [data-pane=t]'); await sleep(800); await check(`${theme}/${dev}/tafsir`);
      await click('#rMore'); await click('#tMore'); await sleep(300); await check(`${theme}/${dev}/more`);
      await click('#navBtn'); await sleep(500); await check(`${theme}/${dev}/drawer`);
      await click('#btnAbout'); await sleep(600); await check(`${theme}/${dev}/about`); await evalJs(`document.querySelector('#about').close(); 1`);
      await click('#navBtn'); await sleep(400); await click('#btnMenu'); await sleep(900); await check(`${theme}/${dev}/welcome`); await click('#wClose'); await sleep(400);
      for (const id of ['athkar', 'prayer', 'qibla', 'mosques', 'khatma', 'tekrar', 'stats', 'hijri', 'links', 'settings']) {
        await evalJs(`(()=>{ const b=document.querySelector('#dock [data-panel=${id}]'); if (b) b.click(); return 1 })()`); await sleep(1500);
        await check(`${theme}/${dev}/panel:${id}`);
      }
      await evalJs(`document.querySelector('#tray .p-x') && [...document.querySelectorAll('#tray .panel:not([hidden]) .p-x')].forEach(b=>b.click()); 1`);
      await open('?q=' + encodeURIComponent('الصبر'), { theme }); await sleep(5000); await check(`${theme}/${dev}/answers`);
      await evalJs(`localStorage.removeItem('mishkat.bismillah'); location.reload(); 1`); await sleep(3500); await check(`${theme}/${dev}/gate`);
    }
  }
  if (WANT.includes('lag')) {
    await desk(); await open('?s=24&a=35'); await sleep(3000);
    await sleep(3000); await click('#rPlayAll'); await sleep(5000);
    console.log('audio:', await evalJs(`JSON.stringify([...document.querySelectorAll('audio')].map(a => [a.src.slice(-30), a.paused, a.error && a.error.code]))`));
    console.log('playing:', await evalJs(`document.body.classList.contains('reciting') + ' ' + (document.querySelector('.gl.now:not(.off)')||{}).textContent`));
    for (const [k, sh] of [[0, 'rose'], [1, 'petals'], [2, 'quran'], [3, 'dome'], [4, 'galaxy']]) {
      await evalJs(`window.__lt = []; window.__fr = []; (()=>{ try { new PerformanceObserver(l => l.getEntries().forEach(e => __lt.push(Math.round(e.duration)))).observe({ type: 'longtask' }); } catch (e) {} const tok = (window.__tok = (window.__tok || 0) + 1); let t = performance.now(); const f = (n) => { if (tok !== window.__tok) return; __fr.push(n - t); t = n; if (__fr.length < 200) requestAnimationFrame(f); }; requestAnimationFrame(f); })(); const s = document.querySelector('#shapeSel'); s.value = '${sh}'; s.dispatchEvent(new Event('change')); 1`);
      await sleep(3000);
      console.log(sh, await evalJs(`JSON.stringify({ longTasks: __lt, worstFrame: Math.round(Math.max(...__fr.slice(1))), frames: __fr.length })`));
      await shot(`lag_${k}_${sh}.jpg`);
      await sleep(800);
      console.log(sh, await evalJs(`JSON.stringify({ longTasks: __lt, worstFrame: Math.round(Math.max(...__fr.slice(1))), frames: __fr.length, word: (document.querySelector('.gl.now:not(.off)')||{}).textContent || '-' })`));
    }
  }
  if (run('home')) { await phone(); await open(''); await shot('m_home.jpg', 2500); }
  if (run('read')) { await phone(); await open('?s=24&a=35'); await click('#mtabs [data-pane=r]'); await shot('m_read.jpg', 3000); }
  if (run('tafsir')) { await phone(); await open('?s=24&a=35'); await click('#mtabs [data-pane=t]'); await shot('m_tafsir.jpg', 3000); }
  if (run('light')) {
    await phone(); await open('?s=24&a=35', { theme: 'light' }); await click('#mtabs [data-pane=r]'); await shot('m_light_read.jpg', 3000);
    await click('#mtabs [data-pane=t]'); await shot('m_light_tafsir.jpg', 1500);
    await open('', { theme: 'light' }); await shot('m_light_home.jpg', 2500);
  }
  if (run('menu')) { await phone(); await open('?s=24&a=35'); await click('#navBtn'); await shot('m_menu.jpg', 1200); }
  if (run('stats')) { await phone(); await open('?s=24&a=35'); await sleep(2500); await click('#gStats'); await shot('m_stats.jpg', 2000); }
  if (run('engage')) {
    await phone(); await open('', { prefs: ACTIVE }); await click('#navBtn'); await sleep(500); await click('#engBtn'); await shot('m_engage.jpg', 5000);
    await desk(); await open('', { prefs: ACTIVE }); await click('#engBtn'); await shot('d_engage.jpg', 5000);
  }
  if (run('tajweed')) { await desk(); await open('?s=2&a=1'); await sleep(3000); await click('#rTj'); await sleep(2500); await click('.mushaf .tj[data-r]'); await shot('d_tajweed.jpg', 1500); }
  if (run('desk')) { await desk(); await open(''); await shot('d_home.jpg', 2500); await open('?s=24&a=35'); await shot('d_study.jpg', 3500); }
  if (run('desk-light')) { await desk(); await open('?s=24&a=35', { theme: 'light' }); await shot('d_light_study.jpg', 3500); }
  if (run('shapes')) {
    await desk(); await open('?s=24&a=35');
    const n = await evalJs(`document.querySelector('#shapeSel').options.length`);
    for (let k = 0; k < n; k++) {
      await evalJs(`(()=>{const s=document.querySelector('#shapeSel'); s.selectedIndex=${k}; s.dispatchEvent(new Event('change',{bubbles:true})); return 1})()`);
      await shot(`d_shape${k}.jpg`, 3500);
    }
  }
} finally {
  writeFileSync(join(OUT, 'console.txt'), logs.join('\n'));
  console.log('errors:', logs.length, logs.slice(0, 5).join('\n'));
  try { await send('Browser.close'); } catch (e) { chrome.kill(); }
}
