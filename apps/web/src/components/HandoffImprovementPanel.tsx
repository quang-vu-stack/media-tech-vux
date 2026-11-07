import { useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, History, RefreshCw, Sparkles } from 'lucide-react';
import { request } from '../lib';
import type { MeetingAction, MeetingHandoff } from '../types';

type Provider = 'simulated'|'gemini'|'openai';
type Props = {token:string; meetingId:string; action:MeetingAction; handoff:MeetingHandoff;
  reportRevision:number; canRevise:boolean; onReload:()=>Promise<void>; onBusyChange?:(busy:boolean)=>void};

export default function HandoffImprovementPanel({token,meetingId,action,handoff,reportRevision,canRevise,onReload,onBusyChange}:Props){
  const [feedback,setFeedback]=useState('');
  const [provider,setProvider]=useState<Provider>('simulated');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [compareVersion,setCompareVersion]=useState<number>(1);
  const pending=useRef(false);
  const versions=handoff.versions??[];
  const currentVersion=handoff.handoff_version??1;
  const older=useMemo(()=>versions.find(version=>version.version_no===compareVersion),[versions,compareVersion]);
  const historical=versions.filter(version=>version.version_no<currentVersion);
  const latestRubric=handoff.quality.rubric;
  async function revise(){
    if(pending.current||!canRevise||currentVersion>=4||feedback.trim().length<10) return;
    pending.current=true;setBusy(true);onBusyChange?.(true);setError('');setNotice('');
    try{
      await request(`/meetings/${meetingId}/actions/${action.id}/handoff/revise`,token,{
        provider,feedback:feedback.trim(),expectedRevision:reportRevision,expectedVersion:currentVersion,
      }, 'POST', 65_000);
      setNotice('Đã lưu bản sửa. Hãy kiểm tra nội dung mới và so sánh với lịch sử trước khi nghiệm thu.');
      setFeedback('');
      await onReload();
    }catch(e){
      setError(`${e instanceof Error?e.message:'Không tạo được bản sửa.'} Hãy tải lại trước khi thử lại, không tự gửi lặp yêu cầu AI.`);
      try{await onReload()}catch{/* Keep the original error */}
    }finally{pending.current=false;setBusy(false);onBusyChange?.(false)}
  }
  return <section className="v23-handoff-upgrades" aria-label="Lịch sử tài liệu, chấm điểm chuyên môn và yêu cầu AI sửa">
    <div className="v23-section-title"><h4><Sparkles size={16}/> VIP v23 · Chất lượng theo chuyên môn</h4><span>Phiên bản tài liệu {currentVersion}/4</span></div>
    {latestRubric ? <>
      <p className="v23-score">{latestRubric.categoryLabel}: <strong>{latestRubric.score}/100</strong> <small>(đánh giá tham khảo)</small></p>
      <div className="v22-check-list">{latestRubric.checks.map(check=><span key={check.id} className={check.passed?'pass':'fail'}>{check.passed?'✓':'×'} {check.label}</span>)}</div>
      <p className="v22-quality-warning">{latestRubric.warnings[0]}</p>
    </> : <p className="v18-muted">Bản cũ chưa có điểm chuyên môn v23; tạo bản sửa để nhận đánh giá mới. Tiêu chí cấu trúc của v22 vẫn được áp dụng.</p>}
    <div className="v23-section-title"><h4><History size={16}/> Lịch sử phiên bản</h4><span>{versions.length} bản đã lưu</span></div>
    <div className="v23-history">
      {versions.map(version=><div className={`v23-version ${version.version_no===currentVersion?'current':''}`} key={version.version_no}>
        <strong>v{version.version_no} · {version.quality.score}/100 cấu trúc</strong>
        <small>{version.provider.toUpperCase()} · {new Date(version.created_at).toLocaleString('vi-VN')}</small>
        {version.feedback&&<p><b>Góp ý CEO:</b> {version.feedback}</p>}
      </div>)}
    </div>
    {historical.length>0&&<div className="v23-compare">
      <div className="v23-section-title"><h4><ArrowLeftRight size={16}/> So sánh với bản hiện tại</h4></div>
      <label>Chọn bản trước
        <select value={historical.some(v=>v.version_no===compareVersion)?compareVersion:historical[0].version_no}
          onChange={event=>setCompareVersion(Number(event.target.value))}>
          {historical.map(version=><option key={version.version_no} value={version.version_no}>Bản v{version.version_no}</option>)}
        </select>
      </label>
      <div className="v23-comparison-grid">
        <div><strong>Trước · v{older?.version_no??historical[0].version_no}</strong>
          <p>{(older??historical[0]).document.summary}</p>
          <small>Điểm cấu trúc: {(older??historical[0]).quality.score}/100 · {(older??historical[0]).document.sections.length} mục</small>
          <details><summary>Xem đầy đủ bản cũ</summary>
            {(older??historical[0]).document.sections.map((section,i)=><section key={i}><h5>{section.heading}</h5><p>{section.body}</p></section>)}
            <h5>Bước tiếp theo</h5><p>{(older??historical[0]).document.nextSteps}</p>
            <h5>Giới hạn</h5><p>{(older??historical[0]).document.caveats}</p>
          </details>
        </div>
        <div><strong>Hiện tại · v{currentVersion}</strong><p>{handoff.document.summary}</p>
          <small>Điểm cấu trúc: {handoff.quality.score}/100 · {handoff.document.sections.length} mục</small>
          <details><summary>Xem đầy đủ bản hiện tại</summary>
            {handoff.document.sections.map((section,i)=><section key={i}><h5>{section.heading}</h5><p>{section.body}</p></section>)}
            <h5>Bước tiếp theo</h5><p>{handoff.document.nextSteps}</p>
            <h5>Giới hạn</h5><p>{handoff.document.caveats}</p>
          </details>
        </div>
      </div>
      <p className="v18-muted">So sánh phần tóm tắt, điểm kỹ thuật và ý kiến sửa. Lịch sử đầy đủ được giữ ở Supabase, không ghi đè bản cũ.</p>
    </div>}
    {canRevise&&currentVersion<4&&<div className="v23-revision-box">
      <h4><RefreshCw size={16}/> CEO yêu cầu sửa tài liệu (không làm lại tiến độ nhiệm vụ)</h4>
      <label>Góp ý cụ thể của CEO
        <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} rows={3} minLength={10} maxLength={900}
          placeholder="Ví dụ: Bổ sung mục tiêu đo lường, các mốc triển khai và rủi ro kỹ thuật vào hồ sơ bàn giao."/>
      </label>
      <label>Nguồn tạo bản sửa
        <select value={provider} onChange={e=>setProvider(e.target.value as Provider)} disabled={busy}>
          <option value="simulated">Mô phỏng, không phí AI</option><option value="gemini">Gemini (có thể mất phí)</option><option value="openai">OpenAI (có thể mất phí)</option>
        </select>
      </label>
      <button type="button" className="secondary" disabled={busy||feedback.trim().length<10} onClick={()=>void revise()}>
        <RefreshCw size={15}/>{busy?'Đang tạo và lưu bản sửa…':`Tạo tài liệu v${currentVersion+1}`}
      </button>
      <p className="v22-quality-warning">Chỉ gọi AI khi CEO bấm nút. Có thể phát sinh phí API; không tự gửi lại khi mạng lỗi. Mỗi báo cáo tối đa 4 phiên bản tài liệu.</p>
    </div>}
    {canRevise&&currentVersion>=4&&<p className="hint">Đã đạt giới hạn 4 phiên bản tài liệu. CEO có thể nghiệm thu nếu bản hiện tại đạt kiểm tra hoặc sử dụng chức năng yêu cầu sửa báo cáo v21.</p>}
    {notice&&<p className="success" role="status">{notice}</p>}
    {error&&<p className="error" role="alert">{error}</p>}
  </section>;
}
