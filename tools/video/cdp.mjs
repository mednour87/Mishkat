// Minimal Chrome DevTools Protocol driver for the video captures (no dependency).
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export async function launch({ port = 9440, headless = true, gpu = true, w = 1600, h = 900 } = {}) {
  const prof = mkdtempSync(join(tmpdir(), 'mishkat-vid-'));
  const args = [`--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required',
    '--hide-scrollbars', '--disable-features=Translate', `--window-size=${w},${h}`, '--force-device-scale-factor=1'];
  if (headless) args.push('--headless=new');
  if (gpu) args.push('--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu-rasterization');
  else args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  const proc = spawn(CHROME, [...args, 'about:blank'], { stdio: 'ignore' });
  let ws, id = 0; const pending = new Map(), handlers = new Map(), logs = [];
  for (let k = 0; k < 60 && !ws; k++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); }
    } catch (e) { await sleep(250); }
  }
  if (!ws) throw new Error('chrome did not start');
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); return; }
    if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(d.params.exceptionDetails).slice(0, 300));
    const h = handlers.get(d.method); if (h) h(d.params);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const k = ++id; pending.set(k, { res, rej }); ws.send(JSON.stringify({ id: k, method, params })); });
  const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  return { send, evalJs, on: (m, f) => handlers.set(m, f), logs, close: async () => { try { await send('Browser.close'); } catch (e) { proc.kill(); } } };
}
