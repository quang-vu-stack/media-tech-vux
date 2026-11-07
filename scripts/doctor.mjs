import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const version=process.versions.node.split('.').map(Number);
const validNode=version[0]>22||(version[0]===22&&(version[1]>12||(version[1]===12&&version[2]>=0)));
const status=(label,valid,help='')=>console.log(`${valid?'✅':'⚠️'} ${label}${help?' — '+help:''}`);
status(`Node.js v${process.versions.node}`,validNode,validNode?'':'Cần >=22.12.0');
status('Đã cài thư viện node_modules',existsSync(resolve(root,'node_modules')),'Nếu chưa: npm install');
const envs=[['Frontend', 'apps/web/.env',['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY']],
 ['Backend','apps/api/.env',['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']]];
for(const [label,file,keys] of envs){
  const location=resolve(root,file);const exists=existsSync(location);
  if(!exists){status(label+' .env',false,`Chạy Copy-Item ${file+'.example'} ${file}`);continue;}
  const text=readFileSync(location,'utf8');
  const values=Object.fromEntries(text.split(/\r?\n/).filter(line=>/^[A-Z_]+=[^=]*/.test(line)).map(line=>{
    const pos=line.indexOf('=');return [line.slice(0,pos),line.slice(pos+1).trim()];
  }));
  const missing=keys.filter(k=>!values[k]||/YOUR_|YOUR_PROJECT|YOUR_SERVICE|YOUR_ANON|YOUR_PUBLISHABLE/.test(values[k]));
  status(label+' .env',missing.length===0,missing.length?`Thiếu/placeholder: ${missing.join(', ')}`:'Cấu hình có giá trị (chưa xác nhận key đúng)');
}
console.log('\nSQL (phải chạy thủ công trong Supabase Dashboard):');
console.log('1. Project mới: supabase/schema.sql');
console.log('2. Project mới/cũ: supabase/upgrade_ceo_empire.sql');
console.log('3. Project mới/cũ: supabase/upgrade_ai_agents.sql');
console.log('4. Project mới/cũ: supabase/upgrade_market.sql');
console.log('5. World v5: supabase/upgrade_world_v5.sql');
console.log('6. Agent bàn giao v6: supabase/upgrade_deliverables_v6.sql');
console.log('7. Xưởng phần mềm v7: supabase/upgrade_software_studio_v7.sql');
console.log('8. Xưởng phần mềm AI v8: supabase/upgrade_studio_quality_v8.sql');
console.log('9. Phát hành nội bộ v9: supabase/upgrade_studio_release_v9.sql');
console.log('10. Vận hành v10: không cần SQL migration');
console.log('11. Hội đồng CEO v18: supabase/upgrade_v18_meetings.sql');
console.log('12. Hội đồng AI v19: supabase/upgrade_v19_ai_council.sql');
console.log('13. Quyết định thành nhiệm vụ v20: supabase/upgrade_v20_council_actions.sql');
console.log('14. Báo cáo và nghiệm thu v21: supabase/upgrade_v21_work_reports.sql');
console.log('15. Hồ sơ bàn giao & kiểm tra chất lượng v22: supabase/upgrade_v22_meeting_handoffs.sql');
console.log('16. Phiên bản tài liệu & kiểm tra chuyên môn v23: supabase/upgrade_v23_handoff_improvements.sql');
console.log('Chưa thể tự kiểm tra SQL đã được triển khai nếu không kết nối Supabase.');
console.log('Sau đó chạy: npm run dev');
