import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, RoundedBox } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CompanyMeeting, Employee, Task } from '../types';
import {
  OFFICE_DESKS, CONFERENCE_SEATS, OFFICE_ROOMS, COMPANY_LEVEL_MAX,
  employeeActivity, corridorRoute, assignEmployeeDesks,
} from '../office-simulation';
import { recentVuxSpeechByAgent } from '../vux-live-feed.js';
import type { VuxConversation } from './VuxControlPanel';

type Props = {
  employees: Employee[];
  tasks?: Task[];
  meeting?: CompanyMeeting | null;
  speakerId?: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCeoSelect?: () => void;
  onMeetingSelect?: () => void;
  onContractsSelect?: () => void;
  ceoName?: string;
  companyName?: string;
  companyLevel?: number;
  timeScale?: number;
  chatBubbles?: boolean;
  contracts?: Array<{revenue_vnd:number;cost_vnd:number;status:string}>;
  conversations?: VuxConversation[];
};
const MIN_DISTANCE = 9;
const MAX_DISTANCE = 95;

function Desk({ x, z, level }: { x: number; z: number; level: number }) {
  return <group position={[x, 0, z]}>
    <RoundedBox args={[1.75, 0.14, 1.06]} position={[0, 0.82, -0.2]} radius={0.05} castShadow receiveShadow>
      <meshStandardMaterial color={level >= 20 ? '#7c6470' : '#687f94'} roughness={0.65}/>
    </RoundedBox>
    {[-0.73, 0.73].map(j => <mesh key={j} position={[j, 0.42, -0.2]} castShadow>
      <boxGeometry args={[0.12,0.72,0.85]}/><meshStandardMaterial color="#24364e"/>
    </mesh>)}
    <mesh position={[0, 1.12, -0.45]} castShadow><boxGeometry args={[0.75,0.50,0.075]}/><meshStandardMaterial color="#081529"/></mesh>
    <mesh position={[0, 1.12, -0.404]}><planeGeometry args={[0.68,0.42]}/><meshBasicMaterial color={level >= 10 ? '#2587b3' : '#2d789a'}/></mesh>
    <mesh position={[0, 0.93, -0.4]}><boxGeometry args={[0.07,0.14,0.07]}/><meshStandardMaterial color="#7ba3bc"/></mesh>
    <mesh position={[0.32, 0.9, -0.25]}><boxGeometry args={[0.30,0.03,0.16]}/><meshStandardMaterial color="#a7c5d9"/></mesh>
  </group>;
}

function ConferenceTable({ meeting, onMeetingSelect }: { meeting: CompanyMeeting | null | undefined; onMeetingSelect?: () => void }) {
  const room=OFFICE_ROOMS.find(r=>r.id==='meeting')!;
  return <group position={[room.x,0,room.z]} onDoubleClick={e=>{e.stopPropagation();onMeetingSelect?.()}}>
    <RoundedBox args={[9.4,0.2,1.9]} position={[0,0.9,0]} radius={0.11} castShadow receiveShadow><meshStandardMaterial color="#6c4a49" metalness={0.15}/></RoundedBox>
    {[-3.6,3.6].map(x=><mesh key={x} position={[x,0.45,0]}><boxGeometry args={[0.23,0.85,1.2]}/><meshStandardMaterial color="#4e4b68"/></mesh>)}
    <mesh position={[0,1.05,0]}><boxGeometry args={[2.2,0.035,0.75]}/><meshStandardMaterial color="#1d7c9c" emissive="#076690" emissiveIntensity={0.8}/></mesh>
    <Html position={[0,2.6,0]} center distanceFactor={18}><button type="button" className={`office-meeting-sign ${meeting?.status==='active'?'active':''}`} onClick={onMeetingSelect}>{meeting?.status==='active' ? `● ĐANG HỌP · ${meeting.title}` : 'PHÒNG HỌP · NHẤN ĐỂ TRIỆU TẬP'}</button></Html>
    {CONFERENCE_SEATS.map((seat,i)=><group key={i} position={[seat.x-room.x,0,seat.z-room.z]}>
      <mesh position={[0,0.37,0]}><boxGeometry args={[0.64,0.19,0.56]}/><meshStandardMaterial color="#283e63"/></mesh>
      <mesh position={[0,0.72,seat.z<room.z?-0.25:0.25]}><boxGeometry args={[0.62,0.72,0.11]}/><meshStandardMaterial color="#46547f"/></mesh>
    </group>)}
  </group>;
}

