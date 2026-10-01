// «مثل نوره كمشكاة فيها مصباح، المصباح في زجاجة، الزجاجة كأنها كوكب دري، يوقد من شجرة
// مباركة زيتونة لا شرقية ولا غربية، يكاد زيتها يضيء ولو لم تمسسه نار، نور على نور» (24:35)
// Drawn after the tafsir of As-Sa'di:
//   المشكاة  = a niche («كوّة») that gathers the lamp's light so that it does not scatter;
//   المصباح = the lamp (wick and flame), and it is INSIDE the glass;
//   الزجاجة = the clear glass, shining «كأنها كوكب دري» — like a brilliant, pearl-white star
//             (a star with glints, not a planet);
//   الزيت    = the olive oil in the glass, so pure that it almost shines by itself;
//   الشجرة  = the blessed olive tree, in the middle («لا شرقية ولا غربية»), whose oil feeds the lamp;
//   نور على نور = the light of the oil and the light of the flame, layer upon layer.
// An optional word slot shows the word being recited inside the glass (in place of the
// flame), auto-fitted so even the longest words stay readable.
let uid = 0;

export function lampSVG({ size = 120, word = false, animated = true, title = 'Mishkat' } = {}) {
  const id = 'lmp' + (++uid);
  const anim = animated ? `
    .${id} .l1{animation:${id}a 4.8s ease-in-out infinite}
    .${id} .l2{animation:${id}a 4.8s ease-in-out infinite .8s}
    .${id} .l3{animation:${id}a 4.8s ease-in-out infinite 1.6s}
    .${id} .glint{animation:${id}g 3.2s ease-in-out infinite;transform-origin:60px 60px}
    .${id} .flame{animation:${id}f 1.6s ease-in-out infinite alternate;transform-origin:60px 64px}
    @keyframes ${id}a{0%,100%{opacity:.45}40%{opacity:1}65%{opacity:.8}}
    @keyframes ${id}g{0%,100%{opacity:.55;transform:scale(.94)}50%{opacity:1;transform:scale(1.04)}}
    @keyframes ${id}f{from{transform:scale(.93,1)}to{transform:scale(1.06,1.09)}}
    @media (prefers-reduced-motion:reduce){.${id} *{animation:none!important}}` : '';
  return `<svg class="lamp ${id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${title}">
  <defs>
    <radialGradient id="${id}h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".45" stop-color="#ffd66b" stop-opacity=".42"/><stop offset="1" stop-color="#ffd66b" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}s" cx="45%" cy="40%" r="62%"><stop offset="0" stop-color="#fffef6"/><stop offset=".5" stop-color="#fff1c9" stop-opacity=".92"/><stop offset="1" stop-color="#f2c96a" stop-opacity=".7"/></radialGradient>
    <linearGradient id="${id}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#d48f1f"/></linearGradient>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe39a"/><stop offset="1" stop-color="#d9962a"/></linearGradient>
    <linearGradient id="${id}n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2a4d"/><stop offset="1" stop-color="#0a1022"/></linearGradient>
    <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="${id}c"><circle cx="60" cy="60" r="23"/></clipPath>
  </defs>
  <style>${anim}</style>
  <!-- the niche (مشكاة): gathers the light so that it does not scatter -->
  <path d="M14 114 V54 C14 28 34 10 60 5 C86 10 106 28 106 54 V114 Z" fill="url(#${id}n)" stroke="url(#${id}g)" stroke-width="3.2" stroke-linejoin="round"/>
  <!-- light upon light: the halo of the whole lamp -->
  <circle class="l3" cx="60" cy="60" r="44" fill="url(#${id}h)"/>
  <!-- chain holding the glass -->
  <path d="M60 9 V31" stroke="url(#${id}g)" stroke-width="1.6" stroke-dasharray="2.2 1.4"/>
  <!-- the glass «كأنها كوكب دري»: a brilliant star — four long glints and four short ones -->
  <g class="glint">
    <path d="M58.6 18 L60 4 L61.4 18 Z M58.6 102 L60 116 L61.4 102 Z" fill="url(#${id}r)" opacity=".85"/>
    <path d="M18 58.6 L4 60 L18 61.4 Z M102 58.6 L116 60 L102 61.4 Z" fill="#fff" opacity=".55"/>
    <path d="M33 33 L28 28 L35 31 Z M87 33 L92 28 L85 31 Z M33 87 L28 92 L35 89 Z M87 87 L92 92 L85 89 Z" fill="#fff6dc" opacity=".8"/>
  </g>
  <!-- the glass vessel (زجاجة) with its neck -->
  <rect x="54" y="31" width="12" height="7" rx="2" fill="url(#${id}g)"/>
  <circle cx="60" cy="60" r="23" fill="url(#${id}s)" stroke="#fff6dc" stroke-width="1.4"/>
  <circle class="l1" cx="60" cy="58" r="15" fill="#fffbe8" opacity=".6"/>
  <!-- the pure olive oil in the glass «يكاد زيتها يضيء» -->
  <g clip-path="url(#${id}c)"><rect class="l2" x="36" y="68" width="48" height="18" fill="url(#${id}o)" opacity=".9"/>
    <path d="M37 68 Q60 65.5 83 68" stroke="#fff3c4" stroke-width="1" fill="none" opacity=".8"/></g>
  <!-- the lamp (مصباح) inside the glass: wick holder and flame -->
  <path d="M52 66.5 Q60 72 68 66.5 Z" fill="#c98a22" stroke="#ffe39a" stroke-width=".8"/>
  <g class="flames"><path class="flame" d="M60 45 C67 54 67 61 60 66 C53 61 53 54 60 45 Z" fill="#ffc94d" stroke="#e8912a" stroke-width=".6"/>
    <path class="flame" d="M60 52 C63.5 57 63.5 61.5 60 64 C56.5 61.5 56.5 57 60 52 Z" fill="#ff7a1a"/></g>
  ${word ? `<text class="lamp-word" x="60" y="58" text-anchor="middle" dominant-baseline="middle" font-family="Amiri Quran, Amiri, serif" font-size="13" fill="#3b2400"></text>` : ''}
  <!-- the blessed olive tree, in the middle: neither of the east nor of the west -->
  <path d="M60 113 V86" stroke="#8a6a3a" stroke-width="2.2" stroke-linecap="round"/>
  <g fill="#8fbf7a" stroke="#5f8f4c" stroke-width=".5">
    <ellipse cx="51" cy="93" rx="7.5" ry="2.4" transform="rotate(-24 51 93)"/><ellipse cx="69" cy="93" rx="7.5" ry="2.4" transform="rotate(24 69 93)"/>
    <ellipse cx="47" cy="99" rx="7" ry="2.2" transform="rotate(-8 47 99)"/><ellipse cx="73" cy="99" rx="7" ry="2.2" transform="rotate(8 73 99)"/>
    <ellipse cx="55" cy="88.5" rx="6" ry="2" transform="rotate(-48 55 88.5)"/><ellipse cx="65" cy="88.5" rx="6" ry="2" transform="rotate(48 65 88.5)"/>
    <ellipse cx="53" cy="104" rx="5.5" ry="1.9" transform="rotate(-16 53 104)"/><ellipse cx="67" cy="104" rx="5.5" ry="1.9" transform="rotate(16 67 104)"/></g>
  <g fill="#4c6b33"><circle cx="56" cy="96" r="1.7"/><circle cx="64" cy="96" r="1.7"/><circle cx="60" cy="101" r="1.6"/></g>
  <!-- its oil rises to the lamp -->
  <path class="l2" d="M60 86 V83.2" stroke="#ffd66b" stroke-width="1.2" stroke-dasharray="1.5 1.5" opacity=".8"/>
</svg>`;
}

// Put a word inside the glass, in place of the flame; long words are compressed to fit, never cut.
export function setLampWord(svgRoot, word) {
  const t = svgRoot && svgRoot.querySelector('.lamp-word');
  if (!t) return;
  const f = svgRoot.querySelector('.flames');
  if (f) f.style.opacity = word ? '0' : '1';
  t.textContent = word || '';
  t.removeAttribute('textLength');
  t.removeAttribute('lengthAdjust');
  t.setAttribute('font-size', '15');
  if (!word) return;
  const maxW = 42; // the inside of the glass
  try {
    const w = t.getComputedTextLength();
    if (w > maxW) {
      const fs = Math.max(8, 15 * maxW / w);
      t.setAttribute('font-size', fs.toFixed(1));
      if (t.getComputedTextLength() > maxW) { t.setAttribute('textLength', maxW); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    }
  } catch (e) { t.setAttribute('textLength', maxW); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
}
