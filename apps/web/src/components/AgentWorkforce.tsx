import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Bot, Check, ClipboardList, RefreshCcw, ShieldCheck, X } from 'lucide-react';
import { request, vnd } from '../lib';
import type { Employee } from '../types';

type Step={title:string;durationMinutes:number;status:'queued'|'working'|'completed'};
type Plan={title:string;description:string;rewardVnd:number;steps:Step[]};
type Document={title:string;summary:string;sections:{heading:string;body:string}[];nextSteps:string;caveats:string};
type AgentStatus='pending'|'running'|'drafting'|'awaiting_review'|'revision_requested'|'generation_failed'|'completed'|'rejected';
type AgentOrder={id:string;employee_id:string;objective:string;provider:string;status:AgentStatus;plan:Plan;steps:Step[];created_at:string;task?:{progress:number;status:string;due_at:string}|null;deliverable?:Document|null;revision_no?:number;review_notes?:string;last_generation_error?:string|null;submitted_at?:string|null};
type AgentEvent={id:string;order_id:string;event_type:string;details:string;created_at:string};
type Props={token:string;employees:Employee[];refresh:()=>Promise<void>;notify:(message:string)=>void};
const labels:Record<AgentStatus,string>={pending:'Chờ CEO phê duyệt',running:'Đang thực hiện',drafting:'Đang soạn tài liệu',awaiting_review:'Chờ CEO nghiệm thu',revision_requested:'Đang chờ chỉnh sửa',generation_failed:'Lỗi tạo bản bàn giao',completed:'CEO đã nghiệm thu',rejected:'CEO đã từ chối'};

