import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const api = readFileSync(new URL('../apps/api/src/index.js', import.meta.url), 'utf8');
const errors = readFileSync(new URL('../apps/api/src/db-errors.js', import.meta.url),'utf8');
const sliceBetween = (source, a, b) => {
  const start=source.indexOf(a); const end=source.indexOf(b,start);
  assert(start!==-1 && end>start, `Unable to inspect route ${a}`);
  return source.slice(start,end);
};
test('/state is read only (never schedules global task reconciliation)', () => {
  const body=sliceBetween(api,"app.get('/api/state'", "// CEO meeting system v18");
  assert(!/db\.rpc\(/.test(body),'State read must not invoke mutating stored procedures');
  assert(!/db\.from\([^)]*\)\.update\(/.test(body),'State read must not mutate tables');
  assert(body.includes("db.from('companies')"));
});
test('worker still reconciles overdue jobs after removing read-side mutation', () => {
  const worker=sliceBetween(api,"const supervisor = createWorkerSupervisor", "// This endpoint is authenticated");
  assert(worker.includes('process_due_auto_tasks'));
  assert(worker.includes('reconcile_agent_orders'));
});
test('API passes database failures through sanitizing layer', () => {
  assert(api.includes('throwOnDatabaseError(error, fallback)'));
  assert(api.includes('toPublicHttpError(err)'));
  assert(!api.includes('fallback + \': \'+ error.message'));
});
test('database details never included in public error object', () => {
  assert(!errors.includes('publicMessage = error.message'));
  assert(errors.includes('const publicCodes = new Set'));
});
test('API liveness, readiness and status report current package version', () => {
  const pkg=JSON.parse(readFileSync(new URL('../package.json', import.meta.url),'utf8'));
  const major=Number(pkg.version.split('.')[0]);
  assert(api.includes(`phase: ${major}`));
  assert(api.includes(`version:'${pkg.version}'`));
});
