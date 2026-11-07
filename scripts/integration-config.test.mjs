import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const script = new URL('./integration-live.mjs', import.meta.url);
const source = readFileSync(script,'utf8');
const guard = readFileSync(new URL('./qa-preflight-rules.mjs',import.meta.url),'utf8');

test('integration runner blocks unapproved environments before loading SDK',()=>{
  assert.match(source,/validateIntegrationQaEnv\(process\.env\)/);
  assert.match(source,/if \(!guard\.ok\)/);
  assert.match(source,/await import\('@supabase\/supabase-js'\)/);
  assert(source.indexOf('if (!guard.ok)') < source.indexOf("await import('@supabase/supabase-js')"));
  assert.match(guard,/INTEGRATION_ALLOW_CREATE_USERS/);
  assert.match(guard,/YES_TEST_PROJECT/);
  assert.match(source,/finally \{/);
  assert.match(source,/deleteUser\(id\)/);
});
test('integration refuses missing approval before touching network, without SDK installed',()=>{
  const run=spawnSync(process.execPath,[script.pathname],{encoding:'utf8',env:{PATH:process.env.PATH}});
  assert.equal(run.status,2);
  assert.match(run.stderr,/STOP: Not a confirmed disposable QA environment/);
});
test('integration covers two-user tenant isolation, money, state persistence and double payout',()=>{
  for(const marker of ['Cross-tenant forbidden','second account cannot see first company','four progress updates','retry is idempotent','saved state persists','10_000_000_000']) {
    assert(source.includes(marker),marker);
  }
});
test('integration uses separate anon key for sign-in, never service fallback',()=>{
  assert.match(source,/createClient\(url,process\.env\.SUPABASE_ANON_KEY/);
  assert(!source.includes('SUPABASE_ANON_KEY ?? serviceKey'));
});
