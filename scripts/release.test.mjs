import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canRelease, canRollback, publicReleaseSummary } from '../apps/api/src/release-rules.js';
const SHA='a'.repeat(64);
const base = {id:'proj',status:'approved',current_version:2,published_version:1};
const good = {version_number:2,quality_report:{passed:true,source_sha256:SHA}};
const history=[{id:'a',version_number:1,action:'release',source_sha256:SHA,note:'initial',created_at:'2026-11-04T00:00:00Z'}];
test('CEO can release a reviewed, quality-passing latest version',()=>assert.equal(canRelease(base,good),true));
test('cannot release an unapproved project',()=>assert.equal(canRelease({...base,status:'awaiting_review'},good),false));
test('cannot release a stale version',()=>assert.equal(canRelease({...base,current_version:3},good),false));
test('cannot release twice',()=>assert.equal(canRelease({...base,published_version:2},good),false));
test('cannot release a failed quality check',()=>assert.equal(canRelease(base,{...good,quality_report:{passed:false,source_sha256:SHA}}),false));
test('cannot release a report with malformed sha',()=>assert.equal(canRelease(base,{...good,quality_report:{passed:true,source_sha256:'x'}}),false));
test('can rollback to previously released version',()=>assert.equal(canRollback({...base,published_version:2},1,history),true));
test('cannot rollback to never-released draft',()=>assert.equal(canRollback({...base,published_version:2},3,history),false));
test('cannot rollback to current active release',()=>assert.equal(canRollback({...base,published_version:1},1,history),false));
test('cannot rollback while no release exists',()=>assert.equal(canRollback({...base,published_version:null},1,history),false));
test('release summary does not leak extra fields',()=>{
 const a=publicReleaseSummary({...base,secret:'hidden'},[{...history[0],token:'hidden'}]);
 assert.equal(a.project_id,'proj');assert.equal(a.events[0].token,undefined);assert.equal(a.secret,undefined);
});
test('SQL release/rollback enforces owner, locks and service-role-only RPC',()=>{
 const sql=readFileSync(new URL('../supabase/upgrade_studio_release_v9.sql',import.meta.url),'utf8');
 for(const required of ['owner_id=p_user_id','for update of s','p.published_version is distinct from p_expected_published_version','and action=\'release\'','studio_release_v9','studio_rollback_v9','grant execute on function public.studio_release_v9','service_role'])assert.ok(sql.includes(required),required);
});
test('backend exposes protected release/rollback routes with auth and ownership',()=>{
 const source=readFileSync(new URL('../apps/api/src/index.js',import.meta.url),'utf8');
 assert.ok(source.indexOf("app.use('/api', auth)") < source.indexOf("app.get('/api/studio/projects/:id/releases'"));
 assert.match(source,/studioOwnedProject\(req\.user\.id,id\.data\)/);
 assert.match(source,/db\.rpc\('studio_release_v9'/);
 assert.match(source,/db\.rpc\('studio_rollback_v9'/);
});
test('browser smoke report is informational, not a release gate',()=>{
 const api=readFileSync(new URL('../apps/api/src/index.js',import.meta.url),'utf8');
 assert.ok(!api.includes('browser_smoke_passed'));
 const frontend=readFileSync(new URL('../apps/web/src/components/RuntimeSmoke.tsx',import.meta.url),'utf8');
 assert.ok(frontend.includes('sandbox="allow-scripts"'));
 assert.ok(frontend.includes('event.source!==frame.current?.contentWindow'));
});
