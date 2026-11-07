import { useState, type FormEvent } from 'react';
import { CheckCircle2, FileText, Plus, TrendingUp, Wallet } from 'lucide-react';
import { request, vnd } from '../lib';
import type { GameState } from '../types';
type Props={token:string;game:GameState;refresh:()=>Promise<void>;notify:(text:string)=>void};
export default function ContractsView({token,game,refresh,notify}:Props){
  const [clientName,setClientName]=useState('Công ty đối tác');const [title,setTitle]=useState('Thiết kế website & quảng bá thương hiệu');
  const [revenue,setRevenue]=useState(200_000_000);const [cost,setCost]=useState(80_000_000);
  const [busy,setBusy]=useState(false);
  const contracts=game.contracts||[];
  const completed=contracts.filter(c=>c.status==='completed');
  const income=completed.reduce((a,c)=>a+c.revenue_vnd,0);
  const margin=completed.reduce((a,c)=>a+c.revenue_vnd-c.cost_vnd,0);
  async function create(e:FormEvent){e.preventDefault();setBusy(true);try{
    await request('/contracts',token,{clientName,title,revenueVnd:revenue,costVnd:cost});await refresh();notify('CEO đã ký hợp đồng mới');
  }catch(e){notify(e instanceof Error?e.message:'Không thể ký hợp đồng')}finally{setBusy(false)}}
  async function finish(id:string){setBusy(true);try{
    await request(`/contracts/${id}/complete`,token,{},'POST');await refresh();notify('Đã nghiệm thu hợp đồng: doanh thu và chi phí đã ghi sổ')
  }catch(e){notify(e instanceof Error?e.message:'Không thể nghiệm thu')}finally{setBusy(false)}}
  return <><div className="page-title"><div><p className="eyebrow">BUSINESS DEVELOPMENT</p><h1><FileText size={27} className="inline-icon"/> Kinh doanh & hợp đồng</h1><p>CEO ký kết, nghiệm thu dự án và tạo doanh thu bằng VNĐ trong game.</p></div></div>
    <div className="metrics two-metrics"><div className="metric"><div className="metric-top">DOANH THU NGHIỆM THU <TrendingUp size={18}/></div><div className="metric-value">{vnd(income)}</div><div className="metric-foot">Tổng từ các hợp đồng trong game</div></div><div className="metric"><div className="metric-top">LỢI NHUẬN ĐÓNG GÓP <Wallet size={18}/></div><div className="metric-value">{vnd(margin)}</div><div className="metric-foot">Doanh thu trừ chi phí thực hiện, chưa gồm vận hành khác</div></div></div>
    <div className="tasks-layout"><section className="panel"><div className="section-heading"><h2>Soạn hợp đồng</h2><Plus size={19}/></div><form onSubmit={create} className="task-form">
      <label>Khách hàng<input required minLength={2} maxLength={100} value={clientName} onChange={e=>setClientName(e.target.value)}/></label>
      <label>Dự án<input required minLength={3} maxLength={150} value={title} onChange={e=>setTitle(e.target.value)}/></label>
      <label>Doanh thu (VNĐ)<input required type="number" min={1000000} max={5000000000} step={1000000} value={revenue} onChange={e=>setRevenue(Number(e.target.value))}/></label>
      <label>Chi phí dự kiến (VNĐ)<input required type="number" min={0} max={5000000000} step={1000000} value={cost} onChange={e=>setCost(Number(e.target.value))}/></label>
      <div className="hint">Dự kiến đóng góp: {vnd(revenue-cost)}. Tiền chỉ được cập nhật khi CEO bấm nghiệm thu. Đây là hợp đồng mô phỏng, không phải hợp đồng pháp lý thật.</div>
      <button className="primary wide" disabled={busy} type="submit">CEO ký hợp đồng <Plus size={16}/></button>
    </form></section>
    <section className="panel"><div className="section-heading"><h2>Danh mục hợp đồng</h2><span className="count">{contracts.length} dự án</span></div>{contracts.length===0?<div className="empty-state"><FileText size={26}/><strong>Chưa có hợp đồng</strong><span>Hãy ký hợp đồng đầu tiên của tập đoàn.</span></div>:<div className="contract-list">
      {contracts.map(c=><article className="contract-item" key={c.id}><div className="contract-top"><strong>{c.title}</strong><span className={c.status==='completed'?'done-label':'tag'}>{c.status==='completed'?'Đã nghiệm thu':'Đang thực hiện'}</span></div><p>{c.client_name}</p><div className="contract-money"><div><small>Doanh thu</small><b className="mint">{vnd(c.revenue_vnd)}</b></div><div><small>Chi phí</small><b>{vnd(c.cost_vnd)}</b></div></div><div className="contract-bottom">{c.status==='signed'?<button className="secondary" onClick={()=>void finish(c.id)} disabled={busy}><CheckCircle2 size={16}/> Nghiệm thu & ghi doanh thu</button>:<span className="done-label"><CheckCircle2 size={16}/> Đã hoàn thành +250 XP</span>}</div></article>)}
    </div>}</section></div>
  </>;
}
