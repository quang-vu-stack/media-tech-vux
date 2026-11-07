import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkerSupervisor } from '../apps/api/src/worker-supervisor.js';
const quiet = { error() {} };

test('each job runs in deterministic order and statuses are observable', async () => {
  const calls = [];
  const sup = createWorkerSupervisor({jobs:[
    {name:'one',run:async()=>calls.push('one')},
    {name:'two',run:async()=>calls.push('two')},
  ],log:quiet});
  assert.equal(await sup.tick(),true);
  assert.deepEqual(calls,['one','two']);
  const status=sup.snapshot();
  assert.equal(status.cycles,1);
  assert.equal(status.jobs.one.successes,1);
  assert.equal(status.jobs.two.state,'ok');
  assert.equal(status.lastCycleAt !== null,true);
});

test('a failing job does not prevent the next job from executing',async()=>{
  let ran=false;
  const sup=createWorkerSupervisor({jobs:[
    {name:'broken',run:async()=>{throw Object.assign(new Error('private database details'),{code:'RPC_ERROR'});}},
    {name:'healthy',run:async()=>{ran=true;}},
  ],log:quiet});
  await sup.tick();
  assert.equal(ran,true);
  assert.equal(sup.snapshot().jobs.broken.lastErrorCode,'RPC_ERROR');
  assert.equal(JSON.stringify(sup.snapshot()).includes('private database details'),false);
});

test('overlapping ticks are skipped, preventing duplicate execution',async()=>{
  let release;
  let started=0;
  const wait=new Promise(r=>{release=r;});
  const sup=createWorkerSupervisor({jobs:[{name:'slow',run:async()=>{started++;await wait;}}],log:quiet});
  const running=sup.tick();
  assert.equal(await sup.tick(),false);
  assert.equal(started,1);
  assert.equal(sup.snapshot().skipped,1);
  release();
  await running;
  assert.equal(sup.snapshot().cycles,1);
});

test('failure recovery resets consecutive counter but retains total failures',async()=>{
  let fail=true;
  const sup=createWorkerSupervisor({jobs:[{name:'flaky',run:async()=>{if(fail)throw Error('fail');}}],log:quiet});
  await sup.tick(); await sup.tick();
  assert.equal(sup.snapshot().jobs.flaky.consecutiveFailures,2);
  fail=false;await sup.tick();
  assert.equal(sup.snapshot().jobs.flaky.consecutiveFailures,0);
  assert.equal(sup.snapshot().jobs.flaky.failures,2);
  assert.equal(sup.snapshot().jobs.flaky.successes,1);
});

test('returned status cannot mutate internal counters',async()=>{
  const sup=createWorkerSupervisor({jobs:[{name:'job',run:async()=>{}}],log:quiet});
  await sup.tick();
  const status=sup.snapshot();status.jobs.job.runs=10_000;
  assert.equal(sup.snapshot().jobs.job.runs,1);
});

test('supervisor validates task naming, uniqueness and interval',()=>{
  assert.throws(()=>createWorkerSupervisor({jobs:[]}));
  assert.throws(()=>createWorkerSupervisor({jobs:[{name:'same',run:()=>{}},{name:'same',run:()=>{}}]}));
  assert.throws(()=>createWorkerSupervisor({jobs:[{name:'safe',run:()=>{}}],intervalMs:50}));
});

test('start and stop are idempotent',()=>{
  const sup=createWorkerSupervisor({jobs:[{name:'job',run:async()=>{}}],log:quiet});
  sup.start({immediate:false});sup.start({immediate:false});
  assert.equal(sup.snapshot().enabled,true);
  sup.stop();sup.stop();
  assert.equal(sup.snapshot().enabled,false);
});
