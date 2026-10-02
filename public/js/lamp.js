// «مثل نوره كمشكاة فيها مصباح، المصباح في زجاجة، الزجاجة كأنها كوكب دري، يوقد من شجرة
// مباركة زيتونة لا شرقية ولا غربية، يكاد زيتها يضيء ولو لم تمسسه نار، نور على نور» (24:35)
// Drawn after the tafsir of As-Sa'di:
//   المشكاة  = a niche («كوّة») that gathers the light so that it does not scatter — drawn as a mihrab arch;
//   الزجاجة = the clear glass vessel (a mosque lamp: flared neck, round body, small foot),
//             shining «كأنها كوكب دري» — eight rays of a brilliant, pearl-white star;
//   الزيت    = the olive oil filling the glass, glowing by itself «ولو لم تمسسه نار» — so no flame is drawn;
//   الشجرة  = a small olive sprig (lanceolate leaves, two olives), centred: «لا شرقية ولا غربية»;
//   نور على نور = three stacked halos and a glow filter, light layered upon light.
// public/img/logo.svg is the same drawing as a static file (favicon, header).
// An optional word slot shows the word being recited inside the glass, auto-fitted so even
// the longest words stay readable.
let uid = 0;

export function lampSVG({ size = 120, word = false, animated = true, title = 'Mishkat' } = {}) {
  const id = 'lmp' + (++uid);
  const anim = animated ? `
    .${id} .h1{animation:${id}a 4.6s ease-in-out infinite}
    .${id} .h2{animation:${id}a 4.6s ease-in-out infinite 1.5s}
    .${id} .oil{animation:${id}a 3.2s ease-in-out infinite .6s}
    .${id} .star{animation:${id}s 3.6s ease-in-out infinite;transform-origin:60px 58px}
    @keyframes ${id}a{0%,100%{opacity:.7}50%{opacity:1}}
    @keyframes ${id}s{0%,100%{opacity:.75;transform:scale(.95) rotate(0)}50%{opacity:1;transform:scale(1.05) rotate(4deg)}}
    @media (prefers-reduced-motion:reduce){.${id} *{animation:none!important}}` : '';
  return `<svg class="lamp ${id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${title}">
  <defs>
    <!-- light upon light: three stacked halos (brightness x3) -->
    <radialGradient id="${id}h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fffbe6" stop-opacity="1"/><stop offset=".3" stop-color="#ffe9a3" stop-opacity=".75"/><stop offset=".65" stop-color="#ffcf5c" stop-opacity=".28"/><stop offset="1" stop-color="#ffcf5c" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}k" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#fff6d2" stop-opacity=".9"/><stop offset="1" stop-color="#fff6d2" stop-opacity="0"/></radialGradient>
    <!-- the glass (زجاجة): clear, catching the light -->
    <linearGradient id="${id}v" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff8e0" stop-opacity=".55"/><stop offset=".35" stop-color="#ffffff" stop-opacity=".18"/><stop offset=".7" stop-color="#fff3cc" stop-opacity=".1"/><stop offset="1" stop-color="#ffe7a6" stop-opacity=".5"/></linearGradient>
    <!-- the olive oil «يكاد زيتها يضيء ولو لم تمسسه نار»: it glows by itself, no flame -->
    <linearGradient id="${id}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a8"/><stop offset=".3" stop-color="#f0cc36"/><stop offset=".72" stop-color="#c49c12"/><stop offset="1" stop-color="#7f7d16"/></linearGradient>
    <radialGradient id="${id}c" cx="50%" cy="40%" r="55%"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff4b0" stop-opacity=".55"/><stop offset="1" stop-color="#fff4b0" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="#f0c45a"/><stop offset="1" stop-color="#b8862a"/></linearGradient>
    <linearGradient id="${id}n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14203f"/><stop offset="1" stop-color="#060a18"/></linearGradient>
    <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fbf7e"/><stop offset="1" stop-color="#5d8545"/></linearGradient>
    <filter id="${id}f" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="${id}b"><path d="M54.5 37 C42 40 36.5 50 37.5 61 C38.5 71 46 78.5 54 79.5 L66 79.5 C74 78.5 81.5 71 82.5 61 C83.5 50 78 40 65.5 37 Z"/></clipPath>
  </defs>
  <style>${anim}</style>

  <!-- the niche (مشكاة) — a pointed mihrab arch with a double gold line -->
  <path d="M13 115 V55 C13 29 34 10 60 4 C86 10 107 29 107 55 V115 Z" fill="url(#${id}n)" stroke="url(#${id}g)" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M18.5 112 V56 C18.5 33 37 17 60 11 C83 17 101.5 33 101.5 56 V112" fill="none" stroke="#f0c45a" stroke-width=".7" opacity=".55"/>
  <!-- slender columns of the mihrab: capitals and bases -->
  <g fill="#e8bd55" opacity=".9"><rect x="16.6" y="54" width="4" height="1.6" rx=".5"/><rect x="99.4" y="54" width="4" height="1.6" rx=".5"/>
    <rect x="16.6" y="109.5" width="4" height="1.6" rx=".5"/><rect x="99.4" y="109.5" width="4" height="1.6" rx=".5"/></g>
  <path d="M14.5 113.5 H105.5" stroke="url(#${id}g)" stroke-width="1" opacity=".8"/>

  <!-- «نور على نور»: the light filling the niche -->
  <circle class="h1" cx="60" cy="58" r="47" fill="url(#${id}h)"/>
  <circle class="h2" cx="60" cy="60" r="32" fill="url(#${id}h)"/>
  <circle cx="60" cy="62" r="20" fill="url(#${id}k)"/>

  <!-- «كأنها كوكب دري»: the glass shines like a brilliant star — eight rays -->
  <g class="star" filter="url(#${id}f)">
    <path d="M60 14 L62 52 L60 58 L58 52 Z M60 102 L58 64 L60 58 L62 64 Z M16 58 L54 56 L60 58 L54 60 Z M104 58 L66 60 L60 58 L66 56 Z" fill="#fffdf2"/>
    <path d="M30 28 L56 54 L60 58 L54 56 Z M90 28 L64 54 L60 58 L66 56 Z M30 88 L56 62 L60 58 L54 60 Z M90 88 L64 62 L60 58 L66 60 Z" fill="#fff1c2" opacity=".85"/>
  </g>

  <!-- chains to the top of the niche -->
  <path d="M50 22.5 L60 9 L70 22.5" fill="none" stroke="url(#${id}g)" stroke-width="1.1" stroke-dasharray="2 1.2"/>

  <!-- the glass vessel: flared neck, round body, small foot (a mosque lamp) -->
  <g filter="url(#${id}f)">
    <g clip-path="url(#${id}b)">
      <!-- olive oil fills most of the glass -->
      <rect class="oil" x="34" y="47" width="52" height="36" fill="url(#${id}o)"/>
      <ellipse class="oil" cx="60" cy="59" rx="14" ry="9" fill="url(#${id}c)" opacity=".85"/>
      <path d="M36 47.2 Q60 44.6 84 47.2" fill="none" stroke="#ffffff" stroke-width="1.1" opacity=".95"/>
    </g>
    <path d="M47.5 22.5 H72.5 C70 28 66 31.5 65.5 37 C78 40 83.5 50 82.5 61 C81.5 71 74 78.5 66 79.5 L68.5 85 H51.5 L54 79.5 C46 78.5 38.5 71 37.5 61 C36.5 50 42 40 54.5 37 C54 31.5 50 28 47.5 22.5 Z"
          fill="url(#${id}v)" stroke="#fff4cf" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- reflections on the glass -->
    <path d="M44 50 C41.5 55 41.5 63 44.5 69" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity=".95"/>
    <path d="M53 25.5 C54.5 29 56 31.5 56.5 35" fill="none" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity=".8"/>
    <path d="M51 85 H69" stroke="url(#${id}g)" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M47 22.5 H73" stroke="url(#${id}g)" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <circle cx="74" cy="47" r="1.3" fill="#ffffff"/>
  ${word ? `<text class="lamp-word" x="60" y="63" text-anchor="middle" dominant-baseline="middle" font-family="Amiri Quran, Amiri, serif" font-size="15" fill="#3b2400"></text>` : ''}

  <!-- a small olive sprig, centred: «لا شرقية ولا غربية» -->
  <g transform="translate(60 101)">
    <path d="M-18 4 Q0 -3 18 4" fill="none" stroke="#c9a253" stroke-width="1.1" stroke-linecap="round"/>
    <g fill="url(#${id}l)" stroke="#d8e6c4" stroke-width=".35">
      <path d="M0 0 C3.5 -2 9 -2 12 0 C9 2 3.5 2 0 0 Z" transform="translate(-14 1.8) rotate(-38)"/>
      <path d="M0 0 C3.5 -2 9 -2 12 0 C9 2 3.5 2 0 0 Z" transform="translate(-6 -.6) rotate(-62)"/>
      <path d="M0 0 C3.5 -2 9 -2 12 0 C9 2 3.5 2 0 0 Z" transform="translate(6 -.6) rotate(-118)"/>
      <path d="M0 0 C3.5 -2 9 -2 12 0 C9 2 3.5 2 0 0 Z" transform="translate(14 1.8) rotate(-142)"/>
      <path d="M0 0 C3 -1.7 7.5 -1.7 10 0 C7.5 1.7 3 1.7 0 0 Z" transform="translate(-10 1.8) rotate(28)"/>
      <path d="M0 0 C3 -1.7 7.5 -1.7 10 0 C7.5 1.7 3 1.7 0 0 Z" transform="translate(10 1.8) rotate(152)"/>
    </g>
    <ellipse cx="-3" cy="3.6" rx="1.9" ry="2.4" fill="#5b6e2a" stroke="#d6c26a" stroke-width=".4"/>
    <ellipse cx="3" cy="3.6" rx="1.9" ry="2.4" fill="#5b6e2a" stroke="#d6c26a" stroke-width=".4"/>
    <circle cx="-3.6" cy="2.7" r=".5" fill="#fff"/><circle cx="2.4" cy="2.7" r=".5" fill="#fff"/>
  </g>
</svg>`;
}

// Put a word inside the glass, over the glowing oil; long words are compressed to fit, never cut.
export function setLampWord(svgRoot, word) {
  const t = svgRoot && svgRoot.querySelector('.lamp-word');
  if (!t) return;
  t.textContent = word || '';
  t.removeAttribute('textLength');
  t.removeAttribute('lengthAdjust');
  t.setAttribute('font-size', '15');
  if (!word) return;
  const maxW = 38; // the inside of the glass body
  try {
    const w = t.getComputedTextLength();
    if (w > maxW) {
      const fs = Math.max(8, 15 * maxW / w);
      t.setAttribute('font-size', fs.toFixed(1));
      if (t.getComputedTextLength() > maxW) { t.setAttribute('textLength', maxW); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    }
  } catch (e) { t.setAttribute('textLength', maxW); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
}
