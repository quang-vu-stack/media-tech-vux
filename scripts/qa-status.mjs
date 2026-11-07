import {readFileSync} from 'node:fs';
import {defaultQaReportPath} from './qa-report-path.mjs';
const filename=process.argv.find(x=>x.startsWith('--report='))?.split('=')[1]??defaultQaReportPath();
try {
  const report=JSON.parse(readFileSync(filename,'utf8'));
  console.log(`MEDIA TECH VUX v${report.version} — evidence from ${report.generated_at}`);
  for(const [name,record] of Object.entries(report.checks)) {
    const info=record.status==='PASS'?'PASS':record.status==='FAIL'?'FAIL':'NOT_RUN';
    console.log(`${info.padEnd(8)} ${name}${record.reason?` — ${record.reason}`:''}`);
  }
  if(report.checks.web_production_build?.status!=='PASS'||report.checks.real_browser_e2e?.status!=='PASS'||report.checks.real_supabase_integration?.status!=='PASS'){
    console.log('NO PRODUCTION CERTIFICATION: critical checks are missing or failing.');
  }
}catch(error){
  console.error(`Report ${filename} not found. Run npm run qa:report first.`);
  process.exitCode=2;
}
