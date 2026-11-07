import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./qa-browser-probe.py',import.meta.url),'utf8');
test('Chromium standalone probe cannot mark the full game E2E as passed',()=>{
  assert.match(source, /'real_browser_e2e': 'NOT_RUN'/);
  assert.match(source,/--allow-remote/);
  assert.match(source,/set_content/);
  assert.match(source,/page\.goto/);
  assert.doesNotMatch(source,/E2E_PASSWORD/);
});
