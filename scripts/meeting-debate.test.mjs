import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildDebateInstructions, parseDebateResult, validateDebateParticipants } from '../apps/api/src/meeting-debate.js';

const e1 = '11111111-1111-4111-8111-111111111111';
const e2 = '22222222-2222-4222-8222-222222222222';
const e3 = '33333333-3333-4333-8333-333333333333';
const allowed = [e1,e2,e3];
const example = {
  turns: [
    {employeeId:e1,round:1,content:'Tôi đề xuất tối ưu quy trình.'},
    {employeeId:e2,round:1,content:'Cần kiểm tra ngân sách trước.'},
    {employeeId:e1,round:2,content:'Tôi đồng ý phải kiểm tra chi phí.'},
    {employeeId:e2,round:2,content:'Hãy thí điểm trước khi mở rộng.'},
  ],
  summary:'Cả hai thống nhất kiểm soát rủi ro.',
  recommendation:'CEO cân nhắc thí điểm có giới hạn ngân sách.',
};

const shouldFail = action => assert.throws(action,/MEETING_(?:PARTICIPANTS_INVALID|AI_INVALID_OUTPUT)/);

test('accept 2 to 4 selected employees from the meeting',()=>{
  assert.deepEqual(validateDebateParticipants([e2,e1],allowed),[e2,e1]);
  assert.equal(validateDebateParticipants([e1,e2,e3],allowed).length,3);
});
test('reject duplicate, foreign, missing, oversized and malformed attendee selections',()=>{
  for (const selection of [[],[e1],[e1,e1],[e1,'foreign'],[e1,e2,e3,e1,e2],null]) {
    shouldFail(()=>validateDebateParticipants(selection,allowed));
  }
});
test('valid 2-round discussion parses into deterministic display order',()=>{
  const out=parseDebateResult(JSON.stringify(example),[e1,e2]);
  assert.deepEqual(out.turns.map(t=>`${t.employeeId}:${t.round}`),[`${e1}:1`,`${e2}:1`,`${e1}:2`,`${e2}:2`]);
  assert.equal(out.recommendation,example.recommendation);
});
test('fenced JSON accepted but non JSON rejected',()=>{
  assert.equal(parseDebateResult('```json\n'+JSON.stringify(example)+'\n```',[e1,e2]).turns.length,4);
  shouldFail(()=>parseDebateResult('AI says spend the money',[e1,e2]));
});
test('reject missing second-round speaker',()=>{
  shouldFail(()=>parseDebateResult(JSON.stringify({...example,turns:example.turns.slice(0,3)}),[e1,e2]));
});
test('reject duplicated or unknown speaker and wrong rounds',()=>{
  const bad = [
    {...example,turns:[example.turns[0],example.turns[0],example.turns[2],example.turns[3]]},
    {...example,turns:[{...example.turns[0],employeeId:e3},...example.turns.slice(1)]},
    {...example,turns:[{...example.turns[0],round:3},...example.turns.slice(1)]},
  ];
  for(const obj of bad) shouldFail(()=>parseDebateResult(JSON.stringify(obj),[e1,e2]));
});
test('reject maliciously long or empty AI content',()=>{
  shouldFail(()=>parseDebateResult(JSON.stringify({...example,turns:[{...example.turns[0],content:'x'.repeat(351)},...example.turns.slice(1)]}),[e1,e2]));
  shouldFail(()=>parseDebateResult(JSON.stringify({...example,summary:''}),[e1,e2]));
  shouldFail(()=>parseDebateResult(JSON.stringify({...example,recommendation:'y'.repeat(901)}),[e1,e2]));
});
test('reject control chars and wrong structured types',()=>{
  shouldFail(()=>parseDebateResult(JSON.stringify({...example,turns:[{...example.turns[0],content:'bad\u0000txt'},...example.turns.slice(1)]}),[e1,e2]));
  shouldFail(()=>parseDebateResult(JSON.stringify({...example,turns:'not array'}),[e1,e2]));
  shouldFail(()=>parseDebateResult('[]',[e1,e2]));
});
test('prompt is scoped to real employees and contains non-execution rules',()=>{
  const {system,input}=buildDebateInstructions({
    company:{name:'VUS',level:4,treasury_vnd:1000000},
    meeting:{title:'Đầu tư sản phẩm',agenda:'Thảo luận phương án'},
    participants:[{id:e1,full_name:'An',role:'CTO',department:'IT',skill:87},{id:e2,full_name:'Bình',role:'CFO',department:'Finance',skill:95}],
    tasks:[{title:'Thiết kế app',status:'in_progress',progress:25}],
  });
  assert.match(system,/CEO|CHỦ TỊCH/i);assert.match(system,/KHÔNG|không/i);
  assert.match(input,/"name":"VUS"/);assert.match(input,/CTO/);assert.match(input,/CFO/);
});
test('database migration enforces owner, company membership, row lock and private writes',()=>{
  const sql=fs.readFileSync(new URL('../supabase/upgrade_v19_ai_council.sql',import.meta.url),'utf8');
  for(const key of ['enable row level security','auth.uid()','p_user_id','owner_id=p_user_id','company_id=v_meeting.company_id',
    'p_meeting_id','v_meeting.attendee_ids','for update of m','unique references public.company_meetings','attempt_id',
    'status=\'completed\'','service_role','revoke all on function','2 and 4']) assert.ok(sql.includes(key),key);
});
test('backend AI routes are auth protected, idempotent, never execute financial operations',()=>{
  const api=fs.readFileSync(new URL('../apps/api/src/index.js',import.meta.url),'utf8');
  assert.ok(api.indexOf("app.use('/api', auth)") < api.indexOf("app.post('/api/meetings/:id/debate'"));
  assert.match(api,/reserve_meeting_debate_v19/);
  assert.match(api,/complete_meeting_debate_v19/);
  assert.match(api,/fail_meeting_debate_v19/);
  assert.match(api,/if \(!claim\?\.claimed\)/);
  assert.match(api,/max_output_tokens: 3500/);
  assert.match(api,/store: false/);
  const block=api.split('// v19 VIP AI Council')[1].split('// ------------------ CEO EMPIRE v2 API')[0];
  assert.doesNotMatch(block,/advance_employee_task|pay_payroll|create_employee_task|treasury_vnd\s*=/);
});
test('frontend exposes transcript, CEO-only recommendation acceptance and long-request timeout',()=>{
  const ui=fs.readFileSync(new URL('../apps/web/src/components/MeetingAICouncil.tsx',import.meta.url),'utf8');
  const meetings=fs.readFileSync(new URL('../apps/web/src/components/MeetingsView.tsx',import.meta.url),'utf8');
  assert.match(ui,/Vòng \{round\}/);assert.match(ui,/75_000/);assert.match(ui,/Xem người phát biểu trong 3D/);
  assert.match(ui,/onUseRecommendation/);assert.match(meetings,/setMinutes/);
});
