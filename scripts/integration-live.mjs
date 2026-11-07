/**
 * REAL Supabase + API integration test (DESTRUCTIVE TO THE TWO ACCOUNTS IT CREATES).
 * Run ONLY against a dedicated test Supabase project, after applying every migration.
 * Required: explicit disposable QA project, matching ref, distinct publishable and
 * service-role keys, QA API base, and additional positive confirmation variables.
 * Run npm run qa:preflight first. NEVER target a production account or database.
 * Cleans up test identities in finally; ON DELETE CASCADE removes their companies.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateIntegrationQaEnv } from './qa-preflight-rules.mjs';

const guard = validateIntegrationQaEnv(process.env);
if (!guard.ok) {
  for (const reason of guard.errors) console.error('BLOCK:', reason);
  console.error('STOP: Not a confirmed disposable QA environment. No network request made.');
  process.exit(2);
}
// Load SDK only AFTER the guard: even missing dependencies must not bypass safety checks.
const { createClient } = await import('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const api = process.env.INTEGRATION_API_BASE.replace(/\/$/, '');
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const nonce = randomUUID().slice(0,8);
const password = `vUS!${randomUUID()}-integration`;
const created = [];
let passed = 0;
async function checked(description, fn) {
  await fn(); passed++;
  console.log(`PASS ${description}`);
}
async function call(path, token, body, method = body === undefined ? 'GET' : 'POST') {
  const res = await fetch(api + path, {
    method, signal: AbortSignal.timeout(25_000),
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : {'Content-Type':'application/json'}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const output = await res.json();
  return {status: res.status, output};
}
async function createIdentity(name) {
  const email = `vus-test-${nonce}-${name}@example.invalid`;
  const {data,error} = await admin.auth.admin.createUser({email,password,email_confirm:true});
  if (error || !data?.user) throw Error(`Unable to create test user: ${error?.code || 'unknown'}`);
  created.push(data.user.id);
  const userClient = createClient(url,process.env.SUPABASE_ANON_KEY, {auth:{autoRefreshToken:false,persistSession:false}});
  const login = await userClient.auth.signInWithPassword({email,password});
  assert.ifError(login.error);
  assert(login.data.session?.access_token);
  return {id:data.user.id,token:login.data.session.access_token};
}
try {
  await checked('readiness reports migrations available', async () => {
    const r = await call('/ready');
    assert.equal(r.status,200,JSON.stringify(r.output.checks));
  });
  await checked('anonymous API access blocked', async () => {
    const r = await call('/state'); assert.equal(r.status,401);
  });
  const userA = await createIdentity('alpha');
  const userB = await createIdentity('beta');
  let companyA, employeeA, companyB;
  await checked('new account starts without a company', async () => {
    const r = await call('/state',userA.token);
    assert.equal(r.status,200); assert.equal(r.output.company,null);
  });
  await checked('CEO can create company with 10B VND and initial employees', async () => {
    const r = await call('/company',userA.token,{name:`MEDIA TECH VUS QA ${nonce}`});
    assert.equal(r.status,201,JSON.stringify(r.output));
    const state = await call('/state',userA.token);
    assert.equal(state.status,200);
    companyA=state.output.company;
    employeeA=state.output.employees[0];
    assert.equal(Number(companyA.treasury_vnd),10_000_000_000);
    assert.equal(state.output.employees.length,12);
  });
  await checked('second account cannot see first company', async () => {
    const r=await call('/state',userB.token);
    assert.equal(r.status,200); assert.equal(r.output.company,null);
  });
  await checked('second account cannot assign tasks to first company employee', async () => {
    const createdB = await call('/company',userB.token,{name:`MEDIA TECH VUS QA B ${nonce}`});
    assert.equal(createdB.status,201);
    const stateB = await call('/state',userB.token);companyB=stateB.output.company;
    assert.notEqual(companyB.id,companyA.id);
    const r=await call('/tasks',userB.token,{employeeId:employeeA.id,title:'Cross-tenant forbidden',description:'',rewardVnd:100000});
    assert.notEqual(r.status,201);
  });
  let task;
  await checked('owner creates task with reward', async () => {
    const r=await call('/tasks',userA.token,{employeeId:employeeA.id,title:'Kiểm thử nhiệm vụ CEO',description:'QA',rewardVnd:500000});
    assert.equal(r.status,201,JSON.stringify(r.output));task=r.output.task;
    assert.equal(task.progress,0);
  });
  await checked('employee cannot have two active tasks', async () => {
    const r=await call('/tasks',userA.token,{employeeId:employeeA.id,title:'Second active task',description:'',rewardVnd:100000});
    assert.notEqual(r.status,201);
  });
  await checked('foreign CEO cannot advance task', async () => {
    const r=await call(`/tasks/${task.id}/advance`,userB.token,{});
    assert.notEqual(r.status,200);
  });
  await checked('four progress updates complete task and pay once', async () => {
    for(let i=1;i<=4;i++){
      const r=await call(`/tasks/${task.id}/advance`,userA.token,{});
      assert.equal(r.status,200,JSON.stringify(r.output));
      assert.equal(r.output.task.progress,i*25);
    }
    const state=await call('/state',userA.token);
    assert.equal(Number(state.output.company.treasury_vnd),9_999_500_000);
    assert.equal(state.output.company.xp,120);
    assert.equal(state.output.transactions.filter(t=>t.kind==='task_bonus').length,1);
  });
  await checked('retry is idempotent, saved state persists across reload', async () => {
    const retry=await call(`/tasks/${task.id}/advance`,userA.token,{});
    assert.equal(retry.status,200);
    const state=await call('/state',userA.token);
    assert.equal(Number(state.output.company.treasury_vnd),9_999_500_000);
    assert.equal(state.output.company.xp,120);
    assert.equal(state.output.tasks.find(t=>t.id===task.id).status,'completed');
  });
  await checked('account B balance remains isolated', async () => {
    const state=await call('/state',userB.token);
    assert.equal(Number(state.output.company.treasury_vnd),10_000_000_000);
  });
  console.log(`INTEGRATION PASS: ${passed} checks / 2 isolated users`);
} catch(error) {
  console.error('INTEGRATION FAIL:',error.message);
  process.exitCode=1;
} finally {
  for(const id of created.reverse()) {
    try {
      const {error}=await admin.auth.admin.deleteUser(id);
      if(error){console.error('CLEANUP FAILURE: test user remains. Delete it in Supabase test project; id:',id);process.exitCode=1;}
    } catch(error) {
      console.error('CLEANUP FAILURE:',error.message,'user id:',id);
      process.exitCode=1;
    }
  }
}
