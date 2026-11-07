/** Safe, read-only environment diagnostics. No keys or connection strings logged. */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { promises as dns } from 'node:dns';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require=createRequire(import.meta.url);
const workspaces = ['react', 'vite','typescript','@supabase/supabase-js','@playwright/test'];
const packages = Object.fromEntries(workspaces.map(name => {
  try { require.resolve(`${name}/package.json`,{paths:[resolve('apps/web'),resolve('apps/api'),process.cwd()]});return [name,'INSTALLED']; }
  catch { return [name,'MISSING']; }
}));
const chromium=spawnSync('chromium',['--version'],{encoding:'utf8',timeout:5000});
const browser = chromium.status===0 ? 'INSTALLED' : 'NOT_FOUND';
let registry = 'UNAVAILABLE';
try {
  await Promise.race([
    dns.lookup('registry.npmjs.org').then(()=>{registry='DNS_OK';}),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('TIMEOUT')),3000)),
  ]);
}catch(error){registry=error?.code || error?.message || 'UNAVAILABLE';}
const report={
  product:'MEDIA TECH VUS',
  generated_at:new Date().toISOString(),
  node:process.version,
  packages,
  chromium:browser,
  npm_registry_dns:registry,
  notes:['Missing dependencies block production build in THIS environment; do not treat it as a confirmed React source code error.',
         'This check does not use API keys and does not execute an actual production build.',
         'A browser engine check does not replace a full E2E test.'],
};
mkdirSync(resolve('qa-reports'),{recursive:true});
writeFileSync(resolve('qa-reports/v28-environment.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
