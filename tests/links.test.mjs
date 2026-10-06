// T068: the «useful links» panel lists only sites of the challenge's scholarly reference pack and of Mishkat's
// sources of truth (02_SOURCES/REFERENTIEL_DU_DEFI.md, SOURCES.md), over HTTPS, each named in Arabic and English.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LINKS } from '../public/js/toolpanels.js';

const REVIEWED = ['quranenc.com', 'quranpedia.net', 'dorar.net', 'tanzil.net', 'qurancomplex.gov.sa', 'hadeethenc.com', 'shamela.ws', 'alifta.gov.sa', 'bayenat.net', 'dawa.center', 'islamic-content.com'];
// (6 Oct, T118) Mishkat's own official pages, not religious sources
const OWN = ['www.youtube.com', 'www.facebook.com', 'x.com', 'www.tiktok.com'];

test('links: reviewed sites only, https, Arabic and English names', () => {
  let n = 0;
  for (const c of LINKS) {
    assert.ok(c.cat.ar && c.cat.en);
    for (const [url, ar, en] of c.items) {
      n++;
      const u = new URL(url);
      assert.equal(u.protocol, 'https:', url);
      assert.ok(REVIEWED.includes(u.hostname) || (OWN.includes(u.hostname) && /mishk/i.test(url + c.cat.en)), 'not in the reference pack: ' + u.hostname);
      assert.match(ar, /[؀-ۿ]/, 'Arabic name: ' + url);
      assert.match(en, /[A-Za-z]/, 'English name: ' + url);
    }
  }
  assert.ok(n >= 10);
});

test('social: the official YouTube and Facebook pages of Mishkat', async () => {
  const { SOCIAL, socialHTML } = await import('../public/js/social.js');
  assert.deepEqual(SOCIAL.map(s => s.url), ['https://www.youtube.com/@mishketquran', 'https://www.facebook.com/profile.php?id=61594931830065', 'https://x.com/mishketquran', 'https://www.tiktok.com/@mishkatquran.org']);
  for (const s of SOCIAL) assert.doesNotMatch(s.icon, /#[0-9a-f]{3,6}|var\(--bg/i, 'icons drawn in the text colour (light and dark themes)');
  const h = socialHTML('ar');
  assert.match(h, /rel="noopener"/);
  assert.match(h, /يوتيوب/);
  assert.match(socialHTML('en'), /Facebook/);
});
