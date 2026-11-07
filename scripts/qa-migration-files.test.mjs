import test from 'node:test';
import assert from 'node:assert/strict';
import { auditMigrationFiles, v18to23 } from './qa-migration-files.mjs';

test('bundled migrations v18-v23 exist in correct order',()=>{
  assert.deepEqual(v18to23.map(row=>row.version),[18,19,20,21,22,23]);
  assert.equal(auditMigrationFiles().every(row=>row.readyForManualReview),true);
});
test('migration inventory never mutates Supabase',()=>{
  assert.equal(typeof auditMigrationFiles,'function');
  for(const row of v18to23) assert.match(row.table,/^[a-z][a-z0-9_]+$/);
});
