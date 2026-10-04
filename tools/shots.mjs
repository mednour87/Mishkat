// Screenshots of the running site for the presentation (no French), through Chrome's DevTools protocol.
//   node server.mjs 8787 &   then   node tools/shots.mjs http://localhost:8787 ../04_LIVRABLES/captures
// Each shot: a page state set up by script (the gate is passed by the visitor's own localStorage flags),
// then a wait, then a PNG of the viewport. Chrome runs headless with a throw-away profile.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || 'shots';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(OUT, { recursive: true });
const port = 9333;
const prof = mkdtempSync(join(tmpdir(), 'mishkat-shots-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let ws, id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const k = ++id; pending.set(k, { res, rej }); ws.send(JSON.stringify({ id: k, method, params })); });
async function connect() {
  for (let k = 0; k < 40; k++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
        ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
        return;
      }
    } catch (e) { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('chrome did not start');
}
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
async function size(w, h, mobile = false) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
}
async function open(path, lang = 'ar', { ready = '#q' } = {}) {
  await send('Page.navigate', { url: BASE + '/' });
  await sleep(1500);
  await evalJs(`localStorage.setItem('mishkat.bismillah','1'); localStorage.setItem('mishkat.welcomed','1'); localStorage.setItem('mishkat.lang','${lang}'); localStorage.setItem('mishkat.theme','dark'); 1`);
  await send('Page.navigate', { url: BASE + '/' + path });
  for (let k = 0; k < 60; k++) { if (await evalJs(`!!document.querySelector('${ready}')`)) break; await sleep(250); }
}
async function shot(name, waitMs = 4000) {
  await sleep(waitMs);
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
  writeFileSync(join(OUT, name), Buffer.from(data, 'base64'));
  console.log('shot', name);
}
const waitFor = async (expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJs(expr)) return true; await sleep(400); } return false; };

try {
  await connect();
  await send('Page.enable'); await send('Runtime.enable');
  await size(1280, 800);
  // 02 galaxy home (Arabic)
  await open('', 'ar'); await shot('02_galaxie_ar.jpg', 6000);
  // 03 short answer «الصبر»
  await open('?q=' + encodeURIComponent('كيف أتعامل مع الحزن'), 'ar');
  await waitFor(`!!document.querySelector('#ragBox .rag-points, #ragBox .note:not(.rag-wait)')`); await shot('03_reponse_courte_ar.jpg', 2500);
  // 04 ruling: red banner + Fiqh Encyclopedia
  await open('?q=' + encodeURIComponent('ما حكم التدخين'), 'ar');
  await waitFor(`!!document.querySelector('#fiqhBox blockquote, #fiqhBox .note')`); await shot('04_hukm_mawsua_ar.jpg', 2500);
  // 05 misquote
  await open('?q=' + encodeURIComponent('هل هذه آية: وما خلقت الجن والإنس إلا ليعبدون الله'), 'ar'); await shot('05_citation_deformee_ar.jpg', 5000);
  // 06 reader: surah with tafsir
  await open('?q=' + encodeURIComponent('سورة يس'), 'ar'); await shot('06_lecteur_ar.jpg', 6000);
  // 07 English question
  await open('?q=' + encodeURIComponent('how to deal with anxiety'), 'en');
  await waitFor(`!!document.querySelector('#ragBox .rag-points, #ragBox .note:not(.rag-wait)')`); await shot('07_answer_en.jpg', 2500);
  // 08 crisis route
  await open('?q=' + encodeURIComponent('I want to kill myself'), 'en'); await shot('08_crisis_en.jpg', 5000);
  // 09 tools: qibla / prayer from the search bar
  await open('?q=' + encodeURIComponent('أذكار النوم'), 'ar'); await shot('09_adhkar_ar.jpg', 6000);
  // 10 story
  await open('?q=' + encodeURIComponent('قصة يوسف'), 'ar'); await shot('10_qissa_ar.jpg', 6000);
  // 11 mobile
  await size(390, 844, true);
  await open('?q=' + encodeURIComponent('الصبر'), 'ar');
  await waitFor(`!!document.querySelector('#ragBox .rag-points, #ragBox .note:not(.rag-wait)')`); await shot('11_mobile_ar.jpg', 2500);
} finally {
  try { await send('Browser.close'); } catch (e) { chrome.kill(); }
}