function WallMonitor({ tasks, meeting, companyName, companyLevel, contracts=[] }: { tasks: Task[]; meeting: CompanyMeeting | null | undefined; companyName: string; companyLevel: number; contracts?: Array<{revenue_vnd:number;cost_vnd:number;status:string}> }) {
  const open = tasks.filter(t=>t.status==='in_progress').slice(0,4);
  const net=contracts.filter(c=>c.status==='completed').reduce((n,c)=>n+Number(c.revenue_vnd||0)-Number(c.cost_vnd||0),0);
  return <group position={[-6,2.8,-14.38]}>
    <mesh castShadow><boxGeometry args={[7.4,3.35,0.25]}/><meshStandardMaterial color="#081421" metalness={0.35}/></mesh>
    <mesh position={[0,0,0.14]}><planeGeometry args={[7.1,3.06]}/><meshBasicMaterial color="#102942"/></mesh>
    <Html transform center distanceFactor={9} position={[0,0,0.17]}>
      <div className="v18-wall-display">
        <div className="v18-display-kicker">MEDIA TECH VUX · LIVE OPERATIONS</div>
        <strong>{companyName}</strong>
        <div className="v18-display-metrics"><span>LV {Math.min(COMPANY_LEVEL_MAX, companyLevel)}/{COMPANY_LEVEL_MAX}</span><span>{open.length} nhiệm vụ đang xử lý</span><span>{meeting?.status==='active'?'● CEO ĐANG HỌP':'● TRỤ SỞ HOẠT ĐỘNG'}</span></div>
        <div className="v18-display-title">DỰ ÁN · HỢP ĐỒNG {contracts.length} · LÃI {Math.round(net/1000000)} TRIỆU ₫</div>
        {open.length ? open.map(t=><div className="v18-display-task" key={t.id}>
          <span title={t.title}>{t.title}</span><i>{t.progress}%</i>
          <div className="v18-display-bar"><div style={{width:`${Math.max(0,Math.min(100,t.progress))}%`}} /></div>
        </div>) : <div className="v18-display-empty">CEO chưa giao nhiệm vụ đang thực hiện</div>}
        {meeting?.status==='active' && <div className="v18-display-meeting">HỌP: {meeting.title} · {meeting.attendee_ids.length} người</div>}
      </div>
    </Html>
  </group>;
}

