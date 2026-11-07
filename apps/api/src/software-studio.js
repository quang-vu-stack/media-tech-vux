// A SMALL, BOUNDED SOURCE-CODE ARTIFACT ONLY. Never execute generated code in Node.
export const MAX_FILES = { 'index.html': 16000, 'style.css': 16000, 'app.js': 16000 };
const cleanFence = text => text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
export function validateSoftwareArtifact(input) {
  if (typeof input === 'string') input = JSON.parse(cleanFence(input));
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid artifact JSON');
  if (typeof input.title !== 'string' || input.title.trim().length < 5 || input.title.length > 120) throw new Error('Invalid title');
  if (typeof input.summary !== 'string' || input.summary.trim().length < 20 || input.summary.length > 1200) throw new Error('Invalid summary');
  if (!input.files || typeof input.files !== 'object' || Array.isArray(input.files)) throw new Error('Invalid files');
  const names = Object.keys(input.files);
  if (names.length !== 3 || !names.every(k => k in MAX_FILES)) throw new Error('Only index.html, style.css and app.js are allowed');
  for (const [filename, max] of Object.entries(MAX_FILES)) {
    const source = input.files[filename];
    if (typeof source !== 'string' || source.trim().length < 12 || source.length > max) throw new Error('Invalid source: ' + filename);
  }
  return {
    title: input.title.trim(), summary: input.summary.trim(),
    files: Object.fromEntries(Object.keys(MAX_FILES).map(name => [name, input.files[name]])),
  };
}
export function demoSoftwareArtifact(prompt) {
  const safe = String(prompt).slice(0,120);
  return validateSoftwareArtifact({
    title: 'VUS Demo — Ứng dụng quản lý công việc',
    summary: `Bản ứng dụng demo chạy offline, dùng để thử Xưởng phần mềm AI. Yêu cầu CEO: ${safe}. Đây không phải sản phẩm AI tạo theo yêu cầu; hãy chọn Gemini hoặc OpenAI để sinh mã theo yêu cầu thật.`,
    files: {
      'index.html': '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main><h1>VUS Task Board</h1><p>Ứng dụng mẫu được tạo để thử giao diện sandbox.</p><form id="form"><input id="task" placeholder="Nhập việc cần làm" maxlength="100" required><button>Thêm</button></form><ul id="tasks"></ul></main></body></html>',
      'style.css': 'body{font-family:system-ui;background:#101b2d;color:#e6f5ff;padding:24px}main{max-width:520px;margin:auto}input,button{padding:12px;border-radius:9px;border:0}button{background:#56ddba;color:#06302c;font-weight:700}li{padding:8px;border-bottom:1px solid #31445a}',
      'app.js': "const tasks=document.getElementById('tasks');document.getElementById('form').addEventListener('submit',event=>{event.preventDefault();const input=document.getElementById('task');const li=document.createElement('li');li.textContent=input.value;tasks.appendChild(li);input.value='';});",
    },
  });
}
export function softwarePrompt(prompt, employee) {
  return {
    instructions: `Bạn là kỹ sư ${employee.full_name} của MEDIA TECH VUS. Hãy tạo đúng MỘT ứng dụng web tĩnh nhỏ đáp ứng yêu cầu của CEO. CHỈ trả JSON object {title:string,summary:string,files:{"index.html":string,"style.css":string,"app.js":string}}. Tiêu đề từ 5 đến 120 ký tự, summary 20 đến 1200 ký tự, mỗi file 12..16000 ký tự. index.html phải là HTML5 có nội dung body, KHÔNG đặt mã CSS/JS bên trong; dùng style.css/app.js độc lập. KHÔNG sử dụng CDN, tài nguyên từ Internet, fetch, WebSocket, import, iframe, form action, dữ liệu nhạy cảm, localStorage, cookie, window.top hay bất cứ yêu cầu mạng nào. Không tạo server, không khẳng định đã triển khai. App hoạt động chỉ trong iframe sandboxed không có mạng. Chỉ dùng DOM API vanilla JS. Không đưa markdown fence.`,
    input: JSON.stringify({ task: prompt, assignedEmployee: employee.full_name, role: employee.role }),
  };
}
// CSP is provided in a <meta> tag INSIDE the sandboxed iframe.
// HTML, CSS, JS remain untrusted; preview has no same-origin privilege and no network permissions.
export function wrapPreview(artifact) {
  const a = validateSoftwareArtifact(artifact);
  const meta = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; connect-src \'none\'; font-src \'none\'; form-action \'none\'; base-uri \'none\'; object-src \'none\'">';
  let html = a.files['index.html'];
  // Scrub generator's head/body markup from the shell; never trust model HTML as a safe app.
  // The HTML is still untrusted; iframe sandbox provides isolation, CSP limits network use.
  const escapeClosing = src => src.replace(/<\/script/gi, '<\\/script');
  const css = a.files['style.css'].replace(/<\/style/gi, '<\\/style');
  const js = escapeClosing(a.files['app.js']);
  return `<!doctype html><html><head>${meta}<style>${css}</style></head><body><div id="generated-app">${html}</div><script>${js}</script></body></html>`;
}
