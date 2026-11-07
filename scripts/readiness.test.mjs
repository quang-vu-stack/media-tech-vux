import test from 'node:test';
import assert from 'node:assert/strict';
import { checkReadiness, requiredTables } from '../apps/api/src/readiness.js';

test('readiness checks database and all required migration tables', async () => {
  const seen = [];
  const result = await checkReadiness({ query: name => { seen.push(name); return { data: [] }; } });
  assert.deepEqual(seen, requiredTables);
  assert.equal(result.ok, true);
  assert(result.checks.every(c => c.ok && c.code === 'OK'));
});

test('missing table produces 503-compatible failed status, no internal SQL data', async () => {
  const privateMessage = 'secret password connection string';
  const result = await checkReadiness({ query: name => name === 'software_release_events'
    ? {error: { message: privateMessage }} : {data:[]} });
  assert.equal(result.ok, false);
  assert.equal(result.checks.find(c=>c.component==='software_release_events').code, 'DB_QUERY_FAILED');
  assert(!JSON.stringify(result).includes(privateMessage));
});

test('network failures are sanitized', async () => {
  const result = await checkReadiness({query: async () => {throw Error('private internal hostname');}, tables:['companies'] });
  assert.deepEqual(result.checks, [{component:'companies',ok:false,code:'DB_UNAVAILABLE'}]);
});

test('timeout fails closed and does not hang', async () => {
  const never = new Promise(() => {});
  const result = await checkReadiness({query: () => never, tables:['companies'],deadlineMs:100});
  assert.equal(result.ok,false);
  assert.equal(result.checks[0].code,'DB_TIMEOUT');
});

test('invalid table names are rejected before querying', async () => {
  await assert.rejects(checkReadiness({ query:()=>{}, tables:['companies;DROP TABLE companies'] }),/invalid readiness table name/);
});

test('invalid deadline is rejected', async () => {
  await assert.rejects(checkReadiness({query:()=>{},deadlineMs:0}),/invalid readiness deadline/);
});
