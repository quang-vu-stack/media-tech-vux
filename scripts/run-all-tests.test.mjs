import test from 'node:test';
import assert from 'node:assert/strict';
import {allTestPaths} from './run-all-tests.mjs';

test('run-all-tests discovers new suites without a hardcoded list',()=>{
  const files=allTestPaths();
  assert(files.length>=35);
  assert(files.includes('scripts/qa-report-path.test.mjs'));
  assert(files.includes('scripts/qa-browser-probe.test.mjs'));
  assert(files.includes('scripts/qa-migration-files.test.mjs'));
  assert(files.includes('scripts/run-all-tests.test.mjs'));
});
