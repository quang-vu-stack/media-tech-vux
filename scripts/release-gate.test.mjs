import test from 'node:test';
import assert from 'node:assert/strict';
import { assessReleaseReadiness, RELEASE_LEVELS } from './release-readiness-core.mjs';
const full=()=>({version:'28.0.0',checks:Object.fromEntries(RELEASE_LEVELS.production.map(name=>[name,{status:'PASS'}]))});

test('production gate blocks when evidence is unexecuted',()=>{
  const report=full();report.checks.real_supabase_integration={status:'NOT_RUN'};
  const result=assessReleaseReadiness(report);
  assert.equal(result.ready,false);
  assert.equal(result.blockers[0].name,'real_supabase_integration');
});
test('production gate blocks on failed frontend build',()=>{
  const report=full();report.checks.web_production_build={status:'FAIL'};
  const result=assessReleaseReadiness(report);
  assert.equal(result.ready,false);
});
test('production gate blocks if an evidence field is missing',()=>{
  const report=full();delete report.checks.real_browser_e2e;
  const result=assessReleaseReadiness(report);
  assert.equal(result.ready,false);
  assert.equal(result.blockers[0].status,'NOT_RUN');
});
test('logic gate only examines local verified steps',()=>{
  const report=full();report.checks.web_production_build={status:'NOT_RUN'};
  assert.equal(assessReleaseReadiness(report,'logic').ready,true);
  assert.equal(assessReleaseReadiness(report,'build').ready,false);
});
test('no arbitrary status can be treated as PASS',()=>{
  const report=full();report.checks.node_tests={status:'SKIPPED'};
  const result=assessReleaseReadiness(report,'logic');
  assert.equal(result.ready,false);
  assert.equal(result.checks[0].status,'NOT_RUN');
});
test('all required evidence passes only its named level',()=>{
  const report=full();
  assert.equal(assessReleaseReadiness(report,'production').ready,true);
  assert.equal(assessReleaseReadiness(report,'build').ready,true);
});
test('malformed evidence and unknown levels cannot grant release',()=>{
  assert.throws(()=>assessReleaseReadiness({},'logic'),/missing/);
  assert.throws(()=>assessReleaseReadiness(full(),'production-plus'),/Unknown/);
});
test('release assessment does not mutate original report',()=>{
  const report=full();const original=JSON.stringify(report);
  assessReleaseReadiness(report,'production');
  assert.equal(JSON.stringify(report),original);
});
