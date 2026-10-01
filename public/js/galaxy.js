// The Quran galaxy — 77,433 words as glowing points (three.js / WebGL).
// Layout A: Mushaf order along a two-armed spiral (Al-Fatiha at the core).
// Layout B: the same words ordered by the revelation order of the suras.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

const CLASS_COLORS = [null, '#FFD66B', '#5EE6A0', '#8FD3FF', '#B98CFF'];
const MECCAN = new THREE.Color('#F3D9A4');
const MEDINAN = new THREE.Color('#8EC5F0');

const VERT = /* glsl */`
  attribute vec3 position2;
  attribute vec3 color;
  attribute float hl;
  attribute float size;
  uniform float uMix, uPx, uDim, uTime;
  varying vec3 vColor;
  varying float vHl;
  void main() {
    vec3 p = mix(position, position2, uMix);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float pulse = hl > 0.5 ? 1.0 + 0.25 * sin(uTime * 3.0 + p.x * 0.05) : 1.0;
    gl_PointSize = min(64.0, size * uPx * pulse * (hl > 0.5 ? 2.4 : 1.0) * (380.0 / -mv.z));
    gl_Position = projectionMatrix * mv;
    vColor = color;
    vHl = hl;
  }`;
const FRAG = /* glsl */`
  uniform float uDim;
  varying vec3 vColor;
  varying float vHl;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float a = pow(core, 1.6);
    vec3 gold = vec3(1.0, 0.82, 0.42);
    vec3 col = vHl > 0.5 ? mix(vColor, gold, 0.7) * 1.7 : vColor * mix(1.05, 0.16, uDim);
    gl_FragColor = vec4(col, a * (vHl > 0.5 ? 1.0 : mix(0.9, 0.4, uDim)));
  }`;

