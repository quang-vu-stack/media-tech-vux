import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateMeetingAction, publicMeetingAction, MAX_MEETING_ACTIONS } from '../apps/api/src/meeting-actions.js';

const companyId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const meetingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const employeeId = '11111111-1111-4111-8111-111111111111';
const taskId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const requestId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const input = {clientRequestId: requestId, employeeId, title:'Triển khai chiến lược sau họp',
  description:'Thực hiện bản thử nghiệm và báo cáo cho CEO', rewardVnd:0, durationMinutes:120};
const sql = fs.readFileSync(new URL('../supabase/upgrade_v20_council_actions.sql', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../apps/api/src/index.js', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../apps/web/src/components/MeetingActions.tsx', import.meta.url), 'utf8');

test('CEO action draft trims text, accepts zero reward and bounded duration',()=>{
  const result=validateMeetingAction({...input,title:'  Kế hoạch thử nghiệm  ',description:'  Báo cáo  '});
  assert.equal(result.title,'Kế hoạch thử nghiệm');
  assert.equal(result.description,'Báo cáo');
  assert.equal(result.rewardVnd,0);
  assert.equal(result.durationMinutes,120);
});
test('rejects invalid owner-bound request IDs, employee IDs and text',()=>{
  for(const altered of [
    {clientRequestId:'bad'}, {employeeId:'bad'}, {title:'  '}, {title:'x'.repeat(121)},
    {description:'X'.repeat(1001)}, {description:12},
  ]) assert.throws(()=>validateMeetingAction({...input,...altered}),/MEETING_ACTION_INVALID/);
});
test('rejects invalid rewards or durations, never implicitly awards money',()=>{
  for(const altered of [
    {rewardVnd:-1}, {rewardVnd:5000001}, {rewardVnd:1.5}, {rewardVnd:'5000'},
    {durationMinutes:0}, {durationMinutes:1441}, {durationMinutes:1.3},
  ]) assert.throws(()=>validateMeetingAction({...input,...altered}),/MEETING_ACTION_INVALID/);
});
test('rejects null and arbitrary values',()=>{
  for(const value of [null,undefined,0,[],{},'str'])
    assert.throws(()=>validateMeetingAction(value),/MEETING_ACTION_INVALID/);
});
test('response exposes only bounded data and live task progress',()=>{
  const action={id:'a',company_id:companyId,meeting_id:meetingId,employee_id:employeeId,
    client_request_id:requestId,task_id:taskId,title:input.title,description:input.description,
    reward_vnd:0,duration_minutes:120,approved_at:'2026-11-04T07:00:00Z',secret:'HIDDEN'};
  const task={id:taskId,company_id:companyId,status:'in_progress',progress:37,auto_mode:true,due_at:'2026-11-04T09:00:00Z',completed_at:null,private:'hidden'};
  const result=publicMeetingAction(action,task);
  assert.equal(result.task.progress,37);
  assert.equal(result.task.status,'in_progress');
  assert.equal(JSON.stringify(result).includes('HIDDEN'),false);
  assert.equal(JSON.stringify(result).includes('hidden'),false);
  assert.throws(()=>publicMeetingAction(action,{...task,company_id:'foreign'}),/MEETING_ACTION_TASK_MISSING/);
});
test('migration restricts writes and owner-scopes selects',()=>{
  for(const clause of ['enable row level security','auth.uid()','owner_id=p_user_id',
    'revoke insert,update,delete','grant execute on function public.approve_meeting_action_v20',
    'to service_role']) assert.ok(sql.includes(clause),clause);
  assert.match(sql,/from public\.company_meetings m0[\s\S]*?for update of m0/);
});
test('idempotency checked before task creation under meeting row lock',()=>{
  const claim=sql.indexOf('where company_id=m.company_id and client_request_id=p_client_request_id');
  const replay=sql.indexOf('return a;',claim);
  const task=sql.indexOf('t:=public.create_auto_employee_task(',replay);
  assert.ok(claim>0 && replay>claim && task>replay);
  assert.match(sql,/unique \(company_id, client_request_id\)/);
  assert.match(sql,/a\.duration_minutes<>p_duration_minutes/);
});
test('approval requires completed council, real company employee, and meeting attendee',()=>{
  for(const key of ["status='completed'",'meeting_id=m.id and company_id=m.company_id',
    'p_employee_id=any(m.attendee_ids)','e.company_id=m.company_id']) assert.ok(sql.includes(key),key);
  assert.match(sql,/count\(\*\).*?>=8/);
  assert.equal(MAX_MEETING_ACTIONS,8);
});
test('endpoint auth boundary precedes meeting actions, body validated and owner verified',()=>{
  assert.ok(api.indexOf("app.use('/api', auth)")<api.indexOf("app.post('/api/meetings/:id/actions'"));
  assert.match(api,/validateMeetingAction\(req.body\)/);
  assert.match(api,/p_user_id: req.user.id/);
  assert.match(api,/approve_meeting_action_v20/);
  assert.match(api,/\.eq\('company_id', company.id\)/);
  assert.match(api,/app\.get\('\/api\/meetings\/:id\/actions'/);
});
test('action route never calls LLM or writes treasury/ledger directly',()=>{
  const snippet=api.split('// v20 VIP: CEO-approved decisions')[1].split('// v21 VIP: CEO is the ONLY authority')[0];
  assert.doesNotMatch(snippet,/gemini|openai|treasury_vnd\s*=|ledger_entries|pay_payroll|advance_employee_task/);
  assert.match(snippet,/approve_meeting_action_v20/);
});
test('UI requires explicit CEO approval and does not auto-retry a POST',()=>{
  assert.match(ui,/CEO phê duyệt & giao việc/);
  assert.match(ui,/pendingRequestId/);
  assert.match(ui,/crypto\.randomUUID\(\)/);
  assert.match(ui,/20_000/);
  assert.doesNotMatch(ui,/setInterval\(\(\).*approve/);
  assert.match(ui,/Tiến độ và báo cáo bản này được mô phỏng theo thời gian/);
});