function EmployeeAvatar({employee,tasks,meeting,index,desk,selected,speaking,onClick,timeScale=1,chatBubbles=true,conversation}: {
  employee:Employee; tasks:Task[]; meeting:CompanyMeeting|null|undefined; index:number; desk:{x:number;z:number}; selected:boolean; speaking:boolean; onClick:()=>void; timeScale?:number; chatBubbles?:boolean; conversation?:string;
}) {
  const root=useRef<THREE.Group>(null);
  const body=useRef<THREE.Group>(null);
  const legs=useRef<THREE.Group>(null);
  const [activity,setActivity]=useState(()=>employeeActivity({employee,index,tasks,meeting:meeting??null,nowSeconds:Date.now()/1000,timeScale,desk}));
  const routeRef=useRef<Array<{x:number;z:number}>>([]);
  const targetRef=useRef('');
  useEffect(()=>{
    const update=()=>{const next=employeeActivity({employee,index,tasks,meeting:meeting??null,nowSeconds:Date.now()/1000,timeScale,desk});
      setActivity(prev=>prev.zone===next.zone&&prev.label===next.label&&prev.x===next.x&&prev.z===next.z&&prev.rotation===next.rotation?prev:next);};
    update(); const id=window.setInterval(update,1800);return ()=>window.clearInterval(id);
  },[employee,index,tasks,meeting,timeScale,desk]);
  const color=['#63b0f2','#c890f8','#5be2be','#f0a9a3','#eaba70'][index%5];
  useFrame(({clock},delta)=>{
    const target=activity;const group=root.current;if(!group)return;
    const key=`${target.x.toFixed(1)}:${target.z.toFixed(1)}`;
    if(key!==targetRef.current){
      const from={x:group.position.x,z:group.position.z};
      routeRef.current=corridorRoute(from,{x:target.x,z:target.z}).slice(1);
      targetRef.current=key;
    }
    const point=routeRef.current[0]??target;
    const dx=point.x-group.position.x,dz=point.z-group.position.z;
    const distance=Math.hypot(dx,dz);
    const step=Math.min(distance,Math.max(0,delta)*2.2);
    const moving=distance>0.04;
    if(moving){group.position.x+=dx/distance*step;group.position.z+=dz/distance*step;group.rotation.y=THREE.MathUtils.lerp(group.rotation.y,Math.atan2(dx,dz),Math.min(1,delta*5));}
    else if(routeRef.current.length)routeRef.current.shift();
    if(body.current){body.current.position.y=moving?Math.abs(Math.sin(clock.elapsedTime*7+index))*0.055:0;}
    if(legs.current){legs.current.rotation.z=moving?Math.sin(clock.elapsedTime*7+index)*0.13:0;}
  });
  return <group ref={root} position={[desk.x,0,desk.z+0.58]}>
    {(selected||speaking)&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,0.025,0]}><ringGeometry args={[0.37,0.51,24]}/><meshBasicMaterial color={speaking?'#f9bd66':'#70f5f6'} side={THREE.DoubleSide}/></mesh>}
    <group ref={body} onClick={e=>{e.stopPropagation();onClick()}}>
      <group ref={legs}>
        {[-0.14,0.14].map(x=><mesh key={x} position={[x,0.27,0]} castShadow><capsuleGeometry args={[0.11,0.29,5,8]}/><meshStandardMaterial color="#25344d"/></mesh>)}
      </group>
      <mesh position={[0,0.71,0]} castShadow><sphereGeometry args={[0.3,16,12]}/><meshStandardMaterial color={color}/></mesh>
      {[-0.29,0.29].map(x=><mesh key={x} position={[x,0.73,0]}><capsuleGeometry args={[0.105,0.25,5,8]}/><meshStandardMaterial color={color}/></mesh>)}
      <mesh position={[0,1.28,0]} castShadow><sphereGeometry args={[0.34,18,14]}/><meshStandardMaterial color="#f9cdb1"/></mesh>
      <mesh position={[0,1.42,-0.08]}><sphereGeometry args={[0.345,16,12,0,Math.PI*2,0,Math.PI/1.95]}/><meshStandardMaterial color={index%3===0?'#2d2438':'#493046'}/></mesh>
      {[-0.12,0.12].map(x=><mesh key={x} position={[x,1.31,0.317]}><sphereGeometry args={[0.028,8,8]}/><meshBasicMaterial color="#132137"/></mesh>)}
      <mesh position={[0,1.19,0.33]}><sphereGeometry args={[0.046,8,8]}/><meshBasicMaterial color="#d17c86"/></mesh>
    </group>
    {chatBubbles&&<Html center position={[0,2.08,0]} distanceFactor={13}><button type="button" className={`office-state-bubble v18-state ${selected?'selected':''}`} style={{borderColor:speaking?'#ffca69':activity.color}} onClick={onClick}><strong>{employee.full_name}</strong><span>{speaking?'🎙 Đang phát biểu':conversation||activity.label}</span></button></Html>}
  </group>;
}

function CEOAvatar({ name, onCeoSelect, level }: { name:string; onCeoSelect?:()=>void; level:number }) {
  const pos: [number,number,number]=[-18,0,-9.8];
  const group=useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(group.current) group.current.rotation.y=Math.sin(clock.elapsedTime*0.6)*0.065;});
  return <group position={pos}>
    <RoundedBox args={[2.25,0.17,1.1]} position={[0,0.91,-0.58]} radius={0.05} castShadow><meshStandardMaterial color="#7e5b43"/></RoundedBox>
    <mesh position={[0,1.26,-0.88]}><boxGeometry args={[0.77,0.47,0.07]}/><meshStandardMaterial color="#112642"/></mesh>
    {[-0.9,0.9].map(x=><mesh key={x} position={[x,0.5,-0.58]}><boxGeometry args={[0.12,0.7,0.8]}/><meshStandardMaterial color="#35425c"/></mesh>)}
    <group ref={group} onClick={e=>{e.stopPropagation();onCeoSelect?.();}}>
      <mesh position={[0,0.42,0.44]} castShadow><cylinderGeometry args={[0.27,0.27,0.72,12]}/><meshStandardMaterial color="#213854"/></mesh>
      <mesh position={[0,1.04,0.44]} castShadow><cylinderGeometry args={[0.25,0.31,0.61,12]}/><meshStandardMaterial color="#1d2860"/></mesh>
      <mesh position={[0,1.53,0.44]} castShadow><sphereGeometry args={[0.23,14,12]}/><meshStandardMaterial color="#efbf97"/></mesh>
      <mesh position={[0,1.77,0.44]}><coneGeometry args={[0.26,0.22,7]}/><meshStandardMaterial color={level>=20?'#f4da72':'#c4a45f'} metalness={0.7}/></mesh>
    </group>
    <Html center position={[0,2.18,0.44]} distanceFactor={13}>
      <button className="office-ceo-marker" type="button" onClick={onCeoSelect}>👑 CHỦ TỊCH & CEO · {name}</button>
    </Html>
  </group>;
}

