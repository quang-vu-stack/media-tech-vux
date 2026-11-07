import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../apps/web/src/App.tsx',import.meta.url),'utf8');
const lib=readFileSync(new URL('../apps/web/src/lib.ts',import.meta.url),'utf8');
const e2e=readFileSync(new URL('./e2e-browser.spec.ts',import.meta.url),'utf8');

test('company display is gated by current CEO auth token',()=>{
  assert.match(app,/loadedForToken !== token/);
  assert.match(app,/gameGate\.current\.setOwner\(token\)/);
  assert.match(app,/gameGate\.current\.isCurrent\(ticket\)/);
});
test('initial state error unlocks retry UI, not permanent spinner',()=>{
  const start=app.indexOf('const refresh = useCallback(async');
  const end=app.indexOf('}, [token]);',start);
  const block=app.slice(start,end);
  assert.match(block,/catch\(e\)/);
  assert.match(block,/setLoadedForToken\(token\)/);
  assert.match(block,/setLoading\(false\)/);
  assert.match(app,/Thử lại/);
});
test('chat history is gated by current employee and account, including send replies',()=>{
  assert.match(app,/chatScope = token && selectedId/);
  assert.match(app,/historyScope === chatScope \? history : \[\]/);
  assert.match(app,/chatGate\.current\.isCurrent\(ticket\)/);
  assert.match(app,/visibleHistory\.map\(/);
});
test('stale fetches are abortable and no mutation is retried automatically',()=>{
  assert.match(app,/gameAbortRef\.current\?\.abort\(\)/);
  assert.match(app,/meetingAbortRef\.current\?\.abort\(\)/);
  assert.match(lib,/makeRequestSignal\(cancelSignal, timeoutMs\)/);
  assert.doesNotMatch(lib,/retry\s*\(/i);
});
test('browser QA contains two-CEO account-switch and initial-failure cases',()=>{
  assert.match(e2e,/switching between two QA CEOs/);
  assert.match(e2e,/initial company-state failure shows/);
  assert.match(e2e,/test\.skip\(!hasQaB/);
});
