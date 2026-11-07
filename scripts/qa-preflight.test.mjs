import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { validateIntegrationQaEnv } from './qa-preflight-rules.mjs';

const qa = {
  INTEGRATION_ALLOW_CREATE_USERS: 'YES_TEST_PROJECT',
  INTEGRATION_ISOLATED_PROJECT_LABEL: 'MEDIA_TECH_VUS_QA_ONLY',
  INTEGRATION_EXPECTED_PROJECT_REF: 'qa-project-123456',
  SUPABASE_URL: 'https://qa-project-123456.supabase.co/',
  SUPABASE_SERVICE_ROLE_KEY: 'qa-secret-test-not-real',
  SUPABASE_ANON_KEY: 'qa-publishable-test-not-real',
  INTEGRATION_API_BASE: 'http://127.0.0.1:4000/api',
};

test('valid, explicitly confirmed disposable QA environment passes offline guard', () => {
  const result=validateIntegrationQaEnv(qa);
  assert.equal(result.ok,true,JSON.stringify(result.errors));
  assert.equal(result.projectRef,qa.INTEGRATION_EXPECTED_PROJECT_REF);
});
test('refuses opt-in missing before importing SDK or creating users', () => {
  const result=validateIntegrationQaEnv({...qa,INTEGRATION_ALLOW_CREATE_USERS:''});
  assert.equal(result.ok,false);
  const proc=spawnSync(process.execPath,['scripts/integration-live.mjs'],{cwd:process.cwd(),encoding:'utf8',env:{PATH:process.env.PATH}});
  assert.equal(proc.status,2);
  assert.match(proc.stderr,/STOP: Not a confirmed disposable QA environment/);
});
test('refuses accidental project mismatch',()=>{
  assert.equal(validateIntegrationQaEnv({...qa,INTEGRATION_EXPECTED_PROJECT_REF:'differentref'}).ok,false);
});
test('refuses unconfirmed project classification',()=>{
  assert.equal(validateIntegrationQaEnv({...qa,INTEGRATION_ISOLATED_PROJECT_LABEL:''}).ok,false);
});
test('never falls back to service-role for browser sign-in',()=>{
  assert.equal(validateIntegrationQaEnv({...qa,SUPABASE_ANON_KEY:''}).ok,false);
  assert.equal(validateIntegrationQaEnv({...qa,SUPABASE_ANON_KEY:qa.SUPABASE_SERVICE_ROLE_KEY}).ok,false);
});
test('rejects remote API without separate explicit consent',()=>{
  const remote={...qa,INTEGRATION_API_BASE:'https://qa-api.example.com/api'};
  assert.equal(validateIntegrationQaEnv(remote).ok,false);
  assert.equal(validateIntegrationQaEnv({...remote,INTEGRATION_ALLOW_REMOTE_API:'YES_ISOLATED_QA_API',INTEGRATION_EXPECTED_API_HOST:'qa-api.example.com'}).ok,true);
});
test('rejects HTTP remote API even if named and confirmed',()=>{
  const remote={...qa,INTEGRATION_API_BASE:'http://qa-api.example.com/api',INTEGRATION_ALLOW_REMOTE_API:'YES_ISOLATED_QA_API',INTEGRATION_EXPECTED_API_HOST:'qa-api.example.com'};
  assert.equal(validateIntegrationQaEnv(remote).ok,false);
});
test('rejects embedded credentials and unexpected URL paths',()=>{
  assert.equal(validateIntegrationQaEnv({...qa,SUPABASE_URL:'https://user:pass@qa-project-123456.supabase.co/'}).ok,false);
  assert.equal(validateIntegrationQaEnv({...qa,INTEGRATION_API_BASE:'http://127.0.0.1:4000/api/admin'}).ok,false);
});
test('guard output does not contain keys',()=>{
  const output=JSON.stringify(validateIntegrationQaEnv({...qa,SUPABASE_URL:'bad',SUPABASE_ANON_KEY:''}));
  assert(!output.includes(qa.SUPABASE_SERVICE_ROLE_KEY));
});
