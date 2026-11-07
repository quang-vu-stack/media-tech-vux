import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { validateDeployConfig } from './deploy-rules.mjs';
import { checkDeployedSite } from './deploy-smoke-core.mjs';
const base = { SUPABASE_URL:'https://abc.supabase.co', SUPABASE_ANON_KEY:'publishable-123', SUPABASE_SERVICE_ROLE_KEY:'service-role-456', WEB_PORT:'8080', WEB_ORIGIN:'http://localhost:8080', GEMINI_API_KEY:'test' };
const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('deployment config accepts local Docker defaults',()=>assert.equal(validateDeployConfig(base).ok,true));
test('rejects missing service role key',()=>assert.equal(validateDeployConfig({...base,SUPABASE_SERVICE_ROLE_KEY:''}).ok,false));
test('rejects placeholder keys',()=>assert.equal(validateDeployConfig({...base,SUPABASE_ANON_KEY:'YOUR_ANON_KEY'}).ok,false));
test('rejects same Supabase anon and secret key',()=>assert.equal(validateDeployConfig({...base,SUPABASE_ANON_KEY:'equal',SUPABASE_SERVICE_ROLE_KEY:'equal'}).ok,false));
test('rejects HTTP origin for public host',()=>assert.equal(validateDeployConfig({...base,WEB_ORIGIN:'http://game.example.com'}).ok,false));
test('allows HTTPS origin for public host',()=>assert.equal(validateDeployConfig({...base,WEB_ORIGIN:'https://game.example.com'}).ok,true));
test('rejects invalid WEB_PORT',()=>assert.equal(validateDeployConfig({...base,WEB_PORT:'70000'}).ok,false));
test('rejects URL with extra path on origin',()=>assert.equal(validateDeployConfig({...base,WEB_ORIGIN:'https://game.example.com/panel'}).ok,false));
test('warns when AI provider keys absent',()=>assert(validateDeployConfig({...base,GEMINI_API_KEY:''}).warnings.some(x=>/AI API/.test(x))));
test('compose binds frontend to localhost and never exposes backend host port',()=>{
  const c=read('compose.yaml');assert(c.includes("127.0.0.1:${WEB_PORT:-8080}:80"));assert(!/\b4000:4000\b/.test(c));
});
test('Docker build exposes only Supabase publishable key to web',()=>{
  const docker=read('deploy/Dockerfile.web');
  assert(docker.includes('ARG VITE_SUPABASE_ANON_KEY'));
  for(const key of ['SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY','GEMINI_API_KEY'])assert(!docker.includes(key));
});
test('nginx proxies API to backend without losing /api prefix',()=>{
  const conf=read('deploy/nginx.conf');assert(conf.includes('location /api/'));assert(conf.includes('proxy_pass http://api:4000;'));
});
test('secrets excluded from Docker context',()=>{
  const ignores=read('.dockerignore');assert(ignores.includes('**/.env'));assert(ignores.includes('.env.*'));
});
test('docker runtime files bundled',()=>{
  for(const name of ['deploy/Dockerfile.api','deploy/Dockerfile.web','deploy/nginx.conf','.env.deploy.example','compose.yaml'])assert(existsSync(new URL('../'+name,import.meta.url)));
});
test('smoke reports successes across frontend/API/readiness/auth',async()=>{
  const mock=async url=>({status:String(url).endsWith('/api/state')?401:200,
    json:async()=>String(url).endsWith('/api/state')?{error:'Login required'}:{ok:true},
    text:async()=>'<div id="root"></div>'});
  const result=await checkDeployedSite('http://localhost:8080/',mock);
  assert.equal(result.ok,true);assert.equal(result.checks.length,4);
});
test('smoke detects readiness failure and missing deployment',async()=>{
  const mock=async url=>({status:String(url).endsWith('/api/ready')?503:200,
    json:async()=>({ok:true}),text:async()=>'<div id="root"></div>'});
  const result=await checkDeployedSite('http://localhost:8080/',mock);
  assert.equal(result.ok,false);
  assert(result.checks.some(x=>x.name==='database_readiness'&&!x.ok));
});
