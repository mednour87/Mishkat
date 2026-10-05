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
  if (WANT.includes('intro-jump')) {           // T102: the chapter rail jumps ahead (recitation stopped with a fade)
    await desk(); await open('', { prefs: { intro: false } });
    await sleep(5000);
    await evalJs(`document.querySelector('.in-chap [data-ch=features]').click(); 1`);
    await shot('jump_features.jpg', 2500);
    console.log('phase after jump:', await evalJs(`document.querySelector('#intro').className + ' | card: ' + (document.querySelector('.in-card h3')||{}).textContent`));
    await evalJs(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); 1`);
    await sleep(600);
    console.log('after ArrowLeft:', await evalJs(`(document.querySelector('.in-card h3')||{}).textContent`));
    await evalJs(`document.querySelector('.in-chap [data-ch=end]').click(); 1`);
    await shot('jump_end.jpg', 2500);
    await evalJs(`document.querySelector('.in-q').click(); 1`);
    await sleep(4000);
    console.log('after example question:', await evalJs(`JSON.stringify({ intro: !!document.querySelector('#intro'), q: document.querySelector('#q').value })`));
    await shot('jump_search.jpg', 3000);
  }
  if (WANT.includes('intro-en')) {
    await desk(); await open('', { lang: 'en', prefs: { intro: false } });
    let at = 0; for (const t of (process.env.INTRO_T ? process.env.INTRO_T.split(",").map(Number) : [4, 30, 75, 104])) { await shot(`en_intro_${t}s.jpg`, (t - at) * 1000); at = t; }
  }
  if (WANT.includes('intro')) {
    await desk(); await open('', { prefs: { intro: false } });
    let at = 0; for (const t of (process.env.INTRO_T ? process.env.INTRO_T.split(",").map(Number) : [3, 6, 10, 24, 86])) { await shot(`intro_${t}s.jpg`, (t - at) * 1000); at = t; }
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
  if (run('stats')) { await phone(); await open('?s=24&a=35'); await sleep(2500); await click('#mtabs [data-pane=r]'); await click('#rMore'); await click('#rStats'); await shot('m_stats.jpg', 2000); }
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
  // (5 Oct) explicit scenarios: reading camera on a phone, mosques panel, tajweed page, intro film on a phone
  if (WANT.includes('readcam')) {
    await phone(); await open('?s=18&a=1'); await sleep(2500); await click('#mtabs [data-pane=r]'); await sleep(500); await click('#rPlayAll');
    for (const t of [4, 8, 12, 16, 20]) {
      await sleep(t === 4 ? 4000 : 4000);
      const m = await evalJs(`(()=>{const c=document.querySelector('#galaxy').getBoundingClientRect(), p=document.querySelector('.gl.now'); if(!p||p.classList.contains('off')) return 'word hidden'; const r=p.getBoundingClientRect(); return JSON.stringify({word:p.textContent, dx:+(((r.left+r.width/2)-(c.left+c.width/2))/(c.width/2)).toFixed(2), dy:+(((r.top+r.height/2)-(c.top+c.height/2))/(c.height/2)).toFixed(2)})})()`);
      console.log('readcam', t, m);
      await shot(`m_readcam_${t}s.jpg`);
    }
  }
  if (WANT.includes('mosques')) {
    await phone(); await open(''); await click('#navBtn'); await sleep(500); await click('[data-panel=mosques]'); await sleep(9000);
    console.log('mosques:', await evalJs(`JSON.stringify({count:(document.querySelector('.mq-count')||{}).textContent, items:document.querySelectorAll('.mq-list li').length, map:!!document.querySelector('.mq-map iframe')})`));
    await shot('m_mosques.jpg');
    await evalJs(`(document.querySelector('.mq-list [data-map]')||{click(){}}).click(), 1`); await shot('m_mosques_one.jpg', 4000);
    await desk(); await open(''); await click('[data-panel=mosques]'); await shot('d_mosques.jpg', 9000);
  }
  if (WANT.includes('tajpage')) {
    await phone(); await send('Page.navigate', { url: BASE + '/tajweed.html?lang=ar&from=2:5' }); await shot('m_tajpage.jpg', 4000);
    await evalJs(`scrollTo(0, 1400), 1`); await shot('m_tajpage2.jpg', 800);
    await desk(); await send('Page.navigate', { url: BASE + '/tajweed.html?lang=en' }); await shot('d_tajpage_en.jpg', 4000);
    await phone(); await open('?s=2&a=5', { prefs: {} }); await evalJs(`localStorage.setItem('mishkat.tj','1'); location.reload(); 1`); await sleep(5000); await click('#mtabs [data-pane=r]'); await shot('m_tj_reader.jpg', 2000);
  }
  // every tool panel, the drawer, the reader and the tafsir on a phone and a computer: elements cut by the edge of the
  // screen (a word or a button half outside, like the theme label of 5 Oct), console errors, a picture of each
  if (WANT.includes('audit')) {
    const overflow = `(()=>{const W=innerWidth, out=[]; for (const el of document.querySelectorAll('body *')) { if (!el.offsetParent && getComputedStyle(el).position!=='fixed') continue; const cs=getComputedStyle(el); if (cs.visibility==='hidden'||+cs.opacity===0) continue; const r=el.getBoundingClientRect(); if (!r.width||!r.height) continue; if (el.closest('.glabels,#tooltip,.mq-map,.tz-books,.tj-verse,.tj-key,#dock,.fy-chips,.hscroll,[data-scroll]')) continue; if (r.right>W+1||r.left<-1) { let p=el.parentElement, clipped=false; while(p&&p!==document.body){const s=getComputedStyle(p); if(/(auto|scroll|hidden)/.test(s.overflowX)){const pr=p.getBoundingClientRect(); if(pr.right<=W+1&&pr.left>=-1){clipped=true;break}} p=p.parentElement} if(!clipped) out.push((el.id?'#'+el.id:el.tagName.toLowerCase()+'.'+[...el.classList].join('.'))+' ['+Math.round(r.left)+','+Math.round(r.right)+'] '+(el.textContent||'').trim().slice(0,30)); } } return out.slice(0,15)})()`;
    for (const dev of ['phone', 'desk']) {
      for (const lang of ['ar', 'en']) {
        await (dev === 'phone' ? phone() : desk()); await open('?s=36&a=1', { lang });
        await sleep(2500);
        const ids = await evalJs(`JSON.stringify([...document.querySelectorAll('[data-panel]')].map(b=>b.dataset.panel).filter((x,i,a)=>a.indexOf(x)===i))`);
        console.log(dev, lang, 'panels', ids);
        if (dev === 'phone') { await click('#navBtn'); await sleep(600); console.log('drawer', JSON.stringify(await evalJs(overflow))); await shot(`a_${dev}_${lang}_drawer.jpg`); await click('#navClose'); await sleep(400); }
        for (const id of JSON.parse(ids)) {
          if (dev === 'phone') { await click('#navBtn'); await sleep(500); }
          await click(`[data-panel=${id}]`); await sleep(id === 'prayer' || id === 'mosques' ? 6000 : 2000);
          const ov = await evalJs(overflow);
          console.log(dev, lang, id, ov.length ? JSON.stringify(ov) : 'ok');
          await shot(`a_${dev}_${lang}_${id}.jpg`);
          await evalJs(`(document.querySelector('.panel:not([hidden]) .p-x')||{click(){}}).click(), 1`); await sleep(400);
        }
        if (dev === 'phone') for (const pane of ['r', 't', 's']) { await click(`#mtabs [data-pane=${pane}]`); await sleep(1500); const ov = await evalJs(overflow); console.log(dev, lang, 'pane', pane, ov.length ? JSON.stringify(ov) : 'ok'); await shot(`a_${dev}_${lang}_pane_${pane}.jpg`); }
        else { const ov = await evalJs(overflow); console.log(dev, lang, 'study', ov.length ? JSON.stringify(ov) : 'ok'); await shot(`a_${dev}_${lang}_study.jpg`); }
      }
    }
  }
  // a mid-range phone (CPU 4× slower): long tasks (> 50 ms) and frame times at start, while reading and while idle
  if (WANT.includes('perf')) {
    await phone(); await send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await evalJs(`1`);
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__lt=[]; try{ new PerformanceObserver(l=>l.getEntries().forEach(e=>__lt.push([Math.round(e.startTime),Math.round(e.duration)]))).observe({type:'longtask',buffered:true}); }catch(e){}` });
    await open('?s=18&a=1');
    await sleep(6000);
    const lt = JSON.parse(await evalJs(`JSON.stringify(__lt)`));
    console.log('start: long tasks', lt.length, 'total ms', lt.reduce((s, x) => s + x[1], 0), 'worst', Math.max(0, ...lt.map(x => x[1])), JSON.stringify(lt.slice(0, 12)));
    const frames = async (label, ms = 4000) => {
      const r = JSON.parse(await evalJs(`new Promise(res=>{const f=[];let t=performance.now(),n0=__lt.length;const end=t+${ms};const step=(n)=>{f.push(n-t);t=n; if(n<end) requestAnimationFrame(step); else { f.sort((a,b)=>a-b); res(JSON.stringify({frames:f.length, fps:+(f.length/${ms / 1000}).toFixed(1), p50:Math.round(f[f.length>>1]), p95:Math.round(f[Math.floor(f.length*.95)]), worst:Math.round(f[f.length-1]), longTasks:__lt.slice(n0).map(x=>x[1])})); } }; requestAnimationFrame(step);})`));
      console.log(label, JSON.stringify(r));
    };
    await frames('idle (study)');
    await click('#mtabs [data-pane=r]'); await sleep(300); await click('#rPlayAll'); await sleep(2500);
    await frames('reciting');
    await evalJs(`document.querySelector('#rdBody').scrollBy(0, 600), 1`); await frames('reciting + scroll', 2000);
    await click('#rPlayAll'); await sleep(800);
    await evalJs(`(()=>{const s=document.querySelector('#shapeSel'); s.value='rose'; s.dispatchEvent(new Event('change')); return 1})()`); await frames('shape change');
    await click('#navBtn'); await sleep(200); await frames('drawer open', 1500); await click('#navClose');
    await send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  // where the main thread spends its time (CPU profile, self time by function), at start and while reciting
  if (WANT.includes('profile')) {
    const top = (prof, label) => {
      const self = new Map(), byId = new Map(prof.nodes.map(n => [n.id, n]));
      const dt = prof.timeDeltas; let k = 0;
      for (const s of prof.samples) { const n = byId.get(s), f = n.callFrame, key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`; self.set(key, (self.get(key) || 0) + (dt[k++] || 0) / 1000); }
      console.log(label, [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([kk, v]) => `${Math.round(v)}ms ${kk}`).join('\n   '));
    };
    await phone(); await send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 500 });
    await send('Profiler.start'); await open('?s=18&a=1'); await sleep(5000);
    top((await send('Profiler.stop')).profile, 'START');
    await evalJs(`(()=>{window.__cs=0; for (const C of [WebGL2RenderingContext, WebGLRenderingContext]) { const o=C.prototype.compileShader; C.prototype.compileShader=function(x){ __cs++; return o.call(this,x) } } return 1})()`);
    await click('#mtabs [data-pane=r]'); await sleep(300); await click('#rPlayAll'); await sleep(2000);
    await send('Profiler.start'); await sleep(6000);
    console.log('shaders compiled while reciting:', await evalJs(`__cs`));
    top((await send('Profiler.stop')).profile, 'RECITING');
    await send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  // (5 Oct, evening) author's remarks: basmala paste button, ⤢ with the tafsir open, khatma map zoom + vertical move
  if (WANT.includes('oct5b')) {
    await phone(); await open('');
    await evalJs(`localStorage.removeItem('mishkat.bismillah'); location.reload(); 1`); await sleep(3500);
    await shot('m_gate.jpg');
    await click('#gatePaste'); await sleep(2500);
    console.log('gate after paste:', await evalJs(`JSON.stringify({ hidden: document.querySelector('#gate').hidden, msg: document.querySelector('#gateMsg').textContent })`));
    await open('?s=24&a=35'); await sleep(2500);
    await click('#mtabs [data-pane=t]'); await sleep(1200);
    const gh = `Math.round(document.querySelector('#gzone').getBoundingClientRect().height)`;
    console.log('galaxy height, tafsir pane:', await evalJs(gh));
    await click('#gFull'); await sleep(1200);
    console.log('galaxy height after ⤢:', await evalJs(gh), 'tafsir visible:', await evalJs(`getComputedStyle(document.querySelector('#tzone')).display`));
    await shot('m_tafsir_full.jpg');
    await click('#gFull'); await sleep(800);
    await evalJs(`document.querySelector('#lampSlot').click(), 1`); await sleep(1500);
    const cy = `(()=>{ const c=document.querySelector('#lampMap .lm-canvas'); return c ? Math.round(c.getBoundingClientRect().height) : -1 })()`;
    console.log('map canvas', await evalJs(cy));
    for (let k = 0; k < 4; k++) await evalJs(`document.querySelector('#lampMap [data-c=in]').click(), 1`);
    await shot('m_map_zoom.jpg', 600);
    for (let k = 0; k < 6; k++) await evalJs(`document.querySelector('#lampMap [data-c=up]').click(), 1`);
    await shot('m_map_top.jpg', 600);
    for (let k = 0; k < 14; k++) await evalJs(`document.querySelector('#lampMap [data-c=down]').click(), 1`);
    await shot('m_map_bottom.jpg', 600);
  }
  if (WANT.includes('zahra')) {
    for (const [dev, sz] of [['d', desk], ['m', phone]]) {
      await sz(); await open('');
      await evalJs(`(()=>{ const s=document.querySelector('#shapeSel'); s.value='zahra'; s.dispatchEvent(new Event('change', {bubbles:true})); document.querySelector('#sgClose')?.click(); return 1 })()`);
      await shot(`${dev}_zahra.jpg`, 7000);
    }
  }
  // (5 Oct, night) khatma «choose for me» → 3D reveal → reading only; panel ⤢; tajweed ✕; «about the surah»; icons
  if (WANT.includes('oct5c')) {
    await phone(); await open('?s=24&a=35', { prefs: { khatma: { active: false, days: 30, moments: [] } } }); await sleep(2500);
    await click('#mtabs [data-pane=r]'); await sleep(600);
    await shot('c_reader_icons.jpg');
    await click('#rMore'); await sleep(300); await click('#rTj'); await sleep(2500); await shot('c_tajweed.jpg');
    await click('#tjClose'); await sleep(500);
    console.log('tajweed colours after ✕:', await evalJs(`document.querySelectorAll('.mushaf .tj[data-r]').length`), 'box:', await evalJs(`!!document.querySelector('#tjLegend')`));
    await click('#rInfo'); await sleep(1800); await shot('c_about_sura.jpg');
    console.log('about window:', await evalJs(`(document.querySelector('#sInfoWin .sinfo')||{}).textContent?.slice(0,60)`));
    await evalJs(`document.querySelector('#sInfoWin [data-x]').click(), 1`);
    await click('#rFold'); await sleep(600); await shot('c_fold.jpg'); await click('#rFold');
    await click('#navBtn'); await sleep(500); await click('[data-panel=khatma]'); await sleep(1800); await shot('c_khatma_form.jpg');
    await evalJs(`document.querySelector('#tray .p-max').click(), 1`); await sleep(700); await shot('c_khatma_max.jpg');
    await click('#kWiz'); await sleep(800);
    await evalJs(`(()=>{ document.querySelector('input[name=wMin][value="20"]').click(); document.querySelector('input[name=wWhen][value=isha]').click(); document.querySelector('input[name=wOrd][value=short]').click(); document.querySelector('input[name=wDead][value="60"]').click(); return 1 })()`);
    await click('#wGo'); await sleep(900); await shot('c_wizard_result.jpg');
    console.log('result:', await evalJs(`(document.querySelector('.k-res')||{}).textContent?.replace(/\s+/g,' ').slice(0,220)`));
    await click('#wOk'); await sleep(4500); await shot('c_reveal.jpg');
    await evalJs(`(document.querySelector('[data-choice=only]')||{click(){}}).click(), 1`); await sleep(2500); await shot('c_read_only.jpg');
    console.log('read-full:', await evalJs(`document.body.classList.contains('read-full')`), 'verse:', await evalJs(`(document.querySelector('#rSura')||{}).value`));
    await click('#navBtn'); await sleep(400); await click('[data-panel=prayer]'); await sleep(2500);
    console.log('select colours:', await evalJs(`(()=>{ const o=document.querySelector('#tray select option'); if(!o) return 'no select'; const c=getComputedStyle(o); return c.color+' on '+c.backgroundColor })()`));
  }
  if (WANT.includes('intro-phone')) {
    await phone(); await open('', { prefs: { intro: false } });
    let at = 0; for (const t of (process.env.INTRO_T ? process.env.INTRO_T.split(",").map(Number) : [4, 9, 16, 30])) { await shot(`m_intro_${t}s.jpg`, (t - at) * 1000); at = t; }
  }
} finally {
  writeFileSync(join(OUT, 'console.txt'), logs.join('\n'));
  console.log('errors:', logs.length, logs.slice(0, 5).join('\n'));
  try { await send('Browser.close'); } catch (e) { chrome.kill(); }
}
