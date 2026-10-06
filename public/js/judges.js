// judges.html: one language at a time (?lang=en, or the language chosen in Mishkat)
(() => {
  let lang = new URLSearchParams(location.search).get('lang');
  if (lang !== 'en' && lang !== 'ar') { try { lang = localStorage.getItem('mishkat.lang') === 'en' ? 'en' : 'ar'; } catch (e) { lang = 'ar'; } }
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  for (const m of document.querySelectorAll('main[data-lang]')) m.hidden = m.dataset.lang !== lang;
  for (const a of document.querySelectorAll('.lg a')) a.classList.toggle('on', a.dataset.l === lang);
})();
