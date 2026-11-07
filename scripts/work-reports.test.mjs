import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateWorkReportReview, publicWorkReport, REVIEW_DECISIONS, MAX_REPORT_REVISIONS } from '../apps/api/src/work-reports.js';
import { requiredTables } from '../apps/api/src/readiness.js';

const sql = readFileSync(new URL('../supabase/upgrade_v21_work_reports.sql', import.meta.url),'utf8');
const api = readFileSync(new URL('../apps/api/src/index.js', import.meta.url),'utf8');
const ui = readFileSync(new URL('../apps/web/src/components/WorkReportReview.tsx', import.meta.url),'utf8');
const meetingUi = readFileSync(new URL('../apps/web/src/components/MeetingActions.tsx', import.meta.url),'utf8');
const types = readFileSync(new URL('../apps/web/src/types.ts', import.meta.url),'utf8');
const uuidA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const uuidB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const uuidC = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const action = { id: uuidA, task_id: uuidB, company_id: uuidC };
const report = { id: 'r', action_id: uuidA, task_id: uuidB, company_id: uuidC,
  status: 'awaiting_review', revision_no: 0, content: 'Báo cáo mô phỏng. Không có công việc ngoài game.',
  review_notes: '', source: 'time_simulation', submitted_at: '2026-11-04T00:00:00Z',
  reviewed_at: null, secret:'NEVER_RETURN_THIS' };

