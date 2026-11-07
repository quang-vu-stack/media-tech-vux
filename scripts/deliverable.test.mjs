import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanDeliverable,simulatedDeliverable,buildDeliveryPrompt} from '../apps/api/src/deliverable-engine.js';
const order={id:'00000000-0000-4000-8000-000000000001',objective:'Xây dựng kế hoạch marketing sản phẩm VUS AI',provider:'simulated',plan:{title:'Chiến dịch VUS AI',description:'Xây dựng kế hoạch nội bộ dài hạn',rewardVnd:300000,steps:[{title:'Chuẩn bị và nghiên cứu',durationMinutes:2},{title:'Viết chiến lược',durationMinutes:3}]}};
const employee={full_name:'Nguyễn Minh Quân',role:'CTO',department:'Công nghệ'};
test('offline mode produces structured deliverable with 3 sections',()=>{
  const d=simulatedDeliverable(order,employee);
  assert.equal(d.sections.length,3);
  assert.match(d.caveats,/không gọi Gemini\/OpenAI/);
  assert.match(d.summary,/Nguyễn Minh Quân/);
});
test('model output JSON markdown may be sanitized',()=>{
  const d=simulatedDeliverable(order,employee);
  assert.deepEqual(cleanDeliverable('```json\n'+JSON.stringify(d)+'\n```'),d);
});
test('reject invalid field types',()=>assert.throws(()=>cleanDeliverable({title:'Title test',summary:'A valid paragraph of sufficient size',sections:[{heading:'Header',body:'A sufficiently long body of text for the initial section.'},{heading:'Second',body:34}],nextSteps:'A sufficient number of steps',caveats:'This is limited content'})));
test('reject very large document',()=>{
  const d=simulatedDeliverable(order,employee);
  d.sections=Array.from({length:6},(_,i)=>({heading:`Chapter ${i+1}`,body:'A'.repeat(3500)}));
  assert.throws(()=>cleanDeliverable(d));
});
test('revision feedback is passed to model as untrusted input',()=>{
  const p=buildDeliveryPrompt({...order,review_notes:'Cần thêm số liệu',revision_no:2},employee);
  assert.match(p.input,/Cần thêm số liệu/);
  assert.match(p.instructions,/không được nói đã truy cập website/);
});
test('worker avoids auto payout for agent tasks, pay only on accept',()=>{
  const sql=readFileSync(new URL('../supabase/upgrade_deliverables_v6.sql',import.meta.url),'utf8');
  assert.match(sql,/NOT EXISTS\(SELECT 1 FROM public\.agent_orders a WHERE a\.task_id=x\.id\)/);
  assert.match(sql,/p_action='accept'|p_action NOT IN \('accept','revise','retry'\)/);
  assert.match(sql,/t\.reward_vnd/);
  assert.match(sql,/FOR UPDATE OF a/);
});
test('routes validate owner on review and block manual progress for agent orders',()=>{
  const code=readFileSync(new URL('../apps/api/src/index.js',import.meta.url),'utf8');
  assert.match(code,/review_agent_draft/);
  assert.match(code,/Nhiệm vụ AI phải do CEO nghiệm thu/);
  assert.match(code,/p_user_id:req\.user\.id/);
});
