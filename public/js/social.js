// (6 Oct, T118) Mishkat's official pages (YouTube, Facebook): one list for the menu drawer, the About window and the
// useful links. Links only — no embedded widget, no tracking script, nothing loaded from these sites.
export const SOCIAL = [
  { id: 'youtube', url: 'https://www.youtube.com/@mishketquran', ar: 'يوتيوب', en: 'YouTube',
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor"/><path d="M10 9l5 3-5 3z" fill="var(--bg,#05070d)"/></svg>' },
  { id: 'facebook', url: 'https://www.facebook.com/profile.php?id=61594931830065', ar: 'فيسبوك', en: 'Facebook',
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M13.2 19v-6h2l.3-2.4h-2.3V9.2c0-.7.2-1.2 1.2-1.2h1.2V5.9c-.2 0-.9-.1-1.8-.1-1.8 0-3 1.1-3 3.1v1.7h-2V13h2v6z" fill="var(--bg,#05070d)"/></svg>' },
];

// a row of links (icon + name); the name is said to a screen reader, the address opens in a new tab
export function socialHTML(lang = 'ar', esc = (s) => s) {
  const lead = lang === 'en' ? 'Follow Mishkat' : 'تابِع مشكاة';
  return `<div class="social" role="group" aria-label="${esc(lead)}">${SOCIAL.map(s =>
    `<a class="soc soc-${s.id}" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc((lang === 'en' ? s.en : s.ar) + ' — ' + lead)}">${s.svg}<span>${esc(lang === 'en' ? s.en : s.ar)}</span></a>`).join('')}</div>`;
}
