import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Server, ShieldCheck, Users } from 'lucide-react';
import { request } from '../lib';

type JobStatus = { state:string; runs:number; successes:number; failures:number; consecutiveFailures:number; lastAttemptAt:string|null;lastSuccessAt:string|null;lastDurationMs:number|null;lastErrorCode:string|null };
type SystemData = {
  version:string; serverTime:string;database:string;
  worker:{enabled:boolean;running:boolean;intervalMs:number;startedAt:string|null;lastCycleAt:string|null;cycles:number;skipped:number;jobs:Record<string,JobStatus>};
  company:{employeeCount:number;activeTasks:number;activeContracts:number};
  ai:{geminiConfigured:boolean;openaiConfigured:boolean};
};
const names:Record<string,string> = {auto_tasks:'Nhiệm vụ tự động',agent_reconcile:'Điều phối nhân viên AI',agent_deliverables:'Tạo sản phẩm bàn giao',world_simulation:'Mô phỏng thế giới'};
const when=(date:string|null)=>date?new Date(date).toLocaleString('vi-VN'):'Chưa có';

export default function SystemStatus({token}:{token:string}) {
  const [data,setData] = useState<SystemData|null>(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const refresh=useCallback(async()=>{
    setBusy(true);setError('');
    try {setData(await request<SystemData>('/system/status',token));}
    catch(e){setError(e instanceof Error ? e.message:'Không thể kiểm tra máy chủ.');}
    finally{setBusy(false);}
  },[token]);
  useEffect(()=>{void refresh();const timer=window.setInterval(()=>{void refresh();},30_000);return()=>window.clearInterval(timer);},[refresh]);
  const statuses=Object.entries(data?.worker.jobs||{});
  const workOk=Boolean(data?.worker.enabled && data?.worker.lastCycleAt && statuses.every(([,s])=>s.state==='ok'));
  return <div>
    <div className="page-title"><div><p className="eyebrow">CEO OPERATIONS · VERSION {data?.version || '20'}</p><h1>Trung tâm vận hành</h1><p>Kiểm tra hệ thống game, tiến trình nền và kết nối AI. Dữ liệu cập nhật theo máy chủ đang kết nối.</p></div>
    <button className="secondary" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16}/>{busy?'Đang kiểm tra...':'Kiểm tra lại'}</button></div>
    {error && <div className="error" role="alert">{error}</div>}
    {data && <>
      <div className="metrics">
        <article className="metric"><div className="metric-top">DATABASE <Server size={18}/></div><div className="metric-value">{data.database==='connected'?'Kết nối OK':'Có lỗi'}</div><div className="metric-foot">PostgreSQL qua Supabase</div></article>
        <article className="metric"><div className="metric-top">WORKER <Activity size={18}/></div><div className="metric-value">{!data.worker.enabled?'Đã tắt':workOk?'Bình thường':data.worker.lastCycleAt?'Cần kiểm tra':'Đang khởi tạo'}</div><div className="metric-foot">Vòng xử lý: {data.worker.cycles} · Bỏ qua trùng: {data.worker.skipped}</div></article>
        <article className="metric"><div className="metric-top">AI PROVIDERS <ShieldCheck size={18}/></div><div className="metric-value">{Number(data.ai.geminiConfigured)+Number(data.ai.openaiConfigured)} / 2</div><div className="metric-foot">Đã khai báo key, chưa xác minh quota</div></article>
        <article className="metric"><div className="metric-top">CÔNG TY <Users size={18}/></div><div className="metric-value">{data.company.employeeCount} nhân viên</div><div className="metric-foot">{data.company.activeTasks} nhiệm vụ · {data.company.activeContracts} hợp đồng đang hoạt động</div></article>
      </div>
      <section className="panel"><div className="section-heading"><h2>Giám sát tác vụ nền</h2><span className="count">Chu kỳ {data.worker.intervalMs / 1000} giây</span></div>
        {!data.worker.enabled && <p className="hint">Worker bị tắt bằng ENABLE_BACKGROUND_WORKER=false. Các tác vụ offline sẽ không tự tiến hành trên máy chủ này.</p>}
        <div className="diagnostic-grid">{statuses.map(([name,job])=><article className="diagnostic-item" key={name}>
          <div className="diagnostic-title">{job.state==='ok'?<CheckCircle2 color="#55dcb5" size={19}/>:<AlertTriangle color="#f1c574" size={19}/>}<strong>{names[name]||name}</strong></div>
          <div className="diagnostic-state">{job.state==='ok'?'Hoạt động':job.state==='error'?'Lỗi gần nhất':job.state==='running'?'Đang xử lý':'Chưa chạy'}</div>
          <p>Thành công: {job.successes} · Lỗi: {job.failures}</p>
          <p>Lần thành công cuối: {when(job.lastSuccessAt)}</p>
          <p>Thời gian xử lý: {job.lastDurationMs ?? '—'} ms</p>
          {job.lastErrorCode && <code>Lỗi: {job.lastErrorCode}</code>}
        </article>)}</div>
      </section>
      <section className="panel"><h2>Thông tin chẩn đoán</h2><div className="system-meta"><span>Phiên bản API: {data.version}</span><span>Giờ máy chủ: {when(data.serverTime)}</span><span>Worker khởi động: {when(data.worker.startedAt)}</span><span>Chu kỳ cuối: {when(data.worker.lastCycleAt)}</span></div>
      <p className="hint">Màn hình này chỉ giám sát tiến trình Node.js hiện tại. Không phải chứng nhận uptime 24/7, backup hay khả năng phục hồi khi máy chủ ngừng hoạt động. Hãy dùng hosting luôn bật, giám sát ngoài và sao lưu Supabase khi triển khai chính thức.</p></section>
    </>}
  </div>;
}
