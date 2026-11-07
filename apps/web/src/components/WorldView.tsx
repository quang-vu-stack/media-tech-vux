import {useCallback,useEffect,useMemo,useState} from 'react';
import {Activity,ArrowRight,Building2,ChartNoAxesCombined,Crown,RefreshCw,ShieldCheck,TrendingUp,UsersRound} from 'lucide-react';
import {request,vnd} from '../lib';

type Day={company_id:string;day:string;demand_index:number;event_key:string;market_sentiment:string;reputation_snapshot:number};
type Rival={company_id:string;day:string;rival_code:string;staff:number;cash_vnd:number;strength:number;market_share:number;action_key:string};
type Competitor={code:string;display_name:string;specialty:string};
type Action={id:string;day:string;action_key:'marketing'|'research'|'reserve';cost_vnd:number;reputation_change:number};
type World={days:Day[];rivals:Rival[];actions:Action[];competitors:Competitor[];treasuryVnd:number;reputation:number;note:string};
const events:Record<string,string>={tech_boom:'Bùng nổ công nghệ',ad_shift:'Thay đổi quảng cáo',talent_war:'Cạnh tranh nhân tài',stable:'Thị trường ổn định',price_war:'Chiến tranh giá',consumer_wave:'Xu hướng tiêu dùng mới'};
const actions:Record<string,string>={hire:'Tuyển nhân sự',launch:'Ra mắt sản phẩm',research:'Nghiên cứu công nghệ',price_cut:'Giảm giá',consolidate:'Tái cấu trúc'};
const strategies=[
  {key:'marketing',title:'Đầu tư Marketing',cost:80_000_000,reputation:2,description:'Phát triển thương hiệu để tăng lợi thế đấu thầu.'},
  {key:'research',title:'Nghiên cứu & AI',cost:120_000_000,reputation:3,description:'Đầu tư công nghệ và nâng uy tín doanh nghiệp.'},
  {key:'reserve',title:'Giữ tiền mặt',cost:0,reputation:0,description:'Bảo toàn ngân quỹ, không tăng uy tín trong ngày.'},
] as const;
export default function WorldView({token,refresh,notify}:{token:string;refresh:()=>Promise<void>;notify:(s:string)=>void}){
  const [world,setWorld]=useState<World|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    try{setError('');setWorld(await request<World>('/world',token));}
    catch(e){setError(e instanceof Error?e.message:'Không tải được thị trường thế giới');}
  },[token]);
  useEffect(()=>{void load();},[load]);
  const today=world?.days[0];
  const todayAction=world?.actions.find(a=>a.day===today?.day);
  const rivals=useMemo(()=>world?.rivals.filter(r=>r.day===today?.day)??[],[world,today?.day]);
  const competitorNames=new Map<string,Competitor>(world?.competitors.map(c=>[c.code,c] as [string,Competitor])??[]);
  async function choose(key:'marketing'|'research'|'reserve'){
    if(busy || todayAction)return;
    setBusy(true);setError('');
    try{
      await request('/world/strategy',token,{action:key});
      await Promise.all([load(),refresh()]);
      notify('Chiến lược đã được CEO phê duyệt và lưu vào tiến trình.');
    }catch(e){setError(e instanceof Error?e.message:'Không áp dụng được chiến lược');}
    finally{setBusy(false);}
  }
  return <>
    <div className="page-title"><div><p className="eyebrow">COMPETITIVE WORLD · CEO EMPIRE V5</p><h1>Đối thủ & thế giới kinh doanh <Building2 size={25}/></h1><p>Đối thủ thay đổi nhân sự, vốn và chiến lược mỗi ngày UTC; CEO định hướng công ty.</p></div>
      <button className="secondary" onClick={()=>void load()} disabled={busy}><RefreshCw size={15}/> Đồng bộ</button></div>
    {error&&<div className="error" role="alert">{error}</div>}
    {!world ? <section className="panel">Đang tải dữ liệu thị trường…</section> : <>
      <div className="world-stats">
        <div className="metric"><div className="metric-top"><span>UY TÍN MEDIA TECH VUX</span><Crown size={18}/></div><div className="metric-value">{world.reputation}/100</div><div className="metric-foot">Tối đa +2% lợi thế giá so với đối thủ</div></div>
        <div className="metric"><div className="metric-top"><span>NHU CẦU THỊ TRƯỜNG</span><Activity size={18}/></div><div className="metric-value">{today?.demand_index ?? '—'}/130</div><div className="metric-foot">Biến động theo ngày UTC</div></div>
        <div className="metric"><div className="metric-top"><span>NGÂN QUỸ</span><TrendingUp size={18}/></div><div className="metric-value">{vnd(world.treasuryVnd)}</div><div className="metric-foot">Quyết định chỉ có hiệu lực sau khi backend xác nhận</div></div>
      </div>
      <div className="world-grid">
        <section className="panel"><div className="section-heading"><h2><Crown size={18}/> Chiến lược của CEO</h2><span className="count">{today?.day??'—'} UTC</span></div>
          <p className="world-lead">Sự kiện hôm nay: <strong>{events[today?.event_key??'']??'Đang tổng hợp'}</strong>. Bạn có một quyết định mỗi ngày, ngân sách và hiệu ứng sẽ ghi vào Supabase.</p>
          {todayAction&&<div className="hint">Đã quyết định: <strong>{strategies.find(s=>s.key===todayAction.action_key)?.title}</strong> · Chi {vnd(todayAction.cost_vnd)} · Tăng {todayAction.reputation_change} uy tín. Ngày mai có lựa chọn mới.</div>}
          <div className="strategy-list">{strategies.map(s=><article key={s.key} className="strategy-choice"><div><strong>{s.title}</strong><p>{s.description}</p><small>Chi phí: {vnd(s.cost)} · Uy tín +{s.reputation}</small></div>
            <button className="secondary small" onClick={()=>void choose(s.key)} disabled={busy||Boolean(todayAction)||world.treasuryVnd<s.cost}>
              {todayAction?'Đã chốt':world.treasuryVnd<s.cost?'Thiếu vốn':'Phê duyệt'} <ArrowRight size={14}/>
            </button></article>)}</div>
          <p className="world-footnote"><ShieldCheck size={14}/> Không tự trừ tiền từ trình duyệt; mỗi tài khoản chỉ được duyệt một lần/ngày UTC.</p>
        </section>
        <section className="panel"><div className="section-heading"><h2><ChartNoAxesCombined size={18}/> Biến động thị trường</h2></div>
          <div className="world-chart">{[...world.days].reverse().slice(-14).map(d=><div key={d.day} title={`${d.day}: ${d.demand_index}/130`} className="world-bar-wrap"><div className="world-bar" style={{height:`${Math.round(d.demand_index/130*100)}%`}}/><small>{d.day.slice(8)}</small></div>)}</div>
          <p className="world-lead">Bản ghi lịch sử theo ngày, không phải giá cổ phiếu thực tế. Chỉ số nhu cầu từ 70 đến 130.</p>
          <div className="world-events">{world.days.slice(0,5).map(d=><div key={d.day}><span>{d.day}</span><strong>{events[d.event_key]??d.event_key}</strong><small>{d.demand_index}/130</small></div>)}</div>
        </section>
      </div>
      <section className="panel"><div className="section-heading"><h2><UsersRound size={19}/> Hoạt động của 6 đối thủ</h2><span className="count">Cập nhật theo ngày UTC</span></div>
        <div className="world-rivals">{rivals.map(r=><article key={r.rival_code} className="world-rival"><div className="world-rival-title"><strong>{competitorNames.get(r.rival_code)?.display_name??r.rival_code}</strong><span>{competitorNames.get(r.rival_code)?.specialty??'Công nghệ'}</span></div>
            <div className="world-rival-numbers"><span>Nhân viên <b>{r.staff}</b></span><span>Vốn <b>{vnd(r.cash_vnd)}</b></span><span>Sức mạnh <b>{r.strength}/100</b></span><span>Sức ảnh hưởng <b>{r.market_share}%</b></span></div>
            <div className="hint">Hành động mới nhất: <strong>{actions[r.action_key]??r.action_key}</strong></div>
          </article>)}</div>
        <p className="world-footnote">Các thị phần trên là chỉ số sức ảnh hưởng độc lập của từng đối thủ, không cộng thành 100%. Đối thủ dùng thuật toán và dữ liệu đã lưu, chưa gọi LLM Gemini/OpenAI để tự suy luận.</p>
      </section>
    </>}
  </>;
}
