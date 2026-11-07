import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDeployedAssets } from './deploy-smoke-core.mjs';
const html = '<html><div id="root"></div><script type="module" src="/assets/index-a1b2c3.js"></script><link rel="stylesheet" href="/assets/index-z9y8x7.css"></html>';
const headersFor = url => ({get: name => name.toLowerCase()==='x-content-type-options' ? 'nosniff' : name.toLowerCase()==='content-type' ? String(url).endsWith('.js') ? 'application/javascript' : String(url).endsWith('.css') ? 'text/css' : 'text/html' : null});
const success = async url => ({status:200,text:async()=>String(url).endsWith('/') ? html : String(url).endsWith('.js')?'window.VUS=true;':'body{color:white}',headers:headersFor(url)});
test('valid published JS and CSS assets pass without executing scripts',async()=>{
 const r=await checkDeployedAssets('http://localhost:8080/',success);
 assert.equal(r.ok,true);assert.equal(r.checks.length,2);
});
test('SPA fallback HTML for JavaScript is detected',async()=>{
 const mock=async url=>({status:200,text:async()=>String(url).endsWith('/')?html:html});
 const r=await checkDeployedAssets('http://localhost:8080/',mock);
 assert.equal(r.ok,false);
 assert(r.checks.some(x=>!x.ok&&x.code==='MISSING_OR_SPA_FALLBACK'));
});
test('index source instead of Vite build is a deployment failure',async()=>{
 const mock=async()=>({status:200,text:async()=>'<div id="root"></div><script src="/src/main.tsx"></script>'});
 const r=await checkDeployedAssets('http://localhost:8080/',mock);
 assert.equal(r.ok,false);assert.equal(r.checks[0].code,'NO_BUILD_JS_ASSET');
});
test('HTTP public target rejected (local loopback permitted)',async()=>{
 await assert.rejects(()=>checkDeployedAssets('http://game.example.com/',success),/Only HTTPS/);
});
test('missing bundle asset returns clear failure status',async()=>{
 const mock=async url=>({status:String(url).endsWith('.js')?404:200,text:async()=>String(url).endsWith('/')?html:'not found',headers:headersFor(url)});
 const r=await checkDeployedAssets('http://localhost:8080/',mock);
 assert.equal(r.ok,false);
});
test('invalid JavaScript MIME triggers deployment failure even if HTTP 200',async()=>{
 const mock=async url=>({status:200,text:async()=>String(url).endsWith('/')?html:'window.VUS=true;',headers:{get:name=>name==='content-type'?'text/html':'nosniff'}});
 const r=await checkDeployedAssets('http://localhost:8080/',mock);
 assert.equal(r.ok,false);
 assert(r.checks.some(row=>row.code==='INVALID_ASSET_MIME'));
});
test('a missing nosniff response header blocks release',async()=>{
 const mock=async url=>({status:200,text:async()=>String(url).endsWith('/')?html:'window.VUS=true;',headers:{get:name=>name==='content-type'?'application/javascript':null}});
 const r=await checkDeployedAssets('http://localhost:8080/',mock);
 assert.equal(r.ok,false);
 assert(r.checks.some(row=>row.code==='NO_NOSNIFF'));
});
