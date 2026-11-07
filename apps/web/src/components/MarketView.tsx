import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, BriefcaseBusiness, ChartNoAxesCombined, Clock, RefreshCw, ShieldCheck, Swords, Trophy } from 'lucide-react';
import { request, vnd } from '../lib';

type Offer = {
  id: string; offer_date: string; client_name: string; title: string; category: string;
  client_budget_vnd: number; estimated_cost_vnd: number; rival_code: string;
  rival_bid_vnd: number; demand_index: number; status: 'open'|'won'|'lost'|'expired';
  player_bid_vnd: number|null; contract_id: string|null;
};
type Competitor = {code:string;display_name:string;specialty:string;strength:number};
type MarketState = {offers:Offer[];competitors:Competitor[];rule:string};
const statusVi:Record<Offer['status'],string> = {
  open:'Đang mở',won:'Thắng thầu',lost:'Thua thầu',expired:'Hết hạn',
};
export default function MarketView({token,refresh,notify}:{token:string;refresh:()=>Promise<void>;notify:(s:string)=>void}) {
  const [data,setData]=useState<MarketState|null>(null);
  const [bids,setBids]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{
    try {
      setError('');
      const result=await request<MarketState>('/market',token);
      setData(result);
      setBids(old=>{
        const update={...old};
        for(const offer of result.offers) if(update[offer.id]===undefined)
          update[offer.id]=String(Math.max(offer.estimated_cost_vnd, Math.floor(offer.rival_bid_vnd/1_000_000)*1_000_000));
        return update;
      });
    }catch(e){setError(e instanceof Error?e.message:'Không thể tải dữ liệu thị trường');}
  },[token]);
  useEffect(()=>{void load();},[load]);
  async function submit(event:FormEvent,offer:Offer){
    event.preventDefault();
    const value=Number(bids[offer.id]);
    if(!Number.isSafeInteger(value)||value<offer.estimated_cost_vnd||value>offer.client_budget_vnd){
      setError('Giá chào phải là số nguyên, nằm giữa chi phí dự kiến và ngân sách khách hàng.'); return;
    }
    setBusy(offer.id);setError('');
    try {
      const result=await request<{won:boolean}>(`/market/${offer.id}/bid`,token,{bidVnd:value});
      notify(result.won?'MEDIA TECH VUX đã thắng thầu! Hợp đồng nằm trong mục Kinh doanh.':'Đối thủ đã thắng cơ hội này. Thử chiến lược giá khác ở lần sau.');
      await Promise.all([load(),refresh()]);
    } catch(e){setError(e instanceof Error?e.message:'Không thể gửi giá chào');}
    finally{setBusy(null);}
  }
  const active=data?.offers.filter(x=>x.status==='open')??[];
  const wins=data?.offers.filter(x=>x.status==='won').length??0;
  const rivals=new Map(data?.competitors.map(x=>[x.code,x])??[]);
  return <>
    <div className="page-title"><div><p className="eyebrow">COMPETITIVE MARKET · CEO EMPIRE V4</p><h1>Thị trường & đối thủ AI <Swords size={25}/></h1><p>CEO chọn giá đấu thầu; doanh thu chỉ được ghi khi nghiệm thu hợp đồng thắng thầu.</p></div>
      <button className="secondary" onClick={()=>void load()}><RefreshCw size={16}/> Làm mới</button>
    </div>
    <div className="metrics two-metrics">
      <div className="metric"><div className="metric-top">CƠ HỘI CÒN MỞ <Clock size={19}/></div><div className="metric-value">{active.length}</div><div className="metric-foot">Tạo tối đa 3 cơ hội/ngày UTC cho mỗi công ty</div></div>
      <div className="metric"><div className="metric-top">HỢP ĐỒNG THẮNG THẦU <Trophy size={19}/></div><div className="metric-value">{wins}</div><div className="metric-foot">Trong 30 cơ hội gần nhất</div></div>
    </div>
    {error&&<div className="error" role="alert">{error}</div>}
    <section className="panel"><div className="section-heading"><h2><BriefcaseBusiness size={19}/> Sàn đấu thầu doanh nghiệp</h2><span className="count">{data?.offers.length??0} cơ hội gần đây</span></div>
      <div className="hint"><ShieldCheck size={15}/> {data?.rule??'Mỗi cơ hội chỉ đấu thầu một lần. Giá và kết quả lưu trên máy chủ.'} Đối thủ dùng chiến lược đấu giá mô phỏng có quy tắc, chưa phải tác nhân LLM tự hoạt động.</div>
      {!data&&<p>Đang tải thị trường...</p>}
      {data?.offers.length===0&&<p>Chưa có cơ hội kinh doanh.</p>}
      <div className="market-grid">{data?.offers.map(offer=>{
        const rival=rivals.get(offer.rival_code);
        const bid=Number(bids[offer.id]??0);
        const margin=bid-offer.estimated_cost_vnd;
        return <article key={offer.id} className="market-offer">
          <div className="market-offer-top"><span className="market-tag">{offer.category}</span><span className={`market-status ${offer.status}`}>{statusVi[offer.status]}</span></div>
          <h3>{offer.title}</h3><p className="market-client">Khách hàng: <strong>{offer.client_name}</strong></p>
          <div className="market-facts">
            <div><span>Ngân sách khách hàng</span><strong>{vnd(offer.client_budget_vnd)}</strong></div>
            <div><span>Chi phí dự kiến</span><strong>{vnd(offer.estimated_cost_vnd)}</strong></div>
            <div><span>Đối thủ: {rival?.display_name??offer.rival_code}</span><strong>{vnd(offer.rival_bid_vnd)}</strong></div>
            <div><span>Chỉ số nhu cầu</span><strong>{offer.demand_index}/100</strong></div>
          </div>
          <p className="market-date">Phiên ngày {offer.offer_date} (UTC) · Đối thủ: {rival?.specialty??'Công nghệ'}</p>
          {offer.status==='open'?<form className="market-bid" onSubmit={e=>void submit(e,offer)}>
            <label>Giá chào của MEDIA TECH VUX (VNĐ)<input type="number" step={1000000} required min={offer.estimated_cost_vnd} max={offer.client_budget_vnd}
              value={bids[offer.id]??''} onChange={e=>setBids(b=>({...b,[offer.id]:e.target.value}))}/></label>
            <p>Lãi gộp dự kiến: <strong className={margin>=0?'mint':'rose'}>{Number.isFinite(margin)?vnd(margin):'—'}</strong></p>
            <button className="primary wide" type="submit" disabled={busy!==null||!Number.isSafeInteger(bid)||bid<offer.estimated_cost_vnd||bid>offer.client_budget_vnd}>
              {busy===offer.id?'Đang xét thầu…':'CEO phê duyệt giá chào'} <ArrowRight size={15}/>
            </button>
          </form>:<div className="market-result">
            <strong>{offer.status==='won'?'Đã tạo hợp đồng thắng thầu':offer.status==='lost'?'Đối thủ đã thắng phiên này':'Phiên đã hết hạn'}</strong>
            {offer.player_bid_vnd!==null&&<span>Giá CEO đã gửi: {vnd(offer.player_bid_vnd)}</span>}
            {offer.contract_id&&<span className="mint">Vào mục Hợp đồng kinh doanh để nghiệm thu và ghi tiền.</span>}
          </div>}
        </article>;
      })}</div>
    </section>
    <section className="panel"><div className="section-heading"><h2><ChartNoAxesCombined size={19}/> Đối thủ trên thị trường</h2></div>
      <div className="market-rivals">{data?.competitors.map(r=><div key={r.code} className="market-rival"><strong>{r.display_name}</strong><span>{r.specialty}</span><div className="skill"><div><span>Sức mạnh cạnh tranh</span><b>{r.strength}/100</b></div><div className="bar"><span style={{width:`${r.strength}%`}}/></div></div></div>)}</div>
    </section>
  </>;
}