test('CEO can approve or reject with empty optional notes', () => {
  assert.deepEqual(validateWorkReportReview({decision:'approve',expectedRevision:0}), {decision:'approve',notes:'',expectedRevision:0});
  assert.deepEqual(validateWorkReportReview({decision:'reject',expectedRevision:0,notes:'  Không đạt  '}), {decision:'reject',notes:'Không đạt',expectedRevision:0});
});
test('revision needs a meaningful note and all accepted decisions are bounded', () => {
  assert.deepEqual(REVIEW_DECISIONS,['approve','revise','reject']);
  assert.equal(MAX_REPORT_REVISIONS,3);
  assert.equal(validateWorkReportReview({decision:'revise',expectedRevision:2,notes:'  Bổ sung kết quả kiểm thử  '}).notes,'Bổ sung kết quả kiểm thử');
});
test('invalid or malformed review payloads are rejected', () => {
  for (const invalid of [null,[],0,'text',{},
    {decision:'pay',expectedRevision:0},{decision:'approve',expectedRevision:-1},
    {decision:'approve',expectedRevision:4},{decision:'approve',expectedRevision:'0'},
    {decision:'revise',expectedRevision:0,notes:'sửa'},
    {decision:'reject',expectedRevision:0,notes:'x'.repeat(1001)}]) {
    assert.throws(()=>validateWorkReportReview(invalid),/REPORT_REVIEW_INVALID/);
  }
});
test('public report only exposes safe fields and matching company/action/task', () => {
  const result = publicWorkReport(report,action);
  assert.equal(result.status,'awaiting_review');
  assert.equal(result.revision_no,0);
  assert(!JSON.stringify(result).includes('NEVER_RETURN_THIS'));
  assert.equal(publicWorkReport(null,action),null);
  assert.throws(()=>publicWorkReport({...report, company_id:'foreign'},action),/WORK_REPORT_ACTION_MISMATCH/);
  assert.throws(()=>publicWorkReport({...report, task_id:'foreign'},action),/WORK_REPORT_ACTION_MISMATCH/);
  assert.throws(()=>publicWorkReport({...report, action_id:'foreign'},action),/WORK_REPORT_ACTION_MISMATCH/);
});
test('schema protects report by owner and denies browser writes',()=>{
  for(const expected of ['meeting_work_reports_v21','enable row level security','auth.uid()',
    'revoke insert,update,delete on public.meeting_work_reports_v21','from public.companies c','owner_id=(select auth.uid())']) {
    assert.ok(sql.includes(expected),expected);
  }
});
test('CEO-only review stored procedure enforces owner, lock order, revision and boundaries',()=>{
  assert.match(sql,/review_meeting_work_report_v21\(/);
  assert.match(sql,/c0\.owner_id=p_user_id/);
  const fn = sql.slice(sql.indexOf('create or replace function public.review_meeting_work_report_v21('));
  const taskLock = fn.indexOf('for update;',fn.indexOf('select * into t from public.tasks'));
  const reportLock = fn.indexOf('for update;',fn.indexOf('select * into r from public.meeting_work_reports_v21 where id=p_report_id'));
  assert.ok(taskLock>0 && reportLock>taskLock,'Task must lock before report to match worker');
  assert.match(fn,/r\.revision_no<>p_expected_revision/);
  assert.match(fn,/r\.status<>'awaiting_review'/);
  assert.match(fn,/r\.revision_no>=3/);
  assert.match(fn,/if r\.status='approved' and p_decision='approve' then return r;/);
});
test('report pays at most once, at approval, with atomic ledger transaction',()=>{
  const fn=sql.slice(sql.indexOf('create or replace function public.review_meeting_work_report_v21('));
  assert.match(fn,/if p_decision='approve' then[\s\S]*treasury_vnd=treasury_vnd-t\.reward_vnd/);
  assert.match(fn,/if t\.reward_vnd>0 then[\s\S]*insert into public\.ledger_entries/);
  assert.match(fn,/values\(t\.company_id,-t\.reward_vnd,c\.treasury_vnd,'task_bonus'/);
  assert.match(fn,/if p_decision='approve' then[\s\S]*xp=xp\+120/);
  assert.match(fn,/update public\.tasks set status='cancelled'/);
  assert.match(fn,/status='rejected'/);
  assert.equal((fn.match(/insert into public\.ledger_entries/g)||[]).length,1,'Review handler has one payout point');
});
test('worker excludes meeting task payouts and agent orders while generating 99% report',()=>{
  const worker=sql.slice(sql.indexOf('create or replace function public.process_due_auto_tasks('),sql.indexOf('-- Atomic, owner-authenticated CEO decision.'));
  assert.match(worker,/not exists\(select 1 from public\.agent_orders o/);
  assert.match(worker,/select \* into a from public\.meeting_action_items_v20/);
  assert.match(worker,/update public\.tasks set progress=99/);
  assert.match(worker,/insert into public\.meeting_work_reports_v21/);
  assert.match(worker,/elsif r\.status='revision_requested'/);
  assert.match(worker,/BÁO CÁO MÔ PHỎNG/);
  assert.ok(worker.indexOf('continue;') < worker.indexOf('treasury_vnd=treasury_vnd-t.reward_vnd'), 'Meeting action must skip legacy autopay branch');
});
test('task status trigger prevents any old progress RPC from bypassing review',()=>{
  assert.match(sql,/create trigger meeting_report_gate_v21[\s\S]*before update of status,progress/);
  assert.match(sql,/new\.progress=100 or new\.status in \('completed','cancelled'\)/);
  assert.match(sql,/r\.task_id=new\.id and r\.status='approved'/);
  assert.match(sql,/r\.task_id=new\.id and r\.status='rejected'/);
  assert.match(sql,/raise exception 'Meeting task requires CEO report review'/);
  const reviewFn=sql.slice(sql.indexOf("create or replace function public.review_meeting_work_report_v21("));
  assert.ok(reviewFn.indexOf("set status='approved',review_notes") < reviewFn.indexOf("update public.tasks set progress=100,status='completed'"));
});
test('report routes enforce auth ownership and validate action belongs to meeting',()=>{
  const auth=api.indexOf("app.use('/api', auth)");
  const post=api.indexOf("app.post('/api/meetings/:id/actions/:actionId/review'");
  assert.ok(auth>0 && post>auth);
  const body=api.slice(post,api.indexOf("app.post('/api/company'",post));
  assert.match(body,/validateWorkReportReview\(req\.body\)/);
  assert.match(body,/\.eq\('meeting_id', meetingId\.data\)\.eq\('company_id', company\.id\)/);
  assert.match(body,/p_user_id: req\.user\.id/);
  assert.match(body,/review_meeting_work_report_v21/);
  assert.doesNotMatch(body,/db\.from\('companies'\)\.update|db\.from\('ledger_entries'\)\.insert/);
  assert.match(api,/app\.get\('\/api\/meetings\/:id\/actions'[\s\S]*meeting_work_reports_v21/);
  assert.match(api,/meeting_action_items_v20'[\s\S]*Nhiệm vụ sau họp chỉ hoàn thành khi CEO nghiệm thu/);
});
test('UI exposes explicit CEO choices, revision state and safe legacy completed message',()=>{
  assert.match(ui,/CEO nghiệm thu & chi thưởng/);
  assert.match(ui,/Yêu cầu sửa/);
  assert.match(ui,/Từ chối \(không thưởng\)/);
  assert.match(ui,/revision_requested/);
  assert.match(ui,/expectedRevision: report\.revision_no/);
  assert.match(ui,/đã hoàn tất trước v21/i);
  assert.match(ui,/pending\.current/);
  assert.match(meetingUi,/WorkReportReview/);
  assert.match(types,/'cancelled'/);
});
test('readiness now checks v21 report migration',()=>{
  assert(requiredTables.includes('meeting_work_reports_v21'));
});
