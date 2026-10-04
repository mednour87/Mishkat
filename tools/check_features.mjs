// Visual check of the features of 4 October (T090–T098) in headless Chrome, through the DevTools protocol:
//   node server.mjs 8787 &   then   node tools/check_features.mjs http://localhost:8787 <out-dir> [scenario…]
// Scenarios: intro, intro-m (phone), tekrar, stats, engage, scope, child, tafsir, hud. Each writes JPEG frames.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || 'shots_check';
const WANT = process.argv.slice(4);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(OUT, { recursive: true });
const port = 9334;
const prof = mkdtempSync(join(tmpdir(), 'mishkat-check-'));
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
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
const size = (w, h, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const PLACE = JSON.stringify({ id: 'gn:TN:Mahdia', en: 'Mahdia', ar: 'المهدية', lat: 35.5047, lon: 11.0622, cc: 'TN', tz: 'Africa/Tunis' });
async function open(path = '', { lang = 'ar', prefs = {}, intro = true, welcomed = true } = {}) {
  await send('Page.navigate', { url: BASE + '/' });
  await sleep(1200);
  const P = JSON.stringify({ intro, remindDay: intro ? new Date().toISOString().slice(0, 10) : '', ...prefs });
  await evalJs(`localStorage.clear(); localStorage.setItem('mishkat.bismillah','1'); ${welcomed ? "localStorage.setItem('mishkat.welcomed','1');" : ''} localStorage.setItem('mishkat.lang','${lang}'); localStorage.setItem('mishkat.place', ${JSON.stringify(PLACE)}); localStorage.setItem('mishkat.prefs.v1', ${JSON.stringify(P)}); 1`);
  await send('Page.navigate', { url: BASE + '/' + path });
  for (let k = 0; k < 80; k++) { if (await evalJs(`!!document.querySelector('#loader.done')`)) break; await sleep(250); }
}
async function shot(name, waitMs = 0) {
  if (waitMs) await sleep(waitMs);
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
  writeFileSync(join(OUT, name), Buffer.from(data, 'base64'));
  console.log('shot', name);
}
const waitFor = async (expr, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJs(expr)) return true; await sleep(300); } return false; };
const run = (name) => !WANT.length || WANT.includes(name);
// a week of activity, for the progress views
const day = (k) => { const d = new Date(); d.setDate(d.getDate() - k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ACTIVE = { log: Object.fromEntries([0, 1, 2, 3, 5, 6, 8].map(k => [day(k), 25 + k * 3])), khatmas: 2, tk: { log: Object.fromEntries([0, 1, 2, 4].map(k => [day(k), { reps: 35, ayas: 5, sec: 600, units: 5, calm: 35 }])) } };

try {
  await connect();
  await send('Page.enable'); await send('Runtime.enable');
  if (run('intro')) {
    await size(1280, 800);
    await open('', { intro: false });
    for (const t of [3, 9, 20, 40, 70, 84, 90, 96, 104, 112, 124]) { await shot(`intro_${String(t).padStart(3, '0')}s.jpg`, (t - (globalThis.__t || 0)) * 1000); globalThis.__t = t; }
    globalThis.__t = 0;
  }
  if (run('intro-m')) {
    await size(390, 844, true);
    await open('', { intro: false });
    for (const t of [10, 30, 86, 95]) { await shot(`introM_${String(t).padStart(3, '0')}s.jpg`, (t - (globalThis.__t || 0)) * 1000); globalThis.__t = t; }
    globalThis.__t = 0;
  }
  if (run('scope')) {
    await size(1280, 800);
    for (const [k, q] of [['off_food', 'وصفة الكسكسي'], ['off_code', 'write me a python script for a website'], ['now', 'ما تاريخ اليوم'], ['khatma', 'خطة لختم القرآن في شهرين'], ['stats_word', 'كم مرة ذكرت كلمة الصبر'], ['tekrar_q', 'أريد أن أحفظ سورة الملك']]) {
      await open('?q=' + encodeURIComponent(q), { lang: /[a-z]/i.test(q) ? 'en' : 'ar' }); await shot(`scope_${k}.jpg`, 3500);
    }
  }
  if (run('child')) {
    await size(1280, 800);
    await open('?q=' + encodeURIComponent('ما حكم الموسيقى'), { prefs: { age: 'child' } }); await shot('child_ruling.jpg', 3500);
    await open('?q=' + encodeURIComponent('ما حكم الموسيقى'), { prefs: { age: 'adult' } }); await shot('adult_ruling.jpg', 5000);
  }
  if (run('tekrar')) {
    await size(1280, 800);
    await open('?tool=tekrar', { prefs: ACTIVE }); await shot('tekrar_setup.jpg', 2500);
    await evalJs(`document.querySelector('#tkGo').click(); 1`); await shot('tekrar_run.jpg', 4000);
    await size(390, 844, true);
    await open('?tool=tekrar', { prefs: ACTIVE }); await evalJs(`document.querySelector('#tkGo') && document.querySelector('#tkGo').click(); 1`); await shot('tekrarM_run.jpg', 4000);
  }
  if (run('stats')) {
    await size(1280, 800);
    await open('?tool=stats'); await shot('stats_sura.jpg', 3000);
    await evalJs(`document.querySelector('[data-tab=word]').click(); const i=document.querySelector('#stW'); i.value='الصبر'; i.form.requestSubmit(); 1`); await shot('stats_word.jpg', 1500);
  }
  if (run('engage')) {
    await size(1280, 800);
    await open('', { prefs: ACTIVE }); await shot('hud_home.jpg', 2500);
    await evalJs(`document.querySelector('#engBtn').click(); 1`); await shot('engage_map.jpg', 4000);
    await size(390, 844, true);
    await open('', { prefs: ACTIVE }); await shot('hudM_home.jpg', 2500);
    await evalJs(`document.querySelector('#engBtn').click(); 1`); await shot('engageM_map.jpg', 4000);
    await size(1280, 800);
    await open('', { prefs: { ...ACTIVE, remindDay: '' }, intro: true }); await evalJs(`(()=>{const k='mishkat.prefs.v1';const p=JSON.parse(localStorage.getItem(k));p.remindDay='';localStorage.setItem(k,JSON.stringify(p));location.reload();return 1})()`);
    await sleep(6000); await shot('remind_toast.jpg');
  }
  if (run('tajweed')) {
    await size(1280, 800);
    await open('?s=2&a=1');
    await sleep(4000); await evalJs(`document.querySelector('#rTj').click(); 1`); await shot('tajweed_on.jpg', 3500);
    await evalJs(`document.querySelector('#tClose').click(); 1`); await shot('tajweed_wide.jpg', 1500);
  }
  if (run('pwa')) {
    await size(1280, 800);
    await open('');
    await sleep(4000);
    const inst = await send('Page.getInstallabilityErrors');
    const man = await send('Page.getAppManifest');
    const sw = await evalJs(`navigator.serviceWorker.getRegistration().then(r => r ? (r.active ? 'active' : 'installing') : 'none')`);
    console.log('installability errors:', JSON.stringify(inst.installabilityErrors), '· manifest errors:', JSON.stringify(man.errors), '· service worker:', sw);
  }
  if (run('tafsir')) {
    await size(1280, 800);
    await open('?s=24&a=35'); await shot('tafsir_open.jpg', 4000);
    await evalJs(`document.querySelector('#tClose').click(); 1`); await shot('tafsir_closed.jpg', 1500);
    await size(390, 844, true);
    await open('?s=24&a=35'); await evalJs(`document.querySelector('#mtabs [data-pane=t]').click(); 1`); await shot('tafsirM_open.jpg', 3000);
    await evalJs(`document.querySelector('#tClose').click(); 1`); await shot('tafsirM_closed.jpg', 1500);
  }
} finally {
  writeFileSync(join(OUT, 'console.txt'), logs.join('\n'));
  console.log('errors:', logs.length);
  try { await send('Browser.close'); } catch (e) { chrome.kill(); }
}
