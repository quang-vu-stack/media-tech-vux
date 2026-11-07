import { MessageCircle, Radio, RefreshCw, UsersRound } from 'lucide-react';
import type { VuxConversation } from './VuxControlPanel';
import type { Employee } from '../types';
import { getVuxLiveSummary, normalizeVuxConversations } from '../vux-live-feed.js';

type Props = { items: VuxConversation[]; employees: Employee[]; onOpen: () => void; refreshDisabled?: boolean; onRefresh: () => void };
export default function VuxLiveActivity({items, employees, onOpen, onRefresh, refreshDisabled=false}: Props) {
  const conversations = normalizeVuxConversations(items);
  const snapshot = getVuxLiveSummary(items);
  const employeeName=(id:string)=>employees.find(e=>e.id===id)?.full_name??'Nhân viên';
  return <section className="panel vux-live-panel" aria-label="Hội thoại AI đã được lưu trên máy chủ">
    <div className="section-heading"><div><p className="eyebrow">VUX LIVE CONVERSATIONS</p><h2><Radio size={20} className="inline-icon"/> Hoạt động AI trong trụ sở</h2></div>
      <div className="button-row"><button type="button" className="secondary small" disabled={refreshDisabled} onClick={onRefresh}><RefreshCw size={15}/> Làm mới</button><button type="button" className="secondary small" onClick={onOpen}>Xem nhật ký <MessageCircle size={15}/></button></div>
    </div>
    <div className="vux-live-stats"><span><MessageCircle size={16}/> {snapshot.totalRecent} cuộc hội thoại gần nhất</span><span><UsersRound size={16}/> {snapshot.speakers} AI vừa trò chuyện</span></div>
    {conversations.length===0 ? <p className="v18-muted">Chưa có hội thoại Gemini đã lưu. Không tạo câu thoại giả khi AI đang tắt hoặc mất kết nối.</p> :
      <div className="vux-live-list">{conversations.slice(0,3).map(item=><article key={item.id} className="vux-live-item"><strong>{item.topic || 'Chủ đề công việc'}</strong><small>{employeeName(item.speaker_a_id)} và {employeeName(item.speaker_b_id)} · {new Date(item.created_at).toLocaleString('vi-VN')}</small>
        <p>{item.dialogue[0] && typeof item.dialogue[0].text==='string' ? item.dialogue[0].text : 'Đã lưu biên bản hội thoại.'}</p></article>)}</div>}
  </section>;
}