function CampusRoom({room,onFocus}:{room:typeof OFFICE_ROOMS[number];onFocus?:(id:string)=>void}){
  return <group position={[room.x,0,room.z]} onDoubleClick={e=>{e.stopPropagation();onFocus?.(room.id)}}>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.075,0]} receiveShadow><planeGeometry args={[10.7,8.7]}/><meshStandardMaterial color="#1a2646" roughness={0.7}/></mesh>
    <mesh position={[0,1.25,-4.4]}><boxGeometry args={[10.7,2.6,0.15]}/><meshStandardMaterial color="#14213d"/></mesh>
    {[-5.35,5.35].map(x=><mesh key={x} position={[x,1.1,0]}><boxGeometry args={[0.13,2.2,8.7]}/><meshStandardMaterial color="#263052"/></mesh>)}
    <mesh position={[0,0.05,4.2]}><boxGeometry args={[10.3,0.08,0.08]}/><meshStandardMaterial color={room.color} emissive={room.color} emissiveIntensity={0.35}/></mesh>
    <Html transform center distanceFactor={16} position={[0,2.2,-4.22]}><div className="vux-room-name">{room.name}</div></Html>
    <mesh position={[-3.8,1.35,-4.3]}><boxGeometry args={[2.3,1.45,0.1]}/><meshStandardMaterial color="#071931" emissive="#082655"/></mesh>
    {[-4.5,-3.8,-3.1].map((x,i)=><mesh key={i} position={[x,1.2,-4.20]}><boxGeometry args={[0.36,0.5+(i%3)*0.18,0.05]}/><meshBasicMaterial color="#f4c56b"/></mesh>)}
    <pointLight position={[0,2.8,0]} intensity={1.5} distance={11} color={room.color}/>
    {room.id==='tech'&&<mesh position={[3,0.8,-3.2]}><boxGeometry args={[1.2,1.6,0.7]}/><meshStandardMaterial color="#283552" emissive="#0c264f"/></mesh>}
    {room.id==='finance'&&<mesh position={[3,0.8,-3.2]}><boxGeometry args={[1.1,1.1,1.1]}/><meshStandardMaterial color="#37435b" metalness={0.4}/></mesh>}
    {room.id==='marketing'&&<mesh position={[3,0.8,-3.2]}><boxGeometry args={[1.5,1.6,0.25]}/><meshStandardMaterial color="#623b7c" emissive="#2b1652"/></mesh>}
  </group>;
}

function CampusFloor({onFocus}:{onFocus?:(id:string)=>void}){
  return <>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.11,0]} receiveShadow><planeGeometry args={[48,29]}/><meshStandardMaterial color="#101c32"/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.09,0]}><planeGeometry args={[45,3.2]}/><meshStandardMaterial color="#243c5f" emissive="#071735"/></mesh>
    {OFFICE_ROOMS.map(room=><CampusRoom key={room.id} room={room} onFocus={onFocus}/>)}
    {Array.from({length:15},(_,i)=><mesh key={i} position={[-22+i*3.2,-0.07,0]}><boxGeometry args={[0.032,0.02,3]}/><meshBasicMaterial color="#41657e"/></mesh>)}
    <mesh position={[2,0.7,0.2]}><cylinderGeometry args={[0.27,0.27,1.25,12]}/><meshStandardMaterial color="#74b5de" metalness={0.35}/></mesh>
    <mesh position={[2,1.42,0.2]}><cylinderGeometry args={[0.45,0.45,0.18,12]}/><meshStandardMaterial color="#8fdaf8" transparent opacity={0.9}/></mesh>
    <pointLight position={[0,5,0]} intensity={2.4} distance={38} color="#627dff"/>
    {Array.from({length:10},(_,i)=><mesh key={i} position={[-21+i*4.6,2.5,-15.9]}><boxGeometry args={[1.6,1+(i%4),0.25]}/><meshStandardMaterial color="#09152e" emissive="#1b2b61" emissiveIntensity={0.3}/></mesh>)}
  </>;
}

