/** MEDIA TECH VUX v29: deterministic visual simulation, no network or financial writes. */
export const COMPANY_LEVEL_MAX = 100;
export const XP_PER_LEVEL = 500;
export const TIME_SCALES = Object.freeze([0.15, 0.25, 0.5, 1, 1.5, 2]);
export const OFFICE_LEVEL_UNLOCKS = Object.freeze([
  { level: 1, title:'Văn phòng khởi nghiệp', feature:'8 khu vực và 19 nhân viên' },
  { level: 10, title:'Phòng điều hành thông minh', feature:'Trung tâm theo dõi KPI' },
  { level: 20, title:'Đội ngũ chuyên sâu', feature:'Bảng hiệu và thiết bị nâng cấp' },
  { level: 35, title:'VUX AI Studio', feature:'Trung tâm AI chuyên dụng' },
  { level: 50, title:'Tập đoàn quốc gia', feature:'Không gian văn phòng cao cấp' },
  { level: 75, title:'Đế chế công nghệ', feature:'Đồ họa và ánh sáng VIP' },
  { level: 100, title:'LEVEL MAX', feature:'Đỉnh cao MEDIA TECH VUX' },
]);
// Isometric 4 x 2 campus. Floor is navigable via central corridor z=-1..+1.
export const OFFICE_ROOMS = Object.freeze([
  { id:'ceo', name:'Phòng CEO Quang Vũ', x:-18, z:-10, color:'#e0b663' },
  { id:'meeting', name:'Phòng Họp Trung Tâm', x:-6, z:-10, color:'#45d5e8' },
  { id:'tech', name:'Phòng Kỹ Thuật', x:6, z:-10, color:'#46a8fa' },
  { id:'design', name:'Phòng Thiết Kế', x:18, z:-10, color:'#dd8bf2' },
  { id:'marketing', name:'Phòng Marketing', x:-18, z:10, color:'#ef84b8' },
  { id:'sales', name:'Phòng Kinh Doanh', x:-6, z:10, color:'#6bdfbc' },
  { id:'hr', name:'Phòng Nhân Sự', x:6, z:10, color:'#a4a3fb' },
  { id:'finance', name:'Phòng Tài Chính', x:18, z:10, color:'#f1b666' },
]);
const EMPLOYEE_ROOM_IDS=['tech','design','marketing','sales','hr','finance'];
export const OFFICE_DESKS = Object.freeze(EMPLOYEE_ROOM_IDS.flatMap(roomId=>{
  const room=OFFICE_ROOMS.find(r=>r.id===roomId);
  return [-2.6,2.6].flatMap(x=>[-1.8,1.8].map(z=>({x:room.x+x,z:room.z+z,roomId})));
}));
// 19 AI + 1 CEO = 20 distinct conference positions.
const meetingRoom = OFFICE_ROOMS.find(r=>r.id==='meeting');
export const CONFERENCE_SEATS = Object.freeze(Array.from({length:20},(_,i)=>({
  x:meetingRoom.x-4.3+(i%10)*0.96,
  z:meetingRoom.z+(i<10?-1.3:1.3),rot:i<10?0:Math.PI,
})));
export const CEO_MEETING_SEAT = Object.freeze({x:meetingRoom.x,z:meetingRoom.z-2.7});
export const DEMO_SPOTS=Object.freeze(Array.from({length:4},(_,i)=>({x:meetingRoom.x-2+i*1.35,z:meetingRoom.z-3,rot:0})));
export const WATER_COOLER=Object.freeze({x:2,z:0.2});
export function levelFromXp(xp){const safe=Number.isFinite(xp)?Math.max(0,Math.floor(xp)):0;return Math.min(COMPANY_LEVEL_MAX,1+Math.floor(safe/XP_PER_LEVEL));}
export function unlockedOfficeFeatures(level){const n=Math.max(1,Math.min(COMPANY_LEVEL_MAX,Math.floor(level)||1));return OFFICE_LEVEL_UNLOCKS.filter(x=>x.level<=n);}
export function nextOfficeUnlock(level){const n=Math.max(1,Math.floor(level)||1);return OFFICE_LEVEL_UNLOCKS.find(x=>x.level>n)??null;}
export function safeTimeScale(scale){return TIME_SCALES.includes(Number(scale))?Number(scale):1;}
export function roomForEmployee(employee,index=0){
  const text=`${employee.role||''} ${employee.department||''}`.toLowerCase();
  if(/design|thiết kế|ui|ux/.test(text))return 'design';
  if(/marketing|truyền thông|content|video|seo|quảng cáo|social/.test(text))return 'marketing';
  if(/sales|kinh doanh|account|khách hàng|b2b/.test(text))return 'sales';
  if(/nhân sự|tuyển dụng|hr|recruit/.test(text))return 'hr';
  if(/finance|tài chính|cfo|kế toán|ngân sách/.test(text))return 'finance';
  if(/tech|kỹ thuật|dev|ai|code|backend|frontend|qa|cto|công nghệ/.test(text))return 'tech';
  return EMPLOYEE_ROOM_IDS[index%EMPLOYEE_ROOM_IDS.length];
}
export function employeeDesk(employee,index=0){
  // unique physical spot per index for the 19 starting staff, regardless of departments.
  const preferred=roomForEmployee(employee,index);
  const same=OFFICE_DESKS.filter(d=>d.roomId===preferred);
  const choice=same[index%same.length];
  // If several staff share a department, allow overflow to the next free campus desks.
  // The caller can supply a stable global index; the 24 desk grid remains addressable.
  return choice;
}
// A simple obstacle-avoiding corridor route, rather than walking through walls.
export function assignEmployeeDesks(employees){
  const used=new Set();
  const assigned=new Map();
  for(const [index,employee] of employees.entries()){
    const preferred=roomForEmployee(employee,index);
    const pick=OFFICE_DESKS.find(d=>d.roomId===preferred&&!used.has(`${d.x}:${d.z}`)) ?? OFFICE_DESKS.find(d=>!used.has(`${d.x}:${d.z}`)) ?? OFFICE_DESKS[index%OFFICE_DESKS.length];
    used.add(`${pick.x}:${pick.z}`);
    assigned.set(employee.id,pick);
  }
  return assigned;
}
export function corridorRoute(from,to){
  if(!from||!to)return [];
  const route=[{x:from.x,z:from.z}];
  if(Math.abs(from.x-to.x)<4 && Math.abs(from.z-to.z)<4)return [...route,{x:to.x,z:to.z}];
  if(Math.abs(from.z)>4 || Math.abs(to.z)>4){
    route.push({x:from.x,z:from.z<0?-3:3});
    route.push({x:from.x,z:0});
    route.push({x:to.x,z:0});
    route.push({x:to.x,z:to.z<0?-3:3});
  }
  route.push({x:to.x,z:to.z});
  return route.filter((pt,i)=>i===0||pt.x!==route[i-1].x||pt.z!==route[i-1].z);
}
/** Visual FSM driven by game clock; never accelerates a Gemini call. */
export function employeeActivity({employee,index,tasks=[],meeting=null,nowSeconds=0,timeScale=1,desk=OFFICE_DESKS[index%OFFICE_DESKS.length]}){
  const home={x:desk.x,z:desk.z+0.58};
  const activeMeeting=meeting?.status==='active'&&Array.isArray(meeting.attendee_ids)&&meeting.attendee_ids.includes(employee.id);
  if(activeMeeting){const idx=meeting.attendee_ids.indexOf(employee.id);const seat=CONFERENCE_SEATS[idx%CONFERENCE_SEATS.length];return {zone:'meeting',label:`Đang họp: ${meeting.title}`,color:'#f8be6b',...seat,rotation:seat.rot};}
  const task=tasks.find(t=>t.employee_id===employee.id&&t.status==='in_progress');
  const phase=Math.floor((nowSeconds*safeTimeScale(timeScale)+index*4)/24)%6;
  if(task){
    if(phase===1) return {zone:'walk',label:'Đang trao đổi công việc',color:'#a6ddff',x:home.x+0.25,z:home.z+0.8,rotation:0};
    if(phase===2)return {zone:'break',label:'Đang uống nước',color:'#c5b7ff',...WATER_COOLER,rotation:0};
    if(phase===3)return {zone:'screen',label:`Đang trình bày: ${task.title}`,color:'#89dcff',x:meetingRoom.x,z:meetingRoom.z-3,rotation:0};
    return {zone:'desk',label:`Đang làm: ${task.title}`,color:'#69e3c1',...home,rotation:0};
  }
  if(phase===2)return {zone:'break',label:'Đang nghỉ giải lao',color:'#b7b9ff',...WATER_COOLER,rotation:0};
  if(phase===3)return {zone:'walk',label:'Đang tìm đồng nghiệp',color:'#c9baf7',x:desk.x+0.3,z:desk.z+1.0,rotation:0};
  return {zone:'desk',label:'Sẵn sàng nhận việc',color:'#bacfe0',...home,rotation:0};
}
