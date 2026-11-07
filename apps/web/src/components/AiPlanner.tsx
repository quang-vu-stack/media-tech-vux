import { useState, type FormEvent } from 'react';
import { BrainCircuit, CheckCircle2, Lightbulb, Sparkles } from 'lucide-react';
import { request, vnd } from '../lib';
import type { Employee } from '../types';
type Proposal={title:string;description:string;rewardVnd:number;durationMinutes:number};
type Props={token:string;employees:Employee[];refresh:()=>Promise<void>;notify:(text:string)=>void};
export default function AiPlanner({token,employees,refresh,notify}:Props){
  const [objective,setObjective]=useState('Hãy lên kế hoạch ra mắt landing page quảng bá sản phẩm AI của VUX cho khách hàng doanh nghiệp.');
  const [provider,setProvider]=useState<'gemini'|'openai'>('gemini');
  const [proposal,setProposal]=useState<Proposal|null>(null);
  const [employee,setEmployee]=useState(employees[0]?.id||'');
  const [busy,setBusy]=useState(false);
  async function plan(e:FormEvent){e.preventDefault();setBusy(true);setProposal(null);try{
    const r=await request<{proposal:Proposal}>('/ai/plan',token,{objective,provider});setProposal(r.proposal)
  }catch(e){notify(e instanceof Error?e.message:'Không thể lấy đề xuất AI')}finally{setBusy(false)}}
  async function approve(){if(!proposal)return;setBusy(true);try{
    await request('/tasks/auto',token,{employeeId:employee,...proposal});await refresh();setProposal(null);notify('CEO phê duyệt: nhiệm vụ AI đề xuất đã được giao và lên lịch tự chạy')
  }catch(e){notify(e instanceof Error?e.message:'Không giao được nhiệm vụ')}finally{setBusy(false)}}
  return <section className="panel ai-planner"><div className="section-heading"><div><p className="eyebrow">CEO HYBRID MANAGEMENT</p><h2><BrainCircuit size={20} className="inline-icon"/> AI đề xuất kế hoạch — CEO phê duyệt</h2></div><Sparkles size={22}/></div>
    <p className="muted">AI đọc mục tiêu rồi tạo đề xuất; hệ thống không tự chi tiền hoặc giao việc trước khi bạn bấm phê duyệt.</p>
    <form className="task-form" onSubmit={plan}><label>Chỉ đạo của CEO<textarea required minLength={8} maxLength={600} rows={3} value={objective} onChange={e=>setObjective(e.target.value)}/></label><div className="button-row"><label>AI Provider<select value={provider} onChange={e=>setProvider(e.target.value as 'gemini'|'openai')}><option value="gemini">Gemini</option><option value="openai">OpenAI</option></select></label><button className="primary" disabled={busy} type="submit"><Lightbulb size={16}/>{busy?'Đang lập kế hoạch...':'Lập kế hoạch'}</button></div></form>
    {proposal&&<div className="proposal"><p className="eyebrow">BẢN ĐỀ XUẤT CHƯA THỰC THI</p><h3>{proposal.title}</h3><p>{proposal.description}</p><div className="proposal-numbers"><span>Thưởng: {vnd(proposal.rewardVnd)}</span><span>Thời gian: {proposal.durationMinutes} phút</span></div><label>Giao nhân viên<select value={employee} onChange={e=>setEmployee(e.target.value)}>{employees.map(e=><option key={e.id} value={e.id}>{e.full_name} · {e.role}</option>)}</select></label><button className="primary" disabled={busy||!employee} onClick={()=>void approve()}><CheckCircle2 size={17}/> CEO duyệt & giao tự động</button></div>}
  </section>;
}
