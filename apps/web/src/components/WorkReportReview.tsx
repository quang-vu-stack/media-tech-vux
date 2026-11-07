import { useRef, useState } from 'react';
import { CheckCircle2, ClipboardCheck, FileCheck2, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { request } from '../lib';
import HandoffImprovementPanel from './HandoffImprovementPanel';
import type { MeetingAction, WorkReport } from '../types';

type Props = {
  token: string;
  meetingId: string;
  action: MeetingAction;
  onReload: () => Promise<void>;
  onTasksChanged?: () => Promise<void>;
};

type Decision = 'approve' | 'revise' | 'reject';
const statusLabel: Record<WorkReport['status'], string> = {
  awaiting_review: 'Đang chờ CEO nghiệm thu',
  revision_requested: 'Đang sửa theo yêu cầu',
  approved: 'CEO đã nghiệm thu',
  rejected: 'CEO đã từ chối',
};

export default function WorkReportReview({ token, meetingId, action, onReload, onTasksChanged }: Props) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffProvider, setHandoffProvider] = useState<'simulated'|'gemini'|'openai'>('simulated');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const handoffPending = useRef(false);
  const report = action.report;
  if (!report) {
    return <div className="v21-report-placeholder">
      {action.task.status === 'completed'
        ? 'Nhiệm vụ này đã hoàn tất trước v21. Tiền thưởng (nếu có) đã được xử lý theo phiên bản cũ; không nghiệm thu và trả lại.'
        : 'Chưa có báo cáo. Báo cáo mô phỏng sẽ xuất hiện khi worker xử lý nhiệm vụ đến hạn.'}
    </div>;
  }

  async function createHandoff() {
    if (handoffPending.current || report?.status !== 'awaiting_review' || report.handoff) return;
    handoffPending.current = true;
    setHandoffBusy(true);
    setError(''); setNotice('');
    try {
      await request(`/meetings/${meetingId}/actions/${action.id}/handoff`, token, {
        provider: handoffProvider, expectedRevision: report.revision_no,
      }, 'POST', 65_000);
      setNotice('Đã lưu bản bàn giao. Hãy xem toàn bộ nội dung và kết quả kiểm tra trước khi nghiệm thu.');
      await onReload();
    } catch (e) {
      setError(`${e instanceof Error ? e.message : 'Không tạo được tài liệu.'} Hãy làm mới để kiểm tra trước khi gửi lại.`);
      try { await onReload(); } catch { /* No automatic mutating retry. */ }
    } finally {
      handoffPending.current = false;
      setHandoffBusy(false);
    }
  }

  async function review(decision: Decision) {
    if (pending.current || handoffPending.current || report?.status !== 'awaiting_review') return;
    if (decision === 'approve' && !report.handoff?.quality.passed) {
      setError('Bản bàn giao hiện tại chưa đạt kiểm tra cấu trúc. Hãy tạo hoặc yêu cầu sửa trước khi nghiệm thu.');
      return;
    }
    if (decision === 'revise' && notes.trim().length < 8) {
      setError('Yêu cầu chỉnh sửa cần ít nhất 8 ký tự mô tả.');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request<{ report: WorkReport }>(`/meetings/${meetingId}/actions/${action.id}/review`, token, {
        decision, notes: notes.trim(), expectedRevision: report.revision_no,
      });
      setNotes('');
      setNotice(decision === 'approve' ? 'Đã nghiệm thu. Thưởng và XP được xử lý một lần trong database.'
        : decision === 'revise' ? 'Đã yêu cầu sửa. Worker sẽ nộp bản mô phỏng mới; hãy tải lại sau.'
        : 'Đã từ chối. Nhiệm vụ kết thúc, không chi thưởng hoặc cộng XP.');
      await onReload();
      if (decision !== 'revise') {
        try { await onTasksChanged?.(); } catch { /* Review was committed: refresh can be retried. */ }
      }
    } catch (e) {
      setError(`${e instanceof Error ? e.message : 'Không xác nhận được kết quả.'} Hãy làm mới trạng thái trước khi thử lại; yêu cầu sẽ không tự gửi lần nữa.`);
      try { await onReload(); } catch { /* Keep the original error. */ }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <div className="v21-report-box" aria-label="Báo cáo công việc và nghiệm thu của CEO">
    <div className="v21-report-heading">
      <strong><ClipboardCheck size={17}/> Báo cáo mô phỏng · Bản {report.revision_no + 1}</strong>
      <span className={`v21-report-status ${report.status}`}>{statusLabel[report.status]}</span>
    </div>
    <p className="v21-report-subtitle">Nộp lúc {new Date(report.submitted_at).toLocaleString('vi-VN')} · Nguồn: mô phỏng theo thời hạn, không phải sản phẩm được AI tạo ngoài game</p>
    <div className="v21-report-content">{report.content}</div>
    <section className="v22-handoff" aria-label="Bản bàn giao và kiểm tra chất lượng v22">
      <div className="v22-handoff-heading">
        <strong><FileCheck2 size={17}/> Hồ sơ bàn giao VIP v22</strong>
        <span className="v22-handoff-tag">Bản báo cáo {report.revision_no + 1}</span>
      </div>
      {report.handoff ? <>
        <div className="v22-quality-summary">
          <strong>{report.handoff.quality.passed ? 'Đạt kiểm tra cấu trúc' : 'Chưa đạt kiểm tra cấu trúc'} · {report.handoff.quality.score}/100</strong>
          <span>Nguồn: {report.handoff.provider === 'simulated' ? 'Mô phỏng (không gọi AI)' : report.handoff.provider.toUpperCase()} · {new Date(report.handoff.created_at).toLocaleString('vi-VN')}</span>
        </div>
        <div className="v22-check-list">
          {report.handoff.quality.checks.map(check => <span key={check.id} className={check.passed ? 'pass' : 'fail'}>{check.passed ? '✓' : '×'} {check.label}</span>)}
        </div>
        <article className="v22-document" aria-label="Nội dung sản phẩm bàn giao">
          <h3>{report.handoff.document.title}</h3>
          <p>{report.handoff.document.summary}</p>
          {report.handoff.document.sections.map((section, index) => <section key={index}>
            <h4>{section.heading}</h4><p>{section.body}</p>
          </section>)}
          <h4>Các bước tiếp theo</h4><p>{report.handoff.document.nextSteps}</p>
          <h4>Giới hạn và giả định</h4><p>{report.handoff.document.caveats}</p>
        </article>
        {report.handoff.quality.warnings.map((warning, index) => <p className="v22-quality-warning" key={index}>{warning}</p>)}
        <HandoffImprovementPanel token={token} meetingId={meetingId} action={action} reportRevision={report.revision_no}
          handoff={report.handoff} canRevise={report.status==='awaiting_review'} onReload={onReload} onBusyChange={setHandoffBusy}/>
      </> : report.status === 'awaiting_review' ? <>
        <p className="v18-muted">Hãy tạo một tài liệu bàn giao để CEO đánh giá. Chỉ một bản được lưu cho mỗi lần sửa; đổi nguồn tạo sẽ không thay thế bản đã ghi.</p>
        <div className="v22-generate-controls">
          <label>Nguồn tạo tài liệu
            <select value={handoffProvider} disabled={handoffBusy || busy} onChange={e => setHandoffProvider(e.target.value as 'simulated'|'gemini'|'openai')}>
              <option value="simulated">Mô phỏng (0 phí AI)</option>
              <option value="gemini">Gemini (cần API key)</option>
              <option value="openai">OpenAI (cần API key)</option>
            </select>
          </label>
          <button type="button" className="secondary" disabled={handoffBusy || busy} onClick={() => void createHandoff()}>
            <FileCheck2 size={15}/>{handoffBusy ? 'Đang tạo tài liệu…' : 'Tạo & kiểm tra bản bàn giao'}
          </button>
        </div>
        <p className="v22-quality-warning">Gemini/OpenAI có thể tính phí API. Không có cuộc gọi nào được thực hiện nếu bạn chưa bấm nút.</p>
      </> : <p className="v22-quality-warning">Bản bàn giao chưa được tạo cho phiên bản báo cáo này.</p>}
    </section>
    {report.review_notes && <p className="v21-review-note"><strong>Ghi chú CEO:</strong> {report.review_notes}</p>}
    {report.status === 'awaiting_review' && <>
      <label className="v21-review-label">Ý kiến nghiệm thu / yêu cầu sửa
        <textarea rows={3} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Ví dụ: Cần bổ sung tiêu chí kiểm tra và báo cáo tiến độ chi tiết hơn..." />
      </label>
      <div className="button-row v21-review-buttons">
        <button type="button" disabled={busy || handoffBusy || !report.handoff?.quality.passed} className="primary" onClick={() => void review('approve')}><CheckCircle2 size={16}/> CEO nghiệm thu & chi thưởng</button>
        <button type="button" disabled={busy || handoffBusy || report.revision_no >= 3} className="secondary" onClick={() => void review('revise')}><RotateCcw size={15}/> Yêu cầu sửa{report.revision_no >= 3 ? ' (đã đủ 3 lần)' : ''}</button>
        <button type="button" disabled={busy || handoffBusy} className="secondary" onClick={() => void review('reject')}><XCircle size={15}/> Từ chối (không thưởng)</button>
      </div>
    </>}
    {report.status === 'revision_requested' && <button className="secondary small" type="button" disabled={busy} onClick={() => void onReload()}><RefreshCw size={15}/> Kiểm tra bản sửa mới</button>}
    {notice && <p className="success" role="status">{notice}</p>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
