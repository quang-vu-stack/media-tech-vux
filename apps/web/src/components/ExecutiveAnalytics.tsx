import { useMemo } from 'react';
import { Award, BarChart3, Download, Flag, ShieldCheck, TrendingUp } from 'lucide-react';
import type { GameState } from '../types';
import { vnd } from '../lib';

export type Milestone = { id: string; title: string; detail: string; achieved: boolean; progress: number };
export function getMilestones(game: GameState): Milestone[] {
  const tasks = game.tasks.filter(t => t.status === 'completed').length;
  const contracts = (game.contracts ?? []).filter(c => c.status === 'completed').length;
  const lessons = (game.learning ?? []).length;
  const headcount = game.employees.length;
  const level = game.company?.level ?? 1;
  const goals = [
    ['first-task', 'Lãnh đạo thực chiến', 'Hoàn thành nhiệm vụ đầu tiên', tasks, 1],
    ['team', 'Xây dựng tổ chức', 'Đạt 15 nhân viên', headcount, 15],
    ['deal', 'Chốt hợp đồng', 'Nghiệm thu hợp đồng đầu tiên', contracts, 1],
    ['scale', 'Tập đoàn tăng trưởng', 'Hoàn thành 10 nhiệm vụ', tasks, 10],
    ['academy', 'CEO ham học', 'Vượt qua 10 bài học CEO', lessons, 10],
    ['master', 'CEO cấp cao', 'Đạt cấp 10', level, 10],
  ] as const;
  return goals.map(([id,title,detail,value,target]) => ({ id,title,detail,achieved:value>=target,progress:Math.min(100,Math.round(value/target*100)) }));
}
export function financialSummary(game: GameState) {
  const tx = game.transactions ?? [];
  const inflow = tx.reduce((sum, t) => sum + Math.max(0, t.amount_vnd), 0);
  const outflow = tx.reduce((sum, t) => sum + Math.max(0, -t.amount_vnd), 0);
  const monthlyPayroll = game.employees.reduce((sum,e)=>sum+e.salary_vnd,0);
  const pipeline = (game.contracts??[]).filter(c=>c.status==='signed').reduce((sum,c)=>sum+c.revenue_vnd-c.cost_vnd,0);
  return {inflow,outflow,monthlyPayroll,pipeline};
}
function downloadSnapshot(game: GameState) {
  const data = JSON.stringify({product:'MEDIA TECH VUX', exportedAt:new Date().toISOString(), note:'Bản sao dữ liệu đọc được; không phải bản sao lưu có thể khôi phục tự động',game},null,2);
  const url = URL.createObjectURL(new Blob([data],{type:'application/json;charset=utf-8'}));
  const link = document.createElement('a');
  link.href=url; link.download=`media-tech-vus-snapshot-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export default function ExecutiveAnalytics({game}:{game:GameState}) {
  const milestones = useMemo(()=>getMilestones(game),[game]);
  const finances = useMemo(()=>financialSummary(game),[game]);
  const completed = milestones.filter(x=>x.achieved).length;
  const trend = useMemo(()=> {
    const days: {key:string;label:string;income:number;expense:number}[]=[];
    for(let i=6;i>=0;i--){
      const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      days.push({key,label:`${d.getDate()}/${d.getMonth()+1}`,income:0,expense:0});
    }
    for(const tx of game.transactions){
      const day=new Date(tx.created_at);const key=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
      const row=days.find(x=>x.key===key);
      if(row){if(tx.amount_vnd>0)row.income+=tx.amount_vnd;else row.expense-=tx.amount_vnd;}
    }
    return days;
  },[game.transactions]);
  const max=Math.max(1,...trend.flatMap(x=>[x.income,x.expense]));
  return <div className="executive-analytics">
    <div className="page-title"><div><p className="eyebrow">CEO BUSINESS INTELLIGENCE</p><h1>Trung tâm phân tích & thành tựu</h1><p>Theo dõi dòng tiền, mục tiêu phát triển và xuất bản sao dữ liệu.</p></div></div>
    <div className="metrics two-metrics">
      <article className="metric"><div className="metric-top">DÒNG TIỀN VÀO <TrendingUp size={18}/></div><div className="metric-value mint">{vnd(finances.inflow)}</div><div className="metric-foot">Theo các giao dịch gần nhất được tải</div></article>
      <article className="metric"><div className="metric-top">DÒNG TIỀN RA <BarChart3 size={18}/></div><div className="metric-value rose">{vnd(finances.outflow)}</div><div className="metric-foot">Theo các giao dịch gần nhất được tải</div></article>
      <article className="metric"><div className="metric-top">QUỸ LƯƠNG THÁNG <ShieldCheck size={18}/></div><div className="metric-value">{vnd(finances.monthlyPayroll)}</div><div className="metric-foot">Dự kiến theo nhân sự hiện tại, chưa trừ tự động</div></article>
      <article className="metric"><div className="metric-top">LỢI NHUẬN HỢP ĐỒNG CHỜ NGHIỆM THU <Flag size={18}/></div><div className="metric-value">{vnd(finances.pipeline)}</div><div className="metric-foot">Doanh thu trừ chi phí dự kiến, chưa ghi nhận</div></article>
    </div>
    <section className="panel"><div className="section-heading"><h2>Biến động tiền trong 7 ngày</h2><span className="count">Từ 40 giao dịch gần nhất, không phải toàn bộ lịch sử</span></div>
      <div className="trend-chart" role="img" aria-label="Biểu đồ cột dòng tiền vào và ra trong 7 ngày">
        {trend.map(day=><div className="trend-day" key={day.key}><div className="trend-bars"><div className="trend-bar income" title={`Thu ${day.label}: ${vnd(day.income)}`} style={{height:`${day.income/max*100}%`}}/><div className="trend-bar expense" title={`Chi ${day.label}: ${vnd(day.expense)}`} style={{height:`${day.expense/max*100}%`}}/></div><span>{day.label}</span></div>)}
      </div><p className="trend-legend"><span>● Thu</span><span>● Chi</span></p>
    </section>
    <section className="panel"><div className="section-heading"><h2><Award size={20} className="inline-icon"/> Thành tựu CEO</h2><span className="count">{completed}/{milestones.length} hoàn thành</span></div>
      <div className="achievement-grid">{milestones.map(m=><article key={m.id} className={`achievement ${m.achieved?'unlocked':''}`}><div className="achievement-icon"><Award size={22}/></div><strong>{m.title}</strong><small>{m.detail}</small><div className="bar"><span style={{width:`${m.progress}%`}}/></div><span className="achievement-percent">{m.achieved?'Đã đạt':`${m.progress}%`}</span></article>)}</div>
      <p className="hint">Thành tựu được tính từ dữ liệu đã tải và chỉ có ý nghĩa trong game. Danh sách nhiệm vụ/hợp đồng có giới hạn số bản ghi hiển thị.</p>
    </section>
    <section className="panel export-panel"><div><h2>Xuất bản sao dữ liệu tập đoàn</h2><p>Xuất JSON gồm công ty, nhân viên, hợp đồng, nhiệm vụ, tiến độ học và giao dịch hiện được tải. Không bao gồm mật khẩu hoặc API key.</p><small>File JSON để lưu trữ/đọc thủ công, chưa hỗ trợ nhập để khôi phục dữ liệu.</small></div><button className="primary" onClick={()=>downloadSnapshot(game)}><Download size={17}/> Xuất JSON</button></section>
  </div>;
}