function KeyboardPan(){
  const {camera,controls}=useThree();
  const keys=useRef(new Set<string>());
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{if(['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement)?.tagName))return;keys.current.add(e.key.toLowerCase())};
    const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)};
  },[]);
  useFrame((_,delta)=>{
    const k=keys.current;
    const dx=Number(k.has('d'))-Number(k.has('a'));
    const dz=Number(k.has('s'))-Number(k.has('w'));
    if(!dx&&!dz)return;
    const speed=Math.min(delta,0.05)*15;
    camera.position.x+=dx*speed;camera.position.z+=dz*speed;
    const orbit=controls as unknown as {target?:THREE.Vector3;update?:()=>void};
    orbit?.target?.add(new THREE.Vector3(dx*speed,0,dz*speed));if(orbit?.target){orbit.target.x=THREE.MathUtils.clamp(orbit.target.x,-24,24);orbit.target.z=THREE.MathUtils.clamp(orbit.target.z,-15,15);}orbit?.update?.();
  });
  return null;
}

function OfficeRoom({employees,tasks=[],meeting,speakerId,selectedId,onSelect,onCeoSelect,onMeetingSelect,onContractsSelect,ceoName='Quang Vũ',companyName='MEDIA TECH VUX',companyLevel=1,timeScale=1,chatBubbles=true,conversations=[],contracts=[]}:Props){
  const shown=employees.slice(0,24);
  const seatMap=useMemo(()=>assignEmployeeDesks(shown),[employees]);
  const latestSpeech=useMemo(()=>recentVuxSpeechByAgent(conversations),[conversations]);
  return <>
    <color attach="background" args={['#070d26']}/>
    <ambientLight intensity={1.6}/>
    <hemisphereLight args={['#568bea','#1b1029',1.1]}/>
    <directionalLight position={[13,20,16]} intensity={2.5} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}/>
    <CampusFloor onFocus={id=>{if(id==='meeting')onMeetingSelect?.();else if(id==='ceo')onCeoSelect?.();}}/>
    {OFFICE_DESKS.map((pos,i)=><Desk key={i} x={pos.x} z={pos.z} level={companyLevel}/>)}
    <ConferenceTable meeting={meeting} onMeetingSelect={onMeetingSelect}/>
    <WallMonitor tasks={tasks} meeting={meeting} companyName={companyName} companyLevel={companyLevel} contracts={contracts}/>
    <group position={[-6,0,11.1]} onClick={e=>{e.stopPropagation();onContractsSelect?.()}}>
      <mesh position={[0,0.72,0]}><cylinderGeometry args={[0.3,0.35,0.8,12]}/><meshStandardMaterial color="#e7b467"/></mesh>
      <mesh position={[0,1.26,0]}><sphereGeometry args={[0.29,14,12]}/><meshStandardMaterial color="#efcbb0"/></mesh>
      <Html center position={[0,1.95,0]} distanceFactor={14}><button className="office-state-bubble" onClick={onContractsSelect}>Khách hàng NPC · Hợp đồng</button></Html>
    </group>
    <CEOAvatar name={ceoName} onCeoSelect={onCeoSelect} level={companyLevel}/>
    {shown.map((employee,index)=>{
      const bubble=latestSpeech.get(employee.id);
      return <EmployeeAvatar key={employee.id} employee={employee} tasks={tasks} meeting={meeting} index={index} desk={seatMap.get(employee.id)??OFFICE_DESKS[index]} timeScale={timeScale} chatBubbles={chatBubbles} conversation={bubble} selected={selectedId===employee.id} speaking={speakerId===employee.id} onClick={()=>onSelect(employee.id)}/>;
    })}
  </>;
}

export default function OfficeScene(props:Props){
  return <div className="office-scene vux-office" aria-label="MEDIA TECH VUX: 8 phòng ban 3D chibi isometric, 19 nhân viên AI">
    <Canvas orthographic shadows camera={{position:[38,40,45],zoom:17,near:0.1,far:250}} dpr={[1,1.5]}>
      <Suspense fallback={null}>
        <OfficeRoom {...props}/>
        <OrbitControls makeDefault enableDamping dampingFactor={0.12} enablePan minDistance={MIN_DISTANCE} maxDistance={MAX_DISTANCE} maxPolarAngle={Math.PI/2.09} target={[0,0.8,0]} mouseButtons={{LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.ROTATE}}/>
        <KeyboardPan/>
      </Suspense>
    </Canvas>
    <div className="scene-badge">● MEDIA TECH VUX · ISOMETRIC 3D · {props.meeting?.status==='active'?'HỌP CEO':'19 AI'}</div>
    <span className="scene-help">Chuột phải: xoay · Chuột giữa: kéo · Lăn: zoom · WASD: di chuyển · Nhấp đôi vào phòng</span>
  </div>;
}
