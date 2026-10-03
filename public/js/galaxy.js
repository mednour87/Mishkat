// The Quran galaxy — 77,433 words as glowing points (three.js / WebGL).
// Layouts 0 and 1 come from galaxy.bin (two-armed spiral, Mushaf / revelation order);
// other shapes and orders are computed in the browser and added with addLayout().
//
// Three moments:
//   • exploring — names of the surahs float over the galaxy;
//   • answers   — the verses found light up, one colour per surah, with a clickable
//                 label per surah listing its verses; the camera frames them all;
//   • reciting  — the camera glides smoothly from word to word, close enough to read,
//                 and ONLY the recited word is written, inside a luminous disc on its star.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

const CLASS_COLORS = [null, '#FFD66B', '#5EE6A0', '#8FD3FF', '#B98CFF'];
const MECCAN = new THREE.Color('#F3D9A4');
const MEDINAN = new THREE.Color('#8EC5F0');
// one colour per surah of an answer (index 1..8); 0 = not highlighted
export const PALETTE = ['#FFD66B', '#5EE6A0', '#8FD3FF', '#FF9F7A', '#C9A2FF', '#7FE0D4', '#FFB4D2', '#B8E07A'];

// hl: 0 = normal · 1..8 = verse of the answer (palette k) · 9..16 = other words of a surah of the answer (soft tint)
const VERT = /* glsl */`
  attribute vec3 position2;
  attribute vec3 color;
  attribute float hl;
  attribute float size;
  uniform float uMix, uPx, uTime;
  uniform vec3 uPal[8];
  varying vec3 vColor;
  varying float vHl;
  varying float vNear;
  varying float vFar;
  void main() {
    vec3 p = mix(position, position2, uMix);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float strong = (hl > 0.5 && hl < 8.5) ? 1.0 : 0.0;
    float soft = hl > 8.5 ? 1.0 : 0.0;
    // verses of the answer are a little larger, but not when the camera is very close
    float grow = mix(1.0, 1.75, clamp(-mv.z / 320.0, 0.0, 1.0));
    float pulse = strong > 0.5 ? 1.0 + 0.18 * sin(uTime * 2.4 + p.x * 0.05) : 1.0;
    // stars never become large blurred discs in front of the camera (a size ceiling, and the stars that
    // almost touch the camera fade out), nor dissolve far away (a floor of 1.6 px, so the core stays sharp)
    float px = size * uPx * pulse * (strong > 0.5 ? grow : 1.0) * (520.0 / -mv.z);
    gl_PointSize = clamp(px, 1.6 * uPx, (strong > 0.5 ? 15.0 : 10.0) * uPx);
    vNear = smoothstep(8.0, 40.0, -mv.z);
    // depth: the far side of the galaxy is a little dimmer than the near side
    vFar = 1.0 - 0.45 * smoothstep(700.0, 2400.0, -mv.z);
    gl_Position = projectionMatrix * mv;
    int k = int(clamp(mod(hl - 1.0, 8.0), 0.0, 7.0) + 0.5);
    vec3 pal = uPal[0];
    for (int j = 1; j < 8; j++) if (j == k) pal = uPal[j];
    vColor = strong > 0.5 ? mix(color, pal, 0.85) : soft > 0.5 ? mix(color, pal, 0.45) : color;
    vHl = strong > 0.5 ? 1.0 : soft > 0.5 ? 0.5 : 0.0;
  }`;
const FRAG = /* glsl */`
  uniform float uDim;
  varying vec3 vColor;
  varying float vHl;
  varying float vNear;
  varying float vFar;
  void main() {
    // a star: a crisp bright core (a little whiter) inside a narrow halo — no more soft blurred discs
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.30, 0.52, d);
    float halo = exp(-d * d * 5.0) * 0.42;
    float a = clamp(core + halo, 0.0, 1.0);
    // strong = verse of the answer, soft = rest of its surah, the rest of the sky stays visible
    vec3 col = vHl > 0.75 ? vColor * 1.5 : vHl > 0.25 ? vColor : vColor * mix(1.05, 0.55, uDim);
    col = mix(col, vec3(1.0), core * 0.25);
    gl_FragColor = vec4(col, a * vNear * vFar * (vHl > 0.75 ? 1.0 : vHl > 0.25 ? 0.9 : mix(0.9, 0.6, uDim)));
  }`;

