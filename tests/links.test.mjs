// T068: the «useful links» panel lists only sites of the challenge's scholarly reference pack and of Mishkat's
// sources of truth (02_SOURCES/REFERENTIEL_DU_DEFI.md, SOURCES.md), over HTTPS, each named in Arabic and English.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LINKS } from '../public/js/toolpanels.js';

const REVIEWED = ['quranenc.com', 'quranpedia.net', 'dorar.net', 'tanzil.net', 'qurancomplex.gov.sa', 'hadeethenc.com', 'shamela.ws', 'binbaz.org.sa', 'alifta.gov.sa', 'bayenat.net', 'dawa.center'];

test('links: reviewed sites only, https, Arabic and English names', () => {
  let n = 0;
  for (const c of LINKS) {
    assert.ok(c.cat.ar && c.cat.en);
    for (const [url, ar, en] of c.items) {
      n++;
      const u = new URL(url);
      assert.equal(u.protocol, 'https:', url);
      assert.ok(REVIEWED.includes(u.hostname), 'not in the reference pack: ' + u.hostname);
      assert.match(ar, /[؀-ۿ]/, 'Arabic name: ' + url);
      assert.match(en, /[A-Za-z]/, 'English name: ' + url);
    }
  }
  assert.ok(n >= 10);
});
