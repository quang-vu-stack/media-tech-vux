import { useCallback, useEffect, useState } from 'react';
import { Bot, Settings2, UsersRound, RefreshCw, Save, Clock3 } from 'lucide-react';
import { request } from '../lib';
import { TIME_SCALES } from '../office-simulation';

export type VuxGameSettings={conversation_mode:'adaptive'|'quiet'|'off';show_chat_bubbles:boolean;time_scale:number};
export type VuxConversation={id:string;speaker_a_id:string;speaker_b_id:string;topic:string;dialogue:Array<{speaker:string;text:string}>;created_at:string};
export const DEFAULT_VUX_SETTINGS:VuxGameSettings={conversation_mode:'adaptive',show_chat_bubbles:true,time_scale:1};
export type VuxRuntimeStatus={enabled:boolean;reason:'ready'|'ceo_paused'|'worker_disabled'|'missing_gemini_key'|'daily_limit'|'no_available_pair';dailyCap:number;dailyUsed:number;remaining:number;provider:'gemini'};
const runtimeDescriptions:Record<VuxRuntimeStatus['reason'],string>={ready:'Cấu hình đủ điều kiện để worker Gemini xử lý hội thoại. Cần kiểm tra log backend để xác nhận worker thực sự đang chạy.',ceo_paused:'CEO đã đặt chế độ trò chuyện thành Tắt. Chọn Adaptive và lưu cài đặt để cho phép hội thoại.',worker_disabled:'Backend đang tắt Gemini tự chủ để tránh phát sinh phí. Đây là thiết lập an toàn mặc định, không phải lỗi giao diện.',missing_gemini_key:'Backend chưa được cấu hình GEMINI_API_KEY. Không nhập hoặc lưu khóa API trong trình duyệt.',daily_limit:'Đã hết hạn mức hội thoại trong 24 giờ; hệ thống sẽ không gửi thêm yêu cầu có phí.',no_available_pair:'Chưa có hai nhân viên đang rảnh và đủ năng lượng để trò chuyện.'};

