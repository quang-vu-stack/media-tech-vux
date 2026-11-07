// Static, deterministic, non-executing checks. NOT a security audit or browser E2E test.
// Node vm.Script parses JavaScript syntax but NEVER runs the generated program.
import { Script } from 'node:vm';
import { createHash } from 'node:crypto';
import { validateSoftwareArtifact } from './software-studio.js';

function finding(code, severity, message, file, line = null) {
  return { code, severity, message, file, line };
}
function sourceLine(text, at) { return text.slice(0, Math.max(0, at)).split('\n').length; }
function addMatches(source, regex, code, severity, message, file, out) {
  for (const m of source.matchAll(regex)) out.push(finding(code, severity, message, file, sourceLine(source, m.index)));
}
export function analyzeSoftwareArtifact(input) {
  const artifact = validateSoftwareArtifact(input);
  const html = artifact.files['index.html'];
  const css = artifact.files['style.css'];
  const js = artifact.files['app.js'];
  const findings = [];
  const checks = [];
  const check = (code, passed, description, severity = 'error', file = 'index.html') => {
    checks.push({ code, passed, description });
    if (!passed) findings.push(finding(code, severity, description, file));
  };
  check('HTML_ROOT', /<\s*(main|body|section|article|div)\b/i.test(html), 'HTML phải có vùng nội dung chính.');
  check('HTML_HEADING', /<h[1-6]\b[^>]*>[^<]{1,}/i.test(html), 'Cần ít nhất một tiêu đề có nội dung.', 'warning');
  check('HTML_INLINE_SCRIPT', !/<script\b/i.test(html), 'Không nhúng script trong HTML; chỉ dùng app.js.');
  check('HTML_INLINE_STYLE', !/<style\b/i.test(html), 'Không nhúng style trong HTML; chỉ dùng style.css.');
  check('HTML_EVENT_ATTR', !/\bon[a-z]+\s*=/i.test(html), 'Không dùng trình xử lý sự kiện trực tiếp trong thuộc tính HTML.');
  check('HTML_FORM_ACTION', !/<form\b[^>]*\baction\s*=/i.test(html), 'Form không được có action gửi dữ liệu ngoài iframe.');
  check('CSS_RULES', /\{[^{}]*\}/.test(css), 'CSS cần có ít nhất một quy tắc.', 'warning', 'style.css');
  let balance = 0; let invalidCss = false;
  // Basic bracket heuristic; braces inside strings/comments can trigger false positives.
  for (const ch of css) { if (ch === '{') balance++; if (ch === '}') { balance--; if (balance < 0) invalidCss = true; } }
  check('CSS_BRACES', !invalidCss && balance === 0, 'Dấu ngoặc nhọn CSS không cân bằng.', 'warning', 'style.css');
  try { new Script(js, {filename:'app.js', displayErrors:true}); checks.push({code:'JS_SYNTAX',passed:true,description:'Cú pháp JavaScript hợp lệ.'}); }
  catch (err) { checks.push({code:'JS_SYNTAX',passed:false,description:'JavaScript sai cú pháp.'}); findings.push(finding('JS_SYNTAX','error',String(err.message).slice(0,240),'app.js')); }
  addMatches(js,/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/g,'NETWORK_API','error','Phát hiện mã gọi mạng; ứng dụng sandbox không cho phép.', 'app.js',findings);
  addMatches(js,/\b(?:localStorage|sessionStorage|document\.cookie)\b/g,'SENSITIVE_STORAGE','warning','Không nên lưu dữ liệu hoặc bí mật trong sandbox.', 'app.js',findings);
  addMatches(js,/\b(?:eval\s*\(|new\s+Function\s*\()/g,'DYNAMIC_EXEC','error','Không dùng eval hoặc Function constructor.', 'app.js',findings);
  addMatches(html,/<(?:iframe|object|embed)\b/gi,'NESTED_CONTENT','error','Không nhúng iframe/object/embed.', 'index.html',findings);
  addMatches(html,/\b(?:src|href)\s*=\s*['"]\s*https?:/gi,'REMOTE_RESOURCE','error','Không dùng tài nguyên URL bên ngoài.', 'index.html',findings);
  addMatches(css,/@import\b|url\s*\(\s*['"]?https?:/gi,'REMOTE_CSS','error','Không import CSS hoặc asset bên ngoài.', 'style.css',findings);
  const htmlIds = new Set([...html.matchAll(/\bid\s*=\s*['"]([\w-]+)['"]/gi)].map(m=>m[1]));
  for (const match of js.matchAll(/getElementById\(\s*['"]([\w-]+)['"]\s*\)/g)) {
    if (!htmlIds.has(match[1])) findings.push(finding('MISSING_DOM_ID','warning',`JS tham chiếu #${match[1]} nhưng HTML không khai báo id này.`, 'app.js', sourceLine(js,match.index)));
  }
  const errors = findings.filter(x=>x.severity==='error').length;
  const warnings = findings.filter(x=>x.severity==='warning').length;
  const sourceSha256 = createHash('sha256').update(JSON.stringify(artifact.files)).digest('hex');
  return { engine:'vus-static-v8.0', checked_at:new Date().toISOString(), source_sha256:sourceSha256,
    passed:errors === 0, errors, warnings, findings:findings.slice(0,40), checks };
}

export function revisedSoftwarePrompt(prompt, feedback, previous, employee) {
  if (typeof feedback !== 'string' || feedback.trim().length < 8 || feedback.length > 1000) throw new Error('Invalid revision feedback');
  const source=validateSoftwareArtifact(previous);
  return {
    instructions:`Bạn là kỹ sư ${employee.full_name}, sửa mã nguồn ứng dụng web tĩnh sau khi nhận phản hồi CEO. Chỉ trả JSON {title:string,summary:string,files:{"index.html":string,"style.css":string,"app.js":string}}; mỗi file 12..16000 ký tự. Sửa tối thiểu đáp ứng yêu cầu CEO và các lỗi đã được chỉ ra. Không tạo server, CDN, fetch, WebSocket, import, iframe, eval, localStorage hay yêu cầu mạng. Không đưa markdown fence. Không tuyên bố đã kiểm thử chức năng thực tế.`,
    input:JSON.stringify({request:prompt, feedback, existingArtifact:source}),
  };
}

// A deterministic fallback explicitly marked simulated; not presented as an AI rewrite.
export function simulatedRevision(previous, feedback) {
  const input=validateSoftwareArtifact(previous);
  const escaped=feedback.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return validateSoftwareArtifact({title:input.title,summary:`Bản sửa mô phỏng theo phản hồi CEO: ${feedback.slice(0,240)}. Đây không phải AI thực hiện thay đổi chức năng thực tế.`,
    files:{...input.files,'index.html':input.files['index.html'].replace(/<\/body>/i,`<aside aria-label="Ghi chú sửa đổi"><p>CEO yêu cầu: ${escaped}</p></aside></body>`)} });
}
