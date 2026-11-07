import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OFFICE_ROOMS,OFFICE_DESKS,CONFERENCE_SEATS,COMPANY_LEVEL_MAX,TIME_SCALES,assignEmployeeDesks,corridorRoute,safeTimeScale,levelFromXp,employeeActivity} from '../apps/web/src/office-simulation.js';
import {pickConversationPair,dynamicTopic,parseConversation,shouldEnableAutonomousAI,VUX_DAILY_GEMINI_CAP} from '../apps/api/src/vux-conversation.js';
const sql=readFileSync(new URL('../supabase/upgrade_v29_vux_opt_in.sql',import.meta.url),'utf8');
const backend=readFileSync(new URL('../apps/api/src/index.js',import.meta.url),'utf8');
const office=readFileSync(new URL('../apps/web/src/components/OfficeScene.tsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../apps/web/src/App.tsx',import.meta.url),'utf8');
const employees=Array.from({length:19},(_,i)=>({id:`id${i}`,role:['CTO','Marketing Manager','CFO','Frontend Developer','Recruiter','Sales Manager'][i%6],department:['Kỹ thuật','Marketing','Tài chính','Thiết kế','Nhân sự','Kinh doanh'][i%6],energy:90,status:'idle',full_name:`Employee ${i}`}));
test('eight distinct labeled areas and all expected rooms',()=>{
 assert.equal(OFFICE_ROOMS.length,8);assert.equal(new Set(OFFICE_ROOMS.map(x=>x.id)).size,8);
 for(const expected of ['ceo','meeting','tech','design','marketing','sales','hr','finance'])assert.ok(OFFICE_ROOMS.some(x=>x.id===expected));
});
test('at least 19 unique workstations and 20 unique conference seats',()=>{
 assert.ok(OFFICE_DESKS.length>=19);assert.equal(new Set(OFFICE_DESKS.map(x=>`${x.x}:${x.z}`)).size,OFFICE_DESKS.length);
 assert.ok(CONFERENCE_SEATS.length>=20);assert.equal(new Set(CONFERENCE_SEATS.map(x=>`${x.x}:${x.z}`)).size,CONFERENCE_SEATS.length);
});
test('assign 19 employees to 19 unique positions',()=>{
 const desk=assignEmployeeDesks(employees);
 assert.equal(desk.size,19);assert.equal(new Set([...desk.values()].map(x=>`${x.x}:${x.z}`)).size,19);
});
test('level max 100 preserves cumulative xp and six safe time scales',()=>{
 assert.equal(COMPANY_LEVEL_MAX,100);assert.equal(levelFromXp(49500),100);assert.equal(levelFromXp(100000),100);
 assert.deepEqual(TIME_SCALES,[.15,.25,.5,1,1.5,2]);assert.equal(safeTimeScale(999),1);
});
test('navigation uses corridor for journeys between rooms',()=>{
 const route=corridorRoute({x:-18,z:-10},{x:18,z:10});assert.ok(route.length>=5);
 assert.ok(route.some(x=>x.z===0));
});
test('AI meeting state takes priority over desk work',()=>{
 const activity=employeeActivity({employee:employees[0],index:0,tasks:[],meeting:{status:'active',title:'CEO họp',attendee_ids:['id0']},nowSeconds:99});
 assert.equal(activity.zone,'meeting');
});
test('break and water state are possible without Gemini calls',()=>{
 const activity=employeeActivity({employee:employees[0],index:0,tasks:[],meeting:null,nowSeconds:49});
 assert.equal(activity.zone,'break');
});
test('adaptive scheduler skips working or tired workers',()=>{
 assert.equal(pickConversationPair([{...employees[0],energy:9}, {...employees[1],status:'working'}]),null);
 const pair=pickConversationPair(employees,0);assert.equal(pair.length,2);assert.notEqual(pair[0].id,pair[1].id);
});
test('dynamic topic changes when last topic has already been covered',()=>{
 const [a,b]=employees;
 const first=dynamicTopic(a,b,[],[]);const second=dynamicTopic(a,b,[],[{topic:first}]);assert.notEqual(first,second);
});
test('parse bounded Gemini output, reject invalid participant',()=>{
 const transcript=parseConversation(JSON.stringify({turns:[{speaker:'A',text:'Chào bạn'},{speaker:'B',text:'Cùng trao đổi việc nhé'}],summary:'Trao đổi'}),'id0','id1');
 assert.equal(transcript.turns.length,2);assert.equal(transcript.turns[1].speaker,'id1');
 assert.throws(()=>parseConversation({turns:[{speaker:'X',text:'hello'},{speaker:'B',text:'hi'}]},'id0','id1'));
});
test('AI calls strictly opt-in with daily cap',()=>{
 assert.equal(shouldEnableAutonomousAI({enabled:false,apiKey:'abc',mode:'adaptive'}),false);
 assert.equal(shouldEnableAutonomousAI({enabled:true,apiKey:'',mode:'adaptive'}),false);
 assert.equal(shouldEnableAutonomousAI({enabled:true,apiKey:'key',mode:'off'}),false);
 assert.equal(shouldEnableAutonomousAI({enabled:true,apiKey:'key',mode:'quiet'}),true);
 assert.ok(VUX_DAILY_GEMINI_CAP<=12);
});
test('migration creates separate VUX bootstrap, preserves VUS capital and database ownership',()=>{
 assert.match(sql,/bootstrap_vux_company_v29/);assert.match(sql,/2000000000/);assert.match(sql,/vux_topup_staff_v29/);
 assert.match(sql,/if v_count>=19 then exit/);assert.match(sql,/on conflict\(company_id\) do nothing/);
 assert.match(sql,/case when lower\(new.name\) like 'media tech vux%' then 100 else 30/);
 assert.doesNotMatch(sql,/delete from public\.companies|truncate public\.employees/i);
 assert.match(sql,/revoke execute on function public\.bootstrap_vux_company_v29.*from public,anon,authenticated/i);
});
test('settings reuse existing game_settings and server checks company owner',()=>{
 assert.match(sql,/alter table public\.game_settings add column if not exists time_scale/);
 assert.match(sql,/game_settings_vux_owner_select/);
 assert.match(backend,/app\.put\('\/api\/vux\/settings'/);
 assert.match(backend,/ownedCompany\(req\.user\.id\)/);
 assert.match(backend,/ENABLE_VUX_AUTONOMOUS_GEMINI/);
});
test('3D office is real geometry, isometric and visible room labels',()=>{
 assert.match(office,/<Canvas orthographic/);assert.match(office,/OFFICE_ROOMS\.map/);
 assert.match(office,/mouseButtons=/);assert.match(office,/KeyboardPan/);assert.match(office,/vux-room-name/);
 assert.match(office,/sphereGeometry/);assert.match(office,/onDoubleClick/);
});
test('frontend branded VUX, level 100, CEO Quang Vũ',()=>{
 assert.match(app,/MEDIA TECH VUX/);assert.match(app,/Quang Vũ/);assert.match(app,/100/);
 assert.match(app,/VuxControlPanel/);
});