export async function createGalaxy(canvas, { binUrl, suras, onHover, onPick }) {
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

  const colors = new Float32Array(N * 3), sizes = new Float32Array(N), hl = new Float32Array(N);
  const tmp = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const c = cls[i];
    if (c) tmp.set(CLASS_COLORS[c]);
    else tmp.copy(suraType[wordVerse[i]] ? MEDINAN : MECCAN).multiplyScalar(0.72 + 0.28 * Math.random());
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    sizes[i] = c ? 3.4 : 2.1 + Math.random() * 1.1;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  const px = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(px);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 1, 8000);
  const HOME = { pos: new THREE.Vector3(0, -900, 780), target: new THREE.Vector3(0, 0, 0) };
  camera.position.copy(HOME.pos);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 25; controls.maxDistance = 2600;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.35;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(layouts[0].slice(), 3));
  geo.setAttribute('position2', new THREE.BufferAttribute(layouts[0].slice(), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const hlAttr = new THREE.BufferAttribute(hl, 1); hlAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('hl', hlAttr);
  geo.computeBoundingSphere();
  const uniforms = { uMix: { value: 0 }, uPx: { value: px }, uDim: { value: 0 }, uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // faint background stars
  {
    const n = 2500, sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 2500 + Math.random() * 2000, t = Math.random() * Math.PI * 2, u = Math.acos(2 * Math.random() - 1);
      sp[i * 3] = r * Math.sin(u) * Math.cos(t); sp[i * 3 + 1] = r * Math.sin(u) * Math.sin(t); sp[i * 3 + 2] = r * Math.cos(u);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.4, color: 0x8899bb, transparent: true, opacity: 0.55, sizeAttenuation: false })));
  }

  // golden path linking highlighted verses (Mushaf order)
  const pathMat = new THREE.LineBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending });
  let pathLine = null;
  // selection ring
  const ringGeo = new THREE.RingGeometry(5.2, 5.6, 64);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  ring.visible = false; scene.add(ring);
  // glowing sprite on the word currently being recited
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,224,138,.95)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const active = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  active.scale.set(9, 9, 1); active.visible = false; scene.add(active);

  let layout = 0;
  let highlighted = [];
  // floating Arabic labels for the words of the focused verse
  const labelBox = document.createElement('div');
  labelBox.className = 'labels';
  canvas.parentNode.appendChild(labelBox);
  let labels = [];
  const v3 = new THREE.Vector3();
  // one floating card with the verse text, anchored to the verse cluster
  let labelVerse = null, cardOn = true;
  function showLabels(v, words, text, title) {
    labelBox.innerHTML = ''; labels = []; labelVerse = v;
    if (v == null || !text) return;
    const el = document.createElement('div');
    el.className = 'vcard';
    el.innerHTML = `<div class="t"></div><div class="a"></div>`;
    el.querySelector('.t').textContent = title || '';
    el.querySelector('.a').textContent = text;
    labelBox.appendChild(el);
    labels.push({ el });
  }
  function placeLabels() {
    if (!labels.length || labelVerse == null) return;
    const d = camera.position.distanceTo(controls.target);
    const vis = cardOn && !morph && !anim && d < 400;
    labelBox.style.opacity = vis ? 1 : 0;
    if (!vis) return;
    const c = centroid(labelVerse).project(camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const { el } = labels[0];
    el.style.display = c.z > 1 ? 'none' : '';
    let x = (c.x * 0.5 + 0.5) * w;
    const y = (-c.y * 0.5 + 0.5) * h;
    // keep the card inside the free area (not under the side panel)
    const half = el.offsetWidth / 2 + 8;
    let lo = half, hi = w - half;
    const panel = document.getElementById('panel');
    if (panel && !panel.hidden) {
      const r = panel.getBoundingClientRect();
      if (r.left < w / 2) lo = Math.max(lo, r.right + half); else hi = Math.min(hi, r.left - half);
    }
    if (lo < hi) x = Math.min(hi, Math.max(lo, x));
    // never under the header / search bar
    const head = document.getElementById('top');
    const minY = (head ? head.getBoundingClientRect().bottom : 0) + el.offsetHeight + 34;
    if (y < minY) { el.style.display = 'none'; return; }
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, calc(-100% - 26px))`;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function centroid(v) {
    const P = layouts[layout], out = new THREE.Vector3();
    const a = vStart[v], b = vEnd[v];
    if (a < 0) return out;
    for (let i = a; i < b; i++) out.add(new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
    return out.multiplyScalar(1 / (b - a));
  }

  // --- camera animation
  let anim = null;
  function animateTo(pos, target, ms = 1400) {
    anim = { t0: performance.now(), ms, p0: camera.position.clone(), p1: pos, c0: controls.target.clone(), c1: target };
    controls.autoRotate = false;
  }
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function flyToVerse(v, dist = 95) {
    const c = centroid(v);
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.lengthSq() < 0.5) dir.set(0, -0.7, 0.7);
    animateTo(c.clone().add(dir.multiplyScalar(dist)), c);
    ring.position.copy(c); ring.visible = true;
  }

  function highlightVerses(list) {
    highlighted = list.slice();
    hl.fill(0);
    for (const v of list) for (let i = vStart[v]; i < vEnd[v]; i++) hl[i] = 1;
    hlAttr.needsUpdate = true;
    uniforms.uDim.value = list.length ? 1 : 0;
    drawPath();
  }

  function drawPath() {
    if (pathLine) { scene.remove(pathLine); pathLine.geometry.dispose(); pathLine = null; }
    if (highlighted.length < 2 || highlighted.length > 400) return;
    const sorted = highlighted.slice().sort((a, b) => a - b);
    const pts = sorted.map(centroid);
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.BufferGeometry().setFromPoints(curve.getPoints(Math.min(1200, pts.length * 14)));
    pathLine = new THREE.Line(g, pathMat);
    scene.add(pathLine);
  }

  // extra layouts computed in the browser (e.g. the word "قرآن" in 3D); each may carry its own home view
  const homes = [];
  function addLayout(arr, view) { layouts.push(arr); homes[layouts.length - 1] = view || null; return layouts.length - 1; }
  function setLayout(L) {
    if (L === layout || !layouts[L]) return;
    const v = homes[L];
    if (v) animateTo(new THREE.Vector3(...v.pos), new THREE.Vector3(...v.target), 2200);
    else animateTo(HOME.pos.clone(), HOME.target.clone(), 2200);
    controls.autoRotate = false;
    const posAttr = geo.getAttribute('position'), pos2 = geo.getAttribute('position2');
    posAttr.array.set(layouts[layout]); pos2.array.set(layouts[L]);
    posAttr.needsUpdate = pos2.needsUpdate = true;
    uniforms.uMix.value = 0;
    morph = { t0: performance.now(), to: L };
  }
  let morph = null;

  function home() {
    ring.visible = false; showLabels(null);
    const target = (morph ? morph.to : layout);
    const v = homes[target];
    if (v) { animateTo(new THREE.Vector3(...v.pos), new THREE.Vector3(...v.target), 1500); return; }
    animateTo(HOME.pos.clone(), HOME.target.clone(), 1500);
    setTimeout(() => { controls.autoRotate = true; }, 1600);
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
    ray.params.Points.threshold = Math.max(0.8, d / 160);
    const hits = ray.intersectObject(points);
    if (!hits.length) return null;
    // prefer highlighted words
    const h = hits.find(x => hl[x.index] > 0.5) || hits[0];
    return { word: h.index, verse: wordVerse[h.index], x: ev.clientX, y: ev.clientY };
  }
  canvas.addEventListener('pointermove', (ev) => {
    const now = performance.now();
    if (morph || now - lastMove < 70) return;
    lastMove = now;
    onHover && onHover(pick(ev));
  });
  canvas.addEventListener('pointerdown', (ev) => { downAt = { x: ev.clientX, y: ev.clientY }; controls.autoRotate = false; });
  canvas.addEventListener('pointerup', (ev) => {
    if (!downAt || Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 5) return;
    const p = pick(ev);
    if (p && onPick) onPick(p);
  });

  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    uniforms.uTime.value = clock.getElapsedTime();
    if (anim) {
      const t = Math.min(1, (now - anim.t0) / anim.ms), e = ease(t);
      camera.position.lerpVectors(anim.p0, anim.p1, e);
      controls.target.lerpVectors(anim.c0, anim.c1, e);
      if (t >= 1) anim = null;
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
      }
    }
    if (ring.visible) ring.lookAt(camera.position);
    placeLabels();
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  return {
    flyToVerse, highlightVerses, setLayout, addLayout, home, showLabels,
    // keep the recited word in the middle of the view, gliding from word to word
    lookAtWord(i) {
      if (i == null || i < 0 || i >= N) return;
      const P = layouts[layout];
      const p = new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      const off = camera.position.clone().sub(controls.target);
      if (off.length() > 150) off.setLength(150);
      if (off.length() < 40) off.setLength(60);
      animateTo(p.clone().add(off), p, 650);
      ring.position.copy(p); ring.visible = true;
    },
    get count() { return N; },
    setCardVisible(v) { cardOn = v; if (!v) labelBox.style.opacity = 0; },
    setActiveWord(i) {
      if (i == null || i < 0 || i >= N) { active.visible = false; return; }
      const P = layouts[layout];
      active.position.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      active.visible = true;
    },
    get layout() { return layout; },
    setAutoRotate(v) { controls.autoRotate = v; },
    wordsOfVerse: (v) => [vStart[v], vEnd[v]],
    wordVerse,
  };
}
