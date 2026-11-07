import { readFileSync } from 'node:fs';
import { defaultQaReportPath } from './qa-report-path.mjs';
import { resolve } from 'node:path';
import { assessReleaseReadiness } from './release-readiness-core.mjs';

const level = process.argv.find(x=>x.startsWith('--level='))?.split('=')[1] ?? 'production';
const file = process.argv.find(x=>x.startsWith('--report='))?.slice('--report='.length) ?? defaultQaReportPath();
try {
  const report = JSON.parse(readFileSync(resolve(file),'utf8'));
  const result=assessReleaseReadiness(report,level);
  console.log(`MEDIA TECH VUX v${result.version} — ${level.toUpperCase()} release gate: ${result.passed}/${result.required}`);
  for(const row of result.checks) console.log(`${row.pass?'PASS':'BLOCK'} ${row.name} [${row.status}]`);
  if(!result.ready){
    console.error('NOT READY: required evidence missing or failed. Do not publish this release.');
    process.exitCode=2;
  }else console.log('READY for this verification level ONLY; production readiness requires every production check.');
}catch(error){
  console.error('NOT READY: unable to validate QA evidence.',error instanceof SyntaxError?'Invalid JSON.':'Missing or invalid report.');
  process.exitCode=2;
}