type Props={token:string;employees:Array<{id:string;full_name:string}>;settings:VuxGameSettings;setSettings:(value:VuxGameSettings)=>void;setConversations:(items:VuxConversation[])=>void;onRefresh:()=>Promise<void>;notify:(message:string)=>void;companyName:string};
export default function VuxControlPanel({token,employees,settings,setSettings,setConversations,onRefresh,notify,companyName}:Props){
  const [items,setItems]=useState<VuxConversation[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [loaded,setLoaded]=useState(false);
  const [runtime,setRuntime]=useState<VuxRuntimeStatus|null>(null);
  const isVux=companyName.toLowerCase().startsWith('media tech vux');
  const load=useCallback(async(signal?:AbortSignal)=>{
    if(!isVux)return;
    try{
      const [settingsRes,historyRes,runtimeRes]=await Promise.all([
        request<{settings:VuxGameSettings}>('/vux/settings',token,undefined,undefined,20_000,signal),
        request<{conversations:VuxConversation[]}>('/vux/conversations',token,undefined,undefined,20_000,signal),
        request<{status:VuxRuntimeStatus}>('/vux/runtime',token,undefined,undefined,20_000,signal),
      ]);
      if(signal?.aborted)return;
      setRuntime(runtimeRes.status);
      setSettings({...DEFAULT_VUX_SETTINGS,...settingsRes.settings});
      setItems(historyRes.conversations||[]);
      setConversations(historyRes.conversations||[]);
      setLoaded(true);setError('');
    }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'Không thể tải cài đặt VUX');}
  },[isVux,token,setSettings,setConversations]);
  useEffect(()=>{
    // The same component can stay mounted during CEO account switches. Clear
    // private prior-session dialogue before fetching the next company.
    setItems([]);setLoaded(false);setRuntime(null);setError('');
    const controller=new AbortController();void load(controller.signal);
    return()=>{controller.abort();};
  },[load]);
  async function save(){setBusy(true);setError('');try{
    const result=await request<{settings:VuxGameSettings}>('/vux/settings',token,settings,'PUT');
    setSettings(result.settings);notify('Đã lưu cài đặt VUX trên Supabase.');
  }catch(e){setError(e instanceof Error?e.message:'Không lưu được cài đặt');}finally{setBusy(false);}}
  async function topup(){if(!window.confirm('Chỉ bổ sung nhân viên VUX đến 19 người, không xóa nhân sự cũ. Tiếp tục?'))return;
    setBusy(true);setError('');try{const r=await request<{added:number}>('/vux/staff/topup',token,{});await onRefresh();notify(`Đã bổ sung ${r.added} nhân viên VUX.`);}catch(e){setError(e instanceof Error?e.message:'Không bổ sung được nhân viên');}finally{setBusy(false);}}
  if(!isVux)return <section className="panel"><h2>Đây là dữ liệu công ty VUS cũ</h2><p>Bản VUX không tự đổi tên, ngân quỹ hoặc nhân viên của công ty hiện tại. Cần tài khoản game VUX riêng để khởi tạo công ty mới.</p></section>;
  const employeeName=(id:string)=>employees.find(e=>e.id===id)?.full_name||'AI';
  return <>
    <div className="page-title"><div><p className="eyebrow">V30 VUX LIVE CONTROL</p><h1><Settings2 size={23} className="inline-icon"/> Điều hành AI tự chủ</h1><p>CEO Quang Vũ chỉnh chế độ hội thoại, hiển thị bong bóng và tốc độ mô phỏng.</p></div></div>
    {error&&<div className="error" role="alert">{error}</div>}
    <section className="panel vux-settings-panel">
      <div className="section-heading"><h2>Cài đặt Supabase {loaded?'· Đã tải':'· Chưa xác minh'}</h2><button className="secondary small" onClick={()=>void load()}><RefreshCw size={14}/> Làm mới</button></div>
      <div className="vux-settings-grid">
        <label>AI Conversation Mode<select value={settings.conversation_mode} onChange={e=>setSettings({...settings,conversation_mode:e.target.value as VuxGameSettings['conversation_mode']})}><option value="adaptive">Adaptive · Thông minh</option><option value="quiet">Ít trò chuyện</option><option value="off">Tắt</option></select></label>
        <label>Tốc độ thời gian <Clock3 size={14} className="inline-icon"/><select value={settings.time_scale} onChange={e=>setSettings({...settings,time_scale:Number(e.target.value)})}>{TIME_SCALES.map(x=><option key={x} value={x}>{x}×</option>)}</select></label>
        <label className="vux-toggle"><input type="checkbox" checked={settings.show_chat_bubbles} onChange={e=>setSettings({...settings,show_chat_bubbles:e.target.checked})}/> Hiển thị bong bóng chat trên đầu nhân viên</label>
      </div>
      <button className="primary" disabled={busy||!loaded} onClick={()=>void save()}><Save size={16}/> {busy?'Đang lưu...':'Lưu cài đặt CEO'}</button>
      <p className="v18-muted">Tốc độ chỉ ảnh hưởng hoạt ảnh và lịch sinh hoạt hiển thị. Không làm tăng tần suất gọi Gemini, đẩy nhanh thanh toán hoặc xử lý tác vụ backend.</p>
    </section>
    <section className="panel"><div className="section-heading"><h2><UsersRound size={18} className="inline-icon"/> Nhân sự VUX</h2><span className="live-chip">{employees.length} / 19 nhân viên mục tiêu</span></div>
      <button className="secondary" disabled={busy||employees.length>=19} title={employees.length>=19?'Đã đạt tối thiểu 19 nhân viên. Nút bổ sung tự động sẽ khóa để tránh tạo trùng.':'Bổ sung nhân viên mới mà không xóa dữ liệu cũ.'} onClick={()=>void topup()}>Bổ sung nhân viên đến 19 (không xóa người cũ)</button>
      {employees.length>=19&&<p className="v18-muted" role="status">Đã có {employees.length} nhân viên — đạt mục tiêu tối thiểu 19. Không cần bấm bổ sung; nút được khóa để tránh tạo trùng nhân sự.</p>}
    </section>
    <section className="panel vux-runtime-panel" aria-label="Trạng thái AI tự chủ theo máy chủ">
      <div className="section-heading"><h2><Bot size={18} className="inline-icon"/> Trạng thái Gemini tự chủ</h2><span className={`live-chip ${runtime?.enabled?'':'vux-inactive'}`}>{runtime?.enabled?'ĐỦ ĐIỀU KIỆN':'CHƯA SẴN SÀNG'}</span></div>
      <p>{runtime ? runtimeDescriptions[runtime.reason] : 'Chưa tải được trạng thái worker từ máy chủ.'}</p>
      {runtime&&<div className="vux-live-stats"><span>Đã dùng: {runtime.dailyUsed}/{runtime.dailyCap} hội thoại trong 24 giờ</span><span>Còn lại: {runtime.remaining} lượt</span></div>}
      {runtime?.reason==='worker_disabled'&&<p className="v18-muted" role="status">Muốn dùng hội thoại AI thật: cấu hình <code>GEMINI_API_KEY</code> ở backend, sau đó chỉ khi đồng ý chi phí mới đặt <code>ENABLE_VUX_AUTONOMOUS_GEMINI=true</code> và khởi động lại API/worker. Cài đặt Adaptive trong game không tự bật dịch vụ có phí.</p>}
      {runtime?.reason==='missing_gemini_key'&&<p className="v18-muted" role="status">Thêm <code>GEMINI_API_KEY</code> vào file môi trường chỉ dành cho máy chủ, không thêm biến <code>VITE_</code> cho khóa bí mật.</p>}
      {runtime?.enabled&&<p className="v18-muted">Đủ điều kiện cấu hình không đồng nghĩa worker đang thực hiện hội thoại. Kiểm tra log backend và nhật ký hội thoại để xác nhận hoạt động thực tế.</p>}
      <p className="v18-muted">Hạn mức Gemini dùng thời gian thực, không tăng theo tốc độ game.</p>
    </section>
    <section className="panel"><div className="section-heading"><h2><Bot size={18} className="inline-icon"/> Nhật ký AI trò chuyện</h2><span className="count">{items.length} cuộc trò chuyện</span></div>
      <p className="v18-muted">Gemini chạy trên backend khi biến môi trường ENABLE_VUX_AUTONOMOUS_GEMINI=true, có khóa API hợp lệ và worker đang chạy. Mặc định tắt để tránh phí.</p>
      {items.length ? items.map(item=><article className="vux-chat-log" key={item.id}><div><strong>{item.topic}</strong><small>{new Date(item.created_at).toLocaleString('vi-VN')}</small></div>{item.dialogue.map((line,i)=><p key={i}><b>{employeeName(line.speaker)}:</b> {line.text}</p>)}</article>) : <div className="empty-state">Chưa có hội thoại tự động đã lưu. Không dùng câu thoại giả để thay thế kết quả Gemini.</div>}
    </section>
  </>;
}
