/** Runtime prerequisites for MEDIA TECH VUS. Never include secret values in output. */
export function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).map(line => line.trim())
    .filter(line => /^(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line))
    .map(line => {
      const clean=line.replace(/^export\s+/,'');
      const pos=clean.indexOf('=');
      const key=clean.slice(0,pos).trim();
      let value=clean.slice(pos+1).trim();
      if((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))value=value.slice(1,-1);
      return [key,value];
    }));
}
const missingOrPlaceholder = value => !value || /YOUR_|example\.supabase\.co|YOUR_PROJECT|YOUR_SERVICE|YOUR_ANON|YOUR_PUBLISHABLE/i.test(value);
export function checkConfiguration(web = {}, api = {}) {
  const failures=[]; const warnings=[];
  const requireKey=(from,key) => { if(missingOrPlaceholder(from[key]))failures.push(`Thiếu cấu hình ${key}`); };
  requireKey(web,'VITE_SUPABASE_URL'); requireKey(web,'VITE_SUPABASE_ANON_KEY');
  requireKey(api,'SUPABASE_URL'); requireKey(api,'SUPABASE_SERVICE_ROLE_KEY');
  if(!missingOrPlaceholder(web.VITE_SUPABASE_URL) && !/^https:\/\/[^\s/]+\.supabase\.co\/?$/.test(web.VITE_SUPABASE_URL))failures.push('VITE_SUPABASE_URL phải là HTTPS Supabase URL');
  if(!missingOrPlaceholder(api.SUPABASE_URL) && !/^https:\/\/[^\s/]+\.supabase\.co\/?$/.test(api.SUPABASE_URL))failures.push('SUPABASE_URL phải là HTTPS Supabase URL');
  if(web.VITE_SUPABASE_URL && api.SUPABASE_URL && web.VITE_SUPABASE_URL!==api.SUPABASE_URL)failures.push('Frontend và backend đang trỏ tới hai project Supabase khác nhau');
  if(missingOrPlaceholder(api.WEB_ORIGIN))warnings.push('WEB_ORIGIN chưa cấu hình; API mặc định chỉ cho http://localhost:5173');
  if(/^(true|1)$/i.test(api.ENABLE_BACKGROUND_WORKER || 'true'))warnings.push('Worker nền đang bật; chỉ nên chạy một API instance nếu chưa có distributed scheduling');
  for(const key of Object.keys(web)){
    if(/SERVICE_ROLE|GEMINI_API_KEY|OPENAI_API_KEY|SECRET/i.test(key))failures.push(`Cấu hình nhạy cảm ${key} không được đặt ở phía frontend`);
  }
  return {ok:failures.length===0,failures,warnings};
}
