import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, ClipboardCheck, Clock, ListTodo, RefreshCw } from 'lucide-react';
import { request, vnd } from '../lib';
import type { CompanyMeeting, Employee, MeetingAIDebate, MeetingAction } from '../types';
import WorkReportReview from './WorkReportReview';

type Props = {
  token: string;
  meeting: CompanyMeeting;
  debate: MeetingAIDebate;
  employees: Employee[];
  onTasksChanged?: () => Promise<void>;
};
const DURATIONS = [30, 60, 120, 240, 480, 1_440];

export default function MeetingActions({ token, meeting, debate, employees, onTasksChanged }: Props) {
  const [title, setTitle] = useState('Triển khai đề xuất sau cuộc họp AI');
  const [description, setDescription] = useState(() => debate.recommendation.slice(0, 1_000));
  const [employeeId, setEmployeeId] = useState(() => debate.employee_ids[0] ?? '');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [rewardVnd, setRewardVnd] = useState(0);
  const [actions, setActions] = useState<MeetingAction[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pendingRequestId = useRef<string | null>(null);
  const selectable = employees.filter(employee => meeting.attendee_ids.includes(employee.id));

  const reload = useCallback(async (showError = true) => {
    try {
      const result = await request<{ actions: MeetingAction[] }>(`/meetings/${meeting.id}/actions`, token);
      setActions(result.actions);
      if (pendingRequestId.current && result.actions.some(item => item.client_request_id === pendingRequestId.current)) {
        pendingRequestId.current = null;
      }
      if (showError) setError('');
    } catch (e) {
      if (showError) setError(e instanceof Error ? e.message : 'Không tải được quyết định.');
    } finally { setLoading(false); }
  }, [meeting.id, token]);

  useEffect(() => {
    let alive = true;
    void reload(false);
    const interval = window.setInterval(() => { if (alive) void reload(false); }, 20_000);
    return () => { alive = false; window.clearInterval(interval); };
  }, [reload]);

  function changedField() {
    // Editing a draft creates a new command rather than reusing an old request key.
    pendingRequestId.current = null;
    setError('');
    setNotice('');
  }

  async function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || actions.length >= 8 || !employeeId) return;
    const clientRequestId = pendingRequestId.current ?? crypto.randomUUID();
    pendingRequestId.current = clientRequestId;
    setBusy(true); setError(''); setNotice('');
    try {
      await request<{ action: MeetingAction }>(`/meetings/${meeting.id}/actions`, token, {
        clientRequestId,
        employeeId,
        title,
        description,
        rewardVnd,
        durationMinutes,
      });
      pendingRequestId.current = null;
      setNotice('CEO đã phê duyệt và giao việc thành công. Tiến độ được lưu trên máy chủ.');
      await reload(false);
      try { await onTasksChanged?.(); } catch { /* The approval is committed; UI refresh can be retried. */ }
    } catch (e) {
      setError(`${e instanceof Error ? e.message : 'Chưa xác định được kết quả.'} Hãy xem danh sách hoặc bấm làm mới trước khi chỉnh sửa và thử lại.`);
      // Keep the same request key on retry to avoid duplicate tasks after a timeout.
      await reload(false);
      if (pendingRequestId.current === null) {
        setError('Công việc đã được máy chủ ghi nhận nhưng phản hồi bị chậm. Danh sách đã được cập nhật.');
      }
    } finally { setBusy(false); }
  }

  return <section className="panel v20-action-panel" aria-label="CEO phê duyệt nhiệm vụ sau hội đồng AI">
    <div className="section-heading"><div>
      <p className="eyebrow">VIP DECISION → REVIEW · V21</p>
      <h2><ClipboardCheck size={19} className="inline-icon"/> Quyết định của CEO thành công việc</h2>
    </div><span className="live-chip">{actions.length}/8 QUYẾT ĐỊNH</span></div>
    <p className="v18-muted">Nội dung từ hội đồng AI chỉ là gợi ý. Chỉ khi bạn nhấn phê duyệt, hệ thống mới tạo nhiệm vụ cho nhân viên. Mặc định thưởng 0 VNĐ; với nhiệm vụ sau họp từ v21, tiền chỉ được trừ sau khi CEO nghiệm thu báo cáo.</p>
    {actions.length < 8 ? <form onSubmit={e => void approve(e)} className="v20-action-form">
      <label>Tên nhiệm vụ<input required minLength={3} maxLength={120} value={title} onChange={e=>{ changedField();setTitle(e.target.value); }}/></label>
      <label>Nhân viên chịu trách nhiệm<select required value={employeeId} onChange={e=>{ changedField();setEmployeeId(e.target.value); }}>
        {selectable.map(employee=><option key={employee.id} value={employee.id}>{employee.full_name} · {employee.role}</option>)}
      </select></label>
      <label className="v20-wide">Nội dung giao việc<textarea rows={3} maxLength={1000} value={description} onChange={e=>{ changedField();setDescription(e.target.value); }}/></label>
      <label>Thời hạn hoàn thành (mô phỏng)<select value={durationMinutes} onChange={e=>{ changedField();setDurationMinutes(Number(e.target.value)); }}>
        {DURATIONS.map(minutes=><option key={minutes} value={minutes}>{minutes===1_440?'24 giờ':`${minutes} phút`}</option>)}
      </select></label>
      <label>Thưởng khi hoàn thành (VNĐ)<input type="number" min="0" max="5000000" step="100000" required value={rewardVnd} onChange={e=>{ changedField();setRewardVnd(Number(e.target.value)); }}/></label>
      <div className="v20-wide button-row"><button className="primary" type="submit" disabled={busy || !employeeId}>
        <ClipboardCheck size={16}/>{busy?'Đang ghi quyết định…':'CEO phê duyệt & giao việc'}</button>
        <span className="v18-muted">Mỗi nhân viên chỉ xử lý tối đa một nhiệm vụ đang chạy. Không tự gửi lại yêu cầu.</span>
      </div>
    </form> : <p className="hint">Cuộc họp đã có đủ 8 quyết định được giao. Hãy tổ chức cuộc họp mới để tiếp tục.</p>}
    {error && <div className="error" role="alert">{error}</div>}
    {notice && <div className="success" role="status">{notice}</div>}
    <div className="section-heading v20-action-section-title"><h3><ListTodo size={17} className="inline-icon"/> Báo cáo nhiệm vụ sau họp</h3><button className="secondary small" type="button" disabled={busy || loading} onClick={()=>void reload()}><RefreshCw size={15}/> Làm mới</button></div>
    {loading ? <p className="v18-muted">Đang tải tiến độ công việc…</p> : actions.length ? <div className="v20-action-list">
      {actions.map(action => {
        const employee = employees.find(item => item.id === action.employee_id);
        const completed = action.task.status === 'completed';
        const cancelled = action.task.status === 'cancelled';
        const waiting = action.report?.status === 'awaiting_review' || action.report?.status === 'revision_requested';
        return <article key={action.id} className="v20-action-card">
          <div className="v20-action-header"><strong>{action.title}</strong><span className={`v20-action-badge ${completed?'done':cancelled?'cancelled':'running'}`}>
            {completed?<CheckCircle2 size={14}/>:<Clock size={14}/>} {completed?'Đã nghiệm thu':cancelled?'Đã từ chối':waiting?'Chờ CEO nghiệm thu':'Đang thực hiện'}
          </span></div>
          <p>{action.description || 'Không có mô tả bổ sung.'}</p>
          <div className="v20-action-meta"><span>Phụ trách: <b>{employee?.full_name ?? 'Nhân viên'}</b></span><span>Thưởng: {vnd(action.reward_vnd)}</span><span>Hạn: {action.task.due_at?new Date(action.task.due_at).toLocaleString('vi-VN'):'Chưa có'}</span></div>
          <div className="v20-action-progress"><div className="bar"><span style={{width:`${Math.max(0,Math.min(100,action.task.progress))}%`}}/></div><strong>{action.task.progress}%</strong></div>
          <WorkReportReview token={token} meetingId={meeting.id} action={action} onReload={reload} onTasksChanged={onTasksChanged}/>
        </article>;
      })}
    </div> : <p className="v18-muted">CEO chưa phê duyệt nhiệm vụ nào từ cuộc họp này.</p>}
    <p className="v18-muted">Tiến độ và báo cáo bản này được mô phỏng theo thời gian; không phải bằng chứng công việc thật. Với công việc sau họp được tạo từ v21, hệ thống chờ CEO nghiệm thu trước khi trao XP và thưởng. Backend cần chạy để tạo báo cáo đến hạn.</p>
  </section>;
}
