import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Bot, Code2, Download, MonitorPlay, RefreshCcw, ShieldCheck, X, FlaskConical, History, Wrench, Rocket, RotateCcw } from 'lucide-react';
import RuntimeSmoke from './RuntimeSmoke';
import { request } from '../lib';
import type { Employee } from '../types';

type Provider = 'simulated' | 'gemini' | 'openai';
type Filename = 'index.html' | 'style.css' | 'app.js';
type QualityFinding = { code:string; severity:'error'|'warning'; message:string; file:string; line:number|null };
type QualityReport = { engine:string; checked_at:string; source_sha256:string; passed:boolean; errors:number; warnings:number; findings:QualityFinding[]; checks:{code:string;passed:boolean;description:string}[] };
type Project = {
  id:string; employee_id:string; prompt:string; provider:Provider; current_version:number;
  title:string; summary:string; status:'awaiting_review'|'approved'|'rejected';
  files:Record<Filename,string>; created_at:string; published_version:number|null;
};
type Version = {
  id:string; project_id:string; version_number:number; title:string; summary:string; provider:Provider;
  files:Record<Filename,string>; quality_report:QualityReport|null; feedback:string; created_at:string;
};
type Props = { token:string; employees:Employee[]; notify:(message:string)=>void };
type ReleaseEvent = {id:string; version_number:number; action:'release'|'rollback'; source_sha256:string; note:string; created_at:string};
const sourceNames:Filename[]=['index.html','style.css','app.js'];
// Generated code is untrusted. Opaque iframe origin, no allow-same-origin, CSP bans networking.
export function previewDocument(files:Record<Filename,string>, probe = ''):string {
  const policy=`default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; font-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'`;
  const escapeTag=(s:string,tag:string)=>s.replace(new RegExp(`<\\/${tag}`, 'gi'),`<\\/${tag}`);
  const css=escapeTag(files['style.css']||'','style');
  const js=escapeTag(files['app.js']||'','script');
  const html=(files['index.html']||'').replace(/<!doctype[^>]*>/ig,'').replace(/<\/?(?:html|head|body)[^>]*>/ig,'');
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}${probe ? `<script>${probe}</script>` : ''}<script>${js}</script></body></html>`;
}
export default function SoftwareStudio({token,employees,notify}:Props){
  const [projects,setProjects]=useState<Project[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [versions,setVersions]=useState<Version[]>([]);
  const [releaseEvents,setReleaseEvents]=useState<ReleaseEvent[]>([]);
  const [releaseNote,setReleaseNote]=useState('Bản phát hành nội bộ đã được CEO kiểm tra.');
  const [viewVersion,setViewVersion]=useState<number|null>(null);
  const [employeeId,setEmployeeId]=useState(employees[0]?.id||'');
  const [prompt,setPrompt]=useState('Tạo website quản lý lịch họp, có danh sách lịch họp và bộ lọc theo chủ đề.');
  const [provider,setProvider]=useState<Provider>('simulated');
  const [feedback,setFeedback]=useState('Hãy cải thiện giao diện và sửa các lỗi đã phát hiện trong báo cáo chất lượng.');
  const [file,setFile]=useState<Filename>('index.html');
  const [mode,setMode]=useState<'preview'|'source'>('preview');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [frameIndex,setFrameIndex]=useState(0);
  const selected=useMemo(()=>projects.find(p=>p.id===selectedId)||projects[0], [projects,selectedId]);
  const shown=versions.find(v=>v.version_number===(viewVersion??selected?.current_version));
  const current=versions.find(v=>v.version_number===selected?.current_version);
  const report=shown?.quality_report;
  const currentReport=current?.quality_report;
  const isCurrent=shown?.version_number===selected?.current_version;
  const previous=shown ? versions.find(v=>v.version_number===shown.version_number-1) : undefined;
  const changeSummary=shown&&previous ? sourceNames.map(name=>({name, changed:shown.files[name]!==previous.files[name], oldLines:previous.files[name].split('\n').length, newLines:shown.files[name].split('\n').length})) : [];
  const load=useCallback(async()=>{
    try {const r=await request<{projects:Project[]}>('/studio/projects',token);setProjects(r.projects);setError('');}
    catch(e){setError(e instanceof Error?e.message:'Không tải được dự án.');}
  },[token]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{
    if(!selected?.id){setVersions([]);setReleaseEvents([]);return;}
    let live=true;
    request<{versions:Version[]}>(`/studio/projects/${selected.id}/versions`,token)
      .then(r=>{if(live){setVersions(r.versions);setViewVersion(null);}})
      .catch(e=>{if(live)setError(e instanceof Error?e.message:'Không tải được lịch sử phiên bản.');});
    request<{events:ReleaseEvent[]}>(`/studio/projects/${selected.id}/releases`,token)
      .then(r=>{if(live)setReleaseEvents(r.events);})
      .catch(e=>{if(live)setError(e instanceof Error?e.message:'Không tải được lịch sử phát hành.');});
    return()=>{live=false};
  },[selected?.id,selected?.current_version,selected?.published_version,token]);
  async function reloadProject(id?:string){
    const selectedKey=id||selected?.id;
    await load();
    if(selectedKey){
      const [versionResult,releaseResult]=await Promise.all([
        request<{versions:Version[]}>(`/studio/projects/${selectedKey}/versions`,token),
        request<{events:ReleaseEvent[]}>(`/studio/projects/${selectedKey}/releases`,token),
      ]);
      setVersions(versionResult.versions);setReleaseEvents(releaseResult.events);setViewVersion(null);
    }
    setFrameIndex(i=>i+1);
  }
  async function generate(e:FormEvent){
    e.preventDefault();if(!employeeId)return;setBusy(true);setError('');
    try {const r=await request<{project:Project}>('/studio/projects',token,{employeeId,prompt,provider});setSelectedId(r.project.id);await reloadProject(r.project.id);notify('Đã tạo v1 và kiểm tra chất lượng tự động.');}
    catch(e){setError(e instanceof Error?e.message:'Không tạo được phần mềm.');}
    finally{setBusy(false);}
  }
  async function quality(){
    if(!selected)return;setBusy(true);setError('');
    try {await request(`/studio/projects/${selected.id}/quality`,token,{});await reloadProject();notify('Đã kiểm tra chất lượng phiên bản hiện tại.');}
    catch(e){setError(e instanceof Error?e.message:'Không chạy được kiểm tra.');}
    finally{setBusy(false);}
  }
  async function revise(e:FormEvent){
    e.preventDefault();if(!selected)return;setBusy(true);setError('');
    try {await request(`/studio/projects/${selected.id}/revise`,token,{feedback,provider,expectedVersion:selected.current_version});
      await reloadProject();notify('Đã lưu phiên bản mới và báo cáo kiểm tra.');}
    catch(e){setError(e instanceof Error?e.message:'Không tạo được bản sửa.');}
    finally{setBusy(false);}
  }
  async function review(decision:'approved'|'rejected'){
    if(!selected)return;setBusy(true);setError('');
    try {await request(`/studio/projects/${selected.id}/review`,token,{decision,expectedVersion:selected.current_version});
      await reloadProject();notify(decision==='approved'?'CEO đã nghiệm thu phiên bản hiện tại.':'CEO đã từ chối phiên bản hiện tại.');}
    catch(e){setError(e instanceof Error?e.message:'Không thể ghi nhận quyết định.');}
    finally{setBusy(false);}
  }
  async function release(){
    if(!selected)return;
    setBusy(true);setError('');
    try {
      await request(`/studio/projects/${selected.id}/release`,token,{expectedVersion:selected.current_version,note:releaseNote});
      await reloadProject();notify('Đã phát hành nội bộ phiên bản được CEO nghiệm thu.');
    } catch(e){setError(e instanceof Error?e.message:'Không phát hành được.');}
    finally{setBusy(false);}
  }
  async function rollback(targetVersion:number){
    if(!selected || selected.published_version===null || !window.confirm(`Kích hoạt lại bản v${targetVersion}? Lịch sử mã nguồn vẫn được giữ.`))return;
    setBusy(true);setError('');
    try {
      await request(`/studio/projects/${selected.id}/rollback`,token,{
        targetVersion,expectedPublishedVersion:selected.published_version,note:`CEO khôi phục bản v${targetVersion}`,
      });
      await reloadProject();notify(`Đã kích hoạt lại bản phát hành v${targetVersion}.`);
    } catch(e){setError(e instanceof Error?e.message:'Không khôi phục được.');}
    finally{setBusy(false);}
  }
  function download(){
    if(!selected||!shown)return;
    const blob=new Blob([JSON.stringify({project:selected.id,version:shown.version_number,title:shown.title,files:shown.files,quality_report:shown.quality_report},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`vus-${selected.id}-v${shown.version_number}.json`;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="studio-root">
    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">SOFTWARE STUDIO · QUALITY GATE · VERSION CONTROL</p><h2><Code2 className="inline-icon" size={20}/> Xưởng phần mềm AI v9</h2></div><button className="secondary small" disabled={busy} onClick={()=>void load()}><RefreshCcw size={15}/> Tải lại</button></div>
      <p className="muted">CEO giao yêu cầu, AI tạo ứng dụng web tĩnh; v9 bổ sung chạy thử khởi tạo trên trình duyệt và phát hành nội bộ có thể khôi phục phiên bản cũ. Mã JS chỉ được phân tích cú pháp, không chạy trên máy chủ. Kiểm tra tĩnh không chứng minh phần mềm hoạt động chính xác hoặc an toàn tuyệt đối.</p>
      <form className="studio-form" onSubmit={generate}>
        <label>Kỹ sư phụ trách<select value={employeeId} onChange={e=>setEmployeeId(e.target.value)}>{employees.map(x=><option key={x.id} value={x.id}>{x.full_name} · {x.role}</option>)}</select></label>
        <label>Chế độ<select value={provider} onChange={e=>setProvider(e.target.value as Provider)}><option value="simulated">Mô phỏng — không dùng API</option><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option></select></label>
        <label className="studio-prompt">Yêu cầu CEO<textarea rows={3} minLength={12} maxLength={1000} required value={prompt} onChange={e=>setPrompt(e.target.value)}/></label>
        <button type="submit" className="primary" disabled={busy||!employeeId}><Bot size={16}/>{busy?'Đang xử lý…':'Tạo dự án mới & kiểm tra'}</button>
      </form>
      {error&&<div className="error" role="alert">{error}</div>}
    </section>
    <div className="studio-layout">
      <section className="panel studio-list"><h2>Dự án ({projects.length})</h2>
        {projects.length===0&&<div className="empty-state">Chưa có dự án.</div>}
        {projects.map(p=><button key={p.id} className={`studio-project ${selected?.id===p.id?'active':''}`} onClick={()=>{if(selected?.id!==p.id){setSelectedId(p.id);setVersions([]);}setViewVersion(null);setFrameIndex(i=>i+1)}}><strong>{p.title}</strong><span>v{p.current_version} · {p.provider}</span><small>{p.status==='awaiting_review'?'Chờ duyệt':p.status==='approved'?'Đã duyệt':'Từ chối'}</small></button>)}
      </section>
      <section className="panel studio-workspace">
        {!selected?<div className="empty-state">Tạo dự án để bắt đầu.</div>:<>
          <div className="section-heading"><div><p className="eyebrow">CEO QUALITY REVIEW</p><h2>{selected.title}</h2></div><span className="count">v{selected.current_version} · {selected.status}</span></div>
          <p className="muted">{selected.summary}</p>
          <div className="studio-files" role="group" aria-label="Lịch sử phiên bản">
            {versions.map(v=><button key={v.id} className={(viewVersion??selected.current_version)===v.version_number?'active':''} onClick={()=>{setViewVersion(v.version_number);setFrameIndex(x=>x+1)}}><History size={13}/> v{v.version_number} {v.quality_report?.passed?'✓':''}</button>)}
          </div>
          {shown&&<>
            {shown.feedback&&<div className="hint">Phản hồi trước phiên bản v{shown.version_number}: {shown.feedback}</div>}
            {previous&&<div className="hint"><strong>So sánh v{previous.version_number} → v{shown.version_number}:</strong> {changeSummary.map(d=><span key={d.name} className="studio-diff">{d.name}: {d.changed?'đã thay đổi':'không đổi'} ({d.oldLines} → {d.newLines} dòng)</span>)}</div>}
            <div className="button-row studio-switch"><button className={mode==='preview'?'primary':'secondary'} onClick={()=>setMode('preview')}><MonitorPlay size={15}/> Xem trước</button><button className={mode==='source'?'primary':'secondary'} onClick={()=>setMode('source')}><Code2 size={15}/> Mã nguồn</button><button className="secondary" onClick={download}><Download size={15}/> Xuất JSON</button></div>
            {mode==='preview'?<div className="studio-preview"><div className="studio-preview-label">Iframe sandbox · Không mạng · Phiên bản v{shown.version_number}</div><iframe key={`${shown.id}-${frameIndex}`} title="Xem trước mã AI cách ly" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={previewDocument(shown.files)}/></div>:<div className="studio-source"><div className="studio-files">{sourceNames.map(n=><button key={n} className={file===n?'active':''} onClick={()=>setFile(n)}>{n}</button>)}</div><pre><code>{shown.files[file]}</code></pre></div>}
          </>}
          {shown && <RuntimeSmoke key={`${shown.id}-${frameIndex}`} files={shown.files} previewDocument={previewDocument} />}
          {shown&&<section className="studio-quality">
            <div className="section-heading"><h2><FlaskConical size={17}/> Báo cáo kiểm tra tĩnh</h2>{isCurrent&&<button className="secondary small" disabled={busy} onClick={()=>void quality()}><RefreshCcw size={14}/> Kiểm tra lại</button>}</div>
            {!report?<div className="hint">Phiên bản này chưa có báo cáo. Chọn phiên bản hiện tại và nhấn Kiểm tra lại nếu cần nghiệm thu.</div>:<>
              <div className={`quality-summary ${report.passed?'quality-ok':'quality-fail'}`}><strong>{report.passed?'✓ Đạt kiểm tra tĩnh':'✕ Có lỗi cần xử lý'}</strong><span>{report.errors} lỗi chặn · {report.warnings} cảnh báo · {report.engine}</span></div>
              <div className="quality-findings">{report.findings.length===0?<p className="muted">Không phát hiện vấn đề theo bộ quy tắc hiện tại. Chưa phải bằng chứng an toàn / đúng nghiệp vụ.</p>:report.findings.map((f,i)=><div key={`${f.code}-${i}`} className={`quality-finding ${f.severity}`}><b>{f.severity==='error'?'LỖI':'CẢNH BÁO'} · {f.code}</b><span>{f.file}{f.line?`:${f.line}`:''} — {f.message}</span></div>)}</div>
            </>}
          </section>}
          <form className="studio-revision" onSubmit={revise}><h2><Wrench size={17}/> Yêu cầu sửa và tạo phiên bản mới</h2><label>Phản hồi CEO<textarea rows={3} minLength={8} maxLength={1000} value={feedback} onChange={e=>setFeedback(e.target.value)} required/></label><button className="secondary" type="submit" disabled={busy||selected.current_version>=6}>{busy?'Đang xử lý…':`Tạo phiên bản v${selected.current_version+1} (tối đa 6)`}</button></form>
          {selected.status==='awaiting_review'?<div className="button-row studio-review"><button disabled={busy} className="secondary" onClick={()=>void review('rejected')}><X size={15}/> Từ chối</button><button disabled={busy||!currentReport?.passed} className="primary" onClick={()=>void review('approved')}><ShieldCheck size={15}/> CEO nghiệm thu v{selected.current_version}</button></div>:<div className="hint">Trạng thái: {selected.status==='approved'?'Đã được CEO nghiệm thu':'CEO đã từ chối'}. Bạn có thể yêu cầu tạo phiên bản mới để xét duyệt lại.</div>}
          <section className="studio-quality" aria-label="Phát hành nội bộ">
            <div className="section-heading"><h2><Rocket size={17}/> Phát hành nội bộ & khôi phục</h2>
              <span className="count">{selected.published_version ? `Đang kích hoạt: v${selected.published_version}` : 'Chưa phát hành'}</span>
            </div>
            <div className="hint">Chỉ phát hành phiên bản mới nhất đã được CEO duyệt và đạt kiểm tra tĩnh. Đây là bản phát hành <b>nội bộ trong game</b>, không tự triển khai website ra Internet.</div>
            <label>Ghi chú phát hành<input value={releaseNote} onChange={e=>setReleaseNote(e.target.value)} maxLength={500}/></label>
            <div className="button-row studio-review"><button className="primary" disabled={busy||selected.status!=='approved'||!currentReport?.passed||selected.published_version===selected.current_version}
              onClick={()=>void release()}><Rocket size={16}/> Phát hành v{selected.current_version}</button></div>
            <h3 className="release-title">Lịch sử phát hành</h3>
            {releaseEvents.length===0 ? <p className="muted">Chưa có bản phát hành.</p> :
              <div className="release-list">{releaseEvents.map(e=><div key={e.id} className="release-item">
                <div><strong>{e.action==='release'?'Phát hành':'Khôi phục'} v{e.version_number}</strong>
                  <small>{new Date(e.created_at).toLocaleString('vi-VN')} · SHA-256 {e.source_sha256.slice(0,12)}…</small>
                  {e.note&&<small>{e.note}</small>}
                </div>
                {e.action==='release'&&selected.published_version!==e.version_number&&
                  <button className="secondary small" disabled={busy} onClick={()=>void rollback(e.version_number)}><RotateCcw size={14}/> Khôi phục</button>}
              </div>)}</div>}
          </section>
          <p className="studio-warning">⚠️ Không nhập mật khẩu hoặc API key vào ứng dụng AI. Bộ kiểm tra chỉ là static lint; chưa chạy unit test thực tế, quét lỗ hổng hay kiểm chứng bảo mật. Luôn xem lại trước khi đưa mã ra môi trường thật.</p>
        </>}
      </section>
    </div>
  </div>;
}
