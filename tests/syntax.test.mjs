// Every module of the page must parse: galaxy.js and app.js are never imported by the other tests (they need
// WebGL and the DOM), so a syntax error there would break the whole page with all tests green.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'js');

test('syntax: every module of public/js parses', () => {
  const files = readdirSync(JS).filter(f => f.endsWith('.js'));
  assert.ok(files.length >= 20);
  for (const f of files) {
    try { execFileSync(process.execPath, ['--check', join(JS, f)], { stdio: 'pipe' }); }
    catch (e) { assert.fail(`${f}: ${String(e.stderr || e.message).split('\n').slice(0, 5).join(' ')}`); }
  }
});
