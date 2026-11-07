import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Crown, MessageSquareText, RefreshCw, Sparkles, UsersRound } from 'lucide-react';
import { request } from '../lib';
import MeetingActions from './MeetingActions';
import type { CompanyMeeting, Employee, MeetingAIDebate } from '../types';

type Props = {
  token: string;
  meeting: CompanyMeeting;
  employees: Employee[];
  onUseRecommendation?: (text: string) => void;
  onFocusSpeaker?: (employeeId: string) => void;
  onTasksChanged?: () => Promise<void>;
};
type Provider = 'gemini' | 'openai';

export default function MeetingAICouncil({ token, meeting, employees, onUseRecommendation, onFocusSpeaker, onTasksChanged }: Props) {
  const [provider, setProvider] = useState<Provider>('gemini');
  const [selected, setSelected] = useState<string[]>(() => meeting.attendee_ids.slice(0, 4));
  const [debate, setDebate] = useState<MeetingAIDebate | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    setDebate(null); setError(''); setLoading(true);
    setSelected(meeting.attendee_ids.slice(0, 4));
    void request<{ debate: MeetingAIDebate | null }>(`/meetings/${meeting.id}/debate`, token)
      .then(result => { if (alive) setDebate(result.debate); })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Không tải được thảo luận AI.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [meeting.id, token]);
  async function reload() {
    setError(''); setLoading(true);
    try {
      const data = await request<{ debate: MeetingAIDebate | null }>(`/meetings/${meeting.id}/debate`, token);
      setDebate(data.debate);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được biên bản AI.'); }
    finally { setLoading(false); }
  }
  async function generate() {
    if (selected.length < 2 || selected.length > 4 || busy || meeting.status !== 'active') return;
    setBusy(true); setError('');
    try {
      // Long response timeout for one hosted model call. No automatic POST retry.
      const data = await request<{ debate: MeetingAIDebate }>(
        `/meetings/${meeting.id}/debate`, token,
        { provider, employeeIds: selected }, 'POST', 75_000,
      );
      setDebate(data.debate);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI chưa phản hồi.');
      // A request can time out after the server saved the transcript.
      // The CEO can refresh instead of repeating a potentially billable request.
    } finally { setBusy(false); }
  }
  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) :
      prev.length < 4 ? [...prev, id] : prev);
  }
  const selectable = employees.filter(e => meeting.attendee_ids.includes(e.id));
  const speaker = (id: string) => selectable.find(e => e.id === id);
  const completed = debate?.status === 'completed';
  const staleRunning = debate?.status === 'running' && Date.now() - new Date(debate.updated_at).getTime() >= 10 * 60_000;
  return <section className="panel v19-council" aria-label="Hội đồng thảo luận AI nhiều nhân vật">
    <div className="section-heading">
      <div><p className="eyebrow">VIP AI COUNCIL · V21</p>
        <h2><Sparkles size={20} className="inline-icon"/> Hội đồng AI tranh luận</h2></div>
      <span className="live-chip">{completed ? 'ĐÃ LƯU PHẢN BIỆN' : 'CEO TOÀN QUYỀN'}</span>
    </div>
    <p className="v18-muted">AI đóng vai tối đa 4 nhân viên để đưa ý kiến ở vòng 1, phản biện ở vòng 2 và đề xuất phương án. Đây là một lượt gọi mô hình, không phải các AI tự hoạt động độc lập. AI không thể tự giao việc hay chi tiền.</p>
    {loading ? <p className="v18-muted">Đang tải biên bản thảo luận AI…</p> : completed && debate ? <>
      <div className="v19-council-meta"><Bot size={17}/> Đã tạo bởi {debate.provider === 'openai' ? 'OpenAI' : 'Gemini'} · {debate.employee_ids.length} nhân viên · {debate.completed_at ? new Date(debate.completed_at).toLocaleString('vi-VN') : 'Đã lưu'}</div>
      {[1, 2].map(round => <div className="v19-debate-round" key={round}>
        <h3><MessageSquareText size={17}/> Vòng {round} — {round === 1 ? 'Ý kiến chuyên môn' : 'Phản biện và bổ sung'}</h3>
        <div className="v19-turn-grid">{debate.transcript.filter(t => t.round === round).map((turn, index) => {
          const employee = speaker(turn.employeeId) || employees.find(e => e.id === turn.employeeId);
          return <article className="v19-turn" key={`${turn.employeeId}-${index}`}>
            <div className="v19-turn-heading"><span className="v19-person-dot"><UsersRound size={15}/></span><div><strong>{employee?.full_name || 'Nhân viên'}</strong><small>{employee?.role || 'Hội đồng'}</small></div></div>
            <p>{turn.content}</p>
            {onFocusSpeaker && <button type="button" className="secondary small" onClick={() => onFocusSpeaker(turn.employeeId)}>Xem người phát biểu trong 3D</button>}
          </article>;
        })}</div>
      </div>)}
      <div className="v19-conclusion"><h3><CheckCircle2 size={18}/> Tổng hợp Hội đồng AI</h3><p>{debate.summary}</p>
        <h3><Crown size={18}/> Đề xuất để CEO cân nhắc</h3><p>{debate.recommendation}</p>
        {onUseRecommendation && <button type="button" className="secondary" onClick={() => onUseRecommendation(`TÓM TẮT HỘI ĐỒNG AI (CHƯA PHÊ DUYỆT):\n${debate.summary}\nĐỀ XUẤT:\n${debate.recommendation}`)}>Chép đề xuất vào biên bản CEO</button>}
      </div>
      <MeetingActions token={token} meeting={meeting} debate={debate} employees={employees} onTasksChanged={onTasksChanged}/>
    </> : <>
      {meeting.status === 'active' && <>
        <div className="v19-debate-options"><label>Nhà cung cấp AI
          <select value={provider} onChange={e => setProvider(e.target.value as Provider)} disabled={busy}>
            <option value="gemini">Google Gemini</option><option value="openai">OpenAI</option>
          </select></label>
          <span className="v18-muted">Chọn 2–4 người trong số {selectable.length} nhân viên tham dự</span>
        </div>
        <div className="v19-participant-list">{selectable.map(e => <label className="v18-check-item" key={e.id}>
          <input type="checkbox" checked={selected.includes(e.id)} disabled={busy || (!selected.includes(e.id) && selected.length >= 4)} onChange={() => toggle(e.id)}/>
          <span><strong>{e.full_name}</strong><small>{e.role}</small></span>
        </label>)}</div>
        <div className="button-row"><button type="button" className="primary" disabled={busy || selected.length < 2 || !!(debate && debate.status === 'running' && !staleRunning) || !!(debate && debate.status === 'completed')} onClick={() => void generate()}>
          <Sparkles size={16}/>{busy ? 'AI đang thảo luận…' : staleRunning ? 'Thử lại sau 10 phút' : 'Bắt đầu tranh luận AI'}</button>
          <span className="v18-muted">Có thể phát sinh chi phí API; mỗi cuộc họp lưu tối đa một bản thảo luận thành công.</span></div>
      </>}
      {debate?.status === 'running' && <p className="hint">{staleRunning ? 'Thảo luận bị treo quá 10 phút. CEO có thể thử lại thủ công; một số lượt AI có thể đã phát sinh phí.' : 'Cuộc thảo luận đang được xử lý. Hãy làm mới trạng thái, không bấm tạo lại để tránh gửi thêm yêu cầu tính phí.'}</p>}
      {debate?.status === 'failed' && <p className="hint">Thảo luận trước bị lỗi. CEO có thể chủ động thử lại; API có thể tính phí cả với lượt trả lời chưa lưu thành công.</p>}
      {meeting.status === 'ended' && !debate && <p className="v18-muted">Cuộc họp này không có bản thảo luận AI đã lưu.</p>}
    </>}
    {error && <div className="error" role="alert">{error}</div>}
    <div className="button-row"><button type="button" className="secondary small" disabled={busy || loading} onClick={() => void reload()}><RefreshCw size={15}/> Tải lại trạng thái</button></div>
  </section>;
}
