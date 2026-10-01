// «مثل نوره كمشكاة فيها مصباح، المصباح في زجاجة، الزجاجة كأنها كوكب دري… نور على نور» (24:35)
// The Mishkat lamp: a niche (مشكاة) holding a planet-like glass sphere (زجاجة كأنها كوكب دري)
// holding a bottle-shaped lamp (مصباح) holding the flame. Each layer lights up in turn,
// so the light is multiplied — "light upon light". An optional word slot shows the word
// being recited inside the bottle (in place of the flame), auto-fitted so even the
// longest words stay readable.
let uid = 0;

export function lampSVG({ size = 120, word = false, animated = true, title = 'Mishkat' } = {}) {
  const id = 'lmp' + (++uid);
  const anim = animated ? `
    .${id} .l1{animation:${id}a 4.8s ease-in-out infinite}
    .${id} .l2{animation:${id}a 4.8s ease-in-out infinite .6s}
    .${id} .l3{animation:${id}a 4.8s ease-in-out infinite 1.2s}
    .${id} .l4{animation:${id}a 4.8s ease-in-out infinite 1.8s}
    .${id} .flame{animation:${id}f 1.6s ease-in-out infinite alternate;transform-origin:60px 70px}
    @keyframes ${id}a{0%,100%{opacity:.35}35%{opacity:1}60%{opacity:.75}}
    @keyframes ${id}f{from{transform:scale(.94,1)}to{transform:scale(1.06,1.08)}}
    @media (prefers-reduced-motion:reduce){.${id} *{animation:none!important}}` : '';
  return `<svg class="lamp ${id}" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${title}">
  <defs>
    <radialGradient id="${id}h" cx="50%" cy="54%" r="50%"><stop offset="0" stop-color="#ffd66b" stop-opacity=".55"/><stop offset="1" stop-color="#ffd66b" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}s" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#fffaf0" stop-opacity=".95"/><stop offset=".35" stop-color="#ffe6a6" stop-opacity=".75"/><stop offset=".75" stop-color="#e9a73d" stop-opacity=".45"/><stop offset="1" stop-color="#8a5a12" stop-opacity=".35"/></radialGradient>
    <radialGradient id="${id}b" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#fffdf5"/><stop offset=".6" stop-color="#fff0c2"/><stop offset="1" stop-color="#ffd27a"/></radialGradient>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe39a"/><stop offset="1" stop-color="#d9962a"/></linearGradient>
    <linearGradient id="${id}n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2a4d"/><stop offset="1" stop-color="#0a1022"/></linearGradient>
  </defs>
  <style>${anim}</style>
  <!-- niche (مشكاة) -->
  <path d="M14 114 V54 C14 28 34 10 60 5 C86 10 106 28 106 54 V114 Z" fill="url(#${id}n)" stroke="url(#${id}g)" stroke-width="3.2" stroke-linejoin="round"/>
  <!-- light upon light: four halos, each one lighting up in turn -->
  <circle class="l4" cx="60" cy="64" r="46" fill="url(#${id}h)"/>
  <circle class="l3" cx="60" cy="64" r="36" fill="url(#${id}h)"/>
  <!-- chain -->
  <path d="M60 12 V22" stroke="url(#${id}g)" stroke-width="1.8"/>
  <!-- the planet-like glass sphere (كوكب دري) with an orbit ring -->
  <ellipse class="l3" cx="60" cy="64" rx="40" ry="9" fill="none" stroke="#ffe39a" stroke-opacity=".45" stroke-width="1.2" transform="rotate(-14 60 64)"/>
  <circle class="l2" cx="60" cy="64" r="32" fill="url(#${id}s)" stroke="#ffe39a" stroke-width="1.6"/>
  <path d="M33 56 Q60 49 87 56" stroke="#fff6dc" stroke-opacity=".28" stroke-width="1.2" fill="none"/>
  <path d="M31 70 Q60 78 89 70" stroke="#fff6dc" stroke-opacity=".22" stroke-width="1.2" fill="none"/>
  <!-- the lamp: a glass bottle (زجاجة) holding the flame (مصباح) -->
  <path class="l1" d="M52 34 h16 v7 c0 3 11 7 11 21 v13 c0 9 -8 13 -19 13 c-11 0 -19 -4 -19 -13 v-13 c0 -14 11 -18 11 -21 z"
        fill="url(#${id}b)" stroke="#fff3cf" stroke-width="1.4" opacity=".92"/>
  <rect x="50" y="30" width="20" height="5" rx="2" fill="url(#${id}g)"/>
  <g class="flames"><path class="flame" d="M60 54 C66 62 66 70 60 76 C54 70 54 62 60 54 Z" fill="#fff" opacity=".95"/>
    <path class="flame" d="M60 60 C63 65 63 70 60 73 C57 70 57 65 60 60 Z" fill="#ffb24a"/></g>
  ${word ? `<text class="lamp-word" x="60" y="73" text-anchor="middle" dominant-baseline="middle" font-family="Amiri Quran, Amiri, serif" font-size="13" fill="#3b2400"></text>` : ''}
  <!-- the blessed olive branches -->
  <g fill="#8fbf7a" opacity=".9"><path d="M30 108 C24 104 22 98 24 93 C30 96 32 102 30 108 Z"/><path d="M90 108 C96 104 98 98 96 93 C90 96 88 102 90 108 Z"/></g>
</svg>`;
}

// Put a word inside the bottle; long words are compressed to fit, never cut.
export function setLampWord(svgRoot, word) {
  const t = svgRoot && svgRoot.querySelector('.lamp-word');
  if (!t) return;
  // the flame burns while no word is shown; the recited word takes its place in the bottle
  const f = svgRoot.querySelector('.flames');
  if (f) f.style.opacity = word ? '0' : '1';
  t.textContent = word || '';
  t.removeAttribute('textLength');
  t.removeAttribute('lengthAdjust');
  t.setAttribute('font-size', '16');
  if (!word) return;
  try {
    const w = t.getComputedTextLength();
    const maxW = 50; // glowing text may spread over the glass sphere around the bottle
    if (w > maxW) {
      const fs = Math.max(8, 16 * maxW / w);
      t.setAttribute('font-size', fs.toFixed(1));
      if (t.getComputedTextLength() > maxW) { t.setAttribute('textLength', maxW); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    }
  } catch (e) { t.setAttribute('textLength', 50); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
}
