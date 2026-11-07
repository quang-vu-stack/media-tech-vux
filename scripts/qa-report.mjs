/**
 * Offline QA evidence generator: logs actual commands/results, and explicitly
 * does not claim unexecuted browser/Supabase tests passed.
 * No environment variables or secrets are serialized.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaultQaReportPath } from './qa-report-path.mjs';

const output = process.argv.find(arg=>arg.startsWith('--output='))?.slice('--output='.length) || defaultQaReportPath();
const runBuild = process.argv.includes('--build');
function run(command,args,timeout=90000){
  const proc=spawnSync(command,args,{encoding:'utf8',timeout,maxBuffer:4*1024*1024});
  const text=(proc.stdout||'')+'\n'+(proc.stderr||'');
  return {ok:proc.status===0,status:proc.status ?? -1,log:text};
}
// Dynamic discovery: new test suites must not silently disappear from QA evidence.
const testPaths = readdirSync(resolve('scripts'))
  .filter(name => name.endsWith('.test.mjs'))
  .sort().map(name => `scripts/${name}`);
const tests=run(process.execPath,['--test',...testPaths],120000);
const testNumbers={total:Number(tests.log.match(/^# tests (\d+)/m)?.[1]??0),passed:Number(tests.log.match(/^# pass (\d+)/m)?.[1]??0),failed:Number(tests.log.match(/^# fail (\d+)/m)?.[1]??0)};
const structure=run(process.execPath,['scripts/smoke.mjs']);
const backend=run(process.execPath,['--check','apps/api/src/index.js']);
const checks={
  node_tests:{status:tests.ok&&testNumbers.total>0?'PASS':'FAIL',...testNumbers},
  structure:{status:structure.ok?'PASS':'FAIL'},
  backend_syntax:{status:backend.ok?'PASS':'FAIL'},
  deployed_bundle_assets:{status:'NOT_RUN',reason:'Run npm run smoke:deployed against a running Docker web host to verify JS/CSS bundles.'},
  web_production_build:{status:'NOT_RUN',reason:'Run npm run build with installed dependencies; optionally use qa:report -- --build.'},
  real_supabase_integration:{status:'NOT_RUN',reason:'Requires dedicated QA Supabase project and explicit safeguards. Not executed by this report.'},
  real_browser_e2e:{status:'NOT_RUN',reason:'Requires Chromium, Vite and optionally disposable QA accounts. Not executed by this report.'},
};
if(runBuild){
  const build=run(process.platform === 'win32' ? 'npm.cmd' : 'npm',['run','build'],90000);
  checks.web_production_build={status:build.ok?'PASS':'FAIL',reason:build.ok?'Build succeeded.':'Build failed or dependencies are unavailable.',exit_code:build.status};
}
const releaseVersion=JSON.parse(readFileSync(resolve('package.json'),'utf8')).version;
const report={product:'MEDIA TECH VUX — CEO EMPIRE',version:releaseVersion,generated_at:new Date().toISOString(),node_version:process.version,checks,notes:['This report does not contact Supabase or Gemini/OpenAI.','No secrets, account IDs, tokens or SQL data are stored.','PASS for Node tests is not an end-to-end production certification.']};
const file=resolve(output);
mkdirSync(resolve(file,'..'),{recursive:true});
writeFileSync(file,JSON.stringify(report,null,2)+'\n');
for(const [label,entry] of Object.entries(checks)) console.log(`${entry.status.padEnd(8)} ${label}${entry.total?` (${entry.passed}/${entry.total})`:''}`);
console.log(`Evidence saved: ${file}`);
console.log('RELEASE GATE: run npm run release:gate -- --level=logic or --level=build. Production requires external evidence.');
if(!tests.ok || !structure.ok || !backend.ok || (runBuild && checks.web_production_build.status!=='PASS')) process.exitCode=1;
