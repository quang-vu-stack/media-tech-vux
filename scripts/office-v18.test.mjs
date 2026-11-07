import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  COMPANY_LEVEL_MAX, OFFICE_DESKS, CONFERENCE_SEATS,
  employeeActivity, levelFromXp, unlockedOfficeFeatures, nextOfficeUnlock,
} from '../apps/web/src/office-simulation.js';

const employee={id:'c-01',full_name:'Minh Quân'};
const task={id:'t-1',employee_id:'c-01',title:'Dự án phần mềm AI',status:'in_progress'};
const meeting={id:'m-1',title:'Họp chiến lược quý',attendee_ids:['c-01','c-02'],status:'active'};
const fn=(index,tasks=[],m=null,nowSeconds=0)=>employeeActivity({index,employee,tasks,meeting:m,nowSeconds});

test('24 desk locations are physically distinct, no overlapping furniture',()=>{
  assert.equal(OFFICE_DESKS.length,24);
  assert.equal(new Set(OFFICE_DESKS.map(p=>`${p.x},${p.z}`)).size,24);
});
test('meeting seats are distinct for 20 meeting seats',()=>{
  assert.equal(CONFERENCE_SEATS.length,20);
  assert.equal(new Set(CONFERENCE_SEATS.map(p=>`${p.x},${p.z}`)).size,20);
});
test('active meeting overrides normal task and sends chosen employee to table',()=>{
  const state=fn(0,[task],meeting,33);
  assert.equal(state.zone,'meeting');
  assert.match(state.label,/Đang họp/);
  assert.equal(state.x,CONFERENCE_SEATS[0].x);
});
test('employee not invited still works on their task during meeting',()=>{
  const state=fn(0,[task],{...meeting,attendee_ids:['c-02']},0);
  assert.equal(state.zone,'desk');
  assert.match(state.label,/Đang làm/);
});
test('an ended meeting returns employee to task routine',()=>{
  const state=fn(0,[task],{...meeting,status:'ended'},0);
  assert.notEqual(state.zone,'meeting');
});
test('employee with task can visit big screen and return to desk',()=>{
  assert.equal(fn(0,[task],null,76).zone,'screen');
  assert.equal(fn(0,[task],null,3).zone,'desk');
});
test('no active tasks yields idle or walking, not fake work reports',()=>{
  for(const seconds of [0,11,22,44,66]){
    const state=fn(0,[],null,seconds);
    assert.ok(['desk','walk','break'].includes(state.zone));
    assert.ok(!state.label.startsWith('Đang làm:'));
  }
});
test('company XP levels cap at max 100 without deleting cumulative XP',()=>{
  assert.equal(COMPANY_LEVEL_MAX,100);
  assert.equal(levelFromXp(0),1);
  assert.equal(levelFromXp(500),2);
  assert.equal(levelFromXp(14500),30);
  assert.equal(levelFromXp(9999999),100);
  assert.equal(levelFromXp(-15),1);
});
test('visual office unlocks grow with company level',()=>{
  assert.equal(unlockedOfficeFeatures(1).length,1);
  assert.equal(unlockedOfficeFeatures(15).length,2);
  assert.equal(unlockedOfficeFeatures(100).length,7);
  assert.equal(nextOfficeUnlock(1).level,10);
  assert.equal(nextOfficeUnlock(100),null);
});
const sql=readFileSync(new URL('../supabase/upgrade_v18_meetings.sql',import.meta.url),'utf8');
const api=readFileSync(new URL('../apps/api/src/index.js',import.meta.url),'utf8');
const frontend=readFileSync(new URL('../apps/web/src/components/MeetingsView.tsx',import.meta.url),'utf8');
test('database protects meeting ownership and enforces one active meeting',()=>{
  assert.match(sql,/for select to authenticated/);
  assert.match(sql,/owner_id=\(select auth\.uid\(\)\)/);
  assert.match(sql,/one_active_company_meeting_v18/);
  assert.match(sql,/for update/);
  assert.match(sql,/count\(distinct id\)/);
  assert.match(sql,/grant execute on function public\.start_company_meeting_v18.*to service_role/i);
});
test('database enforces max company level using trigger on all XP updates',()=>{
  assert.match(sql,/before insert or update of xp, level on public\.companies/i);
  assert.match(sql,/least\(30, greatest\(1/);
});
test('backend validates meeting participants and ownership',()=>{
  assert.match(api,/app\.post\('\/api\/meetings'/);
  assert.match(api,/app\.post\('\/api\/meetings\/:id\/end'/);
  assert.match(api,/\.max\(19\)/);
  assert.match(api,/ownedCompany\(req\.user\.id\)/);
});
test('CEO can choose all initial staff, end meeting, and enter minutes',()=>{
  assert.match(frontend,/Chọn toàn bộ \(tối đa 19\)/);
  assert.match(frontend,/Biên bản \/ quyết định của CEO/);
  assert.match(frontend,/\/meetings\/\$\{feed\.active\.id\}\/end/);
});
