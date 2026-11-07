import { useEffect, useRef, useState } from 'react';
import { FlaskConical, Play } from 'lucide-react';

type Filename = 'index.html'|'style.css'|'app.js';
type Check = {name:string; passed:boolean; detail:string};
type Result = {passed:boolean; checks:Check[]};
type Props={files:Record<Filename,string>;previewDocument:(files:Record<Filename,string>, probe?:string)=>string};

// This is an advisory browser smoke check. It is NOT an attestation of safety or
// a release gate: untrusted app scripts share the iframe and could spoof its messages.
export default function RuntimeSmoke({files,previewDocument}:Props){
  const frame=useRef<HTMLIFrameElement|null>(null);
  const [run,setRun]=useState(0);
  const [result,setResult]=useState<Result|null>(null);
  const [message,setMessage]=useState('Nhấn nút để chạy thử mã JS khởi tạo trong iframe cách ly.');
  const runId=`vus-smoke-${run}`;
  useEffect(()=>{
    if(run===0)return;
    function receive(event:MessageEvent){
      if(event.source!==frame.current?.contentWindow)return;
      const data=event.data;
      if(!data||data.channel!=='vus-browser-smoke'||data.runId!==runId||!Array.isArray(data.checks))return;
      const checks=data.checks.filter((x:unknown):x is Check=>{
        if(!x||typeof x!=='object')return false;
        const v=x as Record<string,unknown>;
        return typeof v.name==='string'&&typeof v.passed==='boolean'&&typeof v.detail==='string';
      }).slice(0,8).map(c=>({name:c.name.slice(0,80),passed:c.passed,detail:c.detail.slice(0,250)}));
      setResult({passed:checks.length>=3&&checks.every(x=>x.passed),checks});
      setMessage('Đã nhận kết quả khởi tạo từ iframe.');
    }
    window.addEventListener('message',receive);
    const timeout=window.setTimeout(()=>setMessage(old=>old==='Đang chạy thử…'?'Không nhận được phản hồi: có thể script bị treo hoặc bị trình duyệt chặn.':old),4000);
    return()=>{window.removeEventListener('message',receive);window.clearTimeout(timeout);};
  },[run,runId]);
  // String is embedded into an isolated iframe with CSP + opaque origin.
  const probe=`(()=>{const failures=[];addEventListener('error',e=>failures.push(String(e.message||'JS error').slice(0,160)));addEventListener('unhandledrejection',e=>failures.push(String(e.reason||'Unhandled rejection').slice(0,160)));setTimeout(()=>{const html=!!document.body;const heading=!!document.querySelector('h1,h2,h3,h4,h5,h6');const errors=failures.length===0;parent.postMessage({channel:'vus-browser-smoke',runId:${JSON.stringify(runId)},checks:[{name:'DOM đã tạo',passed:html,detail:html?'Có body':'Thiếu body'},{name:'Tiêu đề được hiển thị',passed:heading,detail:heading?'Có heading':'Không tìm thấy heading'},{name:'Không có lỗi JavaScript khi khởi tạo',passed:errors,detail:errors?'Không nhận lỗi runtime':failures.join('; ').slice(0,200)}]},'*')},350)})();`;
  return <section className="studio-quality" aria-label="Chạy thử trên trình duyệt">
    <div className="section-heading"><h2><FlaskConical size={17}/> Chạy thử khởi tạo (trình duyệt)</h2>
      <button className="secondary small" onClick={()=>{setResult(null);setMessage('Đang chạy thử…');setRun(n=>n+1);}}><Play size={14}/> Chạy thử</button></div>
    <p className="muted">Kiểm tra DOM, tiêu đề và lỗi JavaScript khi khởi tạo. Đây không phải kiểm thử end-to-end; kết quả do mã trong iframe gửi về và không dùng làm bằng chứng an toàn.</p>
    {run>0&&<iframe ref={frame} title="Bản chạy thử cách ly" sandbox="allow-scripts" referrerPolicy="no-referrer"
      className="runtime-frame" srcDoc={previewDocument(files,probe)} />}
    {result?<div className={`quality-summary ${result.passed?'quality-ok':'quality-fail'}`}>
      <strong>{result.passed?'✓ Không phát hiện lỗi khởi tạo':'✕ Cần xem lại ứng dụng'}</strong>
      {result.checks.map(x=><span key={x.name}>{x.passed?'✓':'✕'} {x.name} — {x.detail}</span>)}
    </div>:<p className="muted">{message}</p>}
  </section>;
}