export async function createGalaxy(canvas, { binUrl, suras, onHover, onPick, onLabelVerse, wordText = () => '', suraLabel = (n) => String(n) }) {
  const buf = await (await fetch(binUrl)).arrayBuffer();
  const dv = new DataView(buf);
  const N = dv.getUint32(0, true), nLayouts = dv.getUint32(4, true);
  const scale = dv.getFloat32(8, true);
  let off = 12;
  const q = new Int16Array(buf, off, N * 3 * nLayouts); off += N * 3 * nLayouts * 2;
  const wordVerse = new Uint16Array(buf.slice(off, off + N * 2)); off += N * 2;
  const cls = new Uint8Array(buf, off, N);

  const layouts = [];
  for (let L = 0; L < nLayouts; L++) {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) a[i] = q[L * N * 3 + i] * scale;
    layouts.push(a);
  }
  // verse -> word range (words are stored in mushaf order)
  const NV = 6236;
  const vStart = new Int32Array(NV).fill(-1), vEnd = new Int32Array(NV);
  for (let i = 0; i < N; i++) { const v = wordVerse[i]; if (vStart[v] < 0) vStart[v] = i; vEnd[v] = i + 1; }
  const suraType = new Uint8Array(NV);
  for (const s of suras) for (let a = 0; a < s.ayas; a++) suraType[s.first + a] = s.type === 'medinan' ? 1 : 0;
  const suraIdxOfVerse = new Int16Array(NV);
  suras.forEach((S, k) => { for (let a = 0; a < S.ayas; a++) suraIdxOfVerse[S.first + a] = k; });

  // deterministic jitter (same look on every visit)
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const colors = new Float32Array(N * 3), sizes = new Float32Array(N), hl = new Float32Array(N);
  const tmp = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const c = cls[i];
    if (c) tmp.set(CLASS_COLORS[c]);
    else tmp.copy(suraType[wordVerse[i]] ? MEDINAN : MECCAN).multiplyScalar(0.72 + 0.28 * rnd());
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    sizes[i] = c ? 3.4 : 2.1 + rnd() * 1.1;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  // adaptive resolution: start at up to 2× (sharp stars on high-density screens) and drop to 1× if frames are slow
  let px = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(px);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 1, 8000);
  // the whole disc (radius ≈ 600) framed from closer than before: stars read as stars, not as dust
  // (same view as layouts.js galaxy(): the near edge of the disc stays in the frame)
  const HOME = { pos: new THREE.Vector3(0, -860, 640), target: new THREE.Vector3(0, -60, 0) };
  // the words of a verse (and the recited word) are written on their stars only once the camera is this close
  const WORDS_DIST = 130;
  camera.position.copy(HOME.pos);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 12; controls.maxDistance = 2600;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.35;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(layouts[0].slice(), 3));
  geo.setAttribute('position2', new THREE.BufferAttribute(layouts[0].slice(), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const hlAttr = new THREE.BufferAttribute(hl, 1); hlAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('hl', hlAttr);
  geo.computeBoundingSphere();
  const uniforms = { uMix: { value: 0 }, uPx: { value: px }, uDim: { value: 0 }, uTime: { value: 0 }, uPal: { value: PALETTE.map(c => new THREE.Color(c)) } };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  // faint background stars
  {
    const n = 2500, sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 2500 + rnd() * 2000, t = rnd() * Math.PI * 2, u = Math.acos(2 * rnd() - 1);
      sp[i * 3] = r * Math.sin(u) * Math.cos(t); sp[i * 3 + 1] = r * Math.sin(u) * Math.sin(t); sp[i * 3 + 2] = r * Math.cos(u);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.4, color: 0x8899bb, transparent: true, opacity: 0.55, sizeAttenuation: false })));
  }

  // faint path linking highlighted verses (Mushaf order)
  const pathMat = new THREE.LineBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending });
  let pathLine = null;
  // selection ring
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.6, 64),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  ring.visible = false; scene.add(ring);
  // glowing sprite on the word being recited
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,224,138,.95)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const active = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  active.scale.set(7, 7, 1); active.visible = false; scene.add(active);

  let layout = 0;
  let highlighted = [];
  let morph = null, anim = null;

  // thread linking the words of the focused verse, in reading order
  const threadMat = new THREE.LineBasicMaterial({ color: 0xffd66b, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
  let thread = null;

  // ------------------------------------------------------------ labels (DOM)
  const labelBox = document.createElement('div');
  labelBox.className = 'glabels';
  canvas.parentNode.appendChild(labelBox);
  const pool = [];
  const lbl = (k) => { while (pool.length <= k) { const d = document.createElement('div'); labelBox.appendChild(d); pool.push(d); } return pool[k]; };
  // the recited word: one dedicated element that glides on screen
  const pill = document.createElement('div');
  pill.className = 'gl now off';
  labelBox.appendChild(pill);
  const pillPos = { x: 0, y: 0, on: false };
  // answer labels: one clickable element per surah of the answer
  let groups = [];      // [{ sura, verses:[idx], color, title, ayas:[n], el }]
  let focusV = null, activeI = null, activeText = '', namesOn = true, reciting = false, groupsOn = true;
  const v3 = new THREE.Vector3();
  const suraMid = [];   // per layout: surah centroids

  function suraCentroids() {
    if (suraMid[layout]) return suraMid[layout];
    const P = layouts[layout], out = new Float32Array(suras.length * 3);
    // the name sits on the surah's middle word: the mean of its words falls in empty space when the surah is a
    // ring (rose), a band (dome) or lies on both arms (galaxy) — names then piled up in the middle
    suras.forEach((S, k) => {
      const m = (vStart[S.first] + vEnd[S.first + S.ayas - 1] - 1) >> 1;
      out[k * 3] = P[m * 3]; out[k * 3 + 1] = P[m * 3 + 1]; out[k * 3 + 2] = P[m * 3 + 2];
    });
    suraMid[layout] = out;
    return out;
  }
  function screen(p, w, h) {
    v3.copy(p).project(camera);
    if (v3.z < -1 || v3.z > 1) return null;
    return { x: (v3.x * 0.5 + 0.5) * w, y: (-v3.y * 0.5 + 0.5) * h, z: v3.z };
  }
  const wpos = (i, out = new THREE.Vector3()) => { const P = layouts[layout]; return out.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); };
  const put = (el, x, y) => { el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`; };
  const tmpV = new THREE.Vector3();

  function placeLabels(dt) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    let n = 0;
    const boxes = [];
    const free = (x, y, bw, bh, edge = true) => {
      if (edge && (x - bw / 2 < 2 || x + bw / 2 > w - 2 || y - bh / 2 < 2 || y + bh / 2 > h - 2)) return false;
      for (const b of boxes) if (Math.abs(b.x - x) * 2 < b.w + bw && Math.abs(b.y - y) * 2 < b.h + bh) return false;
      boxes.push({ x, y, w: bw, h: bh });
      return true;
    };
    const ok = !morph && w && h;
    const d = camera.position.distanceTo(controls.target);
    // 1. the recited word (glides smoothly from one star to the next)
    let pillOn = false;
    if (ok && activeI != null && d < WORDS_DIST) {      // zoomed out, the word is in the lamp only
      const p = screen(active.position, w, h);
      if (p) {
        const k = pillPos.on ? 1 - Math.exp(-dt * 10) : 1;
        pillPos.x += (p.x - pillPos.x) * k; pillPos.y += (p.y - pillPos.y) * k;
        put(pill, pillPos.x, pillPos.y);
        boxes.push({ x: pillPos.x, y: pillPos.y, w: activeText.length * 17 + 48, h: 58 });
        pillOn = true;
      }
    }
    pillPos.on = pillOn;
    pill.classList.toggle('off', !pillOn);
    // while reciting, only the recited word is written
    if (ok && !reciting) {
      // 2. answer labels, one per surah, at the centre of its verses
      for (const g of groupsOn ? groups : []) {
        // on the middle verse of the answer in this surah (its verses may lie on both arms: their mean is in the void)
        tmpV.copy(centroid(g.verses[g.verses.length >> 1]));
        const p = screen(tmpV, w, h);
        if (!p) { g.el.hidden = true; continue; }
        const bw = g.el.offsetWidth || 140, bh = g.el.offsetHeight || 34;
        let y = p.y;
        for (let t = 0; t < 6 && !free(p.x, y, bw, bh, false); t++) y += bh + 4;
        g.el.hidden = false;
        put(g.el, Math.min(w - bw / 2 - 4, Math.max(bw / 2 + 4, p.x)), Math.min(h - bh / 2 - 4, Math.max(bh / 2 + 4, y)));
      }
      // 3. the words of the focused verse, beside their stars (close views)
      if (focusV != null && vStart[focusV] >= 0 && d < WORDS_DIST) {
        const fs = Math.max(13, Math.min(20, 1800 / Math.max(60, d)));
        const items = [];
        for (let i = vStart[focusV]; i < vEnd[focusV]; i++) {
          const p = screen(wpos(i, tmpV), w, h);
          if (p) items.push({ i, p });
        }
        items.sort((a, b) => a.p.z - b.p.z);
        for (const { i, p } of items.slice(0, 50)) {
          const t = wordText(i);
          const y = p.y - fs * 0.95;
          if (!t || !free(p.x, y, t.length * fs * 0.52 + 6, fs * 1.5)) continue;
          const el = lbl(n++);
          el.className = 'gl gw';
          el.textContent = t;
          el.style.fontSize = fs.toFixed(1) + 'px';
          put(el, p.x, y);
        }
      }
      // 4. surah names (far views, when no answer is shown)
      if (namesOn && !(groups.length && groupsOn) && d > 170) {
        const C = suraCentroids(), items = [];
        for (let k = 0; k < suras.length; k++) {
          const p = screen(tmpV.set(C[k * 3], C[k * 3 + 1], C[k * 3 + 2]), w, h);
          if (p) items.push({ k, p });
        }
        items.sort((a, b) => a.p.z - b.p.z);
        let shown = 0;
        const focusK = focusV != null ? suraIdxOfVerse[focusV] : -1;
        for (const { k, p } of items) {
          if (shown >= 22) break;
          const t = suraLabel(suras[k].n);
          if (!free(p.x, p.y, t.length * 7 + 10, 20)) continue;
          const el = lbl(n++);
          el.className = 'gl gs' + (k === focusK ? ' on' : '');
          el.textContent = t;
          el.style.fontSize = '';
          put(el, p.x, p.y);
          shown++;
        }
      }
    }
    if (!ok || reciting || !groupsOn) for (const g of groups) g.el.hidden = true;
    for (let k = n; k < pool.length; k++) if (pool[k].className !== 'gl off') pool[k].className = 'gl off';
  }

  function drawThread() {
    if (thread) { scene.remove(thread); thread.geometry.dispose(); thread = null; }
    if (focusV == null || vStart[focusV] < 0 || morph) return;
    const pts = [];
    for (let i = vStart[focusV]; i < vEnd[focusV]; i++) pts.push(wpos(i));
    if (pts.length < 2) return;
    thread = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), threadMat);
    scene.add(thread);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function centroid(v) {
    const P = layouts[layout], out = new THREE.Vector3();
    const a = vStart[v], b = vEnd[v];
    if (a < 0) return out;
    for (let i = a; i < b; i++) out.x += P[i * 3], out.y += P[i * 3 + 1], out.z += P[i * 3 + 2];
    return out.multiplyScalar(1 / (b - a));
  }

  // --- camera animation (eased flights) and smooth following (recitation)
  function animateTo(pos, target, ms = 1400) {
    anim = { t0: performance.now(), ms, p0: camera.position.clone(), p1: pos, c0: controls.target.clone(), c1: target };
    controls.autoRotate = false;
    follow = null;
  }
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let follow = null;   // { target: Vector3, dist }
  let userAt = 0;

  function flyToVerse(v, dist = 95) {
    const c = centroid(v);
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.lengthSq() < 0.5) dir.set(0, -0.7, 0.7);
    animateTo(c.clone().add(dir.multiplyScalar(dist)), c);
    ring.position.copy(c); ring.visible = true;
  }
  // frame a set of verses (the answer) so that all of them are in view
  function fitVerses(list) {
    if (!list.length) return;
    const pts = list.map(centroid), c = new THREE.Vector3();
    for (const p of pts) c.add(p);
    c.multiplyScalar(1 / pts.length);
    let r = 0; for (const p of pts) r = Math.max(r, p.distanceTo(c));
    const fov = camera.fov * Math.PI / 180, fit = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * camera.aspect));
    const dist = Math.min(2200, Math.max(140, (r * 1.25 + 30) / Math.sin(fit / 2)));
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.lengthSq() < 0.5) dir.set(0, -0.7, 0.7);
    animateTo(c.clone().add(dir.multiplyScalar(dist)), c, 1600);
    ring.visible = false;
  }

  // colours: map verse idx -> palette index (1..8)
  function highlightVerses(list, colorOf = () => 1) {
    highlighted = list.slice();
    hl.fill(0);
    // the surahs of the answer get a soft tint of their colour…
    const done = new Set();
    for (const v of list) {
      const k = colorOf(v) || 1, sk = suraIdxOfVerse[v];
      if (done.has(sk)) continue;
      done.add(sk);
      const S = suras[sk], a = vStart[S.first], b = vEnd[S.first + S.ayas - 1];
      for (let i = a; i < b; i++) hl[i] = 8 + k;
    }
    // …and their verses shine in it
    for (const v of list) { const k = colorOf(v) || 1; for (let i = vStart[v]; i < vEnd[v]; i++) hl[i] = k; }
    hlAttr.needsUpdate = true;
    dimTarget = list.length ? 0.6 : 0;
    drawPath();
  }
  let dimTarget = 0;

  function drawPath() {
    if (pathLine) { scene.remove(pathLine); pathLine.children.forEach(l => l.geometry.dispose()); pathLine = null; }
    if (highlighted.length < 2 || highlighted.length > 400) return;
    const sorted = highlighted.slice().sort((a, b) => a - b);
    const pts = sorted.map(centroid);
    // only between neighbouring verses: consecutive verses may lie on the two opposite arms of the galaxy,
    // and a line between them would cross the whole disc
    const runs = [[pts[0]]];
    for (let k = 1; k < pts.length; k++) {
      if (pts[k].distanceTo(pts[k - 1]) < 60) runs[runs.length - 1].push(pts[k]); else runs.push([pts[k]]);
    }
    pathLine = new THREE.Group();
    for (const run of runs) {
      if (run.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(run);
      pathLine.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(Math.min(1200, run.length * 14))), pathMat));
    }
    scene.add(pathLine);
  }

  function setGroups(list) {
    for (const g of groups) g.el.remove();
    groups = list.map(g => {
      const el = document.createElement('div');
      el.className = 'gans';
      el.style.setProperty('--c', g.color);
      el.innerHTML = `<b></b><span class="gans-a"></span>`;
      el.querySelector('b').textContent = g.title;
      const box = el.querySelector('.gans-a');
      g.verses.forEach((v, k) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = g.ayas[k];
        btn.title = `${g.title} ${g.ayas[k]}`;
        btn.onclick = (ev) => { ev.stopPropagation(); onLabelVerse && onLabelVerse(v); };
        box.appendChild(btn);
      });
      el.hidden = true;
      labelBox.appendChild(el);
      return { ...g, el };
    });
  }

  // extra layouts computed in the browser; each may carry its own home view
  const homes = [];
  // a reference view (start, ⌂, change of shape), stepped back on narrow portrait screens: the field of view
  // is fixed vertically, so without this a phone showed only the middle of the disc
  function refView(L) {
    const v = homes[L], target = v ? new THREE.Vector3(...v.target) : HOME.target.clone();
    const pos = v ? new THREE.Vector3(...v.pos) : HOME.pos.clone();
    const k = Math.min(2.9, Math.max(1, 1.6 / Math.max(0.3, camera.aspect)));
    return { pos: target.clone().add(pos.sub(target).multiplyScalar(k)), target };
  }
  { const r = refView(0); camera.position.copy(r.pos); controls.target.copy(r.target); }
  function addLayout(arr, view) { layouts.push(arr); homes[layouts.length - 1] = view || null; return layouts.length - 1; }
  // a layout computed in the browser replaces a precomputed one (galaxy.bin): same words, new positions
  function replaceLayout(L, arr, view) {
    if (!layouts[L] || arr.length !== layouts[L].length) return;
    layouts[L] = arr; homes[L] = view || homes[L] || null; suraMid[L] = null;
    if (L === layout && !morph) {
      const pa = geo.getAttribute('position'), pb = geo.getAttribute('position2');
      pa.array.set(arr); pb.array.set(arr); pa.needsUpdate = pb.needsUpdate = true;
      geo.computeBoundingSphere(); drawPath(); drawThread();
    }
  }
  function setLayout(L, moveCamera = true) {
    if (L === layout || !layouts[L]) return;
    if (moveCamera) { const r = refView(L); animateTo(r.pos, r.target, 2200); }
    controls.autoRotate = false;
    const posAttr = geo.getAttribute('position'), pos2 = geo.getAttribute('position2');
    posAttr.array.set(layouts[layout]); pos2.array.set(layouts[L]);
    posAttr.needsUpdate = pos2.needsUpdate = true;
    uniforms.uMix.value = 0;
    morph = { t0: performance.now(), to: L };
    drawThread();
  }

  function home() {
    ring.visible = false;
    const L = (morph ? morph.to : layout), r = refView(L);
    animateTo(r.pos, r.target, 1500);
    // the two galaxies turn slowly again; the other shapes stay still
    if (!homes[L] || L <= 1) setTimeout(() => { if (!follow && !anim) controls.autoRotate = true; }, 1600);
  }

  // --- picking
  const ray = new THREE.Raycaster(); ray.params.Points.threshold = 3;
  const mouse = new THREE.Vector2();
  let lastMove = 0, downAt = null;
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const d = camera.position.distanceTo(controls.target);
    ray.params.Points.threshold = Math.max(0.6, d / 160);
    const hits = ray.intersectObject(points);
    if (!hits.length) return null;
    // prefer highlighted words
    const h = hits.find(x => hl[x.index] > 0.5 && hl[x.index] < 8.5) || hits[0];
    return { word: h.index, verse: wordVerse[h.index], x: ev.clientX, y: ev.clientY };
  }
  canvas.addEventListener('pointermove', (ev) => {
    const now = performance.now();
    // no picking while dragging the galaxy (a ray against ~77k points costs several ms)
    if (ev.buttons || morph || now - lastMove < 90) return;
    lastMove = now;
    onHover && onHover(pick(ev));
  });
  canvas.addEventListener('pointerleave', () => onHover && onHover(null));
  canvas.addEventListener('pointerdown', (ev) => { downAt = { x: ev.clientX, y: ev.clientY }; controls.autoRotate = false; userAt = performance.now(); });
  canvas.addEventListener('wheel', () => { userAt = performance.now(); controls.autoRotate = false; }, { passive: true });
  canvas.addEventListener('pointerup', (ev) => {
    if (!downAt || Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 5) return;
    const p = pick(ev);
    if (p && onPick) onPick(p);
  });

  const clock = new THREE.Clock();
  let last = performance.now();
  const FOLLOW_DIST = 34;
  let slow = 0;
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now(), raw = now - last, dt = Math.min(0.1, raw / 1000);
    last = now;
    // slow frames for ~2 s while the page is visible → render at 1× (never back up during a visit)
    if (px > 1 && raw < 250) {
      slow = raw > 26 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 90) { px = 1; renderer.setPixelRatio(1); uniforms.uPx.value = 1; resize(); slow = 0; }
    }
    uniforms.uTime.value = clock.getElapsedTime();
    const dimGoal = reciting ? Math.max(dimTarget, 0.7) : dimTarget;
    uniforms.uDim.value += (dimGoal - uniforms.uDim.value) * (1 - Math.exp(-dt * 4));
    if (anim) {
      const t = Math.min(1, (now - anim.t0) / anim.ms), e = ease(t);
      camera.position.lerpVectors(anim.p0, anim.p1, e);
      controls.target.lerpVectors(anim.c0, anim.c1, e);
      if (t >= 1) anim = null;
    } else if (follow && now - userAt > 5000) {
      // critically damped glide: the target slides to the word, the distance eases to the reading zoom
      const k = 1 - Math.exp(-dt * 2.6);
      const offv = camera.position.clone().sub(controls.target);
      controls.target.lerp(follow.target, k);
      const len = offv.length() + (follow.dist - offv.length()) * (1 - Math.exp(-dt * 1.6));
      camera.position.copy(controls.target).add(offv.setLength(len));
    }
    if (morph) {
      const t = Math.min(1, (now - morph.t0) / 2200);
      uniforms.uMix.value = ease(t);
      if (t >= 1) {
        layout = morph.to; morph = null;
        const posAttr = geo.getAttribute('position');
        posAttr.array.set(layouts[layout]); posAttr.needsUpdate = true;
        uniforms.uMix.value = 0;
        geo.computeBoundingSphere();
        drawPath();
        drawThread();
      }
    }
    if (active.visible && activeI != null) {
      // the glow slides to the new word instead of jumping
      active.position.lerp(wpos(activeI, tmpV), 1 - Math.exp(-dt * 12));
    }
    if (ring.visible) ring.lookAt(camera.position);
    placeLabels(dt);
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  return {
    flyToVerse, fitVerses, highlightVerses, setGroups, setLayout, addLayout, replaceLayout, home,
    // the verse whose words are labelled and linked by a thread
    setFocusVerse(v) { focusV = v == null ? null : v; drawThread(); },
    // recitation: only the recited word is written; the field of stars dims
    setReciting(on) {
      reciting = !!on;
      if (!on) { follow = null; setTimeout(() => { if (!reciting) ring.visible = false; }, 50); }
    },
    // keep the recited word in the middle of the view, gliding smoothly from word to word
    // (paused for a few seconds after the visitor moves the camera)
    lookAtWord(i) {
      if (i == null || i < 0 || i >= N) return;
      const p = wpos(i);
      ring.position.copy(p); ring.visible = true;
      if (!follow) { follow = { target: p.clone(), dist: FOLLOW_DIST }; anim = null; controls.autoRotate = false; }
      else follow.target.copy(p);
    },
    get count() { return N; },
    // the recited word: a glowing sprite + its text in a luminous disc on the star
    setActiveWord(i, text = '') {
      if (i == null || i < 0 || i >= N) { active.visible = false; activeI = null; activeText = ''; return; }
      if (!active.visible) wpos(i, active.position);
      active.visible = true; activeI = i;
      const t = text || wordText(i) || '';
      if (t !== activeText) {
        activeText = t;
        pill.textContent = t;
        pill.classList.remove('pop'); void pill.offsetWidth; pill.classList.add('pop');
      }
    },
    zoom(f) {
      const offv = camera.position.clone().sub(controls.target);
      const len = Math.min(controls.maxDistance, Math.max(controls.minDistance, offv.length() * f));
      controls.autoRotate = false;
      userAt = performance.now();
      animateTo(controls.target.clone().add(offv.setLength(len)), controls.target.clone(), 600);
    },
    setNames(v) { namesOn = !!v; },
    setGroupsVisible(v) { groupsOn = !!v; },
    get layout() { return layout; },
    get autoRotate() { return controls.autoRotate; },
    setAutoRotate(v) { controls.autoRotate = v; },
    wordsOfVerse: (v) => [vStart[v], vEnd[v]],
    wordVerse,
    // long press on a touch screen (hover-dwell): the word under a point, and no click when the finger lifts
    pickAt: (x, y) => pick({ clientX: x, clientY: y }),
    cancelPick() { downAt = null; },
  };
}
