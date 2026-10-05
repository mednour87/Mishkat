// injected by tools/ui_shots.mjs (scenario «contrast»): visible text whose colour is too close to its background
(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const mix = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  function bgOf(el) {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) return null;
      const g = /gradient/.test(cs.backgroundImage) ? (cs.backgroundImage.match(/rgba?\([^)]+\)/) || [])[0] : null;
      const c = parse(g || cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 0.95) break; }
      if (e.id === 'gzone' || e.tagName === 'CANVAS') return null;   // over the galaxy (night): not judged here
    }
    let bg = { r: 5, g: 7, b: 13, a: 1 };
    const body = parse(getComputedStyle(document.body).backgroundColor); if (body && body.a > 0.5) bg = body;
    for (let k = layers.length - 1; k >= 0; k--) bg = mix(layers[k], bg);
    return bg;
  }
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode, el = t.parentElement;
    if (!el || seen.has(el) || !t.textContent.trim()) continue;
    seen.add(el);
    if (el.closest('#gzone, #intro, #lampMap, #engMap, .gl, [hidden], option, script, style')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity < 0.2 || cs.color === 'transparent' || /text/.test(cs.webkitBackgroundClip || '')) continue;
    const fg = parse(cs.color), bg = bgOf(el);
    if (!fg || !bg) continue;
    const f = mix(fg, bg), L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const big = parseFloat(cs.fontSize) >= 24;
    if (ratio < (big ? 2.4 : 3.2)) out.push(`${ratio.toFixed(2)} ${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} «${t.textContent.trim().slice(0, 30)}»`);
  }
  return out;
})()
