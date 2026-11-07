import { useEffect, useState, type FormEvent } from 'react';
import { BadgeCheck, BrainCircuit, BriefcaseBusiness, Crown, FileCheck2, Save, ShieldAlert, Sparkles, Target, TrendingUp, Wallet } from 'lucide-react';
import { request, vnd } from '../lib';
import type { GameState } from '../types';
type Props = {token:string;game:GameState;refresh:()=>Promise<void>;notify:(message:string)=>void};
const scenarios = [
  {id:'data_leak',title:'Sự cố rò rỉ dữ liệu',category:'Bảo mật',description:'Đội kỹ thuật phát hiện có khả năng dữ liệu khách hàng bị lộ. Ban điều hành cần quyết định trong ngày.',choices:['Khẩn cấp cô lập hệ thống, kiểm tra, thông báo minh bạch','Chỉ kiểm tra nội bộ trước rồi mới đánh giá','Chuyển trách nhiệm và thuê PR gấp']},
  {id:'competitor',title:'Đối thủ phá giá thị trường',category:'Chiến lược',description:'Một công ty mới chào giá thấp hơn 40%, đội kinh doanh lo mất khách.',choices:['Giảm giá toàn bộ dịch vụ để giữ thị phần','Tập trung khác biệt chất lượng và khách hàng giá trị cao','Chi nhiều tiền cho quảng cáo để cạnh tranh']},
  {id:'key_employee',title:'Nhân sự chủ chốt xin nghỉ',category:'Nhân sự',description:'Trưởng nhóm công nghệ muốn rời công ty, dự án quan trọng đang thực hiện.',choices:['Đề xuất lộ trình và gói giữ chân minh bạch','Thảo luận, bàn giao và chuẩn bị người kế nhiệm','Cho nghỉ ngay mà không chuyển giao']},
  {id:'late_client',title:'Khách hàng chậm thanh toán',category:'Tài chính',description:'Một đối tác trễ lịch thanh toán khiến dòng tiền quý này gặp áp lực.',choices:['Làm việc và thương lượng lịch thu hồi công nợ','Tiếp tục cung cấp thêm mà không đặt điều kiện','Ngừng dịch vụ ngay và bán lại tài sản']},
  {id:'ai_investment',title:'Có nên đầu tư nền tảng AI?',category:'Đầu tư',description:'CTO đề xuất dự án nghiên cứu AI mới; cần cân đối tốc độ với ngân sách.',choices:['Đầu tư toàn diện và tăng tốc phát triển','Chạy thử nghiệm MVP giới hạn ngân sách','Hoãn đầu tư, ưu tiên nguồn thu hiện tại']},
  {id:'brand_crisis',title:'Khủng hoảng truyền thông',category:'Thương hiệu',description:'Một bài phản ánh tiêu cực lan truyền trên mạng xã hội, phòng marketing xin chỉ đạo.',choices:['Xác minh, hỗ trợ khách hàng và công khai khắc phục','Thuê chuyên gia và phản hồi có kiểm chứng','Đóng bình luận, ngừng giao tiếp']},
];
export default function CeoOffice({token,game,refresh,notify}:Props){
  const [name,setName]=useState(game.ceoProfile?.display_name||'CEO');
  const [bio,setBio]=useState(game.ceoProfile?.bio||'');
  const [busy,setBusy]=useState(false);
  const [active,setActive]=useState(scenarios[0].id);
  useEffect(()=>{setName(game.ceoProfile?.display_name||'CEO');setBio(game.ceoProfile?.bio||'')},[game.ceoProfile?.display_name,game.ceoProfile?.bio]);
  async function save(e:FormEvent){e.preventDefault();setBusy(true);try{
    await request('/ceo/profile',token,{displayName:name,bio},'PUT');await refresh();notify('Đã cập nhật hồ sơ CEO')
  }catch(e){notify(e instanceof Error?e.message:'Lỗi lưu CEO')}finally{setBusy(false)}}
  async function choose(i:number){setBusy(true);try{
    const r=await request<{decision:{delta_vnd:number;xp_gain:number}}>('/ceo/decide',token,{scenario:active,choice:i});
    await refresh();notify(`Quyết định đã ghi nhận: ${r.decision.delta_vnd>=0?'+':''}${vnd(r.decision.delta_vnd)}, +${r.decision.xp_gain} XP`)
  }catch(e){notify(e instanceof Error?e.message:'Không thể quyết định')}finally{setBusy(false)}}
  const current=scenarios.find(x=>x.id===active)!;
  const decided=(game.decisions||[]).find(x=>x.scenario_key===active);
  return <>
    <div className="page-title"><div><p className="eyebrow">CHAIRMAN & CHIEF EXECUTIVE OFFICER</p><h1><Crown size={27} className="inline-icon"/> Phòng Chủ tịch & CEO</h1><p>Bạn là người sáng lập và có quyền phê duyệt cuối cùng của MEDIA TECH VUX.</p></div><div className="level-pill"><BadgeCheck size={15} className="inline-icon"/> CHỦ SỞ HỮU</div></div>
    <div className="ceo-layout">
      <div className="panel ceo-id-card"><div className="ceo-monogram"><Crown size={30}/></div><p className="eyebrow">MEDIA TECH VUX · OFFICE OF THE CEO</p><h2>{game.ceoProfile?.display_name||'Người sáng lập'}</h2><strong>Chủ tịch & Tổng Giám đốc</strong><p>{game.ceoProfile?.bio||'Định hướng chiến lược, dẫn dắt đội ngũ và xây dựng tương lai MEDIA TECH VUX.'}</p>
        <div className="ceo-badges"><span><Target size={15}/> Định hướng chiến lược</span><span><Wallet size={15}/> Phê duyệt đầu tư</span><span><BriefcaseBusiness size={15}/> Điều hành nhân sự</span></div>
      </div>
      <div className="panel"><h2><Save size={18} className="inline-icon"/> Hồ sơ người đứng đầu</h2><p className="muted">Tên CEO được lưu vào Supabase, áp dụng cho các lần đăng nhập tiếp theo và giấy chứng nhận học viện.</p><form className="task-form" onSubmit={save}><label>Tên hiển thị CEO<input minLength={2} maxLength={60} value={name} onChange={e=>setName(e.target.value)} required/></label><label>Thông điệp điều hành<textarea maxLength={500} rows={3} value={bio} onChange={e=>setBio(e.target.value)} placeholder="Dẫn dắt công nghệ vì giá trị thật..." /></label><button className="primary" type="submit" disabled={busy}>Lưu hồ sơ CEO <Save size={16}/></button></form></div>
    </div>
    <div className="panel"><div className="section-heading"><div><p className="eyebrow">EXECUTIVE BOARDROOM · RỦI RO & CƠ HỘI</p><h2><BrainCircuit size={20} className="inline-icon"/> Trung tâm quyết định chiến lược</h2></div><span className="count">{(game.decisions||[]).length}/6 tình huống</span></div>
      <p className="muted">Mỗi tình huống chỉ xử lý một lần; lựa chọn ảnh hưởng tiền VNĐ và XP. Các kết quả là quy tắc giả lập của game, không phải dự báo doanh nghiệp thật.</p>
      <div className="scenario-layout"><div className="scenario-menu">{scenarios.map(s=><button className={`scenario-button ${active===s.id?'active':''}`} key={s.id} onClick={()=>setActive(s.id)}><span><ShieldAlert size={16}/>{s.title}</span>{(game.decisions||[]).some(d=>d.scenario_key===s.id)?<FileCheck2 size={18} className="mint"/>:<span className="tag">Chưa xử lý</span>}</button>)}</div>
        <div className="scenario-detail"><p className="eyebrow">{current.category.toUpperCase()}</p><h2>{current.title}</h2><p>{current.description}</p><h3>Bạn ra quyết định:</h3>{current.choices.map((choice,i)=><button className="scenario-choice" disabled={busy||Boolean(decided)} key={i} onClick={()=>void choose(i)}><span>{String.fromCharCode(65+i)}</span>{choice}</button>)}
          {decided&&<div className="success"><Sparkles size={16} className="inline-icon"/> Đã phê duyệt phương án {String.fromCharCode(65+decided.choice_index)} · {decided.delta_vnd>0?'+':''}{vnd(decided.delta_vnd)} · +{decided.xp_gain} XP</div>}</div></div>
    </div>
    <div className="panel ceo-policy"><TrendingUp size={24}/><div><h2>Quyền điều hành Hybrid</h2><p>CEO quyết định chiến lược, đầu tư, hợp đồng và ngân sách. AI chỉ đề xuất kế hoạch; nhiệm vụ tự chạy theo lịch được máy chủ xử lý sau khi CEO giao.</p></div></div>
  </>;
}
