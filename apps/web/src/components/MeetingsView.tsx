import { useEffect, useState, type FormEvent } from 'react';
import { ClipboardList, Crown, History, UsersRound, Video, XCircle } from 'lucide-react';
import { request } from '../lib';
import type { Employee, MeetingFeed, Task } from '../types';
import OfficeScene from './OfficeScene';
import MeetingAICouncil from './MeetingAICouncil';

type Props={
  token:string;
  employees:Employee[];
  tasks:Task[];
  companyName:string;
  companyLevel:number;
  ceoName:string;
  onEmployeeSelect:(id:string)=>void;
  onCeoSelect:()=>void;
  feed:MeetingFeed;
  reload:()=>Promise<void>;
  refreshGame:()=>Promise<void>;
  notify:(message:string)=>void;
};
export default function MeetingsView({token,employees,tasks,companyName,companyLevel,ceoName,onEmployeeSelect,onCeoSelect,feed,reload,refreshGame,notify}:Props) {
  const [title,setTitle]=useState('Họp điều hành chiến lược MEDIA TECH VUX');
  const [agenda,setAgenda]=useState('Tiến độ dự án, phân công nhân viên và những quyết định cần CEO phê duyệt.');
  const [selected,setSelected]=useState<string[]>(()=>employees.slice(0,19).map(e=>e.id));
  const [minutes,setMinutes]=useState('');
  const [historyDebateId, setHistoryDebateId] = useState<string | null>(null);
  const [speakerId, setSpeakerId] = useState<string | null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    setSelected(prev=>{
      const valid=prev.filter(id=>employees.some(e=>e.id===id)).slice(0,19);
      return valid.length ? valid : employees.slice(0,19).map(e=>e.id);
    });
  },[employees]);
  async function start(event:FormEvent) {
    event.preventDefault();
    if(!selected.length)return setError('Hãy chọn ít nhất một nhân viên.');
    setBusy(true);setError('');
    try{
      await request('/meetings',token,{title,agenda,attendeeIds:selected});
      await reload();notify('CEO đã triệu tập cuộc họp. Người tham gia đang di chuyển đến bàn họp.');
    }catch(e){setError(e instanceof Error?e.message:'Không thể bắt đầu cuộc họp.');}
    finally{setBusy(false);}
  }
  async function end(){
    if(!feed.active)return;
    setBusy(true);setError('');
    try{
      await request(`/meetings/${feed.active.id}/end`,token,{minutes});
      setMinutes('');await reload();notify('CEO đã kết thúc cuộc họp, lưu biên bản và nhân viên quay lại làm việc.');
    }catch(e){setError(e instanceof Error?e.message:'Không thể kết thúc cuộc họp.');}
    finally{setBusy(false);}
  }
  function toggle(id:string){
    setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<19?[...prev,id]:prev);
  }
  return <>
    <div className="page-title"><div><p className="eyebrow">VIP CEO MEETING ROOM · V21</p>
      <h1><UsersRound className="inline-icon" size={28}/> Hội đồng điều hành</h1>
      <p>CEO chủ trì cuộc họp, chọn nhân viên tham dự, xem trạng thái di chuyển trong văn phòng 3D và lưu biên bản.</p>
    </div></div>
    <section className="panel office-panel"><div className="section-heading"><h2>Phòng họp & nhân viên đang di chuyển</h2><span className="live-chip">LIVE OFFICE 3D</span></div>
      <OfficeScene employees={employees} tasks={tasks} meeting={feed.active} speakerId={feed.active ? speakerId : null} selectedId={null} onSelect={onEmployeeSelect} onCeoSelect={onCeoSelect} ceoName={ceoName} companyLevel={companyLevel} companyName={companyName}/>
    </section>
    {error&&<div className="error" role="alert">{error}</div>}
    {feed.active ? <section className="panel v18-meeting-live">
      <div className="section-heading"><div><p className="eyebrow">● LIVE CEO MEETING</p><h2><Crown size={19} className="inline-icon"/> {feed.active.title}</h2></div><span className="live-chip">ĐANG HỌP · {feed.active.attendee_ids.length} NGƯỜI</span></div>
      <p>{feed.active.agenda || 'Chưa có nội dung chương trình họp.'}</p>
      <div className="v18-attendee-list">
        {feed.active.attendee_ids.map(id=>{const e=employees.find(x=>x.id===id);return <span key={id} className="v18-attendee-tag">● {e?.full_name||'Nhân viên đã rời công ty'}</span>})}
      </div>
      <p className="v18-muted">Bắt đầu: {new Date(feed.active.started_at).toLocaleString('vi-VN')} · Cuộc họp tiếp tục được lưu khi đóng trình duyệt.</p>
      <MeetingAICouncil token={token} meeting={feed.active} employees={employees} onFocusSpeaker={id => setSpeakerId(id)} onTasksChanged={refreshGame} onUseRecommendation={text => setMinutes(prev => [prev.trim(), text].filter(Boolean).join('\n\n').slice(0, 4000))}/>
      <label>Biên bản / quyết định của CEO<textarea rows={5} maxLength={4000} value={minutes} onChange={e=>setMinutes(e.target.value)} placeholder="Ghi quyết định, người phụ trách, thời hạn và những việc cần làm sau cuộc họp..."/></label>
      <div className="button-row"><button type="button" className="primary" disabled={busy} onClick={()=>void end()}><ClipboardList size={17}/> {busy?'Đang lưu...':'Kết thúc họp & lưu biên bản'}</button>
        <span className="v18-muted">Các nhân viên sẽ quay lại lịch làm việc sau khi kết thúc.</span></div>
    </section> : <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">CHỦ TỊCH TRIỆU TẬP</p><h2>Khởi tạo cuộc họp mới</h2></div><Video size={21}/></div>
      <form onSubmit={e=>void start(e)} className="v18-meeting-form">
        <label>Tiêu đề cuộc họp<input minLength={4} maxLength={120} required value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label>Chương trình họp<textarea maxLength={1200} rows={3} value={agenda} onChange={e=>setAgenda(e.target.value)}/></label>
        <div className="v18-meeting-select-head"><strong>Nhân viên tham gia ({selected.length}/19)</strong>
          <button type="button" className="secondary small" onClick={()=>setSelected(employees.slice(0,19).map(e=>e.id))}>Chọn toàn bộ (tối đa 19)</button>
        </div>
        <div className="v18-checkbox-grid">{employees.map(e=><label key={e.id} className="v18-check-item"><input type="checkbox" checked={selected.includes(e.id)} onChange={()=>toggle(e.id)} disabled={!selected.includes(e.id)&&selected.length>=19}/><span><strong>{e.full_name}</strong><small>{e.role}</small></span></label>)}</div>
        <button className="primary" type="submit" disabled={busy||selected.length===0}><UsersRound size={17}/>{busy?'Đang triệu tập...':'CEO bắt đầu cuộc họp'}</button>
      </form>
    </section>}
    <section className="panel"><div className="section-heading"><h2><History size={19} className="inline-icon"/> Lịch sử và biên bản họp</h2><button className="secondary small" onClick={()=>void reload()} disabled={busy}>Làm mới</button></div>
      {feed.history.length===0 ? <p className="v18-muted">Chưa có cuộc họp nào kết thúc.</p> :
      <div className="v18-meeting-history">{feed.history.map(meeting=><article key={meeting.id}>
        <div><strong>{meeting.title}</strong><span>{new Date(meeting.started_at).toLocaleString('vi-VN')} · {meeting.attendee_ids.length} người tham dự</span></div>
        {meeting.minutes_text?<p>{meeting.minutes_text}</p>:<p>CEO chưa ghi biên bản.</p>}
        <button className="secondary small" type="button" onClick={() => setHistoryDebateId(historyDebateId === meeting.id ? null : meeting.id)}>{historyDebateId === meeting.id ? 'Ẩn Hội đồng AI' : 'Xem Hội đồng AI'}</button>
        {historyDebateId === meeting.id && <MeetingAICouncil token={token} meeting={meeting} employees={employees} onFocusSpeaker={id => setSpeakerId(id)} onTasksChanged={refreshGame}/>}
      </article>)}</div>}
    </section>
    <div className="hint"><XCircle size={15} className="inline-icon"/> Hội đồng AI sử dụng một lượt gọi Gemini/OpenAI để nhập vai các nhân viên. Nội dung AI chỉ là đề xuất, không phải quyết định đã thi hành; CEO vẫn chủ trì và phê duyệt cuối cùng.</div>
  </>;
}