export default function AgentWorkforce({token,employees,refresh,notify}:Props){
  const [orders,setOrders]=useState<AgentOrder[]>([]);
  const [events,setEvents]=useState<AgentEvent[]>([]);
  const [employeeId,setEmployeeId]=useState(employees[0]?.id||'');
  const [objective,setObjective]=useState('Lập kế hoạch giới thiệu nền tảng MEDIA TECH VUX cho khách hàng doanh nghiệp.');
  const [provider,setProvider]=useState<'gemini'|'openai'|'simulated'>('simulated');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [feedback,setFeedback]=useState<Record<string,string>>({});
  const load=useCallback(async()=>{
    try{const data=await request<{orders:AgentOrder[];events:AgentEvent[]}>('/agents/orders',token);setOrders(data.orders);setEvents(data.events);setError('');}
    catch(e){setError(e instanceof Error?e.message:'Không lấy được lệnh AI. Hãy chạy migration upgrade_ai_agents.sql.');}
  },[token]);
  useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),30000);return ()=>window.clearInterval(timer)},[load]);
  async function propose(e:FormEvent){e.preventDefault();if(!employeeId)return;setBusy(true);setError('');try{
    await request('/agents/plan',token,{employeeId,objective,provider});await load();notify('Nhân viên đã gửi kế hoạch. CEO xem và phê duyệt trước khi chạy.');
  }catch(e){setError(e instanceof Error?e.message:'Không tạo được kế hoạch');}finally{setBusy(false)}}
  async function decide(id:string,approve:boolean){setBusy(true);setError('');try{
    await request(`/agents/orders/${id}/decision`,token,{approve});await Promise.all([load(),refresh()]);notify(approve?'CEO đã phê duyệt nhiệm vụ mô phỏng.':'Đã từ chối kế hoạch.');
  }catch(e){setError(e instanceof Error?e.message:'Không lưu được quyết định');}finally{setBusy(false)}}
  async function review(id:string,action:'accept'|'revise'|'retry'){setBusy(true);setError('');try{
    await request(`/agents/orders/${id}/review`,token,{action,feedback:feedback[id]||''});
    await Promise.all([load(),refresh()]);
    notify(action==='accept'?'CEO đã nghiệm thu tài liệu, thưởng/XP được ghi nhận.':action==='revise'?'Đã gửi yêu cầu chỉnh sửa tới nhân viên.':'Đã yêu cầu tạo lại bản bàn giao.');
  }catch(e){setError(e instanceof Error?e.message:'Lỗi nghiệm thu');}finally{setBusy(false)}}
  return <section className="panel ai-workforce">
    <div className="section-heading"><div><p className="eyebrow">AI WORKFORCE · CEO AUTHORIZATION</p><h2><Bot className="inline-icon" size={19}/> Đội ngũ nhân viên AI tự chủ trong game</h2></div><button className="secondary small" onClick={()=>void load()} disabled={busy}><RefreshCcw size={15}/> Cập nhật</button></div>
    <p className="muted">Nhân viên lập kế hoạch, CEO phê duyệt, backend mô phỏng tiến độ rồi tạo <strong>bản bàn giao có nội dung</strong>. Bạn có thể xem, nghiệm thu hoặc yêu cầu sửa. <strong>Chỉ khi CEO nghiệm thu</strong> mới trừ tiền thưởng và cộng XP. Chế độ mô phỏng tạo bản báo cáo mẫu; Gemini/OpenAI có thể soạn nội dung khi cấu hình API key. Không có công cụ tự triển khai bên ngoài game.</p>
    <form className="agent-form" onSubmit={propose}>
      <label>Nhân viên thực hiện<select value={employeeId} onChange={e=>setEmployeeId(e.target.value)}>{employees.map(x=><option key={x.id} value={x.id}>{x.full_name} · {x.role}</option>)}</select></label>
      <label>Bộ não lập kế hoạch<select value={provider} onChange={e=>setProvider(e.target.value)}><option value="simulated">Mô phỏng (không cần API)</option><option value="gemini">Gemini API</option><option value="openai">OpenAI API</option></select></label>
      <label className="agent-objective">Chỉ đạo của CEO<textarea rows={3} required minLength={8} maxLength={600} value={objective} onChange={e=>setObjective(e.target.value)}/></label>
      <button type="submit" className="primary" disabled={busy||!employeeId}><ClipboardList size={16}/>{busy?'Đang xử lý...':'Yêu cầu AI lập kế hoạch'}</button>
    </form>
    {error&&<div className="error" role="alert">{error}</div>}
    <div className="agent-order-list"><h2>Hàng đợi phê duyệt & báo cáo</h2>
      {!orders.length&&<div className="empty-state">Chưa có kế hoạch AI nào. Hãy giao mục tiêu ở phía trên.</div>}
      {orders.map(o=><article key={o.id} className="agent-order"><div className="agent-order-header"><div><strong>{o.plan.title}</strong><small>{employees.find(e=>e.id===o.employee_id)?.full_name||'Nhân viên'} · {o.provider.toUpperCase()}</small></div><span className={`agent-status status-${o.status}`}>{labels[o.status]}</span></div>
        <p>{o.plan.description}</p>
        <div className="agent-steps">{o.steps.map((step,i)=><div key={i} className="agent-step"><span className={`agent-step-dot step-${step.status}`}>{i+1}</span><span>{step.title}</span><small>{step.durationMinutes} phút · {step.status==='completed'?'Xong':step.status==='working'?'Đang chạy':'Chờ'}</small></div>)}</div>
        <div className="agent-order-footer"><span>Thưởng dự kiến: <strong>{vnd(o.plan.rewardVnd)}</strong></span>{o.task&&<span>Tiến độ: <strong>{o.task.progress}%</strong></span>}
          {o.status==='pending'&&<div className="button-row"><button disabled={busy} className="secondary small" onClick={()=>void decide(o.id,false)}><X size={15}/> Từ chối</button><button disabled={busy} className="primary" onClick={()=>void decide(o.id,true)}><Check size={15}/> CEO phê duyệt</button></div>}
          {o.status==='completed'&&<span className="done-label"><ShieldCheck size={16}/> CEO đã nghiệm thu và chi thưởng</span>}
          {o.status==='generation_failed'&&<button disabled={busy} className="secondary small" onClick={()=>void review(o.id,'retry')}>Thử tạo lại</button>}
        </div>
        {o.status==='generation_failed'&&<p className="error">Không tạo được bản bàn giao: {o.last_generation_error||'Chưa rõ nguyên nhân'}. Kiểm tra API key hoặc hạn mức rồi thử lại.</p>}
        {o.deliverable&&<div className="agent-delivery"><div className="agent-delivery-header"><strong>📋 TÀI LIỆU BÀN GIAO {o.revision_no?`· Bản sửa ${o.revision_no}`:''}</strong>{o.submitted_at&&<small>{new Date(o.submitted_at).toLocaleString('vi-VN')}</small>}</div>
          <h3>{o.deliverable.title}</h3><p>{o.deliverable.summary}</p>
          {o.deliverable.sections.map((section,i)=><div key={i} className="delivery-section"><h4>{section.heading}</h4><p>{section.body}</p></div>)}
          <div className="delivery-section"><h4>Bước tiếp theo</h4><p>{o.deliverable.nextSteps}</p></div>
          <div className="hint"><strong>Giới hạn:</strong> {o.deliverable.caveats}</div>
          <button type="button" className="secondary small" onClick={()=>{const blob=new Blob([JSON.stringify({objective:o.objective,document:o.deliverable,provider:o.provider},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`media-tech-vus-deliverable-${o.id}.json`;link.click();URL.revokeObjectURL(url)}}>Tải tài liệu JSON</button>
        </div>}
        {o.status==='awaiting_review'&&<div className="agent-review"><label>Góp ý của CEO nếu cần sửa (tối thiểu 10 ký tự)<textarea rows={3} maxLength={1000} placeholder="Ví dụ: Hãy bổ sung phương án nhân sự, ngân sách cụ thể và rủi ro..." value={feedback[o.id]||''} onChange={e=>setFeedback(prev=>({...prev,[o.id]:e.target.value}))}/></label>
          <div className="button-row"><button disabled={busy||o.revision_no===3||(feedback[o.id]||'').trim().length<10} className="secondary" onClick={()=>void review(o.id,'revise')}>Yêu cầu sửa ({o.revision_no||0}/3)</button><button disabled={busy} className="primary" onClick={()=>void review(o.id,'accept')}><ShieldCheck size={16}/> CEO nghiệm thu và thưởng</button></div>
        </div>}
        {events.filter(event=>event.order_id===o.id).length>0&&<details><summary>Nhật ký nhân viên</summary>{events.filter(event=>event.order_id===o.id).reverse().map(ev=><p className="agent-event" key={ev.id}>{new Date(ev.created_at).toLocaleString('vi-VN')}: {ev.details}</p>)}</details>}
      </article>)}
    </div>
  </section>;
}
