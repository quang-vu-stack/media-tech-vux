import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultQaReportPath } from './qa-report-path.mjs';

test('QA report path matches package version instead of stale hardcode', () => {
  assert.equal(defaultQaReportPath({fsRead:()=>JSON.stringify({version:'28.0.0'})}), 'qa-reports/v28-local-report.json');
  assert.equal(defaultQaReportPath({fsRead:()=>JSON.stringify({version:'32.1.5'})}), 'qa-reports/v32-local-report.json');
});
test('QA report path rejects untrusted malformed version', () => {
  assert.throws(() => defaultQaReportPath({fsRead:()=>JSON.stringify({version:'../../secrets'})}), /invalid/);
});
test('release gate and CI no longer point to v26 QA evidence', () => {
  const cli=readFileSync(new URL('./release-gate.mjs',import.meta.url),'utf8');
  const ci=readFileSync(new URL('../.github/workflows/validate.yml',import.meta.url),'utf8');
  assert.match(cli,/defaultQaReportPath\(\)/);
  assert.doesNotMatch(cli,/v26-local-report\.json/);
  assert.match(ci,/qa-reports\/\*-local-report\.json/);
  assert.match(ci,/if: always\(\)/);
});
