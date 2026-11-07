import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('./qa-report.mjs',import.meta.url),'utf8');
test('QA report makes integration and browser status explicitly NOT_RUN',()=>{
  assert.match(source,/real_supabase_integration:\{status:'NOT_RUN'/);
  assert.match(source,/real_browser_e2e:\{status:'NOT_RUN'/);
});
test('QA report does not serialize process.env, keys or test stdout',()=>{
  assert(!source.includes('JSON.stringify(process.env'));
  assert(!source.includes('API_KEY'));
  assert.match(source,/node_tests:\{status:/);
});
test('QA report checks backend and marks optional web build FAIL instead of PASS',()=>{
  assert.match(source,/--check/);
  assert.match(source,/runBuild && checks\.web_production_build\.status!=='PASS'/);
});
