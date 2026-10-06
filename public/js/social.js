// Mishkat's official pages, for the menu drawer, the About window and the useful links.
// Links only: no embedded widget, no script and nothing loaded from these sites.
// The icons are drawn in the current text colour (the hole of each shape is cut out, so they read on a dark or a
// light theme alike); the CSS gives each one a brand tint suited to the theme.
const svg = (d, { stroke = false } = {}) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">${stroke
  ? `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`
  : `<path d="${d}" fill="currentColor" fill-rule="evenodd"/>`}</svg>`;

export const SOCIAL = [
  { id: 'youtube', url: 'https://www.youtube.com/@mishketquran', ar: 'يوتيوب', en: 'YouTube',
    icon: svg('M3 7.6C3 6.1 4.1 5 5.6 5h12.8C19.9 5 21 6.1 21 7.6v8.8c0 1.5-1.1 2.6-2.6 2.6H5.6C4.1 19 3 17.9 3 16.4zM10 8.8v6.4l5.4-3.2z') },
  { id: 'facebook', url: 'https://www.facebook.com/profile.php?id=61594931830065', ar: 'فيسبوك', en: 'Facebook',
    icon: svg('M12 2a10 10 0 1 1 0 20a10 10 0 1 1 0-20zM13.3 21.9V14h2.4l.4-2.8h-2.8V9.6c0-.8.3-1.4 1.4-1.4h1.5V5.7c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v1.9H8.2V14h2.4v7.9z') },
  { id: 'x', url: 'https://x.com/mishketquran', ar: 'إكس', en: 'X',
    icon: svg('M4.5 4h4.2l10.8 16h-4.2zM19.2 4l-6.4 7.2M4.8 20l6.4-7.2', { stroke: true }) },
  { id: 'tiktok', url: 'https://www.tiktok.com/@mishkatquran.org', ar: 'تيك توك', en: 'TikTok',
    icon: svg('M14.2 3h3c.3 2.2 1.7 3.6 3.8 3.9v3.1a7.7 7.7 0 0 1-3.8-1.2v6.4a5.8 5.8 0 1 1-5.8-5.8c.3 0 .6 0 .9.1v3.2a2.6 2.6 0 1 0 1.9 2.5z') },
];

// a row of links (icon + name); the name is said to a screen reader, the address opens in a new tab
export function socialHTML(lang = 'ar', esc = (s) => s) {
  const lead = lang === 'en' ? 'Follow Mishkat' : 'تابِع مشكاة';
  return `<div class="social" role="group" aria-label="${esc(lead)}">${SOCIAL.map(s => {
    const name = lang === 'en' ? s.en : s.ar;
    return `<a class="soc soc-${s.id}" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(name + ' — ' + lead)}">${s.icon}<span>${esc(name)}</span></a>`;
  }).join('')}</div>`;
}
