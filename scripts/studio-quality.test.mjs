import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { demoSoftwareArtifact } from '../apps/api/src/software-studio.js';
import { analyzeSoftwareArtifact, revisedSoftwarePrompt, simulatedRevision } from '../apps/api/src/studio-quality.js';
const a=demoSoftwareArtifact('Build a meeting planner web application');
const quality=(files)=>analyzeSoftwareArtifact({...a,files:{...a.files,...files}});
const file=(name)=>readFileSync(new URL(name,import.meta.url),'utf8');

test('Demo application receives a passing non-executing static report',()=>{
  const report=analyzeSoftwareArtifact(a);
  assert.equal(report.errors,0);
  assert.equal(report.passed,true);
  assert.match(report.source_sha256,/^[a-f0-9]{64}$/);
  assert.equal(report.engine,'vus-static-v8.0');
});
test('Syntax errors are blocking',()=>{
  const result=quality({'app.js':'const a = ; document.getElementById("task")'});
  assert.equal(result.passed,false);
  assert.ok(result.findings.some(f=>f.code==='JS_SYNTAX'&&f.severity==='error'));
});
test('Network APIs are flagged as blocking and never executed',()=>{
  globalThis.__VUS_QUALITY_NEVER_EXECUTE__=false;
  const result=quality({'app.js':'fetch("https://example.com"); globalThis.__VUS_QUALITY_NEVER_EXECUTE__ = true;'});
  assert.equal(result.passed,false);
  assert.ok(result.findings.some(f=>f.code==='NETWORK_API'));
  assert.equal(globalThis.__VUS_QUALITY_NEVER_EXECUTE__,false);
  delete globalThis.__VUS_QUALITY_NEVER_EXECUTE__;
});
test('Inline HTML event handlers are blocking',()=>{
  const result=quality({'index.html':'<!doctype html><main><h1>Hi</h1><button onclick="alert(1)">Run</button></main>'});
  assert.ok(result.findings.some(f=>f.code==='HTML_EVENT_ATTR'));
});
test('Missing DOM IDs produce warnings, not success claims',()=>{
  const result=quality({'app.js':'document.getElementById("missing-item").textContent = "hello";'});
  assert.equal(result.passed,true);
  assert.ok(result.warnings>=1);
});
test('Report source hash changes with new code',()=>{
  assert.notEqual(analyzeSoftwareArtifact(a).source_sha256,quality({'app.js':'document.querySelector("body").textContent = "updated";'}).source_sha256);
});
test('AI revision prompt includes previous source and feedback',()=>{
  const p=revisedSoftwarePrompt('Build planner','Please improve layout.',a,{full_name:'Minh',role:'Engineer'});
  assert.match(p.instructions,/Không tạo server/);
  assert.match(p.input,/Please improve layout/);
  assert.match(p.input,/index.html/);
});
test('Fallback revisions are explicitly simulated and escaped',()=>{
  const b=simulatedRevision(a,'Improve <script>alert(1)</script> layout');
  assert.match(b.summary,/mô phỏng/);
  assert.doesNotMatch(b.files['index.html'],/<script>alert\(1\)<\/script>/);
});
test('Revision RPC uses lock and expected version check',()=>{
  const sql=file('../supabase/upgrade_studio_quality_v8.sql');
  assert.match(sql,/for update of s/i);
  assert.match(sql,/p\.current_version <> p_expected_version/);
  assert.match(sql,/unique\(project_id,version_number\)/);
  assert.match(sql,/p\.current_version>=6/);
});
test('Review SQL requires tested passing latest version',()=>{
  const sql=file('../supabase/upgrade_studio_quality_v8.sql');
  assert.match(sql,/v\.quality_report is null/);
  assert.match(sql,/v\.quality_report->>'passed'/);
  assert.match(sql,/p\.current_version<>p_expected_version/);
  assert.match(sql,/p\.status<>'awaiting_review'/);
});
test('RPC grants only backend service role',()=>{
  const sql=file('../supabase/upgrade_studio_quality_v8.sql');
  for (const fn of ['studio_create_v8','studio_revise_v8','studio_record_quality_v8','studio_review_v8']) {
    assert.match(sql,new RegExp(`revoke execute on function public\\.${fn}`));
    assert.match(sql,new RegExp(`grant execute on function public\\.${fn}`));
  }
});
test('API authenticates company ownership, holds AI keys on server',()=>{
  const api=file('../apps/api/src/index.js');
  const ui=file('../apps/web/src/components/SoftwareStudio.tsx');
  assert.match(api,/db\.auth\.getUser\(jwt\)/);
  assert.match(api,/studioOwnedProject\(req\.user\.id,id\.data\)/);
  assert.match(api,/studio_review_v8/);
  assert.match(ui,/sandbox="allow-scripts"/);
  assert.doesNotMatch(ui,/sandbox="[^"]*allow-same-origin/);
  assert.doesNotMatch(ui,/API_KEY|SERVICE_ROLE_KEY/);
});
