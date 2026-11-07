import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safePlan,offlinePlan,stepsWithProgress} from '../apps/api/src/agent-planning.js';
const employee={full_name:'Nguyễn Minh Quân'};
test('offline template returns 3 valid steps',()=>{const p=offlinePlan('Xây dựng kế hoạch ra mắt sản phẩm',employee);assert.equal(p.steps.length,3);assert.equal(p.rewardVnd,300000)});
test('reject oversized payout',()=>assert.throws(()=>safePlan({title:'Kế hoạch thử nghiệm',description:'Mô tả kế hoạch dài đủ',rewardVnd:5_000_001,steps:[{title:'Bước đầu thử nghiệm',durationMinutes:20},{title:'Bước sau thử nghiệm',durationMinutes:20}]})));
test('reject overly long running plan',()=>assert.throws(()=>safePlan({title:'Kế hoạch thử nghiệm',description:'Mô tả kế hoạch dài đủ',rewardVnd:1000,steps:Array.from({length:4},(_,i)=>({title:'Bước thứ '+(i+1)+' có mục đích',durationMinutes:480}))})));
test('step status changes according to time',()=>{const p=offlinePlan('Xây dựng kế hoạch ra mắt sản phẩm',employee);const start='2026-11-04T00:00:00.000Z';const at='2026-11-04T00:03:00.000Z';assert.deepEqual(stepsWithProgress(p,start,at,false).map(x=>x.status),['completed','working','queued']);assert.ok(stepsWithProgress(p,start,at,true).every(x=>x.status==='completed'))});
test('handle fenced JSON output',()=>{const p=offlinePlan('Xây dựng kế hoạch ra mắt sản phẩm',employee);assert.deepEqual(safePlan('```json\n'+JSON.stringify(p)+'\n```'),p)});
